import { memo, useEffect, useRef } from 'react';
import { HumanGuideRenderer, prefersReducedMotion, type BreathingSession } from '../../breathing';

/**
 * Simple human figure that shows where the air goes and which breathing muscles work.
 * The SVG is mounted and animated by HumanGuideRenderer; React never touches its content.
 */
export const HumanGuide = memo(function HumanGuide({ session }: { session: BreathingSession | null }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session || !ref.current) return;
    return session.addRenderer(new HumanGuideRenderer(ref.current, { reducedMotion: prefersReducedMotion() }));
  }, [session]);

  return <div className="human-guide" ref={ref} />;
});
