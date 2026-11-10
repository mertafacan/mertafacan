import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
import { serve } from './server.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { server, port } = await serve(root);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('console', m => console.log('page:', m.text())); p.on('pageerror', e => console.log('ERR', e.message));
await p.goto(`http://127.0.0.1:${port}/render.html${process.argv[3] || ''}`); await p.waitForFunction('window.ready', null, { timeout: 120000 });
const tests = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); fs.mkdirSync(path.join(root, 'out/probe'), { recursive: true });
const names = [...new Set(Object.values(tests).flatMap(f => (f.cards || []).map(c => c.img)))]; await p.evaluate(n => window.preload(n), names);
for (const [name, f] of Object.entries(tests)) {
  const t0 = Date.now(); const u = await p.evaluate(f => window.renderFrame(f), f);
  fs.writeFileSync(path.join(root, 'out/probe', name + '.jpg'), Buffer.from(u.split(',')[1], 'base64')); console.log(name, Date.now() - t0, 'ms');
}
await b.close(); server.close();
