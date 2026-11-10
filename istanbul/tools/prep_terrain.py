"""Terrain prep (venv python, scipy): real DEM -> mesh grid heights + toon vertex colours + minimap images."""
import json, numpy as np
from pathlib import Path
from scipy import ndimage as ndi
from PIL import Image
R = Path(__file__).resolve().parent.parent; D = R / 'data'
dem = np.load(D / 'dem.npy'); meta = json.load(open(D / 'dem_meta.json'))
STRIDE, EXAG = 4, 2.2
H, W = (dem.shape[0] // STRIDE) * STRIDE, (dem.shape[1] // STRIDE) * STRIDE
d = dem[:H, :W]
g = d.reshape(H // STRIDE, STRIDE, W // STRIDE, STRIDE).mean(axis=(1, 3))          # grid heights in metres
land = g > 0.9
land = ndi.binary_closing(land, iterations=1) & (g > -2)
dist_sea = ndi.distance_transform_edt(~land) * STRIDE * meta['size_km'][0] * 1000 / dem.shape[1]   # metres from land (sea cells)
dist_land = ndi.distance_transform_edt(land) * STRIDE * meta['size_km'][0] * 1000 / dem.shape[1]
hs = np.where(land, np.maximum(g, 1.0) / 1000 * EXAG, -0.0007).astype(np.float32)
hs = ndi.gaussian_filter(hs, 0.6)
rng = np.random.default_rng(3); noise = ndi.gaussian_filter(rng.standard_normal(g.shape), 6); noise /= np.abs(noise).max()
noise2 = ndi.gaussian_filter(rng.standard_normal(g.shape), 1.5); noise2 /= np.abs(noise2).max()
def hexc(h): h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])
def lin(c): return np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
col = np.zeros(g.shape + (3,))
grass_lo, grass_hi, olive, rock = hexc('#8cbc5c'), hexc('#5f9a48'), hexc('#7c9650'), hexc('#a49a78')
t = np.clip(g / 260, 0, 1)[..., None]
col[:] = grass_lo * (1 - t) + grass_hi * t
col += (noise[..., None] * 0.09) * np.array([0.6, 1.0, 0.3]) + noise2[..., None] * 0.025
dry = np.clip(noise * 1.4 + 0.1, 0, 1)[..., None] * 0.35; col = col * (1 - dry) + olive * dry
sand = (np.exp(-dist_land / 90.0) * land)[..., None]; col = col * (1 - sand * 0.85) + hexc('#e6d8a4') * sand * 0.85
col[g > 380] = col[g > 380] * 0.5 + rock * 0.5
# sea: shallow teal near shore, deeper blue offshore, a foam ring at the coast
sea = ~land; s = np.clip(dist_sea / 5200, 0, 1)[..., None]
sea_col = hexc('#38b3c3') * (1 - s) + hexc('#1f67a6') * s
foam = np.exp(-dist_sea / 70.0)[..., None]; sea_col = sea_col * (1 - foam * 0.8) + hexc('#d6f3f4') * foam * 0.8
col[sea] = sea_col[sea]
col = np.clip(col, 0, 1)
np.savez_compressed(D / 'terrain.npz', h=hs, col=lin(col).astype(np.float32), land=land)
# minimap + hillshade (for the HUD)
gy, gx = np.gradient(g); shade = np.clip(0.6 + (gx - gy) * 0.012, 0.3, 1.0)
mm = np.zeros(g.shape + (3,), np.uint8); mm[land] = (np.array([[0.55, 0.72, 0.38]]) * shade[land][:, None] * 255).astype(np.uint8); mm[~land] = (52, 110, 170)
Image.fromarray(mm).resize((g.shape[1] // 2, g.shape[0] // 2), Image.LANCZOS).save(D / 'minimap.png')
print('grid', hs.shape, 'land %.0f%%' % (land.mean() * 100), 'km', meta['size_km'])
