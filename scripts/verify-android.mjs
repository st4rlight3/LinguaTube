import {chromium,expect} from '@playwright/test';
const target=await (await fetch('http://127.0.0.1:9223/json/list')).json();
const app=target.find(p=>p.url.startsWith('https://com.st4rlight3.linguatube'));
if(!app)throw new Error('LinguaTube debug WebView is not running.');
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223',{noDefaults:true});
const page=browser.contexts()[0].pages()[0];
try{
 await page.getByRole('button',{name:'Search',exact:true}).click();
 await page.getByLabel('Search query').fill('English conversation');
 await page.getByRole('button',{name:'Submit search'}).click();
 await expect(page.locator('.search-results .feed-card').first()).toBeVisible({timeout:70000});
 console.log('Android native WebView live search:',await page.locator('.feed-card').first().getAttribute('aria-label'));
 await page.screenshot({path:'docs/screenshots/android-native-search.png'});
 await page.locator('.feed-card').first().click();
 const player=page.locator('.player-frame');
 await expect(player).toHaveAttribute('data-playback-state',/ready|cued|unstarted|playing/,{timeout:40000});
 const official=page.frameLocator('iframe[src*="youtube.com/embed/"]');
 const play=official.getByRole('button',{name:/^(Play|Play video|Phát video|Phát|Play \(k\))$/i}).first();
 if(await play.isVisible())await play.click();else await page.getByRole('button',{name:'Play / pause',exact:true}).click();
 await expect.poll(async()=>Number(await player.getAttribute('data-playback-seconds')),{timeout:45000}).toBeGreaterThan(3);
 console.log('Android native WebView official playback advanced:',await player.getAttribute('data-playback-seconds'));
 await page.screenshot({path:'docs/screenshots/android-native-watch.png'});
}catch(e){await page.screenshot({path:'docs/screenshots/android-native-failure.png'});console.error('Native verification:',e.message);console.log('Visible app alerts:',await page.getByRole('alert').allTextContents());process.exitCode=1;}
finally{await browser.close();}
