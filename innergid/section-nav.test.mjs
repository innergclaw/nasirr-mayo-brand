import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {revealSection} from './section-nav.mjs';
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
test('every public menu link has a unique destination',()=>{
  const nav=html.match(/<nav class="section-nav"[\s\S]*?<\/nav>/)[0];
  const hashes=[...nav.matchAll(/href="#([^"]+)"/g)].map(m=>m[1]);
  assert.equal(hashes.length,6);
  for(const id of hashes) assert.equal(html.split(`id="${id}"`).length-1,1);
  assert.match(nav,/data-public-offer/);
});
test('details open before native anchor navigation',()=>{
  const target={tagName:'DETAILS',open:false};
  const root={querySelector:()=>target,querySelectorAll:()=>[]};
  assert.equal(revealSection(root,'#benefits'),target);
  assert.equal(target.open,true);
  assert.equal(revealSection(root,'#unknown'),null);
});
test('member navigation points to existing member destinations',()=>{
  assert.match(html,/href="\.\.\/innerg-id\/#media-hub"/);
  const css=readFileSync(new URL('./innergid.css',import.meta.url),'utf8');
  assert.match(css,/\.member-nav \{ display: none/);
  assert.match(css,/data-access-view="active".*\.member-nav \{ display: flex/);
  assert.match(css,/scroll-margin-top: 144px/);
});
