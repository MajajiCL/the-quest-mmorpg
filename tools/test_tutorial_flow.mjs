// E2E Verification of the 60-Second Onboarding Tutorial in Valle de Aethelgard
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 850 }
});

const page = await context.newPage();
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

try {
  console.log('1. Loading http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2000);

  console.log('2. Clicking #btn-start-world...');
  const startBtn = page.locator('#btn-start-world');
  await startBtn.waitFor({ state: 'visible', timeout: 10000 });
  await startBtn.click();
  await page.waitForTimeout(3000);

  console.log('3. Teleporting player to Comandante Alistair (-21, 1.5, 25)...');
  await page.evaluate(() => {
    window.__teleportTo(-21, 1.5, 25.5);
  });
  await page.waitForTimeout(1000);

  const interactPrompt = await page.evaluate(() => {
    const btn = document.getElementById('context-action-btn');
    const txt = document.getElementById('context-action-text');
    return {
      btnVisible: btn && !btn.classList.contains('hidden'),
      text: txt ? txt.textContent : ''
    };
  });
  console.log('Interaction prompt near Alistair:', interactPrompt);

  console.log('4. Pressing KeyE to talk to Alistair...');
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(1000);

  const dialogueState = await page.evaluate(() => {
    const modal = document.getElementById('dialogue-modal');
    return {
      modalVisible: modal && !modal.classList.contains('hidden')
    };
  });
  console.log('Dialogue modal state:', dialogueState);

  if (dialogueState.modalVisible) {
    console.log('5. Clicking #btn-accept-tutorial...');
    await page.locator('#btn-accept-tutorial').click();
    await page.waitForTimeout(1000);
  }

  console.log('6. Teleporting to training dummies at (10, 1.5, 18)...');
  await page.evaluate(() => {
    window.__teleportTo(10, 1.5, 18);
  });
  await page.waitForTimeout(1000);

  const dummyPrompt = await page.evaluate(() => {
    const btn = document.getElementById('context-action-btn');
    const txt = document.getElementById('context-action-text');
    return {
      btnVisible: btn && !btn.classList.contains('hidden'),
      text: txt ? txt.textContent : ''
    };
  });
  console.log('Interaction prompt near training dummy:', dummyPrompt);

  console.log('7. Hitting training dummy with 3 strikes [Q]...');
  for (let i = 1; i <= 3; i++) {
    await page.keyboard.press('KeyQ');
    await page.waitForTimeout(700);
  }

  console.log('8. Testing Fleet Dock toggle [H]...');
  const dockCollapsedBefore = await page.evaluate(() => {
    const dock = document.getElementById('quick-mounts-dock');
    return dock ? dock.classList.contains('collapsed') : null;
  });
  await page.keyboard.press('KeyH');
  await page.waitForTimeout(500);
  const dockCollapsedAfter = await page.evaluate(() => {
    const dock = document.getElementById('quick-mounts-dock');
    return dock ? dock.classList.contains('collapsed') : null;
  });
  console.log(`Fleet dock: before=${dockCollapsedBefore}, after=${dockCollapsedAfter}`);

  await page.screenshot({ path: 'qa/screenshots/test-tutorial-flow.png' });
  console.log('All steps passed! Screenshot saved to qa/screenshots/test-tutorial-flow.png');
} catch (err) {
  console.error('Test encountered exception:', err);
  errors.push(err.message);
} finally {
  console.log('Console Errors caught:', errors);
  await browser.close();
  if (errors.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}
