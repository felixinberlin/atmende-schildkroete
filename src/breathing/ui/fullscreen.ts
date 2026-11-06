/**
 * Fullscreen + screen wake lock for a breathing stage element. Framework-free.
 *
 * - Uses the Fullscreen API (incl. the webkit prefix for Safari/iPadOS).
 * - Where element fullscreen is unavailable (iPhone Safari), falls back to a CSS
 *   "pseudo fullscreen" class that pins the element over the viewport.
 * - While fullscreen, keeps the screen awake (Screen Wake Lock API, secure contexts only).
 */

export const PSEUDO_FULLSCREEN_CLASS = 'is-pseudo-fullscreen';

type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

interface WakeLockSentinelLike {
  release(): Promise<void>;
}
type WakeLockNavigator = Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> } };

function nativeFullscreenElement(): Element | null {
  const doc = document as WebkitDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function supportsNativeFullscreen(el: HTMLElement): boolean {
  return typeof el.requestFullscreen === 'function' || typeof (el as WebkitElement).webkitRequestFullscreen === 'function';
}

export function isFullscreen(el: HTMLElement): boolean {
  return nativeFullscreenElement() === el || el.classList.contains(PSEUDO_FULLSCREEN_CLASS);
}

export interface FullscreenController {
  toggle(): Promise<void>;
  enter(): Promise<void>;
  exit(): Promise<void>;
  readonly active: boolean;
  /** Remove listeners, leave fullscreen and release the wake lock. */
  dispose(): void;
}

/**
 * Attach fullscreen behaviour to `el`. `onChange` fires on every enter/exit,
 * including exits by the browser (Esc key, back gesture).
 */
export function createFullscreenController(el: HTMLElement, onChange?: (active: boolean) => void): FullscreenController {
  let wakeLock: WakeLockSentinelLike | null = null;
  let active = false;

  const acquireWakeLock = async () => {
    const nav = navigator as WakeLockNavigator;
    if (!nav.wakeLock || wakeLock) return;
    try {
      wakeLock = await nav.wakeLock.request('screen');
    } catch {
      // Denied (battery saver, insecure context like file://): fullscreen still works without it.
    }
  };

  const releaseWakeLock = () => {
    void wakeLock?.release().catch(() => {});
    wakeLock = null;
  };

  const sync = () => {
    const now = isFullscreen(el);
    if (now === active) return;
    active = now;
    if (active) void acquireWakeLock();
    else releaseWakeLock();
    onChange?.(active);
  };

  // The wake lock is dropped when the tab is hidden; re-acquire on return.
  const onVisibility = () => {
    if (active && document.visibilityState === 'visible') void acquireWakeLock();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && el.classList.contains(PSEUDO_FULLSCREEN_CLASS)) void controller.exit();
  };

  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  document.addEventListener('visibilitychange', onVisibility);
  document.addEventListener('keydown', onKey);

  const controller: FullscreenController = {
    get active() {
      return active;
    },
    async enter() {
      if (isFullscreen(el)) return;
      const target = el as WebkitElement;
      try {
        if (target.requestFullscreen) await target.requestFullscreen({ navigationUI: 'hide' });
        else if (target.webkitRequestFullscreen) await target.webkitRequestFullscreen();
        else el.classList.add(PSEUDO_FULLSCREEN_CLASS);
      } catch {
        // Rejected (e.g. inside an iframe without allowfullscreen): use the CSS fallback.
        el.classList.add(PSEUDO_FULLSCREEN_CLASS);
      }
      sync();
    },
    async exit() {
      if (el.classList.contains(PSEUDO_FULLSCREEN_CLASS)) {
        el.classList.remove(PSEUDO_FULLSCREEN_CLASS);
      } else if (nativeFullscreenElement() === el) {
        const doc = document as WebkitDocument;
        try {
          if (doc.exitFullscreen) await doc.exitFullscreen();
          else await doc.webkitExitFullscreen?.();
        } catch {
          // Already left (race with Esc) — nothing to do.
        }
      }
      sync();
    },
    toggle() {
      return isFullscreen(el) ? controller.exit() : controller.enter();
    },
    dispose() {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('keydown', onKey);
      if (isFullscreen(el)) void controller.exit();
      releaseWakeLock();
    }
  };
  return controller;
}
