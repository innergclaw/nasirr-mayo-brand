import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("./", import.meta.url);
const home = await readFile(new URL("index.html", root), "utf8");
const mentorship = await readFile(new URL("mentorship/index.html", root), "utf8");
const script = await readFile(new URL("social-stats.js", root), "utf8");
const styles = await readFile(new URL("social-stats.css", root), "utf8");

test("both public pages load the shared social statistics files", () => {
  assert.match(home, /social-stats\.css\?v=4/);
  assert.match(home, /social-stats\.js\?v=3/);
  assert.match(mentorship, /social-stats\.css\?v=3/);
  assert.match(mentorship, /social-stats\.js\?v=2/);
});

test("social statistics use the supplied values", () => {
  assert.match(script, /data-count-target="719"/);
  assert.match(script, /data-count-target="200000"/);
  assert.match(script, /data-count-target="10" data-count-suffix="K\+"/);
  assert.match(script, /Founders &amp; Business Owners Helped/);
  assert.match(script, /data-count-target="500" data-count-suffix="\+"/);
  assert.doesNotMatch(script, /Substack has 65 subscribers/);
});

test("social numbers count up once when their cards enter the viewport", () => {
  assert.match(script, /new IntersectionObserver/);
  assert.match(script, /observer\.unobserve\(entry\.target\)/);
  assert.match(script, /prefers-reduced-motion: reduce/);
  assert.match(script, /window\.requestAnimationFrame\(step\)/);
});

test("the script mounts one section in the correct page location", () => {
  assert.match(script, /document\.getElementById\(sectionId\)/);
  assert.match(script, /mentorshipTarget \|\| homeTarget/);
  assert.match(script, /buildSection\(mentorshipTarget \? "mentorship" : "home"\)/);
});

test("social numbers use tabular figures and stack on small screens", () => {
  assert.match(styles, /font-variant-numeric:\s*tabular-nums/);
  assert.match(styles, /social-stats__card--youtube \.social-stats__metrics[\s\S]*0\.6fr[\s\S]*1\.4fr/);
  assert.match(styles, /social-stats--home[\s\S]*social-stats__metric:last-child strong[\s\S]*34px/);
  assert.match(styles, /@media \(max-width: 560px\)/);
  assert.match(styles, /grid-template-columns:\s*1fr/);
});
