# Universal Intake Pipeline - Build Spec

> Status: SPEC READY
> Author: Claude Opus 4.6 + David
> Date: 2026-04-26
> Priority: P0

## Context

The persona pipeline (15 scripts, built Apr 25 in one session) works but is manual, unreliable, and chef-only. This spec transforms it into a universal, autonomous, remotely-accessible intake system that runs 24/7 for $0.

**Core principle:** 3977 is the single funnel for ALL developer input. Local AI processes everything into documents. Claude/Codex only gets involved when the developer says "build."

## Current State (Honest)

- 15 devtools scripts, ~5 actively used
- Inbox server (3977) running but manually started, dies on reboot
- Analyzer fails 88% of runs (1/9 success in last cycle) - model too small, timeouts
- Only Chef personas accepted (all 6 other type directories empty)
- Validator biased toward chef ops terms - non-chef personas score low
- Zero automation - every pipeline step is manual trigger
- No remote access - localhost only
- `persona-autopilot.mjs` is dead code (0% build success, Codex-era)
- Hermes is NOT installed (binary/config missing from WSL despite memory saying otherwise)

## What We're Building (4 Work Packages)

---

### WP-1: Fix Pipeline Reliability

**Goal:** Analyzer succeeds >80% of runs instead of 12%.

**Changes:**

1. **`devtools/persona-analyzer.mjs`** - Change default model
   - Current default: `qwen3:4b` (too small, truncates, empty responses)
   - New default: `gemma4:e4b` (best local model, already loaded in Ollama)
   - Change the env var fallback chain: `PERSONA_ANALYZER_MODEL` -> `PERSONA_MODEL` -> `gemma4:e4b`
   - Find the line that sets the default model and change it

2. **`devtools/persona-analyzer.mjs`** - Fix timeout handling
   - Current: Ollama calls timeout and the orchestrator records a failure
   - New: Increase timeout to 120s (Gemma 4 is slower but smarter), add retry with exponential backoff (max 2 retries), log each attempt
   - If all retries fail, write a partial report with what was received instead of recording total failure

3. **`devtools/persona-orchestrator.mjs`** - Auto-trigger on new input
   - Current: must run `node devtools/persona-orchestrator.mjs --once` manually
   - New: the inbox server (3977) calls the orchestrator automatically after saving a new persona file
   - In `persona-inbox-server.mjs`, after the file is saved to disk (in the `/import` POST handler), spawn the orchestrator as a child process: `spawn('node', ['devtools/persona-orchestrator.mjs', '--once', '--file', savedFilePath])`
   - Add a `--file` flag to orchestrator that processes just one specific file instead of scanning the whole directory
   - The orchestrator already has `pipelineRunning` guards - respect them. If pipeline is busy, queue the file (the inbox server already has queueing logic)

4. **`devtools/persona-orchestrator.mjs`** - Auto-trigger synthesis
   - After a successful orchestrator run (analyzer + planner both succeed), automatically run batch synthesis
   - `spawn('node', ['devtools/persona-batch-synthesizer.mjs'])` as a post-processing step
   - Only trigger if >= 2 new reports exist since last synthesis (don't synthesize after every single persona)

**Test:** Submit a persona via 3977 dashboard. It should automatically: save file -> run analyzer (gemma4:e4b) -> run planner -> run synthesis (if threshold met). Check `system/persona-pipeline-state.json` for success.

---

### WP-2: Universal Input Types

**Goal:** 3977 accepts ideas, bugs, notes, feature requests, and critiques - not just personas.

**Changes:**

1. **`devtools/persona-inbox-server.mjs`** - New input type system
   - Add a new constant: `const INPUT_TYPES = ['persona', 'idea', 'bug', 'feature', 'note', 'critique'];`
   - The submit form (HTML in the server) gets a dropdown: "What is this?" with options for each type. Default: auto-detect.
   - The `/preview` endpoint adds type classification. If user selected "auto-detect", use a simple keyword heuristic (not Ollama - this needs to be instant):
     - Contains "bug", "broken", "crash", "error", "fails" -> `bug`
     - Contains "add", "build", "feature", "want", "need", "should" -> `feature`
     - Contains "idea", "what if", "imagine", "could we" -> `idea`
     - Contains profile/persona structure markers -> `persona`
     - Fallback -> `note`
   - The `/import` endpoint saves to different directories based on type:
     - `persona` -> `Chef Flow Personas/Uncompleted/{Type}/` (existing)
     - `idea` -> `system/intake/ideas/`
     - `bug` -> `system/intake/bugs/`
     - `feature` -> `system/intake/features/`
     - `note` -> `system/intake/notes/`
     - `critique` -> `system/intake/critiques/`
   - Each saved file is a markdown file with frontmatter:

     ```markdown
     ---
     type: idea
     submitted: 2026-04-26T14:30:00Z
     status: pending
     source: web-dashboard
     ---

     Add seasonal pricing warnings to the ingredient catalog
     ```

2. **`devtools/persona-inbox-server.mjs`** - Processing routes for non-persona types
   - After saving a non-persona input, queue it for Ollama expansion (not the persona pipeline)
   - New processing function `expandInput(filePath, type)` that:
     - Reads the raw input
     - Sends to Ollama (gemma4:e4b) with a type-specific prompt template
     - Writes the expanded output to `system/intake/processed/{type}/{slug}.md`
   - Prompt templates (one per type, keep them short - Ollama works best with focused prompts):
     - **idea**: "Expand this idea into a mini-spec: what it does, what ChefFlow pages/features it affects, estimated complexity (small/medium/large). Input: {content}"
     - **bug**: "Write a bug report: suspected component/page, reproduction steps (inferred), severity (low/medium/high/critical). Input: {content}"
     - **feature**: "Write a feature brief: user story, acceptance criteria, affected ChefFlow surfaces. Input: {content}"
     - **critique**: "Map this critique to specific ChefFlow pages or workflows. What exactly is wrong and what would 'fixed' look like? Input: {content}"
     - **note**: Store as-is, no Ollama processing. Just tag with extracted topics.
   - Processing is async (don't block the HTTP response). Return immediately after save, process in background.

3. **`devtools/persona-inbox-server.mjs`** - Dashboard updates
   - The existing dashboard HTML shows persona pipeline state
   - Add a new section: "Intake Queue" showing all non-persona submissions across all types
   - Show: type badge, title/excerpt, status (pending/processed/staged), submitted date
   - Add filters by type
   - Add a "Processed" view that shows Ollama-expanded versions

4. **Storage structure:**
   ```
   system/intake/
     ideas/           (raw submissions)
     bugs/
     features/
     notes/
     critiques/
     processed/       (Ollama-expanded versions)
       ideas/
       bugs/
       features/
       critiques/
   ```

**Test:** Submit "add seasonal pricing warnings" as an idea via 3977. It should save to `system/intake/ideas/`, get expanded by Ollama into a mini-spec in `system/intake/processed/ideas/`, and appear in the dashboard intake queue.

---

### WP-3: Fix Validator Bias + Non-Chef Personas

**Goal:** Client, Guest, Vendor, Staff, Partner, and Public personas pass validation fairly.

**Changes:**

1. **`devtools/persona-validator.mjs`** - Expand domain terms by persona type
   - Current: `CHEFFLOW_DOMAIN_TERMS` is one flat array of chef ops terms
   - New: Keep the existing array as `CHEF_DOMAIN_TERMS`. Add type-specific arrays:
     ```js
     const CLIENT_DOMAIN_TERMS = [
       'booking',
       'dietary',
       'allergy',
       'portal',
       'communication',
       'inquiry',
       'quote',
       'payment',
       'menu',
       'tasting',
       'event',
       'guest list',
       'budget',
       'venue',
       'date',
       'headcount',
       'preference',
       'feedback',
       'survey',
       'review',
       'referral',
       'deposit',
       'contract',
       'rsvp',
     ]
     const GUEST_DOMAIN_TERMS = [
       'rsvp',
       'dietary',
       'allergy',
       'survey',
       'feedback',
       'menu',
       'seating',
       'event',
       'ticket',
       'waitlist',
       'check-in',
       'post-event',
       'rating',
       'experience',
       'accommodation',
     ]
     const VENDOR_DOMAIN_TERMS = [
       'invoice',
       'delivery',
       'sourcing',
       'order',
       'catalog',
       'pricing',
       'availability',
       'wholesale',
       'farm',
       'supplier',
       'produce',
       'seasonal',
       'bulk',
       'ingredient',
       'quality',
       'freshness',
     ]
     const STAFF_DOMAIN_TERMS = [
       'schedule',
       'shift',
       'assignment',
       'role',
       'kitchen',
       'prep',
       'service',
       'cleanup',
       'briefing',
       'uniform',
       'certification',
       'availability',
       'training',
       'team',
       'lead',
       'sous',
     ]
     const PARTNER_DOMAIN_TERMS = [
       'co-host',
       'venue',
       'farm',
       'collaboration',
       'revenue share',
       'event',
       'promotion',
       'cross-sell',
       'referral',
       'contract',
       'dinner circle',
       'broadcast',
       'joint',
       'partnership',
     ]
     const PUBLIC_DOMAIN_TERMS = [
       'discover',
       'search',
       'book',
       'browse',
       'review',
       'rating',
       'cuisine',
       'location',
       'availability',
       'price range',
       'menu',
       'portfolio',
       'chef profile',
       'inquiry',
       'contact',
     ]
     ```
   - The `detectProductDrift` function currently compares against `CHEFFLOW_DOMAIN_TERMS`. Change it to accept a `type` parameter and use the appropriate term array.
   - The `validatePersonaContent` function already receives `{ name, type }` options. Pass `type` through to `detectProductDrift`.

2. **`devtools/persona-validator.mjs`** - Relax structure requirements for non-chef types
   - Current: requires identity header matching `**Chef Profile:` pattern
   - New: match `**(Chef|Client|Guest|Vendor|Staff|Partner|Public) Profile:`
   - Already partially there in `detectIdentityHeader` but verify the regex works for all types

3. **`devtools/persona-generator.mjs`** - Add non-chef seed categories
   - Add at least 3 seed categories per non-chef type:
     - Client: "High-Net-Worth Private Dinner Client", "Corporate Event Planner", "Budget Family Meal Prep Client"
     - Guest: "Dietary-Restricted Guest", "First-Time Private Dining Guest", "Frequent Farm Dinner Attendee"
     - Vendor: "Local Farm Supplier", "Specialty Ingredient Distributor", "Equipment Rental Company"
   - Add `--type` CLI flag to generator: `node devtools/persona-generator.mjs --type Client --count 3`
   - Generator prompt templates need to be adapted per type (a Client persona describes their booking journey, not their kitchen operations)

4. **`devtools/persona-generator.mjs`** - Prompt templates per type
   - Current: one prompt template assumes chef
   - New: switch on type to use appropriate prompt. The prompt should ask Ollama to generate a persona that stress-tests ChefFlow FROM THAT TYPE'S PERSPECTIVE:
     - Chef: "How does this chef's operation challenge ChefFlow?" (existing)
     - Client: "How does this client's booking/communication needs challenge ChefFlow?"
     - Guest: "How does this guest's event experience challenge ChefFlow?"
     - Vendor: "How does this vendor's fulfillment workflow challenge ChefFlow?"

**Test:** Generate a Client persona: `node devtools/persona-generator.mjs --type Client --count 1`. It should pass validation with score >= 40. Submit it via 3977. It should be accepted and analyzed.

---

### WP-4: Automation + Remote Access

**Goal:** Pipeline runs 24/7, accessible from anywhere, survives reboots.

**Changes:**

1. **PM2 setup for 3977**
   - Create `ecosystem.config.cjs` entry (or a new file `ecosystem.local.cjs` since the existing one is for Pi):
     ```js
     module.exports = {
       apps: [
         {
           name: 'persona-inbox',
           script: 'devtools/persona-inbox-server.mjs',
           cwd: 'c:/Users/david/Documents/CFv1',
           env: {
             PERSONA_INBOX_TOKEN: '<read from existing env or .env>',
             NODE_ENV: 'production',
           },
           watch: false,
           max_restarts: 10,
           restart_delay: 5000,
         },
       ],
     }
     ```
   - Commands: `pm2 start ecosystem.local.cjs && pm2 save && pm2 startup`
   - The `pm2 startup` command will output a command to run to enable auto-start on Windows boot. Run it.

2. **Scheduled pipeline runs**
   - Add a PM2 cron-restart entry OR use the inbox server's own scheduling
   - Better approach: add a setInterval inside `persona-inbox-server.mjs` that runs the orchestrator every 30 minutes IF there are unprocessed files:
     ```js
     // At server startup, after createServer:
     setInterval(
       async () => {
         const unprocessed = countUnprocessedFiles() // check Uncompleted/ for files not in pipeline state
         if (unprocessed > 0 && !pipelineRunning) {
           console.log(`[auto] ${unprocessed} unprocessed files, triggering pipeline`)
           triggerPipeline() // existing function
         }
       },
       30 * 60 * 1000
     ) // every 30 minutes
     ```
   - Add a similar interval for batch synthesis (every 6 hours):
     ```js
     setInterval(
       async () => {
         const newReportsSinceLastSynthesis = countNewReports() // compare report dates vs last synthesis date
         if (newReportsSinceLastSynthesis >= 2 && !pipelineRunning) {
           console.log(`[auto] ${newReportsSinceLastSynthesis} new reports, running synthesis`)
           runSynthesis() // existing function
         }
       },
       6 * 60 * 60 * 1000
     ) // every 6 hours
     ```

3. **Auto-generation loop**
   - After each batch synthesis, check saturation data (`system/persona-batch-synthesis/saturation.json`)
   - If any persona type has < 3 personas, auto-generate one for that type
   - If any gap category has 0 coverage, auto-generate a persona likely to hit that category
   - Rate limit: max 3 auto-generated per hour, max 10 per day
   - Add tracking to `system/persona-auto-generation.json`:
     ```json
     {
       "last_generated": "2026-04-26T14:30:00Z",
       "today_count": 2,
       "hour_count": 1,
       "history": [...]
     }
     ```

4. **Cloudflare tunnel for 3977**
   - Edit `~/.cloudflared/config.yml` to add one ingress rule:
     ```yaml
     - hostname: inbox.cheflowhq.com
       service: http://127.0.0.1:3977
     ```
   - Add DNS CNAME record for `inbox.cheflowhq.com` pointing to the tunnel (via Cloudflare dashboard or `cloudflared tunnel route dns`)
   - Restart cloudflared: `cloudflared tunnel run`
   - **Auth:** The inbox server already has `PERSONA_INBOX_TOKEN`. The web UI should prompt for this token on first visit and store it in a cookie. Add a simple login page if one doesn't exist.
   - **Optional (recommended):** Add Cloudflare Access policy on `inbox.cheflowhq.com` - free for 1 user, adds email OTP login as a second layer

5. **Build queue staging**
   - New directory: `system/build-queue/`
   - After each batch synthesis, generate priority-ranked build files:
     ```
     system/build-queue/
       001-high-booking-flow-gaps.md
       002-high-seasonal-pricing.md
       003-medium-vendor-portal.md
       ...
     ```
   - Each file contains: gap description, source (which persona/idea/bug found it), confidence level, affected files (from codebase validation), and suggested approach
   - The `/persona-build` skill reads from this queue instead of directly from synthesis
   - 3977 stages candidates for governance; it does not send raw notes directly to code
   - Only V1-governor-approved records enter `system/v1-builder/approved-queue.jsonl`
   - Mission Control reads governed queue state through `/api/v1-builder/summary`

**Test:**

- Reboot PC. Verify 3977 comes back up automatically (PM2).
- Submit a persona from phone via `inbox.cheflowhq.com`. Verify it's received.
- Wait 30 minutes. Verify orchestrator ran automatically.
- Check `system/build-queue/` for staged build documents.

---

## Work Package Dependencies

```
WP-1 (Fix Reliability)  ──┐
                           ├──> WP-4 (Automation)
WP-2 (Universal Input)  ──┘         │
                                     └──> Done
WP-3 (Validator Bias)   ──────────────> Done (independent)
```

WP-1 and WP-2 and WP-3 can run in parallel.
WP-4 depends on WP-1 and WP-2 being done (no point automating a broken pipeline).

## Files Modified

| File                                | WPs              |
| ----------------------------------- | ---------------- |
| `devtools/persona-analyzer.mjs`     | WP-1             |
| `devtools/persona-orchestrator.mjs` | WP-1             |
| `devtools/persona-inbox-server.mjs` | WP-1, WP-2, WP-4 |
| `devtools/persona-validator.mjs`    | WP-3             |
| `devtools/persona-generator.mjs`    | WP-3             |
| `ecosystem.local.cjs` (new)         | WP-4             |
| `~/.cloudflared/config.yml`         | WP-4             |

## Files Created

| File                                  | WP   |
| ------------------------------------- | ---- |
| `system/intake/` directory tree       | WP-2 |
| `system/build-queue/` directory       | WP-4 |
| `system/persona-auto-generation.json` | WP-4 |
| `ecosystem.local.cjs`                 | WP-4 |

## Out of Scope (Deferred)

- Hermes agent (prove scheduled scripts aren't enough first)
- Voice memo input (future, needs speech-to-text)
- Screenshot/image input (future, needs vision model)
- WhatsApp/Telegram bots (developer explicitly rejected these)
- wish.md migration (keep wish.md as separate channel for now; unify later after this works)
