// scans every frame: is the camera inside a solid (furniture, wall, shelf)? flags glitches before the render.
import fs from 'node:fs'; import { buildTimeline } from '../timeline.js';
const words = JSON.parse(fs.readFileSync('data/words.json')), L = JSON.parse(fs.readFileSync('layout.json'));
const tl = buildTimeline(words, L);
const B = [ // [name, x0,x1, y0,y1, z0,z1]
 ['bench', -3.1, 1.5, 0, 1.12, -2.1, -1.0], ['shelf', 4.3, 5.2, 0, 3.4, -3.7, 3.2], ['cabinet', -5.2, -4.2, 0, 1.0, -1.6, 0.6], ['filing', -4.7, -3.7, 0, 1.4, -3.9, -3.1],
 ['table', 2.4, 4.0, 0, 0.9, 0.0, 1.7], ['crateA', 3.5, 4.4, 0, 1.1, 0.9, 1.8], ['crateB', 2.3, 2.95, 0, 0.6, -0.9, -0.2], ['stoolA', -4.4, -3.8, 0, 0.7, -3.0, -2.4], ['stoolB', 3.8, 4.4, 0, 0.7, 2.7, 3.3],
 ['globe', -4.6, -3.8, 0, 1.3, 2.3, 2.9], ['ladder', 3.9, 4.8, 0, 2.7, 2.2, 2.6], ['walls', -9, -4.7, 0, 4, -9, 9], ['wallR', 4.9, 9, 0, 4, -9, 9], ['wallB', -9, 9, 0, 4, -9, -3.75], ['wallF', -9, 9, 0, 4, 3.75, 9] ];
const bad = {};
for (let i = 0; i < tl.frames; i++) { const f = tl.frame(i); const cams = [[f.set, f.cam]]; if (f.mix) cams.push([f.mix.set, f.mix.cam]);
  for (const [set, c] of cams) { if (set !== 'lab') continue; const p = c.pos; for (const b of B) if (p[0] > b[1] && p[0] < b[2] && p[1] > b[3] && p[1] < b[4] && p[2] > b[5] && p[2] < b[6]) (bad[f.shot + ':' + b[0]] ||= []).push(i);
    if (p[1] < 0.25 || p[1] > 3.3) (bad[f.shot + ':height'] ||= []).push(i); } }
for (const k in bad) console.log(k, bad[k].length, 'frames', bad[k][0], '-', bad[k][bad[k].length - 1]);
if (!Object.keys(bad).length) console.log('camera path clear of solids');
