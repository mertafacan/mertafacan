"""Captions: 1-2 words at a time, short words (a, the, so, to ...) ride with the next word, bold rounded font,
white with a thick dark outline, centred in the lower third, no full stops.  Writes captions.ass (+ a static instance of the font)."""
import json, re, sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent; DATA = ROOT / 'data'; FONTS = ROOT / 'assets' / 'fonts'
src = FONTS / 'Baloo2-ExtraBold.ttf'; dst = FONTS / 'CapBaloo-ExtraBold.ttf'
if not dst.exists():
    f = TTFont(src)
    if 'fvar' in f:
        axes = {a.axisTag: a for a in f['fvar'].axes}; loc = {'wght': min(800, axes['wght'].maxValue)}
        f = instancer.instantiateVariableFont(f, loc)
    for rec in f['name'].names:
        if rec.nameID in (1, 16): rec.string = 'CapBaloo'
        if rec.nameID in (2, 17): rec.string = 'ExtraBold'
        if rec.nameID == 4: rec.string = 'CapBaloo ExtraBold'
        if rec.nameID == 6: rec.string = 'CapBaloo-ExtraBold'
    f.save(dst)
words = json.load(open(DATA / 'words.json')); meta = json.load(open(DATA / 'meta.json'))
SHORT = {'a', 'an', 'the', 'so', 'to', 'in', 'of', 'on', 'and', 'it', 'is', 'he', 'his', 'was', 'at', 'as', 'but', 'then', 'that', 'you', 'or', 'by', 'for', 'had', 'did', 'not', 'who', 'with', 'were', 'are'}
chunks = []
for ln in words['lines']:
    toks = [(w['w'], w['start'], w['end']) for w in ln['words']]; i = 0
    while i < len(toks):
        w, s, e = toks[i]; bare = re.sub(r"[^A-Za-z0-9']", '', w).lower(); group = [toks[i]]
        comma = w.endswith(',')
        if i + 1 < len(toks) and not comma:
            nxt = toks[i + 1]
            if bare in SHORT: group.append(nxt)
            elif re.sub(r"[^A-Za-z0-9']", '', nxt[0]).lower() not in SHORT and (nxt[2] - s) < 0.85 and not nxt[0].endswith(',') or (nxt[0].endswith(',') and (nxt[2] - s) < 0.85 and bare not in SHORT): group.append(nxt)
        chunks.append(group); i += len(group)
def clean(w): return re.sub(r"[,.;:]", '', w).upper()
ev = []
for k, g in enumerate(chunks):
    s = g[0][1]; e = g[-1][2]
    nxt = chunks[k + 1][0][1] if k + 1 < len(chunks) else meta['duration']
    end = min(max(e + 0.08, s + 0.22), nxt + 0.02, e + 0.55)
    ev.append((s, end, ' '.join(clean(w[0]) for w in g)))
def ts(t): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f'{h}:{m:02d}:{s:05.2f}'
hdr = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,CapBaloo,118,&H00FFFFFF,&H00FFFFFF,&H002E1A2A,&H00000000,0,0,0,0,100,100,0,0,1,13,0,5,40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
with open(ROOT / 'data' / 'captions.ass', 'w', encoding='utf8') as f:
    f.write(hdr)
    for s, e, t in ev:
        f.write(f"Dialogue: 0,{ts(s)},{ts(e)},Cap,,0,0,0,,{{\\pos(540,1480)\\fscx70\\fscy70\\t(0,90,\\fscx108\\fscy108)\\t(90,170,\\fscx100\\fscy100)}}{t}\n")
print(len(ev), 'caption chunks'); print(' | '.join(t for _, _, t in ev[:30]))
