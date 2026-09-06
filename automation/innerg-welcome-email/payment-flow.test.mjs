import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
const source = stripTypeScriptTypes((await readFile(new URL('./stripe-webhook.ts', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, ''));
async function run({ paid=true, signed=true, sent=false, emailFails=false, receiptFails=false }={}) {
  let handler, sends=0;
  const writes=[];
  const event={type:'checkout.session.completed',data:{object:{id:'cs_test_local',client_reference_id:'00000000-0000-4000-8000-000000000001',payment_status:paid?'paid':'unpaid',metadata:{membership_type:'innerg_founding',monthly_amount_cents:'1000'},subscription:'sub_test_local'}}};
  const service={auth:{admin:{getUserById:async()=>({data:{user:{email:'local@example.com'}},error:null})}},from(table){
    return {upsert:async(value)=>{writes.push({table,value});return {error:null};},select(){return {eq(){return {single:async()=>({data:{membership_number:'LOCAL-TEST',welcome_email_sent_at:sent?'already-sent':null},error:null})};}};},update(value){writes.push({table,value});return {eq:async()=>({error:receiptFails&&value.welcome_email_sent_at?new Error('local receipt failure'):null})};}};
  }};
  class Stripe {webhooks={constructEventAsync:async()=>{if(!signed)throw Error('invalid');return event;}};}
  vm.runInNewContext(source,{Stripe,createClient:()=>service,sendGmail:async p=>{assert.equal(p.email,'local@example.com');sends++;if(emailFails)throw Error('local send failure');},Deno:{env:{get:()=> 'local-test'},serve:h=>{handler=h;}},Request,Response,console,Date});
  const response=await handler(new Request('https://local.invalid/',{method:'POST',body:'{}'}));
  return {status:response.status,sends,writes};
}
let r=await run();assert.equal(r.status,200);assert.equal(r.sends,1);assert.ok(r.writes.some(w=>w.value.welcome_email_sent_at));
r=await run({paid:false});assert.equal(r.sends,0);assert.equal(r.writes.length,0);
r=await run({signed:false});assert.equal(r.status,400);assert.equal(r.writes.length,0);
r=await run({sent:true});assert.equal(r.sends,0);assert.equal(r.status,200);
r=await run({emailFails:true});assert.equal(r.status,500);assert.ok(r.writes.some(w=>w.value.welcome_email_error));
r=await run({receiptFails:true});assert.equal(r.status,500);
console.log('Six isolated payment-flow tests passed. No real users, payments, or database writes.');
