// Istanbul time-lapse timeline. frame(i) -> year, HUD state, camera, markers, animation progress. Events carry their own camera shots.
import fs from 'node:fs';
const geo = JSON.parse(fs.readFileSync(new URL('./data/dem_meta.json', import.meta.url)));
const EV = JSON.parse(fs.readFileSync(new URL('./events.json', import.meta.url)));
export const FPS = +(process.env.FPS || 30);
const [SX, SZ] = geo.size_km;
export const ll = (lat, lon) => [(lon - geo.lon0) / (geo.lon1 - geo.lon0) * SX - SX / 2, (geo.lat1 - lat) / (geo.lat1 - geo.lat0) * SZ - SZ / 2];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x)), lerp = (a, b, u) => a + (b - a) * u;
const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); }, easeIO = (u) => { u = clamp(u, 0, 1); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const interp = (tab, x, log = false) => { for (let i = 0; i < tab.length - 1; i++) if (x <= tab[i + 1][0]) { const u = (x - tab[i][0]) / (tab[i + 1][0] - tab[i][0]); return log ? Math.exp(lerp(Math.log(tab[i][1]), Math.log(tab[i + 1][1]), u)) : lerp(tab[i][1], tab[i + 1][1], u); } return tab[tab.length - 1][1]; };
const OVER_D = [[-700, 5.5], [330, 8], [1000, 10], [1453, 12], [1800, 15], [1900, 19], [1950, 26], [2000, 37], [2025, 44]];
const poseOf = (e, u = 0.5) => { const [x, z] = ll(e.lat, e.lon); return { tx: x, tz: z, d: e.d * lerp(1.08, 0.92, u), pitch: e.pitch + lerp(-2, 3, u), az: e.az + (u - 0.5) * 30, ty: 0.03, fov: 40 }; };
const overview = (year, t) => { const [x, z] = ll(41.03, 28.99); const d = interp(OVER_D, year); return { tx: x + (year > 1950 ? 2 : 0), tz: z, d, pitch: 50, az: 200 + 16 * Math.sin(t * 0.035), ty: 0.0, fov: 40 }; };
const mixPose = (a, b, u, hop = 1) => { const e = ease(u); const p = { tx: lerp(a.tx, b.tx, e), tz: lerp(a.tz, b.tz, e), ty: lerp(a.ty, b.ty, e), d: Math.exp(lerp(Math.log(a.d), Math.log(b.d), e)) * (1 + hop * 0.18 * Math.sin(Math.PI * e) * Math.min(1, Math.hypot(a.tx - b.tx, a.tz - b.tz) / 8)), pitch: lerp(a.pitch, b.pitch, e), az: lerp(a.az, b.az, e), fov: 40 }; return p; };
// ---- schedule: [timelapse gap] -> zoom in -> hold ; the camera leaves the previous event during the gap
const IN = 3.6, INTRO = 7, OUTRO = 5;
const segs = []; let t = INTRO; let prev = null;
EV.events.forEach((e, k) => {
  const dy = prev ? Math.abs(e.year - prev.year) : 0; const direct = prev && dy < 1;
  const gap = prev ? (direct ? 4.0 : clamp(2.6 + 1.7 * Math.log10(1 + dy), 3.4, 8.5)) : 0;
  segs.push({ e, k, gapStart: t, holdStart: t + gap + IN, holdEnd: t + gap + IN + e.hold, gap, direct, prevE: prev }); t = t + gap + IN + e.hold; prev = e;
});
export const DURATION = Math.ceil((t + OUTRO) * FPS) / FPS; export const NF = Math.round(DURATION * FPS);
const yearAt = (tt) => { // piecewise: constant during holds, eased between
  let y = EV.start;
  if (tt < INTRO) return EV.start + (segs[0].e.year - EV.start) * 0.0 + ease(tt / INTRO) * 0;
  for (const s of segs) { if (tt < s.gapStart) break; const a = s.prevE ? s.prevE.year : EV.start, b = s.e.year; if (tt < s.holdStart) { const u = (tt - s.gapStart) / (s.holdStart - s.gapStart); return lerp(a, b, easeIO(u)); } y = b; if (tt <= s.holdEnd) return b; }
  return y;
};
const fmtYear = (y) => { const v = Math.round(y); return v < 0 ? `MÖ ${-v}` : v < 1000 ? `MS ${v}` : `${v}`; };
const empireAt = (y) => { let r = EV.empires[0]; for (const x of EV.empires) if (x[0] <= y) r = x; return r; };
export function frame(i) {
  const tt = i / FPS, year = yearAt(tt); const emp = empireAt(year);
  let seg = null; for (const s of segs) if (tt >= s.gapStart) seg = s;
  let cam, card = null, marker = null, anim = null, rulerA = 0, date = '', ev = null, hold = false, props = {};
  const pop = Math.round(interp(EV.population, year, true));
  if (!seg || tt < segs[0].gapStart) { cam = overview(year, tt); }
  else {
    const e = seg.e; ev = e;
    if (tt < seg.holdStart) {
      const u = (tt - seg.gapStart) / (seg.holdStart - seg.gapStart);
      const pPrev = seg.prevE ? poseOf(seg.prevE, 1) : null, pNext = poseOf(e, 0);
      if (seg.direct) cam = mixPose(pPrev, pNext, u);
      else { const leave = clamp(2.2 / seg.gap, 0.15, 0.6), outEnd = leave; if (pPrev && u < outEnd) cam = mixPose(pPrev, overview(year, tt), u / outEnd, 0.4); else { const a = overview(year, tt); const uu = ease((tt - (seg.holdStart - IN)) / IN); cam = tt < seg.holdStart - IN ? a : mixPose(a, pNext, uu); } }
      date = ''; ruler: rulerA = 0;
    } else {
      hold = true; const u = (tt - seg.holdStart) / (seg.holdEnd - seg.holdStart); cam = poseOf(e, u);
      if (e.wide) cam = { ...overview(year, tt), d: lerp(overview(year, tt).d * 0.55, overview(year, tt).d * 0.7, u), pitch: 48, az: 200 + u * 40 };
      const fi = ease((tt - seg.holdStart) / 1.2), fo = 1 - ease((tt - (seg.holdEnd - 1.0)) / 1.0); const a = Math.min(fi, fo);
      card = { title: e.title, desc: e.desc, inset: e.inset, cap: e.inset_cap, a }; rulerA = a; date = e.date;
      const [mx, mz] = ll(e.lat, e.lon); marker = { x: mx, z: mz, a: a, u };
      anim = { key: e.anim, u, x: mx, z: mz, t: tt - seg.holdStart, id: e.id }; props = { chain: !!e.chain || e.id === 'fetih' };
      if (e.id === 'hacli' || e.id === 'gemiler') props.chain = true;
    }
  }
  const [mapx, mapz] = [cam.tx, cam.tz];
  const rad = (x) => x * Math.PI / 180, cp = Math.cos(rad(cam.pitch)), sp = Math.sin(rad(cam.pitch));
  const pos = [cam.tx + cam.d * Math.sin(rad(cam.az)) * cp, cam.ty + cam.d * sp, cam.tz + cam.d * Math.cos(rad(cam.az)) * cp];
  const intro = tt < INTRO ? Math.min(1, ease(tt / 1.0)) * (1 - ease((tt - (INTRO - 1.4)) / 1.4)) : 0;
  const fade = clamp(tt / 1.2, 0, 1) * clamp((DURATION - tt) / 1.6, 0, 1);
  const f = { i, t: +tt.toFixed(3), year: +year.toFixed(2), yl: fmtYear(year), date, city: emp[3], empire: emp[2], flag: emp[1], ruler: ev && hold ? ev.ruler : '', rulerA: +rulerA.toFixed(3), pop, card, marker, anim, props, intro: +intro.toFixed(3), fade: +fade.toFixed(3),
    cam: { pos: pos.map(v => +v.toFixed(4)), look: [cam.tx, cam.ty, cam.tz].map(v => +v.toFixed(4)), fov: 40, d: +cam.d.toFixed(3) }, map: { x: +mapx.toFixed(3), z: +mapz.toFixed(3), d: +cam.d.toFixed(2), az: +cam.az.toFixed(1) } };
  return f;
}
export const sfxCues = () => { const c = []; segs.forEach(s => { c.push({ t: s.holdStart - IN, name: 'whoosh', vol: 0.6 }); if (s.e.sfx) c.push({ t: s.holdStart + 0.1, name: s.e.sfx === 'steps' ? 'impact' : s.e.sfx, vol: 0.8 }); }); return c; };
export const schedule = () => segs.map(s => ({ id: s.e.id, year: s.e.year, title: s.e.title, tIn: +s.holdStart.toFixed(1) - IN, tHold: +s.holdStart.toFixed(1), tEnd: +s.holdEnd.toFixed(1) }));
if (process.argv[1] && process.argv[1].endsWith('timeline.mjs')) {
  fs.mkdirSync(new URL('./data/', import.meta.url), { recursive: true });
  const frames = []; for (let i = 0; i < NF; i++) frames.push(frame(i));
  fs.writeFileSync(new URL('./data/frames.json', import.meta.url), JSON.stringify(frames));
  fs.writeFileSync(new URL('./data/meta.json', import.meta.url), JSON.stringify({ fps: FPS, duration: DURATION, frames: NF, schedule: schedule() }, null, 1));
  fs.writeFileSync(new URL('./data/sfx.json', import.meta.url), JSON.stringify(sfxCues(), null, 1));
  console.log('frames', NF, 'duration', DURATION.toFixed(1), 's =', (DURATION / 60).toFixed(1), 'min'); schedule().forEach(s => console.log(String(s.tHold).padStart(6), s.year, s.title));
}
