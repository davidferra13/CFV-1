@echo off
curl -s -X POST http://localhost:41937/api/git/push
echo Branch pushed to GitHub.
