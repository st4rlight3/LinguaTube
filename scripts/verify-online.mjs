import {chromium, expect} from '@playwright/test';
import assert from 'node:assert/strict';
const origin=process.env.TEST_APP_URL||'https://st4rlight3.github.io/LinguaTube/';
const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage({viewport:{width:412,height:915}});
 await page.goto(origin);
 await expect(page.locator('.feed-card').first()).toBeVisible({timeout:70000});
 await page.screenshot({path:'docs/screenshots/redesign-home-live.png',fullPage:false});
 await page.getByRole('button',{name:'Search',exact:true}).click();
 await page.getByLabel('Search query').fill('English conversation');
 await page.getByRole('button',{name:'Submit search'}).click();
 await expect(page.locator('.search-results .feed-card').first()).toBeVisible({timeout:70000});
 assert.ok(await page.locator('.search-results .feed-card').count()>0);
 const first=page.locator('.search-results .feed-card').first();
 console.log('Live search first result:',await first.getAttribute('aria-label'));
 await page.screenshot({path:'docs/screenshots/redesign-search-live.png',fullPage:false});
 await first.click();
 const frame=page.locator('.player-frame');
 await expect(frame).toHaveAttribute('data-playback-state',/ready|cued|unstarted|playing/,{timeout:40000});
 const official=page.frameLocator('iframe[src*="youtube.com/embed/"]');
 const play=official.getByRole('button',{name:/^(Play|Play video|Phát video|Phát|Play \(k\))$/i}).first();
 if(await play.isVisible()) await play.click();
 else await page.getByRole('button',{name:'Play / pause',exact:true}).click();
 await expect(frame).toHaveAttribute('data-playback-state','playing',{timeout:40000});
 await expect.poll(async()=>Number(await frame.getAttribute('data-playback-seconds')),{timeout:30000}).toBeGreaterThan(3);
 await page.screenshot({path:'docs/screenshots/redesign-watch-live.png',fullPage:false});
 console.log('Official iframe reported PLAYING and elapsed >3 seconds. Actual playback resolution is not measured.');
}finally{await browser.close();}
