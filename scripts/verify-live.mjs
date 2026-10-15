import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto('https://st4rlight3.github.io/LinguaTube/');
  assert.equal(response.status(), 200);
  await page.getByRole('heading', { name: 'Your next word. Your next world.' }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'docs/screenshots/live-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('Public HTTPS frontend: HTTP 200, React rendered, mobile width fits, no page errors. Online providers are not tested.');
} finally {
  await browser.close();
}
