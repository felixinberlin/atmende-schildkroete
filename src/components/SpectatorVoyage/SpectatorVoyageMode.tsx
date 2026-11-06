import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_PATTERN,
  DEFAULT_SOUND_PROFILE,
  findPattern,
  SOUND_PROFILES,
  type SoundProfileId
} from '../../breathing';
import { addSavedBreathJourney } from '../../breathing/breathJournal';
import {
  BIOME_LABELS,
  CREATURE_LABELS,
  findVoyage,
  generateVoyageJournalEntry,
  getVoyageTotalDuration,
  WORLD_VOYAGES,
  type WorldVoyage,
  type VoyageChapter
} from '../../breathing/voyageData';
import type { Archipelago } from '../../islands';
import type { Graph } from '../../graph';
import { StoryVoyagePlayer } from '../StoryVoyage';
import { SpectatorCanvas } from './SpectatorCanvas';
import { useBreathingSession } from '../TurtleBreathing/useBreathingSession';
import { useFullscreen } from '../TurtleBreathing/useFullscreen';
import { BreathJournalModal } from '../BreathJournal/BreathJournalModal';

export interface SpectatorVoyageModeProps {
  initialVoyageId?: string;
  onOpenMap?: () => void;
  onOpenPatternMode?: () => void;
  archipelago?: Archipelago;
  standaloneGraph?: Graph;
  onNavigateToIsland?: (islandId: string) => void;
}

interface CuratedSpectatorVoyageProps {
  voyageId: string;
  voyagePicker: React.ReactNode;
  onOpenMap?: () => void;
  onOpenPatternMode?: () => void;
}

function CuratedSpectatorVoyage({
  voyageId,
  voyagePicker,
  onOpenMap,
  onOpenPatternMode
}: CuratedSpectatorVoyageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rigMountRef = useRef<HTMLDivElement>(null);
  const { active: isFullscreen, toggle: toggleFullscreen } = useFullscreen(containerRef);

  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [chapterElapsedSec, setChapterElapsedSec] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [soundProfile, setSoundProfile] = useState<SoundProfileId>(DEFAULT_SOUND_PROFILE);
  const [volume, setVolume] = useState(0.8);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dialogView, setDialogView] = useState<'both' | 'dialogs' | 'chronicle'>('both');

  const activeVoyage: WorldVoyage = useMemo(
    () => findVoyage(voyageId) ?? WORLD_VOYAGES[0],
    [voyageId]
  );

  const activeChapter: VoyageChapter =
    activeVoyage.chapters[currentChapterIndex] ?? activeVoyage.chapters[0];

  const pattern = useMemo(
    () => findPattern(activeChapter.patternId) ?? DEFAULT_PATTERN,
    [activeChapter.patternId]
  );

  // Sync sound profile default when voyage changes
  useEffect(() => {
    setSoundProfile(activeVoyage.soundProfile);
    setCurrentChapterIndex(0);
    setChapterElapsedSec(0);
  }, [activeVoyage]);

  // Owns the live breathing session for Tika's breathing rig and sound cues
  const { session, running, phase, toggle } = useBreathingSession(rigMountRef, {
    pattern,
    soundProfile,
    volume,
    speed
  });

  // Autoplay voyage progress timer
  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      setChapterElapsedSec(prev => {
        const next = prev + 1 * speed;
        if (next >= activeChapter.durationSec) {
          // Chapter finished: advance to next chapter or loop voyage
          if (currentChapterIndex < activeVoyage.chapters.length - 1) {
            setCurrentChapterIndex(i => i + 1);
            return 0;
          } else {
            // Reached expedition end! Loop gently back to start
            setCurrentChapterIndex(0);
            return 0;
          }
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running, speed, activeChapter.durationSec, currentChapterIndex, activeVoyage.chapters.length]);

  // Jump to specific chapter
  const goToChapter = (index: number) => {
    if (index < 0 || index >= activeVoyage.chapters.length) return;
    setCurrentChapterIndex(index);
    setChapterElapsedSec(0);
  };

  // Snapshot the current moment into the local Breath Journal
  const handleSaveMoment = () => {
    try {
      const entry = generateVoyageJournalEntry(activeVoyage, activeChapter);
      addSavedBreathJourney(entry);
      setToastMessage(`✓ „${activeChapter.title}“ im Reisetagebuch gespeichert!`);
      setTimeout(() => setToastMessage(null), 4500);
    } catch (e) {
      console.error(e);
      setToastMessage('Fehler beim Speichern der Reise.');
    }
  };

  const totalVoyageSec = getVoyageTotalDuration(activeVoyage);
  const elapsedBeforeCurrent = activeVoyage.chapters
    .slice(0, currentChapterIndex)
    .reduce((s, c) => s + c.durationSec, 0);
  const overallElapsedSec = Math.min(totalVoyageSec, elapsedBeforeCurrent + chapterElapsedSec);

  const formatMinSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const biomeMeta = BIOME_LABELS[activeChapter.biome];
  const creatureMeta = CREATURE_LABELS[activeChapter.creature];

  return (
    <div
      className={`spectator-voyage-container ${isFullscreen ? 'spectator-fullscreen' : ''}`}
      ref={containerRef}
    >
      {/* Hidden rig mount to satisfy session renderer without DOM duplicates */}
      <div ref={rigMountRef} style={{ display: 'none' }} />

      {/* Top Floating Control Bar */}
      <header className="spectator-topbar">
        <div className="spectator-voyage-pickers">
          {voyagePicker}
        </div>

        <div className="spectator-topbar-actions">
          {toastMessage && <div className="spectator-toast-pill">{toastMessage}</div>}

          <button
            type="button"
            className="spectator-btn-pill"
            onClick={handleSaveMoment}
            title="Diesen Reisemoment mit echtem Meeresmuster im Reisetagebuch verewigen"
          >
            📸 Moment festhalten
          </button>

          <button
            type="button"
            className="spectator-btn-pill"
            onClick={() => setIsJournalOpen(true)}
            title="Reisetagebuch öffnen"
          >
            🐚 Reisetagebuch
          </button>

          {onOpenMap && (
            <button type="button" className="spectator-btn-pill" onClick={onOpenMap} title="Zurück zur Inselkarte">
              🗺️ Inselkarte
            </button>
          )}

          {onOpenPatternMode && (
            <button
              type="button"
              className="spectator-btn-pill"
              onClick={onOpenPatternMode}
              title="Zum Meeresmuster-Modus wechseln"
            >
              🌀 Meeresmuster
            </button>
          )}

          <button
            type="button"
            className="spectator-btn-pill icon-only"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
          >
            {isFullscreen ? '⤦' : '⛶'}
          </button>
        </div>
      </header>

      {/* Panoramic 16:9 Spectator Ocean Canvas */}
      <main className="spectator-viewport">
        <SpectatorCanvas
          session={session}
          phase={phase}
          chapter={activeChapter}
          speed={speed}
        />

        {/* Narrative Chronicle & Script Dialogue Subtitle Card */}
        <div className="spectator-chronicle-card">
          <div className="chronicle-top-row">
            <div className="chronicle-meta-tags">
              <span className="chronicle-biome-pill">
                {biomeMeta.icon} {biomeMeta.name}
              </span>
              <span className="chronicle-island-pill">🏝️ {activeChapter.islandName}</span>
              <span className="chronicle-creature-pill">
                {creatureMeta.icon} {creatureMeta.name}
              </span>
            </div>

            <div className="chronicle-view-tabs" role="tablist" aria-label="Textansicht wählen">
              <button
                type="button"
                className={`chronicle-view-tab ${dialogView === 'both' ? 'active' : ''}`}
                onClick={() => setDialogView('both')}
              >
                ✨ Beides
              </button>
              <button
                type="button"
                className={`chronicle-view-tab ${dialogView === 'dialogs' ? 'active' : ''}`}
                onClick={() => setDialogView('dialogs')}
              >
                💬 Tikas Dialoge
              </button>
              <button
                type="button"
                className={`chronicle-view-tab ${dialogView === 'chronicle' ? 'active' : ''}`}
                onClick={() => setDialogView('chronicle')}
              >
                📜 Ozean-Chronik
              </button>
            </div>
          </div>

          <h3 className="chronicle-title">{activeChapter.title}</h3>

          {/* Real Script Dialogues */}
          {(dialogView === 'both' || dialogView === 'dialogs') && (
            <div className="chronicle-dialogs-container">
              {activeChapter.dialogs.map(d => (
                <div key={d.id} className={`dialog-bubble-item ${d.speaker}`}>
                  <span className="dialog-speaker-badge">
                    {d.avatar} <strong>{d.speakerName}</strong>:
                  </span>
                  <p className="dialog-speech-body">„{d.text}“</p>
                </div>
              ))}
            </div>
          )}

          {/* Atmospheric Chronicle Text */}
          {(dialogView === 'both' || dialogView === 'chronicle') && (
            <div className="chronicle-narrative-box">
              <p className="chronicle-text">{activeChapter.storyChronicle}</p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Timeline & Cinematic Transport Scrubber */}
      <footer className="spectator-bottombar">
        {/* Timeline Chapter Scrubber */}
        <div className="spectator-scrubber-row">
          <div className="spectator-time-info">
            <strong>
              Kapitel {currentChapterIndex + 1} von {activeVoyage.chapters.length}
            </strong>
            <span>
              {formatMinSec(overallElapsedSec)} / {formatMinSec(totalVoyageSec)}
            </span>
          </div>

          <div className="spectator-chapter-track">
            {activeVoyage.chapters.map((ch, idx) => {
              const isActive = idx === currentChapterIndex;
              const isPast = idx < currentChapterIndex;
              const chapterProgressPct = isActive
                ? Math.min(100, (chapterElapsedSec / ch.durationSec) * 100)
                : isPast
                  ? 100
                  : 0;

              return (
                <button
                  key={ch.id}
                  type="button"
                  className={`spectator-chapter-pill ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}
                  onClick={() => goToChapter(idx)}
                  title={`${ch.title} (${ch.islandName})`}
                >
                  <div
                    className="spectator-chapter-fill"
                    style={{ width: `${chapterProgressPct}%` }}
                  />
                  <span className="chapter-pill-label">
                    {idx + 1}. {ch.islandName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Playback Controls and Audio Bar */}
        <div className="spectator-controls-row">
          <div className="transport-cluster">
            <button
              type="button"
              className="spectator-control-btn"
              disabled={currentChapterIndex === 0}
              onClick={() => goToChapter(currentChapterIndex - 1)}
              title="Vorheriges Kapitel"
            >
              ⏮
            </button>

            <button
              type="button"
              className="spectator-control-btn play-btn"
              onClick={toggle}
              title={running ? 'Pause' : 'Reise fortsetzen'}
            >
              {running ? '⏸' : '▶'}
            </button>

            <button
              type="button"
              className="spectator-control-btn"
              disabled={currentChapterIndex === activeVoyage.chapters.length - 1}
              onClick={() => goToChapter(currentChapterIndex + 1)}
              title="Nächstes Kapitel"
            >
              ⏭
            </button>
          </div>

          {/* Speed Selector */}
          <div className="speed-cluster">
            <span className="setting-label">Tempo:</span>
            {[0.75, 1, 1.25].map(s => (
              <button
                key={s}
                type="button"
                className={`speed-pill ${speed === s ? 'active' : ''}`}
                onClick={() => setSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Audio Profile & Volume */}
          <div className="audio-cluster">
            <span className="setting-label">Klang:</span>
            <select
              value={soundProfile}
              onChange={e => setSoundProfile(e.target.value as SoundProfileId)}
              className="spectator-mini-select"
            >
              {(Object.keys(SOUND_PROFILES) as SoundProfileId[]).map(key => (
                <option key={key} value={key}>
                  {SOUND_PROFILES[key].label}
                </option>
              ))}
            </select>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={e => setVolume(parseFloat(e.target.value))}
              aria-label="Lautstärke der Atemklänge"
              className="spectator-volume-slider"
            />
          </div>
        </div>
      </footer>

      {/* Keepsake Breath Journal Modal */}
      {isJournalOpen && <BreathJournalModal onClose={() => setIsJournalOpen(false)} />}
    </div>
  );
}

export function SpectatorVoyageMode({
  initialVoyageId = 'grand-archipelago',
  onOpenMap,
  onOpenPatternMode,
  archipelago,
  standaloneGraph,
  onNavigateToIsland
}: SpectatorVoyageModeProps) {
  const [selectedVoyageId, setSelectedVoyageId] = useState<string>(initialVoyageId);

  const voyagePicker = (
    <label className="spectator-label">
      <span className="eyebrow" style={{ color: '#bae6fd' }}>
        🔭 ZUSCHAUER-WELTREISE & GESCHICHTEN
      </span>
      <select
        value={selectedVoyageId}
        onChange={e => setSelectedVoyageId(e.target.value)}
        className="spectator-select"
      >
        <optgroup label="✨ Große Weltreisen (Zuschauer-Expeditionen)">
          {WORLD_VOYAGES.map(v => (
            <option key={v.id} value={v.id}>
              {v.title} ({v.chapters.length} Stationen)
            </option>
          ))}
        </optgroup>
        {archipelago && (
          <>
            <optgroup label="🏝️ Insel-Geschichten aus dem Editor">
              {archipelago.islands.map(i => (
                <option key={`island:${i.id}`} value={`island:${i.id}`}>
                  {i.name} ({findPattern(i.patternId)?.shortName ?? i.patternId})
                </option>
              ))}
            </optgroup>
            <optgroup label="⛵ Überfahrten aus dem Editor">
              {archipelago.journeys.map(j => (
                <option key={`journey:${j.id}`} value={`journey:${j.id}`}>
                  {j.title}
                </option>
              ))}
            </optgroup>
          </>
        )}
        {standaloneGraph && (
          <optgroup label="📖 Geschichtenatelier-Entwurf">
            <option value="standalone">Tikas kleiner Mutmoment (Aktueller Entwurf)</option>
          </optgroup>
        )}
      </select>
    </label>
  );

  if (selectedVoyageId.startsWith('island:') && archipelago) {
    const islandId = selectedVoyageId.slice(7);
    const island = archipelago.islands.find(i => i.id === islandId) ?? archipelago.islands[0];
    if (island) {
      return (
        <StoryVoyagePlayer
          key={`island-${island.id}`}
          graph={island.story}
          title={island.name}
          subtitle={island.subtitle}
          defaultPatternId={island.patternId}
          island={island}
          archipelago={archipelago}
          voyagePicker={voyagePicker}
          onClose={onOpenMap}
          onNavigateToIsland={destId => {
            setSelectedVoyageId(`island:${destId}`);
            onNavigateToIsland?.(destId);
          }}
        />
      );
    }
  }

  if (selectedVoyageId.startsWith('journey:') && archipelago) {
    const journeyId = selectedVoyageId.slice(8);
    const journey = archipelago.journeys.find(j => j.id === journeyId) ?? archipelago.journeys[0];
    if (journey) {
      const toIsland = archipelago.islands.find(i => i.id === journey.to);
      return (
        <StoryVoyagePlayer
          key={`journey-${journey.id}`}
          graph={journey.story}
          title={journey.title}
          subtitle={journey.summary}
          defaultPatternId={toIsland?.patternId ?? 'ocean'}
          destinationIslandId={journey.to}
          archipelago={archipelago}
          voyagePicker={voyagePicker}
          onClose={onOpenMap}
          onNavigateToIsland={destId => {
            setSelectedVoyageId(`island:${destId}`);
            onNavigateToIsland?.(destId);
          }}
        />
      );
    }
  }

  if (selectedVoyageId === 'standalone' && standaloneGraph) {
    return (
      <StoryVoyagePlayer
        key="standalone-graph"
        graph={standaloneGraph}
        title="Tikas kleiner Mutmoment"
        subtitle="Freier Entwurf aus dem Geschichtenatelier"
        defaultPatternId="ocean"
        archipelago={archipelago}
        voyagePicker={voyagePicker}
        onClose={onOpenMap}
      />
    );
  }

  return (
    <CuratedSpectatorVoyage
      voyageId={selectedVoyageId}
      voyagePicker={voyagePicker}
      onOpenMap={onOpenMap}
      onOpenPatternMode={onOpenPatternMode}
    />
  );
}
