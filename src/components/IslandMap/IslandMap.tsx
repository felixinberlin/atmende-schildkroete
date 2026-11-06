import React, { useEffect, useState } from 'react';
import { BUILTIN_PATTERNS, findPattern } from '../../breathing';
import {
  LANDMARK_LABELS,
  SEA_MOOD_LABELS,
  createIslandStoryTemplate,
  createJourneyStoryTemplate,
  findJourneyBetween,
  type Archipelago,
  type ContentStatus,
  type Island,
  type IslandLandmark,
  type SeaJourney,
  type SeaMood
} from '../../islands';

export interface IslandMapProps {
  archipelago: Archipelago;
  onChange: (updater: (prev: Archipelago) => Archipelago) => void;
  onOpenInEditor: (target: { scope: 'island'; id: string } | { scope: 'journey'; id: string }) => void;
  onPlayStory: (title: string, subtitle: string, story: Island['story'], defaultPatternId: string, onComplete?: () => void) => void;
  onPracticeBreathing: (island: Island) => void;
  onOpenSeaPattern?: (island: Island) => void;
  onOpenVoyage?: () => void;
  onOpenJournal?: () => void;
  onResetArchipelago: () => void;
  issues: string[];
}

interface TravelAnimation {
  fromId: string;
  toId: string;
  journey?: SeaJourney;
  progress: number;
}

/** Computes a curved quadratic Bezier path between two islands so routes look like natural ocean currents. */
function computeRouteGeometry(from: { x: number; y: number }, to: { x: number; y: number }) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const offset = Math.min(55, len * 0.16);
  // Consistent perpendicular curve offset
  const sign = from.x <= to.x ? -1 : 1;
  const cx = mx + (-dy / len) * offset * sign;
  const cy = my + (dx / len) * offset * sign;
  const path = `M ${from.x} ${from.y} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${to.x} ${to.y}`;

  const pointAt = (t: number) => {
    const u = 1 - t;
    return {
      x: u * u * from.x + 2 * u * t * cx + t * t * to.x,
      y: u * u * from.y + 2 * u * t * cy + t * t * to.y
    };
  };

  const mid = pointAt(0.5);
  return { path, cx, cy, mid, pointAt };
}

function LandmarkGraphic({ landmark }: { landmark: IslandLandmark }) {
  switch (landmark) {
    case 'wave':
      return (
        <g stroke="#0f766e" strokeWidth="2.2" fill="none" strokeLinecap="round">
          <path d="M -16 4 C -10 -6, -2 -6, 4 2 C 9 8, 15 4, 18 -2" />
          <path d="M -14 11 C -6 5, 4 5, 14 11" opacity="0.7" />
        </g>
      );
    case 'compass':
      return (
        <g>
          <rect x="-11" y="-11" width="22" height="22" rx="4" fill="#0284c7" opacity="0.2" stroke="#0369a1" strokeWidth="2" />
          <polygon points="0,-13 4,-3 13,0 4,3 0,13 -4,3 -13,0 -4,-3" fill="#0284c7" />
          <circle cx="0" cy="0" r="2.5" fill="#fef08a" />
        </g>
      );
    case 'moon':
      return (
        <path
          d="M 4 -12 A 12 12 0 1 0 14 6 A 9.5 9.5 0 1 1 4 -12 Z"
          fill="#6366f1"
          stroke="#4338ca"
          strokeWidth="1.5"
        />
      );
    case 'kelp':
      return (
        <g stroke="#059669" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <path d="M -7 12 C -11 4, -3 -4, -7 -12" />
          <path d="M 1 13 C 5 4, -3 -4, 2 -14" />
          <path d="M 9 12 C 5 5, 12 -2, 8 -10" />
        </g>
      );
    case 'coral':
      return (
        <g stroke="#db2777" strokeWidth="2.4" fill="none" strokeLinecap="round">
          <path d="M 0 12 L 0 -10 M 0 2 L -10 -6 M 0 -2 L 10 -9 M -5 -2 L -5 -11" />
          <circle cx="0" cy="-11" r="2" fill="#f472b6" stroke="none" />
          <circle cx="-10" cy="-7" r="2" fill="#f472b6" stroke="none" />
          <circle cx="10" cy="-10" r="2" fill="#f472b6" stroke="none" />
        </g>
      );
    case 'star':
      return (
        <polygon
          points="0,-14 4,-4 14,-4 6,3 9,13 0,7 -9,13 -6,3 -14,-4 -4,-4"
          fill="#f59e0b"
          stroke="#b45309"
          strokeWidth="1.5"
        />
      );
    case 'shell':
      return (
        <g fill="#fb923c" fillOpacity="0.25" stroke="#c2410c" strokeWidth="1.8">
          <path d="M -12 6 C -14 -8, 14 -8, 12 6 Z" />
          <path d="M 0 6 L -7 -4 M 0 6 L 0 -6 M 0 6 L 7 -4" />
        </g>
      );
  }
}

export function IslandMap({
  archipelago,
  onChange,
  onOpenInEditor,
  onPlayStory,
  onPracticeBreathing,
  onOpenSeaPattern,
  onOpenVoyage,
  onOpenJournal,
  onResetArchipelago,
  issues
}: IslandMapProps) {
  const [selectedIslandId, setSelectedIslandId] = useState<string | null>(archipelago.currentIslandId);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [travel, setTravel] = useState<TravelAnimation | null>(null);
  const [newRouteTargetId, setNewRouteTargetId] = useState<string>('');

  const currentIsland = archipelago.islands.find(i => i.id === archipelago.currentIslandId) ?? archipelago.islands[0];
  const selectedIsland = archipelago.islands.find(i => i.id === selectedIslandId) ?? null;
  const selectedJourney = archipelago.journeys.find(j => j.id === selectedJourneyId) ?? null;

  // Animate Tika swimming along the route
  useEffect(() => {
    if (!travel) return;
    let frameId = 0;
    const start = performance.now();
    const duration = 950;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 0.5 - Math.cos(p * Math.PI) / 2;
      setTravel(prev => (prev ? { ...prev, progress: eased } : null));
      if (p < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        const destIsland = archipelago.islands.find(i => i.id === travel.toId);
        const activeJourney = travel.journey;
        onChange(prev => ({
          ...prev,
          currentIslandId: travel.toId,
          visitedIslandIds: prev.visitedIslandIds.includes(travel.toId)
            ? prev.visitedIslandIds
            : [...prev.visitedIslandIds, travel.toId],
          completedJourneyIds:
            activeJourney && !prev.completedJourneyIds.includes(activeJourney.id)
              ? [...prev.completedJourneyIds, activeJourney.id]
              : prev.completedJourneyIds
        }));
        setTravel(null);
        setSelectedIslandId(travel.toId);
        setSelectedJourneyId(null);
        if (activeJourney && destIsland) {
          onPlayStory(
            `Überfahrt: ${activeJourney.title}`,
            `Reise nach ${destIsland.name}`,
            activeJourney.story,
            destIsland.patternId
          );
        }
      }
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [travel?.fromId, travel?.toId]);

  function startTravelTo(targetIsland: Island, explicitJourney?: SeaJourney) {
    if (targetIsland.id === currentIsland.id && !explicitJourney) {
      onPlayStory(targetIsland.name, targetIsland.subtitle, targetIsland.story, targetIsland.patternId);
      return;
    }
    const fromId = explicitJourney ? explicitJourney.from : currentIsland.id;
    const toId = explicitJourney
      ? explicitJourney.from === currentIsland.id
        ? explicitJourney.to
        : explicitJourney.to === currentIsland.id
          ? explicitJourney.from
          : explicitJourney.to
      : targetIsland.id;
    const journey = explicitJourney ?? findJourneyBetween(archipelago, fromId, toId);
    if (fromId !== archipelago.currentIslandId) {
      onChange(prev => ({ ...prev, currentIslandId: fromId }));
    }
    setTravel({ fromId, toId, journey, progress: 0 });
  }

  function updateIsland(id: string, patch: Partial<Island>) {
    onChange(prev => ({
      ...prev,
      islands: prev.islands.map(island => (island.id === id ? { ...island, ...patch } : island))
    }));
  }

  function updateJourney(id: string, patch: Partial<SeaJourney>) {
    onChange(prev => ({
      ...prev,
      journeys: prev.journeys.map(journey => (journey.id === id ? { ...journey, ...patch } : journey))
    }));
  }

  function addIsland() {
    const index = archipelago.islands.length + 1;
    const id = `insel-${crypto.randomUUID().slice(0, 6)}`;
    const defaultPattern = BUILTIN_PATTERNS[index % BUILTIN_PATTERNS.length] ?? BUILTIN_PATTERNS[0];
    const name = `Neue Insel ${index}`;
    const subtitle = `${defaultPattern.shortName ?? defaultPattern.name}`;
    const newIsland: Island = {
      id,
      name,
      subtitle,
      description: 'Beschreibe hier die Stimmung dieser Insel und wie ihre Atemtechnik Tika unterstützt.',
      patternId: defaultPattern.id,
      position: {
        x: Math.min(900, Math.max(100, 200 + ((index * 165) % 680))),
        y: Math.min(510, Math.max(110, 140 + ((index * 135) % 360)))
      },
      landmark: 'shell',
      accentColor: '#38bdf8',
      status: 'template',
      story: createIslandStoryTemplate(name, defaultPattern.id, subtitle)
    };
    const autoJourney: SeaJourney = {
      id: `reise-${currentIsland.id}-${id}`,
      from: currentIsland.id,
      to: id,
      title: `Überfahrt nach ${name}`,
      summary: `Ein neuer Seeweg von ${currentIsland.name} nach ${name}.`,
      seaMood: 'calm-current',
      status: 'template',
      story: createJourneyStoryTemplate(`Überfahrt nach ${name}`, currentIsland.name, name, defaultPattern.id)
    };
    onChange(prev => ({
      ...prev,
      islands: [...prev.islands, newIsland],
      journeys: [...prev.journeys, autoJourney]
    }));
    setSelectedIslandId(id);
    setSelectedJourneyId(null);
  }

  function addJourneyBetween(fromId: string, toId: string) {
    if (!fromId || !toId || fromId === toId) return;
    const existing = findJourneyBetween(archipelago, fromId, toId);
    if (existing) {
      setSelectedJourneyId(existing.id);
      setSelectedIslandId(null);
      return;
    }
    const fromIsland = archipelago.islands.find(i => i.id === fromId);
    const toIsland = archipelago.islands.find(i => i.id === toId);
    if (!fromIsland || !toIsland) return;
    const id = `reise-${crypto.randomUUID().slice(0, 6)}`;
    const title = `Seeweg: ${fromIsland.name} ↔ ${toIsland.name}`;
    const newJourney: SeaJourney = {
      id,
      from: fromId,
      to: toId,
      title,
      summary: `Unterwegs zwischen ${fromIsland.name} und ${toIsland.name}.`,
      seaMood: 'calm-current',
      status: 'template',
      story: createJourneyStoryTemplate(title, fromIsland.name, toIsland.name, toIsland.patternId)
    };
    onChange(prev => ({
      ...prev,
      journeys: [...prev.journeys, newJourney]
    }));
    setSelectedJourneyId(id);
    setSelectedIslandId(null);
  }

  function removeSelectedIsland() {
    if (!selectedIsland || archipelago.islands.length <= 1) return;
    const remaining = archipelago.islands.filter(i => i.id !== selectedIsland.id);
    onChange(prev => ({
      ...prev,
      currentIslandId: prev.currentIslandId === selectedIsland.id ? remaining[0].id : prev.currentIslandId,
      visitedIslandIds: prev.visitedIslandIds.filter(id => id !== selectedIsland.id),
      islands: remaining,
      journeys: prev.journeys.filter(j => j.from !== selectedIsland.id && j.to !== selectedIsland.id)
    }));
    setSelectedIslandId(remaining[0].id);
  }

  function removeSelectedJourney() {
    if (!selectedJourney) return;
    onChange(prev => ({
      ...prev,
      completedJourneyIds: prev.completedJourneyIds.filter(id => id !== selectedJourney.id),
      journeys: prev.journeys.filter(j => j.id !== selectedJourney.id)
    }));
    setSelectedJourneyId(null);
    setSelectedIslandId(archipelago.currentIslandId);
  }

  // Compute Tika's current SVG position (either sitting at currentIsland or swimming along a route)
  const tikaPosition = (() => {
    if (travel) {
      const from = archipelago.islands.find(i => i.id === travel.fromId)?.position ?? currentIsland.position;
      const to = archipelago.islands.find(i => i.id === travel.toId)?.position ?? currentIsland.position;
      return computeRouteGeometry(from, to).pointAt(travel.progress);
    }
    return { x: currentIsland.position.x - 36, y: currentIsland.position.y + 24 };
  })();

  return (
    <div className="workspace map-workspace">
      {/* Left Sidebar: Islands & Journeys Directory */}
      <aside className="library">
        <div className="eyebrow">ARCHIPEL DER ATEMWEGE</div>
        <h2>
          Eine Schildkröte.
          <br />
          Viele Inseln.
        </h2>
        <p className="muted">
          Jede Insel birgt eine eigene Atemtechnik und eine kleine Geschichte. Auch die Überfahrten zwischen den Inseln erzählen eigene Begegnungen.
        </p>

        <div className="tika-status-box">
          <span className="tika-status-icon">🐢</span>
          <div>
            <strong>Tika ist auf: {currentIsland.name}</strong>
            <small>
              {archipelago.visitedIslandIds.length} von {archipelago.islands.length} Inseln besucht ·{' '}
              {archipelago.completedJourneyIds.length} Überfahrten
            </small>
          </div>
        </div>

        {onOpenVoyage && (
          <div className="spectator-card-promo">
            <div className="eyebrow" style={{ color: '#38bdf8' }}>ZUSCHAUER-MODUS</div>
            <h4>Tikas Weltreise 🔭</h4>
            <p className="muted" style={{ fontSize: '11.5px', margin: '4px 0 10px', lineHeight: 1.4 }}>
              Lehne dich zurück und schau Tika beim Schwimmen, Atmen und Entdecken zu – ganz ohne Stress.
            </p>
            <button
              type="button"
              className="btn-pill spectator-launch-btn"
              onClick={onOpenVoyage}
            >
              ▷ Weltreise starten
            </button>
          </div>
        )}

        <div className="section-label">INSELN ({archipelago.islands.length})</div>
        <div className="island-nav-list">
          {archipelago.islands.map(island => {
            const pattern = findPattern(island.patternId);
            const isCurrent = island.id === archipelago.currentIslandId;
            const isSelected = island.id === selectedIslandId && !selectedJourneyId;
            return (
              <button
                type="button"
                key={island.id}
                className={`library-item island-list-btn ${isSelected ? 'active-item' : ''}`}
                onClick={() => {
                  setSelectedIslandId(island.id);
                  setSelectedJourneyId(null);
                }}
              >
                <span className="kind-dot" style={{ background: island.accentColor }} />
                <span>
                  {island.name} {isCurrent && <strong title="Tika ist hier">🐢</strong>}
                  <small>
                    {pattern?.shortName ?? pattern?.name ?? island.patternId} ·{' '}
                    {island.status === 'example' ? '★ Beispiel' : '✎ Entwurf'}
                  </small>
                </span>
              </button>
            );
          })}
        </div>

        <div className="section-label">WEITERBAUEN</div>
        <button type="button" className="library-item" onClick={addIsland}>
          <span className="kind-dot" style={{ background: '#38bdf8' }} />
          <span>
            Neue Insel anlegen
            <small>Mit eigener Atemtechnik & Geschichte</small>
          </span>
          <b>+</b>
        </button>

        {onOpenJournal && (
          <button type="button" className="library-item" onClick={onOpenJournal}>
            <span className="kind-dot" style={{ background: '#fde047' }} />
            <span>
              🐚 Reisetagebuch
              <small>Deine gesammelten Meeresmuster</small>
            </span>
          </button>
        )}

        <button type="button" className="quiet" onClick={onResetArchipelago}>
          Beispiel-Inselwelt wiederherstellen
        </button>
      </aside>

      {/* Main Interactive Archipelago Map Canvas */}
      <main>
        <div className="canvas-heading">
          <div>
            <div className="eyebrow">INTERAKTIVE WEGKARTE · INSELN & ÜBERFAHRTEN</div>
            <h1>
              {archipelago.title} <span>🌊</span>
            </h1>
            <p>
              {archipelago.islands.length} Inseln <span>·</span> {archipelago.journeys.length} Meeresrouten{' '}
              <span>·</span> Klicke auf eine Insel oder Strömung
            </p>
          </div>
          <span className={`validity ${issues.length ? 'warning' : ''}`}>
            {issues.length ? `${issues.length} Hinweise` : '✓ Alle Insel- & Reise-Geschichten bereit'}
          </span>
        </div>

        <div className="canvas ocean-map-container">
          <svg
            viewBox="0 0 1000 600"
            className="archipelago-svg"
            role="region"
            aria-label="Inselkarte für Tika die Schildkröte"
          >
            <defs>
              <radialGradient id="map-ocean-bg" cx="50%" cy="45%" r="65%">
                <stop offset="0%" stopColor="#0f3d56" />
                <stop offset="60%" stopColor="#09293d" />
                <stop offset="100%" stopColor="#051a28" />
              </radialGradient>
              <radialGradient id="island-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#5eead4" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#5eead4" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Ocean Backdrop */}
            <rect width="1000" height="600" fill="url(#map-ocean-bg)" />

            {/* Subtle Ocean Wave Lines */}
            <g stroke="#1e4e68" strokeWidth="1.5" fill="none" opacity="0.45">
              <path d="M 60 95 Q 140 80 220 95 T 380 95" />
              <path d="M 520 75 Q 610 60 700 75 T 880 75" />
              <path d="M 90 525 Q 190 510 290 525 T 490 525" />
              <path d="M 580 540 Q 670 525 760 540 T 940 540" />
              <path d="M 210 280 Q 260 270 310 280" />
              <path d="M 520 300 Q 575 288 630 300" />
            </g>

            {/* Compass Rose Decoration */}
            <g transform="translate(925, 85)" opacity="0.55">
              <circle cx="0" cy="0" r="34" fill="#072235" stroke="#38bdf8" strokeWidth="1.2" />
              <polygon points="0,-28 5,-6 28,0 5,6 0,28 -5,6 -28,0 -5,-6" fill="#38bdf8" opacity="0.6" />
              <text x="0" y="-38" textAnchor="middle" fill="#bae6fd" fontSize="10" fontWeight="700">
                N
              </text>
            </g>

            {/* Sea Journey Routes (Island to Island) */}
            {archipelago.journeys.map(journey => {
              const fromIsland = archipelago.islands.find(i => i.id === journey.from);
              const toIsland = archipelago.islands.find(i => i.id === journey.to);
              if (!fromIsland || !toIsland) return null;
              const geom = computeRouteGeometry(fromIsland.position, toIsland.position);
              const isSelected = journey.id === selectedJourneyId;
              const isReachableFromCurrent =
                journey.from === archipelago.currentIslandId || journey.to === archipelago.currentIslandId;
              const isCompleted = archipelago.completedJourneyIds.includes(journey.id);

              return (
                <g
                  key={journey.id}
                  className={`map-journey-group ${isSelected ? 'selected' : ''}`}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedJourneyId(journey.id);
                    setSelectedIslandId(null);
                  }}
                >
                  {/* Wide invisible click target */}
                  <path d={geom.path} fill="none" stroke="transparent" strokeWidth="22" style={{ cursor: 'pointer' }} />
                  {/* Visible sea current path */}
                  <path
                    d={geom.path}
                    fill="none"
                    stroke={isSelected ? '#fde047' : isReachableFromCurrent ? '#5eead4' : isCompleted ? '#38bdf8' : '#3b6b88'}
                    strokeWidth={isSelected ? 4.5 : isReachableFromCurrent ? 3.2 : 2.2}
                    strokeDasharray={journey.status === 'template' ? '6 7' : '10 6'}
                    opacity={isSelected ? 1 : isReachableFromCurrent ? 0.9 : 0.65}
                  />
                  {/* Route Midpoint Badge */}
                  <g transform={`translate(${geom.mid.x}, ${geom.mid.y})`} style={{ cursor: 'pointer' }}>
                    <rect
                      x="-68"
                      y="-12"
                      width="136"
                      height="24"
                      rx="12"
                      fill={isSelected ? '#fde047' : '#08273a'}
                      stroke={isSelected ? '#ca8a04' : isReachableFromCurrent ? '#5eead4' : '#295773'}
                      strokeWidth="1.5"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight="600"
                      fill={isSelected ? '#1e293b' : '#cbd5e1'}
                    >
                      ⛵ {journey.title.length > 20 ? journey.title.slice(0, 19) + '…' : journey.title}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Islands */}
            {archipelago.islands.map(island => {
              const pattern = findPattern(island.patternId);
              const isCurrent = island.id === archipelago.currentIslandId;
              const isSelected = island.id === selectedIslandId && !selectedJourneyId;
              const isVisited = archipelago.visitedIslandIds.includes(island.id);

              return (
                <g
                  key={island.id}
                  className="map-island-node"
                  transform={`translate(${island.position.x}, ${island.position.y})`}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedIslandId(island.id);
                    setSelectedJourneyId(null);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Ambient Halo for Current / Visited Island */}
                  {(isCurrent || isSelected) && <circle cx="0" cy="0" r="68" fill="url(#island-glow)" />}

                  {/* Outer Ripple Ring */}
                  <circle
                    cx="0"
                    cy="0"
                    r={isSelected ? 52 : 46}
                    fill="none"
                    stroke={isSelected ? '#fde047' : isCurrent ? '#5eead4' : isVisited ? island.accentColor : '#2c5875'}
                    strokeWidth={isSelected ? 3 : 2}
                    strokeDasharray={isCurrent ? 'none' : '6 4'}
                  />

                  {/* Sandy Shore & Lush Island Base */}
                  <ellipse cx="0" cy="4" rx="40" ry="30" fill="#f3d59b" stroke="#d9b26f" strokeWidth="2" />
                  <ellipse cx="0" cy="0" rx="33" ry="23" fill="#d9f2e6" stroke={island.accentColor} strokeWidth="2.5" />

                  {/* Landmark Illustration */}
                  <LandmarkGraphic landmark={island.landmark} />

                  {/* Status Dot (Example vs Template) */}
                  <circle
                    cx="26"
                    cy="-18"
                    r="6"
                    fill={island.status === 'example' ? '#10b981' : '#f59e0b'}
                    stroke="#06202e"
                    strokeWidth="1.5"
                  >
                    <title>{island.status === 'example' ? 'Ausgearbeitete Beispiel-Geschichte' : 'Entwurf zum Ausbauen'}</title>
                  </circle>

                  {/* Island Title Label */}
                  <g transform="translate(0, 46)">
                    <rect
                      x="-78"
                      y="-13"
                      width="156"
                      height="38"
                      rx="10"
                      fill={isSelected ? '#fef9c3' : '#072235'}
                      stroke={isSelected ? '#eab308' : island.accentColor}
                      strokeWidth="1.5"
                    />
                    <text
                      x="0"
                      y="2"
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="700"
                      fill={isSelected ? '#1e293b' : '#f8fafc'}
                    >
                      {island.name}
                    </text>
                    <text
                      x="0"
                      y="17"
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight="600"
                      fill={isSelected ? '#854d0e' : '#7dd3fc'}
                    >
                      {pattern?.shortName ?? pattern?.name ?? island.patternId}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Tika the Turtle Marker on the Map */}
            <g
              className="map-tika-marker"
              transform={`translate(${tikaPosition.x}, ${tikaPosition.y})`}
              style={{ pointerEvents: 'none' }}
            >
              <circle cx="0" cy="0" r="22" fill="#064e3b" stroke="#5eead4" strokeWidth="2.5" />
              {/* Miniature SVG Tika */}
              <ellipse cx="-2" cy="1" rx="11" ry="8" fill="#10b981" stroke="#fde047" strokeWidth="1.5" />
              <circle cx="11" cy="-2" r="4.5" fill="#34d399" />
              <circle cx="12.5" cy="-3" r="1.2" fill="#0f172a" />
              <path d="M 3 -6 L 8 -12 M 3 8 L 8 13 M -9 -5 L -13 -10 M -9 7 L -13 11" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          </svg>
        </div>

        <footer aria-live="polite">
          <span>
            🐢 Tika ist auf <strong>{currentIsland.name}</strong>. Wähle eine Insel zum Reisen, Atmen oder Geschichten-Schreiben.
          </span>
          <span>Grüner Punkt = Beispiel-Geschichte · Gelber Punkt = Entwurf zum Weiterschreiben</span>
        </footer>
      </main>

      {/* Right Sidebar: Inspector for Selected Island or Sea Journey */}
      <aside className="inspector">
        <div className="eyebrow">INSEL- & REISE-DETAILS</div>

        {selectedIsland && !selectedJourney && (
          <>
            <h2>{selectedIsland.name}</h2>
            <p className="muted">{selectedIsland.description}</p>

            <div className="island-action-stack">
              {selectedIsland.id !== archipelago.currentIslandId ? (
                <button
                  type="button"
                  className="primary full-btn"
                  disabled={Boolean(travel)}
                  onClick={() => startTravelTo(selectedIsland)}
                >
                  🌊 Mit Tika nach {selectedIsland.name} schwimmen
                </button>
              ) : (
                <button
                  type="button"
                  className="primary full-btn"
                  onClick={() =>
                    onPlayStory(
                      selectedIsland.name,
                      selectedIsland.subtitle,
                      selectedIsland.story,
                      selectedIsland.patternId
                    )
                  }
                >
                  ▷ Insel-Geschichte & Atemübung starten
                </button>
              )}

              <button
                type="button"
                className="full-btn"
                onClick={() => onPracticeBreathing(selectedIsland)}
              >
                🧘 Nur Atemtechnik üben ({findPattern(selectedIsland.patternId)?.shortName ?? selectedIsland.patternId})
              </button>

              {onOpenSeaPattern && (
                <button
                  type="button"
                  className="full-btn"
                  onClick={() => onOpenSeaPattern(selectedIsland)}
                >
                  🌀 Meeresmuster im Atem-Takt zeichnen
                </button>
              )}

              <button
                type="button"
                className="full-btn"
                onClick={() => onOpenInEditor({ scope: 'island', id: selectedIsland.id })}
              >
                ✒️ Insel-Geschichte im Atelier bearbeiten ({selectedIsland.story.nodes.length} Bausteine)
              </button>
            </div>

            <div className="section-label">SEEWEGE VON DIESER INSEL</div>
            <div className="route-links-list">
              {archipelago.journeys
                .filter(j => j.from === selectedIsland.id || j.to === selectedIsland.id)
                .map(j => {
                  const otherId = j.from === selectedIsland.id ? j.to : j.from;
                  const other = archipelago.islands.find(i => i.id === otherId);
                  return (
                    <div key={j.id} className="route-chip-row">
                      <button
                        type="button"
                        className="route-chip-btn"
                        onClick={() => {
                          setSelectedJourneyId(j.id);
                          setSelectedIslandId(null);
                        }}
                      >
                        ⛵ <strong>{j.title}</strong>
                        <small>→ {other?.name ?? otherId}</small>
                      </button>
                      <button
                        type="button"
                        title="Überfahrt direkt starten"
                        onClick={() => other && startTravelTo(other, j)}
                      >
                        ▷
                      </button>
                    </div>
                  );
                })}

              {/* Connect to another island */}
              <div className="new-route-box">
                <select
                  aria-label="Zielinsel für neue Reiseroute"
                  value={newRouteTargetId}
                  onChange={e => setNewRouteTargetId(e.target.value)}
                >
                  <option value="">+ Neue Route verbinden mit …</option>
                  {archipelago.islands
                    .filter(i => i.id !== selectedIsland.id && !findJourneyBetween(archipelago, selectedIsland.id, i.id))
                    .map(i => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                </select>
                {newRouteTargetId && (
                  <button
                    type="button"
                    onClick={() => {
                      addJourneyBetween(selectedIsland.id, newRouteTargetId);
                      setNewRouteTargetId('');
                    }}
                  >
                    Route anlegen
                  </button>
                )}
              </div>
            </div>

            <div className="section-label">INSEL EINSTELLUNGEN</div>
            <label>
              Inselname
              <input
                value={selectedIsland.name}
                onChange={e => updateIsland(selectedIsland.id, { name: e.target.value })}
              />
            </label>
            <label>
              Atemtechnik der Insel
              <select
                value={selectedIsland.patternId}
                onChange={e => {
                  const nextPatternId = e.target.value;
                  const pat = findPattern(nextPatternId);
                  updateIsland(selectedIsland.id, {
                    patternId: nextPatternId,
                    subtitle: pat ? `${pat.shortName ?? pat.name}` : selectedIsland.subtitle
                  });
                }}
              >
                {BUILTIN_PATTERNS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Untertitel
              <input
                value={selectedIsland.subtitle}
                onChange={e => updateIsland(selectedIsland.id, { subtitle: e.target.value })}
              />
            </label>
            <label>
              Wahrzeichen auf der Karte
              <select
                value={selectedIsland.landmark}
                onChange={e => updateIsland(selectedIsland.id, { landmark: e.target.value as IslandLandmark })}
              >
                {Object.entries(LANDMARK_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select
                value={selectedIsland.status}
                onChange={e => updateIsland(selectedIsland.id, { status: e.target.value as ContentStatus })}
              >
                <option value="example">★ Ausgearbeitetes Beispiel</option>
                <option value="template">✎ Entwurf / Zum Weiterschreiben</option>
              </select>
            </label>
            <label>
              Beschreibung
              <textarea
                rows={3}
                value={selectedIsland.description}
                onChange={e => updateIsland(selectedIsland.id, { description: e.target.value })}
              />
            </label>
            <div className="coord-row">
              <label>
                Karten-X ({selectedIsland.position.x})
                <input
                  type="range"
                  min={90}
                  max={910}
                  value={selectedIsland.position.x}
                  onChange={e =>
                    updateIsland(selectedIsland.id, {
                      position: { ...selectedIsland.position, x: Number(e.target.value) }
                    })
                  }
                />
              </label>
              <label>
                Karten-Y ({selectedIsland.position.y})
                <input
                  type="range"
                  min={90}
                  max={510}
                  value={selectedIsland.position.y}
                  onChange={e =>
                    updateIsland(selectedIsland.id, {
                      position: { ...selectedIsland.position, y: Number(e.target.value) }
                    })
                  }
                />
              </label>
            </div>
            {archipelago.islands.length > 1 && (
              <button type="button" className="danger" onClick={removeSelectedIsland}>
                Insel löschen
              </button>
            )}
          </>
        )}

        {selectedJourney && (
          <>
            <h2>⛵ {selectedJourney.title}</h2>
            <p className="muted">
              Zwischen{' '}
              <strong>{archipelago.islands.find(i => i.id === selectedJourney.from)?.name ?? selectedJourney.from}</strong>{' '}
              und{' '}
              <strong>{archipelago.islands.find(i => i.id === selectedJourney.to)?.name ?? selectedJourney.to}</strong>
            </p>
            <p className="muted">{selectedJourney.summary}</p>

            <div className="island-action-stack">
              <button
                type="button"
                className="primary full-btn"
                disabled={Boolean(travel)}
                onClick={() => {
                  const target =
                    archipelago.islands.find(i => i.id === selectedJourney.to) ?? archipelago.islands[0];
                  startTravelTo(target, selectedJourney);
                }}
              >
                🌊 Diese Überfahrt mit Tika erleben
              </button>
              <button
                type="button"
                className="full-btn"
                onClick={() => onOpenInEditor({ scope: 'journey', id: selectedJourney.id })}
              >
                ✒️ Reise-Geschichte im Atelier bearbeiten ({selectedJourney.story.nodes.length} Bausteine)
              </button>
            </div>

            <div className="section-label">REISEROUTE BEARBEITEN</div>
            <label>
              Name der Meeresströmung / Überfahrt
              <input
                value={selectedJourney.title}
                onChange={e => updateJourney(selectedJourney.id, { title: e.target.value })}
              />
            </label>
            <label>
              Meeresstimmung
              <select
                value={selectedJourney.seaMood}
                onChange={e => updateJourney(selectedJourney.id, { seaMood: e.target.value as SeaMood })}
              >
                {Object.entries(SEA_MOOD_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select
                value={selectedJourney.status}
                onChange={e => updateJourney(selectedJourney.id, { status: e.target.value as ContentStatus })}
              >
                <option value="example">★ Ausgearbeitetes Beispiel</option>
                <option value="template">✎ Entwurf / Zum Weiterschreiben</option>
              </select>
            </label>
            <label>
              Kurzbeschreibung der Überfahrt
              <textarea
                rows={4}
                value={selectedJourney.summary}
                onChange={e => updateJourney(selectedJourney.id, { summary: e.target.value })}
              />
            </label>
            <button type="button" className="danger" onClick={removeSelectedJourney}>
              Reiseroute löschen
            </button>
          </>
        )}
      </aside>
    </div>
  );
}
