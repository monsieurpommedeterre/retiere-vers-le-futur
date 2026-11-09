/**
 * Moteur du minuteur : une machine à états pure, sans effet de bord.
 * Le composant React se charge du temps réel (ticks), du son et de la persistance.
 *
 * Déroulé d'une séance :
 *   [décompte initial, une seule fois]
 *   pour chaque tour :
 *     pour chaque série : série, puis mise en place entre séries (sauf après la dernière)
 *     mise en place entre tours (sauf après le dernier)
 */

export type Phase = 'prep' | 'work' | 'seriesRest' | 'toursRest';
export type Status = 'idle' | 'running' | 'paused' | 'finished';

export interface Config {
  /** Nombre de tours. Chaque tour contient `series` séries. */
  tours: number;
  /** Nombre de séries par tour. */
  series: number;
  /** Durée d'une série, en secondes. */
  workSec: number;
  /** Mise en place entre deux séries, en secondes (0 = aucune). */
  seriesRestSec: number;
  /** Mise en place entre deux tours, en secondes (0 = aucune). */
  toursRestSec: number;
  /** Décompte initial, une seule fois au lancement, en secondes (0 = aucun). */
  prepSec: number;
}

export interface State {
  config: Config;
  status: Status;
  /** Phase en cours (ou première phase à venir quand `status` vaut idle). */
  phase: Phase;
  toursLeft: number;
  seriesLeft: number;
  /** Millisecondes restantes dans la phase courante (mis à jour à chaque tick). */
  remainingMs: number;
  /** Horodatage (Date.now) de la fin de la phase courante, uniquement en cours d'exécution. */
  endAt: number | null;
  /** Nombre de phases écoulées depuis le lancement. */
  phaseIndex: number;
}

export type Action =
  | { type: 'configure'; patch: Partial<Config> }
  | { type: 'start'; now: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'tick'; now: number }
  | { type: 'reset' };

interface Limit {
  min: number;
  max: number;
}

const MAX_SEC = 59 * 60 + 59;

export const LIMITS: Record<keyof Config, Limit> = {
  tours: { min: 1, max: 99 },
  series: { min: 1, max: 99 },
  workSec: { min: 0, max: MAX_SEC },
  seriesRestSec: { min: 0, max: MAX_SEC },
  toursRestSec: { min: 0, max: MAX_SEC },
  prepSec: { min: 0, max: MAX_SEC },
};

export const DEFAULT_CONFIG: Config = {
  tours: 3,
  series: 4,
  workSec: 30,
  seriesRestSec: 10,
  toursRestSec: 60,
  prepSec: 10,
};

export function phaseDurationMs(config: Config, phase: Phase): number {
  switch (phase) {
    case 'prep':
      return config.prepSec * 1000;
    case 'work':
      return config.workSec * 1000;
    case 'seriesRest':
      return config.seriesRestSec * 1000;
    case 'toursRest':
      return config.toursRestSec * 1000;
  }
}

/** Une série (« work ») ou un moment de mise en place (tout le reste) : le carillon diffère. */
export function isWorkPhase(phase: Phase): boolean {
  return phase === 'work';
}

export function canStart(config: Config): boolean {
  return config.workSec > 0;
}

export function firstPhase(config: Config): Phase {
  return config.prepSec > 0 ? 'prep' : 'work';
}

function clamp(value: number, limit: Limit): number {
  return Math.min(limit.max, Math.max(limit.min, Math.round(value)));
}

function applyPatch(base: Config, patch: Record<string, unknown>): Config {
  const config: Config = { ...base };
  for (const key of Object.keys(LIMITS) as (keyof Config)[]) {
    const value = patch[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      config[key] = clamp(value, LIMITS[key]);
    }
  }
  return config;
}

/**
 * Nettoie une configuration venue de l'extérieur (localStorage) : valeurs manquantes ou hors bornes.
 * Accepte aussi les anciens formats : `{ minutes, seconds }` (v1) et `leadIn` (v2).
 */
export function sanitizeConfig(input: unknown): Config {
  if (typeof input !== 'object' || input === null) return { ...DEFAULT_CONFIG };
  const source = input as Record<string, unknown>;
  const config = applyPatch(DEFAULT_CONFIG, source);

  if (source.workSec === undefined && (typeof source.minutes === 'number' || typeof source.seconds === 'number')) {
    const minutes = typeof source.minutes === 'number' ? source.minutes : 0;
    const seconds = typeof source.seconds === 'number' ? source.seconds : 0;
    config.workSec = clamp(minutes * 60 + seconds, LIMITS.workSec);
  }
  if (source.prepSec === undefined && typeof source.leadIn === 'boolean') {
    config.prepSec = source.leadIn ? config.seriesRestSec : 0;
  }
  return config;
}

export function initialState(config: Config = DEFAULT_CONFIG): State {
  const phase = firstPhase(config);
  return {
    config,
    status: 'idle',
    phase,
    toursLeft: config.tours,
    seriesLeft: config.series,
    remainingMs: phaseDurationMs(config, phase),
    endAt: null,
    phaseIndex: 0,
  };
}

type Progress = Pick<State, 'phase' | 'toursLeft' | 'seriesLeft'>;

/** Fin de la phase courante : calcule la suivante. Retourne null quand la séance est terminée. */
function advance(config: Config, current: Progress): Progress | null {
  if (current.phase !== 'work') {
    return { ...current, phase: 'work' };
  }
  const seriesLeft = current.seriesLeft - 1;
  if (seriesLeft > 0) {
    return { phase: config.seriesRestSec > 0 ? 'seriesRest' : 'work', toursLeft: current.toursLeft, seriesLeft };
  }
  const toursLeft = current.toursLeft - 1;
  if (toursLeft <= 0) return null;
  return { phase: config.toursRestSec > 0 ? 'toursRest' : 'work', toursLeft, seriesLeft: config.series };
}

export function reduce(state: State, action: Action): State {
  switch (action.type) {
    case 'configure': {
      if (state.status !== 'idle') return state;
      return initialState(applyPatch(state.config, action.patch));
    }

    case 'start': {
      if (state.status !== 'idle' || !canStart(state.config)) return state;
      return { ...state, status: 'running', endAt: action.now + phaseDurationMs(state.config, state.phase) };
    }

    case 'pause': {
      if (state.status !== 'running' || state.endAt === null) return state;
      return {
        ...state,
        status: 'paused',
        remainingMs: Math.max(0, state.endAt - action.now),
        endAt: null,
      };
    }

    case 'resume': {
      if (state.status !== 'paused') return state;
      return { ...state, status: 'running', endAt: action.now + state.remainingMs };
    }

    case 'tick': {
      if (state.status !== 'running' || state.endAt === null) return state;
      let progress: Progress = { phase: state.phase, toursLeft: state.toursLeft, seriesLeft: state.seriesLeft };
      let { phaseIndex, endAt } = state;
      let remaining = endAt - action.now;

      // Boucle : si l'onglet a été suspendu longtemps, plusieurs phases peuvent s'être écoulées.
      while (remaining <= 0) {
        const next = advance(state.config, progress);
        phaseIndex += 1;
        if (next === null) {
          return {
            ...state,
            status: 'finished',
            toursLeft: 0,
            seriesLeft: 0,
            remainingMs: 0,
            endAt: null,
            phaseIndex,
          };
        }
        progress = next;
        endAt += phaseDurationMs(state.config, progress.phase);
        remaining = endAt - action.now;
      }

      return { ...state, ...progress, phaseIndex, endAt, remainingMs: remaining };
    }

    case 'reset':
      return initialState(state.config);
  }
}

/** Formate des millisecondes restantes en mm:ss (arrondi au supérieur pour afficher 0 pile au carillon final). */
export function formatRemaining(ms: number): { minutes: string; seconds: string } {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  return {
    minutes: String(Math.floor(totalSeconds / 60)).padStart(2, '0'),
    seconds: String(totalSeconds % 60).padStart(2, '0'),
  };
}

/** Formate une durée en secondes : « 1:05 », « 0:30 ». */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
