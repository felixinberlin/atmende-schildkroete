/** Convenience factory wiring the generic session to Tika's SVG rig and the audio engine. */
import { AudioEngine, type AudioEngineOptions } from '../audio/AudioEngine';
import { BreathingSession, type SessionOptions } from '../core/BreathingSession';
import { TurtleRenderer } from './rig';

export interface TurtleSessionOptions extends Omit<SessionOptions, 'renderers' | 'audio'> {
  audio?: AudioEngineOptions;
  /** Defaults to the user's `prefers-reduced-motion` setting. */
  reducedMotion?: boolean;
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function createTurtleSession(svgRoot: ParentNode, options: TurtleSessionOptions) {
  const audio = new AudioEngine(options.audio);
  const renderer = new TurtleRenderer(svgRoot, { reducedMotion: options.reducedMotion ?? prefersReducedMotion() });
  const session = new BreathingSession({ ...options, renderers: [renderer], audio });
  return { session, audio };
}
