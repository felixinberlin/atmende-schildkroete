# Breathing module

A breathing engine that doesn't depend on any framework. Tika the turtle is one renderer; others can be plugged in.

```
core/        generic: contract (schema.ts), timeline, clock, BreathingSession — no DOM, no turtle
patterns/    built-in patterns as JSON (validated against the contract)
audio/       Web Audio cue playback; profiles map cue keys → sample files / synth voices
turtle/      Tika-specific: pose (sample → rig transforms), rig binding, createTurtleSession
human/       simple human guide: follow the air, see the breathing muscles (HumanGuideRenderer)
ui/          fullscreen + wake lock helper
```

## Regions and muscles (standard terminology)

Segments use the three standard breathing regions. The three-part breath fills them bottom-up:

| region       | everyday name           | main muscle                                      | human guide             | Tika                  |
|--------------|-------------------------|--------------------------------------------------|-------------------------|-----------------------|
| `abdominal`  | Bauch (diaphragmatic)   | Zwerchfell / diaphragm                           | dome flattens, belly out | soft plastron swells  |
| `thoracic`   | Rippen (costal)         | Zwischenrippenmuskeln / external intercostals    | ribs lift               | flanks / rear flippers |
| `clavicular` | Brust, Schlüsselbeine   | Halsmuskeln / scalenes, sternocleidomastoid      | collarbones rise        | head & neck lift      |
| *(exhale)*   | Bauchmuskeln (aktiv)    | Bauchmuskeln / abdominals                        | gentle inner belly cue  | —                     |

**Hands-on-belly/chest cue:** The hands rest on the body walls and move exactly with them (the shoulder stays fixed), so they never come off the body. Following standard clinical guidelines for diaphragmatic breathing (Cleveland Clinic, American Lung Association), the human guide rests one hand on the upper chest and one on the belly. With calm, belly-led patterns the belly hand moves clearly while the chest hand stays almost still; in Dirga stage 3 (clavicular) the chest hand rises visibly.

**Exhale cue:** By default (`exhaleStyle: "gentle"`), the Bauchmuskeln gently engage during the exhale (up to ~0.6) to cue slight abdominal tightening. Patterns can set `exhaleStyle: "passive"` for fully passive elastic recoil.

**Arm variants:** The pattern field `guide.arms` supports `"hands-on-body"` (default) and `"raise-on-inhale"`. In `"raise-on-inhale"` (used in activating exercises like `star`), the arms rotate forward and up from the shoulder to overhead (0° → 195°, a slight reaching-up stretch so the arm reads behind the head) on the inhale and lower on the exhale, shifting the default region fill toward thoracic and clavicular.

**Accessibility:** The animation has visible pause controls (WCAG 2.2.2). With `prefers-reduced-motion`, moving air particles and head/flipper motion are dropped, hand cues are shown at reduced amplitude, and raised-arm motions revert to the static hands-on-body posture.

## The `BreathingPattern` contract (v1)

No public standard exists for breathing *patterns*. FHIR, Open mHealth, Apple HealthKit (`mindfulSession`) and
Android Health Connect (`MindfulnessSessionRecord`, type BREATHING) only log that a session happened.
Apps converge on four phases, `inhale / holdIn / exhale / holdOut`, in seconds, with 0 meaning skipped.
Our contract generalises that convention into an **ordered list of phases**:

```jsonc
{
  "$schema": "../../../schema/breathing-pattern.v1.schema.json",
  "schemaVersion": "1",
  "id": "sigh",
  "name": "Physiological sigh",
  "phases": [
    { "kind": "inhale", "durationMs": 2000, "targetVolume": 0.8 },
    { "kind": "inhale", "durationMs": 800 },          // top-up to full (default targetVolume 1)
    { "kind": "exhale", "durationMs": 6000, "airway": "mouth" }
  ]
}
```

- `kind`: `inhale | hold | exhale`. A hold keeps the lung volume.
- `durationMs`: duration at speed 1; 0 skips the phase.
- `targetVolume` (0–1): lung fill at the end of the phase.
- `segments`: sub-stages led by a body `region` (e.g. Dirga: flank → belly → chest).
- `cue`, `label`, `easing`, `airway`, plus `safety`, `tags`, `locale`, `exhaleStyle` (`"gentle" | "passive"`), and `guide` (`{ arms: "hands-on-body" | "raise-on-inhale" }`) on the pattern.

- Zod (`core/schema.ts`) is the single source: TS types plus `parsePattern()` for untrusted input.
- `npm run schema` regenerates the JSON Schema (2020-12) at `editor/schema/breathing-pattern.v1.schema.json`. A test fails if it is stale.
- `fromFourPhase({ inhale, holdIn, exhale, holdOut })` converts from the common four-phase format.
- Speed, volume and sound profile are runtime settings, not part of a pattern.
- Any breaking change → `schemaVersion: "2"` and a new schema file.

## Using the engine elsewhere

```ts
const session = new BreathingSession({ pattern, renderers: [myRenderer], audio: myAudioSink });
session.on('phase', ({ cue, durationSec }) => …);   // once per phase
session.on('tick', sample => …);                    // every frame: volume, regions, progress
```

A renderer only implements `render(sample, elapsedMs)`. `sample.volume` (0–1) and `sample.regions` are continuous over time.

## Standalone build

`npm run build:engine` bundles `index.ts` as UMD (global `TurtleBreathing`) into `/turtle_breathing_engine.js` for `turtle_breathing_player.html`, so the player also works opened via `file://` (samples then play through `<audio>` elements because `fetch` is blocked).
That file is generated; don't edit it by hand.
