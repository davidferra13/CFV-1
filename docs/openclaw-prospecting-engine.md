# OpenClaw Prospecting Engine Setup (2026-03-16)

## What Changed

OpenClaw (Raspberry Pi, always-on) was repurposed from a general-purpose "conductor" into a dedicated 24/7 prospecting engine for ChefFlow user acquisition.

## Pi-Side Changes (via SSH)

### Config (`openclaw.json`)

- Removed invalid `heartbeat` keys that were crashing the cron scheduler
- Switched all 5 agents (main, qa, runner, build, sonnet) from Ollama primary to **Groq primary**
- Removed Gemini from agent fallback chains (stays only for web search)
- Fallback chain: Groq 70B > Ollama > SambaNova > OpenRouter > Groq 8B

### Cron Jobs (`cron/jobs.json`)

Replaced 13 general-purpose jobs with 8 prospecting-focused jobs:

| Job                | Schedule                | Agent  | Slack Channel         |
| ------------------ | ----------------------- | ------ | --------------------- |
| venue-scanner      | Every 6 hours           | main   | #openclaw-leads       |
| individual-scanner | 3x/day (2am, 10am, 6pm) | main   | #openclaw-leads       |
| enrichment-crawler | Daily 6am               | qa     | #openclaw-intel       |
| cold-email-drafter | 3x/day (4am, 12pm, 8pm) | main   | #openclaw-work-orders |
| competitor-watch   | Weekly Wed 7am          | qa     | #openclaw-intel       |
| seasonal-alert     | Weekly Mon 7am          | qa     | #openclaw-work-orders |
| quality-audit      | Daily midnight          | runner | #openclaw-uptime      |
| health-ping        | Hourly                  | runner | #openclaw-uptime      |

### SOUL.md

Rewritten from conductor identity to prospecting engine. Defines target regions (Hamptons, Palm Beach, Cape Cod, Martha's Vineyard, Nantucket), 21 prospect categories, output schema, and resource budgets.

### Slack Channel IDs

All jobs updated from channel names (broken) to numeric IDs:

- #openclaw-leads = C0AL4KW694P
- #openclaw-intel = C0ALPLY2QA0
- #openclaw-work-orders = C0ALZ1074N5
- #openclaw-uptime = C0ALL39387L

### Environment

Added systemd override (`/etc/systemd/system/openclaw-chefflow.service.d/prospecting.conf`) with:

- `PROSPECTING_API_KEY` for authenticating with ChefFlow's API
- `CHEFFLOW_API_URL` pointing to beta

## ChefFlow-Side Changes

### New Endpoint: `PATCH /api/prospecting/[id]/enrich`

- File: `app/api/prospecting/[id]/enrich/route.ts`
- Accepts enrichment fields (event_signals, news_intel, social_profiles, contact info, etc.)
- Whitelist-filtered to prevent overwriting sensitive columns
- Auto-stamps `last_enriched_at`
- Auth: `X-Prospecting-Key` header

### Environment

Added to `.env.local`:

- `PROSPECTING_API_KEY=oc_prospect_88ca...`
- `PROSPECTING_TENANT_ID=REPLACE_WITH_CHEF_UUID` (needs real UUID)

## Outstanding

1. **PROSPECTING_TENANT_ID** needs the real chef UUID from the `chefs` table
2. **Production deployment** needed for OpenClaw to reach ChefFlow's API 24/7 (currently pointing to beta which requires PC to be on)
3. **Jobs haven't been tested end-to-end yet** (first runs will happen at their scheduled times)
4. **Monitor for 48 hours** to verify Groq budget stays under 6,000 RPD and Slack delivery works

## Resource Budget

| Resource          | Daily Limit | Expected Usage | Headroom |
| ----------------- | ----------- | -------------- | -------- |
| Groq RPD          | 6,000       | ~30-40         | 99%      |
| Firecrawl         | ~16/day     | ~5-10          | 50-70%   |
| Gemini web search | 1,000/day   | ~15-20         | 98%      |
