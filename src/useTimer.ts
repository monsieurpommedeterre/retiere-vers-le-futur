import { useEffect, useMemo, useReducer, useRef } from 'react';
import { CUE_LEAD_MS, cancelPending, scheduleEndCue, unlockAudio, type ScheduledSound, type SoundSettings } from './audio';
import { initialState, isWorkPhase, reduce, sanitizeConfig, type Config, type State } from './engine';
import { useWakeLock } from './useWakeLock';

const STORAGE_KEY = 'retiere.config';
const TICK_MS = 100;

function loadConfig(): Config {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return sanitizeConfig(raw ? JSON.parse(raw) : null);
  } catch {
    return sanitizeConfig(null);
  }
}

export interface TimerApi {
  state: State;
  configure: (patch: Partial<Config>) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  restart: () => void;
}

export function useTimer(sounds: SoundSettings): TimerApi {
  const [state, dispatch] = useReducer(reduce, undefined, () => initialState(loadConfig()));
  const soundsRef = useRef(sounds);
  soundsRef.current = sounds;

  // Persistance de la configuration.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.config));
    } catch {
      // Stockage indisponible (navigation privée…) : on continue sans.
    }
  }, [state.config]);

  // Horloge : on recalcule depuis Date.now() pour rester juste même si l'onglet est ralenti.
  useEffect(() => {
    if (state.status !== 'running') return;
    const tick = () => dispatch({ type: 'tick', now: Date.now() });
    const id = window.setInterval(tick, TICK_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [state.status]);

  // Carillon : pour chaque phase en cours, on programme le signal de fin sur l'horloge audio
  // un peu avant les 3 dernières secondes. Pause ou changement de phase annule ce qui n'a pas encore sonné.
  useEffect(() => {
    if (state.status !== 'running' || state.endAt === null) return;
    const endAt = state.endAt;
    const instrumentKey = soundsRef.current[isWorkPhase(state.phase) ? 'work' : 'rest'];
    let scheduled: ScheduledSound[] | null = null;
    let timeoutId: number | undefined;

    const schedule = () => {
      if (scheduled) return;
      scheduled = scheduleEndCue(endAt - Date.now(), instrumentKey);
    };
    const arm = () => {
      const lead = endAt - Date.now() - CUE_LEAD_MS - 250;
      if (lead <= 0) schedule();
      else timeoutId = window.setTimeout(schedule, lead);
    };
    // Si l'onglet revient au premier plan, on vérifie que le signal est bien armé (timers ralentis en arrière-plan).
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !scheduled) {
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        arm();
      }
    };

    arm();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (scheduled) cancelPending(scheduled);
    };
  }, [state.status, state.endAt, state.phase]);

  useWakeLock(state.status === 'running');

  const actions = useMemo(
    () => ({
      configure: (patch: Partial<Config>) => dispatch({ type: 'configure', patch }),
      start: () => {
        unlockAudio();
        dispatch({ type: 'start', now: Date.now() });
      },
      pause: () => dispatch({ type: 'pause', now: Date.now() }),
      resume: () => {
        unlockAudio();
        dispatch({ type: 'resume', now: Date.now() });
      },
      reset: () => dispatch({ type: 'reset' }),
      restart: () => {
        unlockAudio();
        dispatch({ type: 'reset' });
        dispatch({ type: 'start', now: Date.now() });
      },
    }),
    [],
  );

  return { state, ...actions };
}
