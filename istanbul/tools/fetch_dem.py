"""Real terrain: AWS Terrain Tiles (Terrarium) -> height grid for the Istanbul region (free, no key)."""
import math, io, sys, json, urllib.request
import numpy as np
from PIL import Image
from pathlib import Path
R = Path(__file__).resolve().parent.parent; D = R / 'data'
LON0, LON1, LAT0, LAT1 = 28.55, 29.45, 40.84, 41.28      # west, east, south, north
Z = 12
def tile(lon, lat):
    n = 2 ** Z; x = (lon + 180) / 360 * n; y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n; return x, y
x0, y1 = tile(LON0, LAT0); x1, y0 = tile(LON1, LAT1)
tx0, tx1, ty0, ty1 = int(x0), int(x1), int(y0), int(y1)
W, H = (tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256
mos = np.zeros((H, W), dtype=np.float32)
for ty in range(ty0, ty1 + 1):
    for tx in range(tx0, tx1 + 1):
        u = f'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{Z}/{tx}/{ty}.png'
        im = np.array(Image.open(io.BytesIO(urllib.request.urlopen(u, timeout=60).read())).convert('RGB')).astype(np.float32)
        mos[(ty - ty0) * 256:(ty - ty0 + 1) * 256, (tx - tx0) * 256:(tx - tx0 + 1) * 256] = im[..., 0] * 256 + im[..., 1] + im[..., 2] / 256 - 32768
# crop to the exact bbox (pixel coords inside the mosaic)
px0, px1 = int((x0 - tx0) * 256), int((x1 - tx0) * 256); py0, py1 = int((y0 - ty0) * 256), int((y1 - ty0) * 256)
h = mos[py0:py1, px0:px1]
np.save(D / 'dem.npy', h)
# metres per pixel at this latitude
mpp_x = (LON1 - LON0) * 111320 * math.cos(math.radians((LAT0 + LAT1) / 2)) / h.shape[1]; mpp_y = (LAT1 - LAT0) * 110574 / h.shape[0]
json.dump({'lon0': LON0, 'lon1': LON1, 'lat0': LAT0, 'lat1': LAT1, 'w': h.shape[1], 'h': h.shape[0], 'size_km': [h.shape[1] * mpp_x / 1000, h.shape[0] * mpp_y / 1000]}, open(D / 'dem_meta.json', 'w'))
print(h.shape, 'min', h.min(), 'max', h.max(), 'size km', h.shape[1] * mpp_x / 1000, h.shape[0] * mpp_y / 1000)
# preview
a = np.clip(h, -30, 300); img = np.zeros(h.shape + (3,), np.uint8)
land = h > 0.5; img[land] = (60 + a[land] / 300 * 180).astype(np.uint8)[:, None] * np.array([[0.5, 1, 0.5]]); img[~land] = (40, 90, 160)
Image.fromarray(img).save(R / 'out' / 'dem_preview.png')
