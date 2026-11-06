import { describe, expect, it } from 'vitest';
import { BreathingSession } from '../core/BreathingSession';
import { findPattern } from '../patterns';
import { BreathDetector, MicBreathBridge, type BreathCycle, type BreathPhaseEvent } from './BreathDetector';

describe('shii·haa BreathDetector & MicBreathBridge', () => {
  it('detects a full inhale -> hold -> exhale -> pause cycle and classifies spectral centroid', () => {
    const detector = new BreathDetector({
      minCycleGapSeconds: 2.0,
      minPhaseSeconds: 1.0,
      thresholdFactor: 0.28,
      centroidThreshold: 40
    });
    detector.enableImmediateDetection(0.008, 0.05);

    const phases: BreathPhaseEvent['phase'][] = [];
    const cycles: BreathCycle[] = [];

    detector.onPhase(e => {
      if (phases[phases.length - 1] !== e.phase) phases.push(e.phase);
    });
    detector.onCycle(c => cycles.push(c));

    let now = 1000;
    const step = (durationMs: number, energy: number, centroid: number) => {
      const steps = Math.ceil(durationMs / 33);
      for (let i = 0; i < steps; i++) {
        now += 33;
        detector.processSyntheticFrame(energy, centroid, now);
      }
    };

    // 1. Inhale (high energy, higher turbulent centroid ~1200 Hz) for 2s
    step(2000, 0.045, 1200);
    // 2. Transition / Hold (silent) for 1.6s
    step(1600, 0.004, 500);
    // 3. Exhale (high energy, lower laminar centroid ~450 Hz) for 2.2s
    step(2200, 0.042, 450);
    // 4. Pause after exhale (silent) for 0.8s
    step(800, 0.004, 500);

    expect(phases).toEqual(['idle', 'inhale', 'transition', 'exhale', 'pause']);
    expect(cycles).toHaveLength(1);
    expect(cycles[0].method).toBe('threshold');
    expect(cycles[0].labelSwapped).toBe(false);
    expect(cycles[0].holdInMs).toBeGreaterThan(1200);
    expect(cycles[0].confidence).toBeGreaterThanOrEqual(80);
  });

  it('swaps inhale/exhale durations when phase 2 has a higher spectral centroid than phase 1', () => {
    const detector = new BreathDetector({
      minCycleGapSeconds: 2.0,
      minPhaseSeconds: 1.0
    });
    detector.enableImmediateDetection(0.008, 0.05);

    const cycles: BreathCycle[] = [];
    detector.onCycle(c => cycles.push(c));

    let now = 1000;
    const step = (durationMs: number, energy: number, centroid: number) => {
      const steps = Math.ceil(durationMs / 33);
      for (let i = 0; i < steps; i++) {
        now += 33;
        detector.processSyntheticFrame(energy, centroid, now);
      }
    };

    // Phase 1 has low centroid (350 Hz, 1.5s), Phase 2 has high centroid (1400 Hz, 2.5s)
    step(1500, 0.045, 350);
    step(800, 0.004, 400);
    step(2500, 0.045, 1400);
    step(800, 0.004, 400);

    expect(cycles).toHaveLength(1);
    expect(cycles[0].labelSwapped).toBe(true);
    expect(cycles[0].inhaleMs).toBeGreaterThan(cycles[0].exhaleMs);
  });

  it('bridges microphone phase events into continuous BreathSamples for BreathingSession', () => {
    const ocean = findPattern('ocean')!;
    const bridge = new MicBreathBridge(ocean);
    const session = new BreathingSession({ pattern: ocean, autoStart: false });

    const receivedVolumes: number[] = [];
    session.on('tick', s => receivedVolumes.push(s.volume));

    for (let t = 500; t <= 3000; t += 500) {
      const s = bridge.toBreathSample({ phase: 'inhale', energy: 0.8, centroid: 1100, phaseTime: t });
      session.injectExternalSample(s);
    }
    const peakVol = receivedVolumes[receivedVolumes.length - 1];
    expect(peakVol).toBeGreaterThan(0.5);

    for (let t = 500; t <= 3000; t += 500) {
      const s = bridge.toBreathSample({ phase: 'exhale', energy: 0.6, centroid: 450, phaseTime: t });
      session.injectExternalSample(s);
    }
    const endVol = receivedVolumes[receivedVolumes.length - 1];
    expect(endVol).toBeLessThan(peakVol);

    bridge.notifyCompletedCycle();
    const nextCycleSample = bridge.toBreathSample({ phase: 'inhale', energy: 0.5, centroid: 1000, phaseTime: 300 });
    expect(nextCycleSample.cycle).toBe(1);
    session.destroy();
  });
});
