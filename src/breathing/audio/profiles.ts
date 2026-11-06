/** Declarative sound profiles: which sound accompanies which phase kind or cue. */
import type { CueKey } from '../core/timeline';

export type { CueKey } from '../core/timeline';

export interface SampleCue {
  /** File name relative to the engine's `assetBase`. */
  file: string;
  /** Natural length of the recording in seconds. */
  baseDurSec: number;
  gain?: number;
  /** Start offset in seconds after the phase begins. */
  delaySec?: number;
  /** Time-stretch the sample to the phase length (playbackRate). Otherwise play at rate 1 and fade out at phase end. */
  stretch?: boolean;
}

export type SoundProfile =
  | { kind: 'samples'; label: string; cues: Partial<Record<CueKey, readonly SampleCue[]>> }
  | { kind: 'synth'; label: string }
  | { kind: 'silent'; label: string };

export const SOUND_PROFILES = {
  ocean_master: {
    kind: 'samples',
    label: '🌊 Meeresrauschen & Atem',
    cues: {
      inhale: [{ file: 'ocean_inhale.mp3', baseDurSec: 4, stretch: true }],
      holdIn: [{ file: 'cue_bell.mp3', baseDurSec: 16, gain: 0.6 }],
      exhale: [
        { file: 'ocean_exhale.mp3', baseDurSec: 4, stretch: true },
        { file: 'bubbles_exhale.mp3', baseDurSec: 3.5, gain: 0.7, delaySec: 0.35, stretch: true }
      ]
    }
  },
  breath_pure: {
    kind: 'samples',
    label: '🍃 Sanfter Atemhauch (Ujjayi)',
    cues: {
      inhale: [{ file: 'breath_inhale.mp3', baseDurSec: 4, stretch: true }],
      exhale: [{ file: 'breath_exhale.mp3', baseDurSec: 4, stretch: true }]
    }
  },
  chimes_bell: {
    kind: 'samples',
    label: '🔔 Meditations-Glocke',
    cues: {
      inhale: [{ file: 'cue_inhale.mp3', baseDurSec: 4, stretch: true }],
      exhale: [{ file: 'cue_exhale.mp3', baseDurSec: 4, stretch: true }]
    }
  },
  synth_webaudio: { kind: 'synth', label: '✨ Synthesizer (Web Audio)' },
  mute: { kind: 'silent', label: '🔇 Lautlos' }
} as const satisfies Record<string, SoundProfile>;

export type SoundProfileId = keyof typeof SOUND_PROFILES;

export const DEFAULT_SOUND_PROFILE: SoundProfileId = 'ocean_master';

export function isSoundProfileId(value: string): value is SoundProfileId {
  return Object.hasOwn(SOUND_PROFILES, value);
}

export function cuesFor(profile: SoundProfile, key: CueKey): readonly SampleCue[] {
  return profile.kind === 'samples' ? (profile.cues[key] ?? []) : [];
}

export const MIN_RATE = 0.5;
export const MAX_RATE = 2;

export function playbackRate(cue: SampleCue, phaseSec: number): number {
  if (!cue.stretch || phaseSec <= 0.5) return 1;
  return Math.min(MAX_RATE, Math.max(MIN_RATE, cue.baseDurSec / phaseSec));
}
