/* Install-to-home-screen behaviour per platform. Needs `npm run dev` (no API needed: uses the demo account). node e2e/install.cjs */
const { chromium } = require('playwright'); let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const URL = (lang = 'en') => `http://localhost:5173/?today=2026-10-06&splash=0&guest=1&lang=${lang}&theme=light`;
const UA = {
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  instagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21E236 Instagram 330.0.0.20.113 (iPhone14,5; iOS 17_4)',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  firefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0'
};
(async () => {
  const browser = await chromium.launch();
  const open = async (o, url = URL(), init) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, reducedMotion: 'reduce', ...o });
    if (init) await ctx.addInitScript(init); const p = await ctx.newPage(); p.on('pageerror', (e) => { console.log('PAGEERROR', e); fails++; });
    await p.goto(url); await p.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('ora'); }); await p.goto(url); await p.waitForTimeout(600); return { ctx, p };
  };
  const goSettings = async (p) => { await p.click('[data-nav=more]'); await p.click('.more__item:last-of-type'); await p.waitForTimeout(500); };

  // ---- Android Chrome: native prompt
  let { ctx, p } = await open({ userAgent: UA.android });
  ok(!(await p.isVisible('.install')), 'no banner until the browser says the app is installable');
  await p.evaluate(() => { window.__prompted = 0; const e = new Event('beforeinstallprompt'); e.prompt = async () => { window.__prompted++; }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); });
  await p.waitForTimeout(300); ok(await p.isVisible('.install') && await p.isVisible('.install >> text=Install'), 'banner appears with an Install button after beforeinstallprompt');
  await p.click('.install button:has-text("Install")'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => window.__prompted) === 1, 'tapping Install opens the native prompt'); ok(await p.isVisible('.toast'), 'a confirmation toast shows once installed'); ok(!(await p.isVisible('.install')), 'banner is gone after installing');
  await ctx.close();

  // ---- iPhone Safari: instructions, dismiss, Settings row
  ({ ctx, p } = await open({ userAgent: UA.ios }));
  ok(await p.isVisible('.install') && await p.isVisible('.install button:has-text("How")'), 'iPhone Safari: banner with "How"');
  await p.click('.install button:has-text("How")'); await p.waitForTimeout(400);
  ok(await p.isVisible('#install-h') && await p.isVisible('text=Add to Home Screen') && (await p.locator('.steps li').count()) === 3, 'iPhone: a 3-step Share → Add to Home Screen guide');
  await p.screenshot({ path: 'shots/install-ios-sheet.png' }); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.screenshot({ path: 'shots/install-ios-banner.png' });
  await p.click('.install button[aria-label="Hide for now"]'); await p.waitForTimeout(300); ok(!(await p.isVisible('.install')), 'closing the banner hides it');
  await p.reload(); await p.waitForTimeout(600); ok(!(await p.isVisible('.install')), '…and it stays hidden after a reload (14 days)');
  await goSettings(p); ok(await p.isVisible('[data-testid=install-row]'), 'the Settings row is still there for later');
  await p.click('[data-testid=install-row] button'); await p.waitForTimeout(400); ok(await p.isVisible('#install-h'), 'Settings → opens the guide');
  await ctx.close();

  // ---- Instagram in-app browser
  ({ ctx, p } = await open({ userAgent: UA.instagram }));
  await p.click('.install button:has-text("How")'); await p.waitForTimeout(400);
  ok(await p.isVisible('text=can’t install apps') && await p.isVisible('button:has-text("Copy link")'), 'in-app browser: explains + offers "Copy link"');
  await ctx.close();

  // ---- already installed (standalone) → nothing shown
  ({ ctx, p } = await open({ userAgent: UA.ios }, URL(), () => { Object.defineProperty(navigator, 'standalone', { value: true }); }));
  ok(!(await p.isVisible('.install')), 'installed app: no banner'); await goSettings(p); ok(!(await p.isVisible('[data-testid=install-row]')), 'installed app: no Settings row');
  await ctx.close();

  // ---- desktop Firefox: no way to install → nothing
  ({ ctx, p } = await open({ userAgent: UA.firefox, viewport: { width: 1440, height: 900 }, hasTouch: false, isMobile: false }));
  await p.click('.sidenav__item:has-text("Settings")'); await p.waitForTimeout(400); ok(!(await p.isVisible('[data-testid=install-row]')) && !(await p.isVisible('.install')), 'desktop Firefox: nothing offered');
  await ctx.close();

  // ---- Persian + login screen link + shortcut
  ({ ctx, p } = await open({ userAgent: UA.ios }, URL('fa')));
  ok(await p.isVisible('.install >> text=Ora را به صفحهٔ اصلی گوشی اضافه کن'), 'Persian banner'); await p.screenshot({ path: 'shots/install-fa-banner.png' });
  await p.click('.install button:has-text("چطور")'); await p.waitForTimeout(400); await p.screenshot({ path: 'shots/install-fa-sheet.png' }); ok(await p.isVisible('text=Add to Home Screen') && await p.isVisible('text=افزودن به صفحهٔ اصلی'), 'Persian guide (keeps the English menu names)');
  await ctx.close();
  ({ ctx, p } = await open({ userAgent: UA.ios }, 'http://localhost:5173/?today=2026-10-06&splash=0&lang=en&theme=light'));
  ok(await p.isVisible('.login') && await p.isVisible('.login button:has-text("Add Ora to your home screen")'), 'login screen offers the install link too'); await ctx.close();
  ({ ctx, p } = await open({ userAgent: UA.android }, URL() + '&add=1'));
  ok(await p.isVisible('#qa') && !location_has(await p.url(), 'add'), 'the home-screen shortcut (/?add=1) opens the Add sheet'); await ctx.close();
  function location_has(u, k) { return new globalThis.URL(u).searchParams.has(k); }
  await browser.close(); console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
