export const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

export function easeInOutCubic(t: number): number {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

export function easeOutSine(t: number): number {
  return Math.sin((clamp(t) * Math.PI) / 2);
}
