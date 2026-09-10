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
  return `<p class="section-note">prices as of ${escapeHTML(captured)}. prices may be delayed.</p>` + (data.items.length ? data.items.map(item => `<details class="brief-item"><summary><span class="brief-ticker">${escapeHTML(item.symbol)} <span>${money(item.price)}</span></span><span class="brief-headline">${escapeHTML(item.headline)}</span><span class="brief-open">Read intel</span></summary><div class="brief-body"><p class="eyebrow">${escapeHTML(item.name)} · ${escapeHTML(item.context)} · ${escapeHTML(item.newsDate)}</p><p><strong>The news</strong>${escapeHTML(item.fact)}</p><p><strong>Bullish case · interpretation</strong>${escapeHTML(item.bullCase)}</p><p><strong>What to watch</strong>${escapeHTML(item.watchFor)}</p><p><strong>What could weaken the case</strong>${escapeHTML(item.risk)}</p><div class="brief-sources">${item.sources.map(source=>`<a href="${escapeHTML(safeSource(source.url))}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.label)} (opens new tab)</a>`).join('')}</div></div></details>`).join('') : '<p>no new updates to share this week.</p>');
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

export function validatePortfolio(data) {
  if (!data || !Number.isFinite(Date.parse(data.updatedAt)) || !Array.isArray(data.holdings) || !Array.isArray(data.planned) || !Array.isArray(data.watch)) throw Error('Invalid portfolio');
  const seen=new Set();
  for(const item of [...data.holdings,...data.planned]) {
    if(!/^[A-Z0-9.-]{1,12}$/.test(item.symbol) || seen.has(item.symbol)) throw Error('Invalid holding');
    seen.add(item.symbol);
  }
  for(const item of data.watch) {
    if(!/^[A-Z0-9.-]{1,12}$/.test(item.symbol) || !['thesis','watchFor','risk'].every(key=>typeof item[key]==='string' && item[key].trim())) throw Error('Invalid watch point');
  }
  return data;
}
export function renderPortfolio(data) {
  if(!data)return '<p class="section-note">my holdings update is unavailable. please check back.</p>';
  validatePortfolio(data);
  const date=new Date(data.updatedAt).toLocaleDateString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric'});
  const group=(label,items,note)=>`<div class="portfolio-group"><h3>${label}</h3><p>${note}</p><ul class="portfolio-tickers">${items.map(item=>`<li><span>${escapeHTML(item.symbol)}</span></li>`).join('')}</ul></div>`;
  return `<p class="section-note">updated ${escapeHTML(date)}</p><div class="portfolio-grid">${group('what i hold',data.holdings,'positions i currently hold.')}${group('planned long-term additions',data.planned,'on my list to add. i do not hold these yet.')}</div><p class="section-note">these are my personal positions, and they can change. i have a financial interest in the assets i hold. investing involves risk.</p>`;
}
export function renderFounderWatch(data) {
  if(!data)return '';
  validatePortfolio(data);
  return data.watch.map(item=>`<article class="founder-watch"><p class="eyebrow">my personal watch notes</p><h3>${escapeHTML(item.symbol)} · what i'm watching</h3><p><strong>my thesis</strong>${escapeHTML(item.thesis)}</p><p><strong>what to watch</strong>${escapeHTML(item.watchFor)}</p><p><strong>what could weaken the case</strong>${escapeHTML(item.risk)}</p><p class="section-note">updated ${escapeHTML(data.updatedAt.slice(0,10))}.</p></article>`).join('');
}
