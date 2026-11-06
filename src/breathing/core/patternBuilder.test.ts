import { describe, expect, it } from 'vitest';
import { BreathingPatternBuilder } from './patternBuilder';
import { isHoldFree } from './schema';

describe('BreathingPatternBuilder', () => {
  it('builds a valid 4-phase box breathing pattern', () => {
    const pattern = new BreathingPatternBuilder('box-test', 'Box Atmung Test')
      .setShortName('Box 4-4-4-4')
      .setDescription('Vier gleich lange Phasen zur Beruhigung')
      .setLocale('de-DE')
      .addTag('fokus')
      .addTag('entspannung')
      .setExhaleStyle('gentle')
      .setGuideArms('hands-on-body')
      .inhale(4000, { label: 'Einatmen', airway: 'nose' })
      .hold(4000, { label: 'Halten' })
      .exhale(4000, { label: 'Ausatmen', airway: 'mouth' })
      .pause(4000, { label: 'Ruhe' })
      .build();

    expect(pattern.id).toBe('box-test');
    expect(pattern.name).toBe('Box Atmung Test');
    expect(pattern.shortName).toBe('Box 4-4-4-4');
    expect(pattern.phases).toHaveLength(4);
    expect(pattern.phases[0].durationMs).toBe(4000);
    expect(pattern.phases[0].kind).toBe('inhale');
    expect(pattern.phases[0].targetVolume).toBe(1);
    expect(pattern.phases[1].durationMs).toBe(4000);
    expect(pattern.phases[1].kind).toBe('hold');
    expect(pattern.phases[2].durationMs).toBe(4000);
    expect(pattern.phases[2].kind).toBe('exhale');
    expect(pattern.phases[2].targetVolume).toBe(0);
    expect(pattern.phases[3].durationMs).toBe(4000);
    expect(pattern.phases[3].kind).toBe('hold');
    expect(isHoldFree(pattern)).toBe(false);
  });

  it('builds a 3-stage Dirga Pranayama pattern using dirgaInhale', () => {
    const pattern = new BreathingPatternBuilder('dirga-custom', 'Drei-Stufen-Wellenatmung')
      .setShortName('Dirga 3-Stufen')
      .dirgaInhale(6000)
      .hold(2000, { label: 'Stille Woge' })
      .exhale(6000, { label: 'Vollständig Ausströmen' })
      .build();

    expect(pattern.phases).toHaveLength(3);
    const inhalePhase = pattern.phases[0];
    expect(inhalePhase.kind).toBe('inhale');
    expect(inhalePhase.durationMs).toBe(6000);
    expect(inhalePhase.segments).toBeDefined();
    expect(inhalePhase.segments).toHaveLength(3);
    expect(inhalePhase.segments![0].region).toBe('abdominal');
    expect(inhalePhase.segments![1].region).toBe('thoracic');
    expect(inhalePhase.segments![2].region).toBe('clavicular');

    const totalSegDur = inhalePhase.segments!.reduce((sum, s) => sum + s.durationMs, 0);
    expect(totalSegDur).toBe(6000);
  });

  it('builds a continuous hold-free coherent breathing pattern', () => {
    const pattern = new BreathingPatternBuilder('coherence-test', 'Herz-Kohärenz')
      .inhale(5500, { label: 'Einatmen', easing: 'easeInOutCubic' })
      .exhale(5500, { label: 'Ausatmen', easing: 'easeInOutCubic' })
      .build();

    expect(pattern.phases).toHaveLength(2);
    expect(isHoldFree(pattern)).toBe(true);
  });

  it('validates safety warnings and contraindications', () => {
    const pattern = new BreathingPatternBuilder('kumbhaka-advanced', 'Kumbhaka Atemretention')
      .setSafety('Langes Anhalten bei Bluthochdruck oder Schwangerschaft vermeiden', ['bluthochdruck', 'schwangerschaft'])
      .inhale(4000)
      .hold(16000)
      .exhale(8000)
      .build();

    expect(pattern.safety?.notes).toContain('Bluthochdruck');
    expect(pattern.safety?.contraindications).toEqual(['bluthochdruck', 'schwangerschaft']);
  });

  it('throws a descriptive error when building an empty pattern', () => {
    const builder = new BreathingPatternBuilder('empty-fail', 'Ungültig');
    expect(() => builder.build()).toThrowError(/A pattern needs at least one inhale or exhale/);
  });

  it('throws when pattern id is not a lowercase slug', () => {
    const builder = new BreathingPatternBuilder('INVALID ID WITH SPACES', 'Fehlerhaft').inhale(3000).exhale(3000);
    expect(() => builder.build()).toThrowError(/lowercase slug/);
  });
});
