(() => {
  const footer = document.querySelector('.link-tree-footer');
  if (!footer || document.getElementById('support-movement')) return;
  const style = document.createElement('link');
  style.rel = 'stylesheet'; style.href = '/home-support.css?v=1'; document.head.append(style);
  const section = document.createElement('section');
  section.id = 'support-movement';
  section.innerHTML = `<p class="support-kicker">INDEPENDENT WORK. SHARED GROWTH.</p>
    <h2>Support the movement.</h2>
    <p class="support-copy">Help me keep creating independent reads, educational videos, and tools for our community. Choose what works for you.</p>
    <div class="movement-amount"><span aria-hidden="true">$</span><output id="movement-value" for="movement-slider">3</output><span class="movement-currency">USD</span></div>
    <label for="movement-slider">Choose a one-time amount</label>
    <input id="movement-slider" type="range" min="1" max="5" step="1" value="3" aria-valuetext="3 US dollars">
    <div class="movement-scale" aria-hidden="true"><span>$1</span><span>$2</span><span>$3</span><span>$4</span><span>$5</span></div>
    <button id="movement-button" type="button">Support with $3</button>
    <p id="movement-status" role="status" aria-live="polite">Optional. One-time payment through Stripe. No subscription.</p>`;
  footer.before(section);
  const slider = section.querySelector('input'), button = section.querySelector('button');
  const output = section.querySelector('output'), status = section.querySelector('[role="status"]');
  const message = (text, error = false) => { status.textContent = text; status.dataset.error = String(error); };
  slider.addEventListener('input', () => {
    output.textContent = slider.value;
    slider.setAttribute('aria-valuetext', `${slider.value} US dollars`);
    button.textContent = `Support with $${slider.value}`;
  });
  const api = async (action, extra) => {
    const response = await fetch('https://zkyhhoxcrjkhywblzehr.supabase.co/functions/v1/innerg-reads', {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey: 'sb_publishable_bdi3BexAKWDBaUIh40hJ_A_8CNVdnM_' },
      body: JSON.stringify({ action, slug: 'home-base', ...extra }), signal: AbortSignal.timeout(25000)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Checkout could not open. Please try again.');
    return data;
  };
  const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
  button.addEventListener('click', async () => {
    button.disabled = true; slider.disabled = true;
    const amount = Number(slider.value);
    message(`Opening your $${amount} support checkout...`);
    try {
      let intent = randomId();
      try {
        const prior = JSON.parse(sessionStorage.getItem('home-base-support') || 'null');
        if (prior?.amount === amount && /^[a-f0-9]{64}$/.test(prior.intent)) intent = prior.intent;
        sessionStorage.setItem('home-base-support', JSON.stringify({ amount, intent }));
      } catch { /* Checkout also works without browser storage. */ }
      const data = await api('support_checkout', { amount, intent });
      if (data.alreadySupported) {
        message('This contribution is already paid. Thank you for your support.');
        try { sessionStorage.removeItem('home-base-support'); } catch {}
      } else {
        const url = new URL(data.checkoutUrl);
        if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('Secure checkout could not open.');
        location.assign(url.href);
      }
    } catch (error) { message(error.message || 'Checkout could not open. Please try again.', true); }
    finally { button.disabled = false; slider.disabled = false; }
  });
  const params = new URLSearchParams(location.search);
  const session = params.get('support_session_id');
  if (session || params.has('support_cancelled')) {
    const clean = new URL(location.href);
    clean.searchParams.delete('support_session_id'); clean.searchParams.delete('support_cancelled');
    history.replaceState(null, '', clean.pathname + clean.search + '#support-movement');
    section.scrollIntoView({ block: 'center' });
    if (session) {
      button.disabled = true; message('Confirming your support...');
      api('support_status', { sessionId: session }).then(data => {
        message(data.confirmed ? `Your $${data.amount} support is confirmed. Thank you for supporting the movement.` : 'Payment is not confirmed. Check your Stripe receipt before trying again.', !data.confirmed);
        if (data.confirmed) { try { sessionStorage.removeItem('home-base-support'); } catch {} }
      }).catch(() => message('We could not confirm payment. Check your Stripe receipt before trying again.', true)).finally(() => { button.disabled = false; });
    } else message('Checkout cancelled. You can choose an amount whenever you are ready.');
  }
})();
