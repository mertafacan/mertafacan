#!/usr/bin/env bash
# One click: voice -> assets + timeline -> Blender sets (glb) -> three.js render -> sound -> captions -> finish.
# Free tools only: Blender, Python (Kokoro, faster-whisper), Node + Playwright, FFmpeg.
set -euo pipefail
cd "$(dirname "$0")"
BLENDER="${BLENDER:-blender}"; PY="${PY:-python3}"; WORKERS="${WORKERS:-3}"
# long render: keep the machine awake (Linux: systemd-inhibit, macOS: caffeinate). On Windows turn sleep off first.
if [ -z "${AWAKE:-}" ]; then export AWAKE=1; if command -v systemd-inhibit >/dev/null; then exec systemd-inhibit --what=sleep:idle --why="story render" "$0" "$@"; elif command -v caffeinate >/dev/null; then exec caffeinate -ims "$0" "$@"; fi; fi
[ -s data/voice.wav ] || "$PY" voice.py                                  # Kokoro on the CPU + faster-whisper word times
node tools/export_assets.mjs --timeline                                   # textures, character cards, frames.json
"$BLENDER" -b -P scene.py -- --data data                                  # builds every set, exports data/scene.glb
node tools/camcheck.mjs                                                   # camera never inside a solid
node tools/render.mjs --workers "$WORKERS" --out frames                   # resumable: skips frames that already exist
"$PY" tools/captions.py
"$PY" audio/mix.py                                                        # music bed, Mixkit effects, ducking, -14 LUFS
./finish.sh                                                               # refuses to encode if a frame is missing
