import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { eligible, sha256, roleResult } from './rules.mjs';

const source = stripTypeScriptTypes((await readFile(new URL('./index.ts', import.meta.url), 'utf8'))
  .replace(/^import .*;\n/gm, '').replace('export function makeHandler', 'function makeHandler'));
const paid = {status:'active',access_source:'stripe',payment_verified:true,access_expires_at:'2099-01-01T00:00:00Z'};
const identity = '123456789012345678';
function fixture(options = {}) {
  let link = options.link || null;
  let stateUsed = false;
  let membershipReads = 0;
  const requests = [], writes = [];
  const member = () => options.memberships ? options.memberships[Math.min(membershipReads++, options.memberships.length - 1)] : options.member === undefined ? paid : options.member;
  const service = {
    auth: {getUser: async () => ({data:{user:options.invalidAuth ? null : {id:'member-a'}},error:null})},
    from(table) {
      const builder = {
        select(){return builder;}, eq(){return builder;},
        maybeSingle: async () => ({data:table === 'innerg_memberships' ? member() : link,error:null}),
        upsert: async value => {writes.push({table,value}); return {error:null};},
        insert: async value => {writes.push({table,value}); if(options.conflict)return {error:{code:'23505'}}; link={...value,sync_status:'pending',synced_at:null};return {error:null};},
        update(value) {writes.push({table,value}); if(table === 'innerg_discord_links')link={...link,...value};const mutation={eq(){return mutation;},then(resolve){resolve({error:null});}};return mutation;},
      };
      return builder;
    },
    async rpc(name) {
      if(name === 'innerg_discord_consume_state') {const valid=!stateUsed&&!options.invalidState;stateUsed=true;return {data:valid,error:null};}
      if(name === 'innerg_discord_claim')return {data:link?[link]:[],error:null};
      throw Error('Unexpected RPC');
    },
  };
  const request = async (url, init) => {
    requests.push({url,init});
    if(url.endsWith('/oauth2/token'))return Response.json({access_token:'isolated-token'},{status:options.exchangeStatus||200});
    if(url.endsWith('/users/@me'))return Response.json({id:identity,username:'local-test'});
    if(options.networkFails)throw Error('isolated failure');
    const code = options.roleStatus || 204;
    return new Response(code===204?null:JSON.stringify({retry_after:120}),{status:code});
  };
  const scope={eligible,sha256,roleResult,fetch:request,createClient:()=>service,crypto,TextEncoder,URLSearchParams,AbortSignal,Response,Date,Deno:{env:{get:()=> 'isolated-secret'},serve(){}}};
  vm.runInNewContext(source,scope);
  const handler=scope.makeHandler(()=> 'isolated-secret',()=>service,request);
  return {requests,writes,async call(body, token='local-session') {
    const response=await handler(new Request('https://local.invalid',{method:'POST',headers:token?{Authorization:`Bearer ${token}`}:{},body:JSON.stringify(body)}));
    return {status:response.status,data:await response.json()};
  }};
}
const completion={action:'complete',state:'local-state',code:'local-code'};

test('missing or invalid authentication causes no Discord or database mutation',async()=>{
  for(const [options,token] of [[{},''],[{invalidAuth:true},'invalid']]){
    const f=fixture(options);assert.equal((await f.call(completion,token)).status,401);assert.equal(f.requests.length,0);assert.equal(f.writes.length,0);
  }
});
test('unpaid start and completion never call Discord',async()=>{
  for(const action of ['start','complete']) {const f=fixture({member:null});assert.equal((await f.call({...completion,action})).status,403);assert.equal(f.requests.length,0);}
});
test('invalid state fails before code exchange',async()=>{
  const f=fixture({invalidState:true});assert.equal((await f.call(completion)).status,400);assert.equal(f.requests.length,0);
});
test('successful completion resolves identity server-side and rejects replay',async()=>{
  const f=fixture();const result=await f.call({...completion,discord_user_id:'attacker'});
  assert.equal(result.status,200);assert.equal(result.data.status,'active');
  assert.equal(f.writes.find(x=>x.value.discord_user_id).value.discord_user_id,identity);
  assert.equal(f.requests.filter(x=>x.init.method==='PUT').length,1);
  const count=f.requests.length;assert.equal((await f.call(completion)).status,400);assert.equal(f.requests.length,count);
});
test('unique Discord conflict never grants a role',async()=>{
  const f=fixture({conflict:true});assert.equal((await f.call(completion)).status,409);assert.equal(f.requests.some(x=>x.init.method==='PUT'),false);
});
test('existing different Discord account is not replaced',async()=>{
  const f=fixture({link:{user_id:'member-a',discord_user_id:'987654321098765432'}});
  assert.equal((await f.call(completion)).status,409);assert.equal(f.writes.length,0);
});
test('failed code exchange requires a fresh state and does not create a link',async()=>{
  const f=fixture({exchangeStatus:400});assert.equal((await f.call(completion)).status,400);assert.equal(f.writes.length,0);
  const count=f.requests.length;assert.equal((await f.call(completion)).status,400);assert.equal(f.requests.length,count);
});
test('role errors preserve the link and never report active',async()=>{
  for(const [roleStatus,status] of [[403,'sync_error'],[404,'join_server'],[429,'retry'],[500,'sync_error']]) {
    const f=fixture({roleStatus});const r=await f.call(completion);assert.equal(r.status,200);assert.equal(r.data.linked,true);assert.equal(r.data.status,status);
  }
});
test('network failure preserves a retryable link',async()=>{
  const f=fixture({networkFails:true});const r=await f.call(completion);assert.equal(r.data.linked,true);assert.equal(r.data.status,'sync_error');
});
test('entitlement lost during role grant triggers immediate removal',async()=>{
  const f=fixture({memberships:[paid,paid,null]});const r=await f.call(completion);
  assert.equal(r.data.status,'inactive');assert.deepEqual(f.requests.filter(x=>/\/roles\//.test(x.url)).map(x=>x.init.method),['PUT','DELETE']);
});
test('sync on inactive membership removes role rather than granting it',async()=>{
  const f=fixture({member:null,link:{user_id:'member-a',discord_user_id:identity,sync_status:'active',synced_at:null}});
  assert.equal((await f.call({action:'sync'})).data.status,'inactive');assert.equal(f.requests[0].init.method,'DELETE');
});
