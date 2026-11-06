# 🏗️ Tika · Architektur-Dokumentation & Technische Referenz

Diese Dokumentation beschreibt die mathematischen Modelle, Architekturmuster und Schnittstellen der Respirations-Engine von **Tika**.

---

## 1. Das Kernparadigma: Reine parametrische Zeitabbildung

Im Gegensatz zu klassischen Animations-Engines, die mit festen Keyframe-Zuständen arbeiten, basiert Tika auf einer rein funktionalen, stetig differenzierbaren Abbildung von Zeit zu physiologischem Zustand:

$$\text{sample} = f(\text{timeline}, t_{\text{elapsed}})$$

### Timeline & Phasenberechnung (`src/breathing/core/timeline.ts`)

Ein Atemmuster ($\mathcal{P}$) besteht aus einer Sequenz von $N$ Phasen mit jeweiligen Dauern $d_i$:

$$T_{\text{cycle}} = \sum_{i=1}^N d_i$$

Für einen beliebigen Zeitstempel $t$ berechnet die Engine:
1. Den Zyklusindex $C = \lfloor t / T_{\text{cycle}} \rfloor$
2. Die relative Position im Zyklus $u_{\text{cycle}} = (t \pmod{T_{\text{cycle}}}) / T_{\text{cycle}} \in [0, 1)$
3. Die aktive Phase $k$, die Phasendauer $d_k$ und den Phasenfortschritt $p \in [0, 1)$
4. Das Lungenvolumen $V(t) \in [0, 1]$, interpoliert mit kubischer Hermite-Spline- oder Sinus-Glättung (`easeInOutCubic` / `easeOutSine`):

$$V(p) = V_{\text{start}} + (V_{\text{target}} - V_{\text{start}}) \cdot \text{ease}(p)$$

Dadurch entstehen **weder bei Phasenübergängen noch bei Zykluswechseln Sprünge oder Unstetigkeiten**.

---

## 2. Mathematische Stetigkeit der Charakter-Rigs

### Tika the Turtle (`src/breathing/turtle/pose.ts`)
Tikas Bewegungsmodell steuert 12 anatomische Skelett-Pivots:
- **Flossenwinkel:** Vorderflossen rotieren harmonisch mit $V(t)$ und einer Phasenvoreilung für das Wasser-Gleiten.
- **Kraniale Extension (Hals & Kopf):** Beim Einatmen streckt sich Tikas Kopf sanft nach vorne oben ($+8\,\text{px}, -5^{\circ}$), um die Lungenexpansion zu unterstützen.
- **Panzer-Elevation:** Der Carapax hebt sich um $4\,\text{px}$, während das Plastron (Bauchseite) weich expandiert.
- **Buccalpumpe (Kehlsack):** Die Gularfalte moduliert das Schluckatmen (*buccal pumping*), wie es für Meeresschildkröten typisch ist.

### Menschlicher Atembegleiter (`src/breathing/human/pose.ts`)
- **Zwerchfellkuppel:** Modelliert als quadratische Bézierkurve $B(t)$, deren Apex sich bei Einatmung um $18\,\text{px}$ nach unten abflacht.
- **Rippenhebung:** Die Rippenpaare rotieren um die dorsale Wirbelsäulenachse um $-5^{\circ}$.
- **Flankendehnung:** Die Bauchwand expandiert horizontal um bis zu $14\,\text{px}$, während die Brustwand um bis zu $9\,\text{px}$ angehoben wird.
- **Luftstrom-Trajektorie:** Ein unsichtbarer SVG-Führungspfad (`airway`) bestimmt die Positionierung von Schwebepartikeln. Partikelsprünge treten ausschließlich bei Null-Opazität auf.

---

## 3. Parametrische Meeresmuster (`src/breathing/seaPattern.ts`)

Tika zeichnet während des Schwimmens ein kontinuierliches Meeresmuster. Für eine reelle Zeitkoordinate $u = C + u_{\text{cycle}}$ berechnet die Funktion:

$$(x, y) = g(u, V(t), \text{Stil})$$

Die Schwimmrichtung $\theta$ wird über den Vorwärtsdifferenzenquotienten bestimmt:

$$\theta = \text{atan2}(y(u + \Delta u) - y(u),\, x(u + \Delta u) - x(u))$$

### Geometrische Stile
1. **Gezeiten-Rosette (`rosette`):** Harmonische Epitrochoide mit 8 Blütenblättern und goldener Präzession ($2\pi / 7.5$).
2. **Kompass-Kristall (`box-crystal`):** Modulierte Superellipse mit vier Phasenachsen, die sich pro Zyklus um $20^{\circ}$ weiterdreht.
3. **Nautilus-Spirale (`nautilus`):** Archimedisch-logarithmische Ozeanspirale mit sanft atmender Weitung.
4. **Kelp-Blüte (`lotus-three`):** Drei-Oberwellen-Modulation ($3\cdot 2\pi$), die Dirgas Dreistufenatmung visualisiert.
5. **Gleichklang-Acht (`harmony-eight`):** Präzedierende Lissajous-Lemniskate ($x = \sin(t),\, y = \sin(2t)$).
6. **Seestern-Kranz (`starburst`):** 5-strahliger Stern mit interlaced Ringdrehung.

---

## 4. Biofeedback: Mikrofon-Atemerkennung (`src/breathing/mic/BreathDetector.ts`)

Basierend auf der `@shiihaa/breath-detection`-Architektur:
1. **Signalerfassung:** Web Audio API `AnalyserNode` mit FFT-Größe 4096.
2. **Bandpass-Gewichtung:** Bandbegrenzung auf das Spektrum menschlicher Atemgeräusche ($150\,\text{Hz} - 2500\,\text{Hz}$).
3. **Kombiniertes Energiesignal:**
   $$E_{\text{raw}} = 0.7 \cdot E_{\text{freq}} + 0.3 \cdot \text{RMS}$$
4. **Spektralschwerpunkt (Spectral Centroid):**
   $$f_c = \frac{\sum f_i \cdot |X(f_i)|}{\sum |X(f_i)|}$$
   Turbulente Einatmung (Nase) erzeugt typischerweise höhere Schwerpunkte ($f_c \approx 900 - 1400\,\text{Hz}$) als laminare Ausatmung durch leicht geöffnete Lippen ($f_c \approx 350 - 600\,\text{Hz}$).
5. **Adaptive Schwellenwert-Zustandsmaschine:** Wechselt rauschresistent zwischen den Zuständen `idle` $\rightarrow$ `active1` (Einatmung) $\rightarrow$ `silent1` (Atempause) $\rightarrow$ `active2` (Ausatmung) $\rightarrow$ `silent2` (Ruhe).
6. **Adapter:** Über `createBreathSampleAdapter()` transformiert der Detektor das Mikrofonsignal in einen standardisierten `BreathSample`-Strom, der Tika und den menschlichen Guide synchron ansteuert.

---

## 5. Prozedurale Klangsynthese (`src/breathing/audio/synth.ts`)

Um ohne externe Audiodateien und netzwerkunabhängig zu funktionieren, verfügt die AudioEngine über vollwertige Web-Audio-Synthesizer:
- **Meeresrauschen:** Paul Kellet's Pink-Noise-Filter mit zeitvariablen Biquad-Bandpassfiltern und Resonanzgüte $Q = 1.9 - 2.2$.
- **Sub-Bass-Ozeanbrandung:** Sinusoszillator ($55\,\text{Hz} \rightarrow 85\,\text{Hz}$ Sweep) mit exponentiellen Hüllkurven.
- **Tibetische Klangschale:** Mehrstimmige Oszillatoren ($216\,\text{Hz}$ Grundton und $434.16\,\text{Hz}$ Oberton) mit natürlichem Ausschwingen.
- **Blasenaufstieg:** Stochastisch verteilte Mini-Sweeps ($420 - 870\,\text{Hz}$) bei Ausatmung.

---

## 6. Autarkie & Portabilität

Die Engine benötigt zur Ausführung im Web-Player keinerlei Frameworks (weder React noch Node).
Durch das UMD-Build-Target (`TurtleBreathing`) kann sie wie folgt eingebunden werden:

```html
<script src="turtle_breathing_engine.js"></script>
<script>
  const { createTurtleSession, findPattern } = window.TurtleBreathing;
  const session = createTurtleSession({
    container: document.getElementById('my-turtle-container'),
    pattern: findPattern('ocean')
  });
  session.start();
</script>
```

---

## 7. Neurokardiovaskuläre & Regulatorische Spezifikation

### 7.1 Baroreflex-Resonanz ($0{,}1\,\text{Hz}$ / Mayer-Wellen)
Das menschliche kardiovaskuläre System besitzt eine phasische Eigenresonanz bei circa $0{,}1\,\text{Hz}$ ($\approx 6\,\text{Atemzüge/Minute}$), bedingt durch die Latenzzeit der Barorezeptor-Rückkopplungsschleife zwischen Aortenbogen und Hirnstamm (Vaschillo et al., 2006).

Tikas Atemmuster *Herz-Kohärenz* (`coherence`) arbeitet mit exakt:
$$f_{\text{resp}} = \frac{1}{5{,}5\,\text{s} + 5{,}5\,\text{s}} = \frac{1}{11\,\text{s}} \approx 0{,}091\,\text{Hz}$$
Dies synchronisiert die Herzratenvariabilität (RSA) phasengenau mit den Mayer-Wellen des Blutdrucks und maximiert die vagale efferente Stimulation, ohne den Anwender durch willkürliche Valsalva-Atemanhaltephasen zu belasten.

### 7.2 Hysteretischer Schmitt-Trigger gegen Prellen (*State Fluttering*)
In der On-Device-Signalverarbeitung wird das Umschalten zwischen Ruhe (`idle`) und aktiver Atemphasenerkennung durch einen Hysterese-Schwellenwert abgesichert:
$$\text{Schaltgrenze Ein/Aus} = N_t + \Delta_{\text{high}}, \quad \text{Rückfallgrenze Pause} = N_t + \Delta_{\text{low}}$$
mit $\Delta_{\text{high}} - \Delta_{\text{low}} \ge 6\,\text{dB}$. Der adaptive Rauschboden $N_t$ wird über gleitende Minimum-Statistik berechnet.

### 7.3 MDR Regel 11 / MDCG 2019-11 Konformität
Zur Wahrung des freien Open-Source-Status operiert Tika strikt als Achtsamkeits- und Entspannungswerkzeug:
1. **Keine diagnostischen Vitalwert-Bewertungen:** Reines Rendering von Bewegung und Schall.
2. **Keine therapeutischen Dosierungsalgorithmen:** Der Nutzer wählt selbstbestimmt Rhythmus und Dauer.
3. **Vollständige Entkopplung von medizinischen Indikationen:** Tika erhebt keine Ansprüche nach Art. 2 Nr. 1 MDR.

