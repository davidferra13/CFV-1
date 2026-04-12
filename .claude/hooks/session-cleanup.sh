#!/bin/bash
# Session Cleanup Hook
# Runs on every Claude Code SessionEnd event.
# Kills zombie processes that accumulate across sessions:
#   - Playwright MCP processes (spawned by agent browser testing)
#   - Orphaned dev servers on non-standard ports (not 3000, 3100)
#   - Stale start-server.js workers using excessive memory

PROJECT_DIR="c:/Users/david/Documents/CFv1"
LOG_FILE="$PROJECT_DIR/.claude/hooks/cleanup.log"

timestamp() { date '+%Y-%m-%d %H:%M:%S'; }

echo "[$(timestamp)] Session cleanup starting" >> "$LOG_FILE"

# 1. Kill all Playwright MCP zombie processes
PLAYWRIGHT_COUNT=$(powershell -Command "(Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -like '*@playwright/mcp*' } | Measure-Object).Count" 2>/dev/null)
if [ "$PLAYWRIGHT_COUNT" -gt 0 ] 2>/dev/null; then
  powershell -Command "(Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -like '*@playwright/mcp*' }).ProcessId | ForEach-Object { taskkill /F /PID \$_ 2>&1 | Out-Null }" 2>/dev/null
  echo "[$(timestamp)] Killed $PLAYWRIGHT_COUNT Playwright MCP zombies" >> "$LOG_FILE"
fi

# 2. Kill orphaned dev servers on non-standard ports (keep 3000 and 3100)
ORPHAN_DEVS=$(powershell -Command "(Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -like '*CFv1*next*dev*' -and \$_.CommandLine -notlike '*-p 3100*' } | Measure-Object).Count" 2>/dev/null)
if [ "$ORPHAN_DEVS" -gt 0 ] 2>/dev/null; then
  powershell -Command "(Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -like '*CFv1*next*dev*' -and \$_.CommandLine -notlike '*-p 3100*' }).ProcessId | ForEach-Object { taskkill /F /PID \$_ 2>&1 | Out-Null }" 2>/dev/null
  echo "[$(timestamp)] Killed $ORPHAN_DEVS orphaned dev servers" >> "$LOG_FILE"
fi

# 3. Kill rogue prod servers on non-standard ports (keep 3000 only)
ROGUE_PRODS=$(powershell -Command "(Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -like '*CFv1*next start*' -and \$_.CommandLine -notlike '*-p 3000*' } | Measure-Object).Count" 2>/dev/null)
if [ "$ROGUE_PRODS" -gt 0 ] 2>/dev/null; then
  powershell -Command "(Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -like '*CFv1*next start*' -and \$_.CommandLine -notlike '*-p 3000*' }).ProcessId | ForEach-Object { taskkill /F /PID \$_ 2>&1 | Out-Null }" 2>/dev/null
  echo "[$(timestamp)] Killed $ROGUE_PRODS rogue prod servers" >> "$LOG_FILE"
fi

# 4. Kill start-server.js workers using >4GB (memory leak detection)
LEAKED=$(powershell -Command "(Get-Process node -ErrorAction SilentlyContinue | Where-Object { \$_.WorkingSet64 -gt 4GB } | ForEach-Object { \$cmd = (Get-CimInstance Win32_Process -Filter \"ProcessId=\$(\$_.Id)\").CommandLine; if (\$cmd -like '*start-server.js*') { \$_ } } | Measure-Object).Count" 2>/dev/null)
if [ "$LEAKED" -gt 0 ] 2>/dev/null; then
  powershell -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { \$_.WorkingSet64 -gt 4GB } | ForEach-Object { \$cmd = (Get-CimInstance Win32_Process -Filter \"ProcessId=\$(\$_.Id)\").CommandLine; if (\$cmd -like '*start-server.js*') { taskkill /F /PID \$(\$_.Id) 2>&1 | Out-Null } }" 2>/dev/null
  echo "[$(timestamp)] Killed $LEAKED leaked server workers (>4GB)" >> "$LOG_FILE"
fi

# 5. Kill stale Playwright test server processes
STALE_PW_TEST=$(powershell -Command "(Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -like '*@playwright*test*cli.js*test-server*' } | Measure-Object).Count" 2>/dev/null)
if [ "$STALE_PW_TEST" -gt 0 ] 2>/dev/null; then
  powershell -Command "(Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -like '*@playwright*test*cli.js*test-server*' }).ProcessId | ForEach-Object { taskkill /F /PID \$_ 2>&1 | Out-Null }" 2>/dev/null
  echo "[$(timestamp)] Killed $STALE_PW_TEST stale Playwright test servers" >> "$LOG_FILE"
fi

TOTAL=$((${PLAYWRIGHT_COUNT:-0} + ${ORPHAN_DEVS:-0} + ${ROGUE_PRODS:-0} + ${LEAKED:-0} + ${STALE_PW_TEST:-0}))
if [ "$TOTAL" -eq 0 ]; then
  echo "[$(timestamp)] Clean session - no zombies found" >> "$LOG_FILE"
fi

# Keep log file from growing forever (last 200 lines)
if [ -f "$LOG_FILE" ]; then
  tail -200 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi
