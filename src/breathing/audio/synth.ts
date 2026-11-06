/** Procedural Web Audio voices. Each returns the scheduled source nodes so the caller can track and stop them. */
import type { CueKey } from '../core/timeline';

const MIN_GAIN = 0.001;
const NOISE_SECONDS = 12;
const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();

/** Paul Kellet's pink-noise filter, generated once per context. */
function pinkNoise(ctx: BaseAudioContext): AudioBuffer {
  const cached = noiseCache.get(ctx);
  if (cached) return cached;
  const length = Math.floor(ctx.sampleRate * NOISE_SECONDS);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  noiseCache.set(ctx, buffer);
  return buffer;
}

function envelopeGain(ctx: BaseAudioContext, out: AudioNode): GainNode {
  const gain = ctx.createGain();
  gain.gain.value = MIN_GAIN;
  gain.connect(out);
  return gain;
}

function airflow(ctx: BaseAudioContext, out: AudioNode, at: number, dur: number, freq: number, q: number, swell: boolean) {
  const source = ctx.createBufferSource();
  source.buffer = pinkNoise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = envelopeGain(ctx, out);
  gain.gain.setValueAtTime(MIN_GAIN, at);
  gain.gain.exponentialRampToValueAtTime(0.75, at + (swell ? dur * 0.82 : 0.35));
  gain.gain.exponentialRampToValueAtTime(MIN_GAIN, at + dur);
  source.connect(filter).connect(gain);
  source.start(at);
  source.stop(at + Math.min(dur, NOISE_SECONDS));
  return [source];
}

function oceanSub(ctx: BaseAudioContext, out: AudioNode, at: number, dur: number, rise: boolean) {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(55, at);
  osc.frequency.exponentialRampToValueAtTime(rise ? 85 : 45, at + dur);
  const gain = envelopeGain(ctx, out);
  if (rise) {
    gain.gain.setValueAtTime(MIN_GAIN, at);
    gain.gain.exponentialRampToValueAtTime(0.22, at + dur * 0.85);
  } else {
    gain.gain.setValueAtTime(0.22, at);
  }
  gain.gain.exponentialRampToValueAtTime(MIN_GAIN, at + dur);
  osc.connect(gain);
  osc.start(at);
  osc.stop(at + dur);
  return [osc];
}

function singingBowl(ctx: BaseAudioContext, out: AudioNode, at: number, dur: number, freq = 216) {
  const gain = envelopeGain(ctx, out);
  gain.gain.setValueAtTime(MIN_GAIN, at);
  gain.gain.exponentialRampToValueAtTime(0.25, at + 0.15);
  gain.gain.exponentialRampToValueAtTime(MIN_GAIN, at + dur);
  return [freq, freq * 2.01].map(f => {
    const osc = ctx.createOscillator();
    osc.frequency.value = f;
    osc.connect(gain);
    osc.start(at);
    osc.stop(at + dur);
    return osc;
  });
}

function bubbles(ctx: BaseAudioContext, out: AudioNode, at: number, dur: number) {
  const nodes: OscillatorNode[] = [];
  const count = Math.floor(dur * 5);
  for (let k = 0; k < count; k++) {
    const t = at + 0.3 + Math.random() * Math.max(0, dur - 0.6);
    const len = 0.035 + Math.random() * 0.025;
    const f0 = 420 + Math.random() * 450;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f0 * 1.25, t + len);
    const gain = envelopeGain(ctx, out);
    gain.gain.setValueAtTime(MIN_GAIN, t);
    gain.gain.exponentialRampToValueAtTime(0.15 + Math.random() * 0.2, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(MIN_GAIN, t + len);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + len);
    nodes.push(osc);
  }
  return nodes;
}

/** Schedule the synth voices for one cue. `out` should be the engine's master gain. Unknown cues are silent. */
export function synthCue(ctx: BaseAudioContext, out: AudioNode, cue: CueKey, durSec: number): AudioScheduledSourceNode[] {
  const at = ctx.currentTime;
  switch (cue) {
    case 'inhale':
      return [...airflow(ctx, out, at, durSec, 520, 2.2, true), ...oceanSub(ctx, out, at, durSec, true)];
    case 'holdIn':
      return singingBowl(ctx, out, at, durSec);
    case 'exhale':
      return [
        ...airflow(ctx, out, at, durSec, 410, 1.9, false),
        ...oceanSub(ctx, out, at, durSec, false),
        ...bubbles(ctx, out, at, durSec)
      ];
    default:
      return [];
  }
}
