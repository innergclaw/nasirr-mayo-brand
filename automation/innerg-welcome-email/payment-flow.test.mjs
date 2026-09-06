import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
const source = stripTypeScriptTypes((await readFile(new URL('./stripe-webhook.ts', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, ''));
const rules = stripTypeScriptTypes((await readFile(new URL('./membership-rules.ts',import.meta.url),'utf8')).replace(/export /g,''));
async function run({ paid=true, signed=true, sent=false, emailFails=false, receiptFails=false }={}) {
  let handler, sends=0;
  const writes=[];
  const event={type:'checkout.session.completed',created:1788696000,data:{object:{id:'cs_test_local',currency:'usd',mode:'subscription',amount_total:1000,client_reference_id:'00000000-0000-4000-8000-000000000001',payment_status:paid?'paid':'unpaid',metadata:{membership_type:'innerg_founding',monthly_amount_cents:'1000'},subscription:'sub_test_local'}}};
  const service={rpc:async(name,value)=>{if(name==="get_innerg_member_record")return {data:[{membership_number:"LOCAL-CARD",first_name:"Local"}],error:null};writes.push({table:name,value});return {error:null};},auth:{admin:{getUserById:async()=>({data:{user:{email:'local@example.com'}},error:null})}},from(table){
    return {upsert:async(value)=>{writes.push({table,value});return {error:null};},select(){return {eq(){return {single:async()=>({data:{membership_number:'LOCAL-TEST',welcome_email_sent_at:sent?'already-sent':null},error:null})};}};},update(value){writes.push({table,value});return {eq:async()=>({error:receiptFails&&value.welcome_email_sent_at?new Error('local receipt failure'):null})};}};
  }};
  class Stripe {subscriptions={retrieve:async()=>({status:'active',items:{data:[{current_period_end:1791288000}]}})};webhooks={constructEventAsync:async()=>{if(!signed)throw Error('invalid');return event;}};}
  vm.runInNewContext(rules+'\n'+source,{Stripe,createClient:()=>service,sendGmail:async p=>{assert.equal(p.email,'local@example.com');assert.equal(p.memberId,'LOCAL-CARD');sends++;if(emailFails)throw Error('local send failure');},Deno:{env:{get:()=> 'local-test'},serve:h=>{handler=h;}},Request,Response,console,Date});
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
