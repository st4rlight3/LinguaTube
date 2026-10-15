import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto('https://st4rlight3.github.io/LinguaTube/');
  assert.equal(response.status(), 200);
  await page.getByRole('button', { name: 'LinguaTube home' }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'docs/screenshots/live-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'You', exact: true }).click();
  await page.getByRole('button', { name: /Vocabulary ·/ }).click();
  await page.getByRole('textbox', { name: 'New word' }).fill('curious');
  await page.getByRole('textbox', { name: 'Word meaning' }).fill('eager to learn');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'curious', exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'You', exact: true }).click();
  await page.getByRole('button', { name: /Vocabulary ·/ }).click();
  await expect(page.getByRole('heading', { name: 'curious', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Practice flashcards' }).click();
  await page.getByRole('button', { name: 'Show meaning' }).click();
  await page.getByRole('button', { name: 'good', exact: true }).click();
  await expect(page.getByRole('heading', { name: "You're caught up" })).toBeVisible();
  await page.getByRole('button', { name: 'You', exact: true }).click();
  await page.getByRole('button', { name: 'Account & services', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export guest data' }).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), 'linguatube-guest-export.json');
  assert.equal(await download.failure(), null);
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  const exported = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  assert.equal(exported.vocabulary.length, 1);
  assert.equal(exported.vocabulary[0].payload.word, 'curious');
  assert.deepEqual(errors, []);
  console.log('Public HTTPS frontend: HTTP 200, React rendered, mobile width fits, guest vocabulary persists after reload, review completes, JSON export contains the saved word, no page errors. Online providers and native downloads are not tested.');
} finally {
  await browser.close();
}
