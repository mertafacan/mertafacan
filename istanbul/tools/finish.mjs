// Windows/any-OS finish step (same rules as finish.sh): refuses to encode if a frame is missing, never overwrites a video.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); process.chdir(root);
const meta = JSON.parse(fs.readFileSync('data/meta.json')); const FR = process.env.FRAMES || 'frames', from = +(process.env.FROM || 0), to = +(process.env.TO || meta.frames);
let missing = 0; for (let i = from; i < to; i++) { const f = path.join(FR, `f${String(i).padStart(6, '0')}.jpg`); if (!fs.existsSync(f) || fs.statSync(f).size < 3000) missing++; }
if (missing) { console.error(`REFUSING TO ENCODE: ${missing} of ${to - from} frames are missing in ${FR}/ (render stopped early?). Run the render again; it resumes.`); process.exit(2); }
fs.mkdirSync('out', { recursive: true }); const d = new Date(), p = (n) => String(n).padStart(2, '0'); const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
let out = `out/istanbul_${stamp}.mp4`, k = 1; while (fs.existsSync(out)) out = `out/istanbul_${stamp}_${k++}.mp4`;
const glow = "format=gbrp,split=2[a][b];[b]format=gray,lutyuv=y='clip((val-200)*5,0,255)',gblur=sigma=20,format=gbrp[g];[a][g]blend=all_mode=screen:all_opacity=0.28,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p";
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'warning', '-start_number', String(from), '-framerate', '30', '-i', `${FR}/f%06d.jpg`, '-ss', String(from / 30), '-t', String((to - from) / 30), '-i', 'audio/mix.m4a', '-filter_complex', `[0:v]${glow}[v]`, '-map', '[v]', '-map', '1:a', '-frames:v', String(to - from), '-c:v', 'libx264', '-preset', 'medium', '-crf', process.env.CRF || '18', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], { stdio: 'inherit' });
console.log('WROTE', out);
