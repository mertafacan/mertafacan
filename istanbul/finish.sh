#!/usr/bin/env bash
# Finish: frames + music -> H.264 (soft glow). Refuses to encode if any frame is missing; never overwrites an older video.
# usage: ./finish.sh            (all frames in frames/)     |   FRAMES=out/prev FROM=4800 TO=5160 ./finish.sh   (a clip)
set -euo pipefail; cd "$(dirname "$0")"
FRAMES="${FRAMES:-frames}"; FROM="${FROM:-0}"; NF=$(node -e "console.log(JSON.parse(require('fs').readFileSync('data/meta.json')).frames)"); TO="${TO:-$NF}"
MISSING=0; for ((i=FROM;i<TO;i++)); do [ -s "$(printf "$FRAMES/f%06d.jpg" "$i")" ] || MISSING=$((MISSING+1)); done
if [ "$MISSING" -gt 0 ]; then echo "REFUSING TO ENCODE: $MISSING of $((TO-FROM)) frames are missing in $FRAMES/ (render stopped early?). Run the render again; it resumes."; exit 2; fi
mkdir -p out; STAMP=$(date +%Y%m%d-%H%M%S); OUT="out/istanbul_${STAMP}.mp4"; n=1; while [ -e "$OUT" ]; do OUT="out/istanbul_${STAMP}_$n.mp4"; n=$((n+1)); done
GLOW="format=gbrp,split=2[a][b];[b]format=gray,lutyuv=y='clip((val-200)*5,0,255)',gblur=sigma=20,format=gbrp[g];[a][g]blend=all_mode=screen:all_opacity=0.28,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p"
ffmpeg -hide_banner -loglevel warning -start_number "$FROM" -framerate 30 -i "$FRAMES/f%06d.jpg" -ss "$(echo "$FROM/30" | bc -l)" -t "$(echo "($TO-$FROM)/30" | bc -l)" -i audio/mix.m4a \
  -filter_complex "[0:v]${GLOW}[v]" -map "[v]" -map 1:a -frames:v $((TO-FROM)) -c:v libx264 -preset medium -crf "${CRF:-18}" -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -movflags +faststart "$OUT"
echo "WROTE $OUT"; ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,duration -of compact "$OUT"
