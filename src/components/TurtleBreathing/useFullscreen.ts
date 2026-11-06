import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { createFullscreenController, type FullscreenController } from '../../breathing';

/** Fullscreen state for `ref` (with wake lock and iPhone fallback), kept in sync with Esc/back exits. */
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const controller = useRef<FullscreenController | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const c = createFullscreenController(el, setActive);
    controller.current = c;
    return () => {
      c.dispose();
      controller.current = null;
    };
  }, [ref]);

  const toggle = useCallback(() => void controller.current?.toggle(), []);
  return { active, toggle };
}
