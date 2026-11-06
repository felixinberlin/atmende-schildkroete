/**
 * Minimal side-view figure (facing right, like Tika) for the human breathing guide.
 * Plain SVG markup, shared by the React app and the standalone player.
 * Parts are addressed via data-part (no global ids except the per-instance clip path).
 *
 * Geometry (viewBox 0 0 240 300): spine/back ≈ x 55, front of torso ≈ x 125.
 * Region bands: clavicular y 84–118, thoracic y 118–166, abdominal y 166–240.
 */
import type { BreathingRegion } from '../core/schema';

export const FIGURE = {
  viewBox: '0 0 240 300',
  backX: 55,
  shoulder: [78, 92] as const,
  /** Resting hand positions (palm on the body wall): standard "one hand on chest, one on belly" cue. */
  hands: { belly: [131, 196], chest: [123, 108] } as const,
  /** Maximum outward/upward movement of the body walls in px; hands ride exactly on these. */
  wall: { bellyX: 7, chestX: 4, chestLift: 2, clavicleLift: 4 } as const,
  /**
   * Raised arms rotate forward and up to overhead (degrees). Slightly past vertical (a reaching-up stretch),
   * so in side view the arm reads clearly behind the head instead of lining up with its outline.
   */
  armRaiseMaxDeg: 195,
  regions: {
    clavicular: { top: 84, bottom: 118 },
    thoracic: { top: 118, bottom: 166 },
    abdominal: { top: 166, bottom: 240 }
  } satisfies Record<BreathingRegion, { top: number; bottom: number }>,
  /** Diaphragm dome endpoints and apex (relaxed → contracted). */
  diaphragm: { left: [58, 170], right: [126, 170], apexRelaxed: 138, apexContracted: 172 },
  /** Airway: nostril → nasal cavity → throat → trachea → down into the torso. */
  airway: 'M 123 44 C 110 47 101 55 99 66 L 97 92 C 96 122 93 152 90 205'
} as const;

const TORSO =
  'M 60 92 C 64 86 72 84 86 84 L 104 84 C 112 85 118 90 121 98 C 127 116 124 146 127 168 C 133 194 131 222 122 240 L 70 240 C 60 226 56 196 56 160 C 55 135 55 110 60 92 Z';

export const REGION_LABELS: Record<BreathingRegion, string> = {
  clavicular: 'Brust',
  thoracic: 'Rippen',
  abdominal: 'Bauch'
};

export const MUSCLE_LABELS = {
  accessory: 'Halsmuskeln',
  intercostals: 'Zwischenrippen-',
  intercostals2: 'muskeln',
  diaphragm: 'Zwerchfell',
  abdominals: 'Bauchmuskeln'
} as const;

/**
 * Theme via CSS custom properties on any ancestor:
 * --hg-ink (outline), --hg-air (air fill/dots), --hg-muscle, --hg-muscle-active, --hg-label.
 */
const FIGURE_CSS = `
.human-guide-svg { overflow: visible; }
.human-guide-svg .hg-body * { fill: none; stroke: var(--hg-ink, #31533e); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.human-guide-svg .hg-body .hg-hand, .human-guide-svg .hg-raised .hg-hand { fill: var(--hg-bg, #f1f5ee); stroke: var(--hg-ink, #31533e); stroke-width: 2; }
.human-guide-svg .hg-raised path { fill: none; stroke: var(--hg-ink, #31533e); stroke-width: 2.4; stroke-linecap: round; }
.human-guide-svg .hg-raised .hg-halo { stroke: var(--hg-bg, #f1f5ee); stroke-width: 8; }
.human-guide-svg .hg-body .hg-eye { fill: var(--hg-ink, #31533e); stroke: none; }
.human-guide-svg .hg-ribs path { stroke-width: 1.3; opacity: 0.55; }
.human-guide-svg .hg-body .hg-legs { opacity: 0.45; }
.human-guide-svg .hg-air-fill rect { fill: var(--hg-air, #38bdf8); opacity: 0.35; }
.human-guide-svg .hg-airway { fill: none; stroke: var(--hg-air, #38bdf8); stroke-width: 1.2; stroke-dasharray: 3 4; opacity: 0.6; }
.human-guide-svg .hg-air-dots circle { fill: var(--hg-air, #38bdf8); }
.human-guide-svg .hg-muscle * { fill: none; stroke: var(--hg-muscle, #c4a59c); stroke-width: 3; stroke-linecap: round; }
.human-guide-svg .hg-muscle-active * { fill: none; stroke: var(--hg-muscle-active, #e4572e); stroke-width: 3.6; stroke-linecap: round; }
.human-guide-svg .hg-labels text { font: 600 14px system-ui, sans-serif; fill: var(--hg-label, #4b6355); }
.human-guide-svg .hg-labels text.is-leading { font-weight: 800; fill: var(--hg-air-label, #0369a1); }
.human-guide-svg .hg-muscle-labels text { font-size: 11.5px; font-weight: 500; }
`;

/** Arm from the fixed shoulder to a hand resting on the body; only the forearm end follows the hand. */
export function armPath(hand: 'belly' | 'chest', dx = 0, dy = 0): string {
  const [sx, sy] = FIGURE.shoulder;
  const [hx, hy] = FIGURE.hands[hand];
  const p = (x: number, y: number) => `${+(x + dx).toFixed(2)} ${+(y + dy).toFixed(2)}`;
  return hand === 'belly'
    ? `M ${sx} ${sy} C 76 120 76 145 80 160 C 94 180 ${p(112, 191)} ${p(hx - 3, hy)}`
    : `M ${sx} ${sy} C 80 108 82 120 86 128 C 100 126 ${p(110, 116)} ${p(hx - 3, hy)}`;
}

const handShape = (part: string, [x, y]: readonly [number, number]) =>
  `<ellipse class="hg-hand" data-part="${part}" cx="${x}" cy="${y}" rx="3.8" ry="8"/>`;

let instance = 0;

/** SVG markup for one guide figure. Each call gets a unique clip-path id. */
export function humanFigureMarkup(): string {
  const clip = `human-torso-clip-${++instance}`;
  const r = FIGURE.regions;
  const band = (region: BreathingRegion) =>
    `<rect data-part="fill-${region}" x="50" y="${r[region].top}" width="90" height="${r[region].bottom - r[region].top}"/>`;
  const ribs = [128, 142, 156]
    .map(y => `<path data-part="rib" data-y="${y}" d="M 58 ${y} C 80 ${y - 6} 104 ${y - 4} 124 ${y + 4}"/>`)
    .join('');
  const intercostals = [135, 149]
    .map(y => `<path d="M 100 ${y - 4} L 108 ${y + 3} M 110 ${y - 3} L 118 ${y + 4}"/>`)
    .join('');

  return `<svg class="human-guide-svg" viewBox="${FIGURE.viewBox}" role="img" aria-label="Atemführung: So fließt die Luft und so arbeiten die Atemmuskeln">
  <style>${FIGURE_CSS}</style>
  <defs><clipPath id="${clip}"><path d="${TORSO}"/></clipPath></defs>

  <!-- air fill per region, clipped to the torso -->
  <g class="hg-air-fill" clip-path="url(#${clip})">${band('clavicular')}${band('thoracic')}${band('abdominal')}</g>

  <!-- body outline -->
  <g class="hg-body">
    <circle cx="96" cy="42" r="22"/>
    <path d="M 117 36 L 125 45 L 117 48"/>
    <circle class="hg-eye" cx="106" cy="38" r="1.8"/>
    <path d="M 86 63 L 86 84 M 104 63 L 104 84"/>
    <path data-part="back" d="M 86 84 C 72 84 64 86 60 92 C 55 110 55 135 56 160 C 56 196 60 226 70 240 L 122 240"/>
    <path data-part="chest-wall" d="M 104 84 C 112 85 118 90 121 98 C 127 116 124 146 127 168"/>
    <path class="hg-legs" d="M 70 240 C 100 246 130 246 158 248 L 160 292 M 122 240 L 150 240"/>
    <path data-part="belly-wall" d="M 127 168 C 133 194 131 222 122 240"/>
    <path data-part="clavicle" d="M 92 89 L 116 92"/>
    <g class="hg-ribs">${ribs}</g>

    <!-- arms: default hands on belly + chest, or raised overhead (opt-in per pattern) -->
    <g data-part="arms-hands-on-body">
      <path data-part="arm-belly" d="${armPath('belly')}"/>
      <path data-part="arm-chest" d="${armPath('chest')}"/>
      ${handShape('hand-belly', FIGURE.hands.belly)}
      ${handShape('hand-chest', FIGURE.hands.chest)}
    </g>
  </g>

  <!-- muscles: base stroke + highlight overlay whose opacity = activation -->
  <g class="hg-muscle">
    <path data-part="accessory" d="M 84 54 C 88 66 94 76 100 86"/>
    <g data-part="intercostals">${intercostals}</g>
    <path data-part="diaphragm" d=""/>
    <path data-part="abdominals" d="M 121 182 C 126 196 125 212 116 226"/>
  </g>
  <g class="hg-muscle-active">
    <path data-part="accessory-active" d="M 84 54 C 88 66 94 76 100 86"/>
    <g data-part="intercostals-active">${intercostals}</g>
    <path data-part="diaphragm-active" d=""/>
    <path data-part="abdominals-active" d="M 121 182 C 126 196 125 212 116 226" opacity="0"/>
  </g>

  <!-- airway and air particles -->
  <path class="hg-airway" data-part="airway" d="${FIGURE.airway}"/>
  <g class="hg-air-dots" data-part="air-dots"></g>

  <!-- raised arms are drawn in front of the head; the halo keeps the line art readable where they cross -->
  <g class="hg-raised" data-part="arms-raised" style="display: none">
    <path class="hg-halo" d="M 78 92 C 81 112 84 132 86 150"/>
    <path d="M 78 92 C 81 112 84 132 86 150"/>
    <circle class="hg-hand" cx="87" cy="156" r="4.5"/>
  </g>

  <!-- labels: regions left, muscles right -->
  <g class="hg-labels" text-anchor="end">
    <text data-part="label-clavicular" x="48" y="104">${REGION_LABELS.clavicular}</text>
    <text data-part="label-thoracic" x="48" y="146">${REGION_LABELS.thoracic}</text>
    <text data-part="label-abdominal" x="48" y="206">${REGION_LABELS.abdominal}</text>
  </g>
  <g class="hg-labels hg-muscle-labels" text-anchor="start">
    <text data-part="mlabel-accessory" x="140" y="64">${MUSCLE_LABELS.accessory}</text>
    <text data-part="mlabel-intercostals" x="140" y="140">${MUSCLE_LABELS.intercostals}<tspan x="140" dy="13">${MUSCLE_LABELS.intercostals2}</tspan></text>
    <text data-part="mlabel-diaphragm" x="140" y="178">${MUSCLE_LABELS.diaphragm}</text>
    <text data-part="mlabel-abdominals" x="140" y="215">${MUSCLE_LABELS.abdominals}</text>
  </g>
</svg>`;
}
