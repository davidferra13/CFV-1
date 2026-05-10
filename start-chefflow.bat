@echo off
title ChefFlow Dev Server
cd /d "%~dp0"
echo Starting ChefFlow on http://localhost:3100 ...
npm run dev
pause
