import { flushSync } from 'react-dom';
import { prefersReducedMotion } from './haptics';
import { motion } from '../tokens/tokens';

/** Circular theme reveal (View Transitions API, 560ms), origin at the clicked button. Falls back to an instant swap. */
export function revealTheme(origin: HTMLElement, apply: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  if (!doc.startViewTransition || prefersReducedMotion()) { apply(); return; }
  const r = origin.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  try {
    const vt = doc.startViewTransition(() => { flushSync(apply); });
    vt.ready.then(() => {
      const R = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      document.documentElement.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`] },
        { duration: motion.themeReveal, easing: motion.easeInOut, pseudoElement: '::view-transition-new(root)' });
    }).catch(() => {});
  } catch { apply(); }
}
