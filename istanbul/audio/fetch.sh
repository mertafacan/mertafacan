#!/usr/bin/env bash
# Free Mixkit music + effects used by audio/mix.py (Mixkit license). Run once, then: python audio/mix.py
cd "$(dirname "$0")"; mkdir -p sfx
for id in 587 135 595 671 132 871; do curl -sS -o m$id.mp3 https://assets.mixkit.co/music/$id/$id.mp3; done
curl -sS -o sfx/whoosh.mp3 https://assets.mixkit.co/active_storage/sfx/1490/1490-preview.mp3; curl -sS -o sfx/impact.mp3 https://assets.mixkit.co/active_storage/sfx/788/788-preview.mp3; curl -sS -o sfx/ding.mp3 https://assets.mixkit.co/active_storage/sfx/937/937-preview.mp3
