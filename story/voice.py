"""Free voice route: Kokoro on the CPU, one line per call, joined with short gaps.
Only silence at the edges of each line is trimmed (with a guard), never inside a word.
Then faster-whisper gives word times on the finished track.
Run with the venv python:  /root/tools/venv311/bin/python voice.py
"""
import json, re, sys, difflib
from pathlib import Path
import numpy as np, soundfile as sf

ROOT = Path(__file__).parent
OUT = ROOT / "data"; OUT.mkdir(exist_ok=True)
script = json.load(open(ROOT / "script.json"))
cfg = script["voice"]; SR = 24000
GAP = cfg["gap"]; GUARD = 0.06; THRESH = 0.008


def trim_edges(a):
    """Trim only leading/trailing silence, keep a guard so no word is clipped."""
    env = np.abs(a)
    win = int(0.01 * SR)
    sm = np.convolve(env, np.ones(win) / win, mode="same")
    idx = np.where(sm > THRESH)[0]
    if len(idx) == 0:
        return a
    s = max(0, idx[0] - int(GUARD * SR)); e = min(len(a), idx[-1] + int(GUARD * SR))
    return a[s:e]


def synth():
    from kokoro import KPipeline
    pipe = KPipeline(lang_code="a")
    clips = []
    for ln in script["lines"]:
        chunks = []
        for _, _, audio in pipe(ln["text"], voice=cfg["voice"], speed=cfg["speed"], split_pattern=None):
            chunks.append(audio.numpy() if hasattr(audio, "numpy") else np.asarray(audio))
        a = trim_edges(np.concatenate(chunks).astype(np.float32))
        clips.append(a)
        print(f'line {ln["id"]}: {len(a)/SR:.2f}s', flush=True)
    return clips


def main():
    clips = synth()
    gap = np.zeros(int(GAP * SR), dtype=np.float32)
    lead = np.zeros(int(0.15 * SR), dtype=np.float32)
    t = len(lead); parts = [lead]; spans = []
    for i, a in enumerate(clips):
        spans.append((t / SR, (t + len(a)) / SR))
        parts.append(a); t += len(a)
        if i < len(clips) - 1:
            parts.append(gap); t += len(gap)
    parts.append(np.zeros(int(0.5 * SR), dtype=np.float32))
    full = np.concatenate(parts)
    peak = np.max(np.abs(full)); full = full / peak * 0.9
    sf.write(OUT / "voice.wav", full, SR)
    print("voice duration", len(full) / SR)

    from faster_whisper import WhisperModel
    model = WhisperModel("small.en", device="cpu", compute_type="int8")
    segs, _ = model.transcribe(str(OUT / "voice.wav"), word_timestamps=True, language="en", beam_size=5)
    ww = []
    for s in segs:
        for w in s.words:
            ww.append({"w": re.sub(r"[^a-z0-9']", "", w.word.lower()), "start": w.start, "end": w.end})

    # align whisper words to the script words, line by line (script text stays the truth)
    lines_out = []
    for ln, (ls, le) in zip(script["lines"], spans):
        words = ln["text"].split()
        norm = [re.sub(r"[^a-z0-9']", "", w.lower()) for w in words]
        cand = [w for w in ww if w["end"] > ls - 0.05 and w["start"] < le + 0.05]
        sm = difflib.SequenceMatcher(None, norm, [c["w"] for c in cand], autojunk=False)
        times = [None] * len(words)
        for a, b, n in sm.get_matching_blocks():
            for k in range(n):
                times[a + k] = (cand[b + k]["start"], cand[b + k]["end"])
        # fill gaps by interpolation inside the line span
        for k in range(len(words)):
            if times[k] is None:
                p = next((j for j in range(k - 1, -1, -1) if times[j]), None)
                q = next((j for j in range(k + 1, len(words)) if times[j]), None)
                t0 = times[p][1] if p is not None else ls
                t1 = times[q][0] if q is not None else le
                lo = p if p is not None else -1
                hi = q if q is not None else len(words)
                share = (t1 - t0) / max(1, hi - lo - 1)
                times[k] = (t0 + (k - lo - 1) * share, t0 + (k - lo) * share)
        lines_out.append({"id": ln["id"], "beat": ln["beat"], "text": ln["text"], "start": ls, "end": le,
                          "words": [{"w": w, "start": round(a, 3), "end": round(b, 3)} for w, (a, b) in zip(words, times)]})
    json.dump({"duration": len(full) / SR, "lines": lines_out}, open(OUT / "words.json", "w"), indent=1)
    allw = sum(len(l["words"]) for l in lines_out)
    print("words", allw)
    for l in lines_out:
        print(f'{l["id"]:>2} {l["start"]:6.2f}-{l["end"]:6.2f} ({l["end"]-l["start"]:4.1f}s, {len(l["words"])}w) {l["text"][:60]}')


main()
