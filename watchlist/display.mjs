export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money = (value, currency='USD') => Number.isFinite(value) ? new Intl.NumberFormat('en-US',{style:'currency',currency,minimumFractionDigits:Math.abs(value)<1?4:2,maximumFractionDigits:Math.abs(value)<1?4:2}).format(value) : 'Unavailable';
export const percent = value => Number.isFinite(value) ? `${value>0?'+':''}${value.toFixed(2)}%` : 'Unavailable';
export const tone = value => !Number.isFinite(value) ? 'unavailable' : value>0?'positive':value<0?'negative':'neutral';
export function filterAssets(assets,query='',sector='all',sort='default') {
  const term=query.trim().toLowerCase();
  const rows=assets.filter(a=>(sector==='all'||a.sector===sector)&&`${a.symbol} ${a.name}`.toLowerCase().includes(term));
  if(sort==='name') rows.sort((a,b)=>a.symbol.localeCompare(b.symbol));
  if(sort==='week'||sort==='loss') rows.sort((a,b)=>{
    if(!Number.isFinite(a.returns?.week)) return Number.isFinite(b.returns?.week)?1:0;
    if(!Number.isFinite(b.returns?.week)) return -1;
    return sort==='week'?b.returns.week-a.returns.week:a.returns.week-b.returns.week;
  });
  return rows;
}
export function chartPath(series=[]) {
  const points=series.filter(Number.isFinite);
  if(points.length<2) return '';
  const min=Math.min(...points),max=Math.max(...points),range=max-min;
  return points.map((v,i)=>`${i?'L':'M'} ${(4+i/(points.length-1)*312).toFixed(2)} ${(range?72-(v-min)/range*64:40).toFixed(2)}`).join(' ');
}
