import { describe, expect, it } from 'vitest';
import { buildTimeline, sampleTimeline } from '../core/timeline';
import { BUILTIN_PATTERNS, findPattern } from '../patterns';
import { computeTurtlePose, type TurtlePose } from './pose';
import { toCssTransform } from './rig';

const poseAt = (id: string, t: number, reducedMotion = false) =>
  computeTurtlePose(sampleTimeline(buildTimeline(findPattern(id)!), t), { elapsedMs: t, reducedMotion });

function flatten(pose: TurtlePose): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [part, t] of Object.entries(pose)) for (const [k, v] of Object.entries(t)) out[`${part}.${k}`] = v ?? 0;
  return out;
}

describe('turtle pose', () => {
  it('is continuous frame-to-frame for every pattern (no snapping)', () => {
    const failures: string[] = [];
    for (const pattern of BUILTIN_PATTERNS) {
      const tl = buildTimeline(pattern);
      let prev = flatten(computeTurtlePose(sampleTimeline(tl, 0), { elapsedMs: 0 }));
      for (let t = 2; t <= tl.cycleMs * 2; t += 2) {
        const next = flatten(computeTurtlePose(sampleTimeline(tl, t), { elapsedMs: t }));
        for (const key of Object.keys(next)) {
          const jump = Math.abs(next[key] - (prev[key] ?? 0));
          // Bubbles re-spawn at the nostril at exhale start while invisible (opacity 0); skip their position.
          if (key.startsWith('breathFx.') && key !== 'breathFx.opacity') continue;
          if (jump >= 0.05) failures.push(`${pattern.id} ${key} @${t}ms jumps ${jump.toFixed(3)}`);
        }
        prev = next;
      }
    }
    expect(failures.slice(0, 10)).toEqual([]);
  });

  it('dirga fills belly, then flanks, then lifts the head (three-part breath)', () => {
    const bellyStage = poseAt('dirga', 1400);
    expect(bellyStage.plastron.scaleY).toBeGreaterThan(1.1);
    expect(bellyStage.flipperRearRt.rotate).toBeCloseTo(0);
    const flankStage = poseAt('dirga', 2900);
    expect(flankStage.flipperRearRt.rotate).toBeGreaterThan(3);
    expect(flankStage.headNeck.rotate).toBeCloseTo(0);
    const chestStage = poseAt('dirga', 4400);
    expect(chestStage.headNeck.rotate).toBeLessThan(-3);
  });

  it('rests at the neutral pose with empty lungs', () => {
    const rest = poseAt('ocean', 9500);
    expect(rest.plastron).toMatchObject({ scaleX: 1, scaleY: 1, ty: 0 });
    expect(rest.breathFx.opacity).toBe(0);
  });

  it('shows bubbles only while exhaling', () => {
    expect(poseAt('ocean', 2000).breathFx.opacity).toBe(0);
    expect(poseAt('ocean', 6500).breathFx.opacity).toBeGreaterThan(0.5);
  });

  it('reduced motion keeps breathing but freezes head, flippers and bubbles', () => {
    const p = poseAt('ocean', 4000, true);
    expect(p.plastron.scaleY).toBeGreaterThan(1.1);
    expect(p.headNeck.rotate).toBeCloseTo(0);
    expect(p.flipperFrontRt.rotate).toBeCloseTo(0);
    expect(p.character.ty).toBeCloseTo(0);
    expect(poseAt('ocean', 6500, true).breathFx.opacity).toBe(0);
  });

  it('formats CSS transforms', () => {
    expect(toCssTransform({ tx: 1.23456, rotate: -2 })).toBe('translate(1.235px, 0px) rotate(-2deg) scale(1, 1)');
  });
});
