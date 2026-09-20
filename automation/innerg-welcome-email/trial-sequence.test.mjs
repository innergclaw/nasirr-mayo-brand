import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const appsScript = await readFile(new URL("./Code.gs", import.meta.url), "utf8");
const worker = await readFile(new URL("../../supabase/functions/innerg-trial-email-worker/index.ts", import.meta.url), "utf8");
const migration = await readFile(new URL("../../supabase/migrations/20260920191305_innerg_trial_email_sequence.sql", import.meta.url), "utf8");
const scope = {
  Utilities: { formatDate: () => "Sunday, September 27 at 12:00 AM EDT" },
  console,
};
vm.createContext(scope);
vm.runInContext(appsScript, scope);

test("trial email copy covers days 0, 3, 6, and 7", () => {
  const types = ["trial_day_0", "trial_day_3", "trial_day_6", "trial_day_7"];
  const subjects = types.map((type) => scope.buildMessage_(type, "Nasirr", "INNERG-TEST", "2026-09-27T04:00:00Z").subject);
  assert.equal(new Set(subjects).size, 4);
  assert.match(subjects[0], /starts now/);
  assert.match(subjects[2], /ends tomorrow/);
  assert.match(subjects[3], /has ended/);
  assert.match(scope.buildMessage_("trial_day_6", "Nasirr", "INNERG-TEST", "2026-09-27T04:00:00Z").plainText, /\$15 monthly.*\$150 for 12 months/);
});

test("Apps Script uses one durable delivery key per stage and member", () => {
  assert.match(appsScript, /const key = messageType \+ ':' \+ memberId/);
  assert.match(appsScript, /properties\.setProperty\(key, 'sending'\)/);
  assert.match(appsScript, /properties\.setProperty\(key, 'sent'\)/);
});

test("database schedules only verified Sunday trial claims", () => {
  for (const stage of ["trial_day_0", "trial_day_3", "trial_day_6", "trial_day_7"]) assert.match(migration, new RegExp(stage));
  assert.match(migration, /u\.email_confirmed_at is not null/);
  assert.match(migration, /m\.access_source = 'sunday_free'/);
  assert.match(migration, /unique \(claim_id, stage\)/);
  assert.match(migration, /for update of d skip locked/);
});

test("worker records every send result and never exposes the Gmail secret", () => {
  assert.match(worker, /lease_innerg_trial_emails/);
  assert.match(worker, /complete_innerg_trial_email/);
  assert.match(worker, /x-worker-secret/);
  assert.doesNotMatch(worker, /WEBHOOK_SECRET\s*=|AKIA|sk_live_/);
});
