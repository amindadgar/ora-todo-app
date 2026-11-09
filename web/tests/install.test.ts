import { describe, it, expect } from 'vitest';
import { detectPlatform, hasInstallPath, isInApp, bannerSuppressed, DISMISS_DAYS } from '../src/lib/install';

const UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1',
  iphoneInstagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21E236 Instagram 330.0.0.20.113 (iPhone14,5; iOS 17_4)',
  iphoneTelegram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Telegram',
  ipadDesktopMode: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  androidSamsung: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Mobile Safari/537.36',
  androidFirefox: 'Mozilla/5.0 (Android 14; Mobile; rv:125.0) Gecko/125.0 Firefox/125.0',
  androidWebView: 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36',
  androidFacebook: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0.0.38.108;]',
  desktopChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  desktopEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  desktopFirefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0'
};
describe('detectPlatform', () => {
  it('iOS: Safari vs other browsers vs in-app', () => {
    expect(detectPlatform({ ua: UA.iphoneSafari })).toBe('ios-safari'); expect(detectPlatform({ ua: UA.iphoneChrome })).toBe('ios-other');
    expect(detectPlatform({ ua: UA.iphoneInstagram })).toBe('ios-inapp'); expect(detectPlatform({ ua: UA.iphoneTelegram })).toBe('ios-inapp');
  });
  it('iPadOS in desktop mode is still iOS (Mac UA + touch screen), a real Mac is not', () => {
    expect(detectPlatform({ ua: UA.ipadDesktopMode, platform: 'MacIntel', maxTouchPoints: 5 })).toBe('ios-safari');
    expect(detectPlatform({ ua: UA.macSafari, platform: 'MacIntel', maxTouchPoints: 0 })).toBe('desktop-safari');
  });
  it('Android: Chromium family, Firefox, WebViews and in-app browsers', () => {
    expect(detectPlatform({ ua: UA.androidChrome })).toBe('android-chromium'); expect(detectPlatform({ ua: UA.androidSamsung })).toBe('android-chromium');
    expect(detectPlatform({ ua: UA.androidFirefox })).toBe('android-other'); expect(detectPlatform({ ua: UA.androidWebView })).toBe('android-inapp'); expect(detectPlatform({ ua: UA.androidFacebook })).toBe('android-inapp');
  });
  it('desktop browsers', () => {
    expect(detectPlatform({ ua: UA.desktopChrome })).toBe('desktop-chromium'); expect(detectPlatform({ ua: UA.desktopEdge })).toBe('desktop-chromium');
    expect(detectPlatform({ ua: UA.desktopFirefox })).toBe('desktop-other');
  });
  it('who gets an install path', () => { expect(hasInstallPath('desktop-other')).toBe(false); expect(hasInstallPath('ios-safari')).toBe(true); expect(isInApp('ios-inapp')).toBe(true); expect(isInApp('ios-safari')).toBe(false); });
});
describe('bannerSuppressed', () => {
  it('hides the banner for two weeks after it was dismissed', () => {
    const t = Date.UTC(2026, 10, 9); const day = 86_400_000;
    expect(bannerSuppressed(null, t)).toBe(false); expect(bannerSuppressed(t - day, t)).toBe(true); expect(bannerSuppressed(t - (DISMISS_DAYS - 1) * day, t)).toBe(true); expect(bannerSuppressed(t - DISMISS_DAYS * day, t)).toBe(false);
  });
});
