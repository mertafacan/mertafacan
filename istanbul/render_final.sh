#!/usr/bin/env bash
# THE FINAL RENDER (run this on the machine with the GPU).  Needs: Node 20+, FFmpeg, bc.   First time:  npm i && npx playwright install chromium
# Resumable: if it stops (sleep, crash) run it again - frames that exist are skipped. Turn off PC sleep first.
# Options (env): W=1920 H=1080 WORKERS=3 (GPU: 2-4) QUALITY
set -euo pipefail; cd "$(dirname "$0")"
W="${W:-1920}"; H="${H:-1080}"; WORKERS="${WORKERS:-3}"
if [ -z "${AWAKE:-}" ]; then export AWAKE=1; if command -v systemd-inhibit >/dev/null; then exec systemd-inhibit --what=sleep:idle --why="istanbul render" "$0" "$@"; elif command -v caffeinate >/dev/null; then exec caffeinate -ims "$0" "$@"; fi; fi
node timeline.mjs >/dev/null                                    # frames.json from events.json (already committed)
node tools/render.mjs --gpu --w "$W" --h "$H" --workers "$WORKERS" --out frames
./finish.sh
