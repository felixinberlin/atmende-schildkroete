import { describe, expect, it } from 'vitest';
import { buildTimeline, sampleTimeline } from '../core/timeline';
import { BUILTIN_PATTERNS, findPattern } from '../patterns';
import { FIGURE, armPath } from './figure';
import { computeHumanPose, type HumanPose } from './pose';

const HUMAN_FIGURE_MAX_ARM_DEG = FIGURE.armRaiseMaxDeg;

const poseAt = (id: string, t: number, reducedMotion = false) =>
  computeHumanPose(sampleTimeline(buildTimeline(findPattern(id)!), t), { reducedMotion });

function scalars(p: HumanPose): Record<string, number> {
  return {
    ...Object.fromEntries(Object.entries(p.fill).map(([k, v]) => [`fill.${k}`, v])),
    ...Object.fromEntries(Object.entries(p.muscle).map(([k, v]) => [`muscle.${k}`, v])),
    diaphragmFlatten: p.diaphragmFlatten,
    ribLift: p.ribLift,
    clavicleLift: p.clavicleLift,
    bellyOut: p.bellyOut,
    chestOut: p.chestOut,
    bellyHand: p.bellyHand,
    chestHand: p.chestHand,
    chestHandLift: p.chestHandLift,
    armRaise: p.armRaise,
    ...Object.fromEntries(p.air.map((d, i) => [`air${i}.opacity`, d.opacity]))
  };
}

describe('human breathing guide pose', () => {
  it('is continuous for every pattern (air dots only jump while invisible)', () => {
    const failures: string[] = [];
    for (const pattern of BUILTIN_PATTERNS) {
      const tl = buildTimeline(pattern);
      let prev = scalars(computeHumanPose(sampleTimeline(tl, 0)));
      for (let t = 2; t <= tl.cycleMs * 2; t += 2) {
        const next = scalars(computeHumanPose(sampleTimeline(tl, t)));
        for (const key of new Set([...Object.keys(prev), ...Object.keys(next)])) {
          const jump = Math.abs((next[key] ?? 0) - (prev[key] ?? 0));
          if (jump >= 0.05) failures.push(`${pattern.id} ${key} @${t}ms jumps ${jump.toFixed(3)}`);
        }
        prev = next;
      }
    }
    expect(failures.slice(0, 10)).toEqual([]);
  });

  it('three-part breath fills belly → ribs → upper chest, each with its muscle', () => {
    const belly = poseAt('dirga', 1400);
    expect(belly.leading).toBe('abdominal');
    expect(belly.fill.abdominal).toBeGreaterThan(0.9);
    expect(belly.fill.thoracic).toBe(0);
    expect(belly.muscle.diaphragm).toBeGreaterThan(0.9);

    const ribs = poseAt('dirga', 2900);
    expect(ribs.leading).toBe('thoracic');
    expect(ribs.muscle.intercostals).toBeGreaterThan(0.9);
    expect(ribs.fill.clavicular).toBe(0);

    const chest = poseAt('dirga', 4400);
    expect(chest.leading).toBe('clavicular');
    expect(chest.muscle.accessory).toBeGreaterThan(0.9);
  });

  it('default patterns breathe belly-first with a quiet upper chest', () => {
    const fullInhale = poseAt('ocean', 4000);
    expect(fullInhale.fill.abdominal).toBe(1);
    expect(fullInhale.fill.thoracic).toBeCloseTo(0.5);
    expect(fullInhale.fill.clavicular).toBe(0);
    expect(fullInhale.diaphragmFlatten).toBe(1);
  });

  it('muscles relax and the diaphragm domes back up as the air leaves', () => {
    const end = poseAt('ocean', 9000);
    expect(end.muscle.diaphragm).toBeCloseTo(0);
    expect(end.diaphragmFlatten).toBeCloseTo(0);
  });

  it('air moves in on inhale, out on exhale, and rests during holds', () => {
    const a = poseAt('ocean', 1000);
    const b = poseAt('ocean', 1050);
    expect(b.air[0].t).toBeGreaterThan(a.air[0].t);
    const c = poseAt('ocean', 6000);
    const d = poseAt('ocean', 6050);
    expect(d.air[0].t).toBeLessThan(c.air[0].t);
    expect(poseAt('ocean', 4500).air).toEqual([]);
  });

  it('reduced motion keeps the fill (essential information) but drops moving particles', () => {
    const p = poseAt('ocean', 2000, true);
    expect(p.air).toEqual([]);
    expect(p.fill.abdominal).toBeGreaterThan(0.5);
  });

  it('belly hand moves more than the chest hand for ocean', () => {
    const fullInhale = poseAt('ocean', 4000);
    expect(fullInhale.bellyHand).toBeGreaterThan(fullInhale.chestHand);
    expect(fullInhale.bellyHand).toBeCloseTo(1);
    expect(fullInhale.chestHand).toBeLessThan(0.3);
  });

  it('chest hand rises in Dirga stage 3', () => {
    const stage1 = poseAt('dirga', 1400);
    expect(stage1.bellyHand).toBeGreaterThan(0.9);
    expect(stage1.chestHand).toBe(0);

    const stage2 = poseAt('dirga', 2900);
    expect(stage2.chestHand).toBeLessThan(0.5);
    expect(stage2.chestHandLift).toBe(0);

    const stage3 = poseAt('dirga', 4400);
    expect(stage3.chestHand).toBeGreaterThan(stage2.chestHand);
    expect(stage3.chestHand).toBeGreaterThan(0.9);
    expect(stage3.chestHandLift).toBeGreaterThan(stage2.chestHandLift);
    expect(stage3.chestHandLift).toBeGreaterThan(0.9);
  });

  it('muscle.abdominals > 0 only during exhale', () => {
    // Inhale: 0
    expect(poseAt('ocean', 2000).muscle.abdominals).toBe(0);
    // Hold in: 0
    expect(poseAt('ocean', 4500).muscle.abdominals).toBe(0);
    // Exhale: > 0 (peaks gently at <= 0.6)
    const midExhale = poseAt('ocean', 7000);
    expect(midExhale.muscle.abdominals).toBeGreaterThan(0.5);
    expect(midExhale.muscle.abdominals).toBeLessThanOrEqual(0.6);
    // Hold out / rest: 0
    expect(poseAt('ocean', 9500).muscle.abdominals).toBe(0);

    // With exhaleStyle = 'passive', abdominals stay 0 during exhale too
    const passiveExhale = computeHumanPose(
      sampleTimeline(buildTimeline(findPattern('ocean')!), 7000),
      { exhaleStyle: 'passive' }
    );
    expect(passiveExhale.muscle.abdominals).toBe(0);
  });

  it('arms are raised at the end of the inhale for star and lowered at rest; arms stay down for all other patterns', () => {
    // Star pattern: inhale ends at 3000ms
    const starInhaleEnd = poseAt('star', 3000);
    expect(starInhaleEnd.armRaise).toBeCloseTo(1);
    expect(starInhaleEnd.armAngle).toBeCloseTo(HUMAN_FIGURE_MAX_ARM_DEG); // overhead
    expect(starInhaleEnd.armsMode).toBe('raise-on-inhale');

    // Star pattern at rest (end of holdOut, cycle time 9000ms): volume is 0, arms lowered
    const starRest = poseAt('star', 9000);
    expect(starRest.armRaise).toBeCloseTo(0);
    expect(starRest.armAngle).toBeCloseTo(0);

    // Star default regions shift breath upward at full volume
    expect(starInhaleEnd.fill.abdominal).toBeCloseTo(0.6);
    expect(starInhaleEnd.fill.thoracic).toBeCloseTo(0.8);
    expect(starInhaleEnd.fill.clavicular).toBeCloseTo(0.5);

    // All other patterns keep arms down
    for (const pattern of BUILTIN_PATTERNS.filter(p => p.id !== 'star')) {
      const tl = buildTimeline(pattern);
      for (let t = 0; t <= tl.cycleMs; t += 500) {
        const pose = computeHumanPose(sampleTimeline(tl, t));
        expect(pose.armRaise).toBe(0);
        expect(pose.armAngle).toBe(0);
        expect(pose.armsMode).toBe('hands-on-body');
      }
    }
  });

  it('reduced motion keeps hands cue at reduced amplitude and reverts star to hands-on-body', () => {
    const oceanReduced = poseAt('ocean', 4000, true);
    expect(oceanReduced.bellyHand).toBeCloseTo(0.5);
    expect(oceanReduced.chestHand).toBeLessThan(0.15);
    expect(oceanReduced.bellyHand).toBeGreaterThan(oceanReduced.chestHand);

    const starReduced = poseAt('star', 3000, true);
    expect(starReduced.armsMode).toBe('hands-on-body');
    expect(starReduced.armRaise).toBe(0);
    expect(starReduced.armAngle).toBe(0);
  });

  it('hands always stay on the body walls (also with reduced motion)', () => {
    for (const reduced of [false, true]) {
      for (const [id, t] of [['ocean', 4000], ['dirga', 2900], ['dirga', 4400], ['coherence', 7000]] as const) {
        const p = poseAt(id, t, reduced);
        expect(p.bellyHand).toBe(p.bellyOut);
        expect(p.chestHand).toBe(p.chestOut);
        expect(p.chestHandLift).toBe(p.clavicleLift);
      }
    }
  });

  it('arms stay attached to the fixed shoulder; only the hand end moves', () => {
    const [sx, sy] = FIGURE.shoulder;
    for (const hand of ['belly', 'chest'] as const) {
      expect(armPath(hand, 7, -2).startsWith(`M ${sx} ${sy} `)).toBe(true);
      expect(armPath(hand, 7, -2)).not.toBe(armPath(hand));
    }
  });

  it('raised arms end above and behind the head, not through the face', () => {
    // Hanging arm vector (shoulder -> hand) rotated by the max angle must end above the head and behind its centre.
    const [sx, sy] = FIGURE.shoulder;
    const hand = { x: 87 - sx, y: 156 - sy };
    const a = (-FIGURE.armRaiseMaxDeg * Math.PI) / 180;
    const end = { x: sx + hand.x * Math.cos(a) - hand.y * Math.sin(a), y: sy + hand.x * Math.sin(a) + hand.y * Math.cos(a) };
    const head = { x: 96, y: 42, r: 22 };
    expect(end.y).toBeLessThan(head.y);
    // The whole raised arm (sampled along the shoulder->hand line) stays clear of the head circle.
    for (let k = 0; k <= 10; k++) {
      const x = sx + ((end.x - sx) * k) / 10;
      const y = sy + ((end.y - sy) * k) / 10;
      expect(Math.hypot(x - head.x, y - head.y)).toBeGreaterThan(head.r);
    }
  });
});
