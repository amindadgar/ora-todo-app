export const buzz = (ms: number) => { try { navigator.vibrate?.(ms); } catch { /* unsupported */ } };
export const prefersReducedMotion = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
