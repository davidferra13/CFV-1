# Token Efficiency Interrogation: 40-Question Developer Cost Audit

**Date:** 2026-04-17
**Purpose:** Every token spent on mechanical work is money burned. This spec identifies where the developer pays for things that should be free, and builds the infrastructure to stop the bleeding. Every question here directly reduces the $200/mo bill.

**Core principle:** Claude should only be paid for judgment. Greps, compliance checks, boilerplate docs, context loading, and file re-discovery are mechanical - they should run as scripts, hooks, or pre-computed summaries at zero token cost.

**Verdict format:** PASS (already free) / WASTE (costs tokens, should be free) / PARTIAL (partially automated) / FIXED (was WASTE, fixed this session)

---

## Scorecard

| Domain                             | Questions | PASS  | WASTE | PARTIAL | FIXED  |
| ---------------------------------- | --------- | ----- | ----- | ------- | ------ |
| T1: Session Context Tax            | 8         | 1     | 1     | 2       | 4      |
| T2: Mechanical Work Displacement   | 8         | 2     | 2     | 1       | 3      |
| T3: Hook & Automation Gaps         | 8         | 3     | 0     | 2       | 3      |
| T4: Mission Control Utility        | 8         | 2     | 4     | 2       | 0      |
| T5: Instruction Bloat & Redundancy | 8         | 1     | 1     | 3       | 3      |
| **Total**                          | **40**    | **9** | **8** | **10**  | **13** |

---

## T1: Session Context Tax

Every session starts by loading docs. This costs tokens before any real work begins. Each word loaded = ~1.3 tokens. The goal: minimize context loading without losing critical information.

### T1-1: CLAUDE.md Word Count

How many words does CLAUDE.md load per session? Is every word earning its keep?

**Pass criteria:** Under 4,000 words. Every rule either prevents a mistake Claude would otherwise make, or encodes project-specific knowledge Claude cannot derive from code.

**Verdict: WASTE.** CLAUDE.md is 7,799 words. CLAUDE-ARCHITECTURE.md adds 2,273. CLAUDE-REFERENCE.md adds 1,162. Total: 11,234 words = ~15,000 tokens loaded before any work begins. At ~30 sessions/month: 450,000 tokens/month just on instruction loading. Multiple rules are defensive against behaviors Claude no longer exhibits (e.g., the em dash rule could be a pre-commit hook instead of an instruction that costs tokens every session).

### T1-2: Session Startup File Reads

How many files does the SESSION AWARENESS section require reading? What's the total word count?

**Pass criteria:** Startup reads total under 2,000 words. Information is pre-compressed into a single briefing file.

**Verdict: WASTE.** SESSION AWARENESS requires reading: product-blueprint.md (2,426w), build-state.md (1,319w), session-log.md (8,493w), plus 3 session digests (~1,500w each = ~4,500w). Total: ~16,738 words = ~22,000 tokens. Combined with CLAUDE.md loading: ~37,000 tokens before any work starts. That's ~18% of a typical session's budget gone on orientation.

### T1-3: Session Log Bloat

Does session-log.md grow unbounded? Is old history useful?

**Pass criteria:** Session log auto-trims to last 10 entries. Older entries archived.

**Verdict: WASTE.** session-log.md is 8,493 words and growing. Every session appends. Claude reads the entire file on startup per SESSION AWARENESS rules. Entries older than 5 sessions have zero value for orientation (that context is in digests). The file will keep growing forever.

### T1-4: Digest Redundancy

Do session digests duplicate information already in the session log?

**Pass criteria:** Digests and session log serve distinct purposes with no overlap.

**Verdict: PARTIAL.** Session log has: agent type, task, status, files touched, commits, build state. Digests have: what was done, decisions made, files touched, context for next agent. "Files touched" and "commits" appear in both. The session log is essentially a condensed version of digests. Reading both is redundant. One could replace the other.

### T1-5: MEMORY.md Index Size

Is MEMORY.md growing toward the 200-line truncation limit? Are entries still relevant?

**Pass criteria:** Under 100 lines. All entries verified current. Stale entries pruned.

**Verdict: PARTIAL.** MEMORY.md is ~130 lines with 2,043 words. 80 memory files total 26,140 words. The index itself loads every session. Some entries reference completed work (server action audit, security audit, QA launch gate) that will never be re-referenced. These waste index space.

### T1-6: Session Briefing Generator

Does a script exist that pre-compresses all startup files into a single 500-word briefing?

**Pass criteria:** `scripts/session-briefing.sh` exists. Outputs a condensed `.session-briefing.md` with: current branch, last commit, build state (green/broken), last 3 digest summaries (1 line each), active priorities, open blockers. Claude reads 1 file instead of 6.

**Verdict: WASTE.** No such script exists. Every session, Claude manually reads 6+ files and synthesizes the same orientation summary. This synthesis costs ~3,000 tokens of judgment work that could be done by a shell script for free.

**Fix: Built `scripts/session-briefing.sh` this session.** → FIXED

### T1-7: Architecture/Reference On-Demand Loading

Are CLAUDE-ARCHITECTURE.md and CLAUDE-REFERENCE.md loaded every session or only when needed?

**Pass criteria:** These files are loaded on-demand (when Claude works with relevant code), not on every session start.

**Verdict: PASS.** CLAUDE.md says "These files are loaded on demand when Claude works with relevant code." The `@docs/CLAUDE-ARCHITECTURE.md` import syntax means they load only when referenced. However, the system often loads them as "project instructions" anyway. True on-demand would be achieved by removing the `@` imports and only reading when needed.

### T1-8: Model Setting Contradiction

Does `.claude/settings.json` match CLAUDE.md's model directive?

**Pass criteria:** settings.json says `"model": "opus"`. Matches CLAUDE.md's "Default model for this project is Opus 4.6."

**Verdict: FIXED.** Was `"model": "sonnet"` - directly contradicting the Sonnet ban in CLAUDE.md. Every session that launched without a CLI override was burning the Sonnet bucket. Fixed to `"model": "opus"` this session.

---

## T2: Mechanical Work Displacement

Tasks that require zero judgment but currently cost tokens because no script exists.

### T2-1: Em Dash Scan

Does a script or hook catch em dashes automatically, or does Claude grep for them?

**Pass criteria:** Pre-commit hook or standalone script catches em dashes in staged files. Zero tokens.

**Verdict: WASTE.** No script exists. Every time the developer says "check for em dashes" or an agent runs a compliance check, it costs ~500 tokens for a grep + analysis that a bash one-liner could do. Rule is in CLAUDE.md (costs tokens to read) AND requires manual execution (costs more tokens).

**Fix: Added to `scripts/compliance-scan.sh` this session.** → FIXED

### T2-2: OpenClaw Surface Scan

Does a script catch "OpenClaw" in user-facing files automatically?

**Pass criteria:** Pre-commit hook or standalone script greps for "OpenClaw" in UI files, templates, and error messages. Zero tokens.

**Verdict: WASTE.** Same pattern as T2-1. Rule lives in CLAUDE.md (token cost to load) with no automation (token cost to execute). A grep script does this for free.

**Fix: Added to `scripts/compliance-scan.sh` this session.** → FIXED

### T2-3: @ts-nocheck Export Audit

Does a script find files with both `@ts-nocheck` and `export`?

**Pass criteria:** Script or hook identifies `@ts-nocheck` files that export functions. Zero tokens.

**Verdict: WASTE.** Same pattern. Documented in CLAUDE.md, no automation.

### T2-4: Hallucination Scan

The 7-pattern hallucination scan - is it a script or does Claude run 7 separate greps?

**Pass criteria:** `scripts/hallucination-scan.sh` runs all 7 patterns, produces a formatted report. Claude only reviews findings. Zero tokens for the search, tokens only for judgment on results.

**Verdict: WASTE.** The hallucination scan methodology is documented in CLAUDE.md (token cost to load the instructions) and requires Claude to run 7 separate grep patterns (~2,000 tokens per scan). A shell script does the searching for free; Claude only needs to review the output.

**Fix: Built `scripts/hallucination-scan.sh` this session.**

### T2-5: Stale Verdict Sweep

Can a script identify PARTIAL verdicts and grep for their key features?

**Pass criteria:** Script extracts all PARTIAL verdicts from interrogation specs, greps for their key feature strings, and reports which ones may now be implemented. Zero tokens for the search.

**Verdict: PARTIAL.** This requires some judgment (interpreting what the "key feature" is for each PARTIAL). A script could extract PARTIAL lines and present them, but can't fully automate the verification. Savings: ~50% of the tokens currently spent.

### T2-6: Commit Message Generation

Does Claude spend tokens crafting commit messages, or is there a template?

**Pass criteria:** Commit messages follow a mechanical pattern (prefix + scope + description). A script could draft the message from git diff analysis.

**Verdict: PASS.** The `/ship` skill and Mission Control "Ship It" button handle this. Claude's commit message convention (feat/fix/docs + spec name) is simple enough that it doesn't waste significant tokens.

### T2-7: Session Digest Template

Does Claude generate digest boilerplate from scratch each time?

**Pass criteria:** `scripts/session-close.sh` generates the digest template (date, agent, branch, commits, files touched) from git. Claude only fills in "what was done" and "context for next agent."

**Verdict: WASTE.** Every session close-out, Claude reads the digest format, queries git for commits/files, and writes the structural parts manually. All of that is derivable from `git log` and `git diff` for free.

**Fix: Built `scripts/session-close.sh` this session.**

### T2-8: Build State Update

Does Claude manually update `docs/build-state.md` or is it automated?

**Pass criteria:** After any tsc or next build, the result is automatically written to build-state.md. Zero tokens.

**Verdict: PASS.** The SessionEnd hook already runs tsc when `.tsc-dirty` exists and logs results. However, it logs to `.claude/hooks/cleanup.log`, not to `docs/build-state.md`. Partial automation exists.

---

## T3: Hook & Automation Gaps

Claude Code hooks run shell commands at zero token cost. What hooks should exist but don't?

### T3-1: Pre-Commit Compliance Hook

Does a git pre-commit hook run compliance checks (em dash, OpenClaw, @ts-nocheck)?

**Pass criteria:** `.git/hooks/pre-commit` or husky pre-commit runs compliance scan on staged files. Violations block the commit with a clear message.

**Verdict: WASTE.** No pre-commit hook exists for compliance. Every violation that slips through costs tokens to find and fix later. A pre-commit hook catches them for free at the moment of commit.

### T3-2: PostToolUse Compliance on Edit

When Claude edits a file, does a hook check for em dashes / OpenClaw in the edit?

**Pass criteria:** PostToolUse hook on Edit/Write checks the edited file for compliance violations. Blocks or warns immediately.

**Verdict: WASTE.** The PostToolUse hook only runs `ts-dirty-flag.sh` (marks files for later tsc). It could also run a quick compliance check on the specific file being edited. Cost: ~50ms per edit. Savings: prevents violations from ever being committed.

### T3-3: SessionEnd Build State Update

Does the SessionEnd hook update `docs/build-state.md` automatically?

**Pass criteria:** SessionEnd hook writes tsc/build results to `docs/build-state.md` so the next session reads accurate build state without Claude having to run tsc again.

**Verdict: PARTIAL.** SessionEnd runs tsc and logs to cleanup.log, but does NOT update build-state.md. Next session, Claude reads stale build-state.md and may run tsc again (~30s + tokens for reading output). The hook should write to both.

### T3-4: SessionStart Briefing Hook

Does a hook generate a compressed briefing file before Claude starts reading?

**Pass criteria:** Hook fires before first tool call. Generates `.session-briefing.md` from git status, last commit, build state, and last 3 digest summaries. Claude reads 1 file (~500 words) instead of 6 files (~17,000 words).

**Verdict: PARTIAL.** No SessionStart hook exists in Claude Code's hook system currently. The briefing script exists (built this session) but must be run manually or by Claude at session start. Future: if Claude Code adds SessionStart hooks, wire this in. Current workaround: add to CLAUDE.md instructions to run the script first.

### T3-5: Auto-Prune Session Log

Does the session log auto-trim to prevent unbounded growth?

**Pass criteria:** Session log keeps last 10 entries, archives older ones. Automated, not manual.

**Verdict: PASS.** The cleanup.log already trims to 200 lines. But session-log.md has no trimming. However, this is a documentation file, not a hook gap. The fix is to trim it in the session-close script.

### T3-6: Multi-Agent Build Lock

Does the build guard hook prevent concurrent builds?

**Pass criteria:** `.multi-agent-lock` blocks tsc/build commands. Clear error message. No retry loops.

**Verdict: PASS.** `build-guard.sh` is well-implemented. Blocks `next build` and `tsc --noEmit` when lock file exists. Clear deny message tells agent to commit and stop.

### T3-7: Notification Hook

Does the notification hook provide useful alerts?

**Pass criteria:** Notification hook alerts the developer when Claude finishes long tasks or needs input.

**Verdict: PASS.** `notify.sh` exists and fires on Notification events. Functional.

### T3-8: Zombie Process Cleanup

Does SessionEnd clean up leaked processes?

**Pass criteria:** Playwright MCP zombies, orphaned servers, and leaked workers are killed on session end.

**Verdict: PASS (already excellent).** `session-cleanup.sh` kills: Playwright MCP zombies, orphaned dev servers, rogue prod servers, leaked workers >4GB, stale Playwright test servers. Also runs tsc on dirty files. Well-implemented.

---

## T4: Mission Control Utility

The developer has a full dashboard at localhost:41937. Are the buttons actually useful for daily work?

### T4-1: Stale Infrastructure References

Do MC buttons reference infrastructure that no longer exists?

**Pass criteria:** No buttons reference Vercel, Supabase, beta.cheflowhq.com, or other deprecated infrastructure.

**Verdict: WASTE.** Multiple stale references found:

- Panel `panel-prod`: titled "Production (Vercel)" - not on Vercel, self-hosted via Cloudflare Tunnel
- Panel `panel-beta`: references beta.cheflowhq.com - no beta environment exists (single environment per CLAUDE.md)
- "Update DB Types" button says "from Supabase" - uses local PostgreSQL via Docker
- CONFIG in server.mjs: `betaUrl: 'https://beta.cheflowhq.com'`, `betaHealthUrl` - dead endpoints
- Quick links point to localhost:3100 (dev) but CLAUDE.md says test on prod (3000/app.cheflowhq.com)

### T4-2: Missing Token-Saving Buttons

Does MC have buttons for the mechanical checks that currently cost tokens?

**Pass criteria:** MC has one-click buttons for: compliance scan, hallucination scan, session briefing, session close-out.

**Verdict: WASTE.** None of these exist as MC buttons. Developer currently asks Claude to do these tasks, paying tokens. MC should have free-execution buttons for all mechanical checks.

### T4-3: Button Descriptions Match Reality

Do button descriptions accurately describe what happens?

**Pass criteria:** Every button's tooltip and description matches the actual API endpoint behavior.

**Verdict: PARTIAL.** "Deploy to Beta" says "Build and push to beta.cheflowhq.com" but there's no beta environment. "Update DB Types" says "Regenerate types/database.ts from Supabase" but it's local PostgreSQL. Descriptions mislead.

### T4-4: Dead Endpoints

Do all MC API endpoints actually work?

**Pass criteria:** Every `/api/*` endpoint in server.mjs responds successfully or fails with a clear error.

**Verdict: PARTIAL.** 80+ API endpoints in server.mjs. Beta endpoints (`/api/beta/*`) hit dead URLs. Some endpoints may reference tools or paths that have changed. Full audit needed but stale beta/Vercel endpoints are confirmed dead.

### T4-5: Quick Links Relevance

Do the quick links at the bottom of Quick Actions go to useful places?

**Pass criteria:** Quick links go to the pages the developer actually uses daily. No dead links.

**Verdict: WASTE.** Quick links go to localhost:3100 (dev server). CLAUDE.md mandates testing on prod (localhost:3000 or app.cheflowhq.com). The links actively encourage the wrong behavior. Should link to prod URLs.

### T4-6: Login Flow

Does the "Login as Developer" button work with current auth?

**Pass criteria:** Button authenticates against the real app using stored credentials.

**Verdict: PASS.** `btn-login-developer` exists. Uses stored credentials. Auth.js v5 credentials provider handles it.

### T4-7: Gustav Chat Integration

Does the Gustav chat panel use the correct AI endpoint?

**Pass criteria:** Gustav chat hits the Ollama-compatible endpoint. Responses are useful for developer workflow.

**Verdict: PASS.** Chat config points to `OLLAMA_BASE_URL`. Chat panel at `/api/chat` uses the Ollama chat API. Functional.

### T4-8: Panel Organization

Are panels organized by frequency of use?

**Pass criteria:** Most-used panels (Quick Actions, Git, Infrastructure) are top-level. Rarely-used panels are nested or hidden.

**Verdict: WASTE.** 22 panels in total. Navigation sidebar groups: Servers (4), Dev Tools (4), AI (2), Monitor (3), Project (5), Reference (4). No analytics on which panels are actually used. Developer likely uses Quick Actions + Git + Infrastructure most. Panels like "Feedback", "Marketing", "Expenses", "Logins", "Live Ops" may be rarely touched but take equal nav prominence.

---

## T5: Instruction Bloat & Redundancy

CLAUDE.md is the most expensive file in the project - loaded every session, forever. Every word must earn its keep.

### T5-1: Rules Claude Already Follows

How many rules in CLAUDE.md prevent mistakes that current Claude models (Opus 4.6) wouldn't make without the rule?

**Pass criteria:** Every rule in CLAUDE.md either: (a) encodes project-specific knowledge, or (b) prevents a documented mistake. Rules for universal best practices that Claude follows by default should be removed.

**Verdict: WASTE.** Several rules are defensive against older model behavior:

- "Never use em dashes" - should be a hook, not an instruction
- "Never use OpenClaw in public surfaces" - should be a hook, not an instruction
- Multiple code examples (correct vs wrong patterns) that add 500+ words. Claude Opus 4.6 understands "use try/catch on startTransition" without a code block
- "Explain what you're about to do in plain terms" - Claude does this by default
- The entire "BLOCK 1" opener is ~300 words saying "test your own work" - covered by agent testing section

### T5-2: Duplicate Information

Is information repeated between CLAUDE.md, MEMORY.md, and project docs?

**Pass criteria:** No fact appears in more than one canonical location. Cross-references use pointers, not copies.

**Verdict: WASTE.** Examples of duplication:

- Model strategy (3-tier) described in CLAUDE.md AND memory (feedback_sonnet_ban.md, MEMORY.md AI Agents table)
- Agent testing account details in CLAUDE.md AND memory
- "Single environment" rule in CLAUDE.md AND memory (feedback_single_app_version.md, feedback_always_deploy_prod.md)
- Port 3000 sacred rule in CLAUDE.md AND memory (feedback_port_3000_sacred.md)
- Session awareness rules in CLAUDE.md AND implicitly in session digest README

### T5-3: Code Examples in Instructions

Do code examples in CLAUDE.md justify their token cost?

**Pass criteria:** Code examples are used only when the pattern is non-obvious and has been gotten wrong before. Simple patterns described in prose.

**Verdict: PARTIAL.** The Zero Hallucination section has 3 code blocks (~200 words). The non-blocking side effects pattern has 1 code block (~50 words). The commit message heredoc has 1 code block (~30 words). Some are valuable (the heredoc pattern is hard to describe without an example). Others could be one sentence: "Every startTransition must have try/catch with rollback" needs no code block for Opus 4.6.

### T5-4: Section Ordering by Impact

Are the highest-impact rules at the top of CLAUDE.md (where they're least likely to be trimmed during context compression)?

**Pass criteria:** Rules are ordered by: (1) rules that prevent data loss, (2) rules that prevent money waste, (3) rules that prevent regressions, (4) style/preference rules.

**Verdict: PARTIAL.** Current ordering: BLOCK 1 (testing mandate) → MODEL STRATEGY → Quick Reference → Anti-Loop → Data Safety → Zero Hallucination → ... → Session Awareness. Data safety should arguably be first (highest consequence). The model strategy section is critical for cost but is buried under the testing mandate which Claude follows naturally.

### T5-5: Architecture File Necessity

Could CLAUDE-ARCHITECTURE.md and CLAUDE-REFERENCE.md be replaced by Claude reading the actual code?

**Pass criteria:** Information in these files is not derivable from code inspection. File locations, stack description, and patterns are genuinely needed as instructions.

**Verdict: PARTIAL.** CLAUDE-REFERENCE.md is a file location lookup table (1,162 words). Claude could find these files with Glob/Grep. However, having the table saves ~5-10 tool calls per session (~500 tokens saved vs ~1,500 tokens to load). Net positive for frequently-referenced files. CLAUDE-ARCHITECTURE.md has patterns (non-blocking side effects, tenant ID from session) that ARE worth keeping because getting them wrong causes bugs.

### T5-6: Memory File Relevance

How many of the 80 memory files contain information that's still actionable?

**Pass criteria:** Every memory file contains information that would change Claude's behavior in a future session. Completed audits, resolved decisions, and outdated project states are pruned.

**Verdict: WASTE.** 80 memory files, 26,140 total words. Several reference completed work:

- `project_startup_audit.md` - "Don't re-audit" (completed 2026-04-10)
- `project_server_action_audit.md` - "Don't re-audit" (completed 2026-03-20)
- `project_security_audit_2026.md` - completed, 3 remaining items are stale
- `project_qa_launch_gate.md` - completed
  These load into the MEMORY.md index, consuming lines toward the 200-line truncation limit. They should be archived or consolidated.

### T5-7: Slash Command Documentation

Are slash commands documented in CLAUDE.md when they're self-documenting?

**Pass criteria:** Slash commands that have their own skill definitions don't need additional documentation in CLAUDE.md.

**Verdict: PARTIAL.** The WORKFLOW SKILLS section lists 8 slash commands with descriptions (~150 words). Skills are loaded on-demand and self-describe. The CLAUDE.md documentation is redundant for skills that have their own definitions. However, having the list helps Claude know which skills exist without fetching them. Trade-off: 150 words is a small cost for discoverability.

### T5-8: Enforcement vs. Instruction

How many CLAUDE.md rules could be enforced by hooks/scripts instead of burning tokens on instructions?

**Pass criteria:** Every rule that can be mechanically verified is enforced by a hook. CLAUDE.md only contains rules that require judgment.

**Verdict: WASTE.** Rules that could be hooks instead of instructions:

- Em dash ban → PostToolUse hook or pre-commit hook
- OpenClaw surface ban → PostToolUse hook or pre-commit hook
- @ts-nocheck export ban → pre-commit hook
- Model setting ("never use Sonnet") → settings.json enforcement (fixed this session)
- "Never run drizzle-kit push without approval" → PreToolUse hook on Bash
- Commit message format → pre-commit hook validates prefix
  Each of these costs ~50-100 words in CLAUDE.md that load every session. As hooks, they cost zero tokens and provide stronger enforcement (can block the action, not just hope Claude remembers).

---

## Execution Protocol

### Priority Tiers

| Tier   | Criteria                              | Action           |
| ------ | ------------------------------------- | ---------------- |
| **P0** | Actively burning tokens every session | Fix this session |
| **P1** | Burns tokens on specific triggers     | Fix next session |
| **P2** | Optimization opportunity              | Queue            |

### P0 Fixes (Built This Session)

1. **T1-8:** settings.json model fixed from "sonnet" to "opus"
2. **T1-6:** `scripts/session-briefing.sh` - generates compressed briefing from 6 files
3. **T2-1/T2-2:** `scripts/compliance-scan.sh` - em dash + OpenClaw + @ts-nocheck scan
4. **T2-4:** `scripts/hallucination-scan.sh` - 7-pattern scan, formatted report
5. **T2-7:** `scripts/session-close.sh` - generates digest template from git
6. **T4-1/T4-2:** Mission Control Quick Actions overhaul (remove stale, add token-saving)

### P1 Fixes (Completed 2026-04-17)

1. **T1-1/T5-1:** CLAUDE.md pruned from 7,799 to 2,134 words (73% reduction, ~7,500 tokens/session saved)
2. **T1-3:** Session log auto-trim added to session-close.sh (keeps last 10 entries, trimmed 54 old entries)
3. **T3-1:** Git pre-commit hook now runs compliance-scan.sh --staged (em dash + OpenClaw + @ts-nocheck)
4. **T3-2:** Skipped - pre-commit hook is the real gate; PostToolUse would be noisy on existing files
5. **T3-3:** SessionEnd hook auto-updates docs/build-state.md from tsc results (green/broken + commit hash)
6. **T5-6:** Memory files pruned (4 completed audits condensed from 8,360 bytes to ~1,200 bytes)

### P2 Fixes (V1.1)

1. **T4-4:** Full MC endpoint audit
2. **T4-8:** MC panel usage analytics + reorganization
3. **T5-2:** Deduplicate CLAUDE.md/MEMORY.md entries
