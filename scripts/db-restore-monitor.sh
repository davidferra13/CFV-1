#!/bin/bash
TOKEN="sbp_319415457eaab2dbc825037001b72d3571411f18"
REF="luefkpakzvxcsqroxyhz"
LOG="/c/Users/david/Documents/CFv1/supabase-restore.log"

echo "$(date) - Starting monitor" > "$LOG"

for i in $(seq 1 60); do
  STATUS=$(curl -s "https://api.supabase.com/v1/projects/$REF" \
    -H "Authorization: Bearer $TOKEN" 2>&1 | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  echo "$(date +%H:%M:%S) - Status: $STATUS" >> "$LOG"
  
  if [ "$STATUS" = "INACTIVE" ]; then
    echo "$(date +%H:%M:%S) - PAUSED! Restoring..." >> "$LOG"
    curl -s -X POST "https://api.supabase.com/v1/projects/$REF/restore" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" >> "$LOG" 2>&1
    echo "" >> "$LOG"
    echo "$(date +%H:%M:%S) - Restore triggered. Waiting for ACTIVE_HEALTHY..." >> "$LOG"
    
    for j in $(seq 1 30); do
      sleep 60
      STATUS2=$(curl -s "https://api.supabase.com/v1/projects/$REF" \
        -H "Authorization: Bearer $TOKEN" 2>&1 | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
      echo "$(date +%H:%M:%S) - Restore status: $STATUS2" >> "$LOG"
      if [ "$STATUS2" = "ACTIVE_HEALTHY" ]; then
        echo "$(date +%H:%M:%S) - RESTORED! Ready for data dump." >> "$LOG"
        exit 0
      fi
    done
    echo "$(date +%H:%M:%S) - Restore timed out after 30 min" >> "$LOG"
    exit 1
  fi
  
  sleep 120
done
echo "$(date +%H:%M:%S) - Monitor timed out (2 hours)" >> "$LOG"
