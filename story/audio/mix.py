"""Sound mix: one playful music bed ~20 dB under the voice, real Mixkit effects on the actions (word-anchored cues from
data/sfx.json), music + effects ducked under speech, normalised to -14 LUFS.   venv311 python.
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np, soundfile as sf, pyloudnorm as pyln

ROOT = Path(__file__).resolve().parent.parent; DATA = ROOT / 'data'; AUD = ROOT / 'audio'
SR = 48000
meta = json.load(open(DATA / 'meta.json')); DUR = meta['duration']; N = int(round(DUR * SR))
sfx = json.load(open(DATA / 'sfx.json'))

def load(path, ss=0.0, dur=None):
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(ss), '-i', str(path)] + (['-t', str(dur)] if dur else []) + ['-ac', '2', '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, dtype=np.float32).reshape(-1, 2).copy()

def fade(a, fi=0.012, fo=0.05):
    a = a.copy(); n = len(a); i = min(int(fi * SR), n); o = min(int(fo * SR), n)
    if i: a[:i] *= np.linspace(0, 1, i)[:, None]
    if o: a[-o:] *= np.linspace(1, 0, o)[:, None]
    return a

meter = pyln.Meter(SR)
voice = load(DATA / 'voice.wav'); voice = np.pad(voice, ((0, max(0, N - len(voice))), (0, 0)))[:N]
v_lufs = meter.integrated_loudness(voice)

# speech activity envelope (fast attack, slower release)
mono = np.abs(voice).mean(1); win = int(0.02 * SR)
rms = np.sqrt(np.convolve(mono ** 2, np.ones(win) / win, mode='same'))
act = (rms > 0.02).astype(np.float32)
env = np.zeros(N, dtype=np.float32); a_att, a_rel = 1 - np.exp(-1 / (0.05 * SR)), 1 - np.exp(-1 / (0.35 * SR)); s = 0.0
for i in range(N):
    s += ((a_att if act[i] > s else a_rel) * (act[i] - s)); env[i] = s

# music: one bed, ~20 dB under the voice, ducked under speech
mus = load(AUD / 'music_catwalk.mp3', ss=0.0, dur=DUR + 1)[:N]; mus = np.pad(mus, ((0, max(0, N - len(mus))), (0, 0)))
mus = fade(mus, 0.8, 2.6)
m_lufs = meter.integrated_loudness(mus); mus *= 10 ** ((v_lufs - 20 - m_lufs) / 20)
mus *= (1 - 0.35 * env)[:, None]

# effects: placed exactly on the word-anchored cues
CAP = {'whoosh': 1.1, 'whoosh2': 1.2, 'splash': 1.3, 'fizz': 1.1, 'tink': 0.4, 'pop': 1.0, 'ding': 1.8, 'thunk': 0.5, 'door': 1.9, 'steps': 2.6, 'drawer': 1.0, 'flip': 0.5, 'magic': 1.3, 'impact': 3.2}
LVL = {'whoosh': -9, 'splash': -7, 'fizz': -13, 'tink': -10, 'pop': -8, 'ding': -9, 'thunk': -8, 'door': -9, 'steps': -13, 'drawer': -9, 'flip': -8, 'magic': -10, 'impact': -5}
fx = np.zeros_like(voice); peak_v = np.percentile(np.abs(voice), 99.5)
cache = {}
for c in sfx:
    nm = c['name']; src = nm
    if nm not in cache:
        a = load(AUD / 'sfx' / f'{src}.mp3'); a = a[: int(CAP.get(nm, 1.5) * SR)]; a = fade(a, 0.006, 0.12 if nm in ('ding', 'impact', 'steps') else 0.04)
        a = a / (np.abs(a).max() + 1e-9); cache[nm] = a
    a = cache[nm] * peak_v * 10 ** (LVL.get(nm, -10) / 20) * c.get('vol', 1.0)
    i0 = int(c['t'] * SR); i1 = min(N, i0 + len(a))
    if i0 < N: fx[i0:i1] += a[: i1 - i0]
fx *= (1 - 0.35 * env)[:, None]

mix = voice + mus + fx
# normalise to -14 LUFS: gentle compression + limiter keep peaks under -1 dBFS; iterate the pre-gain until the measured result is -14
gain_db = 0.0; base = pyln.normalize.loudness(mix, meter.integrated_loudness(mix), -14.0)
for it in range(6):
    sf.write(AUD / 'mix_pre.wav', np.clip(base * 10 ** (gain_db / 20), -8, 8), SR, subtype='FLOAT')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(AUD / 'mix_pre.wav'), '-af',
                    'acompressor=threshold=0.2:ratio=2.5:attack=8:release=120:makeup=1,alimiter=limit=0.89:attack=2:release=50:level=disabled,aresample=48000', '-c:a', 'pcm_s16le', str(AUD / 'mix.wav')], check=True)
    final = load(AUD / 'mix.wav'); f_l = meter.integrated_loudness(final)
    if abs(f_l + 14.0) < 0.25: break
    gain_db += (-14.0 - f_l)
v2 = voice * 1.0; rep = {'duration': DUR, 'voice_lufs': round(float(v_lufs), 2), 'music_lufs_before_duck': round(float(v_lufs) - 20, 2), 'music_under_voice_db': 20.0,
       'mix_lufs': round(float(f_l), 2), 'mix_peak_dbfs': round(float(20 * np.log10(np.abs(final).max())), 2), 'sfx_cues': len(sfx)}
# measure the actual music-vs-voice level during speech
rep['music_vs_voice_db_in_speech'] = round(float(20 * np.log10(np.sqrt((mus[act > 0] ** 2).mean()) / np.sqrt((voice[act > 0] ** 2).mean()))), 1)
json.dump(rep, open(ROOT / 'out' / 'audio_report.json', 'w'), indent=1); print(rep)
