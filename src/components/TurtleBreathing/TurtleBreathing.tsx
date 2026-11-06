import { useMemo, useRef, useState } from 'react';
import {
  DEFAULT_PATTERN,
  DEFAULT_SOUND_PROFILE,
  findPattern,
  fromFourPhase,
  type FourPhaseTimings,
  type SeaPatternStyle,
  type SoundProfileId
} from '../../breathing';
import { BreathingControls } from './BreathingControls';
import { HumanGuide } from './HumanGuide';
import { MicBreathPanel } from './MicBreathPanel';
import { PhaseBadge } from './PhaseBadge';
import { SeaPatternCanvas } from './SeaPatternCanvas';
import { TurtleRigSvg } from './TurtleRigSvg';
import { useBreathingSession } from './useBreathingSession';
import { useFullscreen } from './useFullscreen';
import { BreathJournalModal } from '../BreathJournal/BreathJournalModal';

export interface TurtleBreathingProps {
  initialPattern?: string;
  initialSound?: SoundProfileId;
  initialVolume?: number;
  speed?: number;
  /** Show the human figure that demonstrates air flow and breathing muscles. */
  showHumanGuide?: boolean;
  /** Start with the sea-pattern ("Meeresmuster") trail active. */
  initialSeaPattern?: boolean;
}

const customBase = findPattern('custom')!;
const toTimings = (p = customBase): FourPhaseTimings => ({
  inhale: p.phases[0].durationMs,
  holdIn: p.phases[1].durationMs,
  exhale: p.phases[2].durationMs,
  holdOut: p.phases[3].durationMs
});

export function TurtleBreathing({
  initialPattern = DEFAULT_PATTERN.id,
  initialSound = DEFAULT_SOUND_PROFILE,
  initialVolume = 0.8,
  speed = 1,
  showHumanGuide = true,
  initialSeaPattern = false
}: TurtleBreathingProps) {
  const rigRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [patternId, setPatternId] = useState(initialPattern);
  const [customTimings, setCustomTimings] = useState(toTimings);
  const [soundProfile, setSoundProfile] = useState<SoundProfileId>(initialSound);
  const [volume, setVolume] = useState(initialVolume);
  const [showSeaPattern, setShowSeaPattern] = useState(initialSeaPattern);
  const [seaPatternStyle, setSeaPatternStyle] = useState<SeaPatternStyle>('auto');
  const [isJournalOpen, setIsJournalOpen] = useState(false);

  const pattern = useMemo(
    () => (patternId === 'custom' ? fromFourPhase(customTimings, customBase) : (findPattern(patternId) ?? DEFAULT_PATTERN)),
    [patternId, customTimings]
  );

  const { session, running, phase, toggle } = useBreathingSession(rigRef, { pattern, soundProfile, volume, speed });
  const fullscreen = useFullscreen(stageRef);

  return (
    <div className="turtle-breathing-widget">
      {/* className must stay static: the fullscreen controller toggles a fallback class on this element. */}
      <div className="turtle-stage" ref={stageRef}>
        <div className="turtle-stage-actions">
          <button
            type="button"
            className={`btn-pill sea-toggle-btn ${showSeaPattern ? 'active' : ''}`}
            onClick={() => setShowSeaPattern(v => !v)}
            aria-pressed={showSeaPattern}
            title="Tika schwimmt im Atemrhythmus und zeichnet ein Muster ins Meer"
          >
            🌀 Meeresmuster
          </button>
          {fullscreen.active && (
            <button type="button" className="stage-btn" onClick={toggle} aria-label={running ? 'Pause' : 'Weiteratmen'}>
              {running ? '⏸' : '▶'}
            </button>
          )}
          <button
            type="button"
            className="stage-btn"
            onClick={fullscreen.toggle}
            aria-pressed={fullscreen.active}
            aria-label={fullscreen.active ? 'Vollbild beenden' : 'Vollbild'}
            title={fullscreen.active ? 'Vollbild beenden (Esc)' : 'Vollbild'}
          >
            {fullscreen.active ? '✕' : '⛶'}
          </button>
        </div>
        <div className="breath-scene">
          <div className="turtle-svg-container" ref={rigRef}>
            <TurtleRigSvg />
          </div>
          {showHumanGuide && <HumanGuide session={session} />}
        </div>
        {showSeaPattern && (
          <SeaPatternCanvas
            session={session}
            patternStyle={seaPatternStyle}
            onPatternStyleChange={setSeaPatternStyle}
            onOpenJournal={() => setIsJournalOpen(true)}
          />
        )}
        <PhaseBadge session={session} phase={phase} />
      </div>
      <BreathingControls
        running={running}
        onToggle={toggle}
        patternId={pattern.id}
        onPatternChange={setPatternId}
        customTimings={customTimings}
        onCustomTimingsChange={setCustomTimings}
        soundProfile={soundProfile}
        onSoundProfileChange={setSoundProfile}
        volume={volume}
        onVolumeChange={setVolume}
      />
      <MicBreathPanel session={session} />
      <small className="technique-desc">{pattern.description}</small>
      {pattern.safety?.notes && <small className="technique-safety">{pattern.safety.notes}</small>}
      <BreathJournalModal isOpen={isJournalOpen} onClose={() => setIsJournalOpen(false)} />
    </div>
  );
}
