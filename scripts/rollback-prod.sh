#!/bin/bash
# ============================================
# ChefFlow Production Rollback Script (PC-only)
# ============================================
# Rolls back the local production server to the previous build.
# Usage: bash scripts/rollback-prod.sh
# ============================================
set -e

PROD_DIR="/c/Users/david/Documents/CFv1-prod"

echo ""
echo "=========================================="
echo "  ChefFlow PRODUCTION Rollback (PC)"
echo "=========================================="
echo ""

cd "$PROD_DIR"

# Clean up any leftover staging dir from a failed deploy
rm -rf .next-staging 2>/dev/null || true

if [ -d .next.backup ] && [ -f .next.backup/BUILD_ID ]; then
  # Kill current production server on port 3300
  EXISTING_PID=$(netstat -ano 2>/dev/null | grep ":3300 " | grep "LISTENING" | awk '{print $5}' | head -1)
  if [ -n "$EXISTING_PID" ] && [ "$EXISTING_PID" != "0" ]; then
    taskkill //PID "$EXISTING_PID" //F 2>/dev/null || true
    sleep 2
  fi

  rm -rf .next
  mv .next.backup .next
  echo "  Rolled back to build $(cat .next/BUILD_ID)"

  # Restart production server (hidden window)
  powershell.exe -NoProfile -Command "
    \$psi = New-Object System.Diagnostics.ProcessStartInfo
    \$psi.FileName = 'node'
    \$psi.Arguments = '\"$(cygpath -w "$PROD_DIR")\node_modules\next\dist\bin\next\" start -p 3300'
    \$psi.WorkingDirectory = '$(cygpath -w "$PROD_DIR")'
    \$psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
    \$psi.CreateNoWindow = \$true
    \$psi.UseShellExecute = \$false
    \$psi.EnvironmentVariables['NODE_ENV'] = 'production'
    \$psi.EnvironmentVariables['PORT'] = '3300'
    [System.Diagnostics.Process]::Start(\$psi) | Out-Null
  " 2>/dev/null
  echo "  Production server restarting..."
  sleep 5

  STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:3300 2>/dev/null)
  echo "  Health check: HTTP $STATUS"
else
  echo "  ERROR: No valid backup found (missing .next.backup or BUILD_ID)"
  echo "  Cannot rollback. A fresh deploy is needed."
  exit 1
fi

echo ""
echo "=========================================="
echo "  Rollback complete"
echo "  http://localhost:3300 -> app.cheflowhq.com"
echo "=========================================="
