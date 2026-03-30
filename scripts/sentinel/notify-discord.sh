#!/bin/bash
# Post Sentinel test results to Discord webhook
# Usage: bash notify-discord.sh <tier> <exit_code> [report_file]
# Example: bash notify-discord.sh smoke 0
#          bash notify-discord.sh critical 1 results/sentinel-report.json

TIER="$1"
EXIT_CODE="$2"
REPORT_FILE="${3:-}"
WEBHOOK_URL="${DISCORD_SENTINEL_WEBHOOK:-}"

if [ -z "$WEBHOOK_URL" ]; then
  echo "DISCORD_SENTINEL_WEBHOOK not set, skipping notification"
  exit 0
fi

TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M UTC')
HOSTNAME=$(hostname)

if [ "$EXIT_CODE" -eq 0 ]; then
  COLOR=3066993  # Green
  STATUS="PASS"
  EMOJI="white_check_mark"
else
  COLOR=15158332  # Red
  STATUS="FAIL"
  EMOJI="rotating_light"
fi

# Build description from report file if available
DESCRIPTION=""
if [ -n "$REPORT_FILE" ] && [ -f "$REPORT_FILE" ]; then
  TOTAL=$(cat "$REPORT_FILE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('stats',{}).get('expected',0))" 2>/dev/null || echo "?")
  FAILED=$(cat "$REPORT_FILE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('stats',{}).get('unexpected',0))" 2>/dev/null || echo "?")
  DURATION=$(cat "$REPORT_FILE" | python3 -c "import sys,json; d=json.load(sys.stdin); dur=d.get('stats',{}).get('duration',0); print(f'{dur/1000:.1f}s')" 2>/dev/null || echo "?")
  DESCRIPTION="Tests: ${TOTAL} passed, ${FAILED} failed | Duration: ${DURATION}"

  # If there are failures, list them
  if [ "$EXIT_CODE" -ne 0 ]; then
    FAILURES=$(cat "$REPORT_FILE" | python3 -c "
import sys, json
d = json.load(sys.stdin)
fails = []
for s in d.get('suites', []):
  for spec in s.get('specs', []):
    for t in spec.get('tests', []):
      if t.get('status') == 'unexpected':
        fails.append(spec.get('title', 'unknown'))
print('\n'.join(fails[:5]))" 2>/dev/null || echo "")
    if [ -n "$FAILURES" ]; then
      DESCRIPTION="${DESCRIPTION}\n\nFailed tests:\n\`\`\`\n${FAILURES}\n\`\`\`"
    fi
  fi
else
  DESCRIPTION="Exit code: ${EXIT_CODE}"
fi

# Send to Discord
PAYLOAD=$(cat <<DISCORD
{
  "embeds": [{
    "title": ":${EMOJI}: Sentinel ${TIER^^} - ${STATUS}",
    "description": "${DESCRIPTION}",
    "color": ${COLOR},
    "footer": {
      "text": "${HOSTNAME} | ${TIMESTAMP}"
    }
  }]
}
DISCORD
)

curl -s -H "Content-Type: application/json" -d "$PAYLOAD" "$WEBHOOK_URL" > /dev/null 2>&1

echo "Discord notification sent (${STATUS})"
