import test from 'node:test';
import assert from 'node:assert/strict';
import {buildClosingReport, latestCompletedMarketDate, renderClosingGraphic} from './closing-snapshot.mjs';

function point(iso, price) {
  const [year, month, day] = iso.split('-').map(Number);
  return [Date.UTC(year, month - 1, day, 16, 0, 0) / 1000, price];
}

function asset(symbol, sector, prices, status = 'ok') {
  return {
    symbol,
    name: `${symbol} Name`,
    sector,
    status,
    currency: 'USD',
    charts: {month: {points: prices}},
  };
}

const session = ['2026-10-12', '2026-10-13'];
const names = ['AAA','BBB','CCC','DDD','EEE','FFF','GGG','HHH','III','JJJ'];
const assets = names.map((symbol, index) => asset(symbol, 'industrials', [
  point(session[0], 100),
  point(session[1], 100 + (index - 4) * 2),
]));
assets.push(asset('BTC', 'crypto', [point(session[0], 10), point(session[1], 50)]));
assets.push(asset('BAD', 'energy', [point(session[0], 10), point(session[1], 1)], 'error'));

test('closing board uses the latest completed session and excludes crypto', () => {
  const now = new Date('2026-10-14T14:00:00Z');
  assert.equal(latestCompletedMarketDate(assets, now), '2026-10-13');
  const report = buildClosingReport({assets, generatedAt: '2026-10-13T20:10:28Z', sources: ['Yahoo Finance chart data']}, now);
  assert.equal(report.marketDate, '2026-10-13');
  assert.deepEqual(report.gainers.map(item => item.symbol), ['JJJ','III','HHH','GGG','FFF']);
  assert.deepEqual(report.losers.map(item => item.symbol), ['AAA','BBB','CCC','DDD','EEE']);
  assert.ok(report.gainers.every(item => item.sector !== 'crypto'));
  assert.equal(report.gainers[0].changePercent > report.gainers.at(-1).changePercent, true);
  assert.equal(report.losers[0].changePercent < report.losers.at(-1).changePercent, true);
});

test('weekend and pre-close clocks stay on the last finished session', () => {
  assert.equal(latestCompletedMarketDate(assets, new Date('2026-10-14T18:30:00Z')), '2026-10-13');
  assert.equal(latestCompletedMarketDate(assets, new Date('2026-10-17T15:00:00Z')), '2026-10-13');
});

test('closing graphic escapes names and names the session', () => {
  const report = buildClosingReport({
    assets,
    generatedAt: '2026-10-13T20:10:28Z',
    sources: [],
  }, new Date('2026-10-14T14:00:00Z'));
  report.gainers[0].name = '<script>';
  const graphic = renderClosingGraphic(report);
  assert.equal(graphic.includes('<script>'), false);
  assert.match(graphic, /OCTOBER 13, 2026/);
  assert.match(graphic, /&lt;script&gt;/);
});
