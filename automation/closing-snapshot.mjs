// Rebuild the public closing bell from the published price snapshot.
// innerg-watchlist's closing job fails before it can publish this graphic.

const ET = 'America/New_York';

function round4(value) {
  return Number(value.toFixed(4));
}

export function etDate(unixSeconds) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ET,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(unixSeconds * 1000));
}

function etClock(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: ET,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).map(part => [part.type, part.value]));
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: hour * 60 + Number(parts.minute),
  };
}

function addDays(iso, days) {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekday(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

export function datedCloses(asset, through) {
  const closes = [];
  for (const point of asset?.charts?.month?.points ?? []) {
    const [timestamp, value] = point;
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const date = etDate(timestamp);
    if (date <= through) closes.push([date, value]);
  }
  return closes;
}

export function latestCompletedMarketDate(assets, now = new Date()) {
  const clock = etClock(now);
  let through = clock.date;
  if (weekday(through) < 5 && clock.minutes < 16 * 60) through = addDays(through, -1);
  while (weekday(through) > 4) through = addDays(through, -1);
  const dates = [];
  for (const asset of assets) {
    if (asset?.sector === 'crypto') continue;
    const closes = datedCloses(asset, through);
    if (closes.length) dates.push(closes.at(-1)[0]);
  }
  if (!dates.length) throw Error('No completed market session is available');
  return dates.reduce((latest, date) => date > latest ? date : latest);
}

function reportItem(asset, price, change) {
  return {
    symbol: asset.symbol,
    name: asset.name,
    sector: asset.sector,
    price: round4(price),
    currency: asset.currency || 'USD',
    changePercent: round4(change),
  };
}

export function rankClosingBoard(assets, marketDate) {
  const ranked = [];
  for (const asset of assets) {
    if (asset?.sector === 'crypto' || asset?.status !== 'ok') continue;
    const points = datedCloses(asset, marketDate);
    if (points.length < 2 || points.at(-1)[0] !== marketDate || points.at(-2)[1] === 0) continue;
    const change = (points.at(-1)[1] / points.at(-2)[1] - 1) * 100;
    ranked.push([asset, points.at(-1)[1], change]);
  }
  ranked.sort((a, b) => b[2] - a[2]);
  const gainerRows = ranked.slice(0, 5);
  const gainerSymbols = new Set(gainerRows.map(row => row[0].symbol));
  const loserRows = ranked.filter(row => !gainerSymbols.has(row[0].symbol)).reverse().slice(0, 5);
  if (gainerRows.length !== 5 || loserRows.length !== 5) {
    throw Error('At least ten eligible non-crypto assets are required');
  }
  return {
    gainers: gainerRows.map(row => reportItem(...row)),
    losers: loserRows.map(row => reportItem(...row)),
  };
}

export function buildClosingReport(snapshot, now = new Date()) {
  if (!snapshot || !Array.isArray(snapshot.assets) || !snapshot.assets.length) throw Error('Invalid snapshot');
  const marketDate = latestCompletedMarketDate(snapshot.assets, now);
  const {gainers, losers} = rankClosingBoard(snapshot.assets, marketDate);
  return {
    marketDate,
    generatedAt: snapshot.generatedAt,
    universe: 'Public INNERG watchlist, excluding crypto',
    method: 'Regular-session daily percentage change',
    gainers,
    losers,
    sources: snapshot.sources ?? [],
    disclaimer: 'Research and education only. Prices can be delayed.',
  };
}

export function sameClosingBoard(left, right) {
  if (!left || !right) return false;
  return left.marketDate === right.marketDate
    && JSON.stringify(left.gainers) === JSON.stringify(right.gainers)
    && JSON.stringify(left.losers) === JSON.stringify(right.losers);
}

function escapeXml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  }[character]));
}

function displayDate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day)));
  return formatted;
}

function money(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function shortName(value) {
  const text = String(value ?? '');
  return text.length > 18 ? `${text.slice(0, 17).trimEnd()}…` : text;
}

export function renderClosingGraphic(report) {
  const columns = [
    [76, 'TOP 5 GAINERS', report.gainers, '#caff37'],
    [824, 'TOP 5 LOSERS', report.losers, '#ff8d82'],
  ];
  const rows = columns.map(([x, heading, items, accent]) => {
    const lines = items.map((item, index) => {
      const y = 355 + index * 77;
      const rule = index ? `<line x1="${x + 34}" y1="${y - 14}" x2="${x + 666}" y2="${y - 14}" stroke="#3c3c36"/>` : '';
      return `${rule}<text x="${x + 34}" y="${y + 18}" fill="#74746c" font-size="20">${String(index + 1).padStart(2, '0')}</text><text x="${x + 82}" y="${y + 18}" fill="#f5f5ef" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="27">${escapeXml(item.symbol)}</text><text x="${x + 250}" y="${y + 18}" fill="#aaa9a1" font-size="18">${escapeXml(shortName(item.name))}</text><text x="${x + 478}" y="${y + 18}" fill="#deded6" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="24" text-anchor="end">${escapeXml(money(item.price))}</text><text x="${x + 650}" y="${y + 18}" fill="${accent}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="24" text-anchor="end">${escapeXml(`${item.changePercent > 0 ? '+' : ''}${item.changePercent.toFixed(2)}%`)}</text>`;
    }).join('');
    return `<rect x="${x}" y="255" width="700" height="505" rx="22" fill="#20201d" stroke="#3c3c36" stroke-width="2"/><text x="${x + 34}" y="316" fill="${accent}" font-size="30" font-weight="700">${heading}</text>${lines}`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" aria-label="Closing Bell Snapshot ${escapeXml(displayDate(report.marketDate))}">
  <rect width="1600" height="900" fill="#151513"/>
  <rect width="24" height="900" fill="#caff37"/>
  <g font-family="Inter, ui-sans-serif, system-ui, sans-serif">
    <text x="76" y="88" fill="#caff37" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="22">INNERG MARKET PULSE</text>
    <text x="76" y="164" fill="#f5f5ef" font-size="66" font-weight="700">Closing Bell Snapshot</text>
    <text x="78" y="214" fill="#a8a89f" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="22">U.S. MARKET CLOSE  /  ${escapeXml(displayDate(report.marketDate).toUpperCase())}</text>
    ${rows}
    <text x="76" y="838" fill="#aaa9a1" font-size="20">RANKED BY REGULAR-SESSION DAILY % CHANGE  •  CRYPTO EXCLUDED</text>
    <text x="1524" y="838" fill="#caff37" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="22" text-anchor="end">RESEARCH ONLY</text>
  </g>
</svg>
`;
}
