import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const js = await readFile(new URL("./auth.js", import.meta.url), "utf8");

test("INNERG ID route presents the named member credential", () => {
  assert.match(html, /Your place has a number/);
  assert.match(html, /id="id-name"/);
  assert.match(html, /id="id-number"/);
  assert.match(html, /firstName/);
  assert.match(html, /lastName/);
});

test("INNERG ID is guarded and loads the secured member record", () => {
  assert.match(js, /account\/\?next=%2Finnerg-id%2F/);
  assert.match(js, /functions\.invoke\("innerg-member-access", \{ method: "GET" \}\)/);
  assert.match(js, /functions\.invoke\("innerg-member-access"/);
});

test("paid members wait for activation and open the Media Hub", () => {
  assert.match(js, /isCheckoutReturn/);
  assert.match(js, /ACTIVATION_DELAYS_MS/);
  assert.match(js, /Checking payment and activating your INNERG ID/);
  assert.match(js, /history\.replaceState\(\{\}, "", `\$\{window\.location\.pathname\}#media-hub`\)/);
  assert.match(js, /scrollIntoView/);
});

test("payment return does not claim confirmation from a URL parameter", () => {
  assert.doesNotMatch(js, /Payment received|Payment confirmed|You will not be charged twice/);
  assert.doesNotMatch(html, /https:\/\/discord\.gg\//);
  assert.match(js, /member\.discordUrl/);
  assert.match(html, /https:\/\/innergclaw\.github\.io\/innerg-watchlist\//);
});

test("signed-in unpaid accounts receive a clear activation path", () => {
  assert.match(html, /id="activation-panel"/);
  assert.match(html, /Activate your \$10 monthly INNERG ID/);
  assert.match(html, /href="\.\.\/innergid\/#access"/);
  assert.match(js, /showActivationPanel/);
});

test("member card contains no OwnYourWeb client portal destination", () => {
  assert.doesNotMatch(html + js, /ownyourweb\.marketing\/portal/i);
});

test("card motion respects reduced motion", () => {
  assert.match(html, /prefers-reduced-motion:reduce/);
  assert.match(js, /prefers-reduced-motion: reduce/);
});

test("member can save or share a completed INNERG ID", () => {
  assert.match(html, /id="download-card"/);
  assert.match(html, /id="share-card"/);
  assert.match(js, /canvas\.toBlob/);
  assert.match(js, /navigator\.share/);
  assert.match(js, /new File\(\[blob\]/);
  assert.match(js, /image\/png/);
});

test("member Media Hub uses verified release access", () => {
  assert.match(html, /id="media-hub"/);
  assert.match(html, /The End-of-Year Frequency/);
  assert.match(html, /2026-2027 BULL SUPER CYCLE/);
  assert.match(js, /member\.videoAccess && \(member\.videoChapters\?\.length \|\| member\.videoUrl\)/);
  assert.match(js, /setVideoChapters/);
  assert.match(js, /mediaVideo\.addEventListener\("ended"/);
  assert.match(html, /id="media-chapters"/);
  assert.match(html, /This release is included with active INNERG membership\./);
  assert.doesNotMatch(html, /membership\/#video-access/);
  assert.doesNotMatch(js, /Purchase this release once/);
});
