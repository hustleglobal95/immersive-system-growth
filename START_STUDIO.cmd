@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Forge Studio needs Node.js 22.13 or newer. Install Node and reopen this launcher.
  pause
  exit /b 1
)
node scripts\start-studio.mjs
if errorlevel 1 pause
