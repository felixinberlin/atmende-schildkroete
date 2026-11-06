import { describe, expect, it } from 'vitest';
import {
  BIOME_LABELS,
  CREATURE_LABELS,
  findVoyage,
  generateVoyageJournalEntry,
  getVoyageTotalDuration,
  WORLD_VOYAGES,
  type OceanBiome,
  type MarineCreature
} from './voyageData';
import { findPattern } from './patterns';
import { renderBreathJourneySvg } from './breathJournal';

describe('World Voyages (Zuschauer-Modus)', () => {
  it('defines valid curated voyages with non-empty chapters', () => {
    expect(WORLD_VOYAGES.length).toBeGreaterThanOrEqual(3);

    for (const voyage of WORLD_VOYAGES) {
      expect(voyage.id).toBeTruthy();
      expect(voyage.title).toBeTruthy();
      expect(voyage.chapters.length).toBeGreaterThanOrEqual(3);

      const totalDuration = getVoyageTotalDuration(voyage);
      expect(totalDuration).toBeGreaterThan(60); // At least 1 minute total

      for (const chapter of voyage.chapters) {
        expect(chapter.id).toBeTruthy();
        expect(chapter.title).toBeTruthy();
        expect(chapter.islandName).toBeTruthy();
        expect(chapter.storyChronicle).toBeTruthy();
        expect(chapter.durationSec).toBeGreaterThanOrEqual(20);
        expect(chapter.tikaQuote).toBeTruthy();
        expect(chapter.dialogs.length).toBeGreaterThanOrEqual(1);

        // Tika must be part of the dialogue
        const hasTika = chapter.dialogs.some(d => d.speaker === 'tika');
        expect(hasTika).toBe(true);

        // Valid pattern
        const pat = findPattern(chapter.patternId);
        expect(pat).toBeDefined();

        // Biome labels exist
        expect(BIOME_LABELS[chapter.biome]).toBeDefined();

        // Creature labels exist
        expect(CREATURE_LABELS[chapter.creature]).toBeDefined();

        // Color definitions
        expect(chapter.skyColors.top).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(chapter.skyColors.mid).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(chapter.skyColors.bottom).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it('can look up voyages by ID', () => {
    const v = findVoyage('grand-archipelago');
    expect(v).toBeDefined();
    expect(v?.chapters.length).toBe(6);

    const nonExistent = findVoyage('unknown-voyage');
    expect(nonExistent).toBeUndefined();
  });

  it('computes total duration correctly', () => {
    const v = findVoyage('twilight-glow')!;
    const expected = v.chapters.reduce((sum, ch) => sum + ch.durationSec, 0);
    expect(getVoyageTotalDuration(v)).toBe(expected);
  });

  it('generates an authentic journal keepsake snapshot with sea pattern segments and pearls', () => {
    const voyage = findVoyage('grand-archipelago')!;
    const chapter = voyage.chapters[0]; // Wellen-Bucht, ocean

    const entry = generateVoyageJournalEntry(voyage, chapter);

    expect(entry.id).toContain('voyage-chap-1-bay');
    expect(entry.title).toContain(chapter.title);
    expect(entry.islandName).toBe('Wellen-Bucht');
    expect(entry.patternId).toBe('ocean');
    expect(entry.durationSec).toBe(chapter.durationSec);
    expect(entry.reflection).toContain(chapter.storyChronicle);

    // Trail segments exist and contain points
    expect(entry.segments.length).toBeGreaterThan(0);
    for (const seg of entry.segments) {
      expect(seg.points.length).toBeGreaterThan(0);
      for (const pt of seg.points) {
        expect(typeof pt.x).toBe('number');
        expect(typeof pt.y).toBe('number');
        expect(Number.isFinite(pt.x)).toBe(true);
        expect(Number.isFinite(pt.y)).toBe(true);
      }
    }

    // Pearls exist
    expect(Array.isArray(entry.pearls)).toBe(true);

    // Standalone SVG export renders cleanly
    const svg = renderBreathJourneySvg(entry);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('Wellen-Bucht');
    expect(svg).toContain('polyline');
  });
});
