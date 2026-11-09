/**
 * "Add to home screen" support. Browsers differ a lot:
 *  - Chromium (Android/desktop) fires `beforeinstallprompt` → we can show a real Install button.
 *  - iOS (Safari, and Chrome/Edge on iOS 16.4+) has no prompt API → the user must use Share → Add to Home Screen.
 *  - In-app browsers (Instagram, Facebook, Telegram…) can't install at all → ask the user to open the page in a real browser.
 */
export type Platform = 'ios-safari' | 'ios-other' | 'ios-inapp' | 'android-chromium' | 'android-other' | 'android-inapp' | 'desktop-chromium' | 'desktop-safari' | 'desktop-other';
export interface Env { ua: string; platform?: string; maxTouchPoints?: number }

const INAPP = /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|Snapchat|TikTok|BytedanceWebview|Twitter|GSA\/|; wv\)|Telegram/i;

export function detectPlatform({ ua, platform = '', maxTouchPoints = 0 }: Env): Platform {
  // iPadOS 13+ asks for the desktop site by default and reports itself as a Mac with a touch screen
  const ios = /iPhone|iPad|iPod/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
  const inapp = INAPP.test(ua);
  if (ios) return inapp ? 'ios-inapp' : /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? 'ios-other' : 'ios-safari';
  if (/Android/.test(ua)) return inapp ? 'android-inapp' : /Chrome\/|SamsungBrowser/.test(ua) && !/Firefox\//.test(ua) ? 'android-chromium' : 'android-other';
  if (/Chrome\/|Chromium\/|Edg\//.test(ua) && !/OPR\//.test(ua) || /OPR\//.test(ua)) return 'desktop-chromium';
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return 'desktop-safari';
  return 'desktop-other';
}

/** Can we offer *some* way to install on this platform (instructions or a prompt)? Firefox desktop can't. */
export const hasInstallPath = (p: Platform) => p !== 'desktop-other';
export const isIos = (p: Platform) => p.startsWith('ios');
export const isInApp = (p: Platform) => p.endsWith('-inapp');

export const DISMISS_DAYS = 14;
/** The banner stays hidden for two weeks after the user closes it (the Settings row is always there). */
export const bannerSuppressed = (dismissedAt: number | null, now = Date.now()) => dismissedAt != null && now - dismissedAt < DISMISS_DAYS * 86_400_000;
