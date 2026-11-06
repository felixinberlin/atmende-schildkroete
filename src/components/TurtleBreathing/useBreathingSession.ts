import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  createTurtleSession,
  type AudioEngine,
  type BreathingPattern,
  type BreathingSession,
  type PhaseChange,
  type SoundProfileId
} from '../../breathing';

export interface BreathingSettings {
  pattern: BreathingPattern;
  soundProfile: SoundProfileId;
  volume: number;
  speed: number;
}

export interface BreathingSessionState {
  session: BreathingSession | null;
  running: boolean;
  /** Last entered phase. Updates once per phase, not per frame. */
  phase: PhaseChange | null;
  toggle: () => void;
}

/**
 * Owns a turtle BreathingSession bound to `rootRef`. Settings are synced into the live session,
 * so changing them never recreates it. React state only changes on phase/run-state changes.
 */
export function useBreathingSession(rootRef: RefObject<Element | null>, settings: BreathingSettings): BreathingSessionState {
  const [session, setSession] = useState<BreathingSession | null>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const [running, setRunning] = useState(true);
  const [phase, setPhase] = useState<PhaseChange | null>(null);
  const initial = useRef(settings);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const { pattern, soundProfile, volume, speed } = initial.current;
    const { session: s, audio } = createTurtleSession(root, {
      pattern,
      speed,
      autoStart: false,
      audio: { profile: soundProfile, volume, assetBase: `${import.meta.env.BASE_URL}sounds/` }
    });
    const offPhase = s.on('phase', setPhase);
    const offState = s.on('state', e => setRunning(e.running));
    audio.unlock();
    s.start();
    audioRef.current = audio;
    setSession(s);
    return () => {
      offPhase();
      offState();
      s.destroy();
      audioRef.current = null;
      setSession(null);
    };
  }, [rootRef]);

  useEffect(() => {
    if (session && session.pattern !== settings.pattern) session.setPattern(settings.pattern);
  }, [session, settings.pattern]);

  useEffect(() => {
    session?.setSpeed(settings.speed);
  }, [session, settings.speed]);

  useEffect(() => {
    audioRef.current?.setProfile(settings.soundProfile);
  }, [session, settings.soundProfile]);

  useEffect(() => {
    audioRef.current?.setVolume(settings.volume);
  }, [session, settings.volume]);

  const toggle = () => {
    audioRef.current?.unlock();
    session?.toggle();
  };

  return { session, running, phase, toggle };
}
