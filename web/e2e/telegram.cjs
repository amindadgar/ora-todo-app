/* Full-stack check of the Settings → Connect Telegram flow (no real Telegram): the browser creates a link code,
 * we play the Worker and complete the link with the shared secret, and the UI must flip to "Connected".
 * Needs Postgres + API with BOT_SHARED_SECRET (>=32 chars) and TELEGRAM_BOT_USERNAME + `npm run dev`. */
const { chromium } = require('playwright'); let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const SECRET = process.env.BOT_SHARED_SECRET || 'e2e-secret-e2e-secret-e2e-secret-12345';
const API = process.env.API_URL || 'http://127.0.0.1:8080';
const URL = 'http://localhost:5173/?today=2026-10-06&splash=0&lang=en&theme=light&mockGoogle=tg1';
(async () => {
  const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); const p = await ctx.newPage();
  p.on('pageerror', (e) => { console.log('PAGEERROR', e); fails++; }); p.on('popup', (pp) => pp.close().catch(() => {}));
  let code = null; p.on('response', async (r) => { if (r.url().endsWith('/api/v1/telegram/link-code') && r.ok()) code = new URL_(await r.json()).searchParams.get('start'); });
  function URL_(j) { return new globalThis.URL(j.url); }
  await p.goto(URL); await p.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('ora'); }); await p.goto(URL); await p.waitForTimeout(500);
  await p.click('[data-testid=google-mock]'); await p.waitForTimeout(800);
  await p.click('.sidenav__item:has-text("Settings")'); await p.waitForTimeout(500);
  ok(await p.isVisible('[data-testid=telegram-row]'), 'Telegram row is shown when the server has the bot configured');
  await p.click('button:has-text("Connect Telegram")'); await p.waitForTimeout(600);
  ok(!!code, 'a one-time link code was created'); ok(await p.isVisible('text=Open Telegram to finish') && await p.isVisible('text=Waiting for you to press Start'), 'UI shows the link and waits');
  const href = await p.getAttribute('a:has-text("Open Telegram to finish")', 'href'); ok(/^https:\/\/t\.me\/[A-Za-z0-9_]+\?start=[\w-]{20,}$/.test(href), 'deep link has the right shape');
  const bad = await fetch(`${API}/bot/link`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer wrong' }, body: JSON.stringify({ code, chatId: 4242 }) }); ok(bad.status === 401, 'the bot endpoint refuses a wrong secret');
  const good = await fetch(`${API}/bot/link`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${SECRET}` }, body: JSON.stringify({ code, chatId: 4242 }) }); ok(good.status === 200, 'the Worker completes the link');
  await p.waitForSelector('[data-testid=telegram-status]', { timeout: 8000 }).catch(() => {}); ok(await p.isVisible('[data-testid=telegram-status]'), 'UI flips to "Connected" by itself');
  await p.click('button:has-text("Disconnect")'); await p.waitForTimeout(600); ok(await p.isVisible('button:has-text("Connect Telegram")'), 'Disconnect works');
  const me = await fetch(`${API}/bot/me?chatId=4242`, { headers: { authorization: `Bearer ${SECRET}` } }); ok(me.status === 404, 'the bot no longer knows the chat');
  await p.evaluate(() => 0); await p.goto(URL.replace('lang=en', 'lang=fa')); await p.waitForTimeout(800); await p.click('.sidenav__item:nth-of-type(4)').catch(() => {});
  await browser.close(); console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
