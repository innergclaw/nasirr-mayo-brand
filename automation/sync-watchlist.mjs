// Mirror only the published public interface. Research remains behind member-research.
import { mkdir, writeFile } from 'node:fs/promises';
const origin = 'https://innergclaw.github.io/innerg-watchlist/';
const destination = new URL('../watchlist/', import.meta.url);
const files = ['index.html','styles.css','app.js','display.mjs','interactive-charts.mjs','weekly-mover.mjs','member-access.mjs','brief.mjs','news.mjs','section-nav.mjs'];
const results = await Promise.all(files.map(async file => {
  const response = await fetch(origin + file + '?sync=' + Date.now());
  if (!response.ok) throw Error(`${file}: HTTP ${response.status}`);
  let content = await response.text();
  if (file === 'index.html') {
    content = content.replace('content="'+origin+'"','content="https://nasirr.innergintel.org/watchlist/"');
    content = content.replace('</head>', '<link rel="canonical" href="https://nasirr.innergintel.org/watchlist/" />\n</head>');
    content = content.replace('href="data/watchlist.json"', 'href="'+origin+'data/watchlist.json"');
  }
  if (file === 'app.js') {
    if (!content.includes("const DATA_URL = 'data/watchlist.json';")) throw Error('Data source contract changed; review before syncing.');
    content = content.replace("const DATA_URL = 'data/watchlist.json';", `const DATA_URL = '${origin}data/watchlist.json';`);
  }
  if (file === 'member-access.mjs') {
    const handler = "document.querySelector('#google-signin').onclick=async()=>{";
    if (!content.includes(handler)) throw Error('Sign-in contract changed; review before syncing.');
    content = content.replace(handler, handler+"\n  if(location.pathname.startsWith('/watchlist/')){location.assign('/account/?next=%2Fwatchlist%2F');return;}\n");
  }
  return [file,content];
}));
await mkdir(destination,{recursive:true});
for (const [file,content] of results) await writeFile(new URL(file,destination), content);
console.log(`Synced ${results.length} public interface files. Live data and protected research keep their existing sources.`);
