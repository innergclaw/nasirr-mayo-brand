import { escapeHTML, money, percent, tone, filterAssets, chartPath, assetTags, assetsForView } from './display.mjs';
import { chartMarkup, bindCharts } from './interactive-charts.mjs';
import { weeklyMoversMarkup } from './weekly-mover.mjs?v=weekly-top-three-1';

const VIEW = ['all','stocks','crypto'].includes(document.body?.dataset.marketView) ? document.body.dataset.marketView : 'all';
const DATA_URL = document.body?.dataset.dataUrl || 'https://innergclaw.github.io/innerg-watchlist/data/watchlist.json';
let snapshot = null;
let loading = false;
const search = document.querySelector('#search');
const sectorFilter = document.querySelector('#sector-filter');
const sort = document.querySelector('#sort');
const refresh = document.querySelector('#refresh');
const esc = escapeHTML;

function chart(asset, context='asset') { return chartMarkup(asset,context); }

function assetCard(asset) {
  return `<article class="asset-card" id="asset-${esc(asset.symbol)}"><div class="asset-heading"><div><h4>${esc(asset.symbol)}</h4><p>${esc(asset.name)}</p><div class="asset-tags" aria-label="Asset classification">${assetTags(asset)}</div></div><strong class="price">${money(asset.price, asset.currency)}</strong></div>${chart(asset)}<dl class="returns">${[['1 day','day'],['1 week','week'],['30 days','month']].map(([label,key])=>`<div><dt>${label}</dt><dd class="${tone(asset.returns?.[key])}">${percent(asset.returns?.[key])}</dd></div>`).join('')}</dl><details class="ranges" data-symbol="${esc(asset.symbol)}"><summary>Daily &amp; 52-week ranges</summary><dl>${[['Day low','dayLow'],['Day high','dayHigh'],['52-week low','yearLow'],['52-week high','yearHigh']].map(([label,key])=>`<div><dt>${label}</dt><dd>${money(asset[key],asset.currency)}</dd></div>`).join('')}</dl><p>${Number(asset.historySessions) || 0} daily data points available.</p></details></article>`;
}

function renderAssets() {
  if (!snapshot) return;
  observer?.disconnect();
  const openRanges = new Set([...document.querySelectorAll('.ranges[open]')].map(el=>el.dataset.symbol));
  const scopedAssets = assetsForView(snapshot.assets,VIEW);
  const assets = filterAssets(scopedAssets, search.value, sectorFilter.value, sort.value);
  document.querySelector('#results-status').textContent = `${assets.length} of ${scopedAssets.length} assets shown`;
  document.querySelector('#sector-list').innerHTML = assets.length ? snapshot.sectors.map(sector=>{
    const rows = assets.filter(asset=>asset.sector===sector.id);
    if (!rows.length) return '';
    return `<section class="sector-group" aria-labelledby="group-${esc(sector.id)}"><h3 id="group-${esc(sector.id)}">${esc(sector.name)} <span>${rows.length} ${rows.length===1?'asset':'assets'}</span></h3><div class="asset-grid">${rows.map(assetCard).join('')}</div></section>`;
  }).join('') : '<p class="empty-state">No matching assets. Try another ticker or choose all sectors.</p>';
  document.querySelectorAll('.ranges').forEach(el=>{ el.open = openRanges.has(el.dataset.symbol); });
  bindCharts(snapshot.assets);
  observeCharts();
}

const observer = 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches
  ? new IntersectionObserver(entries=>entries.forEach(entry=>{ if(entry.isIntersecting){entry.target.classList.add('chart-enter');observer.unobserve(entry.target);} }), {threshold:.2}) : null;
function observeCharts() {
  if(observer) document.querySelectorAll('.chart:not(.chart-enter)').forEach(el=>observer.observe(el));
}

function renderSnapshot(data) {
  const changed = snapshot?.generatedAt !== data.generatedAt;
  snapshot = data;
  const generated = new Date(data.generatedAt);
  const old = Date.now() - generated.getTime() > 48 * 60 * 60 * 1000;
  document.querySelector('#market-state').textContent = old ? 'prices may be out of date' : 'latest price update';
  document.querySelector('#snapshot-time').textContent = generated.toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'America/New_York'})+' ET';
  if(!changed) return;
  if(typeof document.dispatchEvent==='function'&&typeof CustomEvent==='function')document.dispatchEvent(new CustomEvent('market-snapshot',{detail:data}));
  const selected = sectorFilter.value;
  const scopedAssets = assetsForView(data.assets,VIEW);
  const scopedSectors = data.sectors.filter(sector=>scopedAssets.some(asset=>asset.sector===sector.id));
  sectorFilter.innerHTML = '<option value="all">All sectors</option>' + scopedSectors.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
  sectorFilter.value = selected==='all'||scopedSectors.some(sector=>sector.id===selected) ? selected : 'all';
  document.querySelector('#asset-count').textContent = `${scopedAssets.length} assets / ${scopedSectors.length} ${scopedSectors.length===1?'sector':'sectors'} / Free access`;
  document.querySelector('#leader-grid').innerHTML = weeklyMoversMarkup(scopedAssets,{view:VIEW,publicLeaders:data.leadersByView?.[VIEW]});
  renderAssets();
}

async function loadData() {
  if(loading) return;
  loading = true;
  refresh.disabled = true;
  refresh.textContent = 'Checking…';
  try {
    const response = await fetch(`${DATA_URL}?v=${Date.now()}`,{cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if(!Array.isArray(data.assets) || !data.assets.length || !Array.isArray(data.sectors) || !Number.isFinite(Date.parse(data.generatedAt))) throw new Error('Invalid snapshot');
    renderSnapshot(data);
  } catch {
    document.querySelector('#market-state').textContent = snapshot ? 'could not refresh · showing previous prices' : 'prices unavailable';
    if(!snapshot){document.querySelector('#snapshot-time').textContent='Please retry';document.querySelector('#leader-grid').textContent='Could not load market data.';document.querySelector('#results-status').textContent='Use Refresh data to try again.';}
  } finally { loading=false;refresh.disabled=false;refresh.textContent='Refresh data'; }
}

search.addEventListener('input', renderAssets);
sectorFilter.addEventListener('change', renderAssets);
sort.addEventListener('change', renderAssets);
refresh.addEventListener('click', loadData);
document.addEventListener?.('research-change',()=>{if(snapshot){const data=snapshot;snapshot=null;renderSnapshot(data);}});
loadData();
setInterval(()=>{if(!document.hidden && !document.activeElement?.closest('.interactive-chart')) loadData();}, 60_000);
