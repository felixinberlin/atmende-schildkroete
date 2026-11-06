import React, { memo, useEffect, useRef, useState } from 'react';
import type { BreathingSession, PhaseChange } from '../../breathing';
import { TurtleRenderer } from '../../breathing/turtle/rig';
import type { CueKey } from '../../breathing/core/timeline';
import type { CompanionKind } from '../../graph';
import type { OceanBiome, VoyageChapter } from '../../breathing/voyageData';

export interface SpectatorCanvasProps {
  session: BreathingSession | null;
  phase: PhaseChange | null;
  chapter?: VoyageChapter;
  biome?: OceanBiome;
  companion?: CompanionKind;
  companionName?: string;
  companionDialog?: string;
  tikaDialog?: string;
  skyColors?: { top: string; mid: string; bottom: string };
  waterParticles?: string;
  accentColor?: string;
  speed?: number;
}

const CUE_NAMES: Record<CueKey, string> = {
  inhale: '🌿 Einatmen…',
  holdIn: '✧ Sanft halten…',
  exhale: '🌊 Loslassen & ausatmen…',
  holdOut: '♡ Zur Ruhe kommen…'
};

const CUE_COLORS: Record<CueKey, string> = {
  inhale: '#5eead4',
  holdIn: '#fde047',
  exhale: '#38bdf8',
  holdOut: '#c4b5fd'
};

function wrapText(str: string, maxLen = 38): string[] {
  if (!str) return [];
  const words = str.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= maxLen) {
      cur = (cur + ' ' + w).trim();
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export const SpectatorCanvas = memo(function SpectatorCanvas({
  session,
  phase,
  chapter,
  biome,
  companion,
  companionName,
  companionDialog,
  tikaDialog,
  skyColors,
  waterParticles,
  accentColor,
  speed = 1
}: SpectatorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<TurtleRenderer | null>(null);
  const [animTime, setAnimTime] = useState(0);

  // Resolved context props
  const resolvedBiome: OceanBiome = biome ?? chapter?.biome ?? 'sunlit-bay';
  const resolvedCompanion: CompanionKind =
    companion ?? (chapter?.creature as CompanionKind) ?? 'none';
  const resolvedCompanionName: string =
    companionName ??
    chapter?.dialogs?.find(d => d.speaker !== 'tika')?.speakerName ??
    'Wegbegleiter';
  const resolvedCompanionDialog: string | undefined =
    companionDialog ?? chapter?.dialogs?.find(d => d.speaker !== 'tika')?.text;
  const resolvedTikaDialog: string =
    tikaDialog ?? chapter?.tikaQuote ?? 'Ich schwimme ruhig im Takt des Meeres.';
  const resolvedSky = skyColors ?? chapter?.skyColors ?? { top: '#0ea5e9', mid: '#0284c7', bottom: '#03436a' };
  const resolvedParticles = waterParticles ?? chapter?.waterParticles ?? '#7dd3fc';
  const resolvedAccent = accentColor ?? chapter?.accentColor ?? '#2dd4bf';

  // Bind the modular TurtleRenderer to the SVG elements in this container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const renderer = new TurtleRenderer(el);
    rendererRef.current = renderer;

    if (!session) return;
    const unsub = session.addRenderer(renderer);

    return () => {
      unsub();
      rendererRef.current = null;
    };
  }, [session]);

  // Ambient fluid animation loop for creatures, god-rays, and ocean floating
  useEffect(() => {
    let animId: number;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setAnimTime(t => t + dt * speed);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [speed]);

  const activeCue: CueKey = phase?.cue ?? 'inhale';
  const cueLabel = CUE_NAMES[activeCue] ?? 'Tika schwimmt entspannt…';
  const cueColor = CUE_COLORS[activeCue] ?? resolvedAccent;

  const tikaQuoteLines = wrapText(resolvedTikaDialog, 38);
  const companionDialogLines = wrapText(resolvedCompanionDialog ?? '', 36);
  const hasCompanionSpeech = companionDialogLines.length > 0 && resolvedCompanion !== 'none';

  // Undulating floating motion for Tika
  const t = animTime;
  const tikaWaveY = 16 * Math.sin(t * 1.4);
  const tikaTilt = 3 * Math.sin(t * 1.4 - 0.4);

  // Dolphin swimming trajectory
  const dolphinX = ((t * 65 + 150) % 1300) - 200;
  const dolphinY = 150 + 40 * Math.sin(t * 1.6);
  const dolphinRot = 14 * Math.cos(t * 1.6);
  const dolphinFlukeRot = 22 * Math.sin(t * 7);

  // Seahorse bobbing
  const seahorseY = 270 + 22 * Math.sin(t * 1.5);
  const seahorseRot = 5 * Math.sin(t * 1.1);

  // School of fish trajectory (Lissajous)
  const fishBaseX = 240 + 75 * Math.cos(t * 0.9);
  const fishBaseY = 190 + 45 * Math.sin(t * 1.8);

  // Jellyfish pulsing
  const jellyY = 210 + 38 * Math.sin(t * 0.9);
  const jellyScale = 1 + 0.16 * Math.sin(t * 2.8);
  const jellyPulseRot = 6 * Math.sin(t * 1.2);

  // Manta ray gliding
  const mantaX = 1100 - ((t * 42) % 1350);
  const mantaY = 360 + 26 * Math.sin(t * 0.8);
  const mantaWingScale = 1 + 0.18 * Math.sin(t * 2);

  return (
    <div className="spectator-canvas-wrap" ref={containerRef}>
      <svg
        viewBox="0 0 960 540"
        className="spectator-svg-stage"
        role="img"
        aria-label="Tika reist und atmet"
      >
        <defs>
          {/* Dynamic Sky & Ocean Depths Gradient */}
          <linearGradient id="spectator-sky-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={resolvedSky.top} />
            <stop offset="45%" stopColor={resolvedSky.mid} />
            <stop offset="100%" stopColor={resolvedSky.bottom} />
          </linearGradient>

          {/* Underwater God-Rays Gradient */}
          <linearGradient id="godray-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.16} />
            <stop offset="40%" stopColor="#ffffff" stopOpacity={0.07} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
          </linearGradient>

          {/* Caustic Floor Gradient */}
          <radialGradient id="seabed-glow" cx="50%" cy="100%" r="65%">
            <stop offset="0%" stopColor={resolvedAccent} stopOpacity={0.25} />
            <stop offset="100%" stopColor="#000000" stopOpacity={0} />
          </radialGradient>

          {/* Vignette Overlay */}
          <radialGradient id="cinematic-vignette" cx="50%" cy="50%" r="70%">
            <stop offset="60%" stopColor="#000000" stopOpacity={0} />
            <stop offset="100%" stopColor="#020813" stopOpacity={0.55} />
          </radialGradient>

          {/* Tika's Breath Aura */}
          <radialGradient id="tika-breath-aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={cueColor} stopOpacity={0.25} />
            <stop offset="70%" stopColor={cueColor} stopOpacity={0.08} />
            <stop offset="100%" stopColor={cueColor} stopOpacity={0} />
          </radialGradient>

          {/* Turtle belly and bubbles */}
          <linearGradient id="widget-grad-belly" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
          <radialGradient id="widget-grad-bubble" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.9} />
            <stop offset="40%" stopColor="#7dd3fc" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#0284c7" stopOpacity={0.3} />
          </radialGradient>
          <g id="widget-bubble">
            <circle cx="0" cy="0" r="10" fill="url(#widget-grad-bubble)" />
            <circle cx="-3" cy="-3" r="2.8" fill="#ffffff" opacity={0.85} />
            <circle cx="0" cy="0" r="10" fill="none" stroke="#38bdf8" strokeWidth="1.2" opacity={0.7} />
          </g>
        </defs>

        {/* 1. Base Ocean Gradient */}
        <rect width="960" height="540" fill="url(#spectator-sky-grad)" />

        {/* 2. Water Surface Waves (at the top) */}
        <g stroke="#ffffff" strokeWidth="1.8" fill="none" opacity="0.25">
          <path
            d={`M 0,22 Q 160,${20 + 6 * Math.sin(t * 1.5)} 320,22 T 640,22 T 960,22`}
          />
          <path
            d={`M 0,38 Q 200,${36 + 5 * Math.sin(t * 1.2 + 1)} 400,38 T 800,38 T 960,38`}
            opacity="0.6"
          />
        </g>

        {/* 3. Sunlight / Moonlight Rays (God-Rays) */}
        <g opacity={resolvedBiome === 'moonlit-lagoon' ? 0.35 : 0.85}>
          <polygon
            points={`140,0 ${220 + 20 * Math.sin(t * 0.8)},0 ${380 + 35 * Math.sin(t * 0.8)},540 180,540`}
            fill="url(#godray-grad)"
          />
          <polygon
            points={`420,0 ${520 + 25 * Math.cos(t * 0.7)},0 ${700 + 40 * Math.cos(t * 0.7)},540 480,540`}
            fill="url(#godray-grad)"
          />
          <polygon
            points={`700,0 ${790 + 15 * Math.sin(t * 0.6 + 2)},0 ${940 + 25 * Math.sin(t * 0.6 + 2)},540 760,540`}
            fill="url(#godray-grad)"
          />
        </g>

        {/* 4. Ambient Biome Elements (Scenery) */}
        {resolvedBiome === 'sunlit-bay' && (
          <g>
            <path
              d="M 680 540 Q 770 420 860 480 Q 910 440 960 490 L 960 540 Z"
              fill="#064e3b"
              opacity="0.3"
            />
            <path
              d="M 0 540 Q 240 470 510 515 Q 760 490 960 540 Z"
              fill="#022c22"
              opacity="0.45"
            />
          </g>
        )}

        {resolvedBiome === 'kelp-forest' && (
          <g stroke="#047857" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.65">
            <path
              d={`M 90 540 Q ${80 + 18 * Math.sin(t * 1.1)} 380, ${110 + 25 * Math.sin(t * 1.3)} 220 T ${95 + 30 * Math.sin(t * 1.5)} 60`}
            />
            <path
              d={`M 150 540 Q ${165 + 16 * Math.cos(t * 1.2)} 350, ${140 + 22 * Math.cos(t * 1.4)} 180 T ${160 + 28 * Math.cos(t * 1.6)} 80`}
              strokeWidth="6"
            />
            <path
              d={`M 860 540 Q ${875 + 20 * Math.sin(t * 1.2)} 360, ${845 + 26 * Math.sin(t * 1.4)} 200 T ${870 + 32 * Math.sin(t * 1.6)} 70`}
            />
            <path
              d={`M 910 540 Q ${900 + 15 * Math.cos(t * 1.1)} 390, ${925 + 22 * Math.cos(t * 1.3)} 240 T ${895 + 28 * Math.cos(t * 1.5)} 100`}
              strokeWidth="6"
            />
          </g>
        )}

        {resolvedBiome === 'basalt-reef' && (
          <g fill="#082f49" stroke="#0284c7" strokeWidth="1.2" opacity="0.55">
            <polygon points="120,540 100,340 135,320 170,340 150,540" />
            <polygon points="160,540 145,280 180,260 215,280 200,540" />
            <polygon points="205,540 190,360 225,340 260,360 245,540" />
            <polygon points="760,540 740,320 775,300 810,320 790,540" />
            <polygon points="805,540 790,260 825,240 860,260 845,540" />
          </g>
        )}

        {resolvedBiome === 'moonlit-lagoon' && (
          <g>
            <circle cx="820" cy="50" r="32" fill="#c7d2fe" opacity="0.25" />
            <circle cx="820" cy="50" r="18" fill="#e0e7ff" opacity="0.6" />
            <path
              d="M 0 540 Q 300 480 600 520 Q 800 490 960 540 Z"
              fill="#0f172a"
              opacity="0.7"
            />
          </g>
        )}

        {resolvedBiome === 'coral-atoll' && (
          <g stroke="#db2777" strokeWidth="4.5" fill="none" strokeLinecap="round" opacity="0.6">
            <path d="M 120 540 L 120 440 M 120 480 L 80 430 M 120 460 L 160 410 M 80 430 L 60 390 M 160 410 L 180 370" />
            <path d="M 840 540 L 840 430 M 840 470 L 800 420 M 840 450 L 880 400 M 800 420 L 780 380 M 880 400 L 910 360" />
            <circle cx="60" cy="390" r="5" fill="#f472b6" stroke="none" />
            <circle cx="180" cy="370" r="5" fill="#f472b6" stroke="none" />
            <circle cx="780" cy="380" r="5" fill="#f472b6" stroke="none" />
            <circle cx="910" cy="360" r="5" fill="#f472b6" stroke="none" />
          </g>
        )}

        {resolvedBiome === 'sunrise-cliff' && (
          <g>
            <path
              d="M 0 0 L 180 0 Q 140 220 220 380 L 190 540 L 0 540 Z"
              fill="#1c1917"
              opacity="0.6"
            />
            <path
              d="M 190 540 Q 450 490 700 525 Q 850 500 960 540 Z"
              fill="#291404"
              opacity="0.5"
            />
          </g>
        )}

        {/* 5. Seabed Caustic Light Glow */}
        <rect y="460" width="960" height="80" fill="url(#seabed-glow)" />

        {/* 6. Marine Creatures & Companion Friends */}
        {resolvedCompanion === 'mentor-turtle' && (
          <g transform={`translate(200, ${250 + 10 * Math.sin(t * 1.1)}) scale(1.12)`} opacity="0.95">
            {/* Ancient Elder Sea Turtle */}
            <path d="M -50 -10 C -70 -40 -100 -20 -110 5 C -85 10 -60 5 -50 -10 Z" fill="#042f24" />
            <path d="M 40 -35 C 70 -65 110 -35 115 -10 C 90 5 60 -15 40 -35 Z" fill="#042f24" />
            <ellipse cx="0" cy="0" rx="76" ry="52" fill="#064e3b" stroke="#042f24" strokeWidth="2.5" />
            <path d="M -72 5 C -40 25 40 25 72 5 C 60 22 -60 22 -72 5 Z" fill="#d97706" />
            <polygon points="-25,-25 0,-38 25,-25 15,0 -15,0" fill="#047857" stroke="#022c22" strokeWidth="1.5" />
            <polygon points="-40,-5 -18,5 -25,28 -55,18" fill="#059669" stroke="#022c22" strokeWidth="1.5" />
            <polygon points="18,5 40,-5 55,18 25,28" fill="#059669" stroke="#022c22" strokeWidth="1.5" />
            <circle cx="0" cy="-20" r="4.5" fill="#fde047" opacity="0.8" />
            <path d="M 65 -5 C 85 -18 115 -12 125 5 C 115 22 80 18 65 8 Z" fill="#059669" stroke="#042f24" strokeWidth="1.5" />
            <circle cx="112" cy="0" r="4.5" fill="#fef08a" stroke="#064e3b" strokeWidth="1.5" />
            <circle cx="113" cy="0" r="2.5" fill="#1e293b" />
            <circle cx="114" cy="-1" r="1" fill="#ffffff" />
            <circle cx="123" cy="4" r="1.5" fill="#042f24" />
            <path d="M 120 10 C 112 14 105 12 100 10" stroke="#042f24" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path
              d="M 40 10 C 70 35, 95 65, 85 95 C 65 95, 45 60, 25 35 Z"
              fill="#059669"
              stroke="#042f24"
              strokeWidth="2"
              transform={`rotate(${14 * Math.sin(t * 1.3)}, 40, 10)`}
            />
          </g>
        )}

        {resolvedCompanion === 'friend-turtle' && (
          <g transform={`translate(210, ${270 + 12 * Math.sin(t * 1.5 + 0.6)}) scale(0.92)`} opacity="0.95">
            {/* Friendly Young Turtle */}
            <ellipse cx="0" cy="0" rx="60" ry="42" fill="#059669" stroke="#047857" strokeWidth="2" />
            <path d="M -58 4 C -30 20 30 20 58 4 C 48 18 -48 18 -58 4 Z" fill="#eab308" />
            <polygon points="-20,-20 0,-30 20,-20 12,0 -12,0" fill="#10b981" />
            <circle cx="0" cy="-16" r="3" fill="#a7f3d0" />
            <path d="M 50 -4 C 68 -14 92 -10 100 4 C 92 18 64 15 50 6 Z" fill="#10b981" />
            <circle cx="88" cy="0" r="4.5" fill="#ffffff" stroke="#065f46" strokeWidth="1.5" />
            <circle cx="89" cy="0" r="2.8" fill="#1e293b" />
            <circle cx="90" cy="-1" r="1.2" fill="#ffffff" />
            <ellipse cx="80" cy="8" rx="4" ry="2.5" fill="#fb7185" opacity="0.6" />
            <path
              d="M 32 8 C 55 28, 75 55, 68 80 C 52 80, 36 50, 20 28 Z"
              fill="#10b981"
              stroke="#059669"
              strokeWidth="1.5"
              transform={`rotate(${16 * Math.sin(t * 1.5)}, 32, 8)`}
            />
          </g>
        )}

        {resolvedCompanion === 'dolphin' && (
          <g
            transform={`translate(${dolphinX}, ${dolphinY}) rotate(${dolphinRot})`}
            opacity="0.9"
          >
            <path
              d="M -70 12 C -40 -20, 20 -25, 65 0 C 80 8, 75 18, 50 14 C 15 10, -25 25, -60 22 Z"
              fill="#38bdf8"
              stroke="#0284c7"
              strokeWidth="2"
            />
            <path
              d="M -50 16 C -20 18, 15 12, 45 13 C 25 18, -15 22, -45 20 Z"
              fill="#e0f2fe"
            />
            <path d="M 0 -18 C 15 -35, 25 -32, 20 -16 Z" fill="#0284c7" />
            <path d="M 10 8 C 20 28, 5 32, 2 12 Z" fill="#0369a1" />
            <g transform={`translate(-68, 17) rotate(${dolphinFlukeRot})`} fill="#0284c7">
              <polygon points="0,0 -20,-12 -12,0 -20,12" />
            </g>
            <circle cx="50" cy="4" r="2.5" fill="#0f172a" />
            <circle cx="51" cy="3" r="0.8" fill="#ffffff" />
            <circle cx="-85" cy="18" r="4" fill="#bae6fd" opacity="0.6" />
            <circle cx="-100" cy="15" r="2.5" fill="#bae6fd" opacity="0.4" />
          </g>
        )}

        {resolvedCompanion === 'seahorse' && (
          <g transform={`translate(780, ${seahorseY}) rotate(${seahorseRot})`} opacity="0.9">
            <path
              d="M 10 -40 C 22 -48, 25 -35, 18 -26 C 28 -28, 35 -24, 38 -18 C 36 -15, 25 -16, 20 -14 C 18 -2, 10 10, 8 25 C 5 40, -5 50, -2 60 C 2 70, 16 65, 14 55 C 10 50, 4 52, 2 48"
              fill="#fbbf24"
              stroke="#d97706"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <ellipse
              cx="12"
              cy="-16"
              rx="4"
              ry="7"
              fill="#fef08a"
              opacity="0.85"
              transform={`rotate(${25 * Math.sin(t * 12)})`}
            />
            <path d="M 28 -22 L 40 -20" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
            <circle cx="20" cy="-24" r="2.2" fill="#451a03" />
            <circle cx="44" cy="-22" r="3" fill="#fde68a" opacity="0.75" />
          </g>
        )}

        {resolvedCompanion === 'school-of-fish' && (
          <g transform={`translate(${fishBaseX}, ${fishBaseY})`} opacity="0.85">
            {[
              { dx: 0, dy: 0, s: 1 },
              { dx: -24, dy: -14, s: 0.9 },
              { dx: -26, dy: 16, s: 0.85 },
              { dx: -50, dy: -6, s: 0.95 },
              { dx: -54, dy: 12, s: 0.8 },
              { dx: -78, dy: -2, s: 0.85 },
              { dx: -74, dy: -22, s: 0.75 }
            ].map((f, i) => {
              const swish = 14 * Math.sin(t * 5 + i * 0.5);
              return (
                <g key={i} transform={`translate(${f.dx}, ${f.dy}) scale(${f.s}) rotate(${swish * 0.4})`}>
                  <ellipse cx="0" cy="0" rx="14" ry="5.5" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />
                  <polygon points="-12,0 -18,-5 -18,5" fill="#0284c7" />
                  <circle cx="7" cy="-1.5" r="1.5" fill="#0369a1" />
                </g>
              );
            })}
          </g>
        )}

        {resolvedCompanion === 'jellyfish' && (
          <g transform={`translate(740, ${jellyY}) rotate(${jellyPulseRot}) scale(${jellyScale})`} opacity="0.88">
            <path
              d="M -32 0 C -34 -42, 34 -42, 32 0 C 20 8, 10 -2, 0 6 C -10 -2, -20 8, -32 0 Z"
              fill="#c084fc"
              fillOpacity="0.45"
              stroke="#e9d5ff"
              strokeWidth="2"
            />
            <circle cx="0" cy="-18" r="12" fill="#f472b6" opacity="0.6" />
            <circle cx="0" cy="-18" r="6" fill="#ffffff" opacity="0.85" />
            <g stroke="#e9d5ff" strokeWidth="1.8" fill="none" opacity="0.75">
              <path
                d={`M -20 4 Q ${-24 + 8 * Math.sin(t * 2)} 35, ${-18 + 12 * Math.sin(t * 2.2)} 75 T ${-22 + 15 * Math.sin(t * 2.4)} 120`}
              />
              <path
                d={`M -7 6 Q ${-9 + 10 * Math.cos(t * 2.1)} 40, ${-4 + 14 * Math.cos(t * 2.3)} 80 T ${-8 + 18 * Math.cos(t * 2.5)} 130`}
              />
              <path
                d={`M 7 6 Q ${9 + 10 * Math.sin(t * 2.1)} 40, ${4 + 14 * Math.sin(t * 2.3)} 80 T ${8 + 18 * Math.sin(t * 2.5)} 130`}
              />
              <path
                d={`M 20 4 Q ${24 + 8 * Math.cos(t * 2)} 35, ${18 + 12 * Math.cos(t * 2.2)} 75 T ${22 + 15 * Math.cos(t * 2.4)} 120`}
              />
            </g>
            <circle cx="-10" cy="50" r="2" fill="#fbcfe8" opacity="0.8" />
            <circle cx="12" cy="70" r="2.5" fill="#fbcfe8" opacity="0.7" />
          </g>
        )}

        {resolvedCompanion === 'manta' && (
          <g transform={`translate(${mantaX}, ${mantaY}) scale(${mantaWingScale}, 1)`} opacity="0.85">
            <path
              d="M 0 -22 C -60 -18, -130 5, -160 25 C -120 20, -50 35, 0 45 C 50 35, 120 20, 160 25 C 130 5, 60 -18, 0 -22 Z"
              fill="#1e293b"
              stroke="#475569"
              strokeWidth="2"
            />
            <path d="M -18 -22 C -24 -36, -12 -38, -10 -22 Z" fill="#1e293b" />
            <path d="M 18 -22 C 24 -36, 12 -38, 10 -22 Z" fill="#1e293b" />
            <path
              d={`M 0 45 Q ${12 * Math.sin(t * 1.5)} 90, ${22 * Math.sin(t * 1.8)} 145`}
              stroke="#0f172a"
              strokeWidth="2"
              fill="none"
            />
          </g>
        )}

        {resolvedCompanion === 'starfish' && (
          <g transform="translate(800, 480)" opacity="0.95">
            <ellipse cx="0" cy="18" rx="70" ry="24" fill="#292524" />
            <polygon
              points="0,-24 7,-8 24,-7 12,4 16,21 0,11 -16,21 -12,4 -24,-7 -7,-8"
              fill="#f43f5e"
              stroke="#be123c"
              strokeWidth="2"
            />
            <circle cx="0" cy="-1" r="5" fill="#fde047" opacity="0.85" />
            <circle
              cx="0"
              cy="-1"
              r={28 + 6 * Math.sin(t * 2)}
              fill="none"
              stroke="#fb7185"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.6"
            />
          </g>
        )}

        {/* 7. Floating Water Depth Particles / Plankton */}
        <g opacity="0.65">
          {[
            { cx: 80, cy: 120, r: 2.5, speed: 0.6 },
            { cx: 220, cy: 380, r: 3.5, speed: 0.9 },
            { cx: 360, cy: 90, r: 2, speed: 0.7 },
            { cx: 480, cy: 460, r: 4, speed: 1.1 },
            { cx: 620, cy: 160, r: 2.2, speed: 0.5 },
            { cx: 750, cy: 390, r: 3.2, speed: 0.8 },
            { cx: 880, cy: 220, r: 2.8, speed: 1.0 },
            { cx: 160, cy: 260, r: 3, speed: 0.75 },
            { cx: 580, cy: 310, r: 2.4, speed: 0.85 }
          ].map((p, i) => {
            const py = (p.cy - t * 22 * p.speed) % 540;
            const yNorm = py < 0 ? py + 540 : py;
            const px = p.cx + 14 * Math.sin(t * p.speed + i);
            return (
              <circle
                key={i}
                cx={px}
                cy={yNorm}
                r={p.r}
                fill={resolvedParticles}
                opacity={0.4 + 0.4 * Math.sin(t * 2 + i)}
              />
            );
          })}
        </g>

        {/* 8. RIGGED TIKA: Centered Swimming & Breathing Hero */}
        <g
          transform={`translate(${hasCompanionSpeech ? 560 : 480}, ${270 + tikaWaveY}) rotate(${tikaTilt})`}
        >
          {/* Breathing Aura around Tika */}
          <circle cx="0" cy="0" r="145" fill="url(#tika-breath-aura)" />

          {/* Guide Rings for Breath Expansion */}
          <g id="layer-guides">
            <circle
              cx="0"
              cy="0"
              r="120"
              fill="none"
              stroke={cueColor}
              strokeWidth="2.5"
              strokeDasharray="8 6"
              opacity="0.45"
            />
            <circle
              cx="0"
              cy="0"
              r="132"
              fill="none"
              stroke={cueColor}
              strokeWidth="1.2"
              strokeDasharray="3 7"
              opacity="0.3"
            />
          </g>

          {/* Center Offset: Tika rig pivot is around (400, 300) in user units */}
          <g transform="translate(-400, -300)">
            <g id="layer-turtle-character">
              {/* Distant flippers */}
              <g id="rig-limbs-distant">
                <path
                  id="rig-flipper-rear-lt"
                  d="M 270 290 C 230 250 170 260 130 290 C 120 298 130 315 150 315 C 190 315 240 310 270 290 Z"
                  fill="#047857"
                />
                <path
                  id="rig-flipper-front-lt"
                  d="M 470 250 C 510 180 570 120 630 110 C 645 108 650 120 640 135 C 595 190 535 255 480 270 Z"
                  fill="#047857"
                />
              </g>

              {/* Tail */}
              <path
                id="rig-tail"
                d="M 230 320 C 190 325 150 338 135 348 C 150 355 190 350 235 338 Z"
                fill="#10b981"
              />

              {/* Soft Belly (Plastron) */}
              <g id="rig-plastron">
                <path
                  id="part-belly-base"
                  d="M 250 320 C 270 380 360 415 450 395 C 480 388 495 365 500 330 C 460 345 360 355 250 320 Z"
                  fill="url(#widget-grad-belly)"
                />
                <path
                  id="part-belly-shadow"
                  d="M 280 350 C 340 395 420 405 460 385 C 440 375 360 365 300 340 Z"
                  fill="#eab308"
                />
                <path
                  id="part-belly-groove-1"
                  d="M 340 345 C 350 372 370 392 390 398"
                  stroke="#ca8a04"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  id="part-belly-groove-2"
                  d="M 415 340 C 430 365 445 380 460 382"
                  stroke="#ca8a04"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                />
              </g>

              {/* Shell (Carapace) */}
              <g id="rig-carapace">
                <path
                  id="part-shell-dome"
                  d="M 215 320 C 210 200 320 145 440 160 C 510 170 545 225 530 320 C 475 345 275 345 215 320 Z"
                  fill="#065f46"
                />
                <path
                  id="part-shell-rim"
                  d="M 210 320 C 230 345 300 358 385 354 C 460 350 515 342 535 320 C 525 338 460 365 385 362 C 295 360 225 340 210 320 Z"
                  fill="#f59e0b"
                />
                <path d="M 255 240 L 310 220 L 330 260 L 290 280 L 250 265 Z" fill="#10b981" />
                <circle cx="288" cy="254" r="3.5" fill="#a7f3d0" opacity={0.8} />
                <path d="M 320 215 L 390 195 L 430 220 L 400 260 L 340 255 Z" fill="#34d399" />
                <circle cx="375" cy="230" r="4" fill="#ecfdf5" opacity={0.9} />
                <path d="M 400 195 L 455 210 L 485 245 L 440 265 L 410 225 Z" fill="#10b981" />
                <circle cx="445" cy="232" r="3.5" fill="#a7f3d0" opacity={0.8} />
                <path d="M 345 265 L 405 268 L 435 310 L 375 315 L 330 295 Z" fill="#059669" />
                <circle cx="380" cy="290" r="3.5" fill="#a7f3d0" opacity={0.8} />
                <path d="M 445 270 L 485 250 L 515 285 L 495 320 L 440 315 Z" fill="#10b981" />
                <circle cx="475" cy="290" r="3" fill="#a7f3d0" opacity={0.8} />
                <path d="M 285 285 L 325 295 L 340 325 L 280 325 L 250 305 Z" fill="#047857" />
                <circle cx="295" cy="308" r="3" fill="#a7f3d0" opacity={0.8} />
                <path
                  d="M 260 215 C 330 170 410 175 465 195"
                  stroke="#a7f3d0"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.7}
                />
              </g>

              {/* Head & Neck */}
              <g id="rig-head-neck">
                <path
                  id="part-neck-base"
                  d="M 470 315 C 500 320 540 310 575 280 C 585 265 575 240 550 230 C 515 220 480 240 460 265 Z"
                  fill="#10b981"
                />
                <path
                  id="part-throat-gular"
                  d="M 535 290 C 555 304 575 298 590 282"
                  stroke="#059669"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.7}
                />
                <path
                  id="part-head-profile"
                  d="M 545 240 C 555 195 615 190 655 215 C 690 238 695 275 670 295 C 640 315 585 310 555 280 C 542 268 540 252 545 240 Z"
                  fill="#10b981"
                />
                <path
                  id="part-chin-shadow"
                  d="M 565 282 C 600 305 645 305 668 288 C 650 295 610 295 580 282 Z"
                  fill="#059669"
                />
                <circle id="part-nostril" cx="674" cy="250" r="2.5" fill="#064e3b" />
                <path
                  id="part-mouth"
                  d="M 676 264 C 668 274 650 280 630 276"
                  stroke="#064e3b"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                />
                <ellipse id="part-cheek" cx="628" cy="270" rx="9" ry="6" fill="#fb7185" opacity={0.6} />
                <circle cx="585" cy="215" r="4" fill="#6ee7b7" />
                <circle cx="605" cy="210" r="5" fill="#6ee7b7" />
                <circle cx="625" cy="218" r="4.5" fill="#6ee7b7" />

                {/* Eye with natural blink */}
                <g id="rig-eye">
                  <ellipse cx="605" cy="235" rx="15" ry="17" fill="#ffffff" stroke="#065f46" strokeWidth="2" />
                  <ellipse cx="608" cy="235" rx="11" ry="13" fill="#1e293b" />
                  <circle cx="612" cy="230" r="4.5" fill="#ffffff" />
                  <circle cx="604" cy="242" r="2.2" fill="#ffffff" />
                  <circle cx="615" cy="239" r="1.3" fill="#ffffff" />
                </g>
              </g>

              {/* Foreground flippers */}
              <g id="rig-flipper-front-rt">
                <path
                  d="M 470 315 C 510 335 565 390 580 460 C 585 485 568 495 545 490 C 495 478 450 410 430 360 C 420 338 440 315 470 315 Z"
                  fill="#10b981"
                  stroke="#059669"
                  strokeWidth="2"
                />
                <circle cx="475" cy="355" r="5" fill="#6ee7b7" />
                <circle cx="500" cy="395" r="5.5" fill="#6ee7b7" />
                <circle cx="525" cy="440" r="4.5" fill="#6ee7b7" />
              </g>

              <g id="rig-flipper-rear-rt">
                <path
                  d="M 245 335 C 215 370 160 415 125 425 C 112 428 110 415 122 400 C 155 360 215 328 245 335 Z"
                  fill="#10b981"
                  stroke="#059669"
                  strokeWidth="2"
                />
                <circle cx="170" cy="385" r="4" fill="#6ee7b7" />
              </g>

              {/* Exhale bubbles from nostril */}
              <g id="rig-breath-fx" style={{ opacity: 0 }}>
                <use href="#widget-bubble" transform="scale(1.1)" />
              </g>
            </g>
          </g>

          {/* Gentle Breath Cue Badge floating above Tika */}
          <g transform="translate(0, -110)">
            <rect
              x="-85"
              y="-15"
              width="170"
              height="30"
              rx="15"
              fill="#061826"
              fillOpacity="0.75"
              stroke={cueColor}
              strokeWidth="1.5"
            />
            <text
              x="0"
              y="5"
              textAnchor="middle"
              fill={cueColor}
              fontSize="12"
              fontWeight="700"
              fontFamily="system-ui, sans-serif"
            >
              {cueLabel}
            </text>
          </g>
        </g>

        {/* 9. Companion's Speech Bubble (Left Stage) */}
        {hasCompanionSpeech && (
          <g transform={`translate(220, ${74 + tikaWaveY * 0.3})`} opacity="0.96">
            <rect
              x="-180"
              y="-28"
              width="360"
              height={companionDialogLines.length > 1 ? 64 : 50}
              rx="14"
              fill="#051a29"
              fillOpacity="0.92"
              stroke="#fde047"
              strokeWidth="1.5"
            />
            <polygon
              points={`-8,${companionDialogLines.length > 1 ? 36 : 22} 0,${companionDialogLines.length > 1 ? 46 : 32} 8,${companionDialogLines.length > 1 ? 36 : 22}`}
              fill="#051a29"
              stroke="#fde047"
              strokeWidth="1.5"
            />
            <rect
              x="-7"
              y={companionDialogLines.length > 1 ? 34 : 20}
              width="14"
              height="3"
              fill="#051a29"
            />
            <text
              x="-162"
              y="-10"
              fill="#fde047"
              fontSize="11"
              fontWeight="700"
              fontFamily="system-ui, sans-serif"
            >
              {resolvedCompanionName}:
            </text>
            {companionDialogLines.map((line, i) => (
              <text
                key={i}
                x="-162"
                y={8 + i * 18}
                fill="#fef08a"
                fontSize="11.5"
                fontWeight="500"
                fontFamily="system-ui, sans-serif"
              >
                {line}
              </text>
            ))}
          </g>
        )}

        {/* 10. Tika's Live Dialogue / Thought Bubble (Right or Center Stage) */}
        {tikaQuoteLines.length > 0 && (
          <g
            transform={`translate(${hasCompanionSpeech ? 660 : 480}, ${74 + tikaWaveY * 0.4})`}
            opacity="0.96"
          >
            <rect
              x={hasCompanionSpeech ? '-175' : '-205'}
              y="-28"
              width={hasCompanionSpeech ? 350 : 410}
              height={tikaQuoteLines.length > 1 ? 64 : 50}
              rx="14"
              fill="#041624"
              fillOpacity="0.92"
              stroke={resolvedAccent}
              strokeWidth="1.5"
            />
            <polygon
              points={`-8,${tikaQuoteLines.length > 1 ? 36 : 22} 0,${tikaQuoteLines.length > 1 ? 46 : 32} 8,${tikaQuoteLines.length > 1 ? 36 : 22}`}
              fill="#041624"
              stroke={resolvedAccent}
              strokeWidth="1.5"
            />
            <rect
              x="-7"
              y={tikaQuoteLines.length > 1 ? 34 : 20}
              width="14"
              height="3"
              fill="#041624"
            />
            <text
              x={hasCompanionSpeech ? '-158' : '-188'}
              y="-10"
              fill="#34d399"
              fontSize="11"
              fontWeight="700"
              fontFamily="system-ui, sans-serif"
            >
              🐢 Tika spricht:
            </text>
            {tikaQuoteLines.map((line, i) => (
              <text
                key={i}
                x={hasCompanionSpeech ? '-158' : '-188'}
                y={8 + i * 18}
                fill="#f0fdfa"
                fontSize="11.5"
                fontWeight="500"
                fontFamily="system-ui, sans-serif"
              >
                {line}
              </text>
            ))}
          </g>
        )}

        {/* 11. Cinematic Vignette (Border shadowing) */}
        <rect width="960" height="540" fill="url(#cinematic-vignette)" style={{ pointerEvents: 'none' }} />
      </svg>
    </div>
  );
});
