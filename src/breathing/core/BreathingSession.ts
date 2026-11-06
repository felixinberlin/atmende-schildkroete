/**
 * Generic breathing session: clock → timeline → renderers + audio, with typed events.
 * Knows nothing about turtles or the DOM; plug in any BreathRenderer and BreathAudioSink.
 */
import { BreathClock } from './clock';
import type { BreathingPattern } from './schema';
import { buildTimeline, cueKeyFor, sampleTimeline, type BreathSample, type CueKey, type Timeline } from './timeline';

export interface BreathRenderer {
  render(sample: BreathSample, elapsedMs: number): void;
  destroy?(): void;
}

export interface BreathAudioSink {
  playCue(cue: CueKey, durationSec: number): void;
  stopAll(): void;
  dispose?(): void;
}

export interface PhaseChange {
  sample: BreathSample;
  cue: CueKey;
  /** Real (speed-scaled) seconds left in the phase when it was entered. */
  durationSec: number;
}

export interface SessionEvents {
  tick: BreathSample;
  phase: PhaseChange;
  state: { running: boolean };
}

type Listener<T> = (payload: T) => void;

export interface Scheduler {
  request(cb: () => void): number;
  cancel(id: number): void;
}

const defaultScheduler: Scheduler =
  typeof requestAnimationFrame === 'function'
    ? { request: cb => requestAnimationFrame(cb), cancel: id => cancelAnimationFrame(id) }
    : { request: cb => setTimeout(cb, 16) as unknown as number, cancel: id => clearTimeout(id) };

export interface SessionOptions {
  pattern: BreathingPattern;
  speed?: number;
  autoStart?: boolean;
  renderers?: BreathRenderer[];
  audio?: BreathAudioSink;
  now?: () => number;
  scheduler?: Scheduler;
}

export class BreathingSession {
  private _timeline: Timeline;
  private readonly clock: BreathClock;
  private readonly renderers: BreathRenderer[];
  private readonly audio?: BreathAudioSink;
  private readonly scheduler: Scheduler;
  private readonly listeners: { [K in keyof SessionEvents]: Set<Listener<SessionEvents[K]>> } = {
    tick: new Set(),
    phase: new Set(),
    state: new Set()
  };
  private frameId: number | null = null;
  private lastPhaseKey: string | null = null;
  private externalSample: BreathSample | null = null;
  private destroyed = false;

  constructor(options: SessionOptions) {
    this._timeline = buildTimeline(options.pattern);
    this.clock = new BreathClock(options.now);
    this.clock.setSpeed(options.speed ?? 1);
    this.renderers = [...(options.renderers ?? [])];
    this.audio = options.audio;
    this.scheduler = options.scheduler ?? defaultScheduler;
    if (options.autoStart ?? true) this.start();
    else this.frame();
  }

  get pattern(): BreathingPattern {
    return this._timeline.pattern;
  }

  get timeline(): Timeline {
    return this._timeline;
  }

  get running(): boolean {
    return this.clock.running;
  }

  get speed(): number {
    return this.clock.speed;
  }

  on<K extends keyof SessionEvents>(event: K, listener: Listener<SessionEvents[K]>): () => void {
    this.listeners[event].add(listener);
    return () => this.listeners[event].delete(listener);
  }

  /** Attach another view (e.g. a guide figure next to the character). Returns a detach function. */
  addRenderer(renderer: BreathRenderer): () => void {
    this.renderers.push(renderer);
    renderer.render(this.sample(), this.clock.elapsed());
    return () => {
      const i = this.renderers.indexOf(renderer);
      if (i >= 0) this.renderers.splice(i, 1);
      renderer.destroy?.();
    };
  }

  sample(): BreathSample {
    return this.externalSample ?? sampleTimeline(this._timeline, this.clock.elapsed());
  }

  /**
   * Drives all attached renderers (Tika, HumanGuide, SeaPatternCanvas) and listeners from an
   * external biofeedback source such as `@shiihaa/breath-detection` microphone input.
   * Pass `null` to return control to the internal pattern clock.
   */
  injectExternalSample(sample: BreathSample | null): void {
    this.externalSample = sample;
    if (!sample || this.destroyed) return;
    const elapsed = (sample.cycle + sample.cycleProgress) * this._timeline.cycleMs;
    const key = `ext:${sample.cycle}:${sample.span.index}`;
    if (key !== this.lastPhaseKey) {
      this.lastPhaseKey = key;
      const cue = cueKeyFor(sample.span);
      const durationSec = sample.phaseRemainingMs / 1000;
      this.emit('phase', { sample, cue, durationSec });
    }
    for (const r of this.renderers) r.render(sample, elapsed);
    this.emit('tick', sample);
  }

  start(): void {
    if (this.destroyed || this.clock.running) return;
    this.clock.start();
    this.lastPhaseKey = null; // re-cue the current phase for its remaining time
    this.emit('state', { running: true });
    this.loop();
  }

  pause(): void {
    if (!this.clock.running) return;
    this.clock.pause();
    this.cancelFrame();
    this.audio?.stopAll();
    this.emit('state', { running: false });
  }

  toggle(): void {
    if (this.clock.running) this.pause();
    else this.start();
  }

  /** Jump back to the start of the cycle. */
  reset(): void {
    this.clock.reset();
    this.lastPhaseKey = null;
    this.audio?.stopAll();
    this.frame();
  }

  setPattern(pattern: BreathingPattern): void {
    this._timeline = buildTimeline(pattern);
    this.reset();
  }

  /** Speed is integrated by the clock, so the breath position does not jump. */
  setSpeed(speed: number): void {
    this.clock.setSpeed(speed);
  }

  destroy(): void {
    this.pause();
    this.destroyed = true;
    for (const r of this.renderers) r.destroy?.();
    this.audio?.dispose?.();
    for (const set of Object.values(this.listeners)) set.clear();
  }

  private loop = (): void => {
    this.frameId = null;
    if (!this.clock.running || this.destroyed) return;
    this.frame();
    this.frameId = this.scheduler.request(this.loop);
  };

  private frame(): void {
    const elapsed = this.clock.elapsed();
    const s = sampleTimeline(this._timeline, elapsed);

    const key = `${s.cycle}:${s.span.index}`;
    if (this.clock.running && key !== this.lastPhaseKey) {
      this.lastPhaseKey = key;
      const cue = cueKeyFor(s.span);
      const durationSec = s.phaseRemainingMs / this.clock.speed / 1000;
      this.audio?.playCue(cue, durationSec);
      this.emit('phase', { sample: s, cue, durationSec });
    }

    for (const r of this.renderers) r.render(s, elapsed);
    this.emit('tick', s);
  }

  private cancelFrame(): void {
    if (this.frameId !== null) this.scheduler.cancel(this.frameId);
    this.frameId = null;
  }

  private emit<K extends keyof SessionEvents>(event: K, payload: SessionEvents[K]): void {
    for (const listener of this.listeners[event]) listener(payload);
  }
}
