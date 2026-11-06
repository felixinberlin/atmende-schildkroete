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
  parseNodeDialogueAndCompanion,
  type Graph,
  type StoryNode,
  type CompanionKind
} from '../../graph';
import type { Archipelago, Island, IslandLandmark } from '../../islands';
import {
  BIOME_LABELS,
  generateVoyageJournalEntry,
  type OceanBiome,
  type MarineCreature,
  type WorldVoyage,
  type VoyageChapter
} from '../../breathing/voyageData';
import { SpectatorCanvas } from '../SpectatorVoyage/SpectatorCanvas';
import { useBreathingSession } from '../TurtleBreathing/useBreathingSession';
import { useFullscreen } from '../TurtleBreathing/useFullscreen';
import { BreathJournalModal } from '../BreathJournal/BreathJournalModal';

export interface StoryVoyagePlayerProps {
  graph: Graph;
  title: string;
  subtitle: string;
  defaultPatternId?: string;
  destinationIslandId?: string;
  island?: Island;
  archipelago?: Archipelago;
  initialNodeId?: string;
  voyagePicker?: React.ReactNode;
  onClose?: () => void;
  onNavigateToIsland?: (islandId: string) => void;
  onOpenJournal?: () => void;
}

const BIOME_SKY_COLORS: Record<OceanBiome, { top: string; mid: string; bottom: string }> = {
  'sunlit-bay': { top: '#0ea5e9', mid: '#0284c7', bottom: '#03436a' },
  'kelp-forest': { top: '#059669', mid: '#047857', bottom: '#033827' },
  'basalt-reef': { top: '#0284c7', mid: '#0369a1', bottom: '#05293d' },
  'moonlit-lagoon': { top: '#4338ca', mid: '#312e81', bottom: '#0f172a' },
  'coral-atoll': { top: '#be185d', mid: '#831843', bottom: '#1f132b' },
  'sunrise-cliff': { top: '#d97706', mid: '#b45309', bottom: '#26170d' }
};

function landmarkToBiome(landmark?: IslandLandmark): OceanBiome {
  switch (landmark) {
    case 'wave':
      return 'sunlit-bay';
    case 'kelp':
      return 'kelp-forest';
    case 'compass':
      return 'basalt-reef';
    case 'moon':
      return 'moonlit-lagoon';
    case 'coral':
      return 'coral-atoll';
    case 'star':
      return 'sunrise-cliff';
    default:
      return 'sunlit-bay';
  }
}

function toMarineCreature(companion?: CompanionKind): MarineCreature {
  switch (companion) {
    case 'seahorse':
      return 'seahorse';
    case 'jellyfish':
      return 'jellyfish';
    case 'manta':
      return 'manta';
    case 'starfish':
      return 'starfish';
    case 'school-of-fish':
      return 'school-of-fish';
    default:
      return 'dolphin';
  }
}

export function StoryVoyagePlayer({
  graph,
  title,
  subtitle,
  defaultPatternId = 'ocean',
  destinationIslandId,
  island,
  archipelago,
  initialNodeId,
  voyagePicker,
  onClose,
  onNavigateToIsland,
  onOpenJournal
}: StoryVoyagePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rigMountRef = useRef<HTMLDivElement>(null);
  const { active: isFullscreen, toggle: toggleFullscreen } = useFullscreen(containerRef);

  const startNodeId = useMemo(() => {
    if (initialNodeId && graph.nodes.some(n => n.id === initialNodeId)) return initialNodeId;
    return graph.nodes.find(n => n.data.kind === 'start')?.id ?? graph.nodes[0]?.id;
  }, [graph, initialNodeId]);

  const [currentNodeId, setCurrentNodeId] = useState<string>(startNodeId);
  const [visitedNodeIds, setVisitedNodeIds] = useState<string[]>([startNodeId]);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [soundProfile, setSoundProfile] = useState<SoundProfileId>(DEFAULT_SOUND_PROFILE);
  const [volume, setVolume] = useState<number>(0.8);
  const [breathCycles, setBreathCycles] = useState<number>(0);
  const [isJournalOpen, setIsJournalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentNode: StoryNode | undefined =
    graph.nodes.find(n => n.id === currentNodeId) ?? graph.nodes[0];

  // Outgoing decision edges from current node
  const outgoingEdges = useMemo(() => {
    if (!currentNode) return [];
    return graph.edges.filter(e => e.source === currentNode.id);
  }, [graph.edges, currentNode]);

  // Resolve pattern for current node
  const activePattern = useMemo(() => {
    if (currentNode?.data.kind === 'exercise' && currentNode.data.patternId) {
      return findPattern(currentNode.data.patternId) ?? DEFAULT_PATTERN;
    }
    return findPattern(defaultPatternId) ?? DEFAULT_PATTERN;
  }, [currentNode, defaultPatternId]);

  // Owns the live breathing session for Tika's flippers, breathing expansions, and sounds
  const { session, running, phase, toggle } = useBreathingSession(rigMountRef, {
    pattern: activePattern,
    soundProfile,
    volume,
    speed
  });

  // Track completed breath cycles during exercises
  useEffect(() => {
    if (!session || currentNode?.data.kind !== 'exercise') return;
    const unsub = session.on('phase', p => {
      if (p.cue === 'exhale') {
        setBreathCycles(c => c + 1);
      }
    });
    return () => unsub();
  }, [session, currentNode]);

  // Reset breath cycle counter on node change
  useEffect(() => {
    setBreathCycles(0);
  }, [currentNodeId]);

  // Parse scene companion and dialogue from the current node's real script
  const sceneInfo = useMemo(() => {
    if (!currentNode) {
      return {
        companion: 'none' as CompanionKind,
        companionName: '',
        companionAvatar: '',
        companionDialog: undefined,
        tikaDialog: 'Ich schwimme ruhig im Meer.'
      };
    }
    return parseNodeDialogueAndCompanion(currentNode);
  }, [currentNode]);

  // Resolve environment biome
  const currentBiome: OceanBiome = useMemo(() => {
    if (island) return landmarkToBiome(island.landmark);
    if (title.toLowerCase().includes('kompass')) return 'basalt-reef';
    if (title.toLowerCase().includes('tang') || title.toLowerCase().includes('tiefsee')) return 'kelp-forest';
    if (title.toLowerCase().includes('mond')) return 'moonlit-lagoon';
    if (title.toLowerCase().includes('herzschlag') || title.toLowerCase().includes('koralle')) return 'coral-atoll';
    if (title.toLowerCase().includes('stern')) return 'sunrise-cliff';
    return 'sunlit-bay';
  }, [island, title]);

  const skyColors = BIOME_SKY_COLORS[currentBiome];

  // Transition to target node
  const handleSelectNode = (targetId: string) => {
    if (!graph.nodes.some(n => n.id === targetId)) return;
    setCurrentNodeId(targetId);
    setVisitedNodeIds(prev => (prev.includes(targetId) ? prev : [...prev, targetId]));
  };

  // Auto-play timer for spectator cruising
  useEffect(() => {
    if (!isAutoPlay || !running || !currentNode) return;
    if (currentNode.data.kind === 'question' && outgoingEdges.length > 1) {
      // Pause at decisions so user can choose, or auto-advance after 14s
      const timer = setTimeout(() => {
        if (outgoingEdges[0]) handleSelectNode(outgoingEdges[0].target);
      }, 14000);
      return () => clearTimeout(timer);
    }

    if (currentNode.data.kind === 'exercise') {
      // In exercise nodes, wait for at least 2 cycles or 18s
      if (breathCycles >= 2) {
        const nextTarget = outgoingEdges[0]?.target;
        if (nextTarget) {
          const timer = setTimeout(() => handleSelectNode(nextTarget), 1500);
          return () => clearTimeout(timer);
        }
      }
      return;
    }

    if (currentNode.data.kind === 'ending') {
      return;
    }

    // Default reading time for scene/start nodes
    const readingDelayMs = Math.max(7000, (currentNode.data.text.length / 15) * 1000);
    const nextTarget = outgoingEdges[0]?.target;
    if (nextTarget) {
      const timer = setTimeout(() => handleSelectNode(nextTarget), readingDelayMs);
      return () => clearTimeout(timer);
    }
  }, [isAutoPlay, running, currentNode, outgoingEdges, breathCycles]);

  // Snapshot the current moment into the local Breath Journal
  const handleSaveToJournal = () => {
    try {
      const dummyVoyage: WorldVoyage = {
        id: 'editor-story-voyage',
        title,
        subtitle,
        description: subtitle,
        soundProfile: soundProfile === 'mute' ? 'ocean_master' : soundProfile,
        chapters: []
      };
      const dummyChapter: VoyageChapter = {
        id: `node-${currentNode?.id ?? 'scene'}`,
        title: currentNode?.data.title ?? title,
        islandName: island?.name ?? title,
        patternId: activePattern.id,
        biome: currentBiome,
        creature: toMarineCreature(sceneInfo.companion),
        landmark: island?.landmark ?? 'wave',
        storyChronicle: currentNode?.data.text ?? '',
        tikaQuote: sceneInfo.tikaDialog,
        dialogs: [],
        skyColors,
        waterParticles: '#7dd3fc',
        accentColor: '#2dd4bf',
        durationSec: 30
      };
      const entry = generateVoyageJournalEntry(dummyVoyage, dummyChapter);
      addSavedBreathJourney(entry);
      setToastMessage(`✓ „${currentNode?.data.title}“ im Reisetagebuch gespeichert!`);
      setTimeout(() => setToastMessage(null), 4500);
    } catch (e) {
      console.error(e);
      setToastMessage('Fehler beim Speichern der Reise.');
    }
  };

  const biomeMeta = BIOME_LABELS[currentBiome];
  const destIsland = destinationIslandId
    ? archipelago?.islands.find(i => i.id === destinationIslandId)
    : undefined;

  return (
    <div
      className={`spectator-voyage-container story-voyage-player ${isFullscreen ? 'spectator-fullscreen' : ''}`}
      ref={containerRef}
    >
      {/* Hidden rig mount to satisfy session renderer without DOM duplicates */}
      <div ref={rigMountRef} style={{ display: 'none' }} />

      {/* Top Floating Bar */}
      <header className="spectator-topbar">
        <div className="spectator-voyage-pickers">
          {voyagePicker ? (
            voyagePicker
          ) : (
            <div className="story-voyage-title-badge">
              <span className="eyebrow" style={{ color: '#bae6fd' }}>
                {island ? `🏝️ ${island.name.toUpperCase()}` : '📖 GESCHICHTEN-REISE'}
              </span>
              <h2 className="story-header-title">{title}</h2>
            </div>
          )}
        </div>

        <div className="spectator-topbar-actions">
          {toastMessage && <div className="spectator-toast-pill">{toastMessage}</div>}

          {/* Auto-Play Toggle */}
          <button
            type="button"
            className={`spectator-btn-pill ${isAutoPlay ? 'active-cruise' : ''}`}
            onClick={() => setIsAutoPlay(a => !a)}
            title={isAutoPlay ? 'Auf manuell wechseln' : 'Tempomat aktivieren: Tika schwimmt automatisch'}
          >
            {isAutoPlay ? '✨ Tempomat: An' : '▷ Tempomat: Aus'}
          </button>

          <button
            type="button"
            className="spectator-btn-pill"
            onClick={handleSaveToJournal}
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

          <button
            type="button"
            className="spectator-btn-pill icon-only"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
          >
            {isFullscreen ? '⤦' : '⛶'}
          </button>

          {onClose && (
            <button
              type="button"
              className="spectator-btn-pill icon-only close-btn"
              onClick={onClose}
              title="Reise schließen"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Panoramic 16:9 Stage */}
      <main className="spectator-viewport">
        <SpectatorCanvas
          session={session}
          phase={phase}
          biome={currentBiome}
          companion={sceneInfo.companion}
          companionName={sceneInfo.companionName}
          companionDialog={sceneInfo.companionDialog}
          tikaDialog={sceneInfo.tikaDialog}
          skyColors={skyColors}
          speed={speed}
        />

        {/* Floating Story Card with Decisions & Dialogue */}
        <div className="spectator-chronicle-card story-voyage-interactive-card">
          <div className="chronicle-top-row">
            <div className="chronicle-meta-tags">
              <span className="chronicle-biome-pill">
                {biomeMeta.icon} {biomeMeta.name}
              </span>
              {sceneInfo.companion !== 'none' && (
                <span className="chronicle-creature-pill">
                  {sceneInfo.companionAvatar} {sceneInfo.companionName}
                </span>
              )}
              {currentNode?.data.kind === 'exercise' && (
                <span className="chronicle-island-pill" style={{ background: 'rgba(94, 234, 212, 0.25)', borderColor: '#5eead4' }}>
                  🌬️ {activePattern.shortName ?? activePattern.name}
                </span>
              )}
            </div>

            <span className="node-kind-pill">{currentNode?.data.kind.toUpperCase()}</span>
          </div>

          <h3 className="chronicle-title">{currentNode?.data.title}</h3>

          {/* Spoken Dialogues from Script */}
          {sceneInfo.companionDialog && (
            <div className="chronicle-dialogs-container">
              <div className={`dialog-bubble-item ${sceneInfo.companion}`}>
                <span className="dialog-speaker-badge">
                  {sceneInfo.companionAvatar} <strong>{sceneInfo.companionName}</strong>:
                </span>
                <p className="dialog-speech-body">„{sceneInfo.companionDialog}“</p>
              </div>
            </div>
          )}

          {/* Narrative Story Text */}
          <div className="chronicle-narrative-box">
            <p className="chronicle-text">{currentNode?.data.text}</p>
          </div>

          {/* Exercise Breath Tracker */}
          {currentNode?.data.kind === 'exercise' && (
            <div className="voyage-exercise-status">
              <span className="breath-cycle-indicator">
                🌬️ <strong>{breathCycles}</strong> Atemzüge vollendet
              </span>
              <p className="muted" style={{ margin: '4px 0 8px', fontSize: '11.5px' }}>
                Atme ruhig im Takt von Tika. Wenn du bereit bist, schwimme weiter.
              </p>
            </div>
          )}

          {/* Interactive User Decisions ("me desitions") */}
          {outgoingEdges.length > 0 && (
            <div className="voyage-decisions-cluster">
              <div className="decisions-buttons">
                {outgoingEdges.map(edge => (
                  <button
                    key={edge.id}
                    type="button"
                    className="voyage-choice-btn primary"
                    onClick={() => handleSelectNode(edge.target)}
                  >
                    <span className="choice-bullet">✧</span>
                    <span className="choice-label">{edge.label || 'Weiter'}</span>
                    <span className="choice-arrow">→</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ending actions */}
          {currentNode?.data.kind === 'ending' && (
            <div className="ending-voyage-actions">
              <p className="muted" style={{ margin: '8px 0 12px' }}>
                Reiseabschnitt vollendet ♡ Tika hat ihren Weg ruhig gemeistert.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button type="button" className="spectator-btn-pill" onClick={handleSaveToJournal}>
                  📸 Als Meeresmuster ins Tagebuch speichern
                </button>
                {destIsland && onNavigateToIsland && (
                  <button
                    type="button"
                    className="voyage-choice-btn primary"
                    onClick={() => onNavigateToIsland(destIsland.id)}
                  >
                    🏝️ Jetzt auf {destIsland.name} an Land gehen →
                  </button>
                )}
                <button
                  type="button"
                  className="spectator-btn-pill"
                  onClick={() => handleSelectNode(startNodeId)}
                >
                  ↺ Nochmal von vorne
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Transport Controls */}
      <footer className="spectator-bottombar">
        <div className="spectator-controls-row">
          <div className="transport-cluster">
            {/* History back button */}
            <button
              type="button"
              className="spectator-control-btn"
              disabled={visitedNodeIds.length <= 1}
              onClick={() => {
                if (visitedNodeIds.length > 1) {
                  const prevId = visitedNodeIds[visitedNodeIds.length - 2];
                  setVisitedNodeIds(v => v.slice(0, -1));
                  setCurrentNodeId(prevId);
                }
              }}
              title="Einen Schritt zurück"
            >
              ⏮
            </button>

            <button
              type="button"
              className="spectator-control-btn play-btn"
              onClick={toggle}
              title={running ? 'Pause' : 'Weiter schwimmen'}
            >
              {running ? '⏸' : '▶'}
            </button>
          </div>

          <div className="story-step-indicator">
            <span>
              Station <strong>{visitedNodeIds.length}</strong> ({currentNode?.data.title})
            </span>
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
      {isJournalOpen && <BreathJournalModal isOpen={isJournalOpen} onClose={() => setIsJournalOpen(false)} />}
    </div>
  );
}
