/**
 * Pure breathing timeline: maps a position in the cycle (pattern time, ms at speed 1)
 * to a fully described breath sample. No DOM, no clock, no rendering assumptions.
 */
import { clamp, easeInOutCubic, easeOutSine } from './easing';
import type { BreathingPattern, BreathingRegion, BreathPhase, Easing, PhaseKind } from './schema';

const EASINGS: Record<Easing, (t: number) => number> = {
  linear: t => clamp(t),
  easeInOutCubic,
  easeOutSine
};

interface SegmentSpan {
  region: BreathingRegion;
  label?: string;
  startMs: number;
  durationMs: number;
}

export interface PhaseSpan {
  /** Index into `pattern.phases`. */
  index: number;
  phase: BreathPhase;
  startMs: number;
  durationMs: number;
  fromVolume: number;
  toVolume: number;
  segments: SegmentSpan[];
}

export interface Timeline {
  pattern: BreathingPattern;
  /** Phases with a positive duration, in order. */
  spans: PhaseSpan[];
  cycleMs: number;
  /** Every body region referenced by any segment. */
  regions: BreathingRegion[];
}

export interface BreathSample {
  /** Completed cycles before this sample. */
  cycle: number;
  cycleProgress: number;
  span: PhaseSpan;
  /** The span played before this one (wraps around the cycle). */
  previous: PhaseSpan;
  kind: PhaseKind;
  phaseProgress: number;
  phaseElapsedMs: number;
  phaseRemainingMs: number;
  /** Lung fill 0..1, continuous across phase and cycle boundaries. */
  volume: number;
  /** Index into `span.segments`, when the phase is segmented. */
  segmentIndex?: number;
  /**
   * Fill per region 0..1, only for regions the pattern stages explicitly (e.g. Dirga).
   * Absent regions are up to the renderer (typically derived from `volume`).
   */
  regions: Partial<Record<BreathingRegion, number>>;
  /** The breathing pattern being played (renderers read pattern-level options such as `guide`). */
  pattern: BreathingPattern;
}

function targetVolume(phase: BreathPhase, current: number): number {
  if (phase.kind === 'hold') return current;
  return phase.targetVolume ?? (phase.kind === 'inhale' ? 1 : 0);
}

export function buildTimeline(pattern: BreathingPattern): Timeline {
  const active = pattern.phases.map((phase, index) => ({ phase, index })).filter(p => p.phase.durationMs > 0);

  // The loop starts at the volume the previous cycle ends with, so the cycle seam is continuous.
  let volume = active.reduce((v, { phase }) => targetVolume(phase, v), 0);

  let startMs = 0;
  const spans: PhaseSpan[] = active.map(({ phase, index }) => {
    const fromVolume = volume;
    volume = targetVolume(phase, volume);
    const totalWeight = phase.segments?.reduce((sum, s) => sum + s.durationMs, 0) ?? 0;
    let segStart = startMs;
    const segments: SegmentSpan[] = (phase.segments ?? []).map(s => {
      const durationMs = (s.durationMs / totalWeight) * phase.durationMs;
      const span = { region: s.region, label: s.label, startMs: segStart, durationMs };
      segStart += durationMs;
      return span;
    });
    const span = { index, phase, startMs, durationMs: phase.durationMs, fromVolume, toVolume: volume, segments };
    startMs += phase.durationMs;
    return span;
  });

  const regions = [...new Set(spans.flatMap(s => s.segments.map(seg => seg.region)))];
  return { pattern, spans, cycleMs: startMs, regions };
}

function ease(phase: BreathPhase, t: number): number {
  return EASINGS[phase.easing ?? 'easeInOutCubic'](t);
}

/** Sample the timeline at `elapsedMs` pattern time (any non-negative value; it wraps per cycle). */
export function sampleTimeline(timeline: Timeline, elapsedMs: number): BreathSample {
  const { spans, cycleMs } = timeline;
  const total = Math.max(0, elapsedMs);
  const cycle = Math.floor(total / cycleMs);
  const t = total - cycle * cycleMs;

  let i = spans.length - 1;
  while (i > 0 && t < spans[i].startMs) i--;
  const span = spans[i];

  const phaseElapsedMs = t - span.startMs;
  const phaseProgress = clamp(phaseElapsedMs / span.durationMs);
  const volume = span.fromVolume + (span.toVolume - span.fromVolume) * ease(span.phase, phaseProgress);

  const regions: Partial<Record<BreathingRegion, number>> = {};
  for (const region of timeline.regions) regions[region] = volume;

  let segmentIndex: number | undefined;
  span.segments.forEach((seg, k) => {
    const local = clamp((t - seg.startMs) / seg.durationMs);
    if (t >= seg.startMs) segmentIndex = k;
    regions[seg.region] = span.fromVolume + (span.toVolume - span.fromVolume) * ease(span.phase, local);
  });

  return {
    cycle,
    cycleProgress: t / cycleMs,
    span,
    previous: spans[(i - 1 + spans.length) % spans.length],
    kind: span.phase.kind,
    phaseProgress,
    phaseElapsedMs,
    phaseRemainingMs: span.durationMs - phaseElapsedMs,
    volume,
    segmentIndex,
    regions,
    pattern: timeline.pattern
  };
}

/** Standard cue keys follow the common inhale / holdIn / exhale / holdOut convention; patterns may add their own via `phase.cue`. */
export type StandardCue = 'inhale' | 'holdIn' | 'exhale' | 'holdOut';
export type CueKey = StandardCue | (string & {});

/** Cue for a phase: explicit `phase.cue`, else derived from kind (a hold is holdIn when the lungs are mostly full). */
export function cueKeyFor(span: Pick<PhaseSpan, 'phase' | 'fromVolume'>): CueKey {
  if (span.phase.cue) return span.phase.cue;
  if (span.phase.kind === 'hold') return span.fromVolume >= 0.5 ? 'holdIn' : 'holdOut';
  return span.phase.kind;
}
