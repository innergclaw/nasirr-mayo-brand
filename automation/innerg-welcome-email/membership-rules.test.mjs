import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
const scope = {};
vm.runInNewContext(stripTypeScriptTypes((await readFile(new URL("./membership-rules.ts",import.meta.url),"utf8")).replace(/export /g,"")),scope);
const monthly = {payment_status:"paid",currency:"usd",mode:"subscription",amount_total:1000,subscription:"sub_local"};
const yearly = {payment_status:"paid",currency:"usd",mode:"payment",amount_total:10000,metadata:{billing_plan:"yearly"}};
test("accepts only the fixed paid monthly and yearly plans",()=>{
 assert.equal(scope.paidPlan(monthly),"monthly");
 assert.equal(scope.paidPlan(yearly),"yearly");
 for(const invalid of [{...yearly,amount_total:1000},{...monthly,amount_total:700},{...yearly,currency:"eur"},{...yearly,payment_status:"unpaid"},{...yearly,mode:"subscription"},{...monthly,subscription:null},{...yearly,metadata:{billing_plan:"unknown"}}]) assert.equal(scope.paidPlan(invalid),null);
});
test("one-time pass grants one calendar year, including leap-day handling",()=>{
 assert.equal(scope.yearAfter(Date.parse("2026-09-06T10:00:00Z")/1000),"2027-09-06T10:00:00.000Z");
 assert.equal(scope.yearAfter(Date.parse("2028-02-29T10:00:00Z")/1000),"2029-02-28T10:00:00.000Z");
});
test("SQL enforces replay protection, atomic access and service-only mutation",async()=>{
 const sql=await readFile(new URL("../../supabase/migrations/20260906095452_innerg_annual_checkout.sql",import.meta.url),"utf8");
 assert.match(sql,/stripe_checkout_session_id=p_session/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/access_source='grandfathered'/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/from public,anon,authenticated/);
});
test("checkout reuses a durable idempotency reservation and fixed amounts",async()=>{
 const source=await readFile(new URL("../../supabase/functions/innerg-membership-checkout/index.ts",import.meta.url),"utf8");
 assert.match(source,/idempotencyKey:"innerg-checkout:"\+attempt.attempt_id/);
 assert.match(source,/ignoreDuplicates:true/);
 assert.match(source,/stripe.checkout.sessions.retrieve/);
 assert.match(source,/unit_amount:yearly\?10000:MONTHLY_AMOUNT/);
});
