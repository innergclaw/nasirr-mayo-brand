import test from 'node:test';
import assert from 'node:assert/strict';
import { eligible, sha256, roleResult } from './rules.mjs';
const now = Date.parse('2026-09-06T12:00:00Z');
test('grandfathered members keep access without payment', () => assert.equal(eligible({status:'active',access_source:'grandfathered'}, now), true));
test('paid membership needs verified payment and a future expiry', () => {
  const active = {status:'active',access_source:'stripe',payment_verified:true,access_expires_at:'2026-10-06T12:00:00Z'};
  assert.equal(eligible(active,now),true);
  for (const change of [{access_source:'unknown'},{payment_verified:false},{access_expires_at:null},{access_expires_at:'bad'},{access_expires_at:'2026-09-06T12:00:00Z'},{status:'canceled'}]) assert.equal(eligible({...active,...change},now),false);
  assert.equal(eligible(null,now),false);
});
test('role response classifications never claim access on errors', () => {
  assert.equal(roleResult(204,true),'active');
  assert.equal(roleResult(204,false),'inactive');
  assert.equal(roleResult(404,true),'join_server');
  assert.equal(roleResult(429,true),'retry');
  for (const code of [401,403,500,502]) assert.equal(roleResult(code,true),'sync_error');
});
test('OAuth state stores a SHA256 digest, not the state itself', async () => {
  assert.equal((await sha256('state')).length,64);
  assert.notEqual(await sha256('state'),await sha256('other'));
});
