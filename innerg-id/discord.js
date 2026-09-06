export function setupDiscord(supabase) {
  const button = document.querySelector('#connect-discord');
  const message = document.querySelector('#discord-status');
  if (!button || !message) return;
  let linked = false;
  const render = (data) => {
    linked = !!data.linked;
    button.textContent = linked ? 'Check Discord access' : 'Connect Discord';
    const states = {
      active: 'Your Members role is active. Open Discord to continue.',
      inactive: 'Discord is connected. Active membership is required for the Members role.',
      join_server: 'Join the free Discord first, then select Check Discord access.',
      pending: 'Your Discord account is connected. Your role is being checked.',
      retry: 'Discord is busy. Your access will be checked again automatically.',
      sync_error: 'Discord is connected, but the role update needs another attempt. We will retry automatically.',
    };
    message.textContent = linked ? `${data.name ? `Connected as ${data.name}. ` : ''}${states[data.status] || states.pending}` : 'Connect your Discord account to receive your Members role. Your member number is not a password.';
  };
  button.addEventListener('click', async () => {
    button.disabled = true;
    message.textContent = linked ? 'Checking Discord access…' : 'Opening Discord confirmation…';
    try {
      const { data, error } = await supabase.functions.invoke('innerg-discord', { body: { action: linked ? 'sync' : 'start' } });
      if (error) throw error;
      if (data.url) {
        sessionStorage.setItem('innerg-discord-state', data.state);
        location.assign(data.url);
      } else render(data);
    } catch { message.textContent = 'Could not connect right now. Confirm you are signed in with active membership, then try again.'; }
    finally { button.disabled = false; }
  });
  return async () => {
    const { data, error } = await supabase.functions.invoke('innerg-discord', { body: { action: 'status' } });
    if (!error) render(data);
    else message.textContent = 'Discord status is unavailable. You can try Connect Discord again.';
  };
}
