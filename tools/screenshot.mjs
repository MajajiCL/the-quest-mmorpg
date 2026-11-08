// Visual QA: captures desktop + mobile screenshots of the running game and logs console errors.
// Usage: node tools/screenshot.mjs [--url http://localhost:3000] [--out qa/screenshots] [--wait 6000] [--click "#btn-start-world"] [--tag name]
import { chromium, devices } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

const url = opt('url', 'http://localhost:3000');
const outDir = opt('out', 'qa/screenshots');
const waitMs = Number(opt('wait', '6000'));
const clickSel = opt('click', '');
const tag = opt('tag', 'shot');
mkdirSync(outDir, { recursive: true });

const profiles = [
  { name: 'desktop', context: { viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 } },
  { name: 'mobile', context: { ...devices['iPhone 13'] } }
];

const browser = await chromium.launch({
  // Software WebGL so screenshots work on machines/CI without a GPU.
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
});

const report = [];
for (const p of profiles) {
  const context = await browser.newContext(p.context);
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(outDir, `${tag}-${p.name}-1-load.png`) });

  if (clickSel) {
    try {
      await page.locator(clickSel).waitFor({ state: 'visible', timeout: 15000 });
      await page.locator(clickSel).click({ force: true });
    } catch (e) {
      errors.push(`click failed (${clickSel}): ${e.message.split('\n')[0]}`);
    }
  }
  await page.waitForTimeout(waitMs);
  await page.screenshot({ path: join(outDir, `${tag}-${p.name}-2-ingame.png`) });

  const fps = await page.evaluate(() => new Promise((res) => {
    let n = 0; const t0 = performance.now();
    const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(Math.round(n / 2)); };
    requestAnimationFrame(f);
  }));

  report.push({ profile: p.name, fpsSoftwareGL: fps, errors });
  await context.close();
}
await browser.close();

writeFileSync(join(outDir, `${tag}-report.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
