/* Screenshot harness: node scripts/shots.cjs <outDir> [screens=home,calendar,money] [widths=390,834,1440] [langs=en,fa] [themes=light,dark]
 * Requires the dev server (npm run dev) on :5173. Uses a fixed "today" (6 Oct 2026) so output matches the design PNGs. */
const { chromium } = require('playwright');
const out = process.argv[2] || 'shots';
const screens = (process.argv[3] || 'home,calendar,money').split(',');
const widths = (process.argv[4] || '390,834,1440').split(',').map(Number);
const langs = (process.argv[5] || 'en,fa').split(','); const themes = (process.argv[6] || 'light,dark').split(',');
const H = { 390: 844, 834: 1112, 1440: 900 };
(async () => {
  require('fs').mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  for (const w of widths) for (const lang of langs) for (const theme of themes) {
    const ctx = await browser.newContext({ viewport: { width: w, height: H[w] || 900 }, deviceScaleFactor: w < 500 ? 3 : 1, reducedMotion: 'reduce' });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    for (const s of screens) {
      await page.goto(`http://localhost:5173/?today=2026-10-06&splash=0&lang=${lang}&theme=${theme}#/${s}`);
      await page.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('ora'); });
      await page.goto(`http://localhost:5173/?today=2026-10-06&splash=0&lang=${lang}&theme=${theme}#/${s}`);
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${out}/${lang}-${theme}-${s}-${w}.png`, fullPage: w >= 768 });
    }
    if (errs.length) console.log('ERRORS', w, lang, theme, errs.slice(0, 3));
    await ctx.close();
  }
  await browser.close();
})();
