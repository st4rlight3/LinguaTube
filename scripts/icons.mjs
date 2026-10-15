import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const svg=await readFile('public/icon.svg','utf8');
const browser=await chromium.launch();
for(const size of [180,192,512]){
 const page=await browser.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});
 await page.setContent(`<html><body style="margin:0;background:#143f3d">${svg.replace('<svg ','<svg style="width:100vw;height:100vh" ')}</body></html>`);
 await page.screenshot({path:`public/icon-${size}.png`});
 await page.close();
}
await browser.close();
