import { test, expect } from "@playwright/test";
test('uploaded transcript seeks, highlights and saves dictionary vocabulary (mocked player)',async({page})=>{
  await page.route('**/youtube/search*',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({items:[{id:{videoId:'abcdefghijk'},snippet:{title:'Transcript test',channelTitle:'Test creator',thumbnails:{}}}]})}));
  await page.route('**/iframe_api',route=>route.fulfill({contentType:'application/javascript',body:`window.YT={Player:function(mount,options){this.time=1;this.destroy=function(){};this.getCurrentTime=()=>this.time;this.getPlayerState=()=>1;this.getAvailablePlaybackRates=()=>[1];this.seekTo=(time)=>{this.time=time;};this.playVideo=function(){};this.pauseVideo=function(){};window.testPlayer=this;setTimeout(()=>options.events.onReady({target:this}),0);}};window.onYouTubeIframeAPIReady();`}));
  await page.route('**/dictionary/Hello',route=>route.fulfill({contentType:'application/json',body:JSON.stringify([{word:'hello',phonetic:'/həˈləʊ/',meanings:[{partOfSpeech:'exclamation',definitions:[{definition:'A greeting.'}]}]}])}));
  await page.goto('/');
  await page.getByRole('button',{name:'Everyday English'}).click();
  await page.getByRole('button',{name:'YouTube Transcript test Test creator'}).click();
  await page.getByRole('checkbox').check();
  await page.getByLabel('Import transcript').setInputFiles({name:'authorized.srt',mimeType:'text/plain',buffer:Buffer.from('1\n00:00:01,000 --> 00:00:03,000\nHello world.\n\n2\n00:00:04,000 --> 00:00:06,000\nGood morning.')});
  await expect(page.locator('.cue.current')).toContainText('Hello');
  await page.getByRole('button',{name:'0:04',exact:true}).click();
  await expect(page.locator('.cue.current')).toContainText('Good');
  await page.getByRole('button',{name:'Hello',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('A greeting.');
  await page.getByRole('button',{name:'Save word',exact:true}).click();
  await page.getByRole('button',{name:'Vocabulary',exact:true}).filter({visible:true}).click();
  await expect(page.getByRole('heading',{name:'hello /həˈləʊ/'})).toBeVisible();
});
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
