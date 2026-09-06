import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm';
const params = new URLSearchParams(location.search);
history.replaceState(null, '', location.pathname);
const status = document.querySelector('#status');
const expected = sessionStorage.getItem('innerg-discord-state');
sessionStorage.removeItem('innerg-discord-state');
async function complete() {
  if (params.has('error')) { status.textContent = 'Discord connection was canceled. Your INNERG membership has not changed.'; return; }
  if (!expected || expected !== params.get('state') || !params.get('code')) {
    status.textContent = 'This confirmation is not valid for this browser. Return to your INNERG ID and connect Discord again.'; return;
  }
  const supabase = createClient('https://zkyhhoxcrjkhywblzehr.supabase.co', 'sb_publishable_bdi3BexAKWDBaUIh40hJ_A_8CNVdnM_');
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) { status.textContent = 'Your sign-in expired. Sign in to your INNERG ID, then connect Discord again.'; return; }
  const { data, error } = await supabase.functions.invoke('innerg-discord', { body: { action: 'complete', state: expected, code: params.get('code') } });
  if (error) {
    const detail = await error.context?.json?.().catch(() => null);
    status.textContent = detail?.error || 'Discord could not be connected. Return to your INNERG ID and try again.';
    return;
  }
  if (data.linked) location.replace('/innerg-id/#discord-title');
}
complete().catch(() => { status.textContent = 'Connection could not be completed. Return to your INNERG ID to try again.'; });
