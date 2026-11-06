# 🐢 Tika Breathing Sounds & Audio Architecture

This directory contains studio-mastered audio assets for **Tika the Turtle** (Mindfulness & Respiratory Regulation in the *Chemistry* app), designed specifically for youth urge-surfing ("Die Welle"), stress relief, and breathing exercises ("Atmen wie die Wellen").

---

## 🎧 Audio Asset Catalogue

| File | Duration | Format | Description | Provenance & License |
| :--- | :--- | :--- | :--- | :--- |
| **`turtle_breath_8s_master.mp3`** / `.ogg` | **8.0 s** | Stereo 44.1 kHz | **Full Synchronized Loop**: 4s Inhale ocean swell + soft breath, 1s still crest hold, 4s Exhale ocean recession with underwater bubbles, 1s calm rest. Seamless infinite loop. | CC0 & CC-BY 3.0 (Synthesized & Mastered) |
| **`turtle_breath_10s_dirga.mp3`** / `.ogg` | **10.0 s** | Stereo 44.1 kHz | **Dirga Pranayama 3-Part Breath**: 4.5s progressive wave inhale (flank -> belly -> chest), 1s hold, 3.5s release with bubbles, 1s rest. | CC0 & CC-BY 3.0 (Synthesized & Mastered) |
| **`breath_inhale.mp3`** / `.ogg` | **4.0 s** | Mono 44.1 kHz | **Gentle Organic Inhale**: Soothing air intake with natural vocal tract formants (F1: 480 Hz, F2: 1150 Hz, F3: 2200 Hz), smooth S-curve envelope. | CC0 (Procedural DSP Synthesis) |
| **`breath_exhale.mp3`** / `.ogg` | **4.0 s** | Mono 44.1 kHz | **Gentle Organic Exhale**: Warm relaxed sigh / release (F1: 380 Hz, F2: 880 Hz, F3: 1750 Hz), exponential calming decay. | CC0 (Procedural DSP Synthesis) |
| **`ocean_inhale.mp3`** | **4.0 s** | Stereo 44.1 kHz | **Ocean Tide Swelling**: Genuine wave rushing inward onto shore, creating meditative acoustic surge. | Creative Commons Attribution 3.0 (Wikimedia Commons / `File:Oceanwavescrushing.ogg`) |
| **`ocean_exhale.mp3`** | **4.0 s** | Stereo 44.1 kHz | **Ocean Wave Receding**: Water softly washing back over small pebbles. | Creative Commons Attribution 3.0 (Wikimedia Commons / `File:Oceanwavescrushing.ogg`) |
| **`bubbles_exhale.mp3`** / `.ogg` | **3.5 s** | Mono 44.1 kHz | **Underwater Bubble Stream**: Cluster of gentle Minnaert-frequency acoustic bubbles (420–850 Hz) rising from turtle snout. | CC0 (Procedural DSP Synthesis) |
| **`cue_inhale.mp3`** | **4.0 s** | Mono 44.1 kHz | **Soft Meditation Inhale Chime**: Gentle rising harmonic bell cue. | CC0 1.0 Universal (Public Domain Dedication) |
| **`cue_exhale.mp3`** | **4.0 s** | Mono 44.1 kHz | **Soft Meditation Exhale Chime**: Grounding resonance cue. | CC0 1.0 Universal (Public Domain Dedication) |
| **`cue_bell.mp3`** | **16.0 s** | Mono 44.1 kHz | **Tibetan Singing Bowl Bell**: Warm sustained bell for session completion. | CC0 1.0 Universal (Public Domain Dedication) |

---

## 📁 Where the files live

- **`editor/public/sounds/*.mp3`**: the web-served files (single copy), used by the React app (`/sounds/…`) and the standalone player (`editor/public/sounds/…`).
- **`sounds/`** (this folder): `.ogg` masters, `source_ocean_waves.ogg` and this README.

## 🔗 How to Link the Sounds to the Turtle

Don't wire `new Audio()` by hand. The breathing engine (`editor/src/breathing`) plays cues in lockstep with the animation.
Each phase maps to a cue key (`inhale`, `holdIn`, `exhale`, `holdOut`), and `audio/profiles.ts` maps cue keys to these files:

```ts
import { createTurtleSession, findPattern } from './breathing';

const { session, audio } = createTurtleSession(svgElement, {
  pattern: findPattern('ocean')!,
  audio: { profile: 'ocean_master', volume: 0.8, assetBase: '/sounds/' }
});
button.addEventListener('click', () => { audio.unlock(); session.toggle(); }); // audio needs a user gesture
```

To add a sound, put the MP3 in `editor/public/sounds/` and reference it in `SOUND_PROFILES`. A test checks that every referenced file exists.

---

## 🛠 Rebuilding Audio Assets
To regenerate all WAV, MP3, and OGG files:
```bash
python3 scripts/build_breathing_audio.py
```
MP3s are written to `editor/public/sounds/`; OGG masters to `sounds/`.
