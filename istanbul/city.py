"""City growth model -> instanced houses (walls + roofs), towers and trees with a BUILD YEAR each. venv python (numpy, scipy)."""
import json, numpy as np
from pathlib import Path
import geo
from scipy import ndimage as ndi
R = Path(__file__).resolve().parent; D = R / 'data'
rng = np.random.default_rng(11)
T = np.load(D / 'terrain.npz'); hs, land = T['h'], T['land']; Hg, Wg = hs.shape
# core -> growth table: (year, radius km); a site is built in the year the nearest core's radius reaches it
CORES = {
 'sarayburnu': (41.0100, 28.9780, [(-700, 0.0), (-400, 0.35), (196, 0.9), (330, 1.6), (420, 4.2), (540, 4.8), (1453, 5.0), (1600, 5.0), (1800, 5.8), (1900, 7.0), (1950, 10.5), (1985, 19), (2015, 31)]),
 'galata':     (41.0260, 28.9770, [(1260, 0.0), (1350, 0.5), (1600, 1.6), (1850, 3.4), (1900, 4.5)]),
 'eyup':       (41.0480, 28.9340, [(1458, 0.0), (1550, 0.8), (1700, 1.3), (1900, 2.2)]),
 'besiktas':   (41.0420, 29.0090, [(1500, 0.0), (1700, 0.8), (1850, 1.6), (1920, 3.0)]),
 'uskudar':    (41.0230, 29.0150, [(-650, 0.0), (0, 0.5), (1000, 0.9), (1500, 1.8), (1850, 3.5), (1950, 6)]),
 'kadikoy':    (40.9900, 29.0260, [(-690, 0.0), (0, 0.35), (1000, 0.8), (1700, 1.8), (1890, 4), (1950, 8)]),
 'bakirkoy':   (40.9810, 28.8760, [(0, 0.0), (500, 0.5), (1500, 0.9), (1900, 2.2), (1950, 5)]),
 'sariyer':    (41.1660, 29.0570, [(1400, 0.0), (1700, 0.7), (1900, 1.6), (1960, 3)]),
 'beykoz':     (41.1290, 29.0950, [(1400, 0.0), (1700, 0.6), (1900, 1.3), (1960, 3)]),
 'pendik':     (40.8800, 29.2300, [(1800, 0.0), (1920, 1.0), (1970, 3.5), (2000, 7)]),
 'esenyurt':   (41.0300, 28.6700, [(1900, 0.0), (1960, 2.0), (1990, 6.0), (2010, 10)]),
}
def born_of(x, z):
    best = np.full(x.shape, np.inf)
    for name, (lat, lon, tab) in CORES.items():
        cx, cz = geo.ll(lat, lon); d = np.hypot(x - cx, z - cz); yrs = np.array([t[0] for t in tab], float); rad = np.array([t[1] for t in tab], float)
        y = np.interp(d, rad, yrs, left=yrs[0], right=np.inf); y = np.where(d > rad[-1], np.inf, y); best = np.minimum(best, y)
    return best
sp = 0.05
gx = np.arange(-geo.SX / 2 + 0.2, geo.SX / 2 - 0.2, sp); gz = np.arange(-geo.SZ / 2 + 0.2, geo.SZ / 2 - 0.2, sp)
X, Z = np.meshgrid(gx, gz); X = (X + rng.uniform(-0.028, 0.028, X.shape)).ravel(); Z = (Z + rng.uniform(-0.028, 0.028, Z.shape)).ravel()
ix = np.clip(((X + geo.SX / 2) / geo.SX * (Wg - 1)).round().astype(int), 0, Wg - 1); iz = np.clip(((Z + geo.SZ / 2) / geo.SZ * (Hg - 1)).round().astype(int), 0, Hg - 1)
ok = land[iz, ix]
gy_, gx_ = np.gradient(hs / geo.EXAG); slope = np.hypot(gx_, gy_) / (geo.SX / Wg)   # rise per km run
ok &= slope[iz, ix] < 0.22; ok &= hs[iz, ix] > 0.0038; ok &= hs[iz, ix] < 0.32 * geo.EXAG * 1.0
X, Z = X[ok], Z[ok]; born = born_of(X, Z)
b = np.isfinite(born); X, Z, born = X[b], Z[b], born[b] + rng.normal(0, 9, b.sum())
born = np.where(born > 2020, rng.uniform(1990, 2020, born.shape), born)
# thin by distance to the nearest core's edge (open fields early, dense later)
fill = np.clip(0.26 + (born - (-500)) / 3400, 0.26, 0.85) + rng.normal(0, 0.12, born.shape)
keep = rng.random(born.shape) < fill
for_noise = ndi.gaussian_filter(rng.standard_normal((Hg, Wg)), 14); for_noise /= np.abs(for_noise).max()
keep &= for_noise[np.clip(((Z + geo.SZ / 2) / geo.SZ * (Hg - 1)).astype(int), 0, Hg - 1), np.clip(((X + geo.SX / 2) / geo.SX * (Wg - 1)).astype(int), 0, Wg - 1)] > -0.55
X, Z, born = X[keep], Z[keep], born[keep]
LIMIT = 150000
early = born < 1880
if len(X) > LIMIT:
    ei = np.where(early)[0]; li = np.where(~early)[0]; room = max(10000, LIMIT - len(ei)); li = rng.choice(li, min(room, len(li)), replace=False); sel = np.concatenate([ei, li]); X, Z, born = X[sel], Z[sel], born[sel]
Y = geo.hgt(X, Z); n = len(X)
# business districts -> towers
TOW = [(41.0850, 29.0100, 1.6), (41.0640, 28.9900, 1.2), (40.9930, 29.1250, 1.5), (41.0170, 29.1000, 1.0), (41.0190, 28.8200, 1.2), (41.0650, 28.8000, 1.3)]
kind = np.zeros(n); for_t = np.zeros(n, bool)
for lat, lon, r in TOW:
    cx, cz = geo.ll(lat, lon); for_t |= (np.hypot(X - cx, Z - cz) < r) & (rng.random(n) < 0.16)
for_t &= born > 1900; kind[for_t] = 1; born[for_t] = rng.uniform(1985, 2020, for_t.sum())
rot = rng.choice([0, 0.5, 1.0, -0.4, 0.2], n) + rng.normal(0, 0.1, n)
fp = rng.uniform(0.018, 0.028, n) * np.where(born < 1700, 0.9, 1.0); ht = rng.uniform(0.009, 0.015, n)
ht = np.where(born > 1950, ht * rng.uniform(1.2, 1.9, n), ht); ht = np.where(kind == 1, rng.uniform(0.05, 0.14, n), ht); fp = np.where(kind == 1, rng.uniform(0.032, 0.05, n), fp)
asp = rng.uniform(0.7, 1.4, n)
era = np.digitize(born, [300, 1100, 1650, 1900, 1960]).astype(float)      # 0..5 -> palettes in the renderer
tone = rng.integers(0, 4, n).astype(float)
house = np.stack([X, Y, Z, rot, fp, ht, fp * asp, born, era, tone, kind], 1).astype(np.float32)
# trees on free land (skip close to houses) — woods on hills, orchards near the cities
from scipy.spatial import cKDTree
tx = rng.uniform(-geo.SX / 2, geo.SX / 2, 420000); tz = rng.uniform(-geo.SZ / 2, geo.SZ / 2, 420000)
tix = np.clip(((tx + geo.SX / 2) / geo.SX * (Wg - 1)).astype(int), 0, Wg - 1); tiz = np.clip(((tz + geo.SZ / 2) / geo.SZ * (Hg - 1)).astype(int), 0, Hg - 1)
okt = land[tiz, tix] & (hs[tiz, tix] > 0.0035) & (slope[tiz, tix] < 0.5) & (for_noise[tiz, tix] > -0.35 + (rng.random(len(tx)) * 0.5)) ; tx, tz = tx[okt], tz[okt]
dd, _ = cKDTree(np.stack([X, Z], 1)).query(np.stack([tx, tz], 1)); fkeep = dd > 0.045; tx, tz = tx[fkeep], tz[fkeep]
if len(tx) > 60000: s2 = rng.choice(len(tx), 60000, replace=False); tx, tz = tx[s2], tz[s2]
ty = geo.hgt(tx, tz); ts = rng.uniform(0.012, 0.026, len(tx)); tt = rng.integers(0, 3, len(tx)).astype(float)
trees = np.stack([tx, ty, tz, ts, tt], 1).astype(np.float32)
house.tofile(D / 'houses.bin'); trees.tofile(D / 'trees.bin'); hs.astype(np.float32).tofile(D / 'terrain.f32')
json.dump({'houses': int(len(house)), 'trees': int(len(trees)), 'hcols': 11, 'tcols': 5, 'gw': int(Wg), 'gh': int(Hg)}, open(D / 'city.json', 'w'))
print('houses', len(house), 'towers', int(kind.sum()), 'trees', len(trees), 'born range', float(born.min()), float(born.max()))
