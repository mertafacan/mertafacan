// Resumable frame renderer.  node tools/render.mjs [--w 1920 --h 1080 --workers 3 --out frames --from 0 --to N --step 1 --gpu]
// Uses the machine's GPU when --gpu is given (recommended for the final render); otherwise software WebGL.
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url); const { chromium } = require('playwright'); import { serve } from './server.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; }; const flag = (k) => process.argv.includes('--' + k);
const W = +arg('w', 1920), H = +arg('h', 1080), workers = +arg('workers', 3), outDir = path.resolve(root, arg('out', 'frames')); fs.mkdirSync(outDir, { recursive: true });
const frames = JSON.parse(fs.readFileSync(path.join(root, 'data/frames.json'))); const from = +arg('from', 0), to = Math.min(+arg('to', frames.length), frames.length), step = +arg('step', 1);
const name = (i) => path.join(outDir, `f${String(i).padStart(6, '0')}.jpg`);
const LIST = arg('list', ''); const todo = []; if (LIST) LIST.split(',').forEach(v => { const i = +v; if (!fs.existsSync(name(i))) todo.push(i); }); else for (let i = from; i < to; i += step) if (!fs.existsSync(name(i)) || fs.statSync(name(i)).size < 3000) todo.push(i);
console.log(`frames ${frames.length}, to render ${todo.length}, ${W}x${H}, workers ${workers}, ${flag('gpu') ? 'GPU' : 'software WebGL'}`);
const { server, port } = await serve(root); let done = 0; const t0 = Date.now(); const queue = todo.slice();
const angle = arg('angle', 'default'); const args = flag('gpu') ? ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-webgl', `--use-angle=${angle}`] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
async function worker() {
  const b = await chromium.launch({ args, ...(flag('chrome') ? { channel: 'chrome' } : {}) }); const p = await b.newPage({ viewport: { width: W, height: H } }); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(`http://127.0.0.1:${port}/render.html?w=${W}&h=${H}`); await p.waitForFunction('window.ready', null, { timeout: 300000 }); if (!worker.logged) { worker.logged = true; console.log('WebGL renderer:', await p.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; })); }
  while (queue.length) { const i = queue.shift(); try { await p.evaluate(f => window.renderFrame(f), frames[i]); const buf = await p.screenshot({ type: 'jpeg', quality: 92 }); fs.writeFileSync(name(i) + '.tmp', buf); fs.renameSync(name(i) + '.tmp', name(i)); } catch (e) { console.log('frame', i, 'failed', e.message); queue.push(i); await new Promise(r => setTimeout(r, 1500)); }
    if (++done % 25 === 0) { const el = (Date.now() - t0) / 1000; console.log(`done ${done}/${todo.length} ${(done / el).toFixed(2)} fps eta ${((todo.length - done) / (done / el) / 60).toFixed(1)} min`); } }
  await b.close();
}
await Promise.all(Array.from({ length: workers }, worker)); server.close();
const missing = []; if (LIST) LIST.split(',').forEach(v => { if (!fs.existsSync(name(+v))) missing.push(+v); }); else for (let i = from; i < to; i += step) if (!fs.existsSync(name(i))) missing.push(i);
console.log(missing.length ? `MISSING ${missing.length} frames` : 'ALL FRAMES RENDERED'); process.exit(missing.length ? 1 : 0);
