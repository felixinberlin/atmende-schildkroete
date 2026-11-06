import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BUILTIN_PATTERNS, findPattern } from '../patterns';
import { BreathClock } from './clock';
import { toJsonSchema } from './jsonSchema';
import { fromFourPhase, isHoldFree, parsePattern } from './schema';
import { buildTimeline, sampleTimeline } from './timeline';

describe('schema contract', () => {
  it('accepts all built-in patterns', () => {
    expect(BUILTIN_PATTERNS.map(p => p.id)).toEqual(['ocean', 'box', 'calm478', 'dirga', 'coherence', 'star', 'custom']);
  });

  it('rejects invalid patterns with a readable message', () => {
    expect(() => parsePattern({ schemaVersion: '1', id: 'x', name: 'x', phases: [] })).toThrow(/Atemmuster/);
    expect(() => parsePattern({ schemaVersion: '2', id: 'x', name: 'x', phases: [{ kind: 'inhale', durationMs: 1 }] })).toThrow();
    expect(() =>
      parsePattern({ schemaVersion: '1', id: 'x', name: 'x', phases: [{ kind: 'hold', durationMs: 1000, targetVolume: 1 }] })
    ).toThrow();
  });

  it('supports patterns beyond four phases (physiological sigh)', () => {
    const sigh = parsePattern({
      schemaVersion: '1',
      id: 'sigh',
      name: 'Physiological sigh',
      phases: [
        { kind: 'inhale', durationMs: 2000, targetVolume: 0.8 },
        { kind: 'inhale', durationMs: 800 },
        { kind: 'exhale', durationMs: 6000 }
      ]
    });
    const tl = buildTimeline(sigh);
    expect(sampleTimeline(tl, 2000).volume).toBeCloseTo(0.8);
    expect(sampleTimeline(tl, 2800).volume).toBeCloseTo(1);
    expect(isHoldFree(sigh)).toBe(true);
  });

  it('fromFourPhase clamps inputs', () => {
    const p = fromFourPhase({ inhale: 10, holdIn: -5, exhale: 99_999, holdOut: Number.NaN });
    expect(p.phases.map(ph => ph.durationMs)).toEqual([1000, 0, 20_000, 0]);
  });

  it('published JSON Schema file matches the Zod source (run `npm run schema` if this fails)', () => {
    const file = JSON.parse(readFileSync(new URL('../../../schema/breathing-pattern.v1.schema.json', import.meta.url), 'utf8'));
    expect(file).toEqual(toJsonSchema());
  });
});

describe('timeline', () => {
  const ocean = buildTimeline(findPattern('ocean')!);

  it('walks the phases in order', () => {
    expect(ocean.cycleMs).toBe(10_000);
    expect(sampleTimeline(ocean, 0).kind).toBe('inhale');
    expect(sampleTimeline(ocean, 4500).kind).toBe('hold');
    expect(sampleTimeline(ocean, 6000).kind).toBe('exhale');
    expect(sampleTimeline(ocean, 9500).span.phase.label).toBe('Ruhe');
    expect(sampleTimeline(ocean, 12_000)).toMatchObject({ cycle: 1, kind: 'inhale' });
  });

  it('skips zero-length phases', () => {
    const coherence = buildTimeline(findPattern('coherence')!);
    expect(coherence.spans.map(s => s.phase.kind)).toEqual(['inhale', 'exhale']);
    const custom = buildTimeline(fromFourPhase({ inhale: 3000, holdIn: 0, exhale: 3000, holdOut: 0 }));
    expect(custom.spans).toHaveLength(2);
  });

  it('volume is full at the end of inhale and empty after exhale', () => {
    expect(sampleTimeline(ocean, 4000).volume).toBeCloseTo(1);
    expect(sampleTimeline(ocean, 4999).volume).toBeCloseTo(1);
    expect(sampleTimeline(ocean, 9000).volume).toBeCloseTo(0);
  });

  it('volume and regions are continuous for every pattern', () => {
    const failures: string[] = [];
    for (const pattern of BUILTIN_PATTERNS) {
      const tl = buildTimeline(pattern);
      let prev = sampleTimeline(tl, 0);
      for (let t = 1; t <= tl.cycleMs * 2; t += 1) {
        const s = sampleTimeline(tl, t);
        if (Math.abs(s.volume - prev.volume) >= 0.01) failures.push(`${pattern.id} volume @${t}`);
        for (const r of tl.regions) {
          if (Math.abs(s.regions[r]! - prev.regions[r]!) >= 0.01) failures.push(`${pattern.id} ${r} @${t}`);
        }
        prev = s;
      }
    }
    expect(failures.slice(0, 10)).toEqual([]);
  });

  it('dirga segments lead their region in order', () => {
    const dirga = buildTimeline(findPattern('dirga')!);
    const mid1 = sampleTimeline(dirga, 750);
    expect(mid1.segmentIndex).toBe(0);
    expect(mid1.regions.abdominal).toBeGreaterThan(0.3);
    expect(mid1.regions.thoracic).toBe(0);
    const mid3 = sampleTimeline(dirga, 3750);
    expect(mid3.segmentIndex).toBe(2);
    expect(mid3.regions.abdominal).toBe(1);
    expect(mid3.regions.thoracic).toBe(1);
    expect(mid3.regions.clavicular).toBeGreaterThan(0.3);
  });
});

describe('BreathClock', () => {
  it('pauses and resumes without losing position', () => {
    let now = 0;
    const clock = new BreathClock(() => now);
    clock.start();
    now = 3000;
    clock.pause();
    now = 10_000;
    expect(clock.elapsed()).toBe(3000);
    clock.start();
    now = 11_000;
    expect(clock.elapsed()).toBe(4000);
  });

  it('changing speed keeps the position and integrates afterwards', () => {
    let now = 0;
    const clock = new BreathClock(() => now);
    clock.start();
    now = 2000;
    clock.setSpeed(2);
    expect(clock.elapsed()).toBe(2000);
    now = 3000;
    expect(clock.elapsed()).toBe(4000);
    clock.setSpeed(100);
    expect(clock.speed).toBe(3);
  });
});
