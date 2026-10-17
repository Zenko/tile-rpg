#!/usr/bin/env node
/* Load audit: how long the game takes to become playable on a slow phone, measured the way a visitor feels it.
   It serves a folder over http with gzip and Pages-like cache headers (so the bytes are the ones a real visit transfers), throttles the network
   and the CPU, loads the game, and reports transferred KB, request count, first paint, DOMContentLoaded, load, and "ready" (the player is in the town).
   Medians of N runs. Compare two folders (a worktree of the old commit and this one) to see what a change really bought.
   usage: node scripts/load-audit.js [--dir=.] [--net=4g|3g|fast] [--cpu=4] [--runs=3] [--repeat]      (--repeat adds a second visit with the service worker warm)
   Needs Playwright. Numbers vary between machines: only compare runs from the same machine, back to back. */
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const DIR = path.resolve(arg('dir', path.join(__dirname, '..'))), NET = arg('net', '4g'), CPU = +arg('cpu', 4), RUNS = +arg('runs', 3), REPEAT = process.argv.includes('--repeat');
const NETS = { '4g': { downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8, latency: 150 }, '3g': { downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8, latency: 300 }, fast: null };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const TEXT = new Set(['.html', '.js', '.css', '.json', '.svg']), gz = new Map();
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]), f = path.join(DIR, p === '/' ? 'index.html' : p);
  if (!f.startsWith(DIR) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  const ext = path.extname(f), h = { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': 'max-age=600' };
  let body = fs.readFileSync(f);
  if (TEXT.has(ext)) { if (!gz.has(f)) gz.set(f, zlib.gzipSync(body, { level: 6 })); body = gz.get(f); h['content-encoding'] = 'gzip'; }
  h['content-length'] = body.length; res.writeHead(200, h); res.end(body);
});
const median = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
async function visit(ctx, url, label) {
  const page = await ctx.newPage(), cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable');
  if (NETS[NET]) await cdp.send('Network.emulateNetworkConditions', Object.assign({ offline: false }, NETS[NET])); await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  let bytes = 0, reqs = 0; cdp.on('Network.loadingFinished', e => { bytes += e.encodedDataLength || 0; reqs++; });
  await page.addInitScript(() => { window.__fcp = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__fcp = Math.round(e.startTime); }).observe({ type: 'paint', buffered: true }); });
  const t0 = Date.now(); await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 }); const dcl = Date.now() - t0;
  await page.waitForLoadState('load', { timeout: 180000 }); const load = Date.now() - t0;
  await page.waitForFunction(() => typeof state !== 'undefined' && !!document.querySelector('.ent.player, .pl-sprite'), null, { timeout: 180000 }); const ready = Date.now() - t0;
  const fcp = await page.evaluate(() => window.__fcp);
  await page.close(); return { label, kb: Math.round(bytes / 1024), reqs, fcp, dcl, load, ready };
}
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const url = 'http://127.0.0.1:' + server.address().port + '/index.html';
  const browser = await chromium.launch(), rows = [], rep = [];
  for (let i = 0; i < RUNS; i++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    rows.push(await visit(ctx, url, 'first visit'));
    if (REPEAT) { await new Promise(r => setTimeout(r, 1500)); rep.push(await visit(ctx, url, 'second visit (cached)')); }
    await ctx.close();
  }
  const show = (name, list) => { if (!list.length) return; console.log(`${name.padEnd(24)} ${String(median(list.map(r => r.kb))).padStart(6)} KB ${String(list[0].reqs).padStart(4)} req   first paint ${String(median(list.map(r => r.fcp))).padStart(6)} ms   DOMContentLoaded ${String(median(list.map(r => r.dcl))).padStart(6)} ms   load ${String(median(list.map(r => r.load))).padStart(6)} ms   READY ${String(median(list.map(r => r.ready))).padStart(6)} ms`); };
  console.log(`\n${DIR}\nnetwork ${NET}, CPU x${CPU}, median of ${RUNS}`); show('first visit', rows); show('second visit (cached)', rep);
  await browser.close(); server.close();
})();
