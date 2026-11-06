import { describe, expect, it } from 'vitest';
import { BreathingPatternBuilder } from '../core/patternBuilder';
import {
  BUILTIN_PATTERNS,
  findPattern,
  getAllPatterns,
  registerCustomPattern,
  unregisterCustomPattern
} from './index';

describe('Dynamic Pattern Registry', () => {
  it('finds built-in patterns by ID', () => {
    expect(findPattern('ocean')).toBeDefined();
    expect(findPattern('box')).toBeDefined();
    expect(findPattern('calm478')).toBeDefined();
    expect(findPattern('dirga')).toBeDefined();
    expect(findPattern('coherence')).toBeDefined();
    expect(findPattern('star')).toBeDefined();
    expect(findPattern('custom')).toBeDefined();
    expect(findPattern('non-existent')).toBeUndefined();
  });

  it('registers and retrieves custom pattern dynamically', () => {
    const customPattern = new BreathingPatternBuilder('deep-sigh', 'Physiologischer Seufzer')
      .setShortName('Doppelter Einatmer')
      .inhale(2500)
      .inhale(1000, { label: 'Zweiter Atemzug' })
      .exhale(6000)
      .build();

    registerCustomPattern(customPattern);

    const found = findPattern('deep-sigh');
    expect(found).toBeDefined();
    expect(found?.name).toBe('Physiologischer Seufzer');

    const all = getAllPatterns();
    expect(all).toHaveLength(BUILTIN_PATTERNS.length + 1);
    expect(all.some(p => p.id === 'deep-sigh')).toBe(true);

    const unregistered = unregisterCustomPattern('deep-sigh');
    expect(unregistered).toBe(true);
    expect(findPattern('deep-sigh')).toBeUndefined();
  });
});
