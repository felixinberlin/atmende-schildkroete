# 🐢 Tika · Die atmende Schildkröte

> **Interaktiver Atembegleiter, Ozean-Inselwelt, Meeresmuster & Biofeedback-Respirations-Engine**

[![CI](https://github.com/felixinberlin/atmende-schildkroete/actions/workflows/ci.yml/badge.svg)](https://github.com/felixinberlin/atmende-schildkroete/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-90%20passed-10b981.svg)](https://github.com/felixinberlin/atmende-schildkroete)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](LICENSE)

**Tika** ist ein synchronisierter, lebendiger Atembegleiter zur Stressregulation, Angstlinderung, Impulssteuerung (*Urge Surfing* / „Auf der Welle reiten“) und Achtsamkeitsförderung. Das Projekt verbindet physiologisch fundierte Atemübungen mit einer poetischen Meereswelt, generativem Mandala-Vektordesign und moderner Web-Audio-Synthese.

---

## 🌟 Highlights & Funktionen

- 🐢 **Vollständig geriggter Schildkröten-Charakter (Tika):**
  - Parametrisch gesteuerte Flossenschläge, Kopfbewegungen, Schnabelatmung, Augenblinzeln und Panzerhebung.
  - Vollständige frame-to-frame Kontinuität ohne ruckartige Übergänge (mathematisch stetig und differenzierbar).
- 🫁 **Menschlicher Atembegleiter (Anatomischer Querschnitt):**
  - Gleichzeitige Darstellung der menschlichen Atmung: Absenkung der Zwerchfellkuppel, Drehung des Rippenbogens, Dehnung der Bauch- und Brustwand, Hebung der Schlüsselbeine und sichtbare Luftstrom-Partikel.
  - Unterstützt passive elastische Rückstellung oder sanfte abdominale Ausatmung sowie Hände-am-Körper- oder Hebearm-Modi.
- 🗺️ **Inselkarte & Ozean-Archipel:**
  - Erkunde eine Meereswelt mit 6 einzigartigen Inseln, die jeweils einer fundierten Atemtechnik und eigenen Meeresüberfahrten zugeordnet sind.
- 🔭 **Zuschauer-Weltreise (Spectator Voyage):**
  - Entspannungsmodus mit Tika beim Durchschwimmen von 5 Meeresbiomen (*Korallenriff, Tiefseequellen, Mangrovenbucht, Seegraswiesen, Offener Ozean*).
  - Liebevoll verfasste deutsche Dialoge und Begegnungen mit Delfinen, Mantarochen, Quallen und Tiefsee-Biolumineszenz.
- 🌀 **Meeresmuster & Generative Sacred Geometry:**
  - Mit jedem Atemzug webt Tika leuchtende Pfade in den Ozean: *Gezeiten-Rosette, Kompass-Kristall (Box-Spirograph), Nautilus-Mondspirale, Kelp-Blüte (Dirga-3-Stufen), Gleichklang-Acht (Lissajous-Infinity)* und *Seestern-Kranz*.
- 📖 **Reisetagebuch & Mandala-Vektorexport (Breath Journal):**
  - Lokale, nicht-bewertende Speicherung abgeschlossener Sitzungen mit Reflexionsnotizen.
  - Direkter SVG-Artwork-Download für jedes gewobene Meeresmuster als Keepsake/Mandala.
- 🎙️ **shii·haa Mikrofon-Atemerkennung:**
  - Optionale Biofeedback-Steuerung via Web Audio API. Erkennt Einatmung, Ausatmung und Atempausen in Echtzeit anhand von Turbulenzenergie und Spektralschwerpunkt (Centroid-Frequenzweiche 150–2500 Hz).
- ✒️ **Geschichtenatelier (Story Creator):**
  - Visueller Knoten-Graph-Editor (`@xyflow/react`) für verzweigte Erzählungen, Entscheidungswege und spielerische Übungseinheiten.
- 📦 **Modulare, erweiterbare Engine:**
  - Zero-Dependency-Kern (`src/breathing/core`) mit Registry-System für eigene Charakter-Rigs (`CharacterRigRegistry`), Soundprofile (`SoundProfileRegistry`) und fluent `BreathingPatternBuilder`.
- 🎮 **Autarker Standalone Single-File Player:**
  - `standalone/index.html` bzw. `turtle_breathing_player.html` läuft komplett ohne Node oder Build-Server direkt in jedem Browser (auch über `file://`).

---

## 🗂️ Architektur & Projektstruktur

```
atmende-schildkroete/
├── .github/workflows/ci.yml       # Automatisierte GitHub Actions Test- und Build-Pipeline
├── public/                        # Statische Web-Assets (MP3-Audiosamples)
├── schema/                        # JSON Schema für Atemmuster (Draft 2020-12)
├── scripts/
│   ├── build_breathing_audio.py   # Python DSP-Synthesizer für beruhigende Meereswellen
│   └── generate-schema.ts         # Generiert JSON-Schema aus Zod-Typen
├── sounds/                        # Studio-Master-Audiodateien (.ogg) & Dokumentation
├── standalone/
│   ├── index.html                 # Standalone Web-Player ohne Build-Schritt
│   └── turtle_breathing_engine.js # Kompiliertes UMD-Bundle der Breathing Engine
├── svg/                           # Master Vektor-Grafiken und Rigs
│   ├── breathing_turtle.svg       # Vollständige Szene mit Hintergrund & HUD
│   ├── turtle_rig_standalone.svg  # Isolierter Charakter-Rig mit transparentem Grund
│   ├── turtle_dirga_pranayama.svg # 3-Stufen Yogische Atmung
│   └── turtle_visceral_cutaway.svg# Anatomischer Einblick (Zwerchfell & Lunge)
├── docs/                          # Architektur- und Rigging-Referenzen
└── src/
    ├── main.tsx                   # React-Hauptanwendung (Inselkarte, Geschichten, Reise)
    ├── islands.ts                 # Inselwelt-Modell & 6 Ozean-Inseln
    ├── graph.ts                   # Verzweigter Geschichten-Graph & Validierung
    ├── components/                # React-UI-Komponenten
    └── breathing/                 # Modulare Respirations-Engine (Framework-unabhängig)
        ├── core/                  # Clock, Timeline, Easing, Session, Schema & PatternBuilder
        ├── registry/              # Extensible CharacterRigRegistry & SoundProfileRegistry
        ├── turtle/                # Tika-Schildkröten-Rig & stetige Pose-Interpolation
        ├── human/                 # Anatomischer menschlicher Atembegleiter
        ├── audio/                 # AudioEngine & prozedurale Web-Audio-Synthesizer
        ├── mic/                   # shii·haa Mikrofon-Atemerkennung (FFT & Centroid)
        ├── patterns/              # JSON-Atemmuster (Ozean, Box, 4-7-8, Dirga, Kohärenz, Stern)
        ├── seaPattern.ts          # Parametrische Geometrie für Meeres-Mandalas
        ├── breathJournal.ts       # Lokales Tagebuch & SVG-Artwork-Renderer
        └── voyageData.ts          # Authentische deutsche Dialoge & Meeres-Biome
```

---

## 🚀 Schnellstart

### Voraussetzungen
- Node.js `20.x` oder `22.x`
- npm `10.x`+

```bash
# Repository klonen
git clone https://github.com/felixinberlin/atmende-schildkroete.git
cd atmende-schildkroete

# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten (Vite)
npm run dev
```

Die Anwendung öffnet sich unter `http://localhost:5173`.

### Tests ausführen

```bash
# Alle 90 Unit-Tests mit Vitest durchführen
npm test

# Typecheck durchführen (Strict TypeScript)
npm run typecheck
```

### Produktion & Standalone Engine kompilieren

```bash
# Gesamte Web-App nach dist/ bauen
npm run build

# Standalone UMD & ESM Engine für Drittanwendungen bauen:
npm run build:engine
```

Das generiert:
- `turtle_breathing_engine.js` (UMD-Bundle für `<script>`-Tags und Standalone-Player)
- `dist/turtle_breathing_engine.mjs` (Modernes ESM-Modul für Bundler / npm)

---

## 🧩 Erweiterbarkeit & Eigene Anpassungen

### 1. Eigenes Atemmuster mit dem `BreathingPatternBuilder` definieren

Mit der Fluent-API können beliebige Atemmuster typensicher erstellt und validiert werden:

```typescript
import { BreathingPatternBuilder, registerCustomPattern } from 'atmende-schildkroete';

const myPattern = new BreathingPatternBuilder('deep-calm', 'Tiefe Ozean-Entspannung')
  .setShortName('4-2-6-2')
  .setDescription('Längeres Ausatmen zur Aktivierung des Parasympathikus')
  .setExhaleStyle('gentle')
  .setGuideArms('hands-on-body')
  .inhale(4000, { label: 'Tief durch die Nase einatmen' })
  .hold(2000, { label: 'Sanfte Atempause' })
  .exhale(6000, { label: 'Langsamer Atemstrom durch den Mund' })
  .pause(2000, { label: 'Ruhe im Ozean' })
  .build();

// Zur Laufzeit in der Engine registrieren:
registerCustomPattern(myPattern);
```

### 2. Eigenen Charakter-Rig registrieren

Über die `characterRigRegistry` können neben Tika und dem menschlichen Guide neue Lebewesen (z. B. ein Wal, Delfin oder Seepferdchen) registriert werden:

```typescript
import { characterRigRegistry, type BreathRenderer, type BreathSample } from 'atmende-schildkroete';

class WhaleRenderer implements BreathRenderer {
  constructor(private container: HTMLElement) {}
  render(sample: BreathSample, elapsedMs: number) {
    // Zeichne oder transformiere den Wal anhand von sample.volume (0..1)
  }
}

characterRigRegistry.register({
  id: 'whale',
  name: 'Balu der Wal',
  description: 'Sanfter Blauwal für ruhige Atemreisen',
  createRenderer: (container) => new WhaleRenderer(container as HTMLElement)
});
```

### 3. Eigenes Klangprofil registrieren

Über die `soundProfileRegistry` können neue Ambient-Spuren oder Web-Audio-Synthesen eingebunden werden:

```typescript
import { soundProfileRegistry } from 'atmende-schildkroete';

soundProfileRegistry.register('forest-stream', {
  kind: 'samples',
  label: '🌲 Waldquell & Vogelgesang',
  cues: {
    inhale: [{ file: 'stream_in.mp3', baseDurSec: 4, stretch: true }],
    exhale: [{ file: 'stream_out.mp3', baseDurSec: 4, stretch: true }]
  }
});
```

---

## 🧘 Unterstützte Atemtechniken

| ID | Name | Rhythmus (Ein · Halt · Aus · Halt) | Physiologische Wirkung | Meeresmuster |
|---|---|---|---|---|
| `ocean` | **Atmen wie die Wellen** | 4s · 0s · 4s · 0s | Sanfter Basiseinstieg, Rhythmisierung | Gezeiten-Rosette |
| `box` | **Kompass-Atmung (Box Breathing)** | 4s · 4s · 4s · 4s | Schärft Konzentration, senkt Puls | Kompass-Kristall |
| `calm478` | **4-7-8 Einschlaf-Atem** | 4s · 7s · 8s · 0s | Tiefe parasympathische Entlastung | Nautilus-Spirale |
| `dirga` | **3-Stufen-Wellenatmung (Dirga)** | 6s (Bauch/Brust/Schlüsselbein) · 2s · 6s · 0s | Erweitert Vitalkapazität, löst Zwerchfellblockaden | Kelp-Blüte |
| `coherence` | **Herz-Kohärenz (5.5 / 5.5)** | 5.5s · 0s · 5.5s · 0s | Optimiert Herzratenvariabilität (HRV) | Gleichklang-Acht |
| `star` | **Seestern-Atem (Star Breath)** | 3s · 3s · 3s · 3s | Spielerische Taktung für Kinder & Jugendliche | Seestern-Kranz |
| `custom` | **Individuelle Taktung** | Frei konfigurierbar | Individuelle Anpassung an eigene Lungenkapazität | Dynamisch |

---

## 🔒 Privatsphäre & Datensicherheit

Alle Reisetagebuch-Einträge, erstellten Geschichten und Mikrofon-Signale verbleiben **vollständig lokal im Webbrowser** des Nutzers (`localStorage` bzw. flüchtiger AudioContext im Arbeitsspeicher). Es werden keinerlei Audioaufnahmen, Telemetriedaten oder persönliche Nutzerprofile an externe Server übertragen.

---

## ⚖️ Rechtlicher Hinweis & Disclaimer (MDCG 2019-11)

*Tika – Die atmende Schildkröte* ist ein interaktives Open-Source-Achtsamkeits-, Pacing- und Entspannungswerkzeug zur Förderung des subjektiven Wohlbefindens.

- **Kein Medizinprodukt:** Tika ist **kein** Medizinprodukt im Sinne der europäischen Medizinprodukte-Verordnung (EU-MDR 2017/745, Regel 11) und des Leitfadens MDCG 2019-11.
- **Keine Diagnostik oder Therapie:** Die Software dient weder der Diagnose, Überwachung, Linderung noch der Heilung oder Behandlung von Erkrankungen (wie z. B. klinischer Panikstörung ICD-10 F41.0, generalisierter Angststörung F41.1 oder Asthma).
- **Kein Ersatz für medizinische Hilfe:** Die Nutzung ersetzt keinesfalls eine ärztliche, psychotherapeutische oder psychiatrische Behandlung. Bei akuter Atemnot oder Panikattacken ist sofort qualifiziertes Fachpersonal aufzusuchen.

---

## 📚 Wissenschaftliche Quellen & Physiologische Fundierung

1. **Herzratenvariabilitäts-Biofeedback (HRVB):**  
   *Lehrer, P., Kaur, K., Sharma, A., et al. (2020).* Heart rate variability biofeedback: how and why does it work? *Neuroscience & Biobehavioral Reviews / Frontiers in Psychology*, PMID: [32389728](https://pubmed.ncbi.nlm.nih.gov/32389728/). (Große bis mittlere Effektstärken $g \approx 0{,}73 - 0{,}83$ bei Angst & Depression).
2. **0,1-Hz-Baroreflex-Resonanz (Mayer-Wellen):**  
   *Vaschillo, E. G., Vaschillo, B., & Lehrer, P. M. (2006).* Characteristics of resonance in heart rate variability stimulated by biofeedback. *Applied Psychophysiology and Biofeedback*, PMID: [16843467](https://pubmed.ncbi.nlm.nih.gov/16843467/).
3. **Interozeption & Alexithymie bei Neurodivergenz:**  
   *Garfinkel, S. N., Critchley, H. D., et al. (2015).* Interoceptive dimensions: sensory processing, alexithymia and anxiety in autism spectrum conditions. *Philosophical Transactions of the Royal Society B*, PMID: [25547432](https://pubmed.ncbi.nlm.nih.gov/25547432/).
4. **Suffocation False Alarm Theory:**  
   *Klein, D. F. (1993).* False suffocation alarms, spontaneous panics, and related conditions: An integrative hypothesis. *Archives of General Psychiatry*, PMID: [8489323](https://pubmed.ncbi.nlm.nih.gov/8489323/).
5. **Slow Breathing Systematic Review:**  
   *Zaccaro, A., et al. (2018).* How Breath-Control Can Change Your Life: A Systematic Review on Psycho-Physiological Correlates of Slow Breathing. *Frontiers in Human Neuroscience*, PMC: [PMC6137615](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6137615/).

---

## 📜 Lizenz

Veröffentlicht unter der [MIT-Lizenz](LICENSE).  
Entwickelt von **Felix Zeller** (Berlin, 2026).
