/* End-to-end interaction checks. Run with the dev server up: node e2e/flows.cjs */
const { chromium } = require('playwright'); let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch();
  const mk = async (w, h, touch) => { const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: !!touch, reducedMotion: 'reduce' }); const p = await ctx.newPage(); p.on('pageerror', (e) => { console.log('PAGEERROR', e); fails++; });
    await p.goto('http://localhost:5173/?today=2026-10-06&splash=0&guest=1&lang=en&theme=light'); await p.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('ora'); }); await p.goto('http://localhost:5173/?today=2026-10-06&splash=0&guest=1&lang=en&theme=light'); await p.waitForTimeout(400); return p; };

  // ---------- desktop ----------
  let p = await mk(1440, 900);
  await p.keyboard.press('n'); ok(await p.isVisible('[role=dialog] #qa'), 'N opens the Add dialog');
  await p.fill('#qa', 'Call mum tomorrow 9am'); await p.waitForTimeout(100);
  ok((await p.textContent('.detect')).includes('Reminder'), 'smart input detects "call" as Reminder');
  await p.keyboard.press('Escape'); ok(!(await p.$('[role=dialog]')), 'Esc closes dialog');
  await p.keyboard.press('n'); await p.fill('#qa', 'Buy flowers today 6pm'); await p.click('.sheet__foot button'); await p.waitForTimeout(900);
  ok(await p.isVisible('.toast'), 'saving shows a toast'); ok(await p.isVisible('text=Buy flowers'), 'new task appears in Today');
  await p.click('.toast__act:has-text("Undo")'); await p.waitForTimeout(200); ok(!(await p.isVisible('text=Buy flowers')), 'Undo removes the saved task');
  // ⋯ menu & right click
  const row = p.locator('.taskrow', { hasText: 'Morning walk' }); await row.hover(); await row.locator('.taskrow__more button').click();
  ok(await p.isVisible('[role=menu]'), '⋯ opens the action menu'); await p.keyboard.press('Escape');
  await row.click({ button: 'right' }); ok(await p.isVisible('[role=menu]'), 'right-click opens the action menu');
  await p.click('[role=menuitem]:has-text("Delete")'); await p.waitForTimeout(200); ok(!(await p.isVisible('.taskrow:has-text("Morning walk")')), 'menu Delete removes the task');
  await p.click('.toast__act:has-text("Undo")'); await p.waitForTimeout(200); ok(await p.isVisible('.taskrow:has-text("Morning walk")'), 'Undo restores it');
  // complete with checkbox → counter
  await p.click('.taskrow:has-text("Read 20 pages") [role=checkbox]'); await p.waitForTimeout(700); ok((await p.textContent('#tasks-h + span')).startsWith('1'), 'checkbox completes the task (counter 1 of 5)');
  // calendar keyboard
  await p.keyboard.press('t'); await p.waitForTimeout(200); ok(p.url().endsWith('#/calendar'), 'T opens the calendar');
  await p.focus('[aria-pressed=true]'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150);
  ok(await p.locator('[aria-pressed=true]').getAttribute('aria-label').then((l) => l.includes('Wednesday') || l.includes('چهارشنبه')), 'ArrowRight selects next day');
  await p.keyboard.press('PageDown'); await p.waitForTimeout(400); ok((await p.textContent('.monthhead__title')).includes('November'), 'PageDown goes to next month');
  await p.keyboard.press('?'); // focus is in grid (not input) → help
  ok(await p.isVisible('#help-h'), '? opens the shortcuts help'); await p.keyboard.press('Escape');
  // wheel
  await p.mouse.move(600, 400); await p.mouse.wheel(0, 200); await p.waitForTimeout(500); ok((await p.textContent('.monthhead__title')).includes('December'), 'mouse wheel changes month');
  // goals +1, settings language
  await p.click('.sidenav__item:has-text("Goals")'); await p.waitForTimeout(1300);
  await p.click('button[aria-label^="Add one to Read 20 books"]'); await p.waitForTimeout(300); ok(await p.isVisible('text=14 of 20 books'), 'Goals +1 increments');
  await p.click('.sidenav__item:has-text("Settings")'); await p.click('[role=radio]:has-text("Persian")'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.documentElement.dir === 'rtl' && document.documentElement.lang === 'fa'), 'switching to Persian sets dir=rtl lang=fa');
  const sideSide = await p.evaluate(() => { const r = document.querySelector('.sidenav').getBoundingClientRect(); return r.left > innerWidth / 2; }); ok(sideSide, 'sidebar mirrors to the right in RTL');
  await p.waitForTimeout(600); await p.goto('http://localhost:5173/?splash=0'); await p.waitForTimeout(600); ok(await p.evaluate(() => document.documentElement.lang === 'fa'), 'settings persist across reload (IndexedDB)');
  await p.context().close();

  // ---------- phone (touch) ----------
  p = await mk(390, 844, true);
  ok(!(await p.isVisible('.sidenav')) && (await p.isVisible('.tabbar')), 'phone shows tab bar, no sidebar');
  await p.click('[data-nav=add]'); ok(await p.isVisible('[role=dialog] #qa'), 'Add tab opens bottom sheet');
  const sheetBox = await p.locator('.sheet').boundingBox(); ok(sheetBox.y > 100 && sheetBox.width >= 389, 'phone uses a full-width bottom sheet');
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  // swipe-left delete via pointer events
  const tr = p.locator('.taskrow__fg').first(); const b = await tr.boundingBox();
  await p.mouse.move(b.x + 250, b.y + 25); await p.mouse.down(); await p.mouse.move(b.x + 200, b.y + 26, { steps: 4 }); await p.mouse.move(b.x + 60, b.y + 26, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(500);
  ok(await p.isVisible('.toast:has-text("Deleted")'), 'swipe left deletes with an Undo toast');
  await p.click('.toast__act:has-text("Undo")'); await p.waitForTimeout(150);
  // long press edit
  const t2 = p.locator('.taskrow__fg').first(); const b2 = await t2.boundingBox();
  await p.mouse.move(b2.x + 150, b2.y + 25); await p.mouse.down(); await p.waitForTimeout(650); await p.mouse.up(); await p.waitForTimeout(300);
  ok(await p.isVisible('#ed-in'), 'long-press opens the edit sheet');
  // drag sheet down to dismiss
  const g = await p.locator('.sheet__grab').boundingBox(); await p.mouse.move(g.x + 150, g.y + 10); await p.mouse.down(); await p.mouse.move(g.x + 150, g.y + 80, { steps: 5 }); await p.mouse.move(g.x + 150, g.y + 200, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(500);
  ok(!(await p.$('#ed-in')), 'dragging the sheet down dismisses it');
  await p.click('[data-nav=more]'); ok(await p.isVisible('.more'), 'More opens the drawer');
  await p.context().close(); await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
