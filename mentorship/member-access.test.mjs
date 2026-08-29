import test from "node:test";
import assert from "node:assert/strict";
import { getMemberAccessState, getMemberDisplayName } from "./member-access-state.mjs";

test("signed-out visitors see the login state", () => {
  assert.deepEqual(getMemberAccessState(null), {
    state: "signed-out",
    label: "Log In",
    href: "../account/",
    ariaLabel: "Log in to member access",
  });
});

test("signed-in members see their saved display name", () => {
  const state = getMemberAccessState({ user: { user_metadata: { full_name: "Nasirr Mayo" } } });
  assert.equal(state.label, "Logged In As Nasirr Mayo");
  assert.equal(state.href, "../dashboard/");
  assert.equal(state.state, "signed-in");
});

test("email names are formatted when profile names are missing", () => {
  assert.equal(getMemberDisplayName({ email: "innerg.member@example.com" }), "Innerg Member");
});
