import test from "node:test";
import assert from "node:assert/strict";
import { CAPTCHA_CONFIG, captchaActive, captchaOptions, captchaReady, mountCaptcha } from "./captcha.mjs";

test("captcha ships disabled and changes nothing", async () => {
  assert.equal(CAPTCHA_CONFIG.enabled, false);
  assert.equal(captchaActive(), false);
  assert.deepEqual(captchaOptions(), {});
  assert.equal(captchaReady(), true);
  assert.equal(await mountCaptcha({}), false);
});

test("enabled without a site key stays inactive (fails open to today's behavior)", () => {
  assert.equal(captchaActive({ enabled: true, provider: "turnstile", siteKey: "" }), false);
});

test("enabled with key requires a token before sign-in", () => {
  const config = { enabled: true, provider: "turnstile", siteKey: "public-site-key" };
  assert.equal(captchaActive(config), true);
  assert.equal(captchaReady(config), false);
  assert.deepEqual(captchaOptions(config), {});
});
