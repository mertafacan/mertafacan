@echo off
REM THE FINAL RENDER on Windows. Needs Node 20+ and FFmpeg in PATH. First time: npm i  &&  npx playwright install chromium
REM Turn off PC sleep first (Settings > System > Power). Resumable: run again if it stops.
cd /d %~dp0
if "%W%"=="" set W=1920
if "%H%"=="" set H=1080
if "%WORKERS%"=="" set WORKERS=3
node timeline.mjs >nul
node tools\render.mjs --gpu --w %W% --h %H% --workers %WORKERS% --out frames || goto :end
node tools\finish.mjs
:end
