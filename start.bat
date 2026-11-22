@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js neni nainstalovany.
  echo Stahni ho na https://nodejs.org ^(verze LTS^) a spust tenhle soubor znovu.
  pause
  exit /b 1
)
echo Spoustim Vanocni koulovacku na http://localhost:3000  ^(ukonceni: Ctrl+C^)
node server.js
pause
