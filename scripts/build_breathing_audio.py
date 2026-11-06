#!/usr/bin/env python3
"""
Generate high-fidelity soothing breathing sounds and ocean respiration tracks
for Tika the Breathing Turtle ("Atmen wie die Wellen" / Dirga Pranayama).
"""

import math
import os
import random
import struct
import subprocess
import wave

SAMPLE_RATE = 44100
# Masters (.ogg) and sources live in sounds/; web-served MP3s only in editor/public/sounds.
SOUNDS_DIR = "sounds"
EDITOR_SOUNDS_DIR = "editor/public/sounds"

os.makedirs(SOUNDS_DIR, exist_ok=True)
os.makedirs(EDITOR_SOUNDS_DIR, exist_ok=True)

# -------------------------------------------------------------
# 1. DSP & Synthesis Primitives
# -------------------------------------------------------------

def write_wav(filename, samples, sr=SAMPLE_RATE, channels=1):
    """Write normalized 16-bit PCM wav file."""
    # Find peak to prevent clipping
    if channels == 1:
        peak = max(abs(s) for s in samples) if samples else 1.0
    else:
        peak = max(max(abs(l), abs(r)) for l, r in samples) if samples else 1.0
    gain = 0.92 / peak if peak > 0.001 else 1.0

    raw = bytearray()
    if channels == 1:
        for s in samples:
            val = int(max(-1.0, min(1.0, s * gain)) * 32767.0)
            raw.extend(struct.pack("<h", val))
    elif channels == 2:
        for l, r in samples:
            vl = int(max(-1.0, min(1.0, l * gain)) * 32767.0)
            vr = int(max(-1.0, min(1.0, r * gain)) * 32767.0)
            raw.extend(struct.pack("<hh", vl, vr))

    with wave.open(filename, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(raw)

def convert_to_mp3(wav_file, mp3_file):
    """Convert wav to high quality mp3 using ffmpeg."""
    subprocess.run(
        ["ffmpeg", "-y", "-i", wav_file, "-codec:a", "libmp3lame", "-qscale:a", "2", mp3_file],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=True
    )

def convert_to_ogg(wav_file, ogg_file):
    """Convert wav to high quality ogg using ffmpeg."""
    subprocess.run(
        ["ffmpeg", "-y", "-i", wav_file, "-codec:a", "libvorbis", "-qscale:a", "5", ogg_file],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=True
    )

def biquad_bandpass(samples, freq, q, sr=SAMPLE_RATE):
    w0 = 2 * math.pi * freq / sr
    alpha = math.sin(w0) / (2 * q)
    b0 = alpha * q
    b1 = 0.0
    b2 = -alpha * q
    a0 = 1.0 + alpha
    a1 = -2.0 * math.cos(w0)
    a2 = 1.0 - alpha

    b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0

    out = []
    x1 = x2 = y1 = y2 = 0.0
    for x in samples:
        y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2 = x1; x1 = x
        y2 = y1; y1 = y
        out.append(y)
    return out

def biquad_lowpass(samples, freq, q=0.707, sr=SAMPLE_RATE):
    w0 = 2 * math.pi * freq / sr
    alpha = math.sin(w0) / (2 * q)
    cos_w0 = math.cos(w0)
    b0 = (1.0 - cos_w0) / 2.0
    b1 = 1.0 - cos_w0
    b2 = (1.0 - cos_w0) / 2.0
    a0 = 1.0 + alpha
    a1 = -2.0 * cos_w0
    a2 = 1.0 - alpha

    b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0

    out = []
    x1 = x2 = y1 = y2 = 0.0
    for x in samples:
        y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2 = x1; x1 = x
        y2 = y1; y1 = y
        out.append(y)
    return out

def generate_pink_noise(n_samples):
    """Paul Kellet's filtered pink noise algorithm (-3dB/octave)."""
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0
    out = []
    for _ in range(n_samples):
        white = random.uniform(-1.0, 1.0)
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.96900 * b2 + white * 0.1538520
        b3 = 0.86650 * b3 + white * 0.3104856
        b4 = 0.55000 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.0168980
        pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
        b6 = white * 0.115926
        out.append(pink * 0.12)
    return out

# -------------------------------------------------------------
# 2. Respiration Sound Synthesizer (Organic Airflow)
# -------------------------------------------------------------

def synth_organic_inhale(duration=4.0):
    """
    Synthesize soothing organic inhalation breath:
    Airflow through nasal/pharyngeal passages with formant resonance (450Hz, 1100Hz, 2100Hz),
    soft natural swelling envelope.
    """
    n_samples = int(duration * SAMPLE_RATE)
    noise = generate_pink_noise(n_samples)

    # 3 vocal tract formant resonances
    f1 = biquad_bandpass(noise, 480, 2.0)
    f2 = biquad_bandpass(noise, 1150, 2.5)
    f3 = biquad_bandpass(noise, 2200, 3.0)
    air = biquad_lowpass(noise, 3200, 0.707)

    out = []
    for i in range(n_samples):
        t = i / SAMPLE_RATE
        progress = t / duration

        # Inhale envelope: smooth S-curve swell rising to ~85% duration, then gentle ease
        if progress < 0.80:
            p = progress / 0.80
            env = 0.5 * (1.0 - math.cos(math.pi * p))
        else:
            p = (progress - 0.80) / 0.20
            env = 1.0 - 0.3 * p

        # Subtle natural respiratory micro-tremor
        flutter = 1.0 + 0.06 * math.sin(2 * math.pi * 5.2 * t) + 0.03 * math.sin(2 * math.pi * 8.7 * t)

        val = (0.50 * f1[i] + 0.35 * f2[i] + 0.15 * f3[i] + 0.20 * air[i]) * env * flutter
        out.append(val)

    return out

def synth_organic_exhale(duration=4.0):
    """
    Synthesize soothing organic exhalation breath:
    Soft vocal release / sigh through relaxed mouth/throat (380Hz, 880Hz, 1750Hz),
    gentle decaying envelope.
    """
    n_samples = int(duration * SAMPLE_RATE)
    noise = generate_pink_noise(n_samples)

    f1 = biquad_bandpass(noise, 380, 1.8)
    f2 = biquad_bandpass(noise, 880, 2.2)
    f3 = biquad_bandpass(noise, 1750, 2.8)
    air = biquad_lowpass(noise, 2600, 0.707)

    out = []
    for i in range(n_samples):
        t = i / SAMPLE_RATE
        progress = t / duration

        # Exhale envelope: quick gentle swell in first 0.6s, then long warm decay
        if progress < 0.15:
            p = progress / 0.15
            env = 0.5 * (1.0 - math.cos(math.pi * p))
        else:
            p = (progress - 0.15) / 0.85
            env = math.exp(-2.2 * p)

        flutter = 1.0 + 0.05 * math.sin(2 * math.pi * 4.5 * t) + 0.03 * math.sin(2 * math.pi * 7.1 * t)

        val = (0.55 * f1[i] + 0.32 * f2[i] + 0.13 * f3[i] + 0.18 * air[i]) * env * flutter
        out.append(val)

    return out

# -------------------------------------------------------------
# 3. Aquatic Bubbles Synthesizer
# -------------------------------------------------------------

def synth_bubble_cluster(duration=4.0):
    """
    Synthesize delicate underwater rising bubbles from turtle nostrils during exhale.
    Each bubble has a minnaert frequency chirp: rapid decay sine with upward pitch flick.
    """
    n_samples = int(duration * SAMPLE_RATE)
    out = [0.0] * n_samples

    # Create 22 random bubbles scattered between t=0.4s and t=3.6s
    random.seed(42)
    for _ in range(24):
        start_t = random.uniform(0.3, duration - 0.4)
        start_idx = int(start_t * SAMPLE_RATE)
        bubble_len = int(random.uniform(0.025, 0.055) * SAMPLE_RATE)
        f0 = random.uniform(420, 850)
        amp = random.uniform(0.15, 0.45)

        for j in range(bubble_len):
            idx = start_idx + j
            if idx >= n_samples:
                break
            bj = j / SAMPLE_RATE
            # Frequency glides slightly upward as bubble expands
            freq = f0 * (1.0 + 0.18 * (j / bubble_len))
            # Exponential damping
            damp = math.exp(-bj * 85.0)
            wave_val = math.sin(2 * math.pi * freq * bj) * damp * amp
            out[idx] += wave_val

    # Gentle lowpass smoothing
    return biquad_lowpass(out, 1800, 0.707)

# -------------------------------------------------------------
# 4. Ocean Waves Processing (from real ocean_waves.ogg)
# -------------------------------------------------------------

def extract_ocean_wave(start_sec, dur_sec, fade_in=0.8, fade_out=0.8):
    """Extract stereo ocean slice from source_ocean_waves.ogg and apply smooth fades."""
    source_ogg = os.path.join(SOUNDS_DIR, "source_ocean_waves.ogg")
    if not os.path.exists(source_ogg):
        source_ogg = "ocean_waves.ogg"
    proc = subprocess.run(
        [
            "ffmpeg", "-y", "-ss", str(start_sec), "-t", str(dur_sec),
            "-i", source_ogg,
            "-af", f"afade=t=in:ss=0:d={fade_in},afade=t=out:st={dur_sec-fade_out}:d={fade_out}",
            "-f", "s16le", "-ac", "2", "-ar", str(SAMPLE_RATE), "-"
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        check=True
    )
    raw = proc.stdout
    # Ensure byte count is a multiple of 4 (2 channels * 2 bytes/sample)
    n_bytes = (len(raw) // 4) * 4
    raw = raw[:n_bytes]
    num_shorts = n_bytes // 2
    pairs = struct.unpack(f"<{num_shorts}h", raw)
    stereo = [(pairs[i*2] / 32767.0, pairs[i*2+1] / 32767.0) for i in range(num_shorts // 2)]
    return stereo

# -------------------------------------------------------------
# 5. Build Master Multi-Layer Tracks
# -------------------------------------------------------------

def build_all_assets():
    print("Generating breathing audio assets...")

    # A. CC0 Chimes from test_*.mp3
    for name in ["inhale", "exhale", "bell"]:
        src = f"test_{name}.mp3"
        if os.path.exists(src):
            dst = os.path.join(EDITOR_SOUNDS_DIR, f"cue_{name}.mp3")
            subprocess.run(["cp", src, dst], check=True)
            print(f"  ✓ Copied cue_{name}.mp3")

    # B. Organic Breath Inhale (4s)
    inhale_samples = synth_organic_inhale(4.0)
    inhale_wav = os.path.join(SOUNDS_DIR, "breath_inhale.wav")
    write_wav(inhale_wav, inhale_samples)
    convert_to_ogg(inhale_wav, os.path.join(SOUNDS_DIR, "breath_inhale.ogg"))
    convert_to_mp3(inhale_wav, os.path.join(EDITOR_SOUNDS_DIR, "breath_inhale.mp3"))
    os.remove(inhale_wav)
    print("  ✓ Synthesized breath_inhale (.mp3, .ogg)")

    # C. Organic Breath Exhale (4s)
    exhale_samples = synth_organic_exhale(4.0)
    exhale_wav = os.path.join(SOUNDS_DIR, "breath_exhale.wav")
    write_wav(exhale_wav, exhale_samples)
    convert_to_ogg(exhale_wav, os.path.join(SOUNDS_DIR, "breath_exhale.ogg"))
    convert_to_mp3(exhale_wav, os.path.join(EDITOR_SOUNDS_DIR, "breath_exhale.mp3"))
    os.remove(exhale_wav)
    print("  ✓ Synthesized breath_exhale (.mp3, .ogg)")

    # D. Aquatic Bubbles (3.5s)
    bubble_samples = synth_bubble_cluster(3.5)
    bubble_wav = os.path.join(SOUNDS_DIR, "bubbles_exhale.wav")
    write_wav(bubble_wav, bubble_samples)
    convert_to_ogg(bubble_wav, os.path.join(SOUNDS_DIR, "bubbles_exhale.ogg"))
    convert_to_mp3(bubble_wav, os.path.join(EDITOR_SOUNDS_DIR, "bubbles_exhale.mp3"))
    os.remove(bubble_wav)
    print("  ✓ Synthesized bubbles_exhale (.mp3, .ogg)")

    # E. Ocean Inhale (4.0s swell) & Exhale (4.0s recession) from real recording
    ocean_inhale_stereo = extract_ocean_wave(25.0, 4.0, fade_in=0.6, fade_out=0.4)
    ocean_inhale_wav = os.path.join(SOUNDS_DIR, "ocean_inhale.wav")
    write_wav(ocean_inhale_wav, ocean_inhale_stereo, channels=2)
    convert_to_mp3(ocean_inhale_wav, os.path.join(EDITOR_SOUNDS_DIR, "ocean_inhale.mp3"))
    os.remove(ocean_inhale_wav)
    print("  ✓ Extracted ocean_inhale.mp3")

    ocean_exhale_stereo = extract_ocean_wave(29.0, 4.0, fade_in=0.4, fade_out=0.8)
    ocean_exhale_wav = os.path.join(SOUNDS_DIR, "ocean_exhale.wav")
    write_wav(ocean_exhale_wav, ocean_exhale_stereo, channels=2)
    convert_to_mp3(ocean_exhale_wav, os.path.join(EDITOR_SOUNDS_DIR, "ocean_exhale.mp3"))
    os.remove(ocean_exhale_wav)
    print("  ✓ Extracted ocean_exhale.mp3")

    # F. Seamless Continuous Master 8-Second Meditation Loop
    # Rhythm: Inhale 0-3.36s (42%), Hold 3.36-4.32s (12%), Exhale 4.32-7.52s (40%), Rest 7.52-8.0s (6%)
    n_8s = 8 * SAMPLE_RATE
    master_l = [0.0] * n_8s
    master_r = [0.0] * n_8s

    # Layer 1: Ambient deep ocean swell baseline
    ocean_8s = extract_ocean_wave(32.0, 8.0, fade_in=0.8, fade_out=0.8)
    for i in range(min(n_8s, len(ocean_8s))):
        ol, or_ = ocean_8s[i]
        master_l[i] += ol * 0.45
        master_r[i] += or_ * 0.45

    # Layer 2: Organic Inhale Breath (starts at 0.0s, lasts 3.4s)
    inh_8 = synth_organic_inhale(3.4)
    for i in range(len(inh_8)):
        master_l[i] += inh_8[i] * 0.60
        master_r[i] += inh_8[i] * 0.60

    # Layer 3: Organic Exhale Breath (starts at 4.32s, lasts 3.2s)
    exh_8 = synth_organic_exhale(3.2)
    start_exh = int(4.32 * SAMPLE_RATE)
    for i in range(len(exh_8)):
        idx = start_exh + i
        if idx < n_8s:
            master_l[idx] += exh_8[i] * 0.60
            master_r[idx] += exh_8[i] * 0.60

    # Layer 4: Underwater Bubbles during exhale (starts at 4.6s)
    bub_8 = synth_bubble_cluster(2.8)
    start_bub = int(4.60 * SAMPLE_RATE)
    for i in range(len(bub_8)):
        idx = start_bub + i
        if idx < n_8s:
            master_l[idx] += bub_8[i] * 0.28
            master_r[idx] += bub_8[i] * 0.35

    master_stereo = list(zip(master_l, master_r))
    master_wav = os.path.join(SOUNDS_DIR, "turtle_breath_8s_master.wav")
    write_wav(master_wav, master_stereo, channels=2)
    convert_to_ogg(master_wav, os.path.join(SOUNDS_DIR, "turtle_breath_8s_master.ogg"))
    convert_to_mp3(master_wav, os.path.join(EDITOR_SOUNDS_DIR, "turtle_breath_8s_master.mp3"))
    os.remove(master_wav)
    print("  ✓ Created turtle_breath_8s_master (.mp3, .ogg)")

    # G. Dirga Pranayama 10-Second Master Loop
    # 3-part inhale: Flank (0-1.5s), Visceral drop (1.5-3.0s), Pectoral/throat (3.0-4.5s)
    # Hold (4.5-5.5s), Exhale release (5.5-9.0s), Rest (9.0-10.0s)
    n_10s = 10 * SAMPLE_RATE
    d_l = [0.0] * n_10s
    d_r = [0.0] * n_10s

    ocean_10s = extract_ocean_wave(48.0, 10.0, fade_in=0.8, fade_out=0.8)
    for i in range(min(n_10s, len(ocean_10s))):
        ol, or_ = ocean_10s[i]
        d_l[i] += ol * 0.40
        d_r[i] += or_ * 0.40

    inh_10 = synth_organic_inhale(4.5)
    for i in range(len(inh_10)):
        d_l[i] += inh_10[i] * 0.58
        d_r[i] += inh_10[i] * 0.58

    exh_10 = synth_organic_exhale(3.5)
    start_exh10 = int(5.50 * SAMPLE_RATE)
    for i in range(len(exh_10)):
        idx = start_exh10 + i
        if idx < n_10s:
            d_l[idx] += exh_10[i] * 0.58
            d_r[idx] += exh_10[i] * 0.58

    bub_10 = synth_bubble_cluster(3.0)
    start_bub10 = int(5.80 * SAMPLE_RATE)
    for i in range(len(bub_10)):
        idx = start_bub10 + i
        if idx < n_10s:
            d_l[idx] += bub_10[i] * 0.25
            d_r[idx] += bub_10[i] * 0.32

    dirga_stereo = list(zip(d_l, d_r))
    dirga_wav = os.path.join(SOUNDS_DIR, "turtle_breath_10s_dirga.wav")
    write_wav(dirga_wav, dirga_stereo, channels=2)
    convert_to_ogg(dirga_wav, os.path.join(SOUNDS_DIR, "turtle_breath_10s_dirga.ogg"))
    convert_to_mp3(dirga_wav, os.path.join(EDITOR_SOUNDS_DIR, "turtle_breath_10s_dirga.mp3"))
    os.remove(dirga_wav)
    print("  ✓ Created turtle_breath_10s_dirga (.mp3, .ogg)")

    # Clean temporary files
    for tmp in ["test_inhale.mp3", "test_exhale.mp3", "test_bell.mp3", "breathing_man.ogg"]:
        if os.path.exists(tmp):
            os.remove(tmp)

    print("All audio assets successfully built!")

if __name__ == "__main__":
    build_all_assets()
