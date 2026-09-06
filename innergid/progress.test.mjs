import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const css=await readFile(new URL("../innerg-progress.css",import.meta.url),"utf8");
for(const path of ["./index.html","../innerg-id/index.html"]) {
  test(path+" includes accessible indeterminate progress",async()=>{
    const html=await readFile(new URL(path,import.meta.url),"utf8");
    assert.match(html,/innerg-progress\.css/);
    assert.match(html,/class="innerg-progress" role="progressbar" aria-label="[^"]+"/);
    assert.doesNotMatch(html,/aria-valuenow=/);
    assert.match(html,/class="innerg-progress-fill" aria-hidden="true"/);
  });
}
test("progress stops for reduced motion, errors and completed card access",()=>{
 assert.match(css,/prefers-reduced-motion: reduce/);
 assert.match(css,/animation: none/);
 assert.match(css,/\.status\.is-hidden \+ \.innerg-progress/);
 assert.match(css,/data-access-view="error"/);
 assert.match(css,/\.status\[data-state="error"\]/);
 assert.doesNotMatch(css,/transition:\s*all/);
});
