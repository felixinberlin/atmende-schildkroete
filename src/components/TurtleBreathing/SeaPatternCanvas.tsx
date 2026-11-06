import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CUE_TRAIL_COLORS,
  SEA_PATTERN_STYLES,
  addSavedBreathJourney,
  buildTimeline,
  computeSeaPatternPoint,
  renderBreathJourneySvg,
  sampleTimeline,
  type BreathingSession,
  type CueKey,
  type SavedBreathJourney,
  type SavedPearl,
  type SavedTrailSegment,
  type SeaPatternStyle
} from '../../breathing';

export interface SeaPatternCanvasProps {
  session: BreathingSession | null;
  patternStyle?: SeaPatternStyle;
  onPatternStyleChange?: (style: SeaPatternStyle) => void;
  showStyleSelector?: boolean;
  islandName?: string;
  islandId?: string;
  onOpenJournal?: () => void;
}

export function SeaPatternCanvas({
  session,
  patternStyle = 'auto',
  onPatternStyleChange,
  showStyleSelector = true,
  islandName,
  islandId,
  onOpenJournal
}: SeaPatternCanvasProps) {
  const pathGroupRef = useRef<SVGGElement>(null);
  const pearlsGroupRef = useRef<SVGGElement>(null);
  const tikaMarkerRef = useRef<SVGGElement>(null);
  const cycleCountRef = useRef<HTMLSpanElement>(null);

  const [clearToken, setClearToken] = useState(0);
  const activePattern = session?.pattern;

  // Stored segments & pearls for saving to the breath journal
  const segmentsRef = useRef<SavedTrailSegment[]>([]);
  const pearlsRef = useRef<SavedPearl[]>([]);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const maxCycleRef = useRef<number>(0);

  // Save dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [reflectionText, setReflectionText] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Precompute a faint 8-cycle guide silhouette so the user can see the harmonic geometry in the water
  const guidePathD = useMemo(() => {
    if (!activePattern) return '';
    const timeline = buildTimeline(activePattern);
    const totalCycles = 8;
    const steps = 320;
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const elapsed = (i / steps) * totalCycles * timeline.cycleMs;
      const sample = sampleTimeline(timeline, elapsed);
      const pt = computeSeaPatternPoint(sample, patternStyle);
      pts.push(`${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`);
    }
    return pts.join(' ');
  }, [activePattern, patternStyle]);

  useEffect(() => {
    if (!session) return;
    const pathGroup = pathGroupRef.current;
    const pearlsGroup = pearlsGroupRef.current;
    const tikaMarker = tikaMarkerRef.current;
    if (!pathGroup || !pearlsGroup || !tikaMarker) return;

    // Reset DOM trail layers
    pathGroup.innerHTML = '';
    pearlsGroup.innerHTML = '';
    segmentsRef.current = [];
    pearlsRef.current = [];
    sessionStartTimeRef.current = Date.now();
    maxCycleRef.current = 0;

    const segments: SavedTrailSegment[] = [];
    const pearls: SavedPearl[] = [];
    let currentPoly: SVGPolylineElement | null = null;
    let lastPt: { x: number; y: number } | null = null;
    let lastCue: CueKey | null = null;
    let lastPearlCycle = -1;

    const renderSample = () => {
      const s = session.sample();
      const pt = computeSeaPatternPoint(s, patternStyle);
      if (pt.cycle > maxCycleRef.current) maxCycleRef.current = pt.cycle;

      // Move and rotate Tika along the tangent of the breath trail
      const scale = (0.92 + 0.16 * pt.volume).toFixed(3);
      tikaMarker.setAttribute(
        'transform',
        `translate(${pt.x.toFixed(1)}, ${pt.y.toFixed(1)}) rotate(${pt.headingDeg.toFixed(1)}) scale(${scale})`
      );

      if (cycleCountRef.current) {
        cycleCountRef.current.textContent = `Atemzug #${pt.cycle + 1}`;
      }

      // Drop a glowing pearl at the start of holdIn or peak of inhale once per cycle
      if ((pt.cue === 'holdIn' || (pt.cue === 'exhale' && lastCue === 'inhale')) && pt.cycle !== lastPearlCycle) {
        lastPearlCycle = pt.cycle;
        const pearl = { x: pt.x, y: pt.y, cycle: pt.cycle };
        pearls.push(pearl);
        pearlsRef.current = pearls;
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', pt.x.toFixed(1));
        circle.setAttribute('cy', pt.y.toFixed(1));
        circle.setAttribute('r', '5');
        circle.setAttribute('fill', '#fde047');
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '1.5');
        circle.setAttribute('opacity', '0.9');
        pearlsGroup.appendChild(circle);
      }

      const dist = lastPt ? Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y) : 999;
      if (dist < 1.5 && pt.cue === lastCue) return;

      if (pt.cue !== lastCue || !currentPoly) {
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        const color = CUE_TRAIL_COLORS[pt.cue] ?? '#5eead4';
        poly.setAttribute('fill', 'none');
        poly.setAttribute('stroke', color);
        poly.setAttribute('stroke-width', pt.cue === 'holdIn' ? '4.5' : '3.2');
        poly.setAttribute('stroke-linecap', 'round');
        poly.setAttribute('stroke-linejoin', 'round');
        if (pt.cue === 'holdOut') {
          poly.setAttribute('stroke-dasharray', '4 5');
        }
        const initialPoints: Array<{ x: number; y: number }> = [];
        if (lastPt && dist < 45) {
          initialPoints.push(lastPt);
        }
        initialPoints.push({ x: pt.x, y: pt.y });
        poly.setAttribute('points', initialPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
        pathGroup.appendChild(poly);
        segments.push({ cue: pt.cue, points: initialPoints });
        segmentsRef.current = segments;
        currentPoly = poly;
        lastCue = pt.cue;
      } else {
        const seg = segments[segments.length - 1];
        seg.points.push({ x: pt.x, y: pt.y });
        currentPoly.setAttribute('points', seg.points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
      }

      lastPt = { x: pt.x, y: pt.y };
    };

    renderSample();
    const offTick = session.on('tick', renderSample);
    return () => {
      offTick();
    };
  }, [session, activePattern, patternStyle, clearToken]);

  function buildJourneyObject(): SavedBreathJourney {
    const patternTitle = activePattern?.shortName ?? activePattern?.name ?? 'Atemübung';
    const title =
      saveTitle.trim() || (islandName ? `Atem-Reise an der ${islandName}` : `Meeresmuster · ${patternTitle}`);
    const durationSec = Math.max(1, (Date.now() - sessionStartTimeRef.current) / 1000);
    return {
      id: `journey-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      title,
      islandId,
      islandName,
      patternId: activePattern?.id ?? 'ocean',
      patternName: activePattern?.name ?? 'Atemübung',
      patternStyle,
      completedCycles: Math.max(1, maxCycleRef.current + 1),
      durationSec,
      reflection: reflectionText.trim() || undefined,
      segments: structuredClone(segmentsRef.current),
      pearls: structuredClone(pearlsRef.current)
    };
  }

  function handleSaveToJournal() {
    const journey = buildJourneyObject();
    addSavedBreathJourney(journey);
    setShowSaveDialog(false);
    setToastMessage('✓ Im Reisetagebuch gespeichert!');
    setTimeout(() => setToastMessage(''), 3500);
  }

  function handleDownloadSvg() {
    const journey = buildJourneyObject();
    const svgText = renderBreathJourneySvg(journey);
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = journey.title.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
    a.download = `tika-meeresmuster-${safeTitle}-${new Date().toISOString().slice(0, 10)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    setToastMessage('✓ Meeresmuster-SVG heruntergeladen!');
    setTimeout(() => setToastMessage(''), 3500);
  }

  return (
    <div className="sea-pattern-wrapper">
      <div className="sea-pattern-HudBar">
        <span className="sea-pattern-cycle" ref={cycleCountRef}>
          Atemzug #1
        </span>
        <div className="sea-pattern-legend" aria-label="Farblegende der Atemphasen">
          <span className="legend-dot inhale">● Einatmen</span>
          <span className="legend-dot hold">● Halten</span>
          <span className="legend-dot exhale">● Ausatmen</span>
          <span className="legend-dot rest">● Ruhe</span>
        </div>
        <div className="sea-pattern-action-buttons">
          <button
            type="button"
            className="btn-pill highlight"
            onClick={() => {
              const defaultName = islandName
                ? `Atem-Reise an der ${islandName}`
                : `Meeresmuster · ${activePattern?.shortName ?? 'Ruhe'}`;
              setSaveTitle(defaultName);
              setShowSaveDialog(true);
            }}
            title="Dieses gezeichnete Meeresmuster im Reisetagebuch sichern"
          >
            ✨ Reise speichern
          </button>
          <button
            type="button"
            className="btn-pill"
            onClick={handleDownloadSvg}
            title="Als Bild (SVG) herunterladen"
          >
            📥 SVG Bild
          </button>
          {onOpenJournal && (
            <button
              type="button"
              className="btn-pill"
              onClick={onOpenJournal}
              title="Alle gespeicherten Atem-Reisen ansehen"
            >
              🐚 Tagebuch
            </button>
          )}
          <button
            type="button"
            className="btn-pill"
            onClick={() => setClearToken(n => n + 1)}
            title="Gezeichnete Spur im Meer zurücksetzen"
          >
            ↺ Leeren
          </button>
        </div>
      </div>

      {toastMessage && <div className="sea-pattern-toast">{toastMessage}</div>}

      {/* Save Dialog Overlay */}
      {showSaveDialog && (
        <div className="sea-save-dialog-backdrop">
          <div className="sea-save-dialog">
            <h3>✨ Atem-Reise im Tagebuch festhalten</h3>
            <p className="muted">
              Speichere dieses gezeichnete Meeresmuster lokal in deiner persönlichen Sammlung.
            </p>
            <label>
              Titel der Reise
              <input
                value={saveTitle}
                placeholder="z. B. Ruhe-Atem an der Wellen-Bucht"
                onChange={e => setSaveTitle(e.target.value)}
              />
            </label>
            <label>
              Wie ging es dir dabei? (optional)
              <textarea
                rows={2}
                value={reflectionText}
                placeholder="Ein kleiner Gedanke für dich …"
                onChange={e => setReflectionText(e.target.value)}
              />
            </label>
            <div className="reflection-chips">
              {['Ruhiger geworden', 'Suchtdruck abgeflacht', 'Kopf frei', 'Geborgen', 'Kraft geschöpft'].map(chip => (
                <button
                  type="button"
                  key={chip}
                  className="chip-btn"
                  onClick={() => setReflectionText(prev => (prev ? `${prev} · ${chip}` : chip))}
                >
                  +{chip}
                </button>
              ))}
            </div>
            <div className="sea-save-dialog-actions">
              <button type="button" className="quiet" onClick={() => setShowSaveDialog(false)}>
                Abbrechen
              </button>
              <button type="button" className="primary" onClick={handleSaveToJournal}>
                Im Tagebuch speichern
              </button>
            </div>
          </div>
        </div>
      )}

      <svg
        viewBox="0 0 800 600"
        className="sea-pattern-svg"
        role="img"
        aria-label="Tika zeichnet mit jedem Atemzug ein Muster ins Meer"
      >
        <defs>
          <radialGradient id="sea-muster-bg" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#0d354c" />
            <stop offset="65%" stopColor="#072233" />
            <stop offset="100%" stopColor="#041520" />
          </radialGradient>
          <filter id="sea-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Deep Ocean Canvas */}
        <rect width="800" height="600" rx="18" fill="url(#sea-muster-bg)" />

        {/* Subtle Concentric Harmonic Rings */}
        <g stroke="#1b4d6b" strokeWidth="1" fill="none" opacity="0.3">
          <circle cx="400" cy="300" r="85" strokeDasharray="4 6" />
          <circle cx="400" cy="300" r="155" strokeDasharray="4 6" />
          <circle cx="400" cy="300" r="220" strokeDasharray="2 8" />
        </g>

        {/* Faint Geometric Guide Preview */}
        {guidePathD && (
          <path
            d={guidePathD}
            fill="none"
            stroke="#7dd3fc"
            strokeWidth="1.3"
            strokeDasharray="4 7"
            opacity="0.18"
          />
        )}

        {/* Live Bioluminescent Breath Trail */}
        <g ref={pathGroupRef} filter="url(#sea-glow)" />

        {/* Breath Hold Pearls */}
        <g ref={pearlsGroupRef} />

        {/* Swimming Tika Avatar (Top-Down Sea View) */}
        <g ref={tikaMarkerRef} transform="translate(400, 300)">
          {/* Soft Water Ripple around Tika */}
          <circle cx="0" cy="0" r="24" fill="#5eead4" opacity="0.14" />
          {/* Flippers */}
          <path
            d="M 4 -12 C 12 -24, 20 -22, 16 -10 Z"
            fill="#10b981"
            stroke="#047857"
            strokeWidth="1.2"
          />
          <path
            d="M 4 12 C 12 24, 20 22, 16 10 Z"
            fill="#10b981"
            stroke="#047857"
            strokeWidth="1.2"
          />
          <path
            d="M -12 -9 C -20 -16, -24 -12, -17 -5 Z"
            fill="#059669"
          />
          <path
            d="M -12 9 C -20 16, -24 12, -17 5 Z"
            fill="#059669"
          />
          {/* Head */}
          <ellipse cx="18" cy="0" rx="7" ry="5.5" fill="#34d399" stroke="#065f46" strokeWidth="1.2" />
          <circle cx="21" cy="-2" r="1.2" fill="#0f172a" />
          <circle cx="21" cy="2" r="1.2" fill="#0f172a" />
          {/* Carapace (Shell) */}
          <ellipse cx="0" cy="0" rx="15" ry="12.5" fill="#065f46" stroke="#fde047" strokeWidth="2" />
          <polygon points="-6,0 0,-6 6,0 0,6" fill="#10b981" opacity="0.85" />
        </g>
      </svg>

      {showStyleSelector && onPatternStyleChange && (
        <div className="sea-pattern-controls">
          <label className="sea-style-label">
            <span>🌀 Meeresmuster-Form:</span>
            <select
              className="sound-select"
              value={patternStyle}
              onChange={e => onPatternStyleChange(e.target.value as SeaPatternStyle)}
            >
              {(Object.keys(SEA_PATTERN_STYLES) as SeaPatternStyle[]).map(key => (
                <option key={key} value={key}>
                  {SEA_PATTERN_STYLES[key].name}
                </option>
              ))}
            </select>
          </label>
          <small className="technique-desc">{SEA_PATTERN_STYLES[patternStyle].description}</small>
        </div>
      )}
    </div>
  );
}
