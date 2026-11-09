import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const outDir = 'qa/screenshots/worlds';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
});

const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto('http://localhost:3000', { waitUntil: 'load' });

// Inject 50,000 coins so transit to Mars (600) and Aurelia (950) succeed seamlessly
await page.evaluate(() => {
  try {
    const raw = localStorage.getItem('the_quest_mmorpg_save_v1');
    const data = raw ? JSON.parse(raw) : {};
    data.coins = 50000;
    localStorage.setItem('the_quest_mmorpg_save_v1', JSON.stringify(data));
  } catch {}
});
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(2000);

// Enter world
await page.locator('#btn-start-world').click({ force: true });
await page.waitForTimeout(3000);

// Helper to transit via starmap
async function transitTo(destKey, screenshotName, waitTime = 3000) {
  await page.locator('#btn-starmap').click({ force: true });
  await page.waitForTimeout(500);
  await page.locator(`.attr-card[data-transit="${destKey}"]`).click({ force: true });
  await page.waitForTimeout(waitTime);
  await page.screenshot({ path: join(outDir, screenshotName) });
}

// 1. Dragon Island (Archipelago)
await transitTo('ocean_dragon_island', '02-earth-dragon-island.png');

// 2. Moon (Selene Base Tranquility)
await transitTo('moon_base', '03-moon-base-tranquility.png');

// 3. Mars (Ares Prime Colony)
await transitTo('mars_colony', '04-mars-colony-ares.png');

// 4. Aurelia (Orbital Sanctuary & Rings)
await transitTo('aurelia_ring', '05-aurelia-orbital-ring.png');

await browser.close();
console.log('Mars and Aurelia captured successfully!');
