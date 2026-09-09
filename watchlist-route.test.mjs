import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {getSafeDestination} from './account/auth-flow.mjs';
test('watchlist return destination stays same-origin',()=>{
  assert.equal(getSafeDestination('?next=%2Fwatchlist%2F'),'/watchlist/');
  assert.notEqual(getSafeDestination('?next=https://evil.example/watchlist/'),'https://evil.example/watchlist/');
});
test('public mirror never includes private research',async()=>{
  assert.deepEqual((await readdir('watchlist')).sort(),['app.js','brief.mjs','display.mjs','index.html','interactive-charts.mjs','member-access.mjs','news.mjs','section-nav.mjs','styles.css','weekly-mover.mjs'].sort());
  const app=await readFile('watchlist/app.js','utf8');
  assert.match(app,/https:\/\/innergclaw.github.io\/innerg-watchlist\/data\/watchlist.json/);
  const auth=await readFile('watchlist/member-access.mjs','utf8');
  assert.match(auth,/account\/\?next=%2Fwatchlist%2F/);
  assert.match(auth,/functions.invoke\('member-research'/);
});
