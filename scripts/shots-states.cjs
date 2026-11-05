/* Captures sheets/menus + secondary screens. node scripts/shots-states.cjs <outDir> [widths] [langs] [themes] */
const { chromium } = require('playwright');
const out = process.argv[2] || 'shots'; const widths = (process.argv[3] || '390').split(',').map(Number);
const langs = (process.argv[4] || 'en,fa').split(','); const themes = (process.argv[5] || 'light,dark').split(',');
const H = { 390: 844, 834: 1112, 1440: 900 };
const TXT = { en: 'Dentist tomorrow 5pm', fa: 'دندانپزشکی فردا ساعت ۵' };
(async () => {
  require('fs').mkdirSync(out, { recursive: true }); const browser = await chromium.launch();
  for (const w of widths) for (const lang of langs) for (const theme of themes) {
    const ctx = await browser.newContext({ viewport: { width: w, height: H[w] || 900 }, deviceScaleFactor: w < 500 ? 3 : 1, hasTouch: w < 500, isMobile: w < 500, reducedMotion: 'reduce' });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
    const url = (s) => `http://localhost:5173/?today=2026-10-06&splash=0&guest=1&lang=${lang}&theme=${theme}#/${s}`;
    const fresh = async (s) => { await page.goto(url(s)); await page.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('ora'); }); await page.goto(url(s)); await page.waitForTimeout(500); };
    const snap = async (n) => { await page.waitForTimeout(450); await page.screenshot({ path: `${out}/${lang}-${theme}-${n}-${w}.png` }); };
    await fresh('home'); await page.keyboard.press('n').catch(() => {});
    if (!(await page.$('[role=dialog]'))) await page.click('[data-nav=add]');
    await page.fill('#qa', TXT[lang]); await snap('add-sheet'); await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    await page.click('.taskrow__main'); await snap('edit-sheet'); await page.keyboard.press('Escape');
    if (w < 1200) { await page.click('[data-nav=more]'); await snap('more-menu'); await page.keyboard.press('Escape'); }
    for (const s of ['key-dates', 'wishlist', 'goals', 'settings']) { await fresh(s); await snap(s); }
    if (errs.length) console.log('ERRORS', w, lang, theme, errs.slice(0, 3));
    await ctx.close();
  }
  await browser.close();
})();
