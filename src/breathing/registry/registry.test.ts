import { describe, expect, it } from 'vitest';
import { CharacterRigRegistry, characterRigRegistry } from './CharacterRigRegistry';
import { SoundProfileRegistry, soundProfileRegistry } from './SoundProfileRegistry';
import type { BreathRenderer } from '../core/BreathingSession';

describe('CharacterRigRegistry', () => {
  it('has built-in tika and human-guide rigs pre-registered', () => {
    expect(characterRigRegistry.has('tika')).toBe(true);
    expect(characterRigRegistry.has('human-guide')).toBe(true);
    const rigs = characterRigRegistry.list();
    expect(rigs.some(r => r.id === 'tika')).toBe(true);
    expect(rigs.some(r => r.id === 'human-guide')).toBe(true);
  });

  it('allows registering and discovering custom rigs', () => {
    const registry = new CharacterRigRegistry();
    const mockRenderer: BreathRenderer = {
      render: () => {},
      destroy: () => {}
    };

    registry.register({
      id: 'whale',
      name: 'Wal-Atembegleiter',
      description: 'Ein sanfter Blauwal für tiefe Ozeanatmung.',
      createRenderer: () => mockRenderer
    });

    expect(registry.has('whale')).toBe(true);
    const whaleRig = registry.get('whale');
    expect(whaleRig?.name).toBe('Wal-Atembegleiter');

    const mockContainer = {} as HTMLElement;
    const created = registry.create('whale', mockContainer);
    expect(created).toBe(mockRenderer);

    registry.unregister('whale');
    expect(registry.has('whale')).toBe(false);
  });

  it('throws when creating an unregistered rig', () => {
    const registry = new CharacterRigRegistry();
    const mockContainer = {} as HTMLElement;
    expect(() => registry.create('unknown-alien', mockContainer)).toThrowError(/Unbekannter Character-Rig/);
  });
});

describe('SoundProfileRegistry', () => {
  it('contains standard audio profiles by default', () => {
    expect(soundProfileRegistry.has('ocean_master')).toBe(true);
    expect(soundProfileRegistry.has('breath_pure')).toBe(true);
    expect(soundProfileRegistry.has('chimes_bell')).toBe(true);
    expect(soundProfileRegistry.has('synth_webaudio')).toBe(true);
    expect(soundProfileRegistry.has('mute')).toBe(true);
  });

  it('registers custom sound profile and protects defaults from unregistration', () => {
    const registry = new SoundProfileRegistry();

    registry.register('rain_ambient', {
      kind: 'samples',
      label: '🌧️ Sommerregen & Donner',
      cues: {
        inhale: [{ file: 'rain_in.mp3', baseDurSec: 4 }],
        exhale: [{ file: 'rain_out.mp3', baseDurSec: 4 }]
      }
    });

    expect(registry.has('rain_ambient')).toBe(true);
    const rain = registry.get('rain_ambient');
    expect(rain?.label).toContain('Sommerregen');

    // Default profiles are protected
    const unregisterOcean = registry.unregister('ocean_master');
    expect(unregisterOcean).toBe(false);
    expect(registry.has('ocean_master')).toBe(true);

    // Custom profile can be unregistered
    const unregisterRain = registry.unregister('rain_ambient');
    expect(unregisterRain).toBe(true);
    expect(registry.has('rain_ambient')).toBe(false);
  });
});
