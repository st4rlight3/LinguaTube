import { test, expect } from "@playwright/test";
// Explicit test-only fixtures: no fabricated catalog ships in the application.
const id = "abcdefghijk";
const cid = "UCabcdefghijklmnopqrstuv";
const item = {
  id,
  snippet: {
    title: "Fixture video",
    channelTitle: "Fixture channel",
    channelId: cid,
    publishedAt: "2026-01-01T00:00:00Z",
    thumbnails: {},
  },
  statistics: { viewCount: "1234" },
  contentDetails: { duration: "PT12M34S" },
};
test.beforeEach(async ({ page }) => {
  await page.route("**/youtube/popular*", (r) =>
    r.fulfill({ json: { items: [item], nextPageToken: "two" } }),
  );
});
test("video feed, pagination and unsupported features are explicit", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Fixture video" }),
  ).toBeVisible();
  await expect(page.getByText("12:34")).toBeVisible();
  await expect(page.getByText(/1,234 views/)).toBeVisible();
  await page.route("**/youtube/popular*page=two", (r) =>
    r.fulfill({
      json: {
        items: [
          {
            ...item,
            id: "lmnopqrstuv",
            snippet: { ...item.snippet, title: "Second fixture" },
          },
        ],
      },
    }),
  );
  await page.getByRole("button", { name: "More videos", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Second fixture" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Shorts", exact: true }).click();
  await expect(page.getByText(/Short duration alone/)).toBeVisible();
  await page
    .getByRole("button", { name: "Subscriptions", exact: true })
    .click();
  await expect(page.getByText(/Google OAuth/)).toBeVisible();
});
test("channel uploads, playlist browsing and local follows persist", async ({
  page,
}) => {
  await page.route("**/youtube/search*", (r) =>
    r.fulfill({
      json: {
        items: [
          {
            ...item,
            id: { channelId: cid },
            snippet: { ...item.snippet, title: "Fixture channel" },
          },
        ],
      },
    }),
  );
  await page.route("**/youtube/channels/" + cid, (r) =>
    r.fulfill({
      json: {
        items: [
          {
            id: cid,
            snippet: {
              title: "Fixture channel",
              description: "Official API fixture",
              thumbnails: {},
            },
            statistics: { subscriberCount: "2000" },
            contentDetails: {
              relatedPlaylists: { uploads: "UUabcdefghijklmnopqrstuv" },
            },
          },
        ],
      },
    }),
  );
  await page.route("**/youtube/playlists/*", (r) =>
    r.fulfill({ json: { items: [item] } }),
  );
  await page.route("**/youtube/channels/*/playlists*", (r) =>
    r.fulfill({
      json: {
        items: [
          {
            ...item,
            id: { playlistId: "PLabcdefghijklmnopqrstuv" },
            snippet: { ...item.snippet, title: "Fixture playlist" },
          },
        ],
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByLabel("Search query").fill("channel");
  await page.getByLabel("Result type").selectOption("channel");
  await page.getByRole("button", { name: "Submit search" }).click();
  await page
    .getByRole("button", {
      name: "YouTube Channel Fixture channel Fixture channel",
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Fixture channel", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Follow in LinguaTube", exact: true })
    .click();
  await page.getByRole("button", { name: "Playlists", exact: true }).click();
  await page
    .getByRole("button", {
      name: "YouTube Playlist Fixture playlist Fixture channel",
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Fixture playlist" }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Subscriptions", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Fixture channel", exact: true }),
  ).toBeVisible();
});
test("paired authorized subtitles support EN VI modes and timing", async ({
  page,
}) => {
  await page.route("**/youtube/search*", (r) =>
    r.fulfill({ json: { items: [] } }),
  );
  await page.route("**/iframe_api", (r) =>
    r.fulfill({
      contentType: "application/javascript",
      body: `window.YT={Player:function(m,o){this.time=1;this.destroy=()=>{};this.getCurrentTime=()=>this.time;this.getPlayerState=()=>1;this.getAvailablePlaybackRates=()=>[1];this.seekTo=t=>this.time=t;this.playVideo=()=>{};this.pauseVideo=()=>{};setTimeout(()=>o.events.onReady({target:this}),0)}};window.onYouTubeIframeAPIReady();`,
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "YouTube Fixture video Fixture channel" })
    .click();
  await page
    .getByRole("checkbox", {
      name: "I own this transcript or have permission to use it.",
    })
    .check();
  await page
    .getByLabel("Import transcript", { exact: true })
    .setInputFiles({
      name: "own.srt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "1\n00:00:01,000 --> 00:00:03,000\nI have been learning English for three years.",
      ),
    });
  await page
    .getByLabel("Import Vietnamese transcript")
    .setInputFiles({
      name: "own-vi.srt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "1\n00:00:01,000 --> 00:00:03,000\nTôi đã học tiếng Anh được ba năm.",
      ),
    });
  const captions = page.getByLabel("Synchronized bilingual subtitles");
  await expect(captions).toContainText("Tôi đã học tiếng Anh được ba năm.");
  await expect(captions).toContainText("I have been learning");
  await page.getByLabel("Transcript language").selectOption("vi");
  await expect(captions).not.toContainText("I have been learning");
  await page.getByLabel("Transcript language").selectOption("en");
  await expect(captions).not.toContainText("Tôi đã học");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
