import React, { useMemo, useRef, useState } from 'react';
import {
  DEFAULT_PATTERN,
  DEFAULT_SOUND_PROFILE,
  SEA_PATTERN_STYLES,
  SOUND_PROFILES,
  findPattern,
  fromFourPhase,
  resolvePatternStyle,
  type FourPhaseTimings,
  type SeaPatternStyle,
  type SoundProfileId
} from '../../breathing';
import type { Archipelago, Island } from '../../islands';
import { HumanGuide } from '../TurtleBreathing/HumanGuide';
import { MicBreathPanel } from '../TurtleBreathing/MicBreathPanel';
import { PhaseBadge } from '../TurtleBreathing/PhaseBadge';
import { SeaPatternCanvas } from '../TurtleBreathing/SeaPatternCanvas';
import { TurtleRigSvg } from '../TurtleBreathing/TurtleRigSvg';
import { useBreathingSession } from '../TurtleBreathing/useBreathingSession';
import { BreathJournalModal } from '../BreathJournal/BreathJournalModal';

export interface SeaPatternModeProps {
  archipelago: Archipelago;
  initialIslandId?: string;
  onSelectIsland?: (island: Island) => void;
}

const customBase = findPattern('custom')!;
const toTimings = (p = customBase): FourPhaseTimings => ({
  inhale: p.phases[0].durationMs,
  holdIn: p.phases[1].durationMs,
  exhale: p.phases[2].durationMs,
  holdOut: p.phases[3].durationMs
});

export function SeaPatternMode({ archipelago, initialIslandId, onSelectIsland }: SeaPatternModeProps) {
  const rigRef = useRef<HTMLDivElement>(null);
  const [selectedIslandId, setSelectedIslandId] = useState<string>(
    initialIslandId ?? archipelago.currentIslandId
  );
  const activeIsland =
    archipelago.islands.find(i => i.id === selectedIslandId) ?? archipelago.islands[0];

  const [patternId, setPatternId] = useState<string>(activeIsland?.patternId ?? DEFAULT_PATTERN.id);
  const [customTimings] = useState(toTimings);
  const [patternStyle, setPatternStyle] = useState<SeaPatternStyle>('auto');
  const [soundProfile, setSoundProfile] = useState<SoundProfileId>(DEFAULT_SOUND_PROFILE);
  const [volume, setVolume] = useState(0.8);
  const [speed, setSpeed] = useState(1);
  const [isJournalOpen, setIsJournalOpen] = useState(false);

  const pattern = useMemo(
    () =>
      patternId === 'custom'
        ? fromFourPhase(customTimings, customBase)
        : (findPattern(patternId) ?? DEFAULT_PATTERN),
    [patternId, customTimings]
  );

  const { session, running, phase, toggle } = useBreathingSession(rigRef, {
    pattern,
    soundProfile,
    volume,
    speed
  });

  const resolvedStyleKey = resolvePatternStyle(pattern.id, patternStyle);
  const resolvedStyleInfo = SEA_PATTERN_STYLES[resolvedStyleKey];

  return (
    <div className="workspace sea-pattern-workspace">
      {/* Left Sidebar: Choose Island Rhythm & Sea Pattern Geometry */}
      <aside className="library">
        <div className="eyebrow">ATEM-SPUR IM MEER</div>
        <h2>
          Jeder Atemzug
          <br />
          wird ein Muster.
        </h2>
        <p className="muted">
          Mit jedem Einatmen, Halten und Ausatmen schwimmt Tika ein kleines Stück weiter. Über die Sitzung hinweg entsteht im Wasser ein leuchtendes Meeresmuster.
        </p>

        <div className="section-label">INSEL-ATEMTECHNIK WÄHLEN</div>
        <div className="island-nav-list">
          {archipelago.islands.map(island => {
            const pat = findPattern(island.patternId);
            const active = island.id === selectedIslandId && patternId === island.patternId;
            return (
              <button
                type="button"
                key={island.id}
                className={`library-item island-list-btn ${active ? 'active-item' : ''}`}
                onClick={() => {
                  setSelectedIslandId(island.id);
                  setPatternId(island.patternId);
                  onSelectIsland?.(island);
                }}
              >
                <span className="kind-dot" style={{ background: island.accentColor }} />
                <span>
                  {island.name}
                  <small>{pat?.shortName ?? pat?.name ?? island.patternId}</small>
                </span>
              </button>
            );
          })}
        </div>

        <div className="section-label">MUSTER-GEOMETRIE</div>
        <label>
          Form der Schwimmspur
          <select
            value={patternStyle}
            onChange={e => setPatternStyle(e.target.value as SeaPatternStyle)}
          >
            {(Object.keys(SEA_PATTERN_STYLES) as SeaPatternStyle[]).map(key => (
              <option key={key} value={key}>
                {SEA_PATTERN_STYLES[key].name}
              </option>
            ))}
          </select>
        </label>

        <div className="library-tip">
          <span>🌀</span>
          <strong>{resolvedStyleInfo.name}</strong>
          <p>{resolvedStyleInfo.description}</p>
        </div>
      </aside>

      {/* Center Stage: Large Bioluminescent Sea Pattern Canvas */}
      <main>
        <div className="canvas-heading">
          <div>
            <div className="eyebrow">MEERESMUSTER-MODUS · LIVE ATEM-MANDALA</div>
            <h1>
              {activeIsland ? `${activeIsland.name}: ` : ''}
              {pattern.shortName ?? pattern.name} <span>🌀</span>
            </h1>
            <p>{pattern.description}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              className="btn-pill"
              onClick={() => setIsJournalOpen(true)}
              title="Gespeicherte Atem-Reisen im Tagebuch ansehen"
            >
              🐚 Reisetagebuch
            </button>
            <button type="button" className="primary" onClick={toggle}>
              {running ? '⏸ Pause' : '▶ Weiteratmen'}
            </button>
          </div>
        </div>

        <div className="canvas sea-pattern-main-canvas">
          <SeaPatternCanvas
            session={session}
            patternStyle={patternStyle}
            onPatternStyleChange={setPatternStyle}
            showStyleSelector={false}
            islandName={activeIsland?.name}
            islandId={activeIsland?.id}
            onOpenJournal={() => setIsJournalOpen(true)}
          />
        </div>

        <footer aria-live="polite">
          <span>
            🌿 <strong>Türkis</strong> = Einatmen · ✧ <strong>Gold</strong> = Halten (Perle) · 🌊{' '}
            <strong>Blau</strong> = Ausatmen · ♡ <strong>Lavendel</strong> = Ruhe
          </span>
          <span>Je länger du ruhig atmest, desto weiter entfaltet sich das Muster</span>
        </footer>
      </main>

      {/* Right Sidebar: Synchronized Rigged Tika + Human Breathing Guide + Audio */}
      <aside className="inspector">
        <div className="eyebrow">SYNCHRONER ATEM-BEGLEITER</div>
        <h2>Mit Tika atmen</h2>

        <div className="sea-side-stage">
          <div className="sea-side-figures">
            <div className="turtle-svg-container" ref={rigRef}>
              <TurtleRigSvg />
            </div>
            <HumanGuide session={session} />
          </div>
          <PhaseBadge session={session} phase={phase} />
        </div>

        <MicBreathPanel session={session} />

        <div className="section-label">TEMPO & KLANG</div>
        <label>
          Audio-Begleitung
          <select
            value={soundProfile}
            onChange={e => setSoundProfile(e.target.value as SoundProfileId)}
          >
            {(Object.keys(SOUND_PROFILES) as SoundProfileId[]).map(id => (
              <option key={id} value={id}>
                {SOUND_PROFILES[id].label}
              </option>
            ))}
          </select>
        </label>

        {soundProfile !== 'mute' && (
          <label>
            Lautstärke ({Math.round(volume * 100)}%)
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={e => setVolume(Number(e.target.value) / 100)}
            />
          </label>
        )}

        <label>
          Atem-Tempo ({speed.toFixed(2)}x)
          <input
            type="range"
            min={60}
            max={140}
            value={Math.round(speed * 100)}
            onChange={e => setSpeed(Number(e.target.value) / 100)}
          />
        </label>

        {pattern.safety?.notes && (
          <small className="technique-safety">{pattern.safety.notes}</small>
        )}
      </aside>

      <BreathJournalModal isOpen={isJournalOpen} onClose={() => setIsJournalOpen(false)} />
    </div>
  );
}
