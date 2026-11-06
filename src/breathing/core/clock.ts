/**
 * Pausable clock that integrates real time × speed into "pattern time".
 * Because speed is integrated, changing it never jumps the breath position.
 */
export const MIN_SPEED = 0.2;
export const MAX_SPEED = 3;

export function clampSpeed(speed: number): number {
  return Number.isFinite(speed) ? Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed)) : 1;
}

export class BreathClock {
  private accumulatedMs = 0;
  private lastNow = 0;
  private _running = false;
  private _speed = 1;

  constructor(private readonly now: () => number = () => performance.now()) {}

  get running(): boolean {
    return this._running;
  }

  get speed(): number {
    return this._speed;
  }

  /** Pattern time in ms (ms at speed 1). */
  elapsed(): number {
    return this._running ? this.accumulatedMs + (this.now() - this.lastNow) * this._speed : this.accumulatedMs;
  }

  start(): void {
    if (this._running) return;
    this.lastNow = this.now();
    this._running = true;
  }

  pause(): void {
    if (!this._running) return;
    this.accumulatedMs = this.elapsed();
    this._running = false;
  }

  reset(): void {
    this.accumulatedMs = 0;
    this.lastNow = this.now();
  }

  setSpeed(speed: number): void {
    this.accumulatedMs = this.elapsed();
    this.lastNow = this.now();
    this._speed = clampSpeed(speed);
  }
}
