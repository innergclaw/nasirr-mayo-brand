import { escapeHTML, percent, tone } from './display.mjs';
import { safeSource } from './brief.mjs';
import { chartMarkup } from './interactive-charts.mjs';

export function topWeeklyMovers(assets) {
  return assets.filter(a => Number.isFinite(a.returns?.week))
    .sort((a, b) => b.returns.week - a.returns.week || a.symbol.localeCompare(b.symbol))
    .filter((a, index, ranked) => ranked.findIndex(row => row.symbol === a.symbol) === index)
    .slice(0, 3);
}
export function topWeeklyMover(assets) { return topWeeklyMovers(assets)[0] || null; }

let memberMoversUnlocked = false;
// Set only after the research endpoint verifies an active, numbered member.
export function setWeeklyMoverAccess(active) { memberMoversUnlocked = active === true; }

export function weeklyMoversMarkup(assets) {
  const ranked = topWeeklyMovers(assets);
  if (!ranked.length) return '<p>Weekly data is unavailable. Try refreshing shortly.</p>';
  return ranked.map((asset, index) => {
    const rank = index + 1;
    if (rank > 1 && !memberMoversUnlocked) {
      return `<article class="leader-card leader-locked" aria-label="Weekly mover ${rank}, members only"><p class="eyebrow">Weekly rank 0${rank} · INNERG ID access</p><div class="mover-placeholder" aria-hidden="true"><span></span><span></span><span></span></div><h3>See the next mover.</h3><p>Sign in with an active INNERG ID to see all three weekly movers and member research.</p><div class="member-actions"><a class="member-cta" href="#member-access">Sign in with INNERG ID</a><a href="https://nasirr.innergintel.org/innergid/">Become a member</a></div></article>`;
    }
    return `<article class="leader-card" data-weekly-rank="${rank}"><p class="eyebrow">Weekly rank 0${rank}</p><div class="leader-top"><div><h3>${escapeHTML(asset.symbol)}</h3><p>${escapeHTML(asset.name)}</p></div><strong class="${tone(asset.returns.week)}">${percent(asset.returns.week)}<small>1 week</small></strong></div>${chartMarkup(asset, 'leader')}${moverExplanation(asset.symbol)}</article>`;
  }).join('');
}

// Dated editorial context. Never reuse one asset's story for another leader.
export let moverContext = null;
export function setMoverContext(value) { moverContext=value; }

export function moverExplanation(symbol, now = Date.now()) {
  if(!moverContext && memberMoversUnlocked)return '<div class="mover-context"><h4>What is behind the move?</h4><p>A fresh review for this mover is not available yet. Check the member asset news for recent reporting.</p><a href="#asset-news">Read asset news</a></div>';
  if(!moverContext)return '<div class="mover-context"><h4>What is behind the move?</h4><p>Members can read the news, context, and risks behind the numbers.</p><a href="#member-access">Sign in with INNERG ID</a> · <a href="https://nasirr.innergintel.org/innergid/">Become a member</a></div>';
  const age = now - Date.parse(moverContext.reviewedAt);
  if (symbol !== moverContext.symbol || !Number.isFinite(age) || age > 7 * 86400000 || age < 0) {
    return '<div class="mover-context"><h4>What is behind the move?</h4><p>there is no recent analysis for this mover yet. explore asset news for the latest reports.</p></div>';
  }
  const esc = escapeHTML;
  const reviewed=new Date(moverContext.reviewedAt).toLocaleDateString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric'});
  return `<div class="mover-context"><h4>What is behind the move?</h4><p class="mover-reviewed">Financial reporting · Reviewed ${esc(reviewed)}</p><p><strong>X reporting.</strong> ${esc(moverContext.x)}</p><p class="mover-caution">${esc(moverContext.caution)}</p><nav aria-label="Weekly mover sources">${(moverContext.sources||[]).filter(s=>safeSource(s.url)).map(s => `<a href="${esc(safeSource(s.url))}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a>`).join('')}</nav></div>`;
}
