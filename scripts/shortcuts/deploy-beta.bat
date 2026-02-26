@echo off
curl -s -X POST http://localhost:41937/api/beta/deploy
echo Deploy to beta started (8-10 min). Check Mission Control for progress.
