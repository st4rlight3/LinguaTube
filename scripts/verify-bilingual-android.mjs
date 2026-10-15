import { chromium, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
const browser = await chromium.connectOverCDP("http://127.0.0.1:9223", {
  noDefaults: true,
});
const page = browser
  .contexts()[0]
  .pages()
  .find((p) => p.url().startsWith("https://com.st4rlight3.linguatube"));
if (!page) throw new Error("LinguaTube native WebView not found.");
try {
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "EN + VI", exact: true }).click();
  await expect(page.locator(".feed-card").first()).toBeVisible({
    timeout: 70000,
  });
  console.log(
    "Live authorized catalog video:",
    await page.locator(".feed-card").first().getAttribute("aria-label"),
  );
  await page.locator(".feed-card").first().click();
  await expect(page.locator(".cue")).toHaveCount(32, { timeout: 30000 });
  await expect(page.locator(".caption-source")).toContainText(
    "NASA Scientific Visualization Studio",
  );
  const frame = page.locator(".player-frame");
  await expect(frame).toHaveAttribute(
    "data-playback-state",
    /ready|cued|unstarted|playing/,
    { timeout: 40000 },
  );
  await page.getByRole("button", { name: "0:33", exact: true }).click();
  await expect
    .poll(
      async () => Number(await frame.getAttribute("data-playback-seconds")),
      { timeout: 45000 },
    )
    .toBeGreaterThan(33);
  await expect(
    page.getByLabel("Synchronized bilingual subtitles"),
  ).toContainText("Tôi là Bruce Jakosky");
  await expect(
    page.getByLabel("Synchronized bilingual subtitles"),
  ).toContainText("My name is Bruce Jakosky");
  await page.getByRole("button", { name: "Play / pause", exact: true }).click();
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.getByLabel("Transcript language").selectOption("vi");
  await expect(
    page.getByLabel("Synchronized bilingual subtitles"),
  ).not.toContainText("My name is");
  await page.getByLabel("Transcript language").selectOption("both");
  await page.getByLabel("Transcript text size").press("Home");
  for (let i = 0; i < 8; i++)
    await page.getByLabel("Transcript text size").press("ArrowRight");
  await expect(page.getByLabel("Synchronized bilingual subtitles")).toHaveCSS(
    "font-size",
    "22px",
  );
  console.log(
    "Native bilingual PASS: automatic 32 cues, actual seek/playback >33s, synchronized EN+VI, Vietnamese-only, adjustable font.",
  );
  if (process.env.ADB_PATH) {
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    const playerBox = await frame.boundingBox();
    const subtitleBox = await page
      .getByLabel("Synchronized bilingual subtitles")
      .boundingBox();
    expect(subtitleBox.y).toBeGreaterThanOrEqual(
      playerBox.y + playerBox.height - 1,
    );
    // WebView CDP screenshot can disconnect on some emulator builds; capture the actual device.
    execFileSync(process.env.ADB_PATH, [
      "-s",
      "emulator-5554",
      "shell",
      "screencap",
      "-p",
      "/sdcard/linguatube-bilingual.png",
    ]);
    execFileSync(process.env.ADB_PATH, [
      "-s",
      "emulator-5554",
      "pull",
      "/sdcard/linguatube-bilingual.png",
      "docs/screenshots/android-bilingual-live.png",
    ]);
  }
  if (process.env.ADB_PATH && process.env.VERIFY_FULLSCREEN === "1") {
    await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => innerWidth > innerHeight), {
        timeout: 15000,
      })
      .toBe(true);
    execFileSync(process.env.ADB_PATH, [
      "-s",
      "emulator-5554",
      "shell",
      "input",
      "keyevent",
      "4",
    ]);
    await expect
      .poll(() => page.evaluate(() => !document.fullscreenElement), {
        timeout: 15000,
      })
      .toBe(true);
    await expect
      .poll(() => page.evaluate(() => innerHeight > innerWidth), {
        timeout: 15000,
      })
      .toBe(true);
    await expect(page.locator(".player-frame")).toBeVisible();
    console.log(
      "Native fullscreen landscape and Android Back PASS. Actual playback resolution unmeasured.",
    );
  }
} catch (e) {
  console.error(e.message);
  await page
    .screenshot({
      path: "docs/screenshots/android-bilingual-failure.png",
    })
    .catch(() => {});
  console.log(
    await page
      .getByRole("alert")
      .allTextContents()
      .catch(() => []),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
