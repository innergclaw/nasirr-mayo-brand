import { escapeHTML, money, assetsForView } from './display.mjs';
import { seriesFor, pointTime } from './interactive-charts.mjs';

export const MAX_LINES=3;
export const PERIODS=[['day','1D','1 day'],['week','1W','1 week'],['month','30D','30 days']];
export const displayLabel=value=>String(value??'').replace(/\bAI\b/g,'SI');

export function toggleSymbol(selected,symbol,max=MAX_LINES){
  if(selected.includes(symbol))return selected.length>1?selected.filter(s=>s!==symbol):selected;
  return [...selected,symbol].slice(-max);
}

export function categoriesFor(assets,sectors){
  return sectors.filter(sector=>assets.some(asset=>asset.sector===sector.id));
}

export function assetsInCategory(assets,category){
  return category==='all'?assets:assets.filter(asset=>asset.sector===category);
}

export function seriesSet(assets,symbols,period){
  const bySymbol=new Map(assets.map(asset=>[asset.symbol,asset]));
  const picked=symbols.map(symbol=>bySymbol.get(symbol)).filter(Boolean);
  const mode=picked.length>1?'percent':'price';
  const series=picked.map((asset,index)=>{
    const raw=seriesFor(asset,period);
    const base=raw[0]?.[1];
    const points=mode==='percent'&&base?raw.map(([t,v])=>[t,(v/base-1)*100]):raw;
    return {symbol:asset.symbol,name:asset.name,currency:asset.currency||'USD',slot:index+1,raw,points};
  });
  return {mode,series};
}

export function niceTicks(min,max,count=4){
  if(!Number.isFinite(min)||!Number.isFinite(max))return [];
  if(min===max){const pad=Math.abs(min)*.01||1;min-=pad;max+=pad;}
  const rough=(max-min)/count,power=10**Math.floor(Math.log10(rough)),step=[1,2,2.5,5,10].map(n=>n*power).find(n=>n>=rough);
  const ticks=[];
  for(let v=Math.floor(min/step)*step;v<=max+step*1e-9;v+=step)ticks.push(Number(v.toFixed(10)));
  if(ticks.at(-1)<max)ticks.push(ticks.at(-1)+step);
  return ticks;
}

export function monotonePath(coords){
  const n=coords.length;
  if(!n)return '';
  const f=v=>v.toFixed(2);
  if(n===1)return `M ${f(coords[0].x)} ${f(coords[0].y)}`;
  const s=[];
  for(let i=0;i<n-1;i++){const dx=coords[i+1].x-coords[i].x;s.push(dx?(coords[i+1].y-coords[i].y)/dx:0);}
  const m=coords.map((_,i)=>{
    if(i===0)return s[0];
    if(i===n-1)return s[n-2];
    if(s[i-1]*s[i]<=0)return 0;
    const h0=coords[i].x-coords[i-1].x,h1=coords[i+1].x-coords[i].x;
    return 3*(h0+h1)/((2*h1+h0)/s[i-1]+(h1+2*h0)/s[i]);
  });
  let d=`M ${f(coords[0].x)} ${f(coords[0].y)}`;
  for(let i=0;i<n-1;i++){
    const a=coords[i],b=coords[i+1],h=(b.x-a.x)/3;
    d+=` C ${f(a.x+h)} ${f(a.y+m[i]*h)} ${f(b.x-h)} ${f(b.y-m[i+1]*h)} ${f(b.x)} ${f(b.y)}`;
  }
  return d;
}

export function formatValue(value,mode,currency='USD'){
  if(!Number.isFinite(value))return 'Unavailable';
  return mode==='percent'?`${value>0?'+':''}${value.toFixed(2)}%`:money(value,currency);
}
function tickLabel(value,mode,currency){
  if(mode==='percent')return `${value>0?'+':''}${Number(value.toFixed(2))}%`;
  const abs=Math.abs(value);
  const digits=abs>=1000?0:abs>=10?(Number.isInteger(value)?0:1):abs>=1?2:3;
  return new Intl.NumberFormat('en-US',{style:'currency',currency,notation:abs>=100000?'compact':'standard',minimumFractionDigits:0,maximumFractionDigits:digits}).format(value);
}
function timeTick(t,period){
  return new Date(t*1000).toLocaleString('en-US',period==='day'?{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'}:{timeZone:'UTC',month:'short',day:'numeric'});
}

export function layout({mode,series},period,width=640,height=260){
  const margin={top:12,right:16,bottom:28,left:mode==='percent'?52:64};
  const all=series.flatMap(s=>s.points);
  if(!all.length)return null;
  const values=all.map(p=>p[1]),times=all.map(p=>p[0]);
  const ticks=niceTicks(Math.min(...values),Math.max(...values));
  const lo=ticks[0],hi=ticks.at(-1),t0=Math.min(...times),t1=Math.max(...times);
  const iw=Math.max(40,width-margin.left-margin.right),ih=Math.max(40,height-margin.top-margin.bottom);
  const x=t=>margin.left+(t1===t0?iw/2:(t-t0)/(t1-t0)*iw);
  const y=v=>margin.top+(hi===lo?ih/2:(hi-v)/(hi-lo)*ih);
  const xn=width<480?3:5,xticks=Array.from({length:xn},(_,i)=>t0+(t1-t0)*i/(xn-1));
  return {width,height,margin,iw,ih,x,y,t0,t1,ticks,xticks,paths:series.map(s=>monotonePath(s.points.map(([t,v])=>({x:x(t),y:y(v)})))),
    timeAt:fraction=>t0+Math.max(0,Math.min(1,fraction))*(t1-t0),
    label:value=>tickLabel(value,mode,series[0].currency),xlabel:t=>timeTick(t,period)};
}

export function nearestIndex(points,t){
  if(!points.length)return -1;
  let best=0;
  for(let i=1;i<points.length;i++)if(Math.abs(points[i][0]-t)<Math.abs(points[best][0]-t))best=i;
  return best;
}

export function plotMarkup(set,period,width,height){
  const L=layout(set,period,width,height);
  if(!L)return '<p class="line-empty">No recorded prices for this selection and period. Try another period.</p>';
  const grid=L.ticks.map(v=>`<line class="line-grid" x1="${L.margin.left}" x2="${L.width-L.margin.right}" y1="${L.y(v).toFixed(2)}" y2="${L.y(v).toFixed(2)}"/><text class="line-tick" x="${L.margin.left-8}" y="${L.y(v).toFixed(2)}" text-anchor="end" dominant-baseline="middle">${escapeHTML(L.label(v))}</text>`).join('');
  const xt=L.xticks.map((t,i,arr)=>`<text class="line-tick" x="${L.x(t).toFixed(2)}" y="${L.height-8}" text-anchor="${i===0?'start':i===arr.length-1?'end':'middle'}">${escapeHTML(L.xlabel(t))}</text>`).join('');
  const lines=L.paths.map((d,i)=>`<path class="line-series s${set.series[i].slot}" d="${d}"/>`).join('');
  return `<svg class="line-svg" width="${L.width}" height="${L.height}" viewBox="0 0 ${L.width} ${L.height}" aria-hidden="true" focusable="false">${grid}${xt}${lines}<line class="line-cursor" x1="0" x2="0" y1="${L.margin.top}" y2="${L.margin.top+L.ih}" visibility="hidden"/></svg>`;
}

export function tooltipMarkup(set,t,period){
  const rows=set.series.map(s=>{const i=nearestIndex(s.points,t);return i<0?'':`<div class="line-tip-row"><span class="ring-dot s${s.slot}" aria-hidden="true"></span><span class="line-tip-label">${escapeHTML(s.symbol)}</span><span class="line-tip-value">${escapeHTML(formatValue(s.points[i][1],set.mode,s.currency))}</span></div>`;}).join('');
  return `<p class="line-tip-time">${escapeHTML(pointTime(t,period))}</p>${rows}`;
}

export function legendMarkup(set){
  return set.series.map(s=>{
    const first=s.raw[0]?.[1],last=s.raw.at(-1)?.[1];
    const change=Number.isFinite(first)&&Number.isFinite(last)&&first?(last/first-1)*100:NaN;
    return `<li><span class="ring-dot s${s.slot}" aria-hidden="true"></span><span class="line-legend-symbol">${escapeHTML(s.symbol)}</span><span class="line-legend-change">${escapeHTML(formatValue(change,'percent'))}</span></li>`;
  }).join('');
}

export function cardMarkup(state,assets,sectors){
  const categories=categoriesFor(assets,sectors);
  const pool=assetsInCategory(assets,state.category);
  const set=seriesSet(assets,state.symbols,state.period);
  const periodName=PERIODS.find(p=>p[0]===state.period)?.[2]||'';
  const subtitle=set.series.length>1?`${periodName} change from the first recorded price`:`${periodName} price${set.series[0]?`, ${escapeHTML(set.series[0].name)}`:''}`;
  const pill=(attrs,label,pressed)=>`<button type="button" class="pill" ${attrs} aria-pressed="${pressed}">${label}</button>`;
  return `<div class="line-card-head"><div><h3 id="watchlist-chart-title">${escapeHTML(set.series.map(s=>s.symbol).join(', ')||'Price history')}</h3><p class="line-card-sub">${subtitle}</p></div><div class="segmented" role="group" aria-label="Chart period">${PERIODS.map(([value,label,name])=>pill(`data-period="${value}" aria-label="${name}"`,label,value===state.period)).join('')}</div></div>
  <div class="pill-row" role="group" aria-label="Category">${pill('data-category="all"','All',state.category==='all')}${categories.map(c=>pill(`data-category="${escapeHTML(c.id)}"`,escapeHTML(displayLabel(c.name)),state.category===c.id)).join('')}</div>
  <div class="pill-row ticker-row" role="group" aria-label="Tickers. Choose up to ${MAX_LINES} to compare.">${pool.map(a=>pill(`data-symbol="${escapeHTML(a.symbol)}" title="${escapeHTML(a.name)}"`,escapeHTML(a.symbol),state.symbols.includes(a.symbol))).join('')}</div>
  <p class="pill-hint">Choose up to ${MAX_LINES} tickers to compare. Several tickers show percent change.</p>
  <div class="line-plot" tabindex="0" role="img" aria-roledescription="line chart" aria-label="${escapeHTML(set.series.map(s=>s.symbol).join(', '))} ${escapeHTML(periodName)} chart. Use left and right arrow keys to read values."><div class="line-svg-wrap"></div><div class="line-tip" hidden></div></div>
  <ul class="line-legend" aria-label="Legend">${legendMarkup(set)}</ul>
  <p class="sr-only line-live" aria-live="polite"></p>`;
}

export function createWatchlistChart(root,{view='all'}={}){
  const state={category:'all',symbols:[],period:'week'};
  let assets=[],sectors=[],set=null,L=null,index=-1;
  const plotSize=()=>{const wrap=root.querySelector('.line-svg-wrap');const w=Math.round(wrap?.clientWidth||640);return [w,w<480?220:280];};
  function drawPlot(){
    const wrap=root.querySelector('.line-svg-wrap');if(!wrap)return;
    const [w,h]=plotSize();
    set=seriesSet(assets,state.symbols,state.period);
    L=layout(set,state.period,w,h);
    wrap.innerHTML=plotMarkup(set,state.period,w,h);
    index=-1;hide();
  }
  function render(){
    if(!state.symbols.length&&assets.length)state.symbols=[assetsInCategory(assets,state.category)[0]?.symbol||assets[0].symbol];
    root.innerHTML=cardMarkup(state,assets,sectors);
    drawPlot();
    root.dispatchEvent?.(new CustomEvent('chart-selection',{bubbles:true,detail:{...state}}));
  }
  const ref=()=>set?.series.reduce((a,b)=>b.points.length>a.points.length?b:a,set.series[0]);
  function show(t){
    if(!L)return;
    const tip=root.querySelector('.line-tip'),cursor=root.querySelector('.line-cursor');
    const x=L.x(t);
    cursor.setAttribute('x1',x);cursor.setAttribute('x2',x);cursor.setAttribute('visibility','visible');
    tip.innerHTML=tooltipMarkup(set,t,state.period);tip.hidden=false;
    const left=x+12+tip.offsetWidth>L.width?x-12-tip.offsetWidth:x+12;
    tip.style.transform=`translate(${Math.max(0,left)}px,${L.margin.top}px)`;
    const live=root.querySelector('.line-live');if(live)live.textContent=tip.textContent;
  }
  function hide(){const tip=root.querySelector('.line-tip');if(tip)tip.hidden=true;root.querySelector('.line-cursor')?.setAttribute('visibility','hidden');}
  root.addEventListener('click',event=>{
    const button=event.target.closest?.('button');if(!button||!root.contains(button))return;
    const focusKey=button.dataset.period?`[data-period="${button.dataset.period}"]`:button.dataset.category?`[data-category="${button.dataset.category}"]`:`[data-symbol="${button.dataset.symbol}"]`;
    if(button.dataset.period)state.period=button.dataset.period;
    else if(button.dataset.category){state.category=button.dataset.category;state.symbols=[assetsInCategory(assets,state.category)[0]?.symbol].filter(Boolean);}
    else if(button.dataset.symbol)state.symbols=toggleSymbol(state.symbols,button.dataset.symbol);
    render();
    root.querySelector(focusKey)?.focus({preventScroll:true});
  });
  root.addEventListener('pointermove',event=>{
    const plot=event.target.closest?.('.line-plot');if(!plot||!L)return;
    const box=plot.getBoundingClientRect();
    show(L.timeAt((event.clientX-box.left-L.margin.left)/L.iw));
    const r=ref();index=nearestIndex(r.points,L.timeAt((event.clientX-box.left-L.margin.left)/L.iw));
  });
  root.addEventListener('pointerleave',hide,true);
  root.addEventListener('keydown',event=>{
    if(!event.target.classList?.contains('line-plot')||!L)return;
    const r=ref();if(!r?.points.length)return;
    const keys={ArrowRight:1,ArrowLeft:-1,Home:-Infinity,End:Infinity};
    if(event.key==='Escape'){hide();return;}
    if(!(event.key in keys))return;
    event.preventDefault();
    const step=keys[event.key];
    const last=r.points.length-1;
    index=!Number.isFinite(step)?(step<0?0:last):index<0?(step>0?0:last):Math.max(0,Math.min(last,index+step));
    show(r.points[index][0]);
  });
  root.addEventListener('focusout',event=>{if(event.target.classList?.contains('line-plot'))hide();});
  let width=0;
  if(typeof ResizeObserver==='function')new ResizeObserver(()=>{const w=root.clientWidth;if(w!==width){width=w;drawPlot();}}).observe(root);
  return {
    update(data){
      assets=assetsForView(data.assets,view);sectors=data.sectors;
      state.symbols=state.symbols.filter(s=>assets.some(a=>a.symbol===s));
      if(state.category!=='all'&&!assets.some(a=>a.sector===state.category))state.category='all';
      render();
    },
    select(symbol){
      const asset=assets.find(a=>a.symbol===symbol);if(!asset)return false;
      state.category=asset.sector;state.symbols=[symbol];render();return true;
    },
    state
  };
}
