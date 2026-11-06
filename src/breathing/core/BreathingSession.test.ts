import { describe, expect, it } from 'vitest';
import { findPattern } from '../patterns';
import { BreathingSession, type BreathAudioSink, type Scheduler } from './BreathingSession';

function harness() {
  let now = 0;
  const frames: (() => void)[] = [];
  const scheduler: Scheduler = { request: cb => frames.push(cb), cancel: () => frames.splice(0) };
  const cues: [string, number][] = [];
  let stops = 0;
  const audio: BreathAudioSink = { playCue: (c, d) => cues.push([c, d]), stopAll: () => stops++ };
  const session = new BreathingSession({ pattern: findPattern('ocean')!, now: () => now, scheduler, audio });
  const advance = (ms: number) => {
    now += ms;
    frames.splice(0).forEach(f => f());
  };
  return { session, cues, advance, stops: () => stops };
}

describe('BreathingSession', () => {
  it('fires one cue per phase with real-time durations', () => {
    const { cues, advance } = harness();
    for (let i = 0; i < 100; i++) advance(100); // 10 s = one ocean cycle
    expect(cues.map(c => c[0])).toEqual(['inhale', 'holdIn', 'exhale', 'holdOut', 'inhale']);
    expect(cues[0][1]).toBeCloseTo(4);
  });

  it('scales cue durations with speed', () => {
    const { session, cues, advance } = harness();
    session.setSpeed(2);
    for (let i = 0; i < 25; i++) advance(100); // 2.5 s real = 5 s pattern time
    expect(cues[1]).toEqual(['holdIn', 0.5]);
  });

  it('pause stops audio and resume continues where it left off', () => {
    const { session, cues, advance, stops } = harness();
    advance(6000);
    session.pause();
    expect(stops()).toBe(1);
    advance(60_000);
    expect(session.sample().kind).toBe('exhale');
    session.start();
    advance(16);
    expect(cues.at(-1)?.[0]).toBe('exhale');
    expect(cues.at(-1)?.[1]).toBeLessThan(4);
  });

  it('emits phase events and supports unsubscribe', () => {
    const { session, advance } = harness();
    const seen: string[] = [];
    const off = session.on('phase', e => seen.push(e.cue));
    advance(4100);
    off();
    advance(2000);
    expect(seen).toEqual(['holdIn']);
  });
});
