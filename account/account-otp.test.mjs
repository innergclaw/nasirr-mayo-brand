import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const js = await readFile(new URL("./auth.js", import.meta.url), "utf8");

test("email access accepts the complete Supabase one-time code", () => {
  assert.match(html, /Email me a code/);
  assert.match(html, /autocomplete="one-time-code"/);
  assert.match(html, /minlength="6" maxlength="10" pattern="\[0-9\]\{6,10\}"/);
  assert.match(js, /signInWithOtp/);
  assert.match(js, /verifyOtp\(\{ email: pendingEmail, token, type: "email" \}\)/);
  assert.match(js, /token\.length < 6 \|\| token\.length > 10/);
  assert.doesNotMatch(js, /six-digit code/);
});

test("normal member access no longer asks for a password", () => {
  const emailForm = html.match(/<form class="email-form"[\s\S]*?<\/form>/)?.[0] || "";
  assert.doesNotMatch(emailForm, /type="password"/);
  assert.doesNotMatch(js, /signInWithPassword/);
});

test("Google and email verification open the safe member destination", () => {
  assert.match(js, /signInWithOAuth/);
  assert.match(js, /redirectTo: accountReturnUrl/);
  assert.match(js, /accountReturnUrl = `\$\{window\.location\.origin\}\/account\/`/);
  assert.match(js, /innerg_post_auth_destination/);
  assert.match(js, /window\.location\.replace\(destination\)/);
});

test("member signup screen keeps the verified auth controls", () => {
  assert.match(html, /Create or access your INNERG ID\./);
  assert.match(html, /Get your number\./);
  for (const id of ["auth-status", "member-card", "member-email", "email-form", "code-form", "code-email", "change-email", "recovery-form", "sign-out"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /data-provider="google"/);
  assert.match(html, /@media \(prefers-reduced-motion:reduce\)/);
});

test("member signup explains the INNERG ID ecosystem utility", () => {
  assert.match(html, /more than a member number\. It unlocks the ecosystem/);
  for (const resource of ["Market Watchlist", "Research Desk", "Morning Transmissions", "Member Resources", "Discord Community", "Future Drops and Tools"]) {
    assert.match(html, new RegExp(resource));
  }
  assert.doesNotMatch(html, /Rabbit Holes/);
  assert.match(html, /Your access grows as the INNERG ecosystem grows\./);
});

test("member signup returns to the INNERG ID offer and links the public channels", () => {
  assert.match(html, /href="\.\.\/innergid\/">Back to INNERG ID/);
  assert.doesNotMatch(html, />Back to Home Base</);
  for (const href of [
    "https://www.youtube.com/@innergintel",
    "https://open.substack.com/pub/innergintelligence",
    "https://www.tiktok.com/@innergintel",
  ]) {
    assert.match(html, new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.equal((html.match(/rel="noopener noreferrer"/g) || []).length, 3);
});
