import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url); const { chromium } = require('playwright'); import { serve } from './server.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const data = path.join(root, 'data');
const frames = JSON.parse(fs.readFileSync(path.join(data, 'frames.json'))); const words = JSON.parse(fs.readFileSync(path.join(data, 'words.json'))); const meta = JSON.parse(fs.readFileSync(path.join(data, 'meta.json')));
const { server, port } = await serve(root); const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } }); await p.goto(`http://127.0.0.1:${port}/render.html`); await p.waitForFunction('window.ready', null, { timeout: 120000 });
await p.evaluate(n => window.preload(n), [...new Set(frames.flatMap(f => f.cards.map(c => c.img)))]);
const items = []; const from = +(process.argv[2] || 0), to = +(process.argv[3] || 99);
for (let k = from; k < Math.min(to, meta.shots.length); k++) { const a = meta.shots[k].t0, e = k + 1 < meta.shots.length ? meta.shots[k + 1].t0 : meta.duration;
  for (const [lab, tt] of [['start', a + 0.3], ['mid', (a + e) / 2], ['end', e - 0.12]]) { const f = frames[Math.min(Math.round(tt * 30), frames.length - 1)]; const url = await p.evaluate(f => window.renderFrame(f, 0.8), f);
    const ln = words.lines.find(l => f.t >= l.start - 0.1 && f.t <= l.end + 0.15) || words.lines[9]; items.push({ url, l1: `${meta.shots[k].name} ${lab} ${f.t.toFixed(1)}s`, l2: ln.text.slice(0, 60) }); } console.log('shot', meta.shots[k].name); }
const out = await p.evaluate(it => window.sheet(it, 9, 220), items); fs.writeFileSync(path.join(root, 'out', process.argv[4] || 'all_sheet.jpg'), Buffer.from(out.split(',')[1], 'base64')); await b.close(); server.close();
