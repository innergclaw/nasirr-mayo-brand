const {chromium} = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true, channel:'chrome'});
 try {
  for (const width of [390, 1440]) {
   const page = await browser.newPage({viewport:{width,height:950}});
   await page.route('**/youtube.com/**',r=>r.abort());
   await page.route('**/youtube-nocookie.com/**',r=>r.abort());
   await page.route('**/functions/v1/innerg-reads',r=>r.fulfill({status:503,json:{error:'Test checkout unavailable. Please try again.'}}));
   await page.goto(process.env.HOME_TEST_URL || 'http://127.0.0.1:8795/', {waitUntil:'domcontentloaded'});
   const slider=page.locator('#movement-slider');
   await slider.waitFor({timeout:60000});
   await slider.focus(); await page.keyboard.press('End');
   assert.equal(await slider.inputValue(),'5');
   assert.equal(await page.locator('#movement-button').innerText(),'Support with $5');
   await page.keyboard.press('Home'); assert.equal(await slider.inputValue(),'1');
   await page.locator('#movement-button').click();
   await page.getByText('Test checkout unavailable. Please try again.').waitFor();
   assert.equal(await page.locator('#movement-button').isEnabled(),true);
   assert.equal(await page.locator('#support-movement').count(),1);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.locator('#support-movement').screenshot({path:`/tmp/home-support-${width}.png`});
   console.log(`PASS ${width}px: slider, keyboard, button, recoverable errors, no overflow`);
   await page.close();
  }
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
