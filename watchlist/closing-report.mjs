import {escapeHTML, money, percent, tone} from './display.mjs';

const esc = escapeHTML;

export function validateClosingReport(report) {
  if (!report || !/^\d{4}-\d{2}-\d{2}$/.test(report.marketDate || '')) throw Error('Invalid market date');
  for (const key of ['gainers', 'losers']) {
    if (!Array.isArray(report[key]) || report[key].length !== 5) throw Error(`Invalid ${key}`);
    for (const item of report[key]) {
      if (!item.symbol || !item.name || !Number.isFinite(item.price) || !Number.isFinite(item.changePercent)) throw Error(`Invalid ${key} item`);
    }
  }
  const symbols = [...report.gainers, ...report.losers].map(item => item.symbol);
  if (new Set(symbols).size !== symbols.length) throw Error('Duplicate closing-report symbol');
  return report;
}

function rows(items) {
  return items.map((item, index) => `<li><span class="closing-rank">${index + 1}</span><span><strong>${esc(item.symbol)}</strong><small>${esc(item.name)}</small></span><span class="closing-price">${money(item.price, item.currency)}</span><span class="${tone(item.changePercent)}">${percent(item.changePercent)}</span></li>`).join('');
}

export function closingReportMarkup(report) {
  validateClosingReport(report);
  const date = new Date(`${report.marketDate}T16:00:00-04:00`).toLocaleDateString('en-US', {month:'long', day:'numeric', year:'numeric'});
  return `<div class="closing-summary"><p class="eyebrow">U.S. market close · ${esc(date)}</p><h2 id="closing-bell-title">Closing Bell Snapshot</h2><p>Five gainers and five losers from the public INNERG watchlist. Ranked by regular-session daily percentage change.</p></div><div class="closing-board"><article><h3>Top 5 gainers</h3><ol>${rows(report.gainers)}</ol></article><article><h3>Top 5 losers</h3><ol>${rows(report.losers)}</ol></article></div><div class="closing-actions"><a href="assets/innerg-closing-bell.svg" download>Download the closing graphic</a><a href="data/closing-report.json">Open report data</a></div><p class="closing-disclosure">End-of-day snapshot. Prices can be delayed. Crypto is excluded because it trades continuously. Research and education only.</p>`;
}

export async function loadClosingReport(root=document, fetcher=fetch) {
  const status = root.querySelector('#closing-status');
  try {
    const response = await fetcher(`data/closing-report.json?v=${Date.now()}`, {cache:'no-store'});
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    status.innerHTML = closingReportMarkup(await response.json());
  } catch {
    status.innerHTML = '<p class="section-note">The closing snapshot is not available yet. Check again after the next market close.</p>';
  }
}

if (typeof document !== 'undefined') loadClosingReport();
