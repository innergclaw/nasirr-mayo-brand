import { escapeHTML, money, tone } from './display.mjs';

const periods = [['day','1D'],['week','1W'],['month','30D']];
const chartState = new Map();

export function seriesFor(asset, period) {
  const points = asset.charts?.[period]?.points || [];
  return [...new Map(points.filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&p[0]>0&&Number.isFinite(p[1])).map(p=>[p[0],p])).values()].sort((a,b)=>a[0]-b[0]);
}
export function coordinates(points) {
  if (!points.length) return [];
  const values=points.map(p=>p[1]), low=Math.min(...values), high=Math.max(...values);
  const start=points[0][0], duration=points.at(-1)[0]-start;
  return points.map(([time,price])=>({x:duration?4+(time-start)/duration*312:160,y:high===low?50:90-(price-low)/(high-low)*80}));
}
export function nearestPoint(points, fraction) {
  if (!points.length) return -1;
  const target=points[0][0]+Math.max(0,Math.min(1,fraction))*(points.at(-1)[0]-points[0][0]);
  return points.reduce((best,p,index)=>Math.abs(p[0]-target)<Math.abs(points[best][0]-target)?index:best,0);
}
export function pointTime(timestamp, period) {
  return new Date(timestamp*1000).toLocaleString('en-US',{timeZone:period==='day'?'America/New_York':'UTC',month:'short',day:'numeric',year:'numeric',...(period==='day'?{hour:'numeric',minute:'2-digit',timeZoneName:'short'}:{})});
}
function contents(asset, key) {
  const state=chartState.get(key)||{period:'week',timestamp:null};
  const {period}=state, points=seriesFor(asset,period), coords=coordinates(points);
  let index=points.length-1;
  if(state.timestamp!==null&&points.length) index=points.reduce((best,p,i)=>Math.abs(p[0]-state.timestamp)<Math.abs(points[best][0]-state.timestamp)?i:best,index);
  const point=points[index], position=coords[index];
  const info=asset.charts?.[period];
  const path=coords.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  const label=point?`${money(point[1],asset.currency)} · ${pointTime(point[0],period)}`:'No recorded prices';
  return `<div class="chart-controls" role="group" aria-label="${escapeHTML(asset.symbol)} chart period">${periods.map(([value,name])=>`<button type="button" data-period="${value}" aria-pressed="${value===period}" aria-label="${escapeHTML(asset.symbol)} ${value==='day'?'1 day':value==='week'?'1 week':'30 days'} chart">${name}</button>`).join('')}</div>
    ${point?`<div class="chart-readout"><strong>${money(point[1],asset.currency)}</strong><span>${escapeHTML(pointTime(point[0],period))}</span></div>
    <svg class="scrub-plot" viewBox="0 0 320 100" preserveAspectRatio="none" role="img" aria-label="${escapeHTML(asset.symbol)} ${escapeHTML(info.label)} price chart. Use the slider below to inspect recorded prices."><line x1="4" y1="50" x2="316" y2="50"/><path class="${tone(points.at(-1)[1]-points[0][1])}" d="${path}" pathLength="1"/><line class="chart-guide" x1="${position.x}" x2="${position.x}" y1="0" y2="100"/><circle class="chart-dot" cx="${position.x}" cy="${position.y}" r="4"/></svg>
    <input class="chart-slider" type="range" min="0" max="${points.length-1}" step="1" value="${index}" aria-label="${escapeHTML(asset.symbol)} recorded price" aria-valuetext="${escapeHTML(label)}" ${points.length<2?'disabled':''}/>
    <figcaption><span>${escapeHTML(info.label)}</span><span>${escapeHTML(info.interval)} · ${points.length} points${period==='day'?'':' · UTC dates'}</span></figcaption>`:
    `<p class="chart-empty">${period==='day'?'Intraday':'Historical'} chart unavailable for this asset. Try another period.</p>`}
    <p class="scrub-help">${point?'Slide or use arrow keys to inspect.':'No estimated prices shown.'}</p>`;
}
export function chartMarkup(asset, context='asset') {
  const key=`${context}-${asset.symbol}`;
  return `<figure class="chart interactive-chart" data-chart-symbol="${escapeHTML(asset.symbol)}" data-chart-key="${escapeHTML(key)}">${contents(asset,key)}</figure>`;
}
export function bindCharts(assets, root=document) {
  const bySymbol=new Map(assets.map(asset=>[asset.symbol,asset]));
  root.querySelectorAll('.interactive-chart').forEach(figure=>{
    if(figure.dataset.bound==='true') return;
    const asset=bySymbol.get(figure.dataset.chartSymbol),key=figure.dataset.chartKey;
    if(!asset) return;
    figure.dataset.bound='true';
    const wire=()=>{
      const period=(chartState.get(key)||{}).period||'week';
      const points=seriesFor(asset,period),coords=coordinates(points);
      const slider=figure.querySelector('.chart-slider'),plot=figure.querySelector('.scrub-plot');
      function select(index) {
        if(!points.length) return;
        index=Math.max(0,Math.min(points.length-1,index));
        const [timestamp,price]=points[index],position=coords[index];
        slider.value=String(index);
        slider.setAttribute('aria-valuetext',`${money(price,asset.currency)} · ${pointTime(timestamp,period)}`);
        figure.querySelector('.chart-readout strong').textContent=money(price,asset.currency);
        figure.querySelector('.chart-readout span').textContent=pointTime(timestamp,period);
        const line=figure.querySelector('.chart-guide'),dot=figure.querySelector('.chart-dot');
        line.setAttribute('x1',position.x);line.setAttribute('x2',position.x);
        dot.setAttribute('cx',position.x);dot.setAttribute('cy',position.y);
        chartState.set(key,{period,timestamp});
      }
      figure.querySelectorAll('[data-period]').forEach(button=>button.addEventListener('click',()=>{
        chartState.set(key,{period:button.dataset.period,timestamp:null});
        figure.classList.remove('chart-enter');
        figure.innerHTML=contents(asset,key);wire();
        figure.querySelector(`[data-period="${button.dataset.period}"]`).focus({preventScroll:true});
      }));
      slider?.addEventListener('input',()=>select(Number(slider.value)));
      if(!plot) return;
      let dragging=false;
      const selectPointer=event=>{
        const box=plot.getBoundingClientRect();
        select(nearestPoint(points,((event.clientX-box.left)/box.width*320-4)/312));
      };
      plot.addEventListener('pointerdown',event=>{if(event.button!==0)return;dragging=true;slider.focus({preventScroll:true});plot.setPointerCapture(event.pointerId);selectPointer(event);});
      plot.addEventListener('pointermove',event=>{if(dragging||event.pointerType==='mouse')selectPointer(event);});
      const stop=()=>{dragging=false;};
      plot.addEventListener('pointerup',stop);plot.addEventListener('pointercancel',stop);plot.addEventListener('lostpointercapture',stop);
    };
    wire();
  });
}
