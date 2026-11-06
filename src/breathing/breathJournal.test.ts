import { describe, expect, it, beforeEach } from 'vitest';
import {
  addSavedBreathJourney,
  deleteSavedBreathJourney,
  loadSavedBreathJourneys,
  parseSavedBreathJourneys,
  renderBreathJourneySvg,
  saveBreathJourneysToStorage,
  type SavedBreathJourney
} from './breathJournal';

describe('breathJournal storage and SVG generation', () => {
  const TEST_KEY = 'test-breath-journal-key';

  const mockJourney: SavedBreathJourney = {
    id: 'journey-1',
    createdAt: '2026-11-06T14:30:00.000Z',
    title: 'Wellen-Atem an der Bucht',
    islandId: 'wellen-bucht',
    islandName: 'Wellen-Bucht',
    patternId: 'ocean',
    patternName: 'Ozean-Wellenatmung (4-1-4-1)',
    patternStyle: 'rosette',
    completedCycles: 4,
    durationSec: 40,
    reflection: 'Ruhiger geworden und Kopf frei.',
    segments: [
      {
        cue: 'inhale',
        points: [
          { x: 400, y: 300 },
          { x: 450, y: 350 }
        ]
      },
      {
        cue: 'exhale',
        points: [
          { x: 450, y: 350 },
          { x: 400, y: 300 }
        ]
      }
    ],
    pearls: [{ x: 450, y: 350, cycle: 0 }]
  };

  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, val),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    length: 0
  };

  beforeEach(() => {
    store.clear();
    (globalThis as unknown as { localStorage: typeof mockStorage }).localStorage = mockStorage;
  });

  it('saves, loads, and parses breath journeys', () => {
    saveBreathJourneysToStorage([mockJourney], TEST_KEY);
    const loaded = loadSavedBreathJourneys(TEST_KEY);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('journey-1');
    expect(loaded[0].reflection).toBe('Ruhiger geworden und Kopf frei.');

    const parsed = parseSavedBreathJourneys(JSON.stringify([mockJourney]));
    expect(parsed).toEqual([mockJourney]);
  });

  it('adds a new breath journey to the front of the list', () => {
    addSavedBreathJourney(mockJourney, TEST_KEY);
    const second: SavedBreathJourney = {
      ...mockJourney,
      id: 'journey-2',
      title: 'Zweite Reise'
    };
    const updated = addSavedBreathJourney(second, TEST_KEY);
    expect(updated).toHaveLength(2);
    expect(updated[0].id).toBe('journey-2');
  });

  it('deletes a breath journey by id', () => {
    addSavedBreathJourney(mockJourney, TEST_KEY);
    const updated = deleteSavedBreathJourney('journey-1', TEST_KEY);
    expect(updated).toHaveLength(0);
    expect(loadSavedBreathJourneys(TEST_KEY)).toHaveLength(0);
  });

  it('renders a valid standalone SVG artwork string with caption and paths', () => {
    const svg = renderBreathJourneySvg(mockJourney);
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('polyline');
    expect(svg).toContain('Wellen-Atem an der Bucht');
    expect(svg).toContain('</svg>');
  });
});
