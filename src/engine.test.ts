import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  formatDuration,
  formatRemaining,
  initialState,
  isWorkPhase,
  reduce,
  sanitizeConfig,
  type Config,
  type State,
} from './engine';

// 2 tours × 2 séries de 10 s, 5 s entre les séries, 20 s entre les tours, pas de décompte initial.
const config: Config = { tours: 2, series: 2, workSec: 10, seriesRestSec: 5, toursRestSec: 20, prepSec: 0 };
const T0 = 1_000_000;

function started(c: Config = config): State {
  return reduce(initialState(c), { type: 'start', now: T0 });
}

/** Avance le temps par pas de 100 ms jusqu'à `until` (simule les ticks réels). */
function runUntil(state: State, until: number): State {
  let s = state;
  for (let t = T0 + 100; t <= until; t += 100) {
    s = reduce(s, { type: 'tick', now: t });
  }
  return s;
}

describe('configure', () => {
  it('borne les valeurs et réinitialise les compteurs', () => {
    const s = reduce(initialState(), { type: 'configure', patch: { tours: 0, workSec: 99_999, seriesRestSec: -3, prepSec: 0 } });
    expect(s.config).toEqual({ ...DEFAULT_CONFIG, tours: 1, workSec: 3599, seriesRestSec: 0, prepSec: 0 });
    expect(s.toursLeft).toBe(1);
    expect(s.phase).toBe('work');
    expect(s.remainingMs).toBe(3_599_000);
  });

  it('un décompte initial change la première phase', () => {
    const s = reduce(initialState(config), { type: 'configure', patch: { prepSec: 7 } });
    expect(s.phase).toBe('prep');
    expect(s.remainingMs).toBe(7_000);
  });

  it('est ignoré pendant l’exécution', () => {
    const s = reduce(started(), { type: 'configure', patch: { tours: 9 } });
    expect(s.config.tours).toBe(2);
    expect(s.status).toBe('running');
  });
});

describe('start / pause / resume', () => {
  it('refuse de démarrer avec une série de durée nulle', () => {
    const s = reduce(initialState({ ...config, workSec: 0 }), { type: 'start', now: T0 });
    expect(s.status).toBe('idle');
  });

  it('démarre sur une série quand il n’y a pas de décompte initial', () => {
    const s = started();
    expect(s.status).toBe('running');
    expect(s.phase).toBe('work');
    expect(s.endAt).toBe(T0 + 10_000);
  });

  it('le décompte initial ne se joue qu’une seule fois, au tout début', () => {
    let s = started({ ...config, prepSec: 7 });
    expect(s.phase).toBe('prep');
    expect(s.endAt).toBe(T0 + 7_000);
    s = reduce(s, { type: 'tick', now: T0 + 7_000 });
    expect(s.phase).toBe('work');
    expect(s.seriesLeft).toBe(2);
    expect(s.toursLeft).toBe(2);
    // Tour 1 complet puis mise en place entre tours : pas de nouveau décompte initial.
    s = reduce(s, { type: 'tick', now: T0 + 7_000 + 10_000 + 5_000 + 10_000 });
    expect(s.phase).toBe('toursRest');
    s = reduce(s, { type: 'tick', now: T0 + 7_000 + 25_000 + 20_000 });
    expect(s.phase).toBe('work');
  });

  it('la pause fige le temps restant et la reprise le réutilise', () => {
    const paused = reduce(started(), { type: 'pause', now: T0 + 4_000 });
    expect(paused.status).toBe('paused');
    expect(paused.remainingMs).toBe(6_000);
    const resumed = reduce(paused, { type: 'resume', now: T0 + 60_000 });
    expect(resumed.status).toBe('running');
    expect(resumed.endAt).toBe(T0 + 66_000);
  });
});

describe('déroulé complet', () => {
  it('série → mise en place → série → mise en place tour → … → terminé', () => {
    let s = started();
    s = reduce(s, { type: 'tick', now: T0 + 9_900 });
    expect(s.phase).toBe('work');
    expect(s.seriesLeft).toBe(2);
    expect(s.remainingMs).toBe(100);

    // Fin de la série 1 → mise en place entre séries, 1 série restante.
    s = reduce(s, { type: 'tick', now: T0 + 10_050 });
    expect(s.phase).toBe('seriesRest');
    expect(s.seriesLeft).toBe(1);
    expect(s.toursLeft).toBe(2);
    expect(s.phaseIndex).toBe(1);
    expect(s.endAt).toBe(T0 + 15_000);
    expect(s.remainingMs).toBe(4_950);

    // Fin de la mise en place → série 2.
    s = reduce(s, { type: 'tick', now: T0 + 15_000 });
    expect(s.phase).toBe('work');
    expect(s.seriesLeft).toBe(1);
    expect(s.endAt).toBe(T0 + 25_000);

    // Fin de la dernière série du tour → un tour en moins, séries rechargées, mise en place entre tours.
    s = reduce(s, { type: 'tick', now: T0 + 25_000 });
    expect(s.phase).toBe('toursRest');
    expect(s.toursLeft).toBe(1);
    expect(s.seriesLeft).toBe(2);
    expect(s.endAt).toBe(T0 + 45_000);

    // Tour 2 : série, mise en place, série → terminé.
    s = reduce(s, { type: 'tick', now: T0 + 45_000 });
    expect(s.phase).toBe('work');
    s = reduce(s, { type: 'tick', now: T0 + 55_000 });
    expect(s.phase).toBe('seriesRest');
    s = reduce(s, { type: 'tick', now: T0 + 60_000 });
    expect(s.phase).toBe('work');
    s = reduce(s, { type: 'tick', now: T0 + 70_000 });
    expect(s.status).toBe('finished');
    expect(s.toursLeft).toBe(0);
    expect(s.seriesLeft).toBe(0);
    expect(s.remainingMs).toBe(0);
    expect(s.phaseIndex).toBe(7);
  });

  it('sans mises en place, les séries s’enchaînent directement', () => {
    const c: Config = { ...config, seriesRestSec: 0, toursRestSec: 0 };
    let s = started(c);
    s = reduce(s, { type: 'tick', now: T0 + 10_000 });
    expect(s.phase).toBe('work');
    expect(s.seriesLeft).toBe(1);
    s = reduce(s, { type: 'tick', now: T0 + 20_000 });
    expect(s.phase).toBe('work');
    expect(s.toursLeft).toBe(1);
    expect(s.seriesLeft).toBe(2);
    s = reduce(s, { type: 'tick', now: T0 + 40_000 });
    expect(s.status).toBe('finished');
  });

  it('donne le même résultat avec des ticks réguliers', () => {
    const s = runUntil(started(), T0 + 46_000);
    expect(s.phase).toBe('work');
    expect(s.toursLeft).toBe(1);
    expect(s.seriesLeft).toBe(2);
    expect(s.remainingMs).toBe(9_000);
  });

  it('rattrape plusieurs phases d’un coup après une longue suspension', () => {
    const s = reduce(started(), { type: 'tick', now: T0 + 26_000 });
    expect(s.phase).toBe('toursRest');
    expect(s.phaseIndex).toBe(3);
    expect(s.endAt).toBe(T0 + 45_000);
  });

  it('reset revient à la configuration de départ', () => {
    const s = reduce(reduce(started(), { type: 'tick', now: T0 + 10_000 }), { type: 'reset' });
    expect(s).toEqual(initialState(config));
  });
});

describe('utilitaires', () => {
  it('isWorkPhase distingue série et mises en place', () => {
    expect(isWorkPhase('work')).toBe(true);
    expect(isWorkPhase('prep')).toBe(false);
    expect(isWorkPhase('seriesRest')).toBe(false);
    expect(isWorkPhase('toursRest')).toBe(false);
  });

  it('formatRemaining arrondit au supérieur', () => {
    expect(formatRemaining(90_000)).toEqual({ minutes: '01', seconds: '30' });
    expect(formatRemaining(1)).toEqual({ minutes: '00', seconds: '01' });
    expect(formatRemaining(0)).toEqual({ minutes: '00', seconds: '00' });
  });

  it('formatDuration', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(0)).toBe('0:00');
  });

  it('sanitizeConfig tolère n’importe quelle entrée', () => {
    expect(sanitizeConfig(null)).toEqual(DEFAULT_CONFIG);
    expect(sanitizeConfig({ tours: 'x', series: 200, workSec: NaN })).toEqual({ ...DEFAULT_CONFIG, series: 99 });
  });

  it('sanitizeConfig migre les anciens formats', () => {
    expect(sanitizeConfig({ tours: 2, series: 3, minutes: 1, seconds: 15 })).toEqual({
      ...DEFAULT_CONFIG,
      tours: 2,
      series: 3,
      workSec: 75,
    });
    expect(sanitizeConfig({ seriesRestSec: 12, leadIn: true }).prepSec).toBe(12);
    expect(sanitizeConfig({ seriesRestSec: 12, leadIn: false }).prepSec).toBe(0);
  });
});
