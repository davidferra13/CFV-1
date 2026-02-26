@echo off
curl -s -X POST http://localhost:3200/api/git/push
echo Branch pushed to GitHub.
