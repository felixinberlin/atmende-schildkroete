/**
 * Binding between the turtle pose and the SVG rig.
 * RIG_PARTS is the single source of truth for element ids and joint pivots
 * (documented in docs/turtle_svg_modularity.md).
 */
import type { BreathRenderer } from '../core/BreathingSession';
import type { BreathSample } from '../core/timeline';
import { computeTurtlePose, type PartTransform, type RigPartKey } from './pose';

export interface RigPart {
  id: string;
  /** Joint pivot in SVG user units. */
  pivot: readonly [number, number];
}

export const RIG_PARTS: Record<RigPartKey, RigPart> = {
  character: { id: 'layer-turtle-character', pivot: [400, 320] },
  guides: { id: 'layer-guides', pivot: [400, 300] },
  plastron: { id: 'rig-plastron', pivot: [380, 320] },
  carapace: { id: 'rig-carapace', pivot: [380, 285] },
  headNeck: { id: 'rig-head-neck', pivot: [470, 310] },
  eye: { id: 'rig-eye', pivot: [605, 235] },
  flipperFrontRt: { id: 'rig-flipper-front-rt', pivot: [470, 320] },
  flipperFrontLt: { id: 'rig-flipper-front-lt', pivot: [470, 250] },
  flipperRearRt: { id: 'rig-flipper-rear-rt', pivot: [245, 335] },
  flipperRearLt: { id: 'rig-flipper-rear-lt', pivot: [270, 290] },
  // Bubbles are positioned absolutely from the nostril, so they scale around their own origin.
  breathFx: { id: 'rig-breath-fx', pivot: [0, 0] }
};

type BoundRig = Partial<Record<RigPartKey, SVGElement>>;

export function bindRig(root: ParentNode): BoundRig {
  const rig: BoundRig = {};
  for (const [key, part] of Object.entries(RIG_PARTS) as [RigPartKey, RigPart][]) {
    const el = root.querySelector<SVGElement>(`#${part.id}`);
    if (!el) continue;
    el.style.transformBox = 'view-box';
    el.style.transformOrigin = `${part.pivot[0]}px ${part.pivot[1]}px`;
    rig[key] = el;
  }
  return rig;
}

const fmt = (n: number) => +n.toFixed(3);

export function toCssTransform({ tx = 0, ty = 0, rotate = 0, scaleX = 1, scaleY = 1 }: PartTransform): string {
  return `translate(${fmt(tx)}px, ${fmt(ty)}px) rotate(${fmt(rotate)}deg) scale(${fmt(scaleX)}, ${fmt(scaleY)})`;
}

export function applyPartTransform(el: SVGElement, t: PartTransform): void {
  el.style.transform = toCssTransform(t);
  if (t.opacity !== undefined) el.style.opacity = String(fmt(t.opacity));
}

export interface TurtleRendererOptions {
  reducedMotion?: boolean;
}

/** Renders breath samples onto an SVG that contains the Tika rig ids. */
export class TurtleRenderer implements BreathRenderer {
  private readonly rig: BoundRig;

  constructor(
    root: ParentNode,
    private readonly options: TurtleRendererOptions = {}
  ) {
    this.rig = bindRig(root);
  }

  render(sample: BreathSample, elapsedMs: number): void {
    const pose = computeTurtlePose(sample, { elapsedMs, reducedMotion: this.options.reducedMotion });
    for (const [key, el] of Object.entries(this.rig) as [RigPartKey, SVGElement][]) {
      applyPartTransform(el, pose[key]);
    }
  }
}
