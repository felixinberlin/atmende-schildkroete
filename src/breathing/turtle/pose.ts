/**
 * Tika-specific pose: maps a generic BreathSample onto the turtle rig.
 * Pure function: same sample in, same numbers out. All values are continuous over time.
 */
import { clamp, easeInOutCubic, easeOutSine } from '../core/easing';
import type { BreathSample } from '../core/timeline';

export interface PartTransform {
  tx?: number;
  ty?: number;
  rotate?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
}

export type RigPartKey =
  | 'character'
  | 'guides'
  | 'plastron'
  | 'carapace'
  | 'headNeck'
  | 'eye'
  | 'flipperFrontRt'
  | 'flipperFrontLt'
  | 'flipperRearRt'
  | 'flipperRearLt'
  | 'breathFx';

export type TurtlePose = Record<RigPartKey, PartTransform>;

export interface PoseOptions {
  /** Pattern time in ms; drives idle details such as blinking. */
  elapsedMs: number;
  reducedMotion?: boolean;
}

const BLINK_PERIOD_MS = 7000;
const BLINK_MS = 160;
const NOSTRIL = { x: 674, y: 250 };

/** 0 = open, 1 = closed; a smooth triangle once per period. */
function blink(elapsedMs: number): number {
  const t = (elapsedMs % BLINK_PERIOD_MS) - (BLINK_PERIOD_MS - BLINK_MS);
  return t <= 0 ? 0 : 1 - Math.abs((2 * t) / BLINK_MS - 1);
}

/** Eyelid relaxation 0..1: closes halfway during a full-lung hold and reopens early in the exhale. */
function eyeRelax(s: BreathSample): number {
  const fullHold = (span: BreathSample['span']) => span.phase.kind === 'hold' && span.fromVolume > 0.5;
  if (fullHold(s.span)) return easeInOutCubic(s.phaseElapsedMs / 400);
  if (s.kind === 'exhale' && fullHold(s.previous)) return 1 - easeInOutCubic(s.phaseProgress / 0.3);
  return 0;
}

export function computeTurtlePose(s: BreathSample, { elapsedMs, reducedMotion = false }: PoseOptions): TurtlePose {
  const v = s.volume;
  // Standard regions mapped onto turtle anatomy: abdominal → soft plastron,
  // thoracic → flanks (rear flippers), clavicular → shoulders/neck (head lift).
  const belly = s.regions.abdominal ?? v;
  const flank = s.regions.thoracic ?? v;
  const chest = s.regions.clavicular ?? v;
  const motion = reducedMotion ? 0 : 1;

  const wave = s.cycleProgress * Math.PI * 2;

  let breathFx: PartTransform = { opacity: 0 };
  if (s.kind === 'exhale' && !reducedMotion) {
    const p = easeOutSine(s.phaseProgress);
    const fadeIn = clamp(s.phaseProgress / 0.1);
    const fadeOut = p < 0.8 ? 1 : (1 - p) * 5;
    breathFx = {
      tx: NOSTRIL.x + p * 85,
      ty: NOSTRIL.y - p * 170,
      scaleX: 0.3 + p,
      scaleY: 0.3 + p,
      opacity: 0.9 * fadeIn * clamp(fadeOut)
    };
  }

  const eyeOpen = 1 - 0.32 * eyeRelax(s) - 0.9 * blink(elapsedMs) * motion;

  return {
    character: { ty: -12 * Math.sin(wave) * motion, rotate: 0.6 * Math.sin(wave) * motion },
    guides: { scaleX: 0.92 + 0.24 * v, scaleY: 0.92 + 0.24 * v, opacity: 0.2 + 0.45 * v },
    plastron: { scaleX: 1 + 0.05 * belly, scaleY: 1 + 0.04 * flank + 0.12 * belly, ty: 2.5 * belly },
    carapace: { scaleX: 1 + 0.04 * v, scaleY: 1 + 0.04 * v, ty: -5 * v },
    headNeck: { rotate: -3.5 * chest * motion, tx: 6.5 * chest * motion, ty: -5.5 * chest * motion },
    eye: { scaleY: Math.max(0.1, eyeOpen) },
    flipperFrontRt: { rotate: -6.8 * v * motion, ty: -4 * v * motion },
    flipperFrontLt: { rotate: -5 * v * motion },
    flipperRearRt: { rotate: 3.5 * flank * motion },
    flipperRearLt: { rotate: -2 * flank * motion },
    breathFx
  };
}
