import { escapeHTML as esc } from './display.mjs';

export function safeNewsURL(value) {
  const hosts = ['coindesk.com','globenewswire.com','reuters.com','apnews.com','cnbc.com','bloomberg.com','wsj.com','ft.com','barrons.com','marketwatch.com','investopedia.com','nasdaq.com','businesswire.com','prnewswire.com','investing.com','benzinga.com','fool.com','seekingalpha.com','etf.com','etftrends.com','etfdb.com','finance.yahoo.com','decrypt.co','theblock.co','newsroom.arm.com','hafnia.com','news.skhynix.com','digitimes.com','tipranks.com','theguardian.com','cointelegraph.com'];
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && hosts.some(host => url.hostname === host || url.hostname.endsWith('.' + host)) ? url.href : ''; } catch { return ''; }
}
export function newsStatus(data, now = Date.now()) {
  const age = now - Date.parse(data.checkedAt);
  if (!Number.isFinite(age)) return 'News snapshot date is unavailable.';
  const failed = [...data.sources,...(data.assetChecks || [])].filter(s => s.status !== 'ok').length;
  return `${age > 6 * 3600000 ? 'Updates delayed. Last check' : 'Last checked'}: ${new Date(data.checkedAt).toLocaleString('en-US', {timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'})}. ${data.coverage.length} assets checked.${failed ? ` ${failed} source feeds unavailable; coverage is partial.` : ''}`;
}
export function renderNews(items) {
  const valid = items.filter(i => safeNewsURL(i.url) && Number.isFinite(Date.parse(i.publishedAt)));
  if (!valid.length) return '<p class="section-note">No recent report found in the checked sources. This does not mean there is no news for this asset.</p>';
  return valid.map(i => `<article class="news-item"><p class="news-meta">${esc(i.symbol)} · ${esc(i.kind)} · <time datetime="${esc(i.publishedAt)}">${esc(new Date(i.publishedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/New_York'}))}</time></p><h3><a href="${esc(safeNewsURL(i.url))}" target="_blank" rel="noopener noreferrer">${esc(i.headline)}</a></h3><p class="news-meta">Source: ${esc(i.source)}</p></article>`).join('');
}
export function assetHeadlines(items, symbol, now = Date.now()) {
  const recent = items.filter(i => i.symbol === symbol && safeNewsURL(i.url) && Number.isFinite(Date.parse(i.publishedAt)) && now - Date.parse(i.publishedAt) <= 7 * 86400000 && Date.parse(i.publishedAt) <= now + 300000);
  return [...new Map(recent.sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).map(i=>[i.url.split('?')[0],i])).values()].slice(0,2);
}
export function renderAssetNews(data, selected = 'all', now = Date.now()) {
  const assets = data.coverage.filter(a => selected === 'all' || a.symbol === selected);
  return assets.map(a => {
    const items = assetHeadlines(data.items,a.symbol,now);
    const heading = `${esc(a.symbol)} <span>${esc(a.name)}</span>`;
    return selected === 'all'
      ? `<details class="asset-news-group"><summary>${heading}<small>${items.length ? `${items.length} recent report${items.length===1?'':'s'}` : 'No recent report found'}</small></summary>${renderNews(items)}</details>`
      : `<div class="asset-news-selected"><h3>${heading}</h3>${renderNews(items)}</div>`;
  }).join('');
}
export async function loadNews(root = document, fetcher = fetch) {
  const status = root.querySelector('#news-status');
  try {
    const response = await fetcher(`data/asset-news.json?t=${Date.now()}`, {cache:'no-store'});
    if (!response.ok) throw Error('News fetch failed');
    const data = await response.json();
    if (!Array.isArray(data.items) || !Array.isArray(data.coverage) || !Array.isArray(data.sources)) throw Error('Invalid news');
    status.textContent = newsStatus(data);
    const filter = root.querySelector('#news-filter');
    const selected = filter.value || 'all';
    filter.innerHTML = '<option value="all">All tracked assets</option>' + data.coverage.map(a => `<option value="${esc(a.symbol)}">${esc(a.symbol)} · ${esc(a.name)}</option>`).join('');
    filter.value = data.coverage.some(a => a.symbol === selected) ? selected : 'all';
    function render() {
      root.querySelector('#news-items').innerHTML = renderAssetNews(data,filter.value);
    }
    filter.onchange = render;
    root.querySelector('#news-coverage').innerHTML = data.coverage.map(a => `<p>${esc(a.symbol)}: ${assetHeadlines(data.items,a.symbol).length} recent reports</p>`).join('') + [...data.sources,...(data.assetChecks || [])].map(s=>`<p>${esc(s.name)}: ${esc(s.status)}</p>`).join('');
    render();
  } catch { status.textContent = 'News updates are unavailable right now. The charts remain open.'; }
}
// Member research is supplied by the authenticated controller.
