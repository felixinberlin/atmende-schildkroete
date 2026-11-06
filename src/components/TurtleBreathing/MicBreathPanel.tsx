import React, { useEffect, useRef, useState } from 'react';
import {
  BreathDetector,
  MicBreathBridge,
  type BreathCycle,
  type BreathPhaseEvent,
  type BreathingSession
} from '../../breathing';

export interface MicBreathPanelProps {
  session: BreathingSession | null;
}

const PHASE_LABELS: Record<BreathPhaseEvent['phase'], { label: string; color: string }> = {
  idle: { label: 'Warte auf Atemgeräusch …', color: '#94a3b8' },
  inhale: { label: '🌿 Einatmen erkannt (shii …)', color: '#5eead4' },
  transition: { label: '✧ Übergang / Halten', color: '#fde047' },
  exhale: { label: '🌊 Ausatmen erkannt (… haa)', color: '#38bdf8' },
  pause: { label: '♡ Atempause', color: '#a5b4fc' }
};

export function MicBreathPanel({ session }: MicBreathPanelProps) {
  const [micActive, setMicActive] = useState(false);
  const [calStage, setCalStage] = useState<'idle' | 'noise' | 'breath' | 'done'>('idle');
  const [sensitivity, setSensitivity] = useState(0.28);
  const [livePhase, setLivePhase] = useState<BreathPhaseEvent>({
    phase: 'idle',
    energy: 0,
    centroid: 500,
    phaseTime: 0
  });
  const [lastCycle, setLastCycle] = useState<BreathCycle | null>(null);
  const [cycleCount, setCycleCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const detectorRef = useRef<BreathDetector | null>(null);
  const bridgeRef = useRef<MicBreathBridge | null>(null);

  // Keep bridge pattern synced with session pattern
  useEffect(() => {
    if (session && bridgeRef.current) {
      bridgeRef.current.setPattern(session.pattern);
    }
  }, [session, session?.pattern]);

  // Clean up mic on unmount
  useEffect(() => {
    return () => {
      detectorRef.current?.stop();
      detectorRef.current = null;
      session?.injectExternalSample(null);
    };
  }, [session]);

  async function toggleMic() {
    if (!session) return;
    if (micActive) {
      detectorRef.current?.stop();
      detectorRef.current = null;
      setMicActive(false);
      setCalStage('idle');
      session.injectExternalSample(null);
      session.start();
      return;
    }

    setErrorMsg(null);
    const detector = new BreathDetector({ thresholdFactor: sensitivity });
    const ok = await detector.start();
    if (!ok) {
      setErrorMsg('Mikrofonzugriff wurde verweigert oder nicht gefunden.');
      return;
    }

    // Pause internal clock so microphone drives Tika and the Sea Pattern
    session.pause();
    const bridge = new MicBreathBridge(session.pattern);
    detectorRef.current = detector;
    bridgeRef.current = bridge;

    detector.onPhase(evt => {
      setLivePhase(evt);
      const sample = bridge.toBreathSample(evt);
      session.injectExternalSample(sample);
    });

    detector.onCycle(cycle => {
      bridge.notifyCompletedCycle();
      setLastCycle(cycle);
      setCycleCount(c => c + 1);
    });

    detector.enableImmediateDetection();
    detector.startDetection();
    setMicActive(true);
    setCalStage('done');
  }

  async function runCalibration() {
    const detector = detectorRef.current;
    if (!detector) return;
    detector.stopDetection();
    await detector.calibrate(stage => setCalStage(stage));
    detector.startDetection();
  }

  const phaseMeta = PHASE_LABELS[livePhase.phase];

  return (
    <div className="mic-breath-panel">
      <div className="mic-header-row">
        <div>
          <span className="eyebrow">SHII·HAA BREATH DETECTION</span>
          <h3>🎙️ Mikrofon-Atemsteuerung</h3>
        </div>
        <button
          type="button"
          className={`btn-pill ${micActive ? 'active' : ''}`}
          onClick={() => void toggleMic()}
        >
          {micActive ? '⏹ Mikrofon beenden (Timer)' : '🎙️ Mit eigenem Atem steuern'}
        </button>
      </div>

      {errorMsg && <p className="mic-error">{errorMsg}</p>}

      {!micActive ? (
        <p className="muted" style={{ margin: '6px 0 0' }}>
          Optional: Lass Tika und das Meeresmuster direkt auf dein echtes Ein- und Ausatmen über das Mikrofon reagieren (FFT-Energie + Spektral-Schwerpunkt, 100 % lokal im Browser).
        </p>
      ) : (
        <div className="mic-live-telemetry">
          <div className="mic-phase-row">
            <span className="mic-phase-badge" style={{ borderColor: phaseMeta.color, color: phaseMeta.color }}>
              {phaseMeta.label}
            </span>
            <span className="mic-centroid-badge">
              Schwerpunkt: <strong>{Math.round(livePhase.centroid)} Hz</strong>
            </span>
          </div>

          <div className="mic-energy-track" title="Atem-Energie (FFT 150–2500 Hz + RMS)">
            <div
              className="mic-energy-fill"
              style={{
                width: `${Math.round(livePhase.energy * 100)}%`,
                background: phaseMeta.color
              }}
            />
          </div>

          <div className="mic-controls-row">
            <label className="mic-sens-label">
              <span>
                Empfindlichkeit ({Math.round((1 - sensitivity) * 100)}% — höher für leise Nasenatmung)
              </span>
              <input
                type="range"
                min={8}
                max={75}
                value={Math.round(sensitivity * 100)}
                onChange={e => {
                  const factor = Number(e.target.value) / 100;
                  setSensitivity(factor);
                  detectorRef.current?.setThresholdFactor(factor);
                }}
              />
            </label>
            <button
              type="button"
              className="btn-pill"
              disabled={calStage === 'noise' || calStage === 'breath'}
              onClick={() => void runCalibration()}
            >
              {calStage === 'noise'
                ? '⏳ 2s Stille messen …'
                : calStage === 'breath'
                  ? '🌬️ 4s kräftig atmen …'
                  : '🎯 6s Neu kalibrieren'}
            </button>
          </div>

          {lastCycle && (
            <div className="mic-cycle-summary">
              <strong>Letzter erkannter Atemzug (#{cycleCount}):</strong>{' '}
              <span>Ein {(lastCycle.inhaleMs / 1000).toFixed(1)}s</span> ·{' '}
              {lastCycle.holdInMs > 0 && <span>Halt {(lastCycle.holdInMs / 1000).toFixed(1)}s · </span>}
              <span>Aus {(lastCycle.exhaleMs / 1000).toFixed(1)}s</span> ·{' '}
              <span>Konfidenz {lastCycle.confidence}%</span>{' '}
              <small>({lastCycle.method === 'peak' ? 'Peak-Fallback' : 'Schwellenwert'})</small>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
