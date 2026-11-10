// Exports every sign/surface texture (PNG) and every character pose/expression card (transparent WebP).
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
import { serve } from './server.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = path.join(root, 'data'); fs.mkdirSync(path.join(data, 'textures'), { recursive: true }); fs.mkdirSync(path.join(data, 'cards'), { recursive: true });
const { server, port } = await serve(root);
const b = await chromium.launch(); const p = await b.newPage();
p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('page:', m.text()); });
await p.goto(`http://127.0.0.1:${port}/assets.html`); await p.waitForFunction('window.ready', null, { timeout: 60000 });
const save = (f, url) => fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
const T = await p.evaluate(() => window.textures()); for (const k in T) save(path.join(data, 'textures', k + '.png'), T[k]);
console.log('textures', Object.keys(T).length);
const { CAST, POSES, EXPRS } = await import(path.join(root, 'chars.js'));
let n = 0;
for (const id of Object.keys(CAST)) for (const pose of POSES) for (const expr of EXPRS) for (const blink of [0, 1]) {
  const u = await p.evaluate(([a, b2, c, d]) => window.card(a, b2, c, d), [id, pose, expr, !!blink]);
  save(path.join(data, 'cards', `${id}_${pose}_${expr}${blink ? '_b' : ''}.webp`), u); n++;
}
console.log('cards', n);
if (process.argv.includes('--timeline')) {
  const tl = await p.evaluate(() => window.makeTimeline());
  fs.writeFileSync(path.join(data, 'frames.json'), JSON.stringify(tl.frames)); fs.writeFileSync(path.join(data, 'meta.json'), JSON.stringify(tl.meta, null, 1));
  fs.writeFileSync(path.join(data, 'sfx.json'), JSON.stringify(tl.sfx, null, 1)); fs.writeFileSync(path.join(data, 'issues.json'), JSON.stringify(tl.issues));
  console.log('frames', tl.frames.length, 'issues', tl.issues.length); tl.meta.shots.forEach(s => console.log(' ', s.t0.toFixed(2), s.name));
}
await b.close(); server.close();
