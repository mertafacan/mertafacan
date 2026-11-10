// Surfaces drawn on a canvas, used as textures in the Blender sets (signs, boards, brick, planks, plaques).
// Every word the story needs inside the world lives here, never as a floating title.
const INK = '#2a1a2e';
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function fitText(ctx, text, maxW, size, font) { let s = size; do { ctx.font = `${s}px ${font}`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 10); }

export function brick(base = '#b4513a', seed = 1) {
  const [c, x] = mk(512, 512), r = rnd(seed); x.fillStyle = '#6e3a2e'; x.fillRect(0, 0, 512, 512);
  const bh = 32, bw = 80;
  for (let row = 0; row < 16; row++) for (let col = -1; col < 7; col++) {
    const ox = (row % 2) * bw / 2, v = (r() - 0.5) * 30;
    const col0 = base.match(/\w\w/g).map(h => parseInt(h, 16));
    x.fillStyle = `rgb(${col0[0] + v | 0},${col0[1] + v * 0.7 | 0},${col0[2] + v * 0.6 | 0})`;
    rr(x, col * bw + ox + 3, row * bh + 3, bw - 6, bh - 6, 6); x.fill();
    x.fillStyle = 'rgba(255,230,200,.16)'; x.fillRect(col * bw + ox + 8, row * bh + 6, bw - 16, 5);
  }
  return c;
}
export function plaster(base = '#f1e0bd', seed = 2) {
  const [c, x] = mk(512, 512), r = rnd(seed); x.fillStyle = base.startsWith('#') ? base : '#' + base; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(${r() > 0.5 ? '255,250,230' : '190,150,100'},${0.05 + r() * 0.07})`; x.beginPath(); x.ellipse(r() * 512, r() * 512, 30 + r() * 80, 20 + r() * 50, r() * 3, 0, 7); x.fill(); }
  return c;
}
export function planks(base = '#b87a3e', seed = 3, vertical = false) {
  const [c, x] = mk(512, 512), r = rnd(seed); x.fillStyle = '#5a3418'; x.fillRect(0, 0, 512, 512);
  const n = 8, w = 512 / n;
  for (let i = 0; i < n; i++) {
    const v = (r() - 0.5) * 36, b = base.match(/\w\w/g).map(h => parseInt(h, 16));
    x.fillStyle = `rgb(${b[0] + v | 0},${b[1] + v * 0.8 | 0},${b[2] + v * 0.6 | 0})`; x.fillRect(i * w + 3, 0, w - 6, 512);
    x.strokeStyle = 'rgba(70,35,12,.35)'; x.lineWidth = 2;
    for (let k = 0; k < 7; k++) { x.beginPath(); const px = i * w + 8 + r() * (w - 16); x.moveTo(px, 0); x.bezierCurveTo(px + 6, 170, px - 6, 340, px + 2, 512); x.stroke(); }
    const jy = r() * 512; x.fillStyle = 'rgba(70,35,12,.5)'; x.fillRect(i * w + 3, jy, w - 6, 4);
  }
  if (vertical) { const [c2, x2] = mk(512, 512); x2.translate(256, 256); x2.rotate(Math.PI / 2); x2.drawImage(c, -256, -256); return c2; }
  return c;
}
export function cobble(seed = 4) {
  const [c, x] = mk(512, 512), r = rnd(seed); x.fillStyle = '#6d6a76'; x.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 10; row++) for (let col = 0; col < 9; col++) {
    const ox = (row % 2) * 28, v = (r() - 0.5) * 34;
    x.fillStyle = `rgb(${150 + v | 0},${146 + v | 0},${158 + v | 0})`; x.beginPath(); x.ellipse(col * 57 + ox + 28, row * 52 + 26, 25, 22, 0, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,255,255,.14)'; x.beginPath(); x.ellipse(col * 57 + ox + 22, row * 52 + 19, 12, 7, 0, 0, 7); x.fill();
  }
  return c;
}
export function tiles(a = '#e9dcc0', b = '#8a6f52') {
  const [c, x] = mk(512, 512); for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? a : b; x.fillRect(i * 64, j * 64, 64, 64); }
  return c;
}
export function rug() {
  const [c, x] = mk(512, 512); x.fillStyle = '#7a2f4a'; x.fillRect(0, 0, 512, 512);
  x.strokeStyle = '#e8b64a'; x.lineWidth = 14; x.strokeRect(28, 28, 456, 456); x.lineWidth = 6; x.strokeStyle = '#f3e0b0'; x.strokeRect(60, 60, 392, 392);
  x.fillStyle = '#2b6f86'; x.beginPath(); x.moveTo(256, 110); x.lineTo(400, 256); x.lineTo(256, 402); x.lineTo(112, 256); x.closePath(); x.fill();
  x.fillStyle = '#e8b64a'; x.beginPath(); x.arc(256, 256, 40, 0, 7); x.fill();
  return c;
}
export function chalkboard() {
  const [c, x] = mk(1024, 640); x.fillStyle = '#7a4a22'; x.fillRect(0, 0, 1024, 640);
  x.fillStyle = '#2a4a45'; rr(x, 24, 24, 976, 592, 14); x.fill();
  const g = x.createLinearGradient(0, 0, 0, 640); g.addColorStop(0, 'rgba(255,255,255,.07)'); g.addColorStop(1, 'rgba(0,0,0,.12)'); x.fillStyle = g; x.fillRect(24, 24, 976, 592);
  x.fillStyle = '#f4efe0'; x.strokeStyle = '#f4efe0'; x.lineCap = 'round';
  x.font = '88px "PatrickHand"'; x.fillText('AQUA REGIA', 70, 140);
  x.font = '66px "PatrickHand"'; x.fillText('3 HCl  :  1 HNO3', 70, 240);
  x.font = '60px "PatrickHand"'; x.fillText('Au  +  acid  →  HAuCl4', 70, 340);
  x.lineWidth = 6; x.beginPath(); x.moveTo(70, 160); x.lineTo(560, 160); x.stroke();
  // flask doodle
  x.lineWidth = 7; x.beginPath(); x.moveTo(780, 280); x.lineTo(780, 380); x.arc(780, 450, 70, -Math.PI / 2 - 0.5, Math.PI * 1.5 + 0.5, false); x.stroke();
  x.fillStyle = 'rgba(255,170,60,.85)'; x.beginPath(); x.arc(780, 460, 56, 0.1, Math.PI - 0.1); x.fill();
  x.fillStyle = '#f4efe0'; x.font = '54px "PatrickHand"'; x.fillText('gold  = ☆', 70, 440); x.fillText('safe!?', 70, 530);
  x.strokeStyle = 'rgba(255,255,255,.4)'; x.lineWidth = 3; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(600 + i * 10, 80 + i * 3); x.lineTo(900 - i * 6, 90 + i * 3); x.stroke(); }
  return c;
}
export function plaque(text, bg = '#d9a73c', fg = '#3a230c', w = 1024, h = 256, font = 'FredokaBold') {
  const [c, x] = mk(w, h); x.fillStyle = INK; rr(x, 0, 0, w, h, 34); x.fill(); x.fillStyle = bg; rr(x, 12, 12, w - 24, h - 24, 26); x.fill();
  x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 6; rr(x, 30, 30, w - 60, h - 60, 18); x.stroke();
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  const lines = text.split('\n'); const maxW = w - 110, sz = Math.min(130, (h - 80) / lines.length);
  lines.forEach((ln, i) => { fitText(x, ln, maxW, sz, font); x.fillText(ln, w / 2, h / 2 + (i - (lines.length - 1) / 2) * sz * 1.05); });
  return c;
}
export function streetSign(text = 'KØBENHAVN', sub = '9 APRIL 1940') {
  const [c, x] = mk(1024, 512); x.fillStyle = INK; rr(x, 0, 0, 1024, 512, 50); x.fill();
  x.fillStyle = '#1f5fa8'; rr(x, 16, 16, 992, 480, 40); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 10; rr(x, 40, 40, 944, 432, 28); x.stroke();
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; fitText(x, text, 860, 170, 'FredokaBold'); x.fillText(text, 512, 190);
  fitText(x, sub, 860, 120, 'FredokaBold'); x.fillStyle = '#ffd166'; x.fillText(sub, 512, 350);
  return c;
}
export function banner(text, bg = '#a23b3b', fg = '#fff3d6') { return plaque(text, bg, fg, 1024, 256); }
export function label(text, bg = '#f6edd2', fg = '#2a1a2e') {
  const [c, x] = mk(256, 256); x.fillStyle = bg; x.fillRect(0, 0, 256, 256); x.strokeStyle = fg; x.lineWidth = 10; x.strokeRect(14, 14, 228, 228);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; const lines = text.split('\n');
  lines.forEach((ln, i) => { fitText(x, ln, 190, lines.length > 1 ? 84 : 110, 'FredokaBold'); x.fillText(ln, 128, 128 + (i - (lines.length - 1) / 2) * 90); });
  return c;
}
export function calendar(year, month, num) {
  const [c, x] = mk(512, 640); x.fillStyle = INK; rr(x, 0, 0, 512, 640, 30); x.fill(); x.fillStyle = '#fbf3df'; rr(x, 12, 12, 488, 616, 22); x.fill();
  x.fillStyle = '#c9402f'; rr(x, 12, 12, 488, 170, 22); x.fill(); x.fillRect(12, 120, 488, 62);
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; fitText(x, month, 420, 100, 'FredokaBold'); x.fillText(month, 256, 90);
  x.fillStyle = INK; fitText(x, String(year), 400, 210, 'FredokaBold'); x.fillText(String(year), 256, 340);
  x.font = '60px FredokaBold'; x.fillText(num, 256, 520);
  return c;
}
export function sky(top = '#2f7fd8', mid = '#7cc4f2', hor = '#fdeccf') {
  const [c, x] = mk(16, 512); const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, top); g.addColorStop(0.55, mid); g.addColorStop(0.85, hor); g.addColorStop(1, hor);
  x.fillStyle = g; x.fillRect(0, 0, 16, 512); return c;
}
export function cloud() {
  const [c, x] = mk(512, 256); x.fillStyle = '#fff';
  for (const [cx, cy, r] of [[130, 160, 70], [220, 120, 90], [320, 150, 80], [400, 170, 56], [250, 180, 80]]) { x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }
  x.fillStyle = 'rgba(160,190,230,.35)'; x.beginPath(); x.ellipse(256, 212, 180, 26, 0, 0, 7); x.fill();
  return c;
}
export function window_view(dusk = true) {
  const [c, x] = mk(512, 640); const g = x.createLinearGradient(0, 0, 0, 640);
  if (dusk) { g.addColorStop(0, '#2c3a8a'); g.addColorStop(0.6, '#6a86d8'); g.addColorStop(1, '#f2b27c'); } else { g.addColorStop(0, '#4a97e6'); g.addColorStop(0.6, '#9ad3f6'); g.addColorStop(1, '#ffe9bf'); }
  x.fillStyle = g; x.fillRect(0, 0, 512, 640);
  const r = rnd(9); x.fillStyle = dusk ? '#232a58' : '#e9b78a'; for (let i = 0; i < 6; i++) { const w = 70 + r() * 60, h = 120 + r() * 160; x.fillRect(i * 90 - 10, 640 - h, w, h); }
  if (dusk) { x.fillStyle = '#ffe9a6'; for (let i = 0; i < 40; i++) { x.fillRect(r() * 512, 420 + r() * 200, 8, 10); } }
  else { x.fillStyle = '#fff'; x.beginPath(); x.arc(380, 150, 46, 0, 7); x.fill(); }
  return c;
}
export function poster(kind) {
  const [c, x] = mk(512, 640); x.fillStyle = '#f4e6c4'; x.fillRect(0, 0, 512, 640); x.strokeStyle = INK; x.lineWidth = 10; x.strokeRect(10, 10, 492, 620);
  x.fillStyle = INK; x.textAlign = 'center';
  if (kind === 'elements') { x.font = '60px FredokaBold'; x.fillText('ELEMENTS', 256, 90); const cols = ['#e86a4a', '#f2b84a', '#5fb6a8', '#6a8ad8', '#a36ad8'];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 8; j++) { x.fillStyle = cols[(i * 3 + j) % 5]; x.fillRect(40 + j * 54, 130 + i * 78, 48, 68); x.fillStyle = INK; x.font = '26px FredokaBold'; x.fillText(['H', 'He', 'Li', 'C', 'N', 'O', 'Na', 'Fe', 'Cu', 'Ag', 'Au', 'Hg', 'Pb', 'U'][(i * 8 + j) % 14], 64 + j * 54, 175 + i * 78); } }
  else { x.font = '56px FredokaBold'; x.fillText('SAFETY', 256, 100); x.fillText('FIRST', 256, 170); x.fillStyle = '#e86a4a'; x.beginPath(); x.moveTo(256, 230); x.lineTo(420, 520); x.lineTo(92, 520); x.closePath(); x.fill(); x.lineWidth = 10; x.stroke(); x.fillStyle = INK; x.font = '190px FredokaBold'; x.fillText('!', 256, 485); }
  return c;
}
export function clockface() {
  const [c, x] = mk(256, 256); x.fillStyle = '#6f4322'; x.fillRect(0, 0, 256, 256); x.fillStyle = INK; x.beginPath(); x.arc(128, 128, 126, 0, 7); x.fill(); x.fillStyle = '#fbf3df'; x.beginPath(); x.arc(128, 128, 112, 0, 7); x.fill();
  x.strokeStyle = INK; x.lineWidth = 8; x.lineCap = 'round'; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; x.beginPath(); x.moveTo(128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92); x.lineTo(128 + Math.sin(a) * 104, 128 - Math.cos(a) * 104); x.stroke(); }
  x.lineWidth = 12; x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + 50, 128 - 20); x.stroke(); x.lineWidth = 8; x.beginPath(); x.moveTo(128, 128); x.lineTo(128 - 12, 128 - 80); x.stroke();
  return c;
}
export function velvet() { const [c, x] = mk(128, 128); x.fillStyle = '#7b1f3f'; x.fillRect(0, 0, 128, 128); x.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 128; i += 8) x.fillRect(0, i, 128, 3); return c; }
export function canvasTarp() { const [c, x] = mk(256, 256); x.fillStyle = '#8a8a62'; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(60,60,30,.4)'; x.lineWidth = 3; for (let i = 0; i < 256; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); } return c; }
export function stripes(a = '#d94f3d', b = '#fbf3df') { const [c, x] = mk(256, 256); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? a : b; x.fillRect(i * 32, 0, 32, 256); } return c; }
export function glow() { const [c, x] = mk(256, 256); const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); return c; }

// the full set the Blender scene asks for (name -> canvas)
export function allTextures() {
  const T = {};
  T.brick_red = brick('b4513a', 1); T.brick_ochre = brick('c98a3d', 5); T.plaster_cream = plaster('f1e0bd', 2); T.plaster_rose = plaster('e9a9a0', 6);
  T.plaster_teal = plaster('7fc1b8', 7); T.plaster_ochre = plaster('f0c36a', 8); T.plaster_sky = plaster('9fbde8', 10);
  T.planks_floor = planks('a8774d', 3); T.planks_dark = planks('6a4528', 4); T.planks_light = planks('c99a6e', 12);
  T.cobble = cobble(); T.tiles = tiles(); T.rug = rug(); T.velvet = velvet(); T.tarp = canvasTarp(); T.stripes = stripes();
  T.chalkboard = chalkboard();
  T.plaque_institute = plaque('INSTITUTE FOR\nTHEORETICAL PHYSICS', '#e0b24a', '#3a230c', 1024, 384);
  T.plaque_lab = plaque('LABORATORY', '#d9a73c', '#3a230c', 768, 192);
  T.plaque_nobel = plaque('NOBEL PRIZE\nGOLD', '#f6d56a', '#5a3a08', 768, 256);
  T.plaque_copenhagen = plaque('COPENHAGEN', '#2f7a8a', '#fff3d6', 1024, 192);
  T.sign_street = streetSign('KØBENHAVN', '9 APRIL 1940');
  T.banner_open = banner('NO ENTRY', '#a23b3b');
  T.sign_bakery = plaque('BAKERY', '#e48a3a', '#fff3d6', 768, 192); T.sign_books = plaque('BOOKS', '#3e6fa8', '#fff3d6', 768, 192); T.sign_cafe = plaque('CAFE', '#5a8a4a', '#fff3d6', 768, 192);
  T.sign_junk = plaque('JUNK', '#c9a36a', '#3a230c', 512, 160);
  T.label_gold = label('HAuCl4', '#fff1b8'); T.label_acid = label('AQUA\nREGIA', '#ffd7c7');
  ['NaCl', 'H2O', 'KOH', 'CuSO4', 'Fe', 'HCl', 'Zn', 'Hg', 'Pb', 'Na'].forEach((t, i) => { T['label_' + i] = label(t, ['#f6edd2', '#e3f1ee', '#f6dcc3', '#dfe6f6'][i % 4]); });
  T.cal_1940 = calendar(1940, 'APRIL', '9'); T.cal_1945 = calendar(1945, 'MAY', '5');
  T.sky_day = sky(); T.sky_dusk = sky('#2a3a8a', '#7a8fd8', '#f3b784'); T.cloud = cloud();
  T.window_dusk = window_view(true); T.window_day = window_view(false);
  T.poster_elements = poster('elements'); T.poster_safety = poster('safety'); T.clock = clockface(); T.blob = glow();
  return T;
}
