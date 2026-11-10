#!/usr/bin/env bash
# Finish: soft glow + burned-in captions + the mix -> H.264.  Refuses to encode if any frame is missing.
# Never overwrites an older video: every run writes out/short_<timestamp>.mp4 (and a numbered suffix if needed).
set -euo pipefail
cd "$(dirname "$0")"
FRAMES="${FRAMES:-frames}"; ALLOW_PARTIAL="${ALLOW_PARTIAL:-0}"
NF=$(node -e "console.log(JSON.parse(require('fs').readFileSync('data/meta.json')).frames)")
MISSING=0; for ((i=0;i<NF;i++)); do f=$(printf "$FRAMES/f%05d.jpg" "$i"); [ -s "$f" ] || MISSING=$((MISSING+1)); done
if [ "$MISSING" -gt 0 ] && [ "$ALLOW_PARTIAL" != "1" ]; then echo "REFUSING TO ENCODE: $MISSING of $NF frames are missing in $FRAMES/ (render stopped early?)"; exit 2; fi
mkdir -p out
STAMP=$(date +%Y%m%d-%H%M%S); OUT="out/short_${STAMP}.mp4"; n=1; while [ -e "$OUT" ]; do OUT="out/short_${STAMP}_$n.mp4"; n=$((n+1)); done
GLOW="format=gbrp,split=2[a][b];[b]format=gray,lutyuv=y='clip((val-190)*5,0,255)',gblur=sigma=24,format=gbrp[g];[a][g]blend=all_mode=screen:all_opacity=0.4,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p"
DUR=$(node -e "console.log(JSON.parse(require('fs').readFileSync('data/meta.json')).duration)")
ffmpeg -hide_banner -loglevel warning -framerate 30 -i "$FRAMES/f%05d.jpg" -i audio/mix.wav \
  -filter_complex "[0:v]${GLOW},ass=data/captions.ass:fontsdir=assets/fonts[v]" \
  -map "[v]" -map 1:a -t "$DUR" -c:v libx264 -preset medium -crf "${CRF:-19}" -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -movflags +faststart "$OUT"
# cover: a clean frame of the payoff, glow only, no text
IDX=$(node -e "const m=JSON.parse(require('fs').readFileSync('data/meta.json'));const s=m.shots.find(s=>s.name==='reveal');console.log(Math.round((s.t0+0.95)*30))")
ffmpeg -hide_banner -loglevel error -y -i "$(printf "$FRAMES/f%05d.jpg" "$IDX")" -filter_complex "[0:v]${GLOW}[o]" -map "[o]" -frames:v 1 -q:v 2 "out/cover_${STAMP}.jpg"
echo "WROTE $OUT"; ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,duration -of compact "$OUT"
