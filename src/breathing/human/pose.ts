/**
 * Human breathing guide: maps a BreathSample to a deliberately simple, "follow the air" figure.
 * Pure: numbers only, no DOM. All values are continuous over time.
 *
 * Regions use the standard three-part terminology:
 *   abdominal  (belly)            → driven by the diaphragm
 *   thoracic   (ribs / flanks)    → driven by the external intercostal muscles
 *   clavicular (upper chest)      → accessory neck muscles (scalenes, sternocleidomastoid)
 */
import { clamp } from '../core/easing';
import type { BreathingRegion, ExhaleStyle, GuideArms } from '../core/schema';
import { FIGURE } from './figure';
import type { BreathSample } from '../core/timeline';

export const AIR_DOT_COUNT = 4;

export interface AirDot {
  /** Position along the airway path, 0 = nostril, 1 = deep belly. */
  t: number;
  opacity: number;
}

export interface HumanPose {
  /** Air fill per region, 0..1 (drawn as a rising level). */
  fill: Record<BreathingRegion, number>;
  /** Muscle activation 0..1 (highlight strength). */
  muscle: {
    diaphragm: number;
    intercostals: number;
    accessory: number;
    abdominals: number;
  };
  /** Diaphragm dome: 0 = relaxed (domed up), 1 = contracted (flat, pushed down). */
  diaphragmFlatten: number;
  /** Rib lift ("bucket handle") 0..1. */
  ribLift: number;
  /** Collarbone lift 0..1. */
  clavicleLift: number;
  /** Outward movement of the belly wall / chest wall 0..1 (already scaled for reduced motion). */
  bellyOut: number;
  chestOut: number;
  /**
   * Hand movement 0..1. The hands rest on the body walls, so they always equal the wall movement
   * (bellyHand = bellyOut, chestHand = chestOut, chestHandLift = clavicleLift) and never come off the body.
   */
  bellyHand: number;
  chestHand: number;
  chestHandLift: number;
  /** Arm cue variant actually shown (reduced motion always shows hands on the body). */
  armsMode: GuideArms;
  /** Arm raise progress 0..1 (0 at rest, 1 fully raised). 0 for hands-on-body. */
  armRaise: number;
  /** Arm rotation in degrees from hanging (0) to straight overhead (FIGURE.armRaiseMaxDeg). */
  armAngle: number;
  /** Air particles travelling through the airway. Empty during holds. */
  air: AirDot[];
  /** Region currently leading the breath (for labels), if any. */
  leading?: BreathingRegion;
}

export interface HumanPoseOptions {
  reducedMotion?: boolean;
  /** Override the pattern's `guide.arms`. */
  arms?: GuideArms;
  /** Override the pattern's `exhaleStyle`. */
  exhaleStyle?: ExhaleStyle;
}

/**
 * Regions the pattern doesn't stage explicitly are derived from lung volume as calm,
 * belly-led (diaphragmatic) breathing — the commonly recommended default:
 * the belly fills first, the ribs join in gently, the upper chest stays quiet.
 * In 'raise-on-inhale' mode, raising the arms shifts breath upward into thoracic/clavicular.
 */
function defaultRegions(
  volume: number,
  armsMode: GuideArms = 'hands-on-body'
): Record<BreathingRegion, number> {
  if (armsMode === 'raise-on-inhale') {
    return {
      abdominal: 0.6 * clamp(volume / 0.7),
      thoracic: 0.8 * clamp(volume / 0.85),
      clavicular: 0.5 * clamp((volume - 0.3) / 0.7)
    };
  }
  return {
    abdominal: clamp(volume / 0.7),
    thoracic: 0.5 * clamp((volume - 0.5) / 0.5),
    clavicular: 0
  };
}

/** Smooth 0→1→0 envelope so particles fade in/out at phase boundaries (keeps everything continuous). */
function phaseEnvelope(progress: number): number {
  return clamp(progress / 0.12) * clamp((1 - progress) / 0.12);
}

export function computeHumanPose(s: BreathSample, options: HumanPoseOptions = {}): HumanPose {
  const { reducedMotion = false } = options;
  const patternArms = options.arms ?? s.pattern.guide?.arms ?? 'hands-on-body';
  const armsMode: GuideArms = reducedMotion ? 'hands-on-body' : patternArms;
  const exhaleStyle = options.exhaleStyle ?? s.pattern.exhaleStyle ?? 'gentle';

  const base = defaultRegions(s.volume, armsMode);
  const fill: Record<BreathingRegion, number> = {
    abdominal: s.regions.abdominal ?? base.abdominal,
    thoracic: s.regions.thoracic ?? base.thoracic,
    clavicular: s.regions.clavicular ?? base.clavicular
  };

  // Gentle active exhale cue (standard instruction: tighten the belly slightly while breathing out).
  // 0 at the phase edges, so it stays continuous; 0 during inhale and holds.
  let abdominals = 0;
  if (exhaleStyle !== 'passive' && s.kind === 'exhale') {
    abdominals = 0.6 * Math.sin(Math.PI * s.phaseProgress);
  }

  // Inspiratory muscles are "on" while their region holds air and relax as the air leaves.
  const muscle = {
    diaphragm: fill.abdominal,
    intercostals: fill.thoracic,
    accessory: fill.clavicular,
    abdominals
  };

  // Wall movement. The upper chest (where the chest hand rests) moves mainly with clavicular breathing;
  // rib expansion moves it only a little — so in calm belly breathing the chest hand stays almost still.
  // Reduced motion halves the movement but keeps the belly/chest difference (essential instruction).
  const amp = reducedMotion ? 0.5 : 1;
  const bellyOut = amp * fill.abdominal;
  const chestOut = amp * Math.max(0.45 * fill.thoracic, fill.clavicular);
  const clavicleLift = amp * fill.clavicular;

  const armRaise = armsMode === 'raise-on-inhale' ? s.volume : 0;
  const armAngle = FIGURE.armRaiseMaxDeg * armRaise;

  const air: AirDot[] = [];
  if (!reducedMotion && s.kind !== 'hold') {
    const envelope = phaseEnvelope(s.phaseProgress);
    for (let k = 0; k < AIR_DOT_COUNT; k++) {
      const travel = (s.phaseProgress * 2 + k / AIR_DOT_COUNT) % 1; // each dot crosses the airway twice per phase
      const t = s.kind === 'inhale' ? travel : 1 - travel;
      const edgeFade = Math.sin(Math.PI * travel); // invisible where dots wrap around
      air.push({ t, opacity: envelope * edgeFade });
    }
  }

  let leading: BreathingRegion | undefined;
  if (s.segmentIndex !== undefined && s.kind === 'inhale') leading = s.span.segments[s.segmentIndex].region;
  else if (s.kind === 'inhale') leading = 'abdominal';

  return {
    fill,
    muscle,
    diaphragmFlatten: fill.abdominal,
    ribLift: fill.thoracic,
    clavicleLift,
    bellyOut,
    chestOut,
    bellyHand: bellyOut,
    chestHand: chestOut,
    chestHandLift: clavicleLift,
    armsMode,
    armRaise,
    armAngle,
    air,
    leading
  };
}
