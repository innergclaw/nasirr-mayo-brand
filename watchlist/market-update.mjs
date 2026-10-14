import { escapeHTML } from './display.mjs';
import { chartMarkup, bindCharts } from './interactive-charts.mjs';

const esc=escapeHTML;
const safeUrl=value=>{
  try {
    const url=new URL(value);
    return url.protocol==='https:'&&!url.username&&!url.password ? url.href : '';
  } catch { return ''; }
};

export function validateMarketUpdate(update) {
  if(!update||!/^[-A-Z0-9.]{1,12}$/.test(update.symbol)||!Number.isFinite(Date.parse(update.reviewedAt||update.updatedAt))) throw Error('Invalid market update');
  if(!Array.isArray(update.metrics)||update.metrics.length<3||!update.about?.summary||!Array.isArray(update.about?.uses)||update.about.uses.length<2||!Array.isArray(update.catalysts)||!update.catalysts.length||!Array.isArray(update.levels)||!update.levels.length) throw Error('Incomplete market update');
  if(!Array.isArray(update.sources)||!update.sources.length||update.sources.some(source=>!safeUrl(source.url))) throw Error('Unsafe market update source');
  return update;
}

export function marketUpdateMarkup(update, asset=null) {
  validateMarketUpdate(update);
  const reviewed=new Date(update.reviewedAt||update.updatedAt).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'America/New_York'});
  const matchingAsset=asset?.symbol===update.symbol?asset:null;
  const chart=matchingAsset?chartMarkup(matchingAsset,'market-flash'):'<p class="market-flash-chart-loading" role="status">Loading HYPE price history.</p>';
  return `<article class="market-flash-card"><div class="market-flash-lead"><div><p class="eyebrow">${esc(update.label)}</p><p class="market-flash-time">Reviewed ${esc(reviewed)} ET</p><h2>${esc(update.headline)}</h2><p class="market-flash-summary">${esc(update.summary)}</p></div><strong class="market-flash-symbol">${esc(update.symbol)}</strong></div><dl class="market-flash-metrics">${update.metrics.map(metric=>`<div><dt>${esc(metric.label)}</dt><dd>${esc(metric.value)}</dd></div>`).join('')}</dl><section class="market-flash-chart" aria-labelledby="hype-chart-title"><div class="market-flash-chart-heading"><div><p class="eyebrow">Interactive price history</p><h3 id="hype-chart-title">HYPE chart</h3></div><p>Choose 1 day, 1 week, or 30 days. Slide across the graph to inspect each recorded price.</p></div>${chart}</section><div class="market-flash-body"><section class="market-flash-about"><div><p class="eyebrow">Asset brief</p><h3>What is HYPE?</h3><p>${esc(update.about.summary)}</p><p class="market-flash-about-note">${esc(update.about.note)}</p></div><dl>${update.about.uses.map(item=>`<div><dt>${esc(item.label)}</dt><dd>${esc(item.value)}</dd></div>`).join('')}</dl></section><section><h3>What moved it</h3>${update.catalysts.map(item=>`<p>${esc(item)}</p>`).join('')}</section><section><h3>Levels in focus</h3><dl class="market-levels">${update.levels.map(level=>`<div><dt>${esc(level.label)}</dt><dd>${esc(level.value)}</dd></div>`).join('')}</dl></section><section class="market-risk"><h3>Risk check</h3><p>${esc(update.risk)}</p></section></div><nav class="market-sources" aria-label="HYPE update sources">${update.sources.map(source=>`<a href="${esc(safeUrl(source.url))}" target="_blank" rel="noopener noreferrer">${esc(source.label)}</a>`).join('')}</nav><p class="market-flash-disclaimer">${esc(update.disclaimer)}</p></article>`;
}

let activeUpdate=null;
let hypeAsset=null;

function renderMarketUpdate(root=document) {
  const target=root.querySelector('#market-flash-content');
  if(!target||!activeUpdate)return;
  target.innerHTML=marketUpdateMarkup(activeUpdate,hypeAsset);
  if(hypeAsset)bindCharts([hypeAsset],target);
}

export async function loadMarketUpdate(root=document,fetcher=fetch) {
  const target=root.querySelector('#market-flash-content');
  if(!target)return;
  try {
    const dataUrl=root.body?.dataset?.updateUrl||(typeof document!=='undefined'?document.body?.dataset.updateUrl:'')||'https://innergclaw.github.io/innerg-watchlist/data/market-updates.json';
    const response=await fetcher(`${dataUrl}?v=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)throw Error(`HTTP ${response.status}`);
    const payload=await response.json();
    const update=payload.updates?.find(item=>item.symbol==='HYPE');
    activeUpdate={...update,updatedAt:payload.updatedAt};
    renderMarketUpdate(root);
  } catch {
    target.innerHTML='<p class="section-note">The latest HYPE update is temporarily unavailable. Price charts remain available below.</p>';
  }
}

if(typeof document!=='undefined'){
  document.addEventListener('market-snapshot',event=>{
    hypeAsset=event.detail?.assets?.find(asset=>asset.symbol==='HYPE')||null;
    renderMarketUpdate();
  });
  loadMarketUpdate();
}
