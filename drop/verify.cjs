// UI simulations only. Live database authorization is checked separately.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const OWNER='75677100-97b7-4578-92c5-cf131997b580';
const row={id:'a1111111-1111-4111-8111-111111111111',title:'sample teaching draft',body:'a clear lesson.\n\nhttps://nasirr.innergintel.org/watchlist/',kind:'post',brand:'innerg',status:'ready',created_at:'2026-09-10T00:00:00Z'};
const mode=process.env.DROP_QA_URL||'http://127.0.0.1:8767/drop/';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const report=[];fs.mkdirSync('/tmp/drop-qa',{recursive:true});
 for(const state of ['signedout','denied','founder','failure']){
  const context=await browser.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm',route=>route.fulfill({contentType:'text/javascript',body:`
  let rows=${JSON.stringify([row])};let cb=()=>{};let state=${JSON.stringify(state)};
  export function createClient(){return {auth:{getSession:async()=>({data:{session:state==='signedout'?null:{user:{id:'x'}}}}),getUser:async()=>state==='failure'?{error:new Error('network')}:{data:{user:{id:state==='denied'?'other':'${OWNER}'}}},onAuthStateChange:f=>{cb=f;},signOut:async()=>{cb('SIGNED_OUT');return {}},signInWithOtp:async()=>({}),verifyOtp:async()=>({})},functions:{invoke:async()=>({data:{}})},from:()=>{let op='read',value,selected;const b={select(){return b},order(){return b},limit:async()=>({data:rows}),update(v){op='update';value=v;return b},insert(v){op='insert';value=v;return b},eq(k,v){selected=v;return b},single:async()=>{if(op==='update')rows=rows.map(r=>r.id===selected?{...r,...value}:r);if(op==='insert')rows.unshift({...value,id:crypto.randomUUID(),status:'ready',created_at:new Date().toISOString()});return {data:{id:selected||'new'}}}};return b}}}
  `}));
  await page.goto(mode);await page.waitForFunction(()=>document.querySelector('#loading').hidden);
  if(state==='signedout'){assert(await page.locator('#login').isVisible());assert(!await page.locator('#inbox').isVisible());await page.screenshot({path:'/tmp/drop-qa/login-mobile.png',fullPage:true});}
  if(state==='denied'||state==='failure'){assert(await page.locator('#access-error').isVisible());assert(!await page.locator('#inbox').isVisible());assert.equal(await page.locator('.draft').count(),0);}
  if(state==='founder'){
   await page.waitForSelector('.draft');assert.equal(await page.locator('.draft').count(),1);await page.screenshot({path:'/tmp/drop-qa/inbox-mobile.png',fullPage:true});
   await page.getByRole('button',{name:'open draft'}).click();await page.getByRole('button',{name:'copy text',exact:true}).click();await page.waitForFunction(()=>/copied|selected/.test(document.querySelector('#reader-status').textContent));assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),row.body);
   assert.match(await page.locator('#share-x').getAttribute('href'),/^https:\/\/twitter.com\/intent\/tweet/);
   await page.getByRole('button',{name:'mark as posted'}).click();await page.waitForFunction(()=>document.querySelectorAll('.draft').length===0);
   await page.locator('[data-filter=posted]').click();await page.waitForSelector('.draft');
   await page.getByRole('button',{name:'new draft'}).click();await page.locator('#draft-title').fill('another draft');await page.locator('#draft-body').fill('words from the phone');await page.getByRole('button',{name:'save to inbox'}).click();await page.waitForFunction(()=>!document.querySelector('#editor').open);
   await page.locator('[data-filter=ready]').click();await page.waitForSelector('.draft');assert.match(await page.locator('#items').textContent(),/another draft/);
   await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'/tmp/drop-qa/inbox-desktop.png',fullPage:true});
   await page.locator('#signout').click();assert(await page.locator('#login').isVisible());assert.equal(await page.locator('#items').textContent(),'');assert.equal(await page.locator('#reader-body').textContent(),'');
  }
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow);assert.deepEqual(errors,[]);report.push({state,passed:true});await context.close();
 }
 await browser.close();console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
