/**
 * Extensible Sound Profile Registry.
 * Allows custom audio soundscapes, ambient tracks, or procedural synthesis algorithms
 * to be registered and selected dynamically.
 */
import {
  SOUND_PROFILES,
  type SoundProfile,
  type SoundProfileId
} from '../audio/profiles';

export interface SoundProfileDefinition {
  id: string;
  profile: SoundProfile;
}

export class SoundProfileRegistry {
  private profiles = new Map<string, SoundProfile>();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    for (const [id, profile] of Object.entries(SOUND_PROFILES)) {
      this.profiles.set(id, profile);
    }
  }

  register(id: string, profile: SoundProfile): this {
    this.profiles.set(id, profile);
    return this;
  }

  unregister(id: string): boolean {
    // Prevent unregistering the default profile
    if (id === 'ocean_master' || id === 'mute') return false;
    return this.profiles.delete(id);
  }

  get(id: string): SoundProfile | undefined {
    return this.profiles.get(id);
  }

  has(id: string): boolean {
    return this.profiles.has(id);
  }

  list(): Array<{ id: string; profile: SoundProfile }> {
    return Array.from(this.profiles.entries()).map(([id, profile]) => ({ id, profile }));
  }
}

/** Singleton sound profile registry */
export const soundProfileRegistry = new SoundProfileRegistry();
