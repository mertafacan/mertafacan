// Headless-browser frame renderer. node tools/render.mjs [--workers 3] [--out frames]
// Renders JPG frames from data/frames.json with the three.js scene; skips frames that already exist so it can resume.
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url); const { chromium } = require('playwright'); import { serve } from './server.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const data = path.join(root, 'data');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const workers = +arg('workers', 3), outDir = path.resolve(root, arg('out', 'frames')), quality = +arg('quality', 0.93);
fs.mkdirSync(outDir, { recursive: true });
const frames = JSON.parse(fs.readFileSync(path.join(data, 'frames.json')));
const name = (i) => path.join(outDir, `f${String(i).padStart(5, '0')}.jpg`);
const todo = frames.map((f, i) => i).filter(i => !fs.existsSync(name(i)) || fs.statSync(name(i)).size < 2000);
console.log(`frames total ${frames.length}, to render ${todo.length}, workers ${workers}`);
const { server, port } = await serve(root);
const names = [...new Set(frames.flatMap(f => f.cards.map(c => c.img)))];
let done = 0, t0 = Date.now(); const queue = todo.slice();
async function worker(id) {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } }); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(`http://127.0.0.1:${port}/render.html`); await p.waitForFunction('window.ready', null, { timeout: 180000 }); await p.evaluate(n => window.preload(n), names);
  while (queue.length) {
    const i = queue.shift(); if (i === undefined) break;
    try { const u = await p.evaluate(([f, q]) => window.renderFrame(f, q), [frames[i], quality]); fs.writeFileSync(name(i) + '.tmp', Buffer.from(u.split(',')[1], 'base64')); fs.renameSync(name(i) + '.tmp', name(i)); }
    catch (e) { console.log('frame', i, 'failed', e.message); queue.push(i); await new Promise(r => setTimeout(r, 1000)); }
    done++; if (done % 25 === 0) { const el = (Date.now() - t0) / 1000; console.log(`done ${done}/${todo.length}  ${(done / el).toFixed(2)} fps  eta ${((todo.length - done) / (done / el) / 60).toFixed(1)} min`); }
  }
  await b.close();
}
await Promise.all(Array.from({ length: workers }, (_, k) => worker(k))); server.close();
const missing = frames.map((f, i) => i).filter(i => !fs.existsSync(name(i)));
console.log(missing.length ? `MISSING ${missing.length} frames` : 'ALL FRAMES RENDERED');
process.exit(missing.length ? 1 : 0);
