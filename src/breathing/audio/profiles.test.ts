import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cueKeyFor } from '../core/timeline';
import { buildTimeline } from '../core/timeline';
import { findPattern } from '../patterns';
import { SOUND_PROFILES, playbackRate, type SoundProfile } from './profiles';

describe('sound profiles', () => {
  it('reference sample files that exist in public/sounds', () => {
    for (const profile of Object.values(SOUND_PROFILES) as SoundProfile[]) {
      if (profile.kind !== 'samples') continue;
      for (const cue of Object.values(profile.cues).flat()) {
        expect(existsSync(new URL(`../../../public/sounds/${cue!.file}`, import.meta.url)), cue!.file).toBe(true);
      }
    }
  });

  it('derives holdIn / holdOut cues from lung volume', () => {
    const cues = buildTimeline(findPattern('ocean')!).spans.map(cueKeyFor);
    expect(cues).toEqual(['inhale', 'holdIn', 'exhale', 'holdOut']);
  });

  it('stretches samples within safe playback rates', () => {
    const cue = { file: 'x.mp3', baseDurSec: 4, stretch: true };
    expect(playbackRate(cue, 4)).toBe(1);
    expect(playbackRate(cue, 8)).toBe(0.5);
    expect(playbackRate(cue, 1)).toBe(2);
    expect(playbackRate({ ...cue, stretch: false }, 8)).toBe(1);
  });
});
