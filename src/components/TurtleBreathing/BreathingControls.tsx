import { BUILTIN_PATTERNS, SOUND_PROFILES, isSoundProfileId, type FourPhaseTimings, type SoundProfileId } from '../../breathing';

interface BreathingControlsProps {
  running: boolean;
  onToggle: () => void;
  patternId: string;
  onPatternChange: (id: string) => void;
  customTimings: FourPhaseTimings;
  onCustomTimingsChange: (timings: FourPhaseTimings) => void;
  soundProfile: SoundProfileId;
  onSoundProfileChange: (id: SoundProfileId) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
}

const CUSTOM_FIELDS: { key: keyof FourPhaseTimings; label: string; min: number }[] = [
  { key: 'inhale', label: 'Einatmen', min: 1 },
  { key: 'holdIn', label: 'Halten', min: 0 },
  { key: 'exhale', label: 'Ausatmen', min: 1 },
  { key: 'holdOut', label: 'Ruhe', min: 0 }
];

export function BreathingControls(props: BreathingControlsProps) {
  const { customTimings } = props;
  return (
    <div className="turtle-controls">
      <button type="button" className="btn-pill" onClick={props.onToggle}>
        {props.running ? '⏸ Pause' : '▶ Weiteratmen'}
      </button>

      <select
        className="sound-select"
        value={props.patternId}
        onChange={e => props.onPatternChange(e.target.value)}
        aria-label="Atemtechnik auswählen"
      >
        {BUILTIN_PATTERNS.map(p => (
          <option key={p.id} value={p.id}>
            {p.shortName ?? p.name}
          </option>
        ))}
      </select>

      <select
        className="sound-select"
        value={props.soundProfile}
        onChange={e => isSoundProfileId(e.target.value) && props.onSoundProfileChange(e.target.value)}
        aria-label="Klangprofil auswählen"
      >
        {Object.entries(SOUND_PROFILES).map(([id, profile]) => (
          <option key={id} value={id}>
            {profile.label}
          </option>
        ))}
      </select>

      <label className="turtle-slider">
        Lautstärke
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={props.volume}
          onChange={e => props.onVolumeChange(Number(e.target.value))}
        />
      </label>

      {props.patternId === 'custom' &&
        CUSTOM_FIELDS.map(({ key, label, min }) => (
          <label className="turtle-slider" key={key}>
            {label}: {(customTimings[key] / 1000).toFixed(1)}s
            <input
              type="range"
              min={min}
              max={12}
              step={0.5}
              value={customTimings[key] / 1000}
              onChange={e => props.onCustomTimingsChange({ ...customTimings, [key]: Number(e.target.value) * 1000 })}
            />
          </label>
        ))}
    </div>
  );
}
