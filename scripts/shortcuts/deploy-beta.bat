@echo off
curl -s -X POST http://localhost:3200/api/beta/deploy
echo Deploy to beta started (8-10 min). Check Mission Control for progress.
