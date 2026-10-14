import { test, expect } from "@playwright/test";
test("home adapts without horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your next word. Your next world." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("guest vocabulary survives reload and supports review", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Vocabulary", exact: true })
    .filter({ visible: true })
    .click();
  await page.getByRole("textbox", { name: "New word" }).fill("curious");
  await page
    .getByRole("textbox", { name: "Word meaning" })
    .fill("eager to learn");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "curious", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Vocabulary", exact: true })
    .filter({ visible: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "curious", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Practice flashcards" }).click();
  await page.getByRole("button", { name: "Show meaning" }).click();
  await page.getByRole("button", { name: "good", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "You're caught up" }),
  ).toBeVisible();
});
test("search failure is honest and recoverable", async ({ page }) => {
  await page.route("**/youtube/search*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "YouTube search is not configured." }),
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Everyday English" }).click();
  await expect(page.getByRole("alert")).toContainText("not configured");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});
test("official API results render and open learning screen (mocked provider)", async ({
  page,
}) => {
  await page.route("**/youtube/search*", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: { videoId: "abcdefghijk" },
            snippet: {
              title: "Test lesson",
              channelTitle: "Test creator",
              thumbnails: {},
            },
          },
        ],
      }),
    }),
  );
  await page.route("**/iframe_api", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "window.YT={Player:function(){this.destroy=function(){};}}; window.onYouTubeIframeAPIReady();",
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Everyday English" }).click();
  await page
    .getByRole("button", { name: "YouTube Test lesson Test creator" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Bring your own transcript" }),
  ).toBeVisible();
  await expect(
    page.getByText("actual resolution is unverified."),
  ).toBeVisible();
});
