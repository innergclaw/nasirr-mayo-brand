import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { eligible, sha256, roleResult } from './rules.mjs';

const ORIGIN = 'https://nasirr.innergintel.org';
const CALLBACK = `${ORIGIN}/innerg-id/discord-callback/`;
const APP = '1546227226876452864';
const GUILD = '932345408733192202';
const ROLE = '937126089623490661';
const INVITE = 'https://discord.gg/3ryNWTvsX';
const API = 'https://discord.com/api/v10';
const checked = (result: any) => { if (result.error) throw new Error('Database operation failed'); return result.data; };

export function makeHandler(env: any, client: any, request = fetch) {
  const service = client(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  const discord = (path: string, options: any = {}) => request(`${API}${path}`, { ...options, signal: AbortSignal.timeout(10000) });
  const membership = async (id: string) => checked(await service.from('innerg_memberships').select('status,access_source,payment_verified,access_expires_at').eq('user_id', id).maybeSingle());
  const getLink = async (id: string) => checked(await service.from('innerg_discord_links').select('*').eq('user_id', id).maybeSingle());
  async function sync(link: any) {
    let outcome = 'sync_error';
    let delay = 300000;
    try {
      const wanted = eligible(await membership(link.user_id));
      const path = `/guilds/${GUILD}/members/${link.discord_user_id}/roles/${ROLE}`;
      const response = await discord(path, { method: wanted ? 'PUT' : 'DELETE', headers: { Authorization: `Bot ${env('DISCORD_BOT_TOKEN')}` } });
      outcome = roleResult(response.status, wanted);
      if (response.status === 429) {
        const data = await response.json().catch(() => ({}));
        delay = Math.max(60000, Math.min(3600000, Number(data.retry_after || 60) * 1000));
      }
      // Payment can change during the network request. Recheck before reporting access.
      if (wanted && response.status === 204 && !eligible(await membership(link.user_id))) {
        const revoked = await discord(path, { method: 'DELETE', headers: { Authorization: `Bot ${env('DISCORD_BOT_TOKEN')}` } });
        outcome = roleResult(revoked.status, false);
      }
    } catch { outcome = 'sync_error'; }
    checked(await service.from('innerg_discord_links').update({ sync_status: outcome, lease_until: null, synced_at: new Date().toISOString(), next_sync_at: new Date(Date.now() + delay).toISOString() }).eq('user_id', link.user_id).eq('lease_token', link.lease_token));
    return outcome;
  }
  return async (req: Request) => {
    const headers = { 'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Cache-Control': 'no-store', 'Vary': 'Origin' };
    const reply = (data: any, status = 200) => Response.json(data, { status, headers });
    if (req.method === 'OPTIONS') return new Response('ok', { headers });
    if (req.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);
    try {
      const body = await req.json();
      if (body.action === 'worker') {
        const secret = req.headers.get('x-worker-secret') || '';
        const config = checked(await service.from('innerg_discord_config').select('worker_hash').eq('id', true).single());
        if (!secret || await sha256(secret) !== config.worker_hash) return reply({ error: 'Unauthorized.' }, 401);
        const links = checked(await service.rpc('innerg_discord_claim')) || [];
        const results = await Promise.all(links.map((link: any) => sync(link)));
        return reply({ processed: results.length, errors: results.filter(x => x === 'sync_error').length });
      }
      const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      if (!token) return reply({ error: 'Sign in to your INNERG ID first.' }, 401);
      const { data, error } = await service.auth.getUser(token);
      if (error || !data.user) return reply({ error: 'Sign in to your INNERG ID first.' }, 401);
      const user = data.user;
      if (body.action === 'status') {
        const link = await getLink(user.id);
        return reply({ linked: !!link, name: link?.discord_name, status: link?.sync_status, eligible: eligible(await membership(user.id)), invite: INVITE });
      }
      if (body.action === 'start') {
        if (!eligible(await membership(user.id))) return reply({ error: 'Active INNERG membership is required.' }, 403);
        if (await getLink(user.id)) return reply({ error: 'Discord is already connected. Use Check access.' }, 409);
        const state = crypto.randomUUID() + crypto.randomUUID();
        checked(await service.from('innerg_discord_states').upsert({ user_id: user.id, state_hash: await sha256(state), expires_at: new Date(Date.now() + 600000).toISOString() }, { onConflict: 'user_id' }));
        const query = new URLSearchParams({ client_id: APP, redirect_uri: CALLBACK, response_type: 'code', scope: 'identify', state, prompt: 'consent' });
        return reply({ state, url: `${API.replace('/api/v10', '')}/oauth2/authorize?${query}` });
      }
      if (body.action === 'complete') {
        if (typeof body.state !== 'string' || body.state.length > 200 || typeof body.code !== 'string' || body.code.length > 512) return reply({ error: 'Invalid Discord confirmation.' }, 400);
        const valid = checked(await service.rpc('innerg_discord_consume_state', { p_hash: await sha256(body.state), p_user: user.id }));
        if (!valid) return reply({ error: 'This confirmation expired or was already used. Connect Discord again.' }, 400);
        if (!eligible(await membership(user.id))) return reply({ error: 'Active INNERG membership is required.' }, 403);
        const exchanged = await discord('/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: APP, client_secret: env('DISCORD_CLIENT_SECRET'), grant_type: 'authorization_code', code: body.code, redirect_uri: CALLBACK }) });
        if (!exchanged.ok) return reply({ error: 'Discord confirmation failed. Please connect again.' }, 400);
        const oauth = await exchanged.json();
        const profileResponse = await discord('/users/@me', { headers: { Authorization: `Bearer ${oauth.access_token}` } });
        if (!profileResponse.ok) throw new Error('Discord identity unavailable');
        const profile = await profileResponse.json();
        if (!/^[0-9]{17,20}$/.test(profile.id)) throw new Error('Invalid Discord identity');
        const existing = await getLink(user.id);
        if (existing && existing.discord_user_id !== profile.id) return reply({ error: 'A different Discord account is already linked. Contact Nasirr for help.' }, 409);
        if (!existing) {
          const inserted = await service.from('innerg_discord_links').insert({ user_id: user.id, discord_user_id: profile.id, discord_name: String(profile.global_name || profile.username).slice(0, 100) });
          if (inserted.error?.code === '23505') return reply({ error: 'This account is already connected to an INNERG ID.' }, 409);
          checked(inserted);
        }
      } else if (body.action !== 'sync') return reply({ error: 'Unknown action.' }, 400);
      const link = await getLink(user.id);
      if (!link) return reply({ error: 'Connect Discord first.' }, 404);
      // Manual checks are limited to once per minute per linked account.
      const rateLimited = link.sync_status === 'retry' && Date.parse(link.next_sync_at) > Date.now();
      if (!rateLimited && (!link.synced_at || Date.now() - Date.parse(link.synced_at) > 60000)) {
        checked(await service.from('innerg_discord_links').update({ next_sync_at: new Date().toISOString() }).eq('user_id', user.id));
        const claimed = checked(await service.rpc('innerg_discord_claim', { p_user: user.id })) || [];
        if (claimed[0]) await sync(claimed[0]);
      }
      const latest = await getLink(user.id);
      return reply({ linked: true, name: latest.discord_name, status: latest.sync_status, invite: INVITE });
    } catch { return reply({ error: 'Discord access could not be checked. Please try again shortly.' }, 503); }
  };
}
Deno.serve(makeHandler((key: string) => Deno.env.get(key), createClient));
