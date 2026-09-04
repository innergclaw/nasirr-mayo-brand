import test from "node:test";
import assert from "node:assert/strict";
import { getSafeDestination, isRecoveryCallback, shouldRedirectToAccount, shouldRedirectToDestination } from "./auth-flow.mjs";

test("authenticated account redirects to the INNERG ID", () => {
  assert.equal(shouldRedirectToDestination({ session: { user: { id: "member" } } }), true);
});

test("unauthenticated account stays on the account page", () => {
  assert.equal(shouldRedirectToDestination({ session: null }), false);
});

test("recovery callback is guarded from dashboard redirect", () => {
  assert.equal(isRecoveryCallback("#access_token=token&type=recovery"), true);
  assert.equal(shouldRedirectToDestination({ session: { user: {} }, recovery: true }), false);
});

test("unauthenticated INNERG ID redirects to account", () => {
  assert.equal(shouldRedirectToAccount({ session: null }), true);
});

test("authenticated INNERG ID does not redirect away", () => {
  assert.equal(shouldRedirectToAccount({ session: { user: {} } }), false);
});

test("account redirect guard only runs on the account path", () => {
  assert.equal(shouldRedirectToDestination({ session: { user: {} }, currentPath: "/innerg-id/" }), false);
});

test("membership is an allowed post-auth destination", () => {
  assert.equal(getSafeDestination("?next=%2Fmembership%2F"), "/membership/");
});

test("untrusted post-auth destinations fall back to the INNERG ID", () => {
  assert.equal(getSafeDestination("?next=https%3A%2F%2Fevil.example"), "/innerg-id/");
  assert.equal(getSafeDestination("?next=%2F%2Fevil.example"), "/innerg-id/");
});
