// Mirror only the published public interface. Research remains behind member-research.
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {buildClosingReport, renderClosingGraphic, sameClosingBoard} from './closing-snapshot.mjs';

const origin = 'https://innergclaw.github.io/innerg-watchlist/';
const home = 'https://nasirr.innergintel.org/watchlist/';
const snapshotUrl = `${origin}data/watchlist.json`;
const updatesUrl = `${origin}data/market-updates.json`;
const destination = new URL('../watchlist/', import.meta.url);
const files = [
  'index.html',
  'styles.css',
  'app.js',
  'display.mjs',
  'interactive-charts.mjs',
  'weekly-mover.mjs',
  'member-access.mjs',
  'brief.mjs',
  'news.mjs',
  'section-nav.mjs',
  'closing-report.mjs',
  'market-update.mjs',
  'watchlist-chart.mjs',
  'stocks/index.html',
  'crypto/index.html',
];
const pages = {
  'index.html': {
    og: origin,
    canonical: home,
    required: ['data-data-url="data/watchlist.json"', 'data-update-url="data/market-updates.json"'],
  },
  'stocks/index.html': {
    og: `${origin}stocks/`,
    canonical: `${home}stocks/`,
    required: ['data-data-url="../data/watchlist.json"'],
  },
  'crypto/index.html': {
    og: `${origin}crypto/`,
    canonical: `${home}crypto/`,
    required: ['data-data-url="../data/watchlist.json"', 'data-update-url="../data/market-updates.json"'],
  },
};

function requireText(content, needle, label) {
  if (!content.includes(needle)) throw Error(`${label} changed; review before syncing.`);
}

function rewritePage(content, file) {
  const page = pages[file];
  for (const needle of page.required) requireText(content, needle, 'Data source contract');
  requireText(content, `content="${page.og}"`, 'Page URL contract');
  content = content.replace(`content="${page.og}"`, `content="${page.canonical}"`);
  content = content.replace('</head>', `<link rel="canonical" href="${page.canonical}" />\n</head>`);
  const replacements = [
    ['data-data-url="data/watchlist.json"', `data-data-url="${snapshotUrl}"`],
    ['data-data-url="../data/watchlist.json"', `data-data-url="${snapshotUrl}"`],
    ['data-update-url="data/market-updates.json"', `data-update-url="${updatesUrl}"`],
    ['data-update-url="../data/market-updates.json"', `data-update-url="${updatesUrl}"`],
    ['href="data/watchlist.json"', `href="${snapshotUrl}"`],
    ['href="../data/watchlist.json"', `href="${snapshotUrl}"`],
  ];
  for (const [from, to] of replacements) content = content.replaceAll(from, to);
  return content;
}

const results = await Promise.all(files.map(async file => {
  const response = await fetch(`${origin}${file}?sync=${Date.now()}`);
  if (!response.ok) throw Error(`${file}: HTTP ${response.status}`);
  let content = await response.text();
  if (pages[file]) content = rewritePage(content, file);
  if (file === 'app.js') {
    const contract = "const DATA_URL = document.body?.dataset.dataUrl || 'data/watchlist.json';";
    requireText(content, contract, 'Data source contract');
    content = content.replace(contract, `const DATA_URL = document.body?.dataset.dataUrl || '${snapshotUrl}';`);
  }
  if (file === 'market-update.mjs') {
    const contract = "||'data/market-updates.json'";
    requireText(content, contract, 'Update source contract');
    content = content.replace(contract, `||'${updatesUrl}'`);
  }
  if (file === 'closing-report.mjs') {
    requireText(content, 'data/closing-report.json', 'Closing report contract');
    requireText(content, 'assets/innerg-closing-bell.png', 'Closing graphic contract');
    content = content.replaceAll('assets/innerg-closing-bell.png', 'assets/innerg-closing-bell.svg');
  }
  if (file === 'member-access.mjs') {
    const handler = "document.querySelector('#google-signin').onclick=async()=>{";
    requireText(content, handler, 'Sign-in contract');
    content = content.replace(handler, `${handler}\n  if(location.pathname.startsWith('/watchlist/')){location.assign('/account/?next=%2Fwatchlist%2F');return;}\n`);
  }
  return [file, content];
}));

const snapshotResponse = await fetch(`${snapshotUrl}?sync=${Date.now()}`, {cache: 'no-store'});
if (!snapshotResponse.ok) throw Error(`watchlist.json: HTTP ${snapshotResponse.status}`);
const snapshot = await snapshotResponse.json();
let report = buildClosingReport(snapshot);
const reportUrl = new URL('data/closing-report.json', destination);
try {
  const previous = JSON.parse(await readFile(reportUrl, 'utf8'));
  if (sameClosingBoard(previous, report) && previous.generatedAt) report = {...report, generatedAt: previous.generatedAt};
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const graphic = renderClosingGraphic(report);

await mkdir(destination, {recursive: true});
for (const [file, content] of results) {
  const target = new URL(file, destination);
  await mkdir(new URL('./', target), {recursive: true});
  await writeFile(target, content);
}
await mkdir(new URL('./', reportUrl), {recursive: true});
await writeFile(reportUrl, `${JSON.stringify(report, null, 2)}\n`);
await mkdir(new URL('assets/', destination), {recursive: true});
await writeFile(new URL('assets/innerg-closing-bell.svg', destination), graphic);
console.log(`Synced ${results.length} public interface files. Snapshot ${snapshot.generatedAt}. Closing bell ${report.marketDate}.`);
