"""Sound: a music montage (several free Mixkit tracks, equal-power crossfades, matched loudness) + effects on the event cues, -14 LUFS."""
import json, subprocess
from pathlib import Path
import numpy as np, soundfile as sf, pyloudnorm as pyln
ROOT = Path(__file__).resolve().parent.parent; DATA = ROOT / 'data'; AUD = ROOT / 'audio'; SR = 48000
meta = json.load(open(DATA / 'meta.json')); DUR = meta['duration']; N = int(DUR * SR) + SR
def load(p):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32).reshape(-1, 2).copy()
meter = pyln.Meter(SR); XF = 5 * SR
order = [587, 135, 595, 671, 132, 871]; mix = np.zeros((N, 2), np.float32); pos = 0
for k, tid in enumerate(order):
    a = load(AUD / f'm{tid}.mp3'); a *= 10 ** ((-23 - meter.integrated_loudness(a)) / 20)
    fi = XF if k else int(2.0 * SR); a[:fi] *= np.sin(np.linspace(0, np.pi / 2, fi))[:, None]
    if k < len(order) - 1: a[-XF:] *= np.cos(np.linspace(0, np.pi / 2, XF))[:, None]
    end = min(N, pos + len(a)); mix[pos:end] += a[:end - pos]; pos = pos + len(a) - XF
    if pos >= N: break
mix[int((DUR - 6) * SR):] *= np.linspace(1, 0, N - int((DUR - 6) * SR))[:, None][:len(mix[int((DUR - 6) * SR):])]
sfx = json.load(open(DATA / 'sfx.json')); cache = {}
CAP = {'whoosh': 1.1, 'impact': 3.0, 'ding': 1.8}; LV = {'whoosh': -17, 'impact': -9, 'ding': -14}
for c in sfx:
    nm = c['name']
    if nm not in cache:
        a = load(AUD / 'sfx' / f'{nm}.mp3')[: int(CAP.get(nm, 1.5) * SR)]; n = len(a); a[-int(0.1 * SR):] *= np.linspace(1, 0, int(0.1 * SR))[:, None]; cache[nm] = a / (np.abs(a).max() + 1e-9)
    a = cache[nm] * 0.5 * 10 ** (LV.get(nm, -14) / 20) * c.get('vol', 1) * 4; i0 = int(c['t'] * SR); i1 = min(N, i0 + len(a))
    if i0 < N: mix[i0:i1] += a[:i1 - i0]
mix = mix[: int(DUR * SR)]
base = pyln.normalize.loudness(mix, meter.integrated_loudness(mix), -14.0); g = 0.0
for it in range(5):
    sf.write(AUD / 'mix_pre.wav', np.clip(base * 10 ** (g / 20), -8, 8), SR, subtype='FLOAT')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(AUD / 'mix_pre.wav'), '-af', 'alimiter=limit=0.89:attack=3:release=80:level=disabled', '-c:a', 'pcm_s16le', str(AUD / 'mix.wav')], check=True)
    fin = load(AUD / 'mix.wav'); L = meter.integrated_loudness(fin)
    if abs(L + 14) < 0.3: break
    g += -14 - L
rep = {'duration': DUR, 'mix_lufs': round(float(L), 2), 'peak_dbfs': round(float(20 * np.log10(np.abs(fin).max())), 2), 'tracks': order, 'cues': len(sfx)}
json.dump(rep, open(ROOT / 'out' / 'audio_report.json', 'w')); print(rep)
