import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source=(await readFile(new URL('./callback.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
async function run({search='?state=expected&code=code',expected='expected',signedIn=true,backendError=false}={}) {
  const node={textContent:''};const calls=[],historyCalls=[],removed=[],redirects=[];
  const scope={
    URLSearchParams,
    location:{search,pathname:'/innerg-id/discord-callback/',replace:value=>redirects.push(value)},
    history:{replaceState:(...args)=>historyCalls.push(args)},
    document:{querySelector:()=>node},
    sessionStorage:{getItem:()=>expected,removeItem:key=>removed.push(key)},
    createClient:()=>({
      auth:{getUser:async()=>({data:{user:signedIn?{id:'member-a'}:null},error:null})},
      functions:{invoke:async(name,options)=>{
        calls.push({name,options});
        return backendError?{error:{context:{json:async()=>({error:'Confirmation expired.'})}}}:{data:{linked:true},error:null};
      }},
    }),
  };
  vm.runInNewContext(source,scope);
  await new Promise(resolve=>setImmediate(resolve));
  return {node,calls,historyCalls,removed,redirects};
}
test('valid callback clears sensitive URL and state, then completes authenticated linking',async()=>{
  const r=await run();assert.equal(r.historyCalls[0][2],'/innerg-id/discord-callback/');assert.equal(r.removed[0],'innerg-discord-state');assert.equal(r.calls.length,1);assert.equal(r.calls[0].options.body.state,'expected');assert.deepEqual(r.redirects,['/innerg-id/#discord-title']);
});
test('mismatched, missing and canceled callbacks never call the backend',async()=>{
  for(const options of [{search:'?state=wrong&code=code'},{expected:null},{search:'?error=access_denied'}]){const r=await run(options);assert.equal(r.calls.length,0);assert.equal(r.redirects.length,0);assert.ok(r.node.textContent);}
});
test('expired sign-in never links a Discord account',async()=>{
  const r=await run({signedIn:false});assert.equal(r.calls.length,0);assert.match(r.node.textContent,/sign-in expired/);
});
test('backend failure shows a safe error and does not redirect as success',async()=>{
  const r=await run({backendError:true});assert.equal(r.node.textContent,'Confirmation expired.');assert.equal(r.redirects.length,0);
});
