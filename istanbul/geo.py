"""Shared geography: lat/lon -> world km (x east, z south, y up), terrain height lookup."""
import json, numpy as np
from pathlib import Path
D = Path(__file__).resolve().parent / 'data'
META = json.load(open(D / 'dem_meta.json')); SX, SZ = META['size_km']
LON0, LON1, LAT0, LAT1 = META['lon0'], META['lon1'], META['lat0'], META['lat1']
EXAG = 2.2
def ll(lat, lon):
    return ((lon - LON0) / (LON1 - LON0) * SX - SX / 2, (LAT1 - lat) / (LAT1 - LAT0) * SZ - SZ / 2)
_T = None
def terrain():
    global _T
    if _T is None: _T = np.load(D / 'terrain.npz')['h']
    return _T
def hgt(x, z):
    h = terrain(); Hg, Wg = h.shape
    fx = (x + SX / 2) / SX * (Wg - 1); fz = (z + SZ / 2) / SZ * (Hg - 1)
    i0 = np.clip(np.floor(fx).astype(int), 0, Wg - 2); j0 = np.clip(np.floor(fz).astype(int), 0, Hg - 2); tx = fx - i0; tz = fz - j0
    return (h[j0, i0] * (1 - tx) * (1 - tz) + h[j0, i0 + 1] * tx * (1 - tz) + h[j0 + 1, i0] * (1 - tx) * tz + h[j0 + 1, i0 + 1] * tx * tz)
