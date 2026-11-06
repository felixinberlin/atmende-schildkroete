import { describe, expect, it } from 'vitest';
import { parseGraph, sample, validate } from './graph';
import {
  createIslandStoryTemplate,
  createJourneyStoryTemplate,
  defaultArchipelago,
  findJourneyBetween,
  parseArchipelago,
  validateArchipelago
} from './islands';

describe('archipelago islands and sea journeys', () => {
  it('validates all default islands and sea journeys without structural issues', () => {
    expect(validateArchipelago(defaultArchipelago)).toEqual([]);
  });

  it('maps each default island to a distinct breathing technique', () => {
    const patterns = defaultArchipelago.islands.map(i => i.patternId);
    expect(new Set(patterns).size).toBe(defaultArchipelago.islands.length);
    expect(patterns).toEqual(
      expect.arrayContaining(['ocean', 'box', 'calm478', 'dirga', 'coherence', 'star'])
    );
  });

  it('includes both full example stories and extensible templates for islands and journeys', () => {
    expect(defaultArchipelago.islands.some(i => i.status === 'example')).toBe(true);
    expect(defaultArchipelago.islands.some(i => i.status === 'template')).toBe(true);
    expect(defaultArchipelago.journeys.some(j => j.status === 'example')).toBe(true);
    expect(defaultArchipelago.journeys.some(j => j.status === 'template')).toBe(true);
  });

  it('connects islands with distinct sea journeys in both directions', () => {
    const j1 = findJourneyBetween(defaultArchipelago, 'wellen-bucht', 'kompass-riff');
    const j1Reverse = findJourneyBetween(defaultArchipelago, 'kompass-riff', 'wellen-bucht');
    const j2 = findJourneyBetween(defaultArchipelago, 'wellen-bucht', 'tiefsee-garten');

    expect(j1).toBeDefined();
    expect(j1Reverse?.id).toBe(j1?.id);
    expect(j2).toBeDefined();
    expect(j1?.id).not.toBe(j2?.id);
    expect(j1?.story.nodes[0].data.title).not.toBe(j2?.story.nodes[0].data.title);
  });

  it('generates valid starter story templates for new islands and journeys', () => {
    const islandStory = createIslandStoryTemplate('Korallen-Insel', 'box', 'Box Breathing');
    expect(validate(islandStory)).toEqual([]);
    const exNode = islandStory.nodes.find(n => n.data.kind === 'exercise');
    expect(exNode?.data.patternId).toBe('box');

    const journeyStory = createJourneyStoryTemplate('Südpassage', 'Wellen-Bucht', 'Korallen-Insel', 'box');
    expect(validate(journeyStory)).toEqual([]);
  });

  it('round-trips the archipelago and preserves exercise patternId in story graphs', () => {
    const serialized = JSON.stringify(defaultArchipelago);
    const parsed = parseArchipelago(serialized);
    expect(parsed).toEqual(defaultArchipelago);

    const graphWithPattern = structuredClone(sample);
    const ex = graphWithPattern.nodes.find(n => n.data.kind === 'exercise')!;
    ex.data.patternId = 'calm478';
    expect(parseGraph(JSON.stringify(graphWithPattern)).nodes.find(n => n.id === ex.id)?.data.patternId).toBe('calm478');
  });
});
