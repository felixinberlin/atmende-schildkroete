import { describe, expect, it } from 'vitest';
import {
  computeSeaPatternPoint,
  resolvePatternStyle,
  SEA_PATTERN_STYLES,
  type SeaPatternStyle
} from './seaPattern';
import { buildTimeline, sampleTimeline } from './core/timeline';
import { findPattern } from './patterns';

describe('SeaPattern Geometry - All Styles & Bounds', () => {
  const styles: Exclude<SeaPatternStyle, 'auto'>[] = [
    'rosette',
    'box-crystal',
    'nautilus',
    'lotus-three',
    'harmony-eight',
    'starburst'
  ];

  it('provides descriptions and labels for all registered sea pattern styles', () => {
    for (const key of Object.keys(SEA_PATTERN_STYLES) as SeaPatternStyle[]) {
      expect(SEA_PATTERN_STYLES[key].name).toBeTruthy();
      expect(SEA_PATTERN_STYLES[key].description).toBeTruthy();
    }
  });

  it('resolves auto style to signature geometry for each built-in pattern', () => {
    expect(resolvePatternStyle('ocean', 'auto')).toBe('rosette');
    expect(resolvePatternStyle('box', 'auto')).toBe('box-crystal');
    expect(resolvePatternStyle('calm478', 'auto')).toBe('nautilus');
    expect(resolvePatternStyle('dirga', 'auto')).toBe('lotus-three');
    expect(resolvePatternStyle('coherence', 'auto')).toBe('harmony-eight');
    expect(resolvePatternStyle('star', 'auto')).toBe('starburst');
    expect(resolvePatternStyle('unknown', 'auto')).toBe('rosette');
  });

  for (const style of styles) {
    it(`computes smooth, finite, bounded points across multiple cycles for style: ${style}`, () => {
      const pattern = findPattern('ocean')!;
      const timeline = buildTimeline(pattern);
      const cycleMs = timeline.cycleMs;

      // Sample 120 points across 3 complete breath cycles
      const totalSamples = 120;
      for (let i = 0; i < totalSamples; i++) {
        const elapsed = (i / totalSamples) * (cycleMs * 3);
        const sample = sampleTimeline(timeline, elapsed);
        const pt = computeSeaPatternPoint(sample, style);

        // Verify numeric validity
        expect(Number.isFinite(pt.x)).toBe(true);
        expect(Number.isFinite(pt.y)).toBe(true);
        expect(Number.isFinite(pt.headingDeg)).toBe(true);
        expect(Number.isFinite(pt.volume)).toBe(true);

        // Verify reasonable bounding on 800x600 canvas (margin of 50px outside)
        expect(pt.x).toBeGreaterThanOrEqual(50);
        expect(pt.x).toBeLessThanOrEqual(750);
        expect(pt.y).toBeGreaterThanOrEqual(50);
        expect(pt.y).toBeLessThanOrEqual(550);

        // Verify heading is within -180..180
        expect(pt.headingDeg).toBeGreaterThanOrEqual(-180);
        expect(pt.headingDeg).toBeLessThanOrEqual(180);
      }
    });
  }
});
