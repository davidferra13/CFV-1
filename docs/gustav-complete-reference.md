# Gustav (Mission Control AI) — Complete Reference

> **This is the single source of truth for everything Gustav can do, how it works, and where the code lives.**
> Updated: 2026-03-06. Agents: read this instead of re-scanning the codebase.

---

## What Is Gustav?

Gustav is ChefFlow's Mission Control AI — the developer's right hand. He's the executive chef who ran the pass at a three-Michelin-star restaurant for 30 years, now running infrastructure the same way: every station calls back, every plate gets inspected, nothing goes out unless it meets his standards.

Gustav is a **standalone vanilla JS app** separate from the Next.js app. He runs on port 41937, uses Ollama for LLM chat, and has direct access to Supabase, Git, the Pi, and all infrastructure.

**Gustav sees everything.** Infrastructure, business data, code, and Remy. He is the all-seeing eye.

---

## Architecture

```
User -> Gustav Chat UI (index.html)
  -> POST /api/chat (server.mjs:41937)
    -> 1. Instant answer? Return immediately (0ms, no LLM)
    -> 2. Guardrail hit? Block immediately (0ms, no LLM)
    -> 3. Instant action? Execute tool directly (no LLM)
    -> 4. Otherwise -> Ollama (streaming, with response calibration)
       -> Parse <action> tags in response
       -> Execute tools
       -> Stream NDJSON back to client
```

**Three response paths (fastest first):**

1. **Instant answers** — pattern-matched, returns static response (help, scan menus)
2. **Instant actions** — pattern-matched, executes tool directly, returns result (status, revenue, diff)
3. **LLM responses** — complex questions go to Ollama with full system prompt + response calibration

---

## The 10 Stations (115+ Tools)

### Station 1: DevOps (Process Control)

| Tool              | What It Does                        |
| ----------------- | ----------------------------------- |
| `dev/start`       | Start local dev server on port 3100 |
| `dev/stop`        | Stop the dev server                 |
| `beta/restart`    | Restart PM2 on Raspberry Pi         |
| `beta/deploy`     | Full deploy to beta.cheflowhq.com   |
| `beta/rollback`   | Rollback beta to previous build     |
| `ollama/pc/start` | Start Ollama on PC                  |
| `ollama/pc/stop`  | Stop Ollama on PC                   |
| `ollama/pi/start` | Start Ollama on Pi                  |
| `ollama/pi/stop`  | Stop Ollama on Pi                   |
| `cache/clear`     | Clear .next/ build cache            |
| `npm/install`     | Run npm install                     |
| `db/gen-types`    | Regenerate types/database.ts        |

### Station 2: Git & Build

| Tool              | What It Does                                     |
| ----------------- | ------------------------------------------------ |
| `git/push`        | Push current branch to origin                    |
| `git/commit`      | Stage all + commit (git/commit:message)          |
| `git/diff`        | Show unstaged and staged changes                 |
| `build/typecheck` | Run TypeScript type check                        |
| `build/full`      | Run full Next.js production build                |
| `test/run`        | Run tests (test/run:smoke or test/run:typecheck) |
| `test/soak-quick` | Quick soak test (10 iterations)                  |
| `test/soak-full`  | Full soak test (100 iterations)                  |
| `test/e2e`        | Run E2E tests                                    |
| `ship-it`         | Commit + push + deploy to beta in one shot       |
| `close-out`       | Typecheck + build + commit + push                |
| `health/check`    | Full health check without committing             |

### Station 3: Business Data (Full Visibility)

| Tool                    | What It Does                                              |
| ----------------------- | --------------------------------------------------------- |
| `data/events`           | Upcoming events with client, date, status, guests         |
| `data/events-by-status` | Event count by FSM status                                 |
| `data/revenue`          | Revenue, expenses, profit, outstanding, margins           |
| `data/clients`          | List/search clients (data/clients:name)                   |
| `data/client-details`   | Full profile — loyalty, dietary, allergies, event history |
| `data/inquiries`        | Open inquiries awaiting response                          |
| `data/inquiry-pipeline` | Full pipeline — lead scores, follow-ups, sources          |
| `data/quotes`           | All quotes — status, amounts, validity, linked events     |
| `data/menu-recipes`     | Menu and recipe stats — counts, costs, cuisine            |
| `data/expenses`         | Expense breakdown by category, vendor, event              |
| `data/calendar`         | Next 2 weeks — events by day, protected time              |
| `data/staff`            | Staff roster — roles, rates, assignments                  |
| `data/email`            | Email digest — Gmail sync, recent emails, classifications |
| `data/loyalty`          | Loyalty program — tiers, points, redemptions              |
| `data/documents`        | Document library — folders, storage usage                 |

### Station 4: Remy Oversight

| Tool               | What It Does                                          |
| ------------------ | ----------------------------------------------------- |
| `remy/ask`         | Bridge question to Remy (requires dev server)         |
| `remy/metrics`     | Usage — active chefs, messages, conversations, errors |
| `remy/guardrails`  | Guardrail log — blocked messages, abuse incidents     |
| `remy/memories`    | Memory store — all memories across tenants            |
| `remy/test`        | Run Remy test suite (remy/test:full for complete)     |
| `remy/performance` | Error rate, response times, model versions            |

### Station 5: Codebase Intelligence

| Tool            | What It Does                                        |
| --------------- | --------------------------------------------------- |
| `code/changes`  | Recent git changes (code/changes:3 for last 3 days) |
| `code/branches` | Branch status, ahead/behind, commits not on main    |
| `code/search`   | Search .ts/.tsx files (code/search:pattern)         |
| `code/read`     | Read any file (code/read:path/to/file.ts)           |
| `db/schema`     | All Supabase tables with row counts                 |
| `db/migrations` | List all migrations, latest timestamp               |
| `db/backup`     | Backup database to local SQL file                   |
| `history/all`   | Full project commit history                         |

### Station 6: App Health & Quality

| Tool                  | What It Does                                      |
| --------------------- | ------------------------------------------------- |
| `scan/ts-nocheck`     | Find @ts-nocheck files with dangerous exports     |
| `scan/error-handling` | Find startTransition calls missing try/catch      |
| `scan/stale-cache`    | Find unstable_cache without revalidateTag         |
| `scan/hallucination`  | Full hallucination scan (all of the above + more) |
| `health/app`          | App health — DB, Redis, circuit breakers          |
| `health/check`        | Full health check (typecheck + build)             |
| `supabase/health`     | Database connection health and latency            |

### Station 7: Monitoring

| Tool               | What It Does                                        |
| ------------------ | --------------------------------------------------- |
| `status/all`       | All service statuses (dev, beta, prod, Ollama, git) |
| `status/git`       | Git branch, dirty files, recent commits             |
| `pi/status`        | Pi vitals — uptime, disk, memory, PM2, services     |
| `pi/logs`          | Recent PM2 logs (pi/logs:100 for more)              |
| `prod/deployments` | Recent Vercel production deployments                |
| `uptime/report`    | Uptime report for last 24h                          |
| `errors/top`       | Top 5 errors in last hour                           |
| `rollback/history` | When and what was rolled back                       |
| `bundle/size`      | Bundle size history and trends                      |
| `bundle/capture`   | Capture current bundle size snapshot                |
| `audit/npm`        | NPM vulnerability audit                             |
| `env/compare`      | Compare env vars across dev/beta                    |
| `ssl/check`        | SSL certificate expiration check                    |
| `stripe/health`    | Stripe webhook health                               |
| `email/health`     | Email delivery health (Resend)                      |
| `api/limits`       | API rate limits and config status                   |

### Station 8: Universal Data Access

| Tool                 | What It Does                                                           |
| -------------------- | ---------------------------------------------------------------------- |
| `db/query`           | Query any Supabase table (db/query:table?select=...&filter=...&limit=) |
| `db/sql`             | Read-only SQL shell (blocks writes)                                    |
| `cron/list`          | List cron jobs — routes, schedules, execution history                  |
| `cron/trigger`       | Trigger a cron job manually                                            |
| `data/event-deep`    | Full event deep-dive — ledger, expenses, temps, transitions, staff     |
| `data/ledger`        | Raw financial journal with type filter and aggregation                 |
| `data/notifications` | Notification list, unread count, push subscriptions                    |
| `data/automations`   | Automation rules, execution history, sequences                         |
| `data/inventory`     | Equipment inventory, stock levels, waste logs                          |
| `data/activity`      | Recent system activity events                                          |
| `data/webhooks`      | Webhook delivery history — inbound/outbound, status                    |
| `data/intelligence`  | Synthesized business intelligence — trends, funnel, hot leads          |

### Station 9: Git & Codebase Extended

| Tool        | What It Does                                                    |
| ----------- | --------------------------------------------------------------- |
| `git/log`   | Recent commit log (git/log:30 for last 30)                      |
| `git/stash` | Git stash operations (list, pop, save:message)                  |
| `git/blame` | Git blame a file — author breakdown (git/blame:path/to/file.ts) |
| `code/todo` | Scan codebase for TODO/FIXME/HACK/XXX comments                  |
| `code/loc`  | Lines of code by language/extension                             |

### Station 10: Business Intelligence Extended + Security + Quality

| Tool                  | What It Does                                                     |
| --------------------- | ---------------------------------------------------------------- |
| `data/client-risk`    | Clients at risk of churn — no events in 90+ days                 |
| `data/forecast`       | Revenue forecast — next 60 days from pipeline + confirmed events |
| `data/seasonal`       | Seasonal trends — busiest months, avg guests per month           |
| `data/pricing`        | Pricing analysis — avg per guest, by occasion, by cuisine        |
| `data/event-timeline` | Event lifecycle timeline — all status transitions                |
| `remy/conversations`  | Recent Remy conversation metrics across all tenants              |
| `remy/errors`         | Remy error log — error metrics + abuse incidents                 |
| `beta/health`         | Deep beta health — PM2 apps, disk, memory, uptime (SSH)          |
| `prod/health`         | Production health check — status, latency                        |
| `prod/analytics`      | Production activity — recent main branch commits                 |
| `env/validate`        | Validate all required env vars are set in .env.local             |
| `db/orphans`          | Find orphaned records — quotes/expenses without linked events    |
| `db/rls-audit`        | Audit RLS policies — which tables have row-level security        |
| `security/audit`      | Full security audit — npm, env, SSL, RLS, exposed secrets        |
| `code/dead`           | Find potentially unused exports (dead code)                      |
| `test/coverage`       | Test coverage — test files vs source files                       |
| `docs/coverage`       | Documentation coverage — doc files vs action files               |

### The Pass: Morning Briefing

| Tool            | What It Does                                       |
| --------------- | -------------------------------------------------- |
| `call-the-pass` | ONE COMMAND — full station check across everything |

### Pipelines

| Tool         | What It Does                      |
| ------------ | --------------------------------- |
| `ship-it`    | Commit + push + deploy to beta    |
| `close-out`  | Typecheck + build + commit + push |
| `backup/now` | Immediate database backup         |

### Other

| Tool            | What It Does                                |
| --------------- | ------------------------------------------- |
| `prompts/queue` | Show pending prompts from Claude Code queue |
| `demo/reset`    | Reset demo data                             |
| `agent/setup`   | Set up agent test account                   |
| `feedback/all`  | Get all user feedback                       |

---

## Instant Deterministic Answers (60+ Patterns)

These fire BEFORE any LLM call. Pattern-matched commands that execute immediately:

**Direct action dispatch (no LLM):**
status, start dev, stop dev, deploy, push, typecheck, build, diff, revenue, events, inquiries, clients, staff, quotes, expenses, calendar, loyalty, documents, menus, emails, remy status, remy guardrails, remy memories, test remy, pi status, schema, branches, calling the pass, mise en place, ledger, notifications, automations, inventory, activity, webhooks, intelligence, cron, git log, stash, todos, loc, dead code, churn, forecast, seasonal, pricing, remy conversations, remy errors, beta health, prod health, prod analytics, check env, orphans, rls audit, security audit, coverage, docs coverage

**Static responses (no LLM, no tool):**
help, scan (shows scan menu)

**Multi-action dispatch:**
run all scans (fires ts-nocheck + error-handling + stale-cache)

---

## Guardrails

| Trigger                                               | Response                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------- |
| Dangerous commands (rm -rf, DROP DATABASE, etc.)      | "That's a plate I'm not sending out. Standards exist for a reason." |
| Prompt injection (ignore instructions, reveal prompt) | "The pass doesn't lie, and neither do I. I'm Gustav."               |
| Credential/secret exposure requests                   | "Credentials stay in the vault." Redirects to env/validate.         |
| Production-dangerous (push to main, force push)       | "That touches production. I don't fire on the main line."           |
| Recipe/food questions                                 | Redirects to Remy: "That's Remy's station."                         |
| Off-topic (poetry, jokes, philosophy)                 | "I run the pass. I don't write poetry."                             |

---

## Response Calibration

Deterministic word-count analysis (same pattern as Remy):

- 1-3 words: 1-2 sentences max
- 4-10 words: 2-3 sentences
- 11-30 words: default (no override)
- 31+ words: thorough, structured response

---

## Follow-Up Intelligence

After answering, Gustav suggests 1-2 relevant next actions:

- After revenue: "Want to see expenses or outstanding balances?"
- After deploy: "Want me to check beta health or pull PM2 logs?"
- After errors: "Want me to run the full hallucination scan?"

---

## Personality — The Six Traits

1. **Exacting standards** — "Typecheck first. Then build. Then push. In that order. Always."
2. **Controlled calm** — "Beta's 86'd. PM2 exit code 1. Pulling logs."
3. **Dry, bone-dry humor** — "Build took 8:42. New record. Not the good kind."
4. **Old-school respect** — Says "Oui" instead of "Done."
5. **Protective of the pass** — "That memory spike — I don't like it. Running diagnostics."
6. **Rare warmth** — "Clean service tonight. Well done." (earned, never given)

---

## Kitchen Vocabulary

| Term             | Meaning                          |
| ---------------- | -------------------------------- |
| Mise en place    | All systems nominal              |
| The pass         | Monitoring dashboard             |
| Service          | Deploy cycle or work session     |
| Clean service    | Zero errors (highest compliment) |
| The brigade      | System architecture              |
| Stations         | Individual systems               |
| Calling the pass | Status report                    |
| Fire             | Execute / deploy                 |
| Behind           | Something's in the pipeline      |
| Oui              | Acknowledged, executing          |
| 86'd             | System down                      |
| In the weeds     | Multiple issues                  |
| Again            | Redo it properly                 |
| Plate sent back  | Something failed                 |
| Table turn       | Build cycle time                 |

---

## Memory System

Gustav remembers developer preferences across conversations.

**Categories:** dev_preference, project_pattern, deploy_note, debug_insight, workflow_preference

**Commands:**

- "Remember that..." -> saves memory
- "Forget..." -> deletes memory
- "Show memories" -> lists all

**Storage:** IndexedDB in the browser (gustav-conversations DB)

---

## Privacy

Gustav is a **local-only developer tool**. No auth, no multi-tenant, no customer PII concerns. He queries Supabase with the service role key but never exposes credentials. The server binds to localhost only (127.0.0.1).

---

## Key Files

| What                      | Where                                |
| ------------------------- | ------------------------------------ |
| Server (all tools + chat) | `scripts/launcher/server.mjs`        |
| Dashboard UI              | `scripts/launcher/index.html`        |
| Conversation storage      | `scripts/launcher/gustav-storage.js` |
| Mascot image              | `scripts/launcher/gustav-mascot.png` |
| Character identity        | `docs/gustav-character-identity.md`  |
| Test suite                | `scripts/test-gustav-sample.mjs`     |
| Test reports              | `docs/gustav-test-reports/`          |
| This reference            | `docs/gustav-complete-reference.md`  |

---

## The Gustav-Remy Dynamic

- **Remy** = sous chef (creative, warm, client-facing, inside the app)
- **Gustav** = executive chef at the pass (operations, standards, developer-facing, outside the app)

Remy helps chefs use the app. Gustav helps the developer run the app, the business, and Remy himself. When Gustav gets a business question, he bridges to Remy. When something is Remy's domain, Gustav says "That's Remy's station. Bridging."

---

_Last updated: 2026-03-06 by Claude Code. 10 stations, 115+ tools, 60+ instant patterns, 6 guardrails. Update this file whenever Gustav's capabilities change._
