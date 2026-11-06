/**
 * Extensible Character Rig Registry.
 * Allows applications to dynamically register, discover, and instantiate visual breath figures
 * (such as Tika the Turtle, the Anatomical Human Guide, or custom marine creatures).
 */
import type { BreathRenderer } from '../core/BreathingSession';
import { bindRig, TurtleRenderer } from '../turtle/rig';
import { HumanGuideRenderer, type HumanGuideOptions } from '../human/HumanGuideRenderer';

export interface CharacterRigDefinition {
  id: string;
  name: string;
  description: string;
  author?: string;
  createRenderer(container: HTMLElement | SVGElement, options?: Record<string, unknown>): BreathRenderer;
}

export class CharacterRigRegistry {
  private rigs = new Map<string, CharacterRigDefinition>();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.register({
      id: 'tika',
      name: 'Tika die Meeres-Schildkröte',
      description: 'Vollständig geriggter Schildkröten-Charakter mit Flossen, Kopf und Panzer-Atmung.',
      createRenderer: (container: HTMLElement | SVGElement) => {
        const svg = container instanceof SVGElement ? container : container.querySelector('svg');
        if (!svg) {
          throw new Error('Turtle renderer requires an SVG element or container with an SVG.');
        }
        return new TurtleRenderer(svg as SVGElement);
      }
    });

    this.register({
      id: 'human-guide',
      name: 'Menschlicher Atembegleiter',
      description: 'Anatomischer Querschnitt mit Zwerchfellkuppel, Rippenhebung und Luftstrom-Partikeln.',
      createRenderer: (container: HTMLElement | SVGElement, options?: Record<string, unknown>) => {
        if (!(container instanceof HTMLElement)) {
          throw new Error('Human guide renderer requires an HTMLElement container.');
        }
        return new HumanGuideRenderer(container, options as HumanGuideOptions);
      }
    });
  }

  register(rig: CharacterRigDefinition): this {
    this.rigs.set(rig.id, rig);
    return this;
  }

  unregister(id: string): boolean {
    return this.rigs.delete(id);
  }

  get(id: string): CharacterRigDefinition | undefined {
    return this.rigs.get(id);
  }

  has(id: string): boolean {
    return this.rigs.has(id);
  }

  list(): CharacterRigDefinition[] {
    return Array.from(this.rigs.values());
  }

  create(id: string, container: HTMLElement | SVGElement, options?: Record<string, unknown>): BreathRenderer {
    const rig = this.get(id);
    if (!rig) {
      throw new Error(`Unbekannter Character-Rig: "${id}". Registrierte Rigs: ${Array.from(this.rigs.keys()).join(', ')}`);
    }
    return rig.createRenderer(container, options);
  }
}

/** Singleton character rig registry instance */
export const characterRigRegistry = new CharacterRigRegistry();
