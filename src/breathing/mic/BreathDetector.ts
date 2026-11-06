/**
 * Real-time microphone breath detection based on @shiihaa/breath-detection
 * (MIT License · © 2026 shii · haa — Felix Zeller · https://github.com/shiihaa-app/breath-detection).
 *
 * Adapted into strict TypeScript with:
 * - Syntax fixes for the upstream 1.0.0 dist build (`onCycleCallbacks[] = []`)
 * - Live sensitivity tuning (`setThresholdFactor`) for quiet nasal breathing
 * - Deterministic `processRawFrame(freqEnergy, rmsVal, rawCentroid, now)` for unit testing
 * - Continuous `BreathSample` adapter so Tika's rig, the Human Guide, and the Sea Pattern
 *   ("Meeresmuster") can be driven directly by microphone breathing.
 */
import { buildTimeline, sampleTimeline, type BreathSample } from '../core/timeline';
import type { BreathingPattern } from '../core/schema';

export interface BreathDetectorOptions {
  /** FFT size for audio analysis (default: 4096) */
  fftSize?: number;
  /** EMA smoothing alpha for energy (0-1, default: 0.25) */
  smoothingAlpha?: number;
  /** Minimum seconds between detected cycles (default: 2.5) */
  minCycleGapSeconds?: number;
  /** Minimum seconds per breath phase (default: 1.2) */
  minPhaseSeconds?: number;
  /** Threshold factor: 0 = very sensitive, 1 = very strict (default: 0.28) */
  thresholdFactor?: number;
  /** Low frequency bound in Hz (default: 150) */
  freqLow?: number;
  /** High frequency bound in Hz (default: 2500) */
  freqHigh?: number;
  /** Enable spectral centroid for inhale/exhale classification (default: true) */
  enableCentroid?: boolean;
  /** Centroid Hz difference needed for confident classification (default: 40) */
  centroidThreshold?: number;
}

export interface BreathCycle {
  inhaleMs: number;
  exhaleMs: number;
  holdInMs: number;
  holdOutMs: number;
  cycleMs: number;
  peakEnergy: number;
  confidence: number;
  labelSwapped: boolean;
  centroidA1: number;
  centroidA2: number;
  method: 'threshold' | 'peak';
  timestamp: number;
}

export type MicBreathPhase = 'idle' | 'inhale' | 'transition' | 'exhale' | 'pause';

export interface BreathPhaseEvent {
  phase: MicBreathPhase;
  /** Normalized energy (0-1) */
  energy: number;
  /** Spectral centroid in Hz */
  centroid: number;
  /** Time in current phase (ms) */
  phaseTime: number;
}

export interface CalibrationResult {
  noiseFloor: number;
  breathMax: number;
  success: boolean;
}

export type BreathEventCallback = (cycle: BreathCycle) => void;
export type PhaseEventCallback = (event: BreathPhaseEvent) => void;
export type CalibrationCallback = (result: CalibrationResult) => void;
export type EnergyCallback = (energy: number, centroid: number) => void;

type InternalState = 'idle' | 'active1' | 'silent1' | 'active2' | 'silent2';

interface CycleTimestamps {
  active1Start?: number;
  active1End?: number;
  silent1Start?: number;
  silent1End?: number;
  active2Start?: number;
  active2End?: number;
  silent2Start?: number;
}

export class BreathDetector {
  private opts: Required<BreathDetectorOptions>;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private freqData: Uint8Array<ArrayBuffer> | null = null;
  private timeData: Uint8Array<ArrayBuffer> | null = null;

  private running = false;
  private calibrated = false;
  private noiseFloor = 0.008;
  private breathMax = 0.045;
  private smoothedEnergy = 0;
  private smoothedCentroid = 500;
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  private state: InternalState = 'idle';
  private stateStart = 0;
  private aboveStart = 0;
  private belowStart = 0;
  private peakEnergy = 0;
  private cycleData: CycleTimestamps = {};
  private recentCycleDurations: number[] = [];
  private lastCycleEndTime = 0;

  private centroidSumA1 = 0;
  private centroidCountA1 = 0;
  private centroidSumA2 = 0;
  private centroidCountA2 = 0;

  private prevEnergy = 0;
  private energyRising = false;
  private energyFallingStart = 0;
  private energyPeakVal = 0;

  private peakCount = 0;
  private lastPeakTime = 0;
  private peakCycleStart = 0;

  private recentEnergySamples: number[] = [];
  private lastRecalTime = 0;

  private onCycleCallbacks: BreathEventCallback[] = [];
  private onPhaseCallbacks: PhaseEventCallback[] = [];
  private onCalibrationCallbacks: CalibrationCallback[] = [];
  private onEnergyCallbacks: EnergyCallback[] = [];

  constructor(options?: BreathDetectorOptions) {
    this.opts = {
      fftSize: options?.fftSize ?? 4096,
      smoothingAlpha: options?.smoothingAlpha ?? 0.25,
      minCycleGapSeconds: options?.minCycleGapSeconds ?? 2.5,
      minPhaseSeconds: options?.minPhaseSeconds ?? 1.2,
      thresholdFactor: options?.thresholdFactor ?? 0.28,
      freqLow: options?.freqLow ?? 150,
      freqHigh: options?.freqHigh ?? 2500,
      enableCentroid: options?.enableCentroid ?? true,
      centroidThreshold: options?.centroidThreshold ?? 40
    };
  }

  async start(): Promise<boolean> {
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true }
      });
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtx();
      this.source = this.audioCtx.createMediaStreamSource(this.micStream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = this.opts.fftSize;
      this.analyser.smoothingTimeConstant = 0.4;
      this.source.connect(this.analyser);
      this.freqData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
      this.timeData = new Uint8Array(new ArrayBuffer(this.analyser.fftSize));
      this.running = true;
      this.state = 'idle';
      this.stateStart = Date.now();
      return true;
    } catch (e) {
      console.error('[BreathDetector] Mic error:', e);
      return false;
    }
  }

  stop(): void {
    this.running = false;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.source) {
      try {
        this.source.disconnect();
      } catch {
        // ignore
      }
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
    }
    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
    this.micStream = null;
    this.calibrated = false;
    this.smoothedEnergy = 0;
  }

  /** Calibrate: 2s noise floor + 4s breath samples. */
  async calibrate(onStage?: (stage: 'noise' | 'breath' | 'done') => void): Promise<CalibrationResult> {
    if (!this.analyser) return { noiseFloor: 0, breathMax: 0, success: false };

    onStage?.('noise');
    const noiseSamples: number[] = [];
    await this.sampleFor(2000, () => {
      this.computeEnergyFromAnalyser(Date.now());
      noiseSamples.push(this.smoothedEnergy);
    });
    this.noiseFloor =
      noiseSamples.length > 0
        ? noiseSamples.reduce((a, b) => a + b, 0) / noiseSamples.length
        : 0.008;

    onStage?.('breath');
    const breathSamples: number[] = [];
    await this.sampleFor(4000, () => {
      this.computeEnergyFromAnalyser(Date.now());
      breathSamples.push(this.smoothedEnergy);
    });
    breathSamples.sort((a, b) => b - a);
    const top15 = breathSamples.slice(0, Math.max(5, Math.floor(breathSamples.length * 0.15)));
    this.breathMax =
      top15.length > 0 ? top15.reduce((a, b) => a + b, 0) / top15.length : this.noiseFloor * 2.5;

    if (this.breathMax - this.noiseFloor < 0.005) {
      this.breathMax = Math.max(this.noiseFloor * 2.0, this.noiseFloor + 0.02);
    }

    this.calibrated = true;
    onStage?.('done');
    const result: CalibrationResult = {
      noiseFloor: this.noiseFloor,
      breathMax: this.breathMax,
      success: true
    };
    this.onCalibrationCallbacks.forEach(cb => cb(result));
    return result;
  }

  /** Allows starting immediately with adaptive baseline if user skips the 6s calibration. */
  enableImmediateDetection(noiseFloor = 0.008, breathMax = 0.04): void {
    this.noiseFloor = noiseFloor;
    this.breathMax = breathMax;
    this.calibrated = true;
    this.running = true;
  }

  startDetection(): void {
    if (!this.running) return;
    if (!this.calibrated) {
      this.calibrated = true;
    }
    this.resetState(Date.now());
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.tickInterval = setInterval(() => this.tick(Date.now()), 33);
  }

  stopDetection(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  setThresholdFactor(factor: number): void {
    this.opts.thresholdFactor = Math.max(0.05, Math.min(0.9, factor));
  }

  getThresholdFactor(): number {
    return this.opts.thresholdFactor;
  }

  getState() {
    return {
      running: this.running,
      calibrated: this.calibrated,
      phase: this.state,
      energy: this.getNormalizedEnergy(),
      centroid: this.smoothedCentroid,
      noiseFloor: this.noiseFloor,
      breathMax: this.breathMax
    };
  }

  onCycle(callback: BreathEventCallback): () => void {
    this.onCycleCallbacks.push(callback);
    return () => {
      this.onCycleCallbacks = this.onCycleCallbacks.filter(cb => cb !== callback);
    };
  }

  onPhase(callback: PhaseEventCallback): () => void {
    this.onPhaseCallbacks.push(callback);
    return () => {
      this.onPhaseCallbacks = this.onPhaseCallbacks.filter(cb => cb !== callback);
    };
  }

  onCalibration(callback: CalibrationCallback): () => void {
    this.onCalibrationCallbacks.push(callback);
    return () => {
      this.onCalibrationCallbacks = this.onCalibrationCallbacks.filter(cb => cb !== callback);
    };
  }

  onEnergy(callback: EnergyCallback): () => void {
    this.onEnergyCallbacks.push(callback);
    return () => {
      this.onEnergyCallbacks = this.onEnergyCallbacks.filter(cb => cb !== callback);
    };
  }

  resetState(now = Date.now()): void {
    this.state = 'idle';
    this.stateStart = now;
    this.aboveStart = 0;
    this.belowStart = 0;
    this.peakEnergy = 0;
    this.cycleData = {};
    this.recentCycleDurations = [];
    this.lastCycleEndTime = 0;
    this.centroidSumA1 = 0;
    this.centroidCountA1 = 0;
    this.centroidSumA2 = 0;
    this.centroidCountA2 = 0;
    this.prevEnergy = 0;
    this.energyRising = false;
    this.energyFallingStart = 0;
    this.energyPeakVal = 0;
    this.peakCount = 0;
    this.lastPeakTime = 0;
    this.peakCycleStart = 0;
    this.recentEnergySamples = [];
    this.lastRecalTime = 0;
  }

  private computeEnergyFromAnalyser(now: number): number {
    if (!this.analyser || !this.freqData || !this.timeData || !this.audioCtx) return 0;
    this.analyser.getByteFrequencyData(this.freqData);
    this.analyser.getByteTimeDomainData(this.timeData);

    const nyquist = this.audioCtx.sampleRate / 2;
    const binSize = nyquist / this.analyser.frequencyBinCount;
    const lowBin = Math.floor(this.opts.freqLow / binSize);
    const highBin = Math.min(Math.ceil(this.opts.freqHigh / binSize), this.analyser.frequencyBinCount - 1);

    let freqSum = 0;
    let centroidNum = 0;
    let centroidDen = 0;
    for (let i = lowBin; i <= highBin; i++) {
      const mag = this.freqData[i];
      freqSum += mag;
      const freq = i * binSize;
      centroidNum += freq * mag;
      centroidDen += mag;
    }
    const freqEnergy = freqSum / ((highBin - lowBin + 1) * 255);
    const rawCentroid = centroidDen > 0 ? centroidNum / centroidDen : 500;

    let rmsSum = 0;
    for (let j = 0; j < this.timeData.length; j++) {
      const v = (this.timeData[j] - 128) / 128;
      rmsSum += v * v;
    }
    const rmsVal = Math.sqrt(rmsSum / this.timeData.length);

    return this.ingestSignal(freqEnergy * 0.7 + rmsVal * 0.3, rawCentroid, now);
  }

  private ingestSignal(combinedEnergy: number, rawCentroid: number, now: number): number {
    if (this.opts.enableCentroid) {
      this.smoothedCentroid = 0.2 * rawCentroid + 0.8 * this.smoothedCentroid;
    }
    this.smoothedEnergy =
      this.smoothedEnergy * (1 - this.opts.smoothingAlpha) + combinedEnergy * this.opts.smoothingAlpha;

    if (this.calibrated) {
      this.recentEnergySamples.push(this.smoothedEnergy);
      if (this.recentEnergySamples.length > 300) this.recentEnergySamples.shift();
      if (now - this.lastRecalTime > 10000 && this.recentEnergySamples.length >= 300) {
        this.lastRecalTime = now;
        const sorted = [...this.recentEnergySamples].sort((a, b) => a - b);
        const newFloor = sorted[Math.floor(sorted.length * 0.15)];
        const newMax = sorted[Math.floor(sorted.length * 0.9)];
        if (newFloor > 0 && newMax > newFloor * 1.3) {
          this.noiseFloor = this.noiseFloor * 0.7 + newFloor * 0.3;
          this.breathMax = this.breathMax * 0.7 + newMax * 0.3;
        }
      }
    }
    return this.smoothedEnergy;
  }

  private getThreshold(): number {
    if (!this.calibrated) return 0.05;
    const range = this.breathMax - this.noiseFloor;
    if (range < 0.003) return 0.008;
    return Math.max(this.noiseFloor + range * Math.max(this.opts.thresholdFactor, 0.06), 0.008);
  }

  private getThresholdLow(): number {
    if (!this.calibrated) return 0.02;
    const range = this.breathMax - this.noiseFloor;
    if (range < 0.003) return 0.004;
    return this.noiseFloor + range * 0.2;
  }

  getNormalizedEnergy(): number {
    if (!this.calibrated) return 0;
    const range = this.breathMax - this.noiseFloor;
    if (range < 0.001) return 0;
    return Math.max(0, Math.min(1, (this.smoothedEnergy - this.noiseFloor) / range));
  }

  /** Step one frame from the live WebAudio analyser. */
  private tick(now: number): void {
    if (!this.running || !this.calibrated) return;
    const energy = this.computeEnergyFromAnalyser(now);
    this.advanceStateMachine(energy, now);
  }

  /**
   * Step one frame with explicit signal values (used for deterministic tests and custom audio sources).
   */
  processSyntheticFrame(combinedEnergy: number, rawCentroid: number, now: number): void {
    if (!this.calibrated) this.enableImmediateDetection();
    const energy = this.ingestSignal(combinedEnergy, rawCentroid, now);
    this.advanceStateMachine(energy, now);
  }

  private advanceStateMachine(energy: number, now: number): void {
    const th = this.getThreshold();
    const thLow = this.getThresholdLow();
    let aboveTh = this.smoothedEnergy > th;
    let belowThLow = this.smoothedEnergy < thLow;

    const energyDelta = energy - this.prevEnergy;
    const wasRising = this.energyRising;
    if (energyDelta > 0) {
      this.energyRising = true;
      if (energy > this.energyPeakVal) this.energyPeakVal = energy;
      this.energyFallingStart = 0;
    } else if (energyDelta < 0) {
      if (this.energyRising && !this.energyFallingStart) this.energyFallingStart = now;
      this.energyRising = false;
    }

    const significantDrop = this.energyPeakVal > 0 && energy < this.energyPeakVal * 0.6;
    const fallingLongEnough = this.energyFallingStart > 0 && now - this.energyFallingStart > 500;
    const minStateMs = this.opts.minPhaseSeconds * 1000;

    if (significantDrop && fallingLongEnough) {
      if ((this.state === 'active1' || this.state === 'active2') && now - this.stateStart > minStateMs) {
        belowThLow = true;
        this.energyPeakVal = 0;
        this.energyFallingStart = 0;
      }
    }
    if (!wasRising && this.energyRising && energy > this.noiseFloor * 1.2) {
      if (this.state === 'silent1' || this.state === 'silent2') aboveTh = true;
    }

    // Peak-based cycle detection (pauseless breathing fallback)
    if (wasRising && !this.energyRising && this.energyPeakVal > this.noiseFloor * 1.3) {
      const timeSinceLastPeak = this.lastPeakTime > 0 ? now - this.lastPeakTime : 99999;
      if (timeSinceLastPeak > 1500) {
        this.peakCount++;
        if (this.peakCount === 1) this.peakCycleStart = now;
        this.lastPeakTime = now;
        if (this.peakCount >= 2 && this.peakCycleStart > 0) {
          const peakCycleMs = now - this.peakCycleStart;
          if (this.state === 'active1' && peakCycleMs > this.opts.minCycleGapSeconds * 1000) {
            const halfCycle = Math.round(peakCycleMs / 2);
            this.cycleData = {
              active1Start: this.peakCycleStart,
              active1End: this.peakCycleStart + halfCycle,
              silent1Start: this.peakCycleStart + halfCycle,
              silent1End: this.peakCycleStart + halfCycle,
              active2Start: this.peakCycleStart + halfCycle,
              active2End: now,
              silent2Start: now
            };
            this.completeCycle(now, 'peak');
            this.peakCount = 1;
            this.peakCycleStart = now;
          } else if (this.state !== 'active1') {
            this.peakCount = 0;
            this.peakCycleStart = 0;
          }
        }
      }
    }

    this.prevEnergy = energy;

    if (this.state === 'active1') {
      this.centroidSumA1 += this.smoothedCentroid;
      this.centroidCountA1++;
    } else if (this.state === 'active2') {
      this.centroidSumA2 += this.smoothedCentroid;
      this.centroidCountA2++;
    }
    if (this.state === 'active1' || this.state === 'active2') {
      if (energy > this.peakEnergy) this.peakEnergy = energy;
    }

    const ACTIVE_MS = 220;
    const SILENT_MS = 420;

    if (this.state === 'idle') {
      if (aboveTh) {
        if (!this.aboveStart) this.aboveStart = now;
        if (now - this.aboveStart >= ACTIVE_MS) {
          this.resetCycleData();
          this.cycleData.active1Start = this.aboveStart;
          this.aboveStart = 0;
          this.belowStart = 0;
          this.changeState('active1', now);
        }
      } else {
        this.aboveStart = 0;
      }
    } else if (this.state === 'active1') {
      if (!belowThLow) {
        this.belowStart = 0;
      } else {
        if (!this.belowStart) this.belowStart = now;
        if (now - this.belowStart >= SILENT_MS) {
          this.cycleData.active1End = this.belowStart;
          this.cycleData.silent1Start = this.belowStart;
          this.belowStart = 0;
          this.aboveStart = 0;
          this.changeState('silent1', now);
        }
      }
    } else if (this.state === 'silent1') {
      if (!aboveTh) {
        this.aboveStart = 0;
      } else {
        if (!this.aboveStart) this.aboveStart = now;
        if (now - this.aboveStart >= ACTIVE_MS) {
          this.cycleData.silent1End = this.aboveStart;
          this.cycleData.active2Start = this.aboveStart;
          this.aboveStart = 0;
          this.belowStart = 0;
          this.changeState('active2', now);
        }
      }
    } else if (this.state === 'active2') {
      if (!belowThLow) {
        this.belowStart = 0;
      } else {
        if (!this.belowStart) this.belowStart = now;
        if (now - this.belowStart >= SILENT_MS) {
          this.cycleData.active2End = this.belowStart;
          this.cycleData.silent2Start = this.belowStart;
          this.belowStart = 0;
          this.aboveStart = 0;
          this.changeState('silent2', now);
          this.completeCycle(now, 'threshold');
        }
      }
    } else if (this.state === 'silent2') {
      if (!aboveTh) {
        this.aboveStart = 0;
      } else {
        if (!this.aboveStart) this.aboveStart = now;
        if (now - this.aboveStart >= ACTIVE_MS) {
          this.resetCycleData();
          this.cycleData.active1Start = this.aboveStart;
          this.aboveStart = 0;
          this.belowStart = 0;
          this.changeState('active1', now);
        }
      }
    }

    const norm = this.getNormalizedEnergy();
    const phaseMap: Record<InternalState, MicBreathPhase> = {
      idle: 'idle',
      active1: 'inhale',
      silent1: 'transition',
      active2: 'exhale',
      silent2: 'pause'
    };
    const phaseEvt: BreathPhaseEvent = {
      phase: phaseMap[this.state] || 'idle',
      energy: norm,
      centroid: this.smoothedCentroid,
      phaseTime: now - this.stateStart
    };
    this.onPhaseCallbacks.forEach(cb => cb(phaseEvt));
    this.onEnergyCallbacks.forEach(cb => cb(norm, this.smoothedCentroid));
  }

  private changeState(newState: InternalState, now: number): void {
    this.state = newState;
    this.stateStart = now;
  }

  private resetCycleData(): void {
    this.cycleData = {};
    this.peakEnergy = 0;
    this.centroidSumA1 = 0;
    this.centroidCountA1 = 0;
    this.centroidSumA2 = 0;
    this.centroidCountA2 = 0;
    this.peakCount = 0;
    this.peakCycleStart = 0;
  }

  private completeCycle(now: number, method: 'threshold' | 'peak'): void {
    const minGapMs = this.opts.minCycleGapSeconds * 1000;
    if (this.lastCycleEndTime > 0 && now - this.lastCycleEndTime < minGapMs) return;

    const d = this.cycleData;
    const active1Ms = (d.active1End || 0) - (d.active1Start || 0);
    const silent1Ms = (d.silent1End || 0) - (d.silent1Start || 0);
    const active2Ms = (d.active2End || 0) - (d.active2Start || 0);
    const cycleMs = (d.active2End || now) - (d.active1Start || now);

    if (cycleMs < minGapMs) return;

    let inhaleMs = active1Ms;
    let exhaleMs = active2Ms;
    let labelSwapped = false;

    if (this.opts.enableCentroid) {
      const c1 = this.centroidCountA1 > 0 ? this.centroidSumA1 / this.centroidCountA1 : 0;
      const c2 = this.centroidCountA2 > 0 ? this.centroidSumA2 / this.centroidCountA2 : 0;
      if (c1 > 0 && c2 > 0 && c1 - c2 < -this.opts.centroidThreshold) {
        inhaleMs = active2Ms;
        exhaleMs = active1Ms;
        labelSwapped = true;
      }
    }

    if (!labelSwapped && active1Ms > active2Ms * 3 && active2Ms < 1000) {
      const total = active1Ms + silent1Ms + active2Ms;
      inhaleMs = Math.round(total * 0.5);
      exhaleMs = Math.round(total * 0.5);
    }

    const holdInMs = silent1Ms > 1200 ? silent1Ms : 0;

    let confidence = 100;
    if (active1Ms < 500) confidence -= 20;
    if (active2Ms < 500) confidence -= 20;
    if (method === 'peak') confidence -= 10;
    confidence = Math.max(0, Math.min(100, confidence));

    this.lastCycleEndTime = now;
    this.recentCycleDurations.push(cycleMs);
    if (this.recentCycleDurations.length > 8) this.recentCycleDurations.shift();

    const cycle: BreathCycle = {
      inhaleMs,
      exhaleMs,
      holdInMs,
      holdOutMs: 0,
      cycleMs,
      peakEnergy: this.peakEnergy,
      confidence,
      labelSwapped,
      centroidA1: Math.round(this.centroidCountA1 > 0 ? this.centroidSumA1 / this.centroidCountA1 : 0),
      centroidA2: Math.round(this.centroidCountA2 > 0 ? this.centroidSumA2 / this.centroidCountA2 : 0),
      method,
      timestamp: now
    };

    this.onCycleCallbacks.forEach(cb => cb(cycle));
  }

  private sampleFor(ms: number, fn: () => void): Promise<void> {
    return new Promise(resolve => {
      const start = Date.now();
      const iv = setInterval(() => {
        fn();
        if (Date.now() - start >= ms) {
          clearInterval(iv);
          resolve();
        }
      }, 33);
    });
  }
}

/**
 * Maps real-time `BreathPhaseEvent` frames from `BreathDetector` into a smooth synthetic
 * `elapsedMs` timeline position on the active `BreathingPattern`, so Tika's rig, the Human Guide,
 * and the Sea Pattern trail respond organically to the user's real microphone breathing.
 */
export class MicBreathBridge {
  private cycleCount = 0;
  private smoothVolume = 0;
  private smoothCycleProgress = 0;

  constructor(private pattern: BreathingPattern) {}

  setPattern(pattern: BreathingPattern): void {
    this.pattern = pattern;
  }

  notifyCompletedCycle(): void {
    this.cycleCount += 1;
    this.smoothCycleProgress = 0;
  }

  /** Converts a live microphone phase event into a `BreathSample` compatible with all renderers. */
  toBreathSample(event: BreathPhaseEvent): BreathSample {
    const timeline = buildTimeline(this.pattern);

    // Map mic phase ('inhale' | 'transition' | 'exhale' | 'pause' | 'idle') to target lung volume & cycle progress
    let targetVol = this.smoothVolume;
    let targetProgress = this.smoothCycleProgress;

    const phaseSec = Math.min(1, event.phaseTime / 3500);

    switch (event.phase) {
      case 'inhale':
        targetVol = Math.min(1, Math.max(0.25, phaseSec * 0.85 + event.energy * 0.35));
        targetProgress = 0.02 + 0.33 * phaseSec;
        break;
      case 'transition':
        targetVol = 1;
        targetProgress = 0.36 + 0.14 * Math.min(1, event.phaseTime / 2000);
        break;
      case 'exhale':
        targetVol = Math.max(0, 1 - (phaseSec * 0.85 + event.energy * 0.25));
        targetProgress = 0.5 + 0.38 * phaseSec;
        break;
      case 'pause':
      case 'idle':
        targetVol = 0;
        targetProgress = event.phase === 'pause' ? 0.88 + 0.11 * Math.min(1, event.phaseTime / 1500) : 0;
        break;
    }

    // Smoothly interpolate volume and cycle progress so visuals never snap
    this.smoothVolume = this.smoothVolume * 0.78 + targetVol * 0.22;
    if (targetProgress >= this.smoothCycleProgress || event.phase === 'inhale') {
      this.smoothCycleProgress = this.smoothCycleProgress * 0.8 + targetProgress * 0.2;
    }

    const syntheticElapsedMs =
      (this.cycleCount + Math.min(0.995, Math.max(0, this.smoothCycleProgress))) * timeline.cycleMs;
    const baseSample = sampleTimeline(timeline, syntheticElapsedMs);

    return {
      ...baseSample,
      cycle: this.cycleCount,
      cycleProgress: this.smoothCycleProgress,
      volume: this.smoothVolume
    };
  }
}
