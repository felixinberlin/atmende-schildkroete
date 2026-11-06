import { useEffect, useRef } from 'react';
import type { BreathingSession, CueKey, PhaseChange } from '../../breathing';

const DEFAULT_LABELS: Record<string, { icon: string; text: string; tone: string }> = {
  inhale: { icon: '🌿', text: 'Einatmen', tone: 'inhale' },
  holdIn: { icon: '✧', text: 'Halten & Spüren', tone: 'hold' },
  exhale: { icon: '🌊', text: 'Ausatmen wie die Wellen', tone: 'exhale' },
  holdOut: { icon: '♡', text: 'Ruhe', tone: 'rest' }
};

function describe(cue: CueKey, label?: string) {
  const fallback = DEFAULT_LABELS[cue] ?? { icon: '•', text: cue, tone: 'hold' };
  return { ...fallback, text: label ?? fallback.text };
}

interface PhaseBadgeProps {
  session: BreathingSession | null;
  phase: PhaseChange | null;
}

/**
 * Phase label (re-renders once per phase) plus countdown, sub-stage and cycle bar,
 * which are written straight to the DOM at ~10 Hz to avoid per-frame React renders.
 */
export function PhaseBadge({ session, phase }: PhaseBadgeProps) {
  const countdownRef = useRef<HTMLSpanElement>(null);
  const stageRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) return;
    let lastWrite = 0;
    return session.on('tick', s => {
      const now = performance.now();
      if (now - lastWrite < 100) return;
      lastWrite = now;
      if (countdownRef.current) {
        countdownRef.current.textContent = ` · noch ${(s.phaseRemainingMs / session.speed / 1000).toFixed(1)}s`;
      }
      if (stageRef.current) {
        const seg = s.segmentIndex !== undefined ? s.span.segments[s.segmentIndex] : undefined;
        stageRef.current.textContent = seg?.label ? `Stufe ${s.segmentIndex! + 1}: ${seg.label}` : '';
      }
      if (barRef.current) barRef.current.style.width = `${(s.cycleProgress * 100).toFixed(1)}%`;
    });
  }, [session]);

  const span = phase?.sample.span;
  const { icon, text, tone } = describe(phase?.cue ?? 'inhale', span?.phase.label);
  const seconds = span && session ? Math.round(span.durationMs / session.speed / 100) / 10 : null;

  return (
    <div className="breath-phase-badge">
      <span className={`phase-tag ${tone}`} aria-live="polite">
        {icon} {text}
        {seconds !== null && ` (${seconds}s)`}
        <span className="phase-countdown" ref={countdownRef} aria-hidden="true" />
      </span>
      <span className="phase-stage" ref={stageRef} />
      <div className="phase-bar-track" aria-hidden="true">
        <div className="phase-bar-fill" ref={barRef} />
      </div>
    </div>
  );
}
