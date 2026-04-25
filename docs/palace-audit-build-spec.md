# Palace Audit Build Spec (2026-04-24)

> Generated from a full MemPalace sweep of 535+ sessions, 47 session digests, 50 memory files, 48 specs.
> This is the execution plan. Each section = one agent handoff.

---

## AGENT 1: Foundation Cleanup (MUST RUN FIRST)

**Goal:** Fix the lies in the memory system so every future agent starts with truth.

### Tasks

1. **Fix MEMORY.md monetization index entry**
   - File: `C:\Users\david\.claude\projects\c--Users-david-Documents-CFv1\memory\MEMORY.md`
   - Current (WRONG): `project_monetization_shift.md` line says "All features free. No Pro tier. Revenue via voluntary supporter contributions only. No paywalls, no Pro badges."
   - Correct: "Two-tier Free/Paid model enforced via requirePro(). March 2026 'all free' experiment reversed."
   - This is the #1 most dangerous stale entry. Every new agent reads MEMORY.md first.

2. **Update stale CIL memory**
   - File: `memory/project_continuous_intelligence_layer.md`
   - Problem: Describes CIL as a future vision ("Spec to be written", "persistent daemon", single `cil.db`). But Phase 1+2 is BUILT (per-tenant `storage/cil/{tenantId}.db`, no daemon, 7 signal sources).
   - Fix: Add a status header noting Phase 1+2 built 2026-04-18, architecture changed from vision. Link to `project_cil_phase1_ready.md` as the current truth.

3. **Mark live ops testing as expired**
   - File: `memory/project_live_ops_testing.md`
   - Problem: "Duration: 2-4 weeks starting April 6." Today is April 24. Window is over. No results captured.
   - Fix: Add note that testing window expired. No formal results were captured. If results exist in session digests, summarize them.

4. **Mark validation phase as de facto ended**
   - File: `memory/feedback_anti_clutter_rule.md`
   - Problem: Says "No new features without validated user feedback. Effective 2026-04-01." Reality: 3 weeks of heavy building followed.
   - Fix: Add note acknowledging the phase was overridden by development momentum. The rule is aspirational, not operational.

5. **Resolve E-Phone Book / Directory identity crisis**
   - Files: `memory/project_ephonebook_vision.md`, `memory/project_food_directory_vision.md`, `memory/project_platform_vision.md`
   - Problem: Three overlapping visions for consumer food discovery. Never resolved.
   - Fix: Add clarifying notes to each. E-Phone Book is superseded by the /nearby directory vision. Platform Vision's "consumer-first" framing is aspirational; current product is chef-ops-first. /nearby is hidden until OpenClaw data quality improves.

6. **Update David's Docket AI model reference**
   - File: `memory/project_davids_docket.md`
   - Problem: References "qwen2.5-coder:7b" as Ollama fallback. Gemma 4 expansion happened April 18.
   - Fix: Verify current model on Pi, update memory if changed.

7. **Prune MEMORY.md index to stay under 200 lines**
   - The index is at 204 lines (truncating). Consolidate entries. Move completed audit items to a "Completed Audits" section or remove them entirely.

### Verification

- Read MEMORY.md after changes; confirm monetization line is correct
- Read each updated memory file; confirm no contradictions remain
- `wc -l MEMORY.md` < 200

---

## AGENT 2: Codex Schema Reconciliation

**Goal:** Determine which Codex-defined tables actually exist in the live DB. Generate missing migrations or remove phantom schema definitions.

### Context

Codex expanded `lib/db/schema/schema.ts` by +326 lines defining 6 new tables and modifying 4 existing tables. Only 1 migration exists (making 5 event columns nullable). The Drizzle schema and live DB are likely out of sync.

### Tasks

1. **Query live DB for each Codex table**
   Use the postgres MCP (read-only) or `psql` to check:

   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN (
     'chef_location_links', 'planning_runs', 'planning_run_artifacts',
     'ingredient_knowledge', 'ingredient_knowledge_slugs',
     'chef_marketplace_profiles', 'directory_listing_favorites'
   );
   ```

2. **Check modified columns on existing tables**
   For each modified table (`partner_locations`, `communication_events`, `conversation_threads`, `guest_count_changes`), query `information_schema.columns` to see if Codex columns exist.

3. **For tables/columns that DON'T exist:** Generate proper additive migration SQL. Use timestamp `20260424100001` or higher. Show the SQL to the developer for approval. Do NOT run `drizzle-kit push`.

4. **For tables/columns that DO exist:** Codex may have used `drizzle-kit push` (prohibited). Document which ones are already applied. No migration needed.

5. **For phantom schema definitions (tables defined in schema.ts but not needed):** Flag for developer decision: keep or remove from schema.ts.

6. **Update memory file** `memory/project_codex_schema_sync_gap.md` with findings.

### Verification

- Every table in schema.ts has a matching migration or is confirmed to exist
- `npx tsc --noEmit --skipLibCheck` still passes
- Memory file updated with resolution status

---

## AGENT 3: Runtime Blocker Fixes

**Goal:** Fix known 500 errors in committed code on main.

### Tasks

1. **Fix `/clients/[id]/relationship` 500 error**
   - Root cause: import chain `parse-ollama -> chat-insights -> insights/actions` causes runtime error
   - This blocks the Ledger-Backed NBA feature from working
   - Trace the import chain, find the broken link, fix it
   - The fix is likely a missing `'use server'` directive or a client/server boundary violation

2. **Fix Client Profile Engine event surface errors**
   - Codex item #5 was "blocked by pre-existing runtime errors on the event surface"
   - Check `app/(chef)/events/[id]/page.tsx` for errors when CP-Engine tables don't exist
   - The CP-Engine was designed to "fail closed" (null profileGuidance), verify this actually works

3. **Triage 4 uncommitted Codex items**
   - `git stash show stash@{2}` to see the Codex backup stash (997+ files)
   - The 4 uncommitted items: Canonical Intake Lanes, Ledger-Backed NBA, Tasks Create Path, Public Intent Hardening
   - For each: determine if the code is in the current working tree or only in the stash
   - If in working tree and tests pass: commit with `feat(codex): [description]`
   - If lost to stash: note in memory file, don't try to reconstruct

### Verification

- `/clients/[id]/relationship` loads without 500
- Event detail page loads without errors when `client_profile_*` tables are absent
- `git status` shows no uncommitted Codex work at risk
- `npx tsc --noEmit --skipLibCheck` passes

---

## AGENT 4: Receipt Intelligence Migration

**Goal:** Ship built-but-blocked feature with one migration.

### Context

`docs/specs/receipt-intelligence-and-recipe-scaling.md` - Built 2026-04-18, zero LLM dependency, migration never applied. One of the lowest-effort highest-return items.

### Tasks

1. **Find the migration file** - grep for receipt-intelligence or recipe-scaling in `database/migrations/`
2. **If migration file exists:** Show its SQL to developer, explain what it does
3. **If migration file is missing:** Check the spec for schema changes, generate the migration SQL
4. **Apply migration** only with developer approval (this is a CLAUDE.md rule)
5. **Verify the feature works** - test receipt upload + recipe scaling in the real app

### Verification

- Migration applied successfully
- Receipt quantity extraction works in UI
- Recipe scaling works in UI
- `npx tsc --noEmit --skipLibCheck` passes

---

## AGENT 5: Completion Contract Build

**Goal:** Build the P0 Completion Contract from the ready spec.

### Context

Spec: `docs/specs/completion-contract.md` (ready since 2026-04-17). Wraps 20+ scattered completeness systems into unified `CompletionResult` interface. Recursive dependency resolution (Event->Menu->Recipe->Ingredient). Zero new DB tables. 10 new files, 5 existing pages modified.

### Tasks

1. **Read the spec thoroughly:** `docs/specs/completion-contract.md`
2. **Read existing evaluators** it wraps: `getClientProfileCompleteness`, `getMenuHealthData`, `evaluateReadinessForTransition`, `getCriticalPath`
3. **Build the completion engine** in `lib/completion/`:
   - `types.ts` - CompletionResult interface
   - `evaluators/event.ts` - Event completeness (wraps readiness + critical path)
   - `evaluators/menu.ts` - Menu completeness (wraps menu health)
   - `evaluators/recipe.ts` - Recipe completeness (genuinely new logic)
   - `evaluators/client.ts` - Client completeness (wraps profile completeness)
   - `engine.ts` - Recursive resolver
   - `actions.ts` - Server actions
4. **Build the UI** in `components/completion/`:
   - `completion-summary.tsx` - Unified completion view
   - Wire into event detail, client detail, recipe detail, menu detail, dashboard
5. **Follow all CLAUDE.md rules:** auth gates, tenant scoping, cache busting, no em dashes
6. **Test in real app** via Playwright or manual verification

### Verification

- Event detail page shows unified completion status
- Recursive resolution works (event shows menu/recipe/ingredient gaps)
- `npx tsc --noEmit --skipLibCheck` passes
- `npx next build --no-lint` passes

---

## AGENT 6: Ticketed Events Wiring

**Goal:** Wire existing infrastructure into native ticket sales for farm dinners.

### Context

Spec: `docs/specs/ticketed-events-and-distribution.md`. All infrastructure exists (Stripe Connect, Instant Book, RSVP, Hub Circles, Campaigns). Real business need (farm dinner co-hosting). This is a wiring job, not new infrastructure.

### Tasks

1. **Read the spec thoroughly:** `docs/specs/ticketed-events-and-distribution.md`
2. **Read the co-host vision:** `memory/project_farm_dinner_cohost.md`
3. **Read the question set:** `docs/specs/system-integrity-question-set-cohosting.md`
4. **Build ticket support** on existing event model:
   - Add `is_ticketed`, `ticket_price_cents`, `max_tickets`, `tickets_sold` to events (migration)
   - Public event page at `/events/[slug]` with ticket purchase via Stripe Checkout
   - Ticket confirmation flow using existing email system
   - Guest list management from Hub Circle
5. **Wire co-host role** on Hub groups:
   - `co_host` role on `hub_group_members`
   - Co-host can view/edit event details, see guest list, post to circle
6. **Follow all CLAUDE.md rules:** Show migration SQL before writing, auth gates, tenant scoping

### Verification

- Can create a ticketed event
- Public event page shows ticket purchase button
- Stripe Checkout completes and ticket count updates
- Co-host can see and manage the event
- `npx tsc --noEmit --skipLibCheck` passes
- `npx next build --no-lint` passes
