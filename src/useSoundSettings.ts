import { useCallback, useEffect, useState } from 'react';
import { sanitizeSounds, type CueKind, type SoundSettings } from './audio';

const STORAGE_KEY = 'retiere.sounds';

function load(): SoundSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return sanitizeSounds(raw ? JSON.parse(raw) : null);
  } catch {
    return sanitizeSounds(null);
  }
}

/** Choix des instruments (séries / mises en place), mémorisé dans le localStorage. */
export function useSoundSettings(): [SoundSettings, (kind: CueKind, instrumentKey: string) => void] {
  const [sounds, setSounds] = useState<SoundSettings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sounds));
    } catch {
      // Stockage indisponible : on continue sans.
    }
  }, [sounds]);

  const assign = useCallback((kind: CueKind, instrumentKey: string) => {
    setSounds((current) => (current[kind] === instrumentKey ? current : { ...current, [kind]: instrumentKey }));
  }, []);

  return [sounds, assign];
}
