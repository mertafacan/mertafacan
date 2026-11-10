// Story timeline. For any frame returns: the camera (position, look-at, fov, roll), the focus distance,
// every character card (image, position, scale), animated props and effects.
// Every beat, camera move and sound is anchored to a WORD TIME from words.json, never a typed time.
export const FPS = 30;
const PPM_DEFAULT = 526.3157894736842, FEET = 1055;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const easeIO = (u) => { u = clamp(u, 0, 1); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]), norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)],
};

export function buildTimeline(WORDS, L) {
  const PPM = L.ppm || PPM_DEFAULT, SX = L.street.origin[0];
  const line = (n) => WORDS.lines[n - 1];
  const T = (n, w) => line(n).words[w].start;           // start of word w of line n
  const TE = (n, w) => line(n).words[w].end;
  const DUR = Math.ceil((WORDS.duration + 0.35) * FPS) / FPS;
  const NF = Math.round(DUR * FPS);

  // ---------------------------------------------------------------- characters (positions, poses, expressions on word times)
  const P = (t, x, z) => [t, x, z];
  const lab = L.lab, bench = lab.bench;
  const GEO = { x: -0.8, z: -2.55 };
  const chars = {
    george: { base: 'george', s: 1.0,
      path: [P(0, GEO.x, GEO.z), P(T(5, 0) - 0.3, GEO.x, GEO.z), P(T(5, 0) - 0.29, 3.3, -2.9), P(T(5, 7), 3.3, -0.55), P(T(5, 13), 3.3, -0.55), P(T(5, 13) + 0.5, 3.35, -1.0),
        P(T(7, 0) - 0.06, -3.45, 0.62), P(T(8, 8), -3.45, 0.62), P(T(9, 5) - 0.02, GEO.x, GEO.z), P(T(9, 5), GEO.x, GEO.z)],
      look: [[0, 'hips', 'smug'], [T(1, 9), 'hips', 'grin'], [T(2, 11), 'hips', 'worried'], [T(2, 18), 'hips', 'sweat'], [T(3, 0), 'point', 'grin'], [T(3, 6), 'point', 'smug'], [T(3, 9), 'hips', 'smug'],
        [T(4, 0), 'point', 'grin'], [T(4, 11), 'up', 'grin'], [T(5, 0), 'idle', 'smug'], [T(5, 8), 'idle', 'grin'], [T(5, 13), 'hips', 'smug'],
        [T(7, 0) - 0.06, 'point', 'grin'], [T(7, 8), 'point', 'smug'], [T(7, 11), 'hips', 'smug'],
        [T(9, 5), 'point', 'grin'], [T(9, 14), 'up', 'grin'], [T(10, 0) - 0.3, 'hips', 'smug'], [T(10, 10), 'up', 'grin']],
      vis: [[0, 1], [T(6, 0) - 0.2, 0], [T(7, 0) - 0.3, 1], [T(7, 17) - 0.1, 0], [T(9, 5) - 0.4, 1]] },
    friend: { base: 'friend', s: 1.0, flip: [[0, 0], [T(3, 16), 1], [T(4, 0), 1]],
      path: [P(0, 2.1, -0.9)],
      look: [[0, 'idle', 'smug'], [T(3, 9), 'hips', 'smug'], [T(3, 14), 'hips', 'laughing'], [T(3, 17), 'point', 'laughing'], [T(4, 0), 'hips', 'laughing'], [T(4, 8), 'hold', 'shock']],
      vis: [[0, 1], [T(4, 12), 0]] },
    soldierA: { base: 'soldierA', s: 1.0,
      path: [P(T(6, 0) - 0.3, 3.9, -3.55), P(T(6, 1), 3.9, -3.55), P(T(6, 4), 0.55, -0.5), P(T(7, 17) - 0.3, 0.55, -0.5), P(T(8, 0) - 0.4, 3.35, 1.5), P(T(8, 10), 3.35, -1.9)],
      look: [[0, 'idle', 'smug'], [T(6, 4), 'hold', 'worried'], [T(6, 9), 'hold', 'smug'], [T(8, 0) - 0.4, 'hips', 'smug']],
      vis: [[0, 0], [T(6, 0) + 0.3, 1], [T(7, 17) - 0.3, 0], [T(8, 0) - 0.5, 1], [T(8, 10) + 0.5, 0]] },
    soldierB: { base: 'soldierB', s: 0.97,
      path: [P(T(6, 0) - 0.3, 3.9, -3.55), P(T(6, 2) - 0.3, 3.9, -3.55), P(T(6, 6), 3.2, -0.2), P(T(7, 17) - 0.3, 3.2, -0.2), P(T(8, 0) - 0.4, 3.35, 2.8), P(T(8, 10) + 0.6, 3.35, -0.6)],
      look: [[0, 'hips', 'smug'], [T(6, 13), 'point', 'worried'], [T(8, 0) - 0.4, 'idle', 'worried']],
      vis: [[0, 0], [T(6, 1) + 0.4, 1], [T(7, 17) - 0.3, 0], [T(8, 0) - 0.5, 1], [T(8, 10) + 0.8, 0]] },
  };
  // marching squad on the street (toward the camera)
  const st0 = line(2).start - 0.7, st1 = T(2, 11) + 0.2;
  [['sA1', 'soldierA', 38.9, 0], ['sB1', 'soldierB', 41.1, 0.4], ['sA2', 'soldierA', 39.6, 1.6], ['sB2', 'soldierB', 40.4, 2.0]].forEach(([id, base, x, d]) => {
    chars[id] = { base, s: base === 'soldierB' ? 0.97 : 1.0, path: [P(st0, x, -9 + d), P(st1, x + (x < 40 ? -0.2 : 0.2), 6 + d)], look: [[0, 'idle', 'smug']], vis: [[0, 0], [st0, 1], [st1, 0]], walk: 1.0 };
  });
  function LE(n) { return line(n).end; }
  const stepOf = (list, t, def) => { let v = def; for (const k of list) if (k[0] <= t) v = k; return v; };
  function charState(id, t) {
    const c = chars[id]; const vis = c.vis ? stepOf(c.vis, t, [0, 1])[1] : 1; if (!vis) return null;
    const pa = c.path; let x = pa[0][1], z = pa[0][2], moving = 0;
    for (let i = 0; i < pa.length - 1; i++) {
      const a = pa[i], b = pa[i + 1];
      if (t >= a[0] && t <= b[0] && b[0] - a[0] > 0.001) { const u = (t - a[0]) / (b[0] - a[0]); x = lerp(a[1], b[1], u); z = lerp(a[2], b[2], u); const sp = Math.hypot(b[1] - a[1], b[2] - a[2]) / (b[0] - a[0]); moving = sp > 0.25 ? sp : 0; break; }
      if (t > b[0]) { x = b[1]; z = b[2]; }
    }
    const lk = stepOf(c.look, t, c.look[0]); const flip = c.flip ? stepOf(c.flip, t, [0, 0])[1] : 0;
    return { id, base: c.base, s: c.s, x, z, pose: lk[1], expr: lk[2], flip: !!flip, moving, tLook: lk[0], walk: c.walk };
  }
  const cardPt = (st, px, py, az) => { // world point of a pixel on the card as seen from azimuth az
    const rx = Math.cos(az), rz = -Math.sin(az), lat = ((px - 320) / PPM) * st.s * (st.flip ? -1 : 1), up = ((FEET - py) / PPM) * st.s;
    return [st.x + rx * lat, up, st.z + rz * lat];
  };
  const ptsOf = (id, t, az, px0, px1, py0, py1) => { const st = charState(id, t) || charState(id, t + 0.5) || forced(id); return [cardPt(st, px0, py0, az), cardPt(st, px1, py0, az), cardPt(st, px0, py1, az), cardPt(st, px1, py1, az)]; };
  function forced(id) { const c = chars[id]; const pa = c.path[0]; return { x: pa[1], z: pa[2], s: c.s, flip: false }; }
  const head = (id, t, az, pad = 0) => ptsOf(id, t, az, 160 - pad, 480 + pad, 60 - pad, 400);
  const body = (id, t, az, bottom = 720) => ptsOf(id, t, az, 95, 545, 55, bottom);
  const box3 = (a, b) => [[a[0], a[1], a[2]], [b[0], a[1], a[2]], [a[0], b[1], a[2]], [b[0], b[1], a[2]], [a[0], a[1], b[2]], [b[0], a[1], b[2]], [a[0], b[1], b[2]], [b[0], b[1], b[2]]];

  // ---------------------------------------------------------------- camera fitting (compute distance so named things sit fully in frame)
  function basis(az, el) {
    const dir = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)], f = V.mul(dir, -1);
    const right = V.norm(V.cross(f, [0, 1, 0])), up = V.cross(right, f); return { dir, f, right, up };
  }
  const inRoom = (p) => p[0] > -4.55 && p[0] < 4.55 && p[2] > -3.55 && p[2] < 3.55 && p[1] > 0.3 && p[1] < 3.15;
  function fit(pts, o = {}) {
    const oo = { ...o }; let r = fit1(pts, oo); const isLab = pts.every(p => p[0] < 20);
    for (let k = 0; k < 7 && isLab && !inRoom(r.pos) && (oo.fov || 40) < 72; k++) { oo.fov = (oo.fov || 40) + 4; r = fit1(pts, oo); }
    return r;
  }
  function fit1(pts, o = {}) {
    const { az = 0, el = 0.05, fov = 40, margin = 0.88, yLo = -0.22, yHi = 0.84, dMin = 0.6, roll = 0 } = o;
    const tv = Math.tan(fov * Math.PI / 360), th = tv * 9 / 16, b = basis(az, el);
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; pts.forEach(p => { for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], p[i]); mx[i] = Math.max(mx[i], p[i]); } });
    const c = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
    const pr = pts.map(p => { const v = V.sub(p, c); return [V.dot(v, b.right), V.dot(v, b.up), V.dot(v, b.f)]; });
    const dxs = pr.map(p => p[0]), dys = pr.map(p => p[1]); const dxMid = (Math.min(...dxs) + Math.max(...dxs)) / 2, dyMid = (Math.min(...dys) + Math.max(...dys)) / 2, yT = (yLo + yHi) / 2;
    const ok = (d) => { const lx = dxMid, ly = dyMid - yT * d * tv; for (const p of pr) { const depth = d + p[2]; if (depth < 0.2) return false; const x = (p[0] - lx) / (depth * th), y = (p[1] - ly) / (depth * tv); if (Math.abs(x) > margin || y < yLo || y > yHi) return false; } return true; };
    let lo = dMin, hi = 120; if (ok(lo)) hi = lo; else for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (ok(m)) hi = m; else lo = m; }
    const d = hi, ly = dyMid - yT * d * tv;
    const posc = V.add(V.add(V.add(c, V.mul(b.dir, d)), V.mul(b.right, dxMid)), V.mul(b.up, ly));
    return { pos: posc, look: V.add(posc, V.mul(b.f, d)), fov, roll, d };
  }
  const push = (cam, k) => { const dv = V.sub(cam.pos, cam.look); return { ...cam, pos: V.add(cam.look, V.mul(dv, k)) }; };
  const camLerp = (a, b, u) => ({ pos: V.lerp(a.pos, b.pos, u), look: V.lerp(a.look, b.look, u), fov: lerp(a.fov, b.fov, u), roll: lerp(a.roll || 0, b.roll || 0, u) });

  // ---------------------------------------------------------------- shot list (every start is a word time)
  const beaker = lab.beaker, tray = lab.tray, acid = lab.acid, hero = lab.shelf.hero, dr = lab.junk.drawer, cal = lab.calendar;
  const jarBox = (c) => box3([c[0] - 0.2, c[1], c[2] - 0.2], [c[0] + 0.2, c[1] + 0.56, c[2] + 0.2]);
  const shots = [];
  const S = (name, t0, set, A, B, o = {}) => shots.push({ name, t0, set, A, B, tr: o.tr ?? 0.55, via: o.via });
  const stT = (t) => t;
  { // 1 HOOK: the strange act, one frame — medals dropping into the acid, George smug
    const A = fit([...body('george', 0.5, 0, 700), ...box3([beaker[0] - 0.25, beaker[1], beaker[2] - 0.2], [beaker[0] + 0.25, beaker[1] + 0.62, beaker[2] + 0.2]), [beaker[0], 2.05, beaker[2]]], { az: 0.05, el: 0.06, fov: 42 });
    S('hook', 0, 'lab', A, push(A, 0.86), { tr: 0 });
  }
  { // 2a street sign words inside the world, then wide street
    const sp = L.street.signpost, C = [sp[0] + 0.04, 3.1, sp[2] + 0.12], az = 0.55, r = [Math.cos(az), 0, -Math.sin(az)];
    const A = fit([V.add(C, V.add(V.mul(r, -0.95), [0, 0.5, 0])), V.add(C, V.add(V.mul(r, 0.95), [0, 0.5, 0])), V.add(C, V.add(V.mul(r, -0.95), [0, -0.5, 0])), V.add(C, V.add(V.mul(r, 0.95), [0, -0.5, 0]))], { az, el: -0.02, fov: 36, margin: 0.86 });
    S('street_sign', line(2).start - 0.1, 'street', A, push(A, 0.9), { tr: 0.9 });
    const W = fit([[SX - 3.2, 0, -2.5], [SX + 3.2, 0, 7.5], [SX - 3.2, 6.8, -13.5], [SX + 3.2, 6.8, -13.5]], { az: 0, el: 0.1, fov: 52, margin: 0.97, yLo: -0.55, yHi: 0.95 });
    S('street_wide', T(2, 4) - 0.05, 'street', W, push(W, 0.9), { tr: 0 });
  }
  { // 3 medals on the tray ("guard"): insert, then pull back to George sweating
    const tc = [tray[0], tray[1], tray[2]];
    const A = fit(box3([tc[0] - 0.55, tc[1], tc[2] - 0.15], [tc[0] + 0.55, tc[1] + 0.75, tc[2] + 0.3]), { az: 0.28, el: 0.22, fov: 36, margin: 0.9 });
    const B = fit([...box3([tc[0] - 0.55, tc[1], tc[2] - 0.15], [tc[0] + 0.55, tc[1] + 0.75, tc[2] + 0.3]), ...head('george', T(3, 0), 0.1)], { az: 0.1, el: 0.12, fov: 40 });
    S('tray', T(2, 11) - 0.05, 'lab', A, B, { tr: 0.5 });
  }
  { // 4 grabbing jar + acid
    const A = fit([...box3([acid[0] - 0.2, acid[1], acid[2] - 0.2], [acid[0] + 0.2, acid[1] + 0.62, acid[2] + 0.2]), ...jarBox(beaker), ...head('george', T(3, 4), 0.0)], { az: 0.0, el: 0.06, fov: 40 });
    S('acid', T(3, 0) - 0.1, 'lab', A, push(A, 0.9));
  }
  { // 5 friend sees it and laughs; then BIG close-up on the mocker for the quoted joke
    const A = fit(body('friend', T(3, 12), -0.1, 700), { az: -0.1, el: 0.04, fov: 40 });
    S('friend', T(3, 9) - 0.1, 'lab', A, push(A, 0.9));
    const C = fit(head('friend', T(3, 18), -0.2, 20), { az: -0.2, el: 0.02, fov: 34, margin: 0.9, yLo: -0.3, yHi: 0.92 });
    S('mocker_closeup', T(3, 18) - 0.12, 'lab', C, push(C, 0.9), { tr: 0.45 });
  }
  { // 6 METHOD 1: insert on the beaker while the medals dissolve
    const bb = box3([beaker[0] - 0.24, beaker[1] - 0.02, beaker[2] - 0.2], [beaker[0] + 0.24, beaker[1] + 0.9, beaker[2] + 0.2]);
    const A = fit([...bb, ...head('george', T(4, 4), 0.08)], { az: 0.08, el: 0.04, fov: 36, margin: 0.92 });
    S('beaker_insert', T(4, 0) - 0.08, 'lab', A, push(A, 0.88), { tr: 0.5 });
    const B2 = fit([...body('george', T(4, 12), 0.0, 700), ...jarBox(beaker)], { az: 0.0, el: 0.05, fov: 42 });
    S('beaker_reveal', T(4, 11), 'lab', B2, push(B2, 0.92));
  }
  { // 7 carry the jar to the shelf, shelf wide, label insert
    const w = fit(box3([4.6, 0.4, -2.0], [4.6, 2.1, 1.4]), { az: -1.5, el: 0.1, fov: 50, margin: 0.95 });
    S('shelf_wide', T(5, 0) - 0.1, 'lab', w, push(w, 0.9), { tr: 0.45 });
    const lab_ = fit([...box3([hero[0] - 0.22, hero[1], hero[2] - 0.2], [hero[0] + 0.22, hero[1] + 0.52, hero[2] + 0.2]), ...head('george', T(5, 14), -1.5)], { az: -1.5, el: 0.04, fov: 36, margin: 0.9 });
    S('label_insert', T(5, 13) - 0.1, 'lab', lab_, push(lab_, 0.9), { tr: 0.5 });
  }
  { // 8 METHOD 3: soldiers arrive, search the drawers, look under the table
    const dc = lab.door.pos;
    const A = fit([...body('soldierA', T(6, 2), -0.4, 720), ...box3([3.3, 1.5, -3.9], [4.5, 2.4, -3.7])], { az: -0.4, el: 0.03, fov: 44, margin: 0.93 });
    const B = fit(body('soldierA', T(6, 5), -0.05, 720), { az: -0.05, el: 0.05, fov: 44, margin: 0.9 });
    S('soldiers_enter', T(6, 0) - 0.1, 'lab', A, B, { tr: 0.5 });
    const C = fit(head('soldierA', T(6, 8), 0.12, 70), { az: 0.12, el: 0.0, fov: 34, margin: 0.9 });
    S('search_drawers', T(6, 6), 'lab', C, push(C, 0.9), { tr: 0.5 });
    const t2 = lab.table;
    const D = fit([...body('soldierB', T(6, 14), -0.5, 720), ...box3([t2[0] - 0.75, 0, t2[2] - 0.2], [t2[0] + 0.75, 0.9, t2[2] + 0.75])], { az: -0.5, el: 0.14, fov: 46, margin: 0.93 });
    S('search_table', T(6, 13) - 0.1, 'lab', D, push(D, 0.9), { tr: 0.55 });
  }
  { // 9 YOU SEE: the junk drawer in your kitchen
    const A = fit([...box3([dr[0] - 0.3, dr[1] - 0.1, dr[2] - 0.62], [dr[0] + 0.3, dr[1] + 0.18, dr[2] + 0.62]), ...body('george', T(7, 4), 1.55, 720)], { az: 1.45, el: 0.45, fov: 46, margin: 0.94 });
    S('junk_george', T(7, 0) - 0.1, 'lab', A, push(A, 0.92), { tr: 0.4 });
    const M = fit(box3([dr[0] - 0.28, dr[1] - 0.06, dr[2] - 0.55], [dr[0] + 0.28, dr[1] + 0.14, dr[2] + 0.55]), { az: 1.5, el: 0.68, fov: 36, margin: 0.92 });
    S('junk_macro', T(7, 11) - 0.1, 'lab', M, push(M, 0.85), { tr: 0.7 });
    const W2 = fit(box3([4.6, 0.4, -2.2], [4.6, 2.2, 1.6]), { az: -1.55, el: 0.08, fov: 54, margin: 0.96 });
    S('shelf_all_junk', T(7, 17), 'lab', W2, push(W2, 0.92), { tr: 0.45 });
  }
  { // 10 PAYOFF: the soldiers walk right past the jar
    const A = fit(box3([4.6, 0.6, -1.8], [4.6, 2.05, 1.0]), { az: -1.35, el: 0.05, fov: 46, margin: 0.96 });
    S('past_jar', T(8, 0) - 0.15, 'lab', A, push(A, 0.92), { tr: 0.35 });
    const B = fit([...box3([hero[0] - 0.3, hero[1], hero[2] - 0.25], [hero[0] + 0.3, hero[1] + 0.52, hero[2] + 0.25]), [hero[0], 1.9, hero[2]]], { az: -1.5, el: 0.04, fov: 36, margin: 0.9 });
    S('never_touched', T(8, 8) - 0.1, 'lab', B, push(B, 0.86), { tr: 0.5 });
  }
  { // 11 the war is over: calendar, then the gold comes back
    const C = fit(box3([cal[0] - 0.3, cal[1] - 0.34, cal[2]], [cal[0] + 0.3, cal[1] + 0.34, cal[2] + 0.05]), { az: 0.3, el: 0.0, fov: 34, margin: 0.88 });
    S('calendar', T(9, 0) - 0.1, 'lab', C, push(C, 0.88), { tr: 0.5 });
    const G1 = fit([...jarBox(beaker), ...head('george', T(9, 8), 0.05, 20)], { az: 0.05, el: 0.04, fov: 38, margin: 0.9 });
    S('gold_back', T(9, 6) - 0.1, 'lab', G1, push(G1, 0.88), { tr: 0.45 });
    const tc = tray; const G2 = fit([...box3([tc[0] - 0.55, tc[1], tc[2] - 0.15], [tc[0] + 0.55, tc[1] + 0.75, tc[2] + 0.3]), ...head('george', T(9, 16), 0.12, 20)], { az: 0.14, el: 0.1, fov: 40, margin: 0.92 });
    S('medals_again', T(9, 14) - 0.1, 'lab', G2, push(G2, 0.88), { tr: 0.5 });
  }
  { // 12 TWIST: callback to the hook, then the biggest frame — the reveal coming at the lens
    const H = shots[0].A;
    const A = { ...H, pos: V.add(H.look, V.mul(V.sub(H.pos, H.look), 1.1)) };
    S('callback', T(10, 0) - 0.1, 'lab', A, push(A, 0.92), { tr: 0.5 });
    const F = fit(head('george', T(10, 10), 0.0, 110), { az: 0.0, el: 0.03, fov: 36, margin: 0.9, yLo: -0.15, yHi: 0.78 });
    const F2 = push(F, 0.82);
    S('reveal', T(10, 10) - 0.12, 'lab', F, F2, { tr: 0 });
  }
  shots.sort((a, b) => a.t0 - b.t0);
  for (let i = 0; i < shots.length; i++) shots[i].t1 = i + 1 < shots.length ? shots[i + 1].t0 : DUR;

  // ---------------------------------------------------------------- camera at time t (hold with a slow push, then travel, soft dissolve between places)
  function shotIndex(t) { let k = 0; for (let i = 0; i < shots.length; i++) if (shots[i].t0 <= t) k = i; return k; }
  function camOf(i, t) { // camera of shot i at t, including its travel into shot i+1 (same place)
    const s = shots[i], n = shots[i + 1]; const same = n && n.set === s.set; const trd = same ? s.tr : 0;
    const tt = s.t1 - trd; const u = clamp((Math.min(t, tt) - s.t0) / Math.max(0.01, tt - s.t0), 0, 1);
    const camAtU = (uu) => { const e = easeIO(Math.pow(uu, 0.9)); if (!s.via) return camLerp(s.A, s.B, e); const ks = [[0, s.A], ...s.via, [1, s.B]]; for (let k = 0; k < ks.length - 1; k++) if (uu <= ks[k + 1][0] || k === ks.length - 2) return camLerp(ks[k][1], ks[k + 1][1], ease((uu - ks[k][0]) / (ks[k + 1][0] - ks[k][0]))); return s.B; };
    let cam = camAtU(u);
    if (same && t > tt) { const e = easeIO((t - tt) / trd); cam = camLerp(camAtU(1), n.A, e); }
    return cam;
  }
  const DIS = 0.32; // half-length of a dissolve
  // dissolve window [t0-DIS, t0+DIS] around every change of place: previous camera under, next camera fading in
  function frameCam(t) {
    for (let j = 1; j < shots.length; j++) {
      if (shots[j].set !== shots[j - 1].set && Math.abs(t - shots[j].t0) < DIS) {
        const p = shots[j - 1], n = shots[j], a = ease((t - (n.t0 - DIS)) / (2 * DIS));
        return { cam: camOf(j - 1, Math.min(t, p.t1)), set: p.set, shot: n.name, mix: { cam: camOf(j, Math.max(t, n.t0)), set: n.set, a } };
      }
    }
    const i = shotIndex(t); return { cam: camOf(i, t), set: shots[i].set, shot: shots[i].name, mix: null };
  }

  // ---------------------------------------------------------------- props + effects (all on word times)
  const clear = '#cfe9ee', orangeC = '#ff8a1f';
  const mixCol = (a, b, u) => { const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16)); return '#' + pa.map((v, k) => Math.round(lerp(v, pb[k], u)).toString(16).padStart(2, '0')).join(''); };
  const tray0 = lab.tray;
  function propsAt(t, cam, cards) {
    const props = {}, fx = {};
    // ---- hero jar + liquid colour
    let jp = [beaker[0], beaker[1], beaker[2]], js = 1, col = clear;
    const tDis0 = T(4, 8), tDis1 = T(4, 17);
    if (t < T(1, 8)) col = clear; else if (t < T(2, 0)) col = clear;
    if (t >= T(4, 8)) col = mixCol(clear, orangeC, ease((t - tDis0) / (tDis1 - tDis0)));
    if (t >= tDis1) col = orangeC;
    if (t >= T(5, 0)) { // carried, then on the shelf
      const g = charState('george', t); js = 0.7;
      if (t < T(5, 7)) { const az = cam ? Math.atan2(cam.pos[0] - g.x, cam.pos[2] - g.z) : 0; const hand = cardPt({ ...g, s: 1 }, 470, 640, az); jp = [hand[0], hand[1] + 0.2 * js, hand[2] + 0.12]; }
      else { const u = ease((t - T(5, 7)) / 0.6); const g2 = charState('george', T(5, 7)); const az = Math.atan2((cam?.pos[0] ?? 0) - g2.x, (cam?.pos[2] ?? 0) - g2.z); const h = cardPt({ ...g2, s: 1 }, 470, 640, az); jp = V.lerp([h[0], h[1] + 0.14, h[2] + 0.12], hero, u); }
    }
    if (t >= T(9, 0) - 0.5) { jp = [beaker[0], beaker[1], beaker[2]]; js = 1; col = orangeC; }
    if (t >= T(9, 6)) { col = mixCol(orangeC, clear, ease((t - T(9, 6)) / (T(9, 13) - T(9, 6)))); }
    props.hero_jar = { p: jp, s: js }; props.hero_liquid = { col, ei: t > T(4, 12) && t < T(9, 6) - 0.01 ? 0.25 : 0.15, emi: col };
    // ---- medals
    const mdl = (dx) => [tray0[0] + dx, tray0[1] + 0.27, tray0[2] - 0.02];
    let medalV = 1, mp = [mdl(-0.2), mdl(0.2)], ms = [1, 1], mr = [[0, 0, 0], [0, 0, 0]];
    const drop = (tA, tB, tC, ox) => { // fall into the jar and sink
      const u = clamp((t - tA) / (tB - tA), 0, 1), w = clamp((t - tB) / (tC - tB), 0, 1);
      return { v: t >= tA && t < tC + 0.05, p: [beaker[0] + ox * (1 - 0.5 * u), lerp(2.05, beaker[1] + 0.58, u * u) - w * 0.45, beaker[2]], s: lerp(1, 0.55, w), r: [u * 2.4 * (ox > 0 ? 1 : -1), 0, u * 1.2] };
    };
    const putM = (nm, i, st) => { props[nm] = { p: st.p, s: st.s ?? 1, v: st.v, r: st.r || [0, 0, 0] }; };
    if (t < T(2, 0)) { const a = drop(0.5, T(1, 8), T(1, 8) + 0.9, -0.1), b = drop(0.9, T(1, 8) + 0.05, T(1, 8) + 1.0, 0.1); putM('medalL', 0, a); putM('medalR', 1, b); fx.bubbles = t >= T(1, 8) ? { o: [beaker[0], beaker[1] + 0.5, beaker[2] + 0.1], w: 0.25, h: 0.5, t, n: 22 } : undefined; }
    else if (t < T(3, 6)) { putM('medalL', 0, { p: mdl(-0.2), v: true }); putM('medalR', 1, { p: mdl(0.2), v: true }); }
    else if (t < T(4, 0) - 0.1) { putM('medalL', 0, { p: mdl(-0.2), v: false }); putM('medalR', 1, { p: mdl(0.2), v: false }); }
    else if (t < T(9, 14)) { const a = drop(T(4, 0), T(4, 3), T(4, 6), -0.1), b = drop(T(4, 0) + 0.3, T(4, 3) + 0.2, T(4, 6) + 0.2, 0.1); putM('medalL', 0, a); putM('medalR', 1, b);
      if (t >= T(4, 3)) fx.bubbles = { o: [beaker[0], beaker[1] + 0.35, beaker[2] + 0.1], w: 0.26, h: 0.55, t, n: 30, size: 1.2 }; }
    else { const u = ease((t - T(9, 14)) / 0.35); const pop = 1 + 0.35 * Math.sin(Math.min(1, (t - T(9, 14)) / 0.5) * Math.PI);
      putM('medalL', 0, { p: mdl(-0.2), v: true, s: u * pop }); putM('medalR', 1, { p: mdl(0.2), v: true, s: u * pop });
      if (t >= T(9, 14) && t < T(9, 14) + 1.6) fx.sparks = { o: [tray0[0], tray0[1] + 0.35, tray0[2] + 0.05], r: 0.7, t: t - T(9, 14), n: 36, rise: 0.3, size: 1.5 }; }
    if (t >= T(9, 9) && t < T(9, 14)) fx.sparks = { o: [beaker[0], beaker[1] + 0.35, beaker[2] + 0.1], r: 0.5, t, n: 34, rise: 0.8, size: 1.3 };
    // ---- the reveal: both medals fly at the lens (camera relative)
    if (t >= T(10, 10) - 0.05) {
      const u = easeIO((t - (T(10, 10) - 0.05)) / (TE(10, 15) + 0.35 - (T(10, 10) - 0.05)));
      const f = V.norm(V.sub(cam.look, cam.pos)), right = V.norm(V.cross(f, [0, 1, 0])), up = V.cross(right, f);
      const dist = lerp(3.0, 0.62, Math.pow(u, 1.7)), sc = lerp(0.9, 1.5, u);
      const base = V.add(cam.pos, V.mul(f, dist)); const spread = lerp(0.42, 0.11, u);
      putM('medalL', 0, { p: V.add(V.add(base, V.mul(right, -spread)), V.mul(up, lerp(-0.15, 0.0, u))), v: true, s: sc, r: [0, 0.0, 0.25] });
      putM('medalR', 1, { p: V.add(V.add(base, V.mul(right, spread)), V.mul(up, lerp(-0.15, 0.0, u))), v: true, s: sc, r: [0, 0.0, -0.25] });
      // medal discs are cylinders along their local axes; face them to the lens (yaw to camera)
      const yaw = Math.atan2(cam.pos[0] - base[0], cam.pos[2] - base[2]);
      props.medalL.r = [0, yaw, 0.2]; props.medalR.r = [0, yaw, -0.2];
      fx.sparks = { o: V.add(base, [0, 0, 0]), r: lerp(0.5, 0.2, u), t, n: 40, size: 1.4 + u, rise: 0.0 };
    }
    // ---- calendar flip 1940 -> 1945, day window, door
    const tf = T(9, 2), flip = clamp((t - tf) / 0.7, 0, 1);
    props.cal_1940 = { r: [0, flip * Math.PI, 0], v: flip < 0.5 };
    props.cal_1945 = { r: [0, (1 - flip) * -Math.PI, 0], v: flip >= 0.5 };
    props.window_day = { v: t >= T(9, 0) - 0.2 };
    const door0 = T(6, 0) - 0.05, door1 = T(6, 4) + 0.6; const open = t < door0 ? 0 : t < door0 + 0.5 ? ease((t - door0) / 0.5) : t < door1 ? 1 : 1 - ease((t - door1) / 0.6);
    props.door = { r: [0, -open * 1.5, 0] };
    return { props, fx };
  }

  // ---------------------------------------------------------------- frame()
  function frame(i) {
    const t = i / FPS; const fc = frameCam(t);
    const cards = [];
    for (const id of Object.keys(chars)) {
      const st = charState(id, t); if (!st) continue;
      const ph = id.length * 1.37;
      const breathe = 1 + 0.011 * Math.sin(2 * Math.PI * t / 2.9 + ph), bob = st.moving ? Math.abs(Math.sin(t * 7.0 + ph)) * 0.07 : 0;
      const tt = t - st.tLook, hop = tt >= 0 && tt < 0.45 ? 0.045 * Math.sin(tt / 0.45 * Math.PI) : 0;
      const blink = ((t + ph) % 3.4) < 0.14 && st.expr !== 'laughing';
      cards.push({ id, img: `${st.base}_${st.pose}_${st.expr}${blink ? '_b' : ''}`, x: st.x, y: bob + hop, z: st.z, s: st.s, sy: breathe, flip: st.flip ? 1 : 0, shadow: 0.5 });
    }
    // head guard: a face is shown only when it sits fully inside the frame (fades in/out at the edges, never half cut)
    { const c = fc.cam, F = V.norm(V.sub(c.look, c.pos)), R = V.norm(V.cross(F, [0, 1, 0])), U = V.cross(R, F), tv = Math.tan(c.fov * Math.PI / 360), th = tv * 9 / 16;
      for (const cd of cards) { const hp = [cd.x, (FEET - 235) / PPM * cd.s, cd.z], v = V.sub(hp, c.pos), dz = V.dot(v, F);
        if (dz < 0.15) { cd.a = 0; continue; }
        const x = V.dot(v, R) / (dz * th), y = V.dot(v, U) / (dz * tv), rx = 0.30 * cd.s / (dz * th), ry = 0.30 * cd.s / (dz * tv), ryT = 0.38 * cd.s / (dz * tv);
        const m = Math.min(0.99 - (Math.abs(x) + rx), 0.99 - (y + ryT), (y - ry) + 0.99);
        cd.a = clamp((m + 0.02) / 0.10, 0, 1); } }
    const { props, fx } = propsAt(t, fc.cam, cards);
    const mk = (c) => ({ pos: c.pos.map(v => +v.toFixed(4)), look: c.look.map(v => +v.toFixed(4)), fov: +c.fov.toFixed(3), roll: +(c.roll || 0).toFixed(4), focus: +V.len(V.sub(c.look, c.pos)).toFixed(3) });
    const f = { i, t: +t.toFixed(4), set: fc.set, shot: fc.shot, cam: mk(fc.cam), cards, props, fx };
    if (fc.mix) f.mix = { cam: mk(fc.mix.cam), set: fc.mix.set, a: +fc.mix.a.toFixed(4) };
    return f;
  }

  // ---------------------------------------------------------------- sound cues (word-anchored)
  const sfx = [];
  const cue = (t, name, vol = 1) => sfx.push({ t: +Math.max(0, t).toFixed(3), name, vol });
  cue(T(1, 8) - 0.05, 'splash', 0.9); cue(T(1, 8), 'fizz', 0.5);
  cue(line(2).start - 0.55, 'steps', 0.7); cue(line(2).start - 0.35, 'whoosh', 0.8); cue(T(2, 4) - 0.1, 'whoosh', 0.6); cue(T(2, 11) - 0.45, 'whoosh', 0.8);
  cue(T(3, 0) - 0.12, 'tink', 0.6); cue(T(3, 9) - 0.15, 'whoosh', 0.55); cue(T(3, 18) - 0.2, 'pop', 0.8);
  cue(T(4, 0) - 0.1, 'whoosh', 0.5); cue(T(4, 3), 'splash', 0.9); cue(T(4, 3) + 0.1, 'fizz', 0.7); cue(T(4, 17), 'ding', 0.7); cue(T(4, 11) - 0.1, 'whoosh', 0.5);
  cue(T(5, 0) - 0.15, 'whoosh', 0.6); cue(T(5, 7), 'thunk', 0.8); cue(T(5, 13) - 0.15, 'whoosh', 0.5);
  cue(T(6, 0) - 0.1, 'door', 0.9); cue(T(6, 1), 'steps', 0.7); cue(T(6, 6) - 0.12, 'whoosh', 0.5); cue(T(6, 13) - 0.12, 'whoosh', 0.5); cue(T(6, 10), 'drawer', 0.6);
  cue(T(7, 0) - 0.12, 'whoosh', 0.55); cue(T(7, 11) - 0.12, 'whoosh', 0.5); cue(T(7, 17) - 0.2, 'whoosh', 0.8);
  cue(T(8, 0) - 0.3, 'steps', 0.6); cue(T(8, 8) - 0.1, 'whoosh', 0.45);
  cue(T(9, 0) - 0.12, 'whoosh', 0.55); cue(T(9, 2), 'flip', 0.8); cue(T(9, 6) - 0.1, 'whoosh', 0.5); cue(T(9, 9), 'magic', 0.8); cue(T(9, 14), 'pop', 1.0); cue(T(9, 14) + 0.05, 'ding', 0.9);
  cue(T(10, 0) - 0.15, 'whoosh', 0.5); cue(T(10, 10) - 0.15, 'whoosh', 1.0); cue(TE(10, 15) - 0.25, 'impact', 1.0); cue(TE(10, 15) - 0.2, 'ding', 0.9);

  const check = (f) => { // scan for cut faces: a head (r~0.29 m) whose centre is on screen must sit fully inside the frame
    const issues = []; const c = f.cam; const F = V.norm(V.sub(c.look, c.pos)), R = V.norm(V.cross(F, [0, 1, 0])), U = V.cross(R, F);
    const tv = Math.tan(c.fov * Math.PI / 360), th = tv * 9 / 16;
    for (const cd of f.cards) {
      const s = cd.s; const hp = [cd.x, (FEET - 235) / PPM * s, cd.z]; const v = V.sub(hp, c.pos); const dz = V.dot(v, F); if (dz < 0.1) continue;
      const x = V.dot(v, R) / (dz * th), y = V.dot(v, U) / (dz * tv), rx = 0.31 * s / (dz * th), ry = 0.31 * s / (dz * tv);
      const onscreen = Math.abs(x) < 1.2 && Math.abs(y) < 1.2; const inside = Math.abs(x) + rx <= 0.995 && y + ry <= 0.995 && y - ry >= -0.995;
      const touches = Math.abs(x) - rx < 0.995 && y - ry < 0.995 && y + ry > -0.995;
      if (touches && !inside) issues.push(`${cd.id} head cut (x=${x.toFixed(2)} y=${y.toFixed(2)})`);
      if (inside && y - ry < -0.3) issues.push(`${cd.id} head in caption zone (y=${(y - ry).toFixed(2)})`);
    }
    return issues;
  };
  return { fps: FPS, duration: DUR, frames: NF, shots: shots.map(s => ({ name: s.name, t0: +s.t0.toFixed(3), set: s.set })), frame, sfx, check, chars: Object.keys(chars) };
}
