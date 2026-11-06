/**
 * Built-in and dynamically registered breathing patterns.
 * Patterns are strictly validated against BreathingPatternSchema.
 */
import { parsePattern, type BreathingPattern } from '../core/schema';
import ocean from './ocean.json';
import box from './box.json';
import calm478 from './calm478.json';
import dirga from './dirga.json';
import coherence from './coherence.json';
import star from './star.json';
import custom from './custom.json';

export const BUILTIN_PATTERNS: readonly BreathingPattern[] = [
  ocean,
  box,
  calm478,
  dirga,
  coherence,
  star,
  custom
].map(parsePattern);

export const DEFAULT_PATTERN = BUILTIN_PATTERNS[0];

const customPatterns = new Map<string, BreathingPattern>();

/**
 * Dynamically register a custom breathing pattern at runtime.
 */
export function registerCustomPattern(pattern: BreathingPattern): void {
  customPatterns.set(pattern.id, pattern);
}

/**
 * Remove a registered custom pattern.
 */
export function unregisterCustomPattern(id: string): boolean {
  return customPatterns.delete(id);
}

/**
 * Find a pattern by id (checks custom registered patterns first, then builtins).
 */
export function findPattern(id: string): BreathingPattern | undefined {
  if (customPatterns.has(id)) {
    return customPatterns.get(id);
  }
  return BUILTIN_PATTERNS.find(p => p.id === id);
}

/**
 * Returns all active patterns (built-ins + dynamically registered).
 */
export function getAllPatterns(): readonly BreathingPattern[] {
  if (customPatterns.size === 0) return BUILTIN_PATTERNS;
  return [...BUILTIN_PATTERNS, ...customPatterns.values()];
}
