/**
 * Pure parametric geometry for Tika's sea-pattern trail ("Meeresmuster").
 * Maps any (BreathSample, elapsedMs) to a continuous 2D position (x, y) and swimming heading
 * on an 800x600 ocean canvas centered at (400, 300).
 */
import { cueKeyFor, type BreathSample, type CueKey } from './core/timeline';

export type SeaPatternStyle =
  | 'auto'
  | 'rosette'
  | 'box-crystal'
  | 'nautilus'
  | 'lotus-three'
  | 'harmony-eight'
  | 'starburst';

export interface SeaPatternPoint {
  x: number;
  y: number;
  /** Swimming direction in degrees (0 = right, 90 = down). */
  headingDeg: number;
  cue: CueKey;
  volume: number;
  cycle: number;
  cycleProgress: number;
}

export const SEA_PATTERN_STYLES: Record<SeaPatternStyle, { name: string; description: string }> = {
  auto: {
    name: 'Passend zur Atemtechnik (Automatisch)',
    description: 'Jede Insel-Atemtechnik zeichnet ihr eigenes charakteristisches Meeresmuster.'
  },
  rosette: {
    name: '🌊 Gezeiten-Rosette (Wellen-Mandala)',
    description: 'Jeder Atemzug wölbt sich wie eine sanfte Woge nach außen und webt Blütenblätter im Meer.'
  },
  'box-crystal': {
    name: '🟦 Kompass-Kristall (Viereck-Spirograph)',
    description: 'Vier Phasen zeichnen vier klare Seiten. Mit jedem Atemzug dreht sich das Viereck ein Stück weiter.'
  },
  nautilus: {
    name: '🌙 Nautilus-Mondspirale',
    description: 'Aus der Mitte wächst mit jedem ruhigen Atemzug eine schimmernde Tiefsee-Muschelspirale.'
  },
  'lotus-three': {
    name: '🌿 Dreistufige Kelp-Blüte',
    description: 'Drei sanfte Wellenstufen beim Einatmen und ein weiter Bogen beim Ausatmen.'
  },
  'harmony-eight': {
    name: '🪸 Gleichklang-Acht (Lissajous)',
    description: 'Einatmen und Ausatmen schwingen in einer liegenden Acht, die sich langsam im Kreis dreht.'
  },
  starburst: {
    name: '⭐ Leuchtender Seestern-Kranz',
    description: 'Beim Einatmen schwimmt Tika in eine Sternspitze, beim Halten leuchtet die Spitze auf.'
  }
};

export const CUE_TRAIL_COLORS: Record<string, string> = {
  inhale: '#5eead4',
  holdIn: '#fde047',
  exhale: '#38bdf8',
  holdOut: '#a5b4fc'
};

const CX = 400;
const CY = 300;
const TAU = Math.PI * 2;

/** Resolves `'auto'` to the signature geometry for a given breathing pattern ID. */
export function resolvePatternStyle(patternId: string, style: SeaPatternStyle = 'auto'): Exclude<SeaPatternStyle, 'auto'> {
  if (style !== 'auto') return style;
  switch (patternId) {
    case 'ocean':
      return 'rosette';
    case 'box':
      return 'box-crystal';
    case 'calm478':
      return 'nautilus';
    case 'dirga':
      return 'lotus-three';
    case 'coherence':
      return 'harmony-eight';
    case 'star':
      return 'starburst';
    default:
      return 'rosette';
  }
}

/**
 * Pure continuous position function f(continuousCycle, volume, sample) -> { x, y }.
 * `u = sample.cycle + sample.cycleProgress` is strictly continuous across cycle boundaries.
 */
function rawPointAt(
  u: number,
  volume: number,
  resolvedStyle: Exclude<SeaPatternStyle, 'auto'>
): { x: number; y: number } {
  switch (resolvedStyle) {
    case 'rosette': {
      // 8 petals per full revolution, plus a slight golden precession so multi-turn sessions weave a rich mandala
      const angle = u * (TAU / 7.5);
      const baseR = 88 + 18 * Math.sin(u * 0.5);
      const waveR = baseR + 115 * volume;
      return {
        x: CX + Math.cos(angle) * waveR,
        y: CY + Math.sin(angle) * waveR
      };
    }

    case 'box-crystal': {
      // Smooth rounded square per cycle (u in 0..1 traces 4 sides), rotating by 20 degrees per breath cycle!
      const theta = u * TAU;
      // Superellipse / Fourier square in local coordinates (-1..1), continuous and differentiable
      const localX = Math.cos(theta) - 0.14 * Math.cos(3 * theta);
      const localY = Math.sin(theta) + 0.14 * Math.sin(3 * theta);
      const scale = 148 + 18 * volume;
      const rot = u * ((20 * Math.PI) / 180);
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      return {
        x: CX + (localX * cosR - localY * sinR) * scale,
        y: CY + (localX * sinR + localY * cosR) * scale
      };
    }

    case 'nautilus': {
      // Expanding and gently unwinding spiral so it stays strictly continuous across any number of cycles
      const breathWave = 0.5 - 0.5 * Math.cos((u / 6) * Math.PI);
      const angle = u * (TAU / 4.5);
      const spiralBase = 52 + breathWave * 115;
      const r = spiralBase + 46 * volume;
      return {
        x: CX + Math.cos(angle) * r,
        y: CY + Math.sin(angle) * r
      };
    }

    case 'lotus-three': {
      // 3-step harmonic ripple on each petal (reflecting Dirga's 3 stages)
      const angle = u * (TAU / 6.5);
      const ripple = 14 * Math.sin(u * 3 * TAU);
      const r = 92 + 108 * volume + ripple * volume;
      return {
        x: CX + Math.cos(angle) * r,
        y: CY + Math.sin(angle) * r
      };
    }

    case 'harmony-eight': {
      // Precessing Lissajous figure-eight (infinity loop per breath cycle, rotating gently each cycle)
      const t = u * TAU;
      const lx = Math.sin(t) * 195;
      const ly = Math.sin(2 * t) * 105;
      const rot = u * ((18 * Math.PI) / 180);
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      return {
        x: CX + lx * cosR - ly * sinR,
        y: CY + lx * sinR + ly * cosR
      };
    }

    case 'starburst': {
      // 5-pointed star with a slow precession so subsequent 5-breath rings interlace
      const angle = u * (TAU / 5.25) - Math.PI / 2;
      const r = 72 + 145 * volume;
      return {
        x: CX + Math.cos(angle) * r,
        y: CY + Math.sin(angle) * r
      };
    }
  }
}

/**
 * Computes Tika's exact position and heading on the sea-pattern canvas for a given `BreathSample`.
 */
export function computeSeaPatternPoint(
  sample: BreathSample,
  style: SeaPatternStyle = 'auto'
): SeaPatternPoint {
  const resolved = resolvePatternStyle(sample.pattern.id, style);
  const u = sample.cycle + sample.cycleProgress;
  const pos = rawPointAt(u, sample.volume, resolved);

  // Small forward delta along the curve to compute smooth swimming heading
  const du = 0.008;
  const ahead = rawPointAt(u + du, sample.volume, resolved);
  const dx = ahead.x - pos.x;
  const dy = ahead.y - pos.y;
  const headingDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  return {
    x: pos.x,
    y: pos.y,
    headingDeg,
    cue: cueKeyFor(sample.span),
    volume: sample.volume,
    cycle: sample.cycle,
    cycleProgress: sample.cycleProgress
  };
}
