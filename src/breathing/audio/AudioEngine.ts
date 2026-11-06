/**
 * Web Audio playback for breath cues. All voices run through one master gain,
 * so volume changes apply live, and stopping really stops everything that is scheduled.
 * Without Web Audio (SSR, tests, old browsers) every method is a safe no-op.
 */
import {
  DEFAULT_SOUND_PROFILE,
  SOUND_PROFILES,
  cuesFor,
  playbackRate,
  type CueKey,
  type SampleCue,
  type SoundProfileId
} from './profiles';
import { synthCue } from './synth';

const FADE_SEC = 0.25;

export interface AudioEngineOptions {
  /** URL prefix for sample files, e.g. "/sounds/" or "editor/public/sounds/". */
  assetBase?: string;
  profile?: SoundProfileId;
  volume?: number;
  muted?: boolean;
  onError?: (error: unknown) => void;
}

interface Voice {
  source: AudioScheduledSourceNode;
  gain?: GainNode;
}

/** Fallback voice for pages opened via file://, where fetch() of samples is blocked. */
interface ElementVoice {
  el: HTMLAudioElement;
  gain: number;
  timers: ReturnType<typeof setTimeout>[];
}

const isFileProtocol = () => typeof location !== 'undefined' && location.protocol === 'file:';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly buffers = new Map<string, Promise<AudioBuffer | null>>();
  private readonly voices = new Set<Voice>();
  private readonly elementVoices = new Set<ElementVoice>();
  private readonly useElements = isFileProtocol();
  /** Bumped by stopAll so samples still decoding don't start afterwards. */
  private epoch = 0;
  private readonly assetBase: string;
  private readonly onError: (error: unknown) => void;
  private _profile: SoundProfileId;
  private _volume: number;
  private _muted: boolean;

  constructor(options: AudioEngineOptions = {}) {
    this.assetBase = options.assetBase ?? '/sounds/';
    this._profile = options.profile ?? DEFAULT_SOUND_PROFILE;
    this._volume = clamp01(options.volume ?? 0.8);
    this._muted = options.muted ?? false;
    this.onError = options.onError ?? (error => console.warn('[breathing-audio]', error));
  }

  get profile(): SoundProfileId {
    return this._profile;
  }

  get volume(): number {
    return this._volume;
  }

  get muted(): boolean {
    return this._muted;
  }

  /** Create/resume the AudioContext. Call from a user gesture to satisfy autoplay policies. */
  unlock(): void {
    const ctx = this.context();
    if (ctx?.state === 'suspended') ctx.resume().catch(this.onError);
    this.preload();
  }

  setProfile(profile: SoundProfileId): void {
    if (profile === this._profile) return;
    this._profile = profile;
    this.stopAll();
    if (this.ctx) this.preload();
  }

  setVolume(volume: number): void {
    this._volume = clamp01(volume);
    this.applyMasterGain();
    this.applyElementVolume();
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    this.applyMasterGain();
    this.applyElementVolume();
  }

  /** Play the sounds for a cue that lasts `durationSec` of real time. */
  playCue(cue: CueKey, durationSec: number): void {
    const profile = SOUND_PROFILES[this._profile];
    if (profile.kind === 'silent' || durationSec <= 0) return;
    // Audio starts only after unlock() (from a user gesture); until then cues are skipped silently.
    const ctx = this.ctx;
    if (!ctx || !this.master) return;

    if (profile.kind === 'synth') {
      for (const source of synthCue(ctx, this.master, cue, durationSec)) this.track({ source });
      return;
    }
    for (const sample of cuesFor(profile, cue)) {
      if (this.useElements) this.playElement(sample, durationSec);
      else void this.playSample(sample, durationSec);
    }
  }

  /** Fade out and stop every scheduled voice. */
  stopAll(): void {
    this.epoch++;
    for (const voice of this.elementVoices) {
      voice.timers.forEach(clearTimeout);
      voice.el.pause();
    }
    this.elementVoices.clear();
    const ctx = this.ctx;
    if (!ctx) return;
    const at = ctx.currentTime;
    for (const voice of this.voices) {
      try {
        voice.gain?.gain.cancelScheduledValues(at);
        voice.gain?.gain.setTargetAtTime(0, at, 0.03);
        voice.source.stop(at + 0.12);
      } catch (error) {
        // InvalidStateError: source never started or already stopped — nothing left to stop.
        if (!(error instanceof DOMException)) this.onError(error);
      }
    }
    this.voices.clear();
  }

  dispose(): void {
    this.stopAll();
    this.ctx?.close().catch(this.onError);
    this.ctx = null;
    this.master = null;
    this.buffers.clear();
  }

  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return null;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.applyMasterGain();
    return this.ctx;
  }

  private applyMasterGain(): void {
    if (!this.ctx || !this.master) return;
    const target = this._muted ? 0 : this._volume;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
  }

  private applyElementVolume(): void {
    for (const voice of this.elementVoices) voice.el.volume = this.elementLevel(voice.gain);
  }

  private elementLevel(gain: number): number {
    return this._muted ? 0 : clamp01(this._volume * gain);
  }

  /** Simpler playback through <audio> elements (no fades); used where fetch() is unavailable. */
  private playElement(cue: SampleCue, phaseSec: number): void {
    const delayMs = (cue.delaySec ?? 0) * 1000;
    if (phaseSec * 1000 - delayMs < 100) return;
    const voice: ElementVoice = { el: new Audio(this.assetBase + cue.file), gain: cue.gain ?? 1, timers: [] };
    voice.el.volume = this.elementLevel(voice.gain);
    voice.el.playbackRate = playbackRate(cue, phaseSec);
    voice.timers.push(
      setTimeout(() => voice.el.play().catch(this.onError), delayMs),
      setTimeout(() => {
        voice.el.pause();
        this.elementVoices.delete(voice);
      }, phaseSec * 1000)
    );
    this.elementVoices.add(voice);
  }

  private preload(): void {
    const profile = SOUND_PROFILES[this._profile];
    if (profile.kind !== 'samples' || this.useElements) return;
    for (const list of Object.values(profile.cues)) for (const cue of list ?? []) void this.buffer(cue.file);
  }

  private buffer(file: string): Promise<AudioBuffer | null> {
    let pending = this.buffers.get(file);
    if (!pending) {
      const ctx = this.ctx;
      pending = ctx
        ? fetch(this.assetBase + file)
            .then(res => {
              if (!res.ok) throw new Error(`${res.status} ${res.url}`);
              return res.arrayBuffer();
            })
            .then(data => ctx.decodeAudioData(data))
            .catch(error => {
              this.onError(error);
              return null;
            })
        : Promise.resolve(null);
      this.buffers.set(file, pending);
    }
    return pending;
  }

  private async playSample(cue: SampleCue, phaseSec: number): Promise<void> {
    const requestedAt = this.ctx?.currentTime ?? 0;
    const epoch = this.epoch;
    const buffer = await this.buffer(cue.file);
    const ctx = this.ctx;
    if (!buffer || !ctx || !this.master || epoch !== this.epoch) return;

    // If decoding took a while, shorten the voice so it still ends with its phase.
    const lateBy = ctx.currentTime - requestedAt;
    const start = ctx.currentTime + Math.max(0, (cue.delaySec ?? 0) - lateBy);
    const end = ctx.currentTime + phaseSec - lateBy;
    if (end - start < 0.1) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate(cue, phaseSec);
    const gain = ctx.createGain();
    const level = cue.gain ?? 1;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + 0.05);
    gain.gain.setValueAtTime(level, Math.max(start + 0.05, end - FADE_SEC));
    gain.gain.linearRampToValueAtTime(0, end);
    source.connect(gain).connect(this.master);
    source.start(start);
    source.stop(end);
    this.track({ source, gain });
  }

  private track(voice: Voice): void {
    this.voices.add(voice);
    voice.source.addEventListener('ended', () => this.voices.delete(voice), { once: true });
  }
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}
