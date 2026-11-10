// Original cast, drawn in code on an HTML canvas. One image per pose + expression (+ blink).
// Figure: big round white head, thick dark brush outline, big eyes/brows, small nose,
// changing mouth, thin stick legs, chunky flat-colour clothes, one signature prop each.
export const W = 640, H = 1100, FEET_Y = 1055, PX_PER_M = 1000 / 1.9; // figure ~1.9 m tall
export const INK = '#2a1a2e';
export const POSES = ['idle', 'point', 'hold', 'hips', 'up'];
export const EXPRS = ['smug', 'grin', 'shock', 'laughing', 'worried', 'sweat'];

export const CAST = {
  george: { name: 'George', role: 'the chemist', skin: '#fffaf0',
    coat: '#1f8a9a', coatDark: '#176a77', shirt: '#fff2d6', tie: '#7a3fa8', pants: '#35306b', shoes: '#2a1a2e',
    hair: 'tuft', hairColor: '#b9b4c4', glasses: true, mustache: null, hat: null, cigar: false,
    holdProp: 'flask', build: 1.0 },
  friend: { name: 'Friend', role: 'the mocker', skin: '#fffaf0',
    coat: '#26418a', coatDark: '#1b3068', shirt: '#f4d36b', tie: '#d64a2f', pants: '#5a3a2a', shoes: '#2a1a2e',
    hair: 'bald', hairColor: '#2a1a2e', glasses: false, mustache: 'big', hat: null, cigar: true,
    holdProp: 'notebook', build: 1.18 },
  soldierA: { name: 'Soldier A', role: 'the searcher', skin: '#fffaf0',
    coat: '#66745a', coatDark: '#4d5944', shirt: '#cfc7a8', tie: null, pants: '#4a4f40', shoes: '#241a1a',
    hair: 'none', hairColor: '#2a1a2e', glasses: false, mustache: 'small', hat: 'helmet', cigar: false,
    holdProp: 'flashlight', build: 1.1 },
  soldierB: { name: 'Soldier B', role: 'the clipboard', skin: '#fffaf0',
    coat: '#5b6a62', coatDark: '#44514b', shirt: '#cfc7a8', tie: null, pants: '#43483f', shoes: '#241a1a',
    hair: 'none', hairColor: '#2a1a2e', glasses: false, mustache: null, hat: 'cap', cigar: false,
    holdProp: 'clipboard', build: 0.92 },
};

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function blobPath(ctx, cx, cy, rx, ry, seed, jit = 1.6) {
  const r = rng(seed), n = 36, pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, j = 1 + (r() - 0.5) * jit / 100 * 6;
    pts.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]);
  }
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const p0 = pts[i], p1 = pts[(i + 1) % n], mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
    if (i === 0) ctx.moveTo(mx, my); else ctx.quadraticCurveTo(p0[0], p0[1], mx, my);
  }
  const p0 = pts[0], p1 = pts[1];
  ctx.quadraticCurveTo(p0[0], p0[1], (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);
  ctx.closePath();
}

function fillStroke(ctx, fill, lw = 10) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function tube(ctx, pts, lw, color) { // thick limb with ink outline
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.strokeStyle = INK; ctx.lineWidth = lw + 20; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke();
}

const ARMS = { // [shoulder, elbow, hand] for left (viewer left) and right
  idle:  { L: [[205, 445], [165, 560], [172, 665]], R: [[435, 445], [475, 560], [468, 665]] },
  point: { L: [[205, 445], [165, 560], [172, 665]], R: [[435, 445], [510, 470], [580, 428]] },
  hold:  { L: [[205, 445], [165, 560], [172, 665]], R: [[435, 445], [520, 520], [505, 400]] },
  hips:  { L: [[205, 445], [118, 540], [200, 640]], R: [[435, 445], [522, 540], [440, 640]] },
  up:    { L: [[205, 445], [95, 345], [105, 190]], R: [[435, 445], [545, 345], [535, 190]] },
};

function drawProp(ctx, kind, x, y) {
  ctx.save(); ctx.translate(x, y);
  if (kind === 'flask') { // round flask with teal liquid
    ctx.beginPath(); ctx.rect(-12, -92, 24, 40); fillStroke(ctx, '#e9f6f6', 7);
    blobPath(ctx, 0, -28, 46, 46, 3, 0.6); fillStroke(ctx, '#dff3f5', 8);
    ctx.save(); blobPath(ctx, 0, -28, 46, 46, 3, 0.6); ctx.clip(); ctx.fillStyle = '#33c0b5'; ctx.fillRect(-50, -30, 100, 70); ctx.restore();
    blobPath(ctx, 0, -28, 46, 46, 3, 0.6); ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-18, -42, 7, 0, 7); ctx.fill();
  } else if (kind === 'notebook') {
    ctx.rotate(-0.15); rrect(ctx, -34, -78, 68, 90, 8); fillStroke(ctx, '#e2573d', 8);
    ctx.fillStyle = '#fff4dc'; ctx.fillRect(-26, -66, 8, 66);
  } else if (kind === 'flashlight') {
    ctx.rotate(-0.35); rrect(ctx, -16, -100, 32, 90, 10); fillStroke(ctx, '#3b3f48', 8);
    rrect(ctx, -26, -126, 52, 34, 8); fillStroke(ctx, '#6a707c', 8);
    ctx.beginPath(); ctx.ellipse(0, -128, 22, 8, 0, 0, 7); fillStroke(ctx, '#ffe58a', 6);
  } else if (kind === 'clipboard') {
    ctx.rotate(0.1); rrect(ctx, -40, -120, 80, 112, 8); fillStroke(ctx, '#9a6a3c', 8);
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(-30, -102, 60, 86);
    ctx.strokeStyle = '#8a8fa0'; ctx.lineWidth = 4; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-22, -90 + i * 16); ctx.lineTo(22, -90 + i * 16); ctx.stroke(); }
    rrect(ctx, -16, -128, 32, 16, 4); fillStroke(ctx, '#c9ccd4', 6);
  } else if (kind === 'medal') {
    ctx.beginPath(); ctx.moveTo(-18, -86); ctx.lineTo(0, -40); ctx.lineTo(18, -86); ctx.closePath(); fillStroke(ctx, '#d64a2f', 6);
    ctx.beginPath(); ctx.arc(0, -28, 40, 0, 7); fillStroke(ctx, '#f6c542', 8);
    ctx.beginPath(); ctx.arc(0, -28, 26, 0, 7); ctx.lineWidth = 5; ctx.strokeStyle = '#c28a14'; ctx.stroke();
  }
  ctx.restore();
}

function hand(ctx, p, skin) { ctx.beginPath(); ctx.arc(p[0], p[1], 27, 0, 7); fillStroke(ctx, skin, 9); }

function drawBody(ctx, c, pose, spec) {
  const b = c.build, cx = 320;
  // legs: thin sticks, small shoes
  for (const s of [-1, 1]) {
    const sw = pose === 'hips' ? 8 : 0;
    ctx.beginPath(); ctx.moveTo(cx + s * 52, 690); ctx.lineTo(cx + s * (62 + sw), 1030);
    ctx.strokeStyle = INK; ctx.lineWidth = 24; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = c.pants; ctx.lineWidth = 10; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx + s * (66 + sw) + s * 14, 1042, 44, 20, 0, 0, 7); fillStroke(ctx, c.shoes, 8);
  }
  // torso (chunky)
  const tw = 250 * b, left = cx - tw / 2;
  rrect(ctx, left, 395, tw, 320, 54); fillStroke(ctx, c.coat, 11);
  rrect(ctx, left + 6, 640, tw - 12, 76, 30); fillStroke(ctx, c.pants, 9); // belt/trouser band
  // shirt triangle + tie / collar
  ctx.beginPath(); ctx.moveTo(cx - 44, 396); ctx.lineTo(cx + 44, 396); ctx.lineTo(cx, 520); ctx.closePath(); fillStroke(ctx, c.shirt, 8);
  if (c.tie) { ctx.beginPath(); ctx.moveTo(cx - 20, 408); ctx.lineTo(cx + 20, 408); ctx.lineTo(cx + 12, 440); ctx.lineTo(cx - 12, 440); ctx.closePath(); fillStroke(ctx, c.tie, 7);
    ctx.beginPath(); ctx.moveTo(cx - 12, 440); ctx.lineTo(cx + 12, 440); ctx.lineTo(cx + 22, 530); ctx.lineTo(cx, 548); ctx.lineTo(cx - 22, 530); ctx.closePath(); fillStroke(ctx, c.tie, 7); }
  // buttons / coat line
  ctx.strokeStyle = c.coatDark; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(cx, 520); ctx.lineTo(cx, 640); ctx.stroke();
  ctx.fillStyle = INK; for (const y of [560, 610]) { ctx.beginPath(); ctx.arc(cx, y, 7, 0, 7); ctx.fill(); }
  // pockets
  for (const s of [-1, 1]) { ctx.strokeStyle = c.coatDark; ctx.lineWidth = 7; rrect(ctx, cx + s * 75 - 36, 570, 72, 56, 10); ctx.stroke(); }
}

function drawArms(ctx, c, pose) {
  const a = ARMS[pose];
  for (const side of ['L', 'R']) {
    const pts = a[side];
    tube(ctx, pts, 36 * c.build, c.coat);
  }
  for (const side of ['L', 'R']) hand(ctx, a[side][2], c.skin);
  if (pose === 'point') { // pointing finger
    const h = a.R[2]; ctx.beginPath(); ctx.moveTo(h[0] + 8, h[1] - 6); ctx.lineTo(h[0] + 36, h[1] - 16);
    ctx.strokeStyle = INK; ctx.lineWidth = 24; ctx.lineCap = 'round'; ctx.stroke(); ctx.strokeStyle = c.skin; ctx.lineWidth = 11; ctx.stroke();
  }
  if (pose === 'hold') drawProp(ctx, c.holdProp, a.R[2][0], a.R[2][1] - 10);
}

function eye(ctx, x, y, expr, blink, side, gaze) {
  const big = expr === 'shock' ? 1.12 : 1, rx = 40 * big, ry = 50 * big;
  if (blink || expr === 'laughing') { // closed eye: happy arc or flat line
    ctx.beginPath();
    if (expr === 'laughing') { ctx.arc(x, y + 14, 34, Math.PI * 1.12, Math.PI * 1.88); } else { ctx.moveTo(x - 34, y + 6); ctx.quadraticCurveTo(x, y + 22, x + 34, y + 6); }
    ctx.strokeStyle = INK; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.stroke(); return;
  }
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); fillStroke(ctx, '#ffffff', 9);
  const pr = expr === 'shock' ? 8 : expr === 'worried' || expr === 'sweat' ? 15 : 17;
  const px = x + gaze[0] * 14, py = y + gaze[1] * 16 + (expr === 'worried' || expr === 'sweat' ? -6 : 0);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(px, py, pr, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px - pr * 0.35, py - pr * 0.4, pr * 0.32, 0, 7); ctx.fill();
  if (expr === 'smug') { // heavy half-closed lid
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.clip();
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(x - rx - 4, y - ry - 4, rx * 2 + 8, ry * 0.95 + 4); ctx.restore();
    ctx.beginPath(); ctx.moveTo(x - rx, y - ry * 0.05); ctx.lineTo(x + rx, y - ry * 0.12);
    ctx.strokeStyle = INK; ctx.lineWidth = 10; ctx.stroke();
  }
}

function brow(ctx, x, y, expr, side) {
  ctx.strokeStyle = INK; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath();
  const s = side; // -1 left, +1 right
  if (expr === 'shock') { ctx.moveTo(x - 34, y - 30); ctx.quadraticCurveTo(x, y - 52, x + 34, y - 30); }
  else if (expr === 'worried' || expr === 'sweat') { ctx.moveTo(x - 34 * s * -1 * 0 + (-s) * -34, y - 8); ctx.moveTo(x - s * -34, y - 8 + 0); ctx.moveTo(x + s * 34, y - 6); ctx.lineTo(x - s * 34, y - 32); }
  else if (expr === 'smug') { if (s > 0) { ctx.moveTo(x - 32, y - 24); ctx.quadraticCurveTo(x, y - 44, x + 32, y - 28); } else { ctx.moveTo(x - 32, y - 6); ctx.lineTo(x + 32, y - 14); } }
  else if (expr === 'laughing') { ctx.moveTo(x - 32, y - 14); ctx.quadraticCurveTo(x, y - 36, x + 32, y - 14); }
  else { ctx.moveTo(x - 32, y - 20); ctx.quadraticCurveTo(x, y - 40, x + 32, y - 20); } // grin
  ctx.stroke();
}

function mouth(ctx, x, y, expr, c) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (expr === 'smug') { ctx.beginPath(); ctx.moveTo(x - 52, y + 6); ctx.quadraticCurveTo(x + 6, y + 36, x + 56, y - 16); ctx.strokeStyle = INK; ctx.lineWidth = 11; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 56, y - 16); ctx.lineTo(x + 66, y - 24); ctx.stroke(); }
  else if (expr === 'grin') { ctx.beginPath(); ctx.moveTo(x - 62, y - 8); ctx.quadraticCurveTo(x, y + 90, x + 62, y - 8); ctx.closePath(); fillStroke(ctx, '#7a1f2b', 10);
    ctx.save(); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fillRect(x - 70, y - 12, 140, 28); ctx.restore();
    ctx.beginPath(); ctx.moveTo(x - 62, y - 8); ctx.quadraticCurveTo(x, y + 90, x + 62, y - 8); ctx.closePath(); ctx.lineWidth = 10; ctx.strokeStyle = INK; ctx.stroke(); }
  else if (expr === 'shock') { ctx.beginPath(); ctx.ellipse(x, y + 22, 27, 40, 0, 0, 7); fillStroke(ctx, '#7a1f2b', 10); }
  else if (expr === 'laughing') { ctx.beginPath(); ctx.moveTo(x - 66, y - 14); ctx.quadraticCurveTo(x, y + 8, x + 66, y - 14); ctx.quadraticCurveTo(x + 50, y + 100, x, y + 100); ctx.quadraticCurveTo(x - 50, y + 100, x - 66, y - 14); ctx.closePath(); fillStroke(ctx, '#7a1f2b', 10);
    ctx.save(); ctx.clip(); ctx.fillStyle = '#ef7a8a'; ctx.beginPath(); ctx.ellipse(x, y + 96, 38, 30, 0, 0, 7); ctx.fill(); ctx.restore(); }
  else { ctx.beginPath(); ctx.moveTo(x - 44, y + 26); ctx.bezierCurveTo(x - 22, y - 6, x + 8, y + 40, x + 44, y + 8); ctx.strokeStyle = INK; ctx.lineWidth = 11; ctx.stroke(); }
}

function drawHead(ctx, c, expr, blink, gaze) {
  const hx = 320, hy = 235;
  // ears
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(hx + s * 148, hy + 10, 26, 34, 0, 0, 7); fillStroke(ctx, c.skin, 9); }
  // hair behind
  if (c.hair === 'tuft') {
    ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.fillStyle = c.hairColor;
    for (const [dx, a] of [[-70, -0.5], [-20, -0.15], [30, 0.15], [78, 0.5]]) { ctx.beginPath(); ctx.ellipse(hx + dx, hy - 150, 24, 40, a, 0, 7); ctx.fill(); ctx.stroke(); }
  }
  // head
  blobPath(ctx, hx, hy, 152, 148, 7); fillStroke(ctx, c.skin, 12);
  if (c.hair === 'tuft') { // side puffs
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(hx + s * 122, hy - 55, 28, 38, s * 0.3, 0, 7); ctx.fillStyle = c.hairColor; ctx.fill(); ctx.lineWidth = 9; ctx.strokeStyle = INK; ctx.stroke(); }
  }
  // cheeks
  if (expr === 'grin' || expr === 'laughing' || expr === 'smug') { for (const s of [-1, 1]) { ctx.fillStyle = 'rgba(240,120,110,.35)'; ctx.beginPath(); ctx.ellipse(hx + s * 98, hy + 50, 26, 15, 0, 0, 7); ctx.fill(); } }
  // eyes + brows
  const ey = hy - 18;
  for (const s of [-1, 1]) { eye(ctx, hx + s * 58, ey, expr, blink, s, gaze); }
  for (const s of [-1, 1]) { brow(ctx, hx + s * 58, ey - 62, expr, s); }
  // nose
  blobPath(ctx, hx, hy + 28, 16, 12, 11, 0.5); fillStroke(ctx, '#f4a98d', 8);
  // mustache sits over mouth
  mouth(ctx, hx, hy + 74, expr, c);
  if (c.mustache) {
    const big = c.mustache === 'big';
    ctx.beginPath(); ctx.moveTo(hx, hy + 52);
    ctx.bezierCurveTo(hx - 40, hy + 36, hx - (big ? 100 : 60), hy + (big ? 50 : 56), hx - (big ? 110 : 64), hy + (big ? 86 : 70));
    ctx.bezierCurveTo(hx - 56, hy + 76, hx - 20, hy + 70, hx, hy + 66);
    ctx.bezierCurveTo(hx + 20, hy + 70, hx + 56, hy + 76, hx + (big ? 110 : 64), hy + (big ? 86 : 70));
    ctx.bezierCurveTo(hx + (big ? 100 : 60), hy + (big ? 50 : 56), hx + 40, hy + 36, hx, hy + 52);
    ctx.closePath(); fillStroke(ctx, '#2a1a2e', 7);
  }
  if (c.cigar) { ctx.save(); ctx.translate(hx + 34, hy + 96); ctx.rotate(-0.28); rrect(ctx, 0, -9, 96, 20, 8); fillStroke(ctx, '#8a5a2b', 7);
    ctx.beginPath(); ctx.arc(98, 1, 12, 0, 7); fillStroke(ctx, '#ff8a3a', 6); ctx.restore(); }
  if (c.glasses) {
    ctx.lineWidth = 8; ctx.strokeStyle = INK;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + s * 58, ey, 62, 0, 7); ctx.fillStyle = 'rgba(190,230,240,.28)'; ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(hx - 4, ey - 6); ctx.quadraticCurveTo(hx, ey - 14, hx + 4, ey - 6); ctx.stroke();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + s * 118, ey - 6); ctx.lineTo(hx + s * 150, ey - 16); ctx.stroke(); }
  }
  // headwear
  if (c.hat === 'helmet') {
    ctx.beginPath(); ctx.moveTo(hx - 170, hy - 54); ctx.bezierCurveTo(hx - 170, hy - 210, hx + 170, hy - 210, hx + 170, hy - 54);
    ctx.bezierCurveTo(hx + 120, hy - 36, hx - 120, hy - 36, hx - 170, hy - 54); ctx.closePath(); fillStroke(ctx, '#5e6b52', 12);
    ctx.beginPath(); ctx.moveTo(hx - 120, hy - 150); ctx.quadraticCurveTo(hx - 40, hy - 190, hx + 10, hy - 188); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 12; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx - 90, hy - 40); ctx.lineTo(hx - 98, hy + 4); ctx.moveTo(hx + 90, hy - 40); ctx.lineTo(hx + 98, hy + 4); ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.stroke();
  } else if (c.hat === 'cap') {
    ctx.beginPath(); ctx.moveTo(hx - 150, hy - 70); ctx.bezierCurveTo(hx - 150, hy - 200, hx + 150, hy - 200, hx + 150, hy - 70); ctx.closePath(); fillStroke(ctx, '#55655c', 12);
    ctx.beginPath(); ctx.moveTo(hx - 160, hy - 70); ctx.quadraticCurveTo(hx, hy - 36, hx + 160, hy - 70); ctx.quadraticCurveTo(hx + 90, hy - 108, hx - 90, hy - 108); ctx.closePath(); fillStroke(ctx, '#2f3a34', 11);
    ctx.beginPath(); ctx.arc(hx, hy - 136, 16, 0, 7); fillStroke(ctx, '#d8c36a', 6);
  }
  if (expr === 'sweat') {
    for (const [dx, dy, s] of [[-176, -40, 1], [182, -78, 0.8], [-150, 30, 0.7]]) {
      ctx.save(); ctx.translate(hx + dx, hy + dy); ctx.scale(s, s);
      ctx.beginPath(); ctx.moveTo(0, -34); ctx.bezierCurveTo(30, 4, 26, 30, 0, 30); ctx.bezierCurveTo(-26, 30, -30, 4, 0, -34); fillStroke(ctx, '#8fd6f6', 7); ctx.restore();
    }
  }
  if (expr === 'laughing') {
    for (const s of [-1, 1]) { ctx.save(); ctx.translate(hx + s * 150, hy + 20); ctx.beginPath(); ctx.moveTo(0, -24); ctx.bezierCurveTo(22, 0, 18, 22, 0, 22); ctx.bezierCurveTo(-18, 22, -22, 0, 0, -24); fillStroke(ctx, '#8fd6f6', 6); ctx.restore(); }
  }
}

export function drawCharacter(ctx, id, pose = 'idle', expr = 'smug', opts = {}) {
  const c = CAST[id], gaze = opts.gaze || [0, 0];
  ctx.clearRect(0, 0, W, H);
  drawBody(ctx, c, pose);
  drawArms(ctx, c, pose);
  // up-pose arms behind head: draw head after arms
  drawHead(ctx, c, expr, !!opts.blink, gaze);
}

// contact-sheet drawing for the review sheet
export function drawSheet(canvas) {
  const ctx = canvas.getContext('2d'), ids = Object.keys(CAST);
  const cell = 0.42, cw = W * cell, ch = H * cell;
  canvas.width = Math.ceil(cw * 6 + 40); canvas.height = Math.ceil(ch * (ids.length * 1) + 110 * ids.length + 60);
  ctx.fillStyle = '#f3e3c3'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; const t = tmp.getContext('2d');
  let y = 20;
  ctx.fillStyle = '#2a1a2e'; ctx.font = 'bold 26px sans-serif';
  ids.forEach((id) => {
    ctx.fillText(`${CAST[id].name} — ${CAST[id].role}`, 20, y + 18);
    for (let i = 0; i < 6; i++) {
      const pose = POSES[i % 5], expr = EXPRS[i];
      drawCharacter(t, id, i < 5 ? POSES[i] : 'hold', EXPRS[i]);
      ctx.drawImage(tmp, 20 + i * cw, y + 30, cw, ch);
      ctx.font = '16px sans-serif'; ctx.fillText(`${i < 5 ? POSES[i] : 'hold'} · ${EXPRS[i]}`, 28 + i * cw, y + 30 + ch + 18);
      ctx.font = 'bold 26px sans-serif';
    }
    y += ch + 80;
  });
}
