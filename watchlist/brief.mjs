import { escapeHTML, money } from './display.mjs';

export function safeSource(url) {
  try { const parsed = new URL(url); return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.href : ''; } catch { return ''; }
}
export function validateBrief(data) {
  if (!data || !Number.isFinite(Date.parse(data.publishedAt)) || !Number.isFinite(Date.parse(data.priceCapturedAt)) || !/^\d{4}-\d{2}-\d{2}$/.test(data.weekOf) || typeof data.edition !== 'string' || !Array.isArray(data.items) || data.items.length > 5) throw Error('Invalid brief');
  const symbols = new Set();
  for (const item of data.items) {
    if (symbols.has(item.symbol) || !/^[A-Z0-9.-]{1,12}$/.test(item.symbol) || !['name','headline','newsDate','context','fact','bullCase','watchFor','risk'].every(key => typeof item[key] === 'string' && item[key].trim()) || !Number.isFinite(Date.parse(item.newsDate)) || !(item.price === null || (Number.isFinite(item.price) && item.price > 0)) || !Array.isArray(item.sources) || !item.sources.length || !item.sources.every(source => typeof source.label === 'string' && source.label && safeSource(source.url))) throw Error('Invalid brief item');
    symbols.add(item.symbol);
  }
  return data;
}
export function briefDate(data, now = Date.now()) {
  const date = new Date(data.publishedAt).toLocaleDateString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric'});
  return `${now - Date.parse(data.publishedAt) > 8 * 86400000 ? 'Previous edition · ' : ''}${data.edition} · ${date}`;
}
export function renderBrief(data) {
  validateBrief(data);
  const captured = new Date(data.priceCapturedAt).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
  return `<p class="section-note">Prices captured ${escapeHTML(captured)}. Delayed reference prices, not entry targets or live quotes.</p>` + (data.items.length ? data.items.map(item => `<details class="brief-item"><summary><span class="brief-ticker">${escapeHTML(item.symbol)} <span>${money(item.price)}</span></span><span class="brief-headline">${escapeHTML(item.headline)}</span><span class="brief-open">Read intel</span></summary><div class="brief-body"><p class="eyebrow">${escapeHTML(item.name)} · ${escapeHTML(item.context)} · ${escapeHTML(item.newsDate)}</p><p><strong>The news</strong>${escapeHTML(item.fact)}</p><p><strong>Bullish case · interpretation</strong>${escapeHTML(item.bullCase)}</p><p><strong>What to watch</strong>${escapeHTML(item.watchFor)}</p><p><strong>What could weaken the case</strong>${escapeHTML(item.risk)}</p><div class="brief-sources">${item.sources.map(source=>`<a href="${escapeHTML(safeSource(source.url))}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.label)} (opens new tab)</a>`).join('')}</div></div></details>`).join('') : '<p>No new developments met the source checks this week. No forced picks.</p>');
}
export async function loadBrief(root = document, fetcher = fetch) {
  const date = root.querySelector('#brief-date');
  const items = root.querySelector('#brief-items');
  try {
    const response = await fetcher('data/sunday-brief.json',{cache:'no-store'});
    if (!response.ok) throw Error('Brief unavailable');
    const data = validateBrief(await response.json());
    items.innerHTML = renderBrief(data);
    date.textContent = briefDate(data);
  } catch {
    date.textContent = 'The research brief is unavailable. The watchlist below is still open.';
    items.innerHTML = '';
  }
}
// Member research is supplied by the authenticated controller, never fetched at page load.
