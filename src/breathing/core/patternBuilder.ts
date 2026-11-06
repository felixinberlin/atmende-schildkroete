/**
 * Fluent builder for programmatic, type-safe BreathingPattern construction.
 * Validates automatically against BreathingPatternSchema upon build().
 */
import {
  parsePattern,
  SCHEMA_VERSION,
  type BreathingPattern,
  type BreathPhase,
  type BreathingRegion,
  type Easing,
  type ExhaleStyle,
  type GuideArms,
  type Segment
} from './schema';

export interface PhaseOptions {
  label?: string;
  cue?: string;
  easing?: Easing;
  airway?: 'nose' | 'mouth';
  targetVolume?: number;
  segments?: Segment[];
}

export class BreathingPatternBuilder {
  private _id: string;
  private _name: string;
  private _shortName?: string;
  private _description?: string;
  private _locale: string = 'de-DE';
  private _tags: string[] = [];
  private _exhaleStyle?: ExhaleStyle;
  private _guideArms?: GuideArms;
  private _safetyNotes?: string;
  private _contraindications?: string[];
  private _phases: BreathPhase[] = [];

  constructor(id: string, name: string) {
    this._id = id;
    this._name = name;
  }

  setShortName(shortName: string): this {
    this._shortName = shortName;
    return this;
  }

  setDescription(description: string): this {
    this._description = description;
    return this;
  }

  setLocale(locale: string): this {
    this._locale = locale;
    return this;
  }

  addTag(tag: string): this {
    if (!this._tags.includes(tag)) this._tags.push(tag);
    return this;
  }

  setTags(tags: string[]): this {
    this._tags = [...tags];
    return this;
  }

  setExhaleStyle(style: ExhaleStyle): this {
    this._exhaleStyle = style;
    return this;
  }

  setGuideArms(arms: GuideArms): this {
    this._guideArms = arms;
    return this;
  }

  setSafety(notes?: string, contraindications?: string[]): this {
    this._safetyNotes = notes;
    this._contraindications = contraindications ? [...contraindications] : undefined;
    return this;
  }

  /**
   * Adds an Inhale phase.
   * @param durationMs Duration in milliseconds (speed 1).
   * @param options Optional label, easing, airway, or 3-part segments.
   */
  inhale(durationMs: number, options?: PhaseOptions): this {
    this._phases.push({
      kind: 'inhale',
      durationMs,
      targetVolume: options?.targetVolume ?? 1,
      easing: options?.easing ?? 'easeInOutCubic',
      airway: options?.airway ?? 'nose',
      label: options?.label,
      cue: options?.cue,
      segments: options?.segments
    });
    return this;
  }

  /**
   * Adds a Hold phase (breath retention with full or current lungs).
   * Note: targetVolume is omitted as holds preserve volume.
   * @param durationMs Duration in milliseconds (speed 1).
   */
  hold(durationMs: number, options?: Pick<PhaseOptions, 'label' | 'cue'>): this {
    this._phases.push({
      kind: 'hold',
      durationMs,
      label: options?.label,
      cue: options?.cue
    });
    return this;
  }

  /**
   * Adds an Exhale phase.
   * @param durationMs Duration in milliseconds (speed 1).
   * @param options Optional label, easing, or airway.
   */
  exhale(durationMs: number, options?: PhaseOptions): this {
    this._phases.push({
      kind: 'exhale',
      durationMs,
      targetVolume: options?.targetVolume ?? 0,
      easing: options?.easing ?? 'easeInOutCubic',
      airway: options?.airway ?? 'mouth',
      label: options?.label,
      cue: options?.cue,
      segments: options?.segments
    });
    return this;
  }

  /**
   * Adds a resting Hold phase after exhale (retention on empty lungs / pause).
   * @param durationMs Duration in milliseconds (speed 1).
   */
  pause(durationMs: number, options?: Pick<PhaseOptions, 'label' | 'cue'>): this {
    this._phases.push({
      kind: 'hold',
      durationMs,
      label: options?.label ?? 'Ruhe',
      cue: options?.cue
    });
    return this;
  }

  /**
   * Helper to configure a 3-part Dirga inhale (abdominal -> thoracic -> clavicular).
   */
  dirgaInhale(
    durationMs: number,
    weights = { abdominal: 0.35, thoracic: 0.35, clavicular: 0.3 }
  ): this {
    const totalWeight = weights.abdominal + weights.thoracic + weights.clavicular;
    const dur = (ratio: number) => Math.round((ratio / totalWeight) * durationMs);

    const segments: Segment[] = [
      { durationMs: dur(weights.abdominal), region: 'abdominal', label: 'Bauch' },
      { durationMs: dur(weights.thoracic), region: 'thoracic', label: 'Brust' },
      { durationMs: dur(weights.clavicular), region: 'clavicular', label: 'Schlüsselbeine' }
    ];

    return this.inhale(durationMs, {
      label: '3-Stufen-Einatmung',
      segments,
      easing: 'linear'
    });
  }

  /**
   * Validates and returns the compiled BreathingPattern.
   * Throws if pattern is malformed or has zero duration.
   */
  build(): BreathingPattern {
    return parsePattern({
      schemaVersion: SCHEMA_VERSION,
      id: this._id,
      name: this._name,
      shortName: this._shortName,
      description: this._description,
      locale: this._locale,
      tags: this._tags.length ? this._tags : undefined,
      exhaleStyle: this._exhaleStyle,
      guide: this._guideArms ? { arms: this._guideArms } : undefined,
      safety:
        this._safetyNotes || this._contraindications?.length
          ? { notes: this._safetyNotes, contraindications: this._contraindications }
          : undefined,
      phases: this._phases
    });
  }
}
