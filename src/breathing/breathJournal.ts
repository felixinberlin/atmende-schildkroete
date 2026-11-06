/**
 * Local-first, non-punitive storage and SVG artwork exporter for completed
 * breath journeys ("Gespeicherte Atem-Reisen / Meeresmuster-Galerie").
 *
 * All data stays strictly in the browser's localStorage or user-initiated file downloads.
 */
import { CUE_TRAIL_COLORS, type SeaPatternStyle } from './seaPattern';
import type { CueKey } from './core/timeline';

export interface SavedTrailSegment {
  cue: CueKey;
  points: Array<{ x: number; y: number }>;
}

export interface SavedPearl {
  x: number;
  y: number;
  cycle: number;
}

export interface SavedBreathJourney {
  id: string;
  createdAt: string;
  title: string;
  islandId?: string;
  islandName?: string;
  patternId: string;
  patternName: string;
  patternStyle: SeaPatternStyle;
  completedCycles: number;
  durationSec: number;
  reflection?: string;
  segments: SavedTrailSegment[];
  pearls: SavedPearl[];
}

export const BREATH_JOURNAL_STORAGE_KEY = 'tika-breath-journal-v1';
export const LEGACY_BREATH_JOURNAL_STORAGE_KEY = 'chemistry-tika-breath-journal-v1';
const MAX_SAVED_JOURNEYS = 50;

function getStorage(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // Ignore restricted storage
  }
  return null;
}

export function loadSavedBreathJourneys(storageKey = BREATH_JOURNAL_STORAGE_KEY): SavedBreathJourney[] {
  try {
    const storage = getStorage();
    if (!storage) return [];
    const raw = storage.getItem(storageKey) || storage.getItem(LEGACY_BREATH_JOURNAL_STORAGE_KEY);
    if (!raw) return [];
    return parseSavedBreathJourneys(raw);
  } catch {
    return [];
  }
}

export function saveBreathJourneysToStorage(
  journeys: SavedBreathJourney[],
  storageKey = BREATH_JOURNAL_STORAGE_KEY
): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(storageKey, JSON.stringify(journeys.slice(0, MAX_SAVED_JOURNEYS)));
  } catch {
    // Ignore storage quota errors
  }
}

export function addSavedBreathJourney(
  journey: SavedBreathJourney,
  storageKey = BREATH_JOURNAL_STORAGE_KEY
): SavedBreathJourney[] {
  const current = loadSavedBreathJourneys(storageKey);
  const updated = [journey, ...current.filter(j => j.id !== journey.id)].slice(0, MAX_SAVED_JOURNEYS);
  saveBreathJourneysToStorage(updated, storageKey);
  return updated;
}

export function deleteSavedBreathJourney(
  id: string,
  storageKey = BREATH_JOURNAL_STORAGE_KEY
): SavedBreathJourney[] {
  const current = loadSavedBreathJourneys(storageKey);
  const updated = current.filter(j => j.id !== id);
  saveBreathJourneysToStorage(updated, storageKey);
  return updated;
}

export function parseSavedBreathJourneys(jsonText: string): SavedBreathJourney[] {
  const parsed = JSON.parse(jsonText);
  if (!Array.isArray(parsed)) throw new Error('Ungültiges Format für gespeicherte Atem-Reisen.');
  return parsed
    .slice(0, MAX_SAVED_JOURNEYS)
    .filter(
      (item): item is SavedBreathJourney =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.createdAt === 'string' &&
        typeof item.title === 'string' &&
        typeof item.patternId === 'string' &&
        typeof item.patternName === 'string' &&
        typeof item.completedCycles === 'number' &&
        typeof item.durationSec === 'number' &&
        Array.isArray(item.segments) &&
        Array.isArray(item.pearls)
    );
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Renders a saved breath journey into a standalone, self-contained SVG artwork string
 * that can be downloaded or displayed as a keepsake.
 */
export function renderBreathJourneySvg(journey: SavedBreathJourney): string {
  const polylines = journey.segments
    .filter(seg => seg.points.length > 0)
    .map(seg => {
      const color = CUE_TRAIL_COLORS[seg.cue] ?? '#5eead4';
      const width = seg.cue === 'holdIn' ? '4.5' : '3.2';
      const dash = seg.cue === 'holdOut' ? ' stroke-dasharray="4 5"' : '';
      const pts = seg.points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      return `    <polyline fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${dash} points="${pts}"/>`;
    })
    .join('\n');

  const pearls = journey.pearls
    .map(
      p =>
        `    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="#fde047" stroke="#ffffff" stroke-width="1.5" opacity="0.9"/>`
    )
    .join('\n');

  const dateLabel = journey.createdAt.slice(0, 10);
  const caption = `${journey.title} · ${journey.patternName} · ${journey.completedCycles} Atemzüge (${dateLabel})`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600" role="img" aria-label="${escapeXml(caption)}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#0d354c"/>
      <stop offset="65%" stop-color="#072233"/>
      <stop offset="100%" stop-color="#041520"/>
    </radialGradient>
  </defs>
  <rect width="800" height="600" rx="18" fill="url(#bg)"/>
  <g stroke="#1b4d6b" stroke-width="1" fill="none" opacity="0.3">
    <circle cx="400" cy="300" r="85" stroke-dasharray="4 6"/>
    <circle cx="400" cy="300" r="155" stroke-dasharray="4 6"/>
    <circle cx="400" cy="300" r="220" stroke-dasharray="2 8"/>
  </g>
  <g>
${polylines}
  </g>
  <g>
${pearls}
  </g>
  <text x="400" y="572" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#bae6fd">
    ${escapeXml(caption)}
  </text>
</svg>`;
}
