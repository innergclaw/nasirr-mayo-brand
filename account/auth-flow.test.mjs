import test from "node:test";
import assert from "node:assert/strict";
import { isRecoveryCallback, shouldRedirectToAccount, shouldRedirectToDashboard } from "./auth-flow.mjs";

test("authenticated account redirects to the dashboard", () => {
  assert.equal(shouldRedirectToDashboard({ session: { user: { id: "member" } } }), true);
});

test("unauthenticated account stays on the account page", () => {
  assert.equal(shouldRedirectToDashboard({ session: null }), false);
});

test("recovery callback is guarded from dashboard redirect", () => {
  assert.equal(isRecoveryCallback("#access_token=token&type=recovery"), true);
  assert.equal(shouldRedirectToDashboard({ session: { user: {} }, recovery: true }), false);
});

test("unauthenticated dashboard redirects to account", () => {
  assert.equal(shouldRedirectToAccount({ session: null }), true);
});

test("authenticated dashboard does not redirect away", () => {
  assert.equal(shouldRedirectToAccount({ session: { user: {} } }), false);
});

test("dashboard guard only runs on the account path", () => {
  assert.equal(shouldRedirectToDashboard({ session: { user: {} }, currentPath: "/dashboard/" }), false);
});
