/* Full-stack sync checks: two "devices" (browser contexts) on one account, offline edits, new-device restore, session expiry,
 * account deletion. Needs Postgres + API (AUTH_MOCK=true) + `npm run dev`. node e2e/sync.cjs */
const { chromium } = require('playwright'); const { execSync } = require('child_process'); let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const DB = process.env.DATABASE_URL || 'postgres://ora@127.0.0.1:5433/ora_dev';
const sql = (q) => execSync(`psql "${DB}" -tA -c "${q}"`).toString().trim();
const URL = 'http://localhost:5173/?today=2026-10-06&splash=0&lang=en&theme=light&mockGoogle=sync1';
(async () => {
  const browser = await chromium.launch(); const mk = async () => { const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); const p = await ctx.newPage(); p.on('pageerror', (e) => { console.log('PAGEERROR', e); fails++; }); p.on('dialog', (d) => d.accept()); return { ctx, p }; };
  const kick = (p) => p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));    // same trigger as returning to the tab
  const signIn = async (p) => { await p.goto(URL); await p.waitForTimeout(500); await p.click('[data-testid=google-mock]'); await p.waitForTimeout(900); };
  const addTask = async (p, text) => { await p.keyboard.press('n'); await p.fill('#qa', text); await p.click('.sheet__foot button'); await p.waitForTimeout(900); };
  const A = await mk(), B = await mk();

  await signIn(A.p); ok(await A.p.isVisible('h1:has-text("Hi Sara")') && (await A.p.locator('.taskrow').count()) === 0, 'device A: new account starts empty');
  await addTask(A.p, 'From phone'); await A.p.waitForTimeout(2500);
  ok(+sql(`select count(*) from records where collection='items'`) === 1, 'the task reached the server (debounced push)');
  await A.p.click('.sidenav__item:has-text("Settings")'); await A.p.waitForTimeout(300); ok((await A.p.textContent('[data-testid=sync-status]')).includes('Synced'), 'settings shows "Synced"');

  await signIn(B.p); await B.p.waitForFunction(() => document.querySelector('.taskrow'), null, { timeout: 8000 }).catch(() => {});
  ok(await B.p.isVisible('text=From phone'), 'device B: first sign-in pulls the existing task');
  await addTask(B.p, 'From laptop'); await B.p.waitForTimeout(2500); await kick(A.p); await A.p.waitForTimeout(1000);
  await A.p.click('.sidenav__item:has-text("Home")'); const t0 = Date.now(); const got = await A.p.waitForSelector('text=From laptop', { timeout: 6000 }).then(() => true, () => false);
  ok(got, `device A receives B's task after a sync (${Date.now() - t0} ms after the nudge)`);

  const row = A.p.locator('.taskrow', { hasText: 'From phone' }); await row.click({ button: 'right' }); await A.p.click('[role=menuitem]:has-text("Delete")'); await A.p.waitForTimeout(2500);
  await kick(B.p); await B.p.waitForTimeout(1000); ok(!(await B.p.isVisible('text=From phone')) && await B.p.isVisible('text=From laptop'), 'a delete on A propagates to B (tombstone)');
  ok(+sql(`select count(*) from records where deleted`) >= 1, 'the server keeps a tombstone');

  // complete a task on B → A sees it done and the Goals activity is synced too
  await B.p.click('.taskrow:has-text("From laptop") [role=checkbox]'); await B.p.waitForTimeout(2500); await kick(A.p); await A.p.waitForTimeout(1000);
  ok(await A.p.isVisible('.taskrow--done:has-text("From laptop")'), 'completion syncs');
  ok(+sql(`select count(*) from records where collection='activity'`) >= 1, 'activity (chart data) syncs');

  // offline edits
  await A.ctx.setOffline(true); await addTask(A.p, 'Written offline'); await A.p.waitForTimeout(2200); await kick(A.p); await A.p.waitForTimeout(800);
  ok(await A.p.isVisible('text=Written offline'), 'offline: the task is saved locally and visible');
  await A.p.click('.sidenav__item:has-text("Settings")'); await A.p.waitForTimeout(300);
  ok((await A.p.textContent('[data-testid=sync-status]')).includes('Offline'), 'offline: status says so');
  ok(+sql(`select count(*) from records where data->>'title' like 'Written offline%'`) === 0, 'offline: nothing reached the server yet');
  await A.ctx.setOffline(false); await A.p.evaluate(() => window.dispatchEvent(new Event('online'))); await A.p.waitForTimeout(1500);
  ok(+sql(`select count(*) from records where data->>'title' like 'Written offline%'`) === 1, 'back online: the queued change is pushed');
  await kick(B.p); await B.p.waitForTimeout(1000); ok(await B.p.isVisible('text=Written offline'), '…and B receives it');

  // reload keeps local data; brand-new device restores everything from the server
  await A.p.goto(URL); await A.p.waitForTimeout(800); ok(await A.p.isVisible('text=Written offline'), 'reload: data and session persist');
  const C = await mk(); await signIn(C.p); await C.p.waitForTimeout(800);
  ok(await C.p.isVisible('text=Written offline') && await C.p.isVisible('.taskrow--done:has-text("From laptop")'), 'a fresh device restores all data from the server');
  ok(!(await C.p.isVisible('text=Bike ride in the park')), 'no demo data leaks into the real account');
  await C.ctx.close();

  // server-side session expiry → next load returns to login (no silent zombie session)
  sql(`delete from sessions`); await A.p.goto(URL); await A.p.waitForTimeout(1500); ok(await A.p.isVisible('.login'), 'expired/revoked session → login screen on next load');
  await signIn(A.p); ok(await A.p.isVisible('text=Written offline'), 're-signing in restores local + server data');

  // delete account
  await A.p.click('.sidenav__item:has-text("Settings")'); await A.p.click('button:has-text("Delete my account and data")'); await A.p.waitForTimeout(1200);
  ok(await A.p.isVisible('.login'), 'delete account → login screen'); ok(+sql(`select count(*) from users`) === 0 && +sql(`select count(*) from records`) === 0, 'the server has no user and no records left');
  await signIn(A.p); ok((await A.p.locator('.taskrow').count()) === 0, 'signing in again after deletion starts from scratch');
  await browser.close(); console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
