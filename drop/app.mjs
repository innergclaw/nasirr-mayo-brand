import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm';
const sb=createClient('https://zkyhhoxcrjkhywblzehr.supabase.co','sb_publishable_bdi3BexAKWDBaUIh40hJ_A_8CNVdnM_', {auth:{storageKey:'founder-drop-session',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const OWNER='75677100-97b7-4578-92c5-cf131997b580';
const $=s=>document.querySelector(s);
let drops=[],current=null,editing=null,filter='ready',pendingEmail='',authorized=false,epoch=0,loading=false,sw;
const status=(message,error=false)=>{$('#status').textContent=message;$('#status').classList.toggle('error',error);};
const text=(tag,value,cls)=>{const el=document.createElement(tag);el.textContent=value;if(cls)el.className=cls;return el;};
const checked=r=>{if(r.error)throw r.error;return r.data;};
const date=value=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(new Date(value));
function clearPrivate(){drops=[];current=null;editing=null;authorized=false;$('#items').replaceChildren();$('#reader-body').textContent='';$('#reader-title').textContent='';$('#reader-meta').textContent='';$('#draft-form').reset();$('#reader').close();$('#editor').close();$('#inbox').hidden=true;$('#signout').hidden=true;}
function screen(name){for(const id of ['loading','login','access-error','inbox'])$('#'+id).hidden=id!==name;}
async function authenticate(){
 const version=++epoch;clearPrivate();screen('loading');
 try{
  const {session}=checked(await sb.auth.getSession());if(version!==epoch)return;
  if(!session){screen('login');return;}
  const {user}=checked(await sb.auth.getUser());if(version!==epoch)return;
  if(user?.id!==OWNER){screen('access-error');$('#signout').hidden=false;return;}
  authorized=true;screen('inbox');$('#signout').hidden=false;status('');await load();await notificationState();
 }catch{if(version!==epoch)return;screen('access-error');$('#signout').hidden=false;$('#access-message').textContent='we could not verify your session. try again, or sign out and enter a fresh email code.';}
}
async function load(){
 if(!authorized||loading)return;loading=true;const version=epoch;$('#sync-state').textContent='checking your inbox…';
 try{
  const data=checked(await sb.from('founder_drops').select('id,title,body,kind,brand,status,created_at,updated_at').order('created_at',{ascending:false}).limit(500));
  if(version!==epoch)return;drops=data;render();$('#sync-state').textContent='synced just now';
  const id=location.hash.slice(1);if(!$('#reader').open&&!$('#editor').open&&data.some(d=>d.id===id))open(id);
 }catch{if(version===epoch)$('#sync-state').textContent='could not refresh. your last loaded drafts are still here. tap refresh to retry.';}finally{loading=false;}
}
function render(){
 $('#ready-count').textContent=drops.filter(d=>d.status==='ready').length;
 const q=$('#search').value.trim().toLowerCase();const matches=drops.filter(d=>d.status===filter&&`${d.title} ${d.body} ${d.brand} ${d.kind}`.toLowerCase().includes(q));
 $('#items').replaceChildren();$('#empty').hidden=!!matches.length;
 for(const d of matches){const card=document.createElement('article');card.className='draft';card.append(text('span',`${d.brand} / ${d.kind}`,'kicker'),text('h2',d.title),text('p',d.body.slice(0,260),'preview'),text('p',`${date(d.created_at)} · ${d.body.length.toLocaleString()} characters`,'meta'));const button=text('button','open draft ↗','open-draft');button.addEventListener('click',()=>open(d.id));card.append(button);$('#items').append(card);}
}
function open(id){current=drops.find(d=>d.id===id);if(!current)return;$('#reader-title').textContent=current.title;$('#reader-kind').textContent=`${current.brand} / ${current.kind}`;$('#reader-meta').textContent=`${date(current.created_at)} · ${current.status} · ${current.body.length.toLocaleString()} characters`;$('#reader-body').textContent=current.body;$('#reader-status').textContent='';$('#mark-posted').textContent=current.status==='posted'?'move to ready':'mark as posted';$('#archive').textContent=current.status==='archived'?'move to ready':'archive';$('#share-x').href='https://twitter.com/intent/tweet?'+new URLSearchParams({text:current.body});$('#share-sms').href='sms:?&body='+encodeURIComponent(current.body);$('#reader').showModal();history.replaceState(null,'','#'+id);}
async function copy(){try{await navigator.clipboard.writeText(current.body);$('#reader-status').textContent='copied. paste it wherever you want to share.';}catch{const range=document.createRange();range.selectNodeContents($('#reader-body'));const selection=getSelection();selection.removeAllRanges();selection.addRange(range);$('#reader-status').textContent='text selected. touch and hold to copy it.';}}
async function setState(next){if(!current)return;const id=current.id;try{checked(await sb.from('founder_drops').update({status:next,updated_at:new Date().toISOString()}).eq('id',id).select('id').single());$('#reader').close();history.replaceState(null,'',location.pathname);await load();status(next==='posted'?'marked as posted.':next==='archived'?'moved to archive.':'back in ready.');}catch{$('#reader-status').textContent='could not save that change. try again.';}}
async function push(action,extra={}){const {data,error}=await sb.functions.invoke('founder-drop-push',{body:{action,...extra}});if(error)throw Error('could not complete notification setup. try again.');return data;}
const fromBase64=str=>Uint8Array.from(atob(str.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function notificationState(){
 const supported='serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;
 if(!supported){$('#notifications').textContent='alerts need a supported browser';$('#notifications').disabled=true;return;}
 sw=await navigator.serviceWorker.register('./sw.js',{scope:'/drop/'}).catch(()=>null);if(!sw)return;
 const sub=await sw.pushManager.getSubscription();$('#notifications').textContent=sub?'notifications enabled':'enable notifications';$('#test-notification').hidden=!sub;$('#disable-notifications').hidden=!sub;
}
$('#notifications').onclick=async()=>{
 try{
  if(!sw)throw Error('open drop from your home screen first, then try again.');
  // Request permission directly from the tap, before any network request.
  const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('alerts are off. you can allow them in your phone or browser settings.');
  const config=await push('config');await navigator.serviceWorker.ready;
  const sub=await sw.pushManager.getSubscription()||await sw.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:fromBase64(config.publicKey)});
  await push('subscribe',{subscription:sub.toJSON()});await notificationState();status('alerts enabled on this device. send a test alert to check delivery.');
 }catch(e){status(e.message,true);}
};
$('#test-notification').onclick=async()=>{try{const sub=await sw.pushManager.getSubscription();await push('test',{endpoint:sub?.endpoint});status('test alert accepted by the push service. check this device for the notification.');}catch(e){status(e.message,true);}};
$('#disable-notifications').onclick=async()=>{try{const sub=await sw.pushManager.getSubscription();if(sub){await push('unsubscribe',{endpoint:sub.endpoint});await sub.unsubscribe();}await notificationState();status('alerts are off on this device.');}catch(e){status(e.message,true);}};
$('#email-form').onsubmit=async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;try{pendingEmail=$('#email').value.trim();checked(await sb.auth.signInWithOtp({email:pendingEmail,options:{shouldCreateUser:false}}));$('#email-form').hidden=true;$('#code-form').hidden=false;$('#code').focus();status('check your email and enter the complete code.');}catch{status('could not send the code. check your founder email and try again shortly.',true);}finally{button.disabled=false;}};
$('#code-form').onsubmit=async event=>{event.preventDefault();event.submitter.disabled=true;try{checked(await sb.auth.verifyOtp({email:pendingEmail,token:$('#code').value.trim(),type:'email'}));$('#code').value='';await authenticate();}catch{status('that code could not be verified. use the newest email code or request another.',true);}finally{event.submitter.disabled=false;}};
$('#change-email').onclick=()=>{$('#code-form').hidden=true;$('#email-form').hidden=false;$('#code').value='';$('#email').focus();};
$('#signout').onclick=async()=>{++epoch;clearPrivate();try{checked(await sb.auth.signOut({scope:'local'}));screen('login');status('signed out on this device.');}catch{screen('access-error');$('#signout').hidden=false;status('sign-out did not finish. reconnect and try again.',true);}};
$('#retry').onclick=authenticate;$('#refresh').onclick=load;$('#search').oninput=render;
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();});
document.querySelectorAll('dialog .close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('#reader').addEventListener('close',()=>history.replaceState(null,'',location.pathname));
$('#copy').onclick=copy;$('#copy-instagram').onclick=copy;
$('#share').onclick=async()=>{if(!current)return;if(!navigator.share){await copy();return;}try{await navigator.share({title:current.title,text:current.body});}catch(e){if(e.name!=='AbortError')$('#reader-status').textContent='sharing did not open. use copy text instead.';}};
$('#mark-posted').onclick=()=>setState(current.status==='posted'?'ready':'posted');$('#archive').onclick=()=>setState(current.status==='archived'?'ready':'archived');
function edit(d=null){editing=d?.id||null;$('#reader').close();$('#editor-title').textContent=d?'edit draft':'new draft';$('#draft-title').value=d?.title||'';$('#draft-kind').value=d?.kind||'post';$('#draft-body').value=d?.body||'';$('#editor-status').textContent='';$('#editor').showModal();}
$('#new-draft').onclick=()=>edit();$('#edit').onclick=()=>edit(current);
$('#draft-form').onsubmit=async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;try{const row={title:$('#draft-title').value.trim(),kind:$('#draft-kind').value,body:$('#draft-body').value.trim(),updated_at:new Date().toISOString()};if(!row.title||!row.body)throw Error();if(editing)checked(await sb.from('founder_drops').update(row).eq('id',editing).select('id').single());else checked(await sb.from('founder_drops').insert({...row,owner_id:OWNER}).select('id').single());$('#editor').close();await load();status('saved to your inbox.');}catch{$('#editor-status').textContent='could not save. your text is still here. try again.';}finally{button.disabled=false;}};
sb.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){++epoch;clearPrivate();screen('login');}else if(event==='TOKEN_REFRESHED'&&authorized){void load();}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&authorized)void load();});
setInterval(()=>{if(document.visibilityState==='visible'&&authorized&&!$('#editor').open)void load();},60000);
await authenticate();
