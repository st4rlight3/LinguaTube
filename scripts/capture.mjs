import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
await mkdir('docs/screenshots',{recursive:true});
const browser=await chromium.launch();
for(const [name,width,height] of [['desktop',1440,1100],['android-layout',412,915]]){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
 await page.goto('http://127.0.0.1:5173');
 await page.getByRole('button',{name:'LinguaTube home'}).waitFor();
 await page.screenshot({path:`docs/screenshots/${name}.png`,fullPage:true});
 await page.close();
}
await browser.close();
