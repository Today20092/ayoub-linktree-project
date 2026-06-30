@echo off
cd /d "%~dp0"
node scripts\gallery-prune-gui.mjs
if errorlevel 1 pause
