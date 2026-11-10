/**
 * End-to-end smoke test on an emulated iPhone.
 * Usage: npm run build && npx vite preview --port 4173 & node tests/e2e/smoke.cjs [url] [screenshotDir]
 * Requires the `playwright` package with a Chromium browser available.
 */
const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const URL = process.argv[2] || 'http://localhost:4173/';
const SHOTS = process.argv[3];
let step = 0;
const log = (m) => console.log(`✔ ${++step}. ${m}`);

async function run(deviceName) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices[deviceName], acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__hotel.game.state)));
  const shot = async (n) => SHOTS && page.screenshot({ path: path.join(SHOTS, `${deviceName.replace(/\W+/g, '_')}-${n}.png`) });

  console.log(`\n=== ${deviceName} ===`);
  await page.goto(URL);
  await page.waitForFunction(() => window.__hotel && document.getElementById('splash') === null, null, { timeout: 15000 });
  assert.equal(await page.locator('canvas').count(), 1);
  assert.equal(await page.evaluate(() => document.documentElement.dir), 'rtl');
  log('game loads, canvas present, RTL document');

  // Clock runs
  const m0 = (await state()).clock.minute;
  await page.waitForTimeout(1200);
  assert.ok((await state()).clock.minute > m0, 'clock should advance');
  log('game clock advances');

  // Speed controls
  await page.getByRole('button', { name: 'השהיה' }).click();
  const paused = (await state()).clock.minute;
  await page.waitForTimeout(800);
  assert.equal((await state()).clock.minute, paused);
  await page.getByRole('button', { name: 'מהירות מרבית' }).click();
  assert.equal((await state()).clock.speed, 4);
  await page.getByRole('button', { name: 'מהירות רגילה' }).click();
  log('pause / speed buttons work');

  // Tap a room on the canvas → room card
  const pt = await page.evaluate(() => {
    const { game, world } = window.__hotel;
    const room = game.rooms()[1];
    world.camera.centerOn(0, 0, 1);
    world.recenter(false);
    const cx = room.x + room.w / 2, cy = room.y + 1.5, z = 0.16;
    const sx = (cx - cy) * 32, sy = (cx + cy) * 16 - z * 36;
    const r = world.root;
    return { x: sx * r.scale.x + r.x, y: sy * r.scale.y + r.y };
  });
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(400);
  await page.locator('.room-card.open').waitFor();
  assert.match(await page.locator('.room-card h3').innerText(), /102/);
  await shot('room-card');
  log('tapping a room in the world opens its info card');
  await page.locator('.room-card .icon-btn').click();

  // Tabs
  for (const tab of ['מלון', 'אורחים', 'צוות', 'ניהול', 'בנייה']) {
    await page.locator('.tab', { hasText: tab }).click();
    await page.locator('.sheet.open').waitFor();
    await page.waitForTimeout(350);
    await shot(`tab-${tab}`);
  }
  log('all 5 tabs open their panels');

  // Pricing persists across reload
  await page.locator('.tab', { hasText: 'ניהול' }).click();
  await page.locator('.sheet.open').waitFor();
  await page.getByRole('button', { name: '+50' }).first().click();
  await page.getByRole('button', { name: '+50' }).first().click();
  const price = (await state()).pricing.room_standard;
  assert.equal(price, 790);
  await page.locator('.sheet .icon-btn').first().click();
  await page.reload();
  await page.waitForFunction(() => window.__hotel && document.getElementById('splash') === null);
  assert.equal((await state()).pricing.room_standard, 790);
  log('price change saved and survives a page reload');

  // View toggle
  await page.getByRole('button', { name: 'view' }).click();
  assert.equal((await state()).settings.view, 'exterior');
  await page.waitForTimeout(300);
  await shot('exterior');
  await page.getByRole('button', { name: 'view' }).click();
  assert.equal((await state()).settings.view, 'interior');
  log('interior / exterior view toggle');

  // Manual backup + restore
  await page.getByRole('button', { name: 'תפריט ושמירות' }).click();
  await page.getByRole('button', { name: 'צור גיבוי ידני' }).click();
  await page.waitForTimeout(200);
  assert.equal(await page.locator('.sheet .row').count(), 1);
  await page.evaluate(() => { window.__hotel.game.state.finance.money = 1; window.__hotel.game.save(); });
  await page.getByRole('button', { name: 'שחזר' }).first().click();
  await page.locator('.dialog').getByRole('button', { name: 'שחזר' }).click();
  await page.waitForTimeout(300);
  assert.equal((await state()).finance.money, 250000);
  await shot('menu-backups');
  log('manual backup → modify → restore brings the old state back');

  // Export / import
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'ייצוא לקובץ' }).click()]);
  const file = path.join(os.tmpdir(), `ht-${Date.now()}.json`);
  await download.saveAs(file);
  const exported = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(exported.magic, 'HOTEL_TYCOON_SAVE');
  await page.evaluate(() => { window.__hotel.game.state.finance.money = 5; });
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'ייבוא מקובץ' }).click()]);
  await chooser.setFiles(file);
  await page.waitForFunction(() => window.__hotel.game.state.finance.money === 250000);
  log('export to file and import from file');

  // New game
  await page.evaluate(() => { window.__hotel.game.state.finance.money = 7; });
  await page.getByRole('button', { name: 'משחק חדש' }).click();
  await page.locator('.dialog').getByRole('button', { name: 'משחק חדש' }).click();
  await page.waitForTimeout(300);
  const fresh = await state();
  assert.equal(fresh.finance.money, 250000);
  assert.equal(fresh.clock.day, 1);
  log('new game (with safety backup of the previous one)');

  // Day rollover → automatic backup
  const autoBefore = await page.evaluate(() => window.__hotel.game.saves.listBackups().filter((b) => b.kind === 'auto').length);
  await page.evaluate(() => { const g = window.__hotel.game; g.state.clock.minute = 24 * 60 - 2; g.setSpeed(4); });
  await page.waitForFunction(() => window.__hotel.game.state.clock.day === 2, null, { timeout: 5000 });
  const autoAfter = await page.evaluate(() => window.__hotel.game.saves.listBackups().filter((b) => b.kind === 'auto').length);
  assert.ok(autoAfter > autoBefore || autoAfter === 5);
  log('new game day creates an automatic backup');

  // Night rendering
  await page.evaluate(() => { window.__hotel.game.state.clock.minute = 22 * 60; window.__hotel.game.setSpeed(0); });
  await page.waitForTimeout(400);
  await shot('night');
  log('night lighting renders');

  assert.deepEqual(errors, [], 'no console / page errors');
  log('no JavaScript errors');
  await browser.close();
}

(async () => {
  for (const d of ['iPhone 14 Pro', 'iPhone SE']) await run(d);
  console.log('\nALL SMOKE TESTS PASSED');
})().catch((e) => {
  console.error('\nSMOKE TEST FAILED:', e.message);
  process.exit(1);
});
