/**
 * Carillons synthétisés avec la Web Audio API : aucun fichier son à charger.
 *
 * Chaque instrument est décrit par ses partiels (rapports de fréquence, gain, vitesse d'extinction),
 * joués en sinus avec une enveloppe frappe + décroissance exponentielle. Dix instruments sont
 * proposés dans la configuration du son ; l'utilisateur choisit lequel sert aux séries et lequel aux mises en place.
 *
 * Signal de fin de phase : un petit coup à −3 s, −2 s et −1 s, puis un coup plus appuyé à 0 (bip bip bip biiip).
 * Les notes finales ont été raccourcies de moitié (retour utilisateur du 9 nov. 2026).
 *
 * L'AudioContext doit être créé/réveillé depuis un geste utilisateur (obligatoire sur iOS),
 * d'où `unlockAudio()` appelé dans les handlers des boutons.
 */

let ctx: AudioContext | null = null;
let output: AudioNode | null = null;

export type CueKind = 'work' | 'rest';

/** Avance, en ms avant la fin d'une phase, des petits coups d'avertissement. Le coup long sonne à 0. */
export const CUE_SOFT_OFFSETS_MS = [3000, 2000, 1000] as const;
/** Délai total du signal : à partir de combien de ms avant la fin il faut avoir tout programmé. */
export const CUE_LEAD_MS = CUE_SOFT_OFFSETS_MS[0];

export function unlockAudio(): void {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      // Un passe-bas adoucit les aigus, un compresseur évite la saturation quand les notes se superposent.
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 6500;
      lowpass.Q.value = 0.4;
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.knee.value = 12;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.3;
      lowpass.connect(compressor).connect(ctx.destination);
      output = lowpass;
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    // Audio indisponible : le minuteur doit continuer à fonctionner sans son.
    ctx = null;
    output = null;
  }
}

export interface ScheduledSound {
  /** Instant de départ sur l'horloge audio (AudioContext.currentTime). */
  startTime: number;
  /** Annule la note (sans effet si elle a déjà commencé à sonner). */
  stop: () => void;
}

interface Partial {
  ratio: number;
  gain: number;
  /** Part de la durée totale pendant laquelle ce partiel résonne (les aigus s'éteignent plus vite). */
  decay: number;
}

interface Note {
  frequency: number;
  /** Durée totale de résonance, en secondes. */
  duration: number;
  volume: number;
  /** Tenue avant la décroissance, en secondes (0 = frappe sèche). */
  sustain?: number;
  /** Décalage de départ, en secondes. */
  delay?: number;
}

export interface Instrument {
  key: string;
  name: string;
  description: string;
  partials: Partial[];
  /** Durée de la frappe, en secondes (défaut 4 ms ; plus long = attaque plus douce). */
  attack?: number;
  /** Trémolo d'amplitude (vibraphone). */
  tremolo?: { rate: number; depth: number };
  /** Petit coup d'avertissement. */
  soft: Note;
  /** Coup long de fin de phase. */
  final: Note[];
}

// Notes (Hz)
const C4 = 261.63;
const F4 = 349.23;
const G4 = 392.0;
const A4 = 440.0;
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;
const E6 = 1318.51;
const G6 = 1567.98;

/** Lame métallique (glockenspiel, métallophone) : partiels 1 : 2,76 : 5,40 : 8,93. */
const METAL_BAR: Partial[] = [
  { ratio: 1, gain: 1, decay: 1 },
  { ratio: 1.003, gain: 0.5, decay: 0.9 },
  { ratio: 2.756, gain: 0.35, decay: 0.55 },
  { ratio: 5.404, gain: 0.12, decay: 0.3 },
  { ratio: 8.933, gain: 0.04, decay: 0.18 },
];

/** Lame de bois (marimba) : harmoniques impairs, son creux et chaud. */
const WOOD_BAR: Partial[] = [
  { ratio: 1, gain: 1, decay: 1 },
  { ratio: 1.003, gain: 0.5, decay: 0.9 },
  { ratio: 3, gain: 0.22, decay: 0.45 },
  { ratio: 6, gain: 0.05, decay: 0.2 },
];

export const INSTRUMENTS: Instrument[] = [
  {
    key: 'metallophoneLow',
    name: 'Métallophone · do grave',
    description: 'Lame métallique sur do 4, résonance longue et ronde.',
    partials: METAL_BAR,
    soft: { frequency: C4, duration: 1.4, volume: 0.3 },
    final: [
      { frequency: C4, duration: 1.8, volume: 0.55, sustain: 0.25 },
      { frequency: C5, duration: 1.2, volume: 0.12, sustain: 0.2 },
    ],
  },
  {
    key: 'metallophoneMid',
    name: 'Métallophone · do médium',
    description: 'Même lame, une octave plus haut : plus présent sur un haut-parleur de téléphone.',
    partials: METAL_BAR,
    soft: { frequency: C5, duration: 1.0, volume: 0.24 },
    final: [
      { frequency: C5, duration: 1.5, volume: 0.45, sustain: 0.25 },
      { frequency: G5, duration: 1.1, volume: 0.16, sustain: 0.2 },
    ],
  },
  {
    key: 'vibraphone',
    name: 'Vibraphone',
    description: 'Lame métallique avec trémolo, fa 4, ambiance jazz douce.',
    partials: [
      { ratio: 1, gain: 1, decay: 1 },
      { ratio: 1.002, gain: 0.5, decay: 0.95 },
      { ratio: 4, gain: 0.28, decay: 0.5 },
      { ratio: 10, gain: 0.05, decay: 0.2 },
    ],
    tremolo: { rate: 5.5, depth: 0.35 },
    soft: { frequency: F4, duration: 1.0, volume: 0.3 },
    final: [
      { frequency: F4, duration: 1.8, volume: 0.5, sustain: 0.4 },
      { frequency: C5, duration: 1.3, volume: 0.18, sustain: 0.3 },
    ],
  },
  {
    key: 'glockenspiel',
    name: 'Glockenspiel',
    description: 'Carillon clair et cristallin, mi 6 pour les bips, accord do 5 + sol 5 pour la fin.',
    partials: METAL_BAR,
    soft: { frequency: E6, duration: 0.9, volume: 0.2 },
    final: [
      { frequency: C5, duration: 1.3, volume: 0.42, sustain: 0.3 },
      { frequency: G5, duration: 1.1, volume: 0.22, sustain: 0.3 },
      { frequency: C6, duration: 0.6, volume: 0.07, sustain: 0.15 },
    ],
  },
  {
    key: 'tubular',
    name: 'Carillon tubulaire',
    description: 'Tube d’orchestre sur sol 4, riche et un peu solennel.',
    partials: [
      { ratio: 0.5, gain: 0.3, decay: 1 },
      { ratio: 1, gain: 1, decay: 1 },
      { ratio: 1.5, gain: 0.25, decay: 0.6 },
      { ratio: 2, gain: 0.6, decay: 0.8 },
      { ratio: 2.4, gain: 0.2, decay: 0.5 },
      { ratio: 3, gain: 0.3, decay: 0.4 },
      { ratio: 4, gain: 0.12, decay: 0.3 },
    ],
    soft: { frequency: G4, duration: 1.2, volume: 0.26 },
    final: [{ frequency: G4, duration: 2, volume: 0.5, sustain: 0.2 }],
  },
  {
    key: 'churchBell',
    name: 'Cloche',
    description: 'Cloche de clocher sur do 4, avec sa tierce mineure caractéristique.',
    partials: [
      { ratio: 0.5, gain: 0.5, decay: 1 },
      { ratio: 1, gain: 1, decay: 0.9 },
      { ratio: 1.2, gain: 0.55, decay: 0.7 },
      { ratio: 1.5, gain: 0.3, decay: 0.6 },
      { ratio: 2, gain: 0.45, decay: 0.5 },
      { ratio: 2.5, gain: 0.12, decay: 0.4 },
      { ratio: 3, gain: 0.1, decay: 0.3 },
      { ratio: 4, gain: 0.06, decay: 0.25 },
    ],
    soft: { frequency: C4, duration: 1.5, volume: 0.3 },
    final: [{ frequency: C4, duration: 2.25, volume: 0.5, sustain: 0.15 }],
  },
  {
    key: 'handbell',
    name: 'Clochette',
    description: 'Petite cloche à main, mi 6, brillante et scintillante.',
    partials: [
      { ratio: 1, gain: 1, decay: 1 },
      { ratio: 1.012, gain: 0.6, decay: 0.9 },
      { ratio: 2.5, gain: 0.3, decay: 0.5 },
      { ratio: 3.9, gain: 0.15, decay: 0.35 },
      { ratio: 5.7, gain: 0.06, decay: 0.2 },
    ],
    soft: { frequency: E6, duration: 0.7, volume: 0.2 },
    final: [
      { frequency: E6, duration: 1.1, volume: 0.32, sustain: 0.15 },
      { frequency: G6, duration: 0.8, volume: 0.1, sustain: 0.1, delay: 0.08 },
    ],
  },
  {
    key: 'bowl',
    name: 'Bol chantant',
    description: 'Bol tibétain sur fa 4, attaque douce, très longue résonance.',
    partials: [
      { ratio: 1, gain: 1, decay: 1 },
      { ratio: 1.006, gain: 0.7, decay: 1 },
      { ratio: 2.9, gain: 0.3, decay: 0.8 },
      { ratio: 5.6, gain: 0.1, decay: 0.5 },
    ],
    attack: 0.03,
    soft: { frequency: F4, duration: 2.0, volume: 0.3 },
    final: [{ frequency: F4, duration: 3, volume: 0.5, sustain: 0.75 }],
  },
  {
    key: 'windChime',
    name: 'Carillon éolien',
    description: 'Trois tubes qui s’enchaînent (do, mi, sol 6) comme un carillon au vent.',
    partials: METAL_BAR,
    soft: { frequency: C6, duration: 0.8, volume: 0.2 },
    final: [
      { frequency: C6, duration: 1.1, volume: 0.3, sustain: 0.15 },
      { frequency: E6, duration: 1, volume: 0.25, sustain: 0.15, delay: 0.12 },
      { frequency: G6, duration: 0.9, volume: 0.22, sustain: 0.15, delay: 0.24 },
    ],
  },
  {
    key: 'marimba',
    name: 'Marimba',
    description: 'Lame de bois, la 4 : chaud, mat, plus grave.',
    partials: WOOD_BAR,
    soft: { frequency: A4, duration: 0.8, volume: 0.26 },
    final: [
      { frequency: A4, duration: 1.3, volume: 0.5, sustain: 0.35 },
      { frequency: E5, duration: 1.1, volume: 0.26, sustain: 0.3, delay: 0.12 },
    ],
  },
];

/** Choix d'instrument par type de signal : fin de série, et fin de mise en place (« on attaque une série »). */
export type SoundSettings = Record<CueKind, string>;

export const DEFAULT_SOUNDS: SoundSettings = {
  work: 'vibraphone',
  rest: 'marimba',
};

/** Nettoie un choix d'instruments venu du localStorage : clés inconnues → valeurs par défaut. */
export function sanitizeSounds(input: unknown): SoundSettings {
  const sounds: SoundSettings = { ...DEFAULT_SOUNDS };
  if (typeof input !== 'object' || input === null) return sounds;
  const source = input as Record<string, unknown>;
  for (const kind of ['work', 'rest'] as const) {
    const key = source[kind];
    if (typeof key === 'string' && INSTRUMENTS.some((i) => i.key === key)) sounds[kind] = key;
  }
  return sounds;
}

export function getInstrument(key: string): Instrument {
  return INSTRUMENTS.find((i) => i.key === key) ?? INSTRUMENTS.find((i) => i.key === DEFAULT_SOUNDS.work)!;
}

/** Frappe une note avec un instrument. */
function strike(startTime: number, note: Note, instrument: Instrument): ScheduledSound {
  const oscillators: OscillatorNode[] = [];
  const at = startTime + (note.delay ?? 0);
  if (ctx && output) {
    const master = ctx.createGain();
    master.connect(output);
    const attack = instrument.attack ?? 0.004;
    const sustain = note.sustain ?? 0;

    if (instrument.tremolo) {
      const { rate, depth } = instrument.tremolo;
      master.gain.value = note.volume * (1 - depth);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = rate;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = note.volume * depth;
      lfo.connect(lfoGain).connect(master.gain);
      lfo.start(at);
      lfo.stop(at + sustain + note.duration + 0.1);
      oscillators.push(lfo);
    } else {
      master.gain.value = note.volume;
    }

    for (const partial of instrument.partials) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = note.frequency * partial.ratio;
      const envelope = ctx.createGain();
      const ring = Math.max(0.1, note.duration * partial.decay);
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(partial.gain, at + attack);
      if (sustain > 0) {
        envelope.gain.linearRampToValueAtTime(partial.gain * 0.75, at + attack + sustain);
      }
      envelope.gain.exponentialRampToValueAtTime(0.0004, at + attack + sustain + ring);
      osc.connect(envelope).connect(master);
      osc.start(at);
      osc.stop(at + attack + sustain + ring + 0.05);
      oscillators.push(osc);
    }
  }
  return {
    startTime: at,
    stop: () => {
      for (const osc of oscillators) {
        try {
          osc.stop();
        } catch {
          // déjà arrêté
        }
      }
    },
  };
}

/**
 * Programme le signal de fin de phase sur l'horloge audio, à partir du temps restant :
 * petits coups à −3 s, −2 s, −1 s, coup long à 0. Les coups déjà dépassés sont ignorés.
 */
export function scheduleEndCue(remainingMs: number, instrumentKey: string): ScheduledSound[] {
  unlockAudio();
  if (!ctx) return [];
  const instrument = getInstrument(instrumentKey);
  const now = ctx.currentTime;
  const sounds: ScheduledSound[] = [];
  for (const offset of CUE_SOFT_OFFSETS_MS) {
    const inMs = remainingMs - offset;
    if (inMs < -80) continue;
    sounds.push(strike(now + Math.max(0, inMs) / 1000, instrument.soft, instrument));
  }
  const endAt = now + Math.max(0, remainingMs) / 1000;
  for (const note of instrument.final) sounds.push(strike(endAt, note, instrument));
  return sounds;
}

/** Annule les notes pas encore commencées (celles qui sonnent déjà finissent de résonner). */
export function cancelPending(sounds: ScheduledSound[]): void {
  if (!ctx) return;
  const threshold = ctx.currentTime + 0.05;
  for (const sound of sounds) {
    if (sound.startTime > threshold) sound.stop();
  }
}

/** Joue les deux signaux configurés pour les essayer : fin de série, puis 5 s plus tard fin de mise en place. */
export function previewCues(sounds: SoundSettings): void {
  scheduleEndCue(CUE_LEAD_MS, sounds.work);
  window.setTimeout(() => scheduleEndCue(CUE_LEAD_MS, sounds.rest), 5000);
}

/** Démo courte d'un instrument : bip, bip, puis le coup long (0 s, 0,55 s, 1,1 s). */
export function previewInstrument(key: string): void {
  unlockAudio();
  if (!ctx) return;
  const instrument = getInstrument(key);
  const now = ctx.currentTime + 0.03;
  strike(now, instrument.soft, instrument);
  strike(now + 0.55, instrument.soft, instrument);
  for (const note of instrument.final) strike(now + 1.1, note, instrument);
}
