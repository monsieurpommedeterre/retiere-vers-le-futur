import { describe, expect, it } from 'vitest';
import { DEFAULT_SOUNDS, INSTRUMENTS, getInstrument, sanitizeSounds } from './audio';

describe('sons', () => {
  it('propose dix instruments aux clés uniques', () => {
    expect(INSTRUMENTS).toHaveLength(10);
    expect(new Set(INSTRUMENTS.map((i) => i.key)).size).toBe(10);
    expect(INSTRUMENTS.map((i) => i.key)).toContain(DEFAULT_SOUNDS.work);
    expect(INSTRUMENTS.map((i) => i.key)).toContain(DEFAULT_SOUNDS.rest);
  });

  it('sanitizeSounds garde les clés valides et remplace le reste', () => {
    expect(sanitizeSounds(null)).toEqual(DEFAULT_SOUNDS);
    expect(sanitizeSounds({ work: 'churchBell', rest: 'inconnu' })).toEqual({ work: 'churchBell', rest: DEFAULT_SOUNDS.rest });
    expect(sanitizeSounds({ work: 42 })).toEqual(DEFAULT_SOUNDS);
  });

  it('getInstrument retombe sur l’instrument par défaut', () => {
    expect(getInstrument('bowl').key).toBe('bowl');
    expect(getInstrument('n’existe pas').key).toBe(DEFAULT_SOUNDS.work);
  });
});
