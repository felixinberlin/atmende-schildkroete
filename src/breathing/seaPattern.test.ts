import { describe, expect, it } from 'vitest';
import { buildTimeline, sampleTimeline } from './core/timeline';
import { BUILTIN_PATTERNS } from './patterns';
import {
  SEA_PATTERN_STYLES,
  computeSeaPatternPoint,
  resolvePatternStyle,
  type SeaPatternStyle
} from './seaPattern';

describe('sea pattern trail geometry (Meeresmuster)', () => {
  it('maps each island breathing pattern to its signature sea geometry in auto mode', () => {
    expect(resolvePatternStyle('ocean', 'auto')).toBe('rosette');
    expect(resolvePatternStyle('box', 'auto')).toBe('box-crystal');
    expect(resolvePatternStyle('calm478', 'auto')).toBe('nautilus');
    expect(resolvePatternStyle('dirga', 'auto')).toBe('lotus-three');
    expect(resolvePatternStyle('coherence', 'auto')).toBe('harmony-eight');
    expect(resolvePatternStyle('star', 'auto')).toBe('starburst');
  });

  it('moves Tika continuously across phases and multi-cycle seams without jumps', () => {
    const styles = Object.keys(SEA_PATTERN_STYLES) as SeaPatternStyle[];
    for (const pattern of BUILTIN_PATTERNS) {
      const timeline = buildTimeline(pattern);
      for (const style of styles) {
        let prev = computeSeaPatternPoint(sampleTimeline(timeline, 0), style);
        let totalDistance = 0;
        // Sample across 2.5 full cycles in 40ms steps
        const endMs = timeline.cycleMs * 2.5;
        for (let t = 40; t <= endMs; t += 40) {
          const cur = computeSeaPatternPoint(sampleTimeline(timeline, t), style);
          const stepDist = Math.hypot(cur.x - prev.x, cur.y - prev.y);
          // No sudden teleportation jump at phase or cycle boundaries
          expect(stepDist).toBeLessThan(20);
          totalDistance += stepDist;
          prev = cur;
        }
        // Tika moves a meaningful distance over the session to draw the pattern
        expect(totalDistance).toBeGreaterThan(300);
      }
    }
  });
});
