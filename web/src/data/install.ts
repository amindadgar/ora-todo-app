import { create } from 'zustand';
import { detectPlatform, hasInstallPath, bannerSuppressed, type Platform } from '../lib/install';

/** The (non-standard) Chromium install-prompt event. */
interface PromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
const KEY = 'ora-install-dismissed';

const isStandalone = () => {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || window.matchMedia('(display-mode: minimal-ui)').matches
      || (navigator as unknown as { standalone?: boolean }).standalone === true || document.referrer.startsWith('android-app://');
  } catch { return false; }
};
const readDismissed = () => { try { const v = localStorage.getItem(KEY); return v ? +v : null; } catch { return null; } };

interface InstallState {
  platform: Platform; installed: boolean; deferred: PromptEvent | null; dismissedAt: number | null;
  /** Is there any way to install from here (a native prompt, or instructions)? */
  eligible: () => boolean;
  /** Show the home-screen banner (eligible, and not closed in the last two weeks). */
  showBanner: () => boolean;
  dismiss: () => void;
  /** Native prompt where the browser has one; otherwise returns 'help' so the caller opens the instructions. */
  install: () => Promise<'accepted' | 'dismissed' | 'help'>;
}
export const useInstall = create<InstallState>((set, get) => ({
  platform: 'desktop-other', installed: false, deferred: null, dismissedAt: null,
  eligible: () => { const s = get(); return !s.installed && (!!s.deferred || hasInstallPath(s.platform)); },
  // Chromium only fires the install event when the app is installable *and not installed yet*, so there the banner waits for it
  // (otherwise we'd nag people who already installed it and opened it in a tab). Other browsers can't tell us, so they get instructions.
  showBanner: () => { const s = get(); return s.eligible() && !bannerSuppressed(s.dismissedAt) && (!!s.deferred || !s.platform.endsWith('chromium')); },
  dismiss: () => { const t = Date.now(); try { localStorage.setItem(KEY, String(t)); } catch { /* private mode */ } set({ dismissedAt: t }); },
  async install() {
    const d = get().deferred; if (!d) return 'help';
    set({ deferred: null });                       // an event can only be used once
    try { await d.prompt(); const r = await d.userChoice; if (r.outcome === 'accepted') set({ installed: true }); return r.outcome; } catch { return 'help'; }
  }
}));

/** Call once at start-up, before React renders: `beforeinstallprompt` can fire before any component mounts. */
export function initInstall() {
  const nav = navigator as Navigator & { maxTouchPoints?: number };
  useInstall.setState({ platform: detectPlatform({ ua: nav.userAgent, platform: nav.platform, maxTouchPoints: nav.maxTouchPoints }), installed: isStandalone(), dismissedAt: readDismissed() });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); useInstall.setState({ deferred: e as PromptEvent }); });
  window.addEventListener('appinstalled', () => useInstall.setState({ installed: true, deferred: null }));
  try { window.matchMedia('(display-mode: standalone)').addEventListener('change', () => useInstall.setState({ installed: isStandalone() })); } catch { /* old browsers */ }
}
