# Launch Stabilization Strategy - Senior Engineer Recommendation

**Date:** 2026-04-25
**Author:** Claude Opus 4.6 (senior eng assessment)
**Status:** RECOMMENDATION - requires developer approval

---

## The Honest Assessment

ChefFlow is 95% built and 0% shipped. The gap is not code. The gap is:

1. **730 uncommitted files** sitting on a dirty main branch
2. **25 unreviewed migrations** from Codex (1 has a timestamp collision)
3. **Zero external validation** (no real user has touched it)
4. **The developer (a working chef with ~10 active dinners) is not using his own product**

Building more features will not close any of these gaps. It will widen them.

---

## What Codex Should Build (3 agents, all stabilization)

### Agent 1: Auto-Join Consent Fix

- **Spec:** `codex-launch-stabilization-agent-1.md`
- **What:** Fix silent auto-join on hub group pages (JBUG-015)
- **Scope:** 1 file edit
- **Why:** Last confirmed bug in the JBUG tracker. Consent violation.

### Agent 2: Projected Cost Pipeline Verification

- **Spec:** `codex-launch-stabilization-agent-2.md`
- **What:** Verify the projected cost wiring is complete (partially built, needs confirmation)
- **Scope:** Read 1 file, verify or fix wiring
- **Why:** Pre-event margins are the core value proposition. Must be correct.

### Agent 3: Migration Timestamp Collision Fix

- **Spec:** `codex-launch-stabilization-agent-3.md`
- **What:** Rename duplicate migration timestamp
- **Scope:** 1 file rename
- **Why:** Duplicate timestamps will break deployment.

---

## What Codex Should NOT Build

Everything else. Specifically:

- No new Dinner Circle features (8+ circle specs pending)
- No new station/kitchen features (5+ station specs pending)
- No new consumer-facing features (eat page, open tables)
- No price intelligence expansion (3 OpenClaw specs)
- No new dashboard widgets

These are all good ideas. None of them help ship V1. They add to the 730-file pile.

---

## What the Developer Should Do (Not Codex)

1. **Commit triage** - Organize the 730 files into logical, atomic commits. Push to main.
2. **Run full build verification** - `node scripts/run-typecheck.mjs -p tsconfig.ci.json && npm run build -- --no-lint`
3. **Review the 25 pending migrations** - Check for destructive ops, approve or discard
4. **Deploy** - Push to app.cheflowhq.com
5. **Use ChefFlow for the next dinner** - Enter a real event, real menu, real client. Find what breaks.
6. **Get one other chef to try it** - Even 30 minutes of watching someone else use it reveals more than 100 specs.

---

## What "Done" Actually Looks Like

From the product blueprint V1 exit criteria, only 2 items remain:

1. "At least 1 real chef has used it for 2+ weeks and provided feedback"
2. "Public booking page tested end-to-end by a non-developer"

Both require humans, not code. The feature factory must pause. The shipping factory must start.
