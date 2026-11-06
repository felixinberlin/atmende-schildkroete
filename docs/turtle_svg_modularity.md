# 🐢 Tika the Turtle — SVG Modularity & Rigging Reference

This guide documents the modular structure of `breathing_turtle.svg` and `turtle_rig_standalone.svg`, designed for seamless integration into web animations (CSS, GSAP, Anime.js, Framer Motion), mobile apps (Flutter, React Native), and game engines.

---

## 1. File Variations

1. **`breathing_turtle.svg`**:
   - The complete scene: Deep-ocean backdrop, ambient floating particles, visual breath-pacing guide rings, the fully rigged turtle character, exhale bubble streams, and the bottom HUD rhythm badge.
2. **`turtle_rig_standalone.svg`**:
   - The isolated turtle character with all skeletal rigging, joint pivots, and CSS animations, but **transparent background and no HUD**, cropped tightly in `viewBox="100 80 600 440"`. Ideal for UI cards, avatars, and game sprites.
3. **`turtle_dirga_pranayama.svg`**:
   - The 10-second 3-stage Yogic breath version with inguinal flank, visceral floor drop, and pectoral/hyoid rotation.

---

## 2. Layer Hierarchy & Semantic IDs

The SVG is strictly organized from back to front into 5 top-level modular layers:

```
<svg id="tikaBreathingTurtle" viewBox="0 0 800 600">
  │
  ├── <g id="layer-backdrop">          ── Environment & ocean depth gradients
  │
  ├── <g id="layer-ambient">           ── Floating atmospheric motes / light specks
  │
  ├── <g id="layer-guides">            ── Paced breathing ripple rings (400, 300)
  │
  ├── <g id="layer-turtle-character">  ── Main Character Rig (Pivot: 400, 320)
  │     ├── <g id="rig-limbs-distant">
  │     │     ├── <g id="rig-flipper-rear-lt">   (Pivot: 270, 290)
  │     │     └── <g id="rig-flipper-front-lt">  (Pivot: 470, 250)
  │     ├── <g id="rig-tail">                    (Pivot: 230, 330)
  │     ├── <g id="rig-plastron">                (Pivot: 380, 320) [Soft Belly]
  │     ├── <g id="rig-carapace">                (Pivot: 380, 285) [Rigid Shell]
  │     │     ├── <path id="part-shell-dome">
  │     │     ├── <path id="part-shell-rim">
  │     │     └── <g id="rig-scutes">            [6 Individual Scute Plates]
  │     ├── <g id="rig-head-neck">               (Pivot: 470, 310) [Cranial Rig]
  │     │     ├── <path id="part-throat-gular">  [Buccal pump]
  │     │     ├── <circle id="part-nostril">     (Origin: 674, 250)
  │     │     ├── <path id="part-mouth">
  │     │     └── <g id="rig-eye">               (Pivot: 605, 235) [Blink Rig]
  │     ├── <g id="rig-limbs-foreground">
  │     │     ├── <g id="rig-flipper-front-rt">  (Pivot: 470, 320)
  │     │     └── <g id="rig-flipper-rear-rt">   (Pivot: 245, 335)
  │     └── <g id="rig-breath-fx">
  │           ├── <g id="bubble-cluster-1">      (Origin: 674, 250)
  │           └── <g id="bubble-cluster-2">      (Origin: 674, 250)
  │
  └── <g id="layer-hud">               ── Paced breathing HUD badge (Center: 400, 552)
```

---

## 3. Joint Pivot Reference Table

When animating limbs, neck, or body parts, **always set the transform origin** to these coordinates.
In code, the single source of truth is `RIG_PARTS` in `editor/src/breathing/turtle/rig.ts`; keep this table in sync with it.
The breathing engine itself is rig-agnostic (see `editor/src/breathing/README.md`).

| Joint / Element | Group ID | Pivot $(X, Y)$ | Anatomy / Natural Motion |
| :--- | :--- | :--- | :--- |
| **Character Root** | `layer-turtle-character` | `400px 320px` | Oceanic vertical bobbing and gentle roll |
| **Front Right Flipper** | `rig-flipper-front-rt` | `470px 320px` | Shoulder joint; down-stroke and glide |
| **Front Left Flipper** | `rig-flipper-front-lt` | `470px 250px` | Distant shoulder joint |
| **Rear Right Flipper** | `rig-flipper-rear-rt` | `245px 335px` | Hip joint; steering paddle |
| **Rear Left Flipper** | `rig-flipper-rear-lt` | `270px 290px` | Distant hip joint |
| **Head & Neck** | `rig-head-neck` | `470px 310px` | Cervical base; upward lift during inhale |
| **Eye (Blink)** | `rig-eye` | `605px 235px` | Center of eyeball; half-lid relaxation |
| **Soft Belly (Plastron)**| `rig-plastron` | `380px 320px` | Visceral expansion downward ($+Y$) and outward |
| **Shell (Carapace)** | `rig-carapace` | `380px 285px` | Rigid dome rising gently upward ($-Y$) |
| **Nostril (Breath Origin)**| `part-nostril` | `674px 250px` | Emitter source for exhale bubble streams |
| **Pacer Guide Rings** | `layer-guides` | `400px 300px` | Ripple pulsation center |

---

## 4. Animation Control via CSS Variables

Change any timing, play state, or color without modifying keyframes:

```css
/* Change cycle from 8 seconds to 12 seconds */
svg {
  --breath-cycle: 12s;
}

/* Pause / Resume */
svg {
  --anim-state: paused; /* or add class .anim-paused */
}

/* Color Theming */
svg {
  --color-skin: #10b981;        /* Primary emerald skin */
  --color-shell-base: #065f46;  /* Forest carapace */
  --color-belly-base: #fde047;  /* Warm golden plastron */
  --color-cue-in: #5eead4;      /* Inhale mint */
  --color-cue-hold: #fde047;    /* Hold yellow */
  --color-cue-out: #38bdf8;     /* Exhale ocean blue */
}
```

---

## 5. Layer Visibility Utility Classes

Add any of these classes to the `<svg>` root element to toggle components:

| Class | Effect |
| :--- | :--- |
| **`.turtle-only`** | Hides backdrop, ambient particles, guide rings, and HUD. Leaves only Tika! |
| **`.hide-backdrop`** | Removes the dark blue ocean background card (makes canvas transparent). |
| **`.hide-guides`** | Hides the expanding dashed ripple rings. |
| **`.hide-hud`** | Hides the bottom pill container and text labels. |
| **`.hide-ambient`** | Hides drifting sea particles. |
| **`.hide-bubbles`** | Hides the nostril bubbles stream. |
| **`.anim-paused`** | Freezes all CSS animations in place cleanly. |

---

## 6. Example: Scripting Custom Animations (GSAP / Web Animations API)

Because every limb has an explicit `id` and pivot metadata, you can animate Tika with GSAP directly:

```javascript
import gsap from 'gsap';

// Swim forward stroke
gsap.to('#rig-flipper-front-rt', {
  rotation: -25,
  transformOrigin: '470px 320px',
  duration: 1.2,
  yoyo: true,
  repeat: -1,
  ease: 'sine.inOut'
});

// Blink eye
function naturalBlink() {
  gsap.to('#rig-eye', {
    scaleY: 0.1,
    transformOrigin: '605px 235px',
    duration: 0.12,
    yoyo: true,
    repeat: 1,
    onComplete: () => {
      gsap.delayedCall(Math.random() * 4 + 2, naturalBlink);
    }
  });
}
naturalBlink();
```

---

## 7. Unified Parametric Breathing Engine & All Techniques

While CSS `@keyframes` provides a great lightweight fallback for a fixed 8s cycle, breathwork and therapeutic protocols require **adaptive phase timings**:

1. **Ocean Wave Breathing (Urge Surfing / "Die Welle")**: 4s Inhale · 1s Hold · 4s Exhale · 1s Rest (10s total)
2. **Box Breathing (Navy SEAL / Focus & Craving Reset)**: 4s Inhale · 4s Hold · 4s Exhale · 4s Rest (16s total)
3. **4-7-8 Breathing (Parasympathetic Vagus Nerve / Sleep)**: 4s Inhale · 7s Hold · 8s Exhale · 0.5s Rest (19.5s total)
4. **Dirga Pranayama (3-Stage Wave Breath)**: Inhale Stage 1 (Flank 1.5s) $\rightarrow$ Stage 2 (Belly 1.5s) $\rightarrow$ Stage 3 (Chest & Hyoid 1.5s) · 1s Hold · 3.5s Wave Exhale · 1s Rest (10s total)
5. **Coherence Breathing (Heart Rate Variability / HRV)**: 5.5s Inhale · 5.5s Exhale (0.1 Hz / 6 breaths/min)
6. **Custom Therapeutic Mode**: Freely adjustable Inhale, Hold, Exhale, and Rest sliders.

### How the Parametric Engine Works (`turtle_breathing_engine.js`):
Instead of fixed percentage keyframes, `TurtleBreathingEngine` computes continuous interpolation on every frame:
- **Plastron (Belly)**: Expands downward ($+Y$) and outward strictly for the duration of the technique's inhale, stays inflated during hold, deflates during exhale.
- **Carapace (Shell)**: Rises during inhale, stays steady during hold, settles during exhale.
- **Eye Rig**: Eyelids serenely half-close during retention (`hold`), and blink naturally every 7 seconds.
- **Bubbles (`#rig-breath-fx`)**: Emits and rises **exclusively** during the technique's exhale phase!
- **Audio Synchronization**: Both the procedural Web Audio synthesizer and the sample player are phase-locked to the exact millisecond of every phase change.

```javascript
import { TurtleBreathingEngine, BREATHING_TECHNIQUES } from './turtle_breathing_engine.js';

const engine = new TurtleBreathingEngine(document.getElementById('tikaBreathingTurtle'), {
  technique: BREATHING_TECHNIQUES.box, // or 'calm478', 'ocean', 'dirga', 'coherence'
  soundProfile: 'ocean_master',        // or 'breath_pure', 'synth_webaudio'
  volume: 0.8,
  onTick: (state) => {
    console.log(`Phase: ${state.phase}, remaining: ${state.phaseRemainingSec}s`);
  }
});

// Change technique on the fly:
engine.setTechnique('calm478');
```

