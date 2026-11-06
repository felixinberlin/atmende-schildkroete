/** Draws a HumanPose onto the figure from ./figure.ts. Plug into a BreathingSession via addRenderer(). */
import type { BreathRenderer } from '../core/BreathingSession';
import { lerp } from '../core/easing';
import { BREATHING_REGIONS, type ExhaleStyle, type GuideArms } from '../core/schema';
import type { BreathSample } from '../core/timeline';
import { FIGURE, armPath, humanFigureMarkup } from './figure';
import { AIR_DOT_COUNT, computeHumanPose } from './pose';

const SVG_NS = 'http://www.w3.org/2000/svg';
const fmt = (n: number) => +n.toFixed(2);

function diaphragmPath(flatten: number): string {
  const { left, right, apexRelaxed, apexContracted } = FIGURE.diaphragm;
  const apex = lerp(apexRelaxed, apexContracted, flatten);
  // Quadratic control point placed so the curve's peak sits at `apex`.
  const control = 2 * apex - (left[1] + right[1]) / 2;
  return `M ${left[0]} ${left[1]} Q ${(left[0] + right[0]) / 2} ${fmt(control)} ${right[0]} ${right[1]}`;
}

export interface HumanGuideOptions {
  reducedMotion?: boolean;
  /** Override the pattern's `guide.arms`. */
  arms?: GuideArms;
  /** Override the pattern's `exhaleStyle`. */
  exhaleStyle?: ExhaleStyle;
}

export class HumanGuideRenderer implements BreathRenderer {
  private readonly root: SVGSVGElement;
  private readonly part: (name: string) => SVGGraphicsElement | null;
  private readonly airway: SVGPathElement;
  private readonly airwayLength: number;
  private readonly dots: SVGCircleElement[] = [];
  private readonly ribs: SVGPathElement[];
  private armsRaised: boolean | null = null;

  /** Mounts the figure into `container` (replacing its content). */
  constructor(
    private readonly container: Element,
    private readonly options: HumanGuideOptions = {}
  ) {
    container.innerHTML = humanFigureMarkup();
    this.root = container.querySelector('svg')!;
    this.part = name => this.root.querySelector<SVGGraphicsElement>(`[data-part="${name}"]`);
    this.airway = this.part('airway') as SVGPathElement;
    this.airwayLength = this.airway.getTotalLength?.() ?? 0;
    this.ribs = [...this.root.querySelectorAll<SVGPathElement>('[data-part="rib"]')];
    const dotGroup = this.part('air-dots')!;
    for (let i = 0; i < AIR_DOT_COUNT; i++) {
      const dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('r', '3.2');
      dotGroup.appendChild(dot);
      this.dots.push(dot);
    }
  }

  render(sample: BreathSample): void {
    const pose = computeHumanPose(sample, this.options);
    const set = (name: string, attr: string, value: string | number) => this.part(name)?.setAttribute(attr, String(value));

    // Air level rises from the bottom of each region band.
    for (const region of BREATHING_REGIONS) {
      const { bottom } = FIGURE.regions[region];
      set(`fill-${region}`, 'transform', `translate(0 ${bottom}) scale(1 ${fmt(pose.fill[region])}) translate(0 ${-bottom})`);
      const label = this.part(`label-${region}`);
      label?.setAttribute('opacity', String(fmt(0.4 + 0.6 * pose.fill[region])));
      label?.classList.toggle('is-leading', pose.leading === region);
    }

    // Body walls move outward from the spine; ribs lift like a bucket handle; collarbones rise.
    const back = FIGURE.backX;
    const { wall } = FIGURE;
    const bellyDx = fmt(wall.bellyX * pose.bellyOut);
    const chestDx = fmt(wall.chestX * pose.chestOut);
    const chestDy = fmt(-wall.chestLift * pose.clavicleLift);
    set('belly-wall', 'transform', `translate(${bellyDx} 0)`);
    set('chest-wall', 'transform', `translate(${chestDx} ${chestDy})`);
    set('clavicle', 'transform', `translate(0 ${fmt(-wall.clavicleLift * pose.clavicleLift)})`);
    for (const rib of this.ribs) {
      const y = Number(rib.dataset.y);
      rib.setAttribute('transform', `rotate(${fmt(-5 * pose.ribLift)} ${back} ${y})`);
    }

    // Arms: hands rest on belly and chest and ride exactly on the walls (shoulder stays fixed),
    // or — opt-in per pattern — the arms rise overhead with the inhale.
    const raised = pose.armsMode === 'raise-on-inhale';
    if (raised !== this.armsRaised) {
      this.armsRaised = raised;
      this.part('arms-hands-on-body')?.setAttribute('display', raised ? 'none' : 'inline');
      const raisedGroup = this.part('arms-raised');
      if (raisedGroup) raisedGroup.style.display = raised ? '' : 'none';
    }
    if (raised) {
      const [sx, sy] = FIGURE.shoulder;
      set('arms-raised', 'transform', `rotate(${fmt(-pose.armAngle)} ${sx} ${sy})`);
    } else {
      set('arm-belly', 'd', armPath('belly', wall.bellyX * pose.bellyHand));
      set('hand-belly', 'transform', `translate(${fmt(wall.bellyX * pose.bellyHand)} 0)`);
      const handDx = wall.chestX * pose.chestHand;
      const handDy = -wall.chestLift * pose.chestHandLift;
      set('arm-chest', 'd', armPath('chest', handDx, handDy));
      set('hand-chest', 'transform', `translate(${fmt(handDx)} ${fmt(handDy)})`);
    }

    // Muscles: diaphragm shape, activation highlights, and gentle active exhale cue.
    const d = diaphragmPath(pose.diaphragmFlatten);
    set('diaphragm', 'd', d);
    set('diaphragm-active', 'd', d);
    set('diaphragm-active', 'opacity', fmt(pose.muscle.diaphragm));
    set('intercostals-active', 'opacity', fmt(pose.muscle.intercostals));
    set('accessory-active', 'opacity', fmt(pose.muscle.accessory));
    set('abdominals', 'transform', `translate(${bellyDx} 0)`);
    set('abdominals-active', 'transform', `translate(${bellyDx} 0)`);
    set('abdominals-active', 'opacity', fmt(pose.muscle.abdominals));
    set('mlabel-diaphragm', 'opacity', fmt(0.4 + 0.6 * pose.muscle.diaphragm));
    set('mlabel-intercostals', 'opacity', fmt(0.4 + 0.6 * pose.muscle.intercostals));
    set('mlabel-accessory', 'opacity', fmt(0.4 + 0.6 * pose.muscle.accessory));
    set('mlabel-abdominals', 'opacity', fmt(0.4 + 0.6 * pose.muscle.abdominals));

    // Air particles follow the airway (in on inhale, out on exhale).
    this.dots.forEach((dot, i) => {
      const a = pose.air[i];
      if (!a || !this.airwayLength) {
        dot.setAttribute('opacity', '0');
        return;
      }
      const p = this.airway.getPointAtLength(a.t * this.airwayLength);
      dot.setAttribute('cx', String(fmt(p.x)));
      dot.setAttribute('cy', String(fmt(p.y)));
      dot.setAttribute('opacity', String(fmt(a.opacity)));
    });
  }

  destroy(): void {
    this.container.innerHTML = '';
  }
}
