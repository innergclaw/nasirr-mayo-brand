import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm';
import {loadBrief,renderPortfolio,renderFounderWatch} from './brief.mjs?v=member-copy-2';
import {loadNews} from './news.mjs?v=member-copy-2';
import {setMoverContext,setWeeklyMoverAccess} from './weekly-mover.mjs?v=weekly-top-three-1';
const client=createClient('https://zkyhhoxcrjkhywblzehr.supabase.co','sb_publishable_bdi3BexAKWDBaUIh40hJ_A_8CNVdnM_');
const panel=document.querySelector('#member-access');
const message=document.querySelector('#member-status');
let revision=0, pendingEmail='';
const signin=document.querySelector('#signin-controls');
const signout=document.querySelector('#research-signout');
const prefs=document.querySelector('#research-preferences');
const gateMarkup=`<div class="research-lock"><div class="research-placeholder" aria-hidden="true"><b>Research notes and context</b><p>Source review · What changed · What to watch</p><p>Member analysis and daily research</p></div><div class="research-lock-copy"><p class="eyebrow">INNERG ID access</p><h3>Read beyond the chart.</h3><p>Unlock the news, watch points, and risks with an active membership.</p><div class="member-actions"><a class="member-cta" href="https://nasirr.innergintel.org/innergid/">Become a member</a><a href="#member-access">Already a member? Sign in</a></div></div></div>`;
function lock(){
  document.querySelectorAll('.research-gate').forEach(el=>{el.hidden=false;});
  document.querySelectorAll('.research-content').forEach(el=>{el.hidden=true;});
  document.querySelector('#brief-items').innerHTML='';document.querySelector('#news-items').innerHTML='';
  document.querySelector('#portfolio-items').replaceChildren();document.querySelector('#founder-watch-points').replaceChildren();
  document.querySelector('#news-coverage').innerHTML='';document.querySelector('#news-filter').onchange=null;
  setWeeklyMoverAccess(false);setMoverContext(null);document.dispatchEvent(new Event('research-change'));
  prefs.hidden=true;
  document.querySelector('#email-unsubscribe').hidden=true;
  document.querySelector('#research-retry').hidden=true;
}
for(const id of ['sunday-brief','asset-news','my-holdings']){
  const section=document.getElementById(id);
  const content=document.createElement('div');content.className='research-content';content.hidden=true;
  [...section.children].slice(2).forEach(el=>content.append(el));section.append(content);
  const gate=document.createElement('div');gate.className='research-gate';gate.innerHTML=gateMarkup;section.append(gate);
}
async function check(session){
  const current=++revision;lock();signin.hidden=Boolean(session);signout.hidden=!session;
  document.querySelector('.member-signin').textContent=session?'My research access':'Sign in with INNERG ID';
  if(!session){message.textContent='Use the same Google account or email you use for your INNERG ID.';return;}
  message.textContent='Verifying your INNERG membership…';
  try {
    const {data,error}=await client.functions.invoke('member-research',{method:'GET'});
    if(current!==revision)return;
    if(error){
      const code=error.context?.status;
      message.textContent=code===403?'Your account is signed in. Activate your INNERG membership to open research.':'We could not verify access. Retry below; your charts are still open.';
      document.querySelector('#research-retry').hidden=false;
      // Allow anyone signed in to turn notifications off, even after access expires.
      document.querySelector('#email-unsubscribe').hidden=false;return;
    }
    if(!data?.membershipNumber)throw Error('Missing membership');
    const portfolioMarkup=renderPortfolio(data.portfolio);
    const watchMarkup=renderFounderWatch(data.portfolio);
    document.querySelectorAll('.research-gate').forEach(el=>el.hidden=true);
    document.querySelectorAll('.research-content').forEach(el=>el.hidden=false);
    const provided=value=>async()=>({ok:true,json:async()=>value});
    await Promise.all([loadBrief(document,provided(data.brief)),loadNews(document,provided(data.news))]);
    if(current!==revision){lock();return;}
    document.querySelector('#portfolio-items').innerHTML=portfolioMarkup;
    document.querySelector('#founder-watch-points').innerHTML=watchMarkup;
    setWeeklyMoverAccess(true);setMoverContext(data.mover);document.dispatchEvent(new Event('research-change'));
    message.textContent=`${data.membershipNumber} · Research access active.`;
    document.querySelector('#daily-email').checked=data.dailyEmail===true;prefs.hidden=false;
    document.querySelector('#research-retry').hidden=true;
  }catch{if(current===revision){message.textContent='Research is unavailable. Please retry. Charts remain open.';document.querySelector('#research-retry').hidden=false;}}
}
document.querySelector('#google-signin').onclick=async()=>{
  if(location.pathname.startsWith('/watchlist/')){location.assign('/account/?next=%2Fwatchlist%2F');return;}

  message.textContent='Opening Google sign-in…';
  try{const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname}});if(error)throw error;}
  catch{message.textContent='Google sign-in could not open. Use your email code or retry.';}
};
document.querySelector('#research-email-form').onsubmit=async event=>{
  event.preventDefault();const form=event.currentTarget;const button=form.querySelector('button');button.disabled=true;
  pendingEmail=new FormData(form).get('email').trim();
  try{const {error}=await client.auth.signInWithOtp({email:pendingEmail,options:{shouldCreateUser:true,emailRedirectTo:location.origin+location.pathname}});
    if(error)throw error;document.querySelector('#research-code-form').hidden=false;message.textContent='Enter the full code from your email.';document.querySelector('#research-code').focus();
  }catch{message.textContent='Could not send a code. Check your email address and try again.';}finally{button.disabled=false;}
};
document.querySelector('#research-code-form').onsubmit=async event=>{
  event.preventDefault();const form=event.currentTarget,button=form.querySelector('button');button.disabled=true;
  try{const token=new FormData(form).get('code').trim();if(!/^\d{6,10}$/.test(token))throw Error('Code');
    const {error}=await client.auth.verifyOtp({email:pendingEmail,token,type:'email'});if(error)throw error;
  }catch{message.textContent='That code is invalid or expired. Enter the complete code or request another.';}finally{button.disabled=false;}
};
signout.onclick=async()=>{++revision;lock();message.textContent='Signing out…';signout.disabled=true;try{const{error}=await client.auth.signOut({scope:'local'});if(error)throw error;}catch{message.textContent='Sign-out failed. Please retry.';}finally{signout.disabled=false;}};
document.querySelector('#research-retry').onclick=async()=>{const{data}=await client.auth.getSession();await check(data.session);};
async function preference(value){
  const {error}=await client.functions.invoke('member-research',{body:{dailyEmail:value}});
  message.textContent=error?'Could not save your email preference. Please retry.':value?'Daily research emails enabled. You can turn them off here anytime.':'Daily research emails turned off.';
  return !error;
}
document.querySelector('#daily-email').onchange=async event=>{const input=event.target;input.disabled=true;const wanted=input.checked;if(!await preference(wanted))input.checked=!wanted;input.disabled=false;};
document.querySelector('#email-unsubscribe').onclick=()=>preference(false);
client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT')lock();setTimeout(()=>check(session),0);});
lock();
const{data:{session}}=await client.auth.getSession();await check(session);
setInterval(async()=>{if(!document.hidden){const{data}=await client.auth.getSession();if(data.session)await check(data.session);}},300000);
