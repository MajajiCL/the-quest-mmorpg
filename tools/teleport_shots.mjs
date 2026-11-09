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
await page.waitForTimeout(2000);

// Enter world
await page.locator('#btn-start-world').click({ force: true });
await page.waitForTimeout(3000);

// 1. South Harbor Pier looking at Gantry Crane & Cargo
await page.evaluate(() => {
  if (window.__teleportTo) window.__teleportTo(0, 1.2, 80);
});
await page.waitForTimeout(1500);
await page.screenshot({ path: join(outDir, '01-earth-harbor-crane.png') });

// 2. North Spaceport Launch Gantry & Radar
await page.evaluate(() => {
  if (window.__teleportTo) window.__teleportTo(0, 1.2, -75);
});
await page.waitForTimeout(1500);
await page.screenshot({ path: join(outDir, '01-earth-spaceport-gantry.png') });

// 3. Moon Selene Base & Solar Farm
await page.evaluate(() => {
  if (window.__teleportTo) window.__teleportTo(-12, 261.2, -670);
});
await page.waitForTimeout(1500);
await page.screenshot({ path: join(outDir, '03-moon-base-closeup.png') });

// 4. Mars Ares Prime Colony Dome & Kyber Spire
await page.evaluate(() => {
  if (window.__teleportTo) window.__teleportTo(-620, 341.2, -1090);
});
await page.waitForTimeout(1500);
await page.screenshot({ path: join(outDir, '04-mars-colony-dome.png') });

// 5. Aurelia Grand Celestial Arch & Levitating Monoliths
await page.evaluate(() => {
  if (window.__teleportTo) window.__teleportTo(680, 441.2, -1335);
});
await page.waitForTimeout(1500);
await page.screenshot({ path: join(outDir, '05-aurelia-celestial-arch.png') });

await browser.close();
console.log('Close-up architectural shots taken successfully!');
