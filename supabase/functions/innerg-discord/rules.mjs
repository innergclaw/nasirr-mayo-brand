export function eligible(member, now = Date.now()) {
  return member?.status === 'active' && (member.access_source === 'grandfathered' ||
    (member.access_source === 'stripe' && member.payment_verified === true && Number.isFinite(Date.parse(member.access_expires_at)) && Date.parse(member.access_expires_at) > now));
}
export async function sha256(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
}
export function roleResult(status, wanted) {
  if (status === 204) return wanted ? 'active' : 'inactive';
  if (status === 404) return 'join_server';
  if (status === 429) return 'retry';
  return 'sync_error';
}
