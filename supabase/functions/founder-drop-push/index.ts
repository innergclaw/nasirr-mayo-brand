import {createClient} from 'npm:@supabase/supabase-js@2.112.4';
import webpush from 'npm:web-push@3.6.7';
const OWNER='75677100-97b7-4578-92c5-cf131997b580';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const checked=(r:any)=>{if(r.error)throw Error('database error');return r.data;};
const headers={'Access-Control-Allow-Origin':'https://nasirr.innergintel.org','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Vary':'Origin'};
async function config(){
 let row=checked(await db.from('founder_drop_push_config').select('*').eq('id',true).single());
 if(!row.public_key){const keys=webpush.generateVAPIDKeys();checked(await db.from('founder_drop_push_config').update({public_key:keys.publicKey,private_key:keys.privateKey}).eq('id',true).is('public_key',null));row=checked(await db.from('founder_drop_push_config').select('*').eq('id',true).single());}
 return row;
}
function validEndpoint(value:string){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(['fcm.googleapis.com','updates.push.services.mozilla.com','wns2-par02p.notify.windows.com'].includes(u.hostname)||u.hostname.endsWith('.push.apple.com')||u.hostname==='web.push.apple.com'||u.hostname.endsWith('.notify.windows.com'));}catch{return false;}}
async function send(subscription:any,keys:any,id?:string){return await webpush.sendNotification(subscription,JSON.stringify({id:id||''}),{vapidDetails:{subject:'mailto:innerg410@gmail.com',publicKey:keys.public_key,privateKey:keys.private_key},TTL:3600,timeout:10000});}
Deno.serve(async req=>{
 const reply=(data:any,status=200)=>Response.json(data,{status,headers});
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return reply({error:'method not allowed'},405);
 try{
  const body=await req.json();
  if(body.action==='worker'){
   const secret=req.headers.get('x-worker-secret')||'';const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret)))].map(x=>x.toString(16).padStart(2,'0')).join('');
   const cfg=checked(await db.from('founder_drop_push_config').select('worker_hash').eq('id',true).single());
   if(!secret||digest!==cfg.worker_hash)return reply({error:'unauthorized'},401);
   const keys=await config();const jobs=checked(await db.rpc('founder_drop_claim'));if(!jobs.length)return reply({processed:0});let sent=0;
   for(const job of jobs){
    try{
     const device=checked(await db.from('founder_drop_devices').select('subscription,owner_id').eq('id',job.device_id).single());
     if(device.owner_id!==OWNER||!validEndpoint(device.subscription.endpoint))throw Error('invalid device');
     await send(device.subscription,keys,job.drop_id);
     checked(await db.from('founder_drop_deliveries').update({state:'sent',sent_at:new Date().toISOString(),last_error:null}).eq('id',job.id).eq('lease_token',job.lease_token));sent++;
    }catch(e:any){
     if([404,410].includes(e.statusCode)){checked(await db.from('founder_drop_devices').delete().eq('id',job.device_id));}
     else checked(await db.from('founder_drop_deliveries').update({state:job.attempts>=5?'failed':'pending',next_attempt:new Date(Date.now()+Math.min(3600000,60000*2**job.attempts)).toISOString(),last_error:'push delivery failed'}).eq('id',job.id).eq('lease_token',job.lease_token));
    }
   }return reply({processed:jobs.length,sent});
  }
  const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return reply({error:'sign in first'},401);const {data,error}=await db.auth.getUser(token);
  if(error||!data.user)return reply({error:'sign in first'},401);
  if(data.user.id!==OWNER)return reply({error:'founder access only'},403);
  if(body.action==='config'){const keys=await config();return reply({publicKey:keys.public_key});}
  if(body.action==='subscribe'){
   const sub=body.subscription;
   if(!sub||typeof sub.endpoint!=='string'||sub.endpoint.length>2048||!validEndpoint(sub.endpoint)||!/^[A-Za-z0-9_-]{16,200}$/.test(sub.keys?.auth||'')||!/^[A-Za-z0-9_-]{40,200}$/.test(sub.keys?.p256dh||''))return reply({error:'invalid subscription'},400);
   checked(await db.from('founder_drop_devices').upsert({owner_id:OWNER,endpoint:sub.endpoint,subscription:{endpoint:sub.endpoint,keys:sub.keys}},{onConflict:'endpoint'}));return reply({saved:true});
  }
  if(body.action==='unsubscribe'){checked(await db.from('founder_drop_devices').delete().eq('owner_id',OWNER).eq('endpoint',body.endpoint));return reply({removed:true});}
  if(body.action==='test'){
   const device=checked(await db.from('founder_drop_devices').select('subscription').eq('owner_id',OWNER).eq('endpoint',body.endpoint).single());
   if(!validEndpoint(device.subscription.endpoint))return reply({error:'invalid device'},400);
   await send(device.subscription,await config());return reply({accepted:true});
  }
  return reply({error:'unknown action'},400);
 }catch{return reply({error:'notification service unavailable. try again.'},503);}
});
