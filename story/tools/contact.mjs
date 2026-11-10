// Contact sheet before the full render: a still from the middle of every shot, labelled with time and the line being spoken.
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
import { serve } from './server.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const data = path.join(root, 'data');
const frames = JSON.parse(fs.readFileSync(path.join(data, 'frames.json'))); const words = JSON.parse(fs.readFileSync(path.join(data, 'words.json'))); const meta = JSON.parse(fs.readFileSync(path.join(data, 'meta.json')));
const only = process.argv[2] ? process.argv[2].split(',') : null; const where = process.argv[3] || 'mid';
const { server, port } = await serve(root);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } }); p.on('pageerror', e => console.log('ERR', e.message));
await p.goto(`http://127.0.0.1:${port}/render.html`); await p.waitForFunction('window.ready', null, { timeout: 120000 });
const names = [...new Set(frames.flatMap(f => f.cards.map(c => c.img)))]; await p.evaluate(n => window.preload(n), names);
const shots = meta.shots; const items = [];
for (let k = 0; k < shots.length; k++) {
  const a = shots[k].t0, e = k + 1 < shots.length ? shots[k + 1].t0 : meta.duration; if (only && !only.includes(shots[k].name)) continue;
  const fr = where === 'mid' ? Math.round((a + e) / 2 * 30) : where === 'start' ? Math.round((a + 0.15) * 30) : where === 'end' ? Math.round((e - 0.25) * 30) : Math.round(+where * 30);
  const f = frames[Math.min(fr, frames.length - 1)]; const url = await p.evaluate(f => window.renderFrame(f, 0.85), f);
  const ln = words.lines.find(l => f.t >= l.start - 0.1 && f.t <= l.end + 0.15) || words.lines[words.lines.length - 1];
  items.push({ url, l1: `${shots[k].name}  t=${f.t.toFixed(1)}s`, l2: ln.text }); console.log('rendered', shots[k].name);
}
const out = await p.evaluate(it => window.sheet(it, 6, 300), items);
const file = path.join(root, 'out', process.argv[4] || 'contact_sheet.jpg'); fs.writeFileSync(file, Buffer.from(out.split(',')[1], 'base64')); console.log('wrote', file);
await b.close(); server.close();
