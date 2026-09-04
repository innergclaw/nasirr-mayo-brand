import test from "node:test";
import assert from "node:assert/strict";
import { ACTIVATION_DELAYS_MS, classifyMemberAccess, isCheckoutReturn } from "./access-flow.mjs";

test("recognizes only the fixed INNERG membership return", () => {
  assert.equal(isCheckoutReturn("?membership=success"), true);
  assert.equal(isCheckoutReturn("?membership=failed"), false);
  assert.equal(isCheckoutReturn("?next=https://example.com"), false);
});

test("keeps unauthenticated visitors outside the member hub", () => {
  assert.equal(classifyMemberAccess({ hasSession: false }), "sign-in");
});

test("renders an active member immediately", () => {
  assert.equal(classifyMemberAccess({ hasSession: true, membershipNumber: "INNERG-000001" }), "active");
});

test("shows activation to a signed-in unpaid account", () => {
  assert.equal(classifyMemberAccess({ hasSession: true, statusCode: 403 }), "activate");
});

test("retries a paid return while the Stripe webhook finishes", () => {
  assert.equal(classifyMemberAccess({
    hasSession: true,
    statusCode: 403,
    checkoutReturn: true,
    attempt: 0,
  }), "retry");
  assert.equal(classifyMemberAccess({
    hasSession: true,
    statusCode: 409,
    checkoutReturn: true,
    attempt: ACTIVATION_DELAYS_MS.length - 1,
  }), "processing");
});

test("does not hide server failures behind the payment screen", () => {
  assert.equal(classifyMemberAccess({ hasSession: true, statusCode: 500, checkoutReturn: true }), "error");
});
