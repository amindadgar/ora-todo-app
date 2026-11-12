/* Login-flow checks (needs `npm run dev`; uses the dev-only ?mockGoogle=<id> hook instead of real Google). node e2e/login.cjs */
const { chromium } = require('playwright'); let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const BASE = 'http://localhost:5173/?today=2026-10-06&splash=0&lang=en&theme=light';
(async () => {
  const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); p.on('pageerror', (e) => { console.log('PAGEERROR', e); fails++; });
  const open = async (acct) => { await p.goto(BASE + (acct ? `&mockGoogle=${acct}` : '')); await p.waitForTimeout(500); };
  await p.goto(BASE); await p.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('ora'); }); await open('acct1');

  ok(await p.isVisible('.login') && !(await p.isVisible('.sidenav')), 'first visit shows the login screen, no app shell');
  ok(await p.isVisible('text=Continue with Google') && !(await p.isVisible('text=Try it with demo data')), 'login offers Google only');
  // demo path
  await p.goto(BASE + '&guest=1'); await p.waitForTimeout(400);
  ok(await p.isVisible('h1:has-text("Hi Amin")'), 'demo: greeting is "Hi Amin"'); ok((await p.locator('.taskrow').count()) === 5, 'demo: the 5 sample tasks are there');
  // guest → Google
  await p.click('.sidenav__item:has-text("Settings")'); await p.waitForTimeout(400); ok(await p.isVisible('text=Demo data'), 'settings shows the Demo data account');
  ok(await p.isVisible('text=Preview as a new user'), 'demo account has the "preview as new user" switch');
  await p.click('button:has-text("Sign in with Google")'); await p.waitForTimeout(400); ok(await p.isVisible('.login'), 'guest "Sign in with Google" returns to login');
  await p.click('[data-testid=google-mock]'); await p.waitForTimeout(500);
  ok(await p.isVisible('h1:has-text("Hi Sara")'), 'Google: greeting uses the account first name');
  ok((await p.locator('.taskrow').count()) === 0 && await p.isVisible('text=Nothing planned for today yet'), 'Google: Home is empty (no demo tasks)');
  ok(!(await p.isVisible('text=Bike ride in the park')), 'Google: no free-time suggestion from demo ideas');
  await p.click('.sidenav__item:has-text("Money")'); await p.waitForTimeout(300); ok(await p.isVisible('text=No income or spending yet'), 'Google: Money is empty');
  await p.click('.sidenav__item:has-text("Key dates")'); await p.waitForTimeout(200); ok(await p.isVisible('text=No key dates yet'), 'Google: Key dates empty');
  await p.click('.sidenav__item:has-text("Goals")'); await p.waitForTimeout(1300); ok(await p.isVisible('text=No goals yet') && !(await p.isVisible('text=in review')), 'Google: Goals empty, no demo year review');
  await p.click('.sidenav__item:has-text("Settings")'); await p.waitForTimeout(400); ok(await p.isVisible('text=acct1@example.com') && await p.isVisible('button:has-text("Sign out")'), 'settings shows the signed-in account');
  ok(!(await p.isVisible('text=Preview as a new user')), 'real account has no "preview as new user" switch');
  // add data as Sara, survive reload
  await p.keyboard.press('Escape'); await p.click('.sidenav__item:has-text("Home")'); await p.keyboard.press('n'); await p.fill('#qa', 'Sara only task today'); await p.click('.sheet__foot button'); await p.waitForTimeout(900);
  ok(await p.isVisible('text=Sara only task'), 'Google: can add a task'); await p.waitForTimeout(500);
  await open('acct1'); ok(await p.isVisible('text=Sara only task') && await p.isVisible('h1:has-text("Hi Sara")'), 'session and data survive a reload');
  // sign out → demo intact
  await p.click('.sidenav__item:has-text("Settings")'); await p.click('button:has-text("Sign out")'); await p.waitForTimeout(500); ok(await p.isVisible('.login'), 'sign out returns to login');
  await p.goto(BASE + '&guest=1'); await p.waitForTimeout(400);
  ok(await p.isVisible('h1:has-text("Hi Amin")') && (await p.locator('.taskrow').count()) === 5 && !(await p.isVisible('text=Sara only task')), 'demo data is intact and separate from the Google account');
  // second Google account is isolated
  await p.click('.sidenav__item:has-text("Settings")'); await p.click('button:has-text("Sign in with Google")'); await open('acct2');
  await p.click('[data-testid=google-mock]'); await p.waitForTimeout(500); ok((await p.locator('.taskrow').count()) === 0, 'a different Google account starts empty and cannot see the first one\'s data');
  await p.click('.sidenav__item:has-text("Settings")'); await p.click('button:has-text("Sign out")'); await p.waitForTimeout(400); await open('acct1');
  await p.click('[data-testid=google-mock]'); await p.waitForTimeout(500); ok(await p.isVisible('text=Sara only task'), 'signing back in to the first account restores its data');
  // clear my data
  await p.click('.sidenav__item:has-text("Settings")'); ok(!(await p.isVisible('button:has-text("Clear my data")')) && !(await p.isVisible('text=Export')), 'no Clear/Export/Import clutter for real accounts'); ok(await p.isVisible('text=Delete my account and data'), 'single delete-account row'); await p.click('.sidenav__item:has-text("Home")'); ok((await p.locator('.taskrow').count()) === 0 && !(await p.isVisible('text=Bike ride')), 'cleared account never gets demo samples');
  await ctx.close();
  // Persian + phone login layout
  const c2 = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' }); const q = await c2.newPage();
  await q.goto(BASE.replace('lang=en', 'lang=fa') + '&mockGoogle=x'); await q.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('ora'); }); await q.goto(BASE.replace('lang=en', 'lang=fa') + '&mockGoogle=x'); await q.waitForTimeout(500);
  ok(await q.evaluate(() => document.documentElement.dir === 'rtl') && await q.isVisible('text=ادامه با گوگل'), 'login is translated and RTL in Persian');
  ok(await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'phone login has no horizontal overflow'); await q.screenshot({ path: 'shots/login-fa-390.png' });
  await browser.close(); console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
