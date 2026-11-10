# True-story Short pipeline (free tools only)

`./build.sh` runs everything: voice -> assets + timeline -> Blender sets -> three.js render -> sound -> captions -> finish.

| step | file | what it does |
|---|---|---|
| script / voice | `script.json`, `voice.py` | Kokoro (CPU) one line per call, joined with short gaps, only edge silence trimmed; faster-whisper word times -> `data/words.json` |
| characters | `chars.js`, `out/character_sheet.png` | cast drawn in code on a canvas, exported as transparent WebP per pose + expression (+ blink) |
| surfaces | `textures.js` | signs, chalkboard, brick, planks, plaques drawn on canvases and used as textures |
| story timeline | `timeline.js` | for any frame: camera (position, look-at, fov, roll), focus distance, every card, props, effects, sound cues; everything anchored to word times |
| exporter | `assets.html`, `tools/export_assets.mjs` | headless browser runs the timeline for every frame -> `data/frames.json`, cards, textures |
| sets | `scene.py` (Blender) | every place built from boxes / cylinders / cones / tori, flat toon colours, inverted-hull ink outlines, lights, exported to `data/scene.glb` |
| render | `render.html`, `tools/render.mjs` | three.js loads the Blender glb (toon shading, cards that turn on the vertical axis only), resumable JPG frames |
| checks | `tools/camcheck.mjs`, `tools/contact.mjs`, `tools/allsheet.mjs` | camera never inside a solid; contact sheets; faces fade out instead of being half cut |
| sound | `audio/mix.py` | Mixkit music bed ~20 dB under the voice, Mixkit effects on word-anchored cues, ducking, -14 LUFS |
| captions | `tools/captions.py` | 1-2 words at a time, short words ride with the next one, no full stops |
| finish | `finish.sh` | soft glow + captions + mix -> H.264. Refuses to encode if any frame is missing. Never overwrites an older video |

Needs: Blender 4.2+, Python 3.11 (`pip install kokoro soundfile faster-whisper numpy scipy pyloudnorm fonttools`), Node 20+ with `npm i` (three) and Playwright with Chromium, FFmpeg.
Turn off sleep before a long render (`build.sh` uses `systemd-inhibit` / `caffeinate` when available).
