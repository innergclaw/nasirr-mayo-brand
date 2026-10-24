import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {getSafeDestination} from './account/auth-flow.mjs';
test('watchlist return destination stays same-origin',()=>{
  assert.equal(getSafeDestination('?next=%2Fwatchlist%2F'),'/watchlist/');
  assert.notEqual(getSafeDestination('?next=https://evil.example/watchlist/'),'https://evil.example/watchlist/');
});
test('public mirror never includes private research',async()=>{
  assert.deepEqual((await readdir('watchlist')).sort(),['app.js','assets','brief.mjs','closing-report.mjs','crypto','data','display.mjs','index.html','interactive-charts.mjs','market-update.mjs','member-access.mjs','watchlist-chart.mjs','news.mjs','section-nav.mjs','stocks','styles.css','weekly-mover.mjs'].sort());
  const names=[];
  async function walk(dir,prefix=''){
    for(const entry of await readdir(dir,{withFileTypes:true})){
      const rel=`${prefix}${entry.name}`;
      if(entry.isDirectory()) await walk(`${dir}/${entry.name}`,`${rel}/`);
      else names.push(rel);
    }
  }
  await walk('watchlist');
  assert.equal(names.some(name=>name.endsWith('sunday-brief.json')||name.endsWith('asset-news.json')||name.includes('supabase')),false);
  const app=await readFile('watchlist/app.js','utf8');
  assert.match(app,/const DATA_URL = document\.body\?\.dataset\.dataUrl \|\| 'https:\/\/innergclaw\.github\.io\/innerg-watchlist\/data\/watchlist\.json';/);
  const page=await readFile('watchlist/index.html','utf8');
  assert.match(page,/data-data-url="https:\/\/innergclaw\.github\.io\/innerg-watchlist\/data\/watchlist\.json"/);
  assert.match(page,/data-update-url="https:\/\/innergclaw\.github\.io\/innerg-watchlist\/data\/market-updates\.json"/);
  assert.match(page,/rel="canonical" href="https:\/\/nasirr\.innergintel\.org\/watchlist\/"/);
  const stocks=await readFile('watchlist/stocks/index.html','utf8');
  assert.match(stocks,/data-data-url="https:\/\/innergclaw\.github\.io\/innerg-watchlist\/data\/watchlist\.json"/);
  const closing=await readFile('watchlist/closing-report.mjs','utf8');
  assert.match(closing,/data\/closing-report\.json/);
  assert.match(closing,/assets\/innerg-closing-bell\.svg/);
  const report=JSON.parse(await readFile('watchlist/data/closing-report.json','utf8'));
  assert.notEqual(report.marketDate,'2026-09-22');
  assert.equal(report.gainers.length,5);
  assert.equal(report.losers.length,5);
  assert.equal(new Set([...report.gainers,...report.losers].map(item=>item.symbol)).size,10);
  assert.equal(report.gainers.some(item=>item.sector==='crypto')||report.losers.some(item=>item.sector==='crypto'),false);
  const graphic=await readFile('watchlist/assets/innerg-closing-bell.svg','utf8');
  assert.match(graphic, new RegExp(report.marketDate.slice(0,4)));
  assert.match(graphic, new RegExp(report.gainers[0].symbol));
  const auth=await readFile('watchlist/member-access.mjs','utf8');
  assert.match(auth,/account\/\?next=%2Fwatchlist%2F/);
  assert.match(auth,/functions.invoke\('member-research'/);
});
