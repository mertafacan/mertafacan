#!/usr/bin/env bash
# Rebuild everything from scratch (data is already committed; you normally only need render_final.sh).
# Free tools: Blender, Python (numpy scipy pillow pyloudnorm), Node + Playwright, FFmpeg. Real terrain: AWS Terrain Tiles (no key).
set -euo pipefail; cd "$(dirname "$0")"; BLENDER="${BLENDER:-blender}"; PY="${PY:-python3}"
[ -s data/dem.npy ] || "$PY" tools/fetch_dem.py                      # real elevation of the Istanbul region
"$PY" tools/prep_terrain.py                                          # mesh heights, toon colours, minimap
"$BLENDER" -b -P scene.py -- --data data                             # terrain + every landmark from simple shapes -> data/world.glb
"$PY" city.py                                                        # city growth model: houses/towers/trees with build years
node timeline.mjs                                                    # events -> frames.json (year, camera, HUD, animations)
[ -s audio/m587.mp3 ] || bash audio/fetch.sh
"$PY" audio/mix.py && ffmpeg -y -v error -i audio/mix.wav -c:a aac -b:a 192k audio/mix.m4a
./render_final.sh
