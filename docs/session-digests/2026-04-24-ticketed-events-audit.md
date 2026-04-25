# Session Digest: Ticketed Events Deep Audit

**Date:** 2026-04-24
**Agent:** Builder (Opus 4.6)
**Branch:** main
**Type:** Research/audit (no code changes)

## What Was Done

Full deep audit of the Codex-built ticketed events feature. Read every file, traced every dependency, identified 5 critical bugs blocking the feature from working.

| Finding                                | Severity | Detail                                                                                                  |
| -------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `event_share_settings` table missing   | CRITICAL | All ticket code queries this table. It was never created. Migration line 101 ALTERs non-existent table. |
| `public-event-view.tsx` missing        | CRITICAL | Server component imports it, file doesn't exist. Public page crashes.                                   |
| Wrong shareToken in event detail       | HIGH     | Passes `event_shares.share_token` (doesn't exist, column is `.token`) to tickets tab. Always null.      |
| `event_guests.event_share_id` NOT NULL | MEDIUM   | Ticket webhook can't create guest records (caught by try/catch, non-blocking).                          |
| No ledger entry for ticket revenue     | MEDIUM   | Ticket sales invisible in financial views.                                                              |

## Decisions Made

**Architecture decision:** Create `event_share_settings` as a NEW table, not reuse `event_shares`. Reason: `event_shares` requires `created_by_client_id NOT NULL` (client-owned RSVP links). Ticketing is chef-owned, no client. All existing ticket code already references `event_share_settings` so zero code changes needed for the table name.

## Context for Next Agent

**The handoff prompt is at:** `docs/prompts/palace-audit-agent-6-ticketed-events.md` (original) but a REFINED, complete handoff prompt was generated during this session. The developer has it.

**Key facts for the next agent:**

1. Migration SQL is drafted and ready for developer approval (creates `event_share_settings`, makes `event_guests.event_share_id` nullable, adds `is_co_host` to `hub_group_members`)
2. Latest migration timestamp: `20260424000004`. Use `20260425000001`.
3. After migration, highest-leverage single action: create `public-event-view.tsx` (unblocks the entire public purchase flow)
4. The verify prompt at `prompts/03-ticketed-events-verify.md` documents bugs #1 and #3 but was never executed
5. No code was modified this session. All changes are documentation/analysis.

Build state on departure: unchanged (no code changes)

## Artifacts Produced

| File                                              | Purpose                                                                     |
| ------------------------------------------------- | --------------------------------------------------------------------------- |
| `docs/specs/build-ticketed-events-migration.md`   | Build spec for Codex Agent 1: write migration SQL file                      |
| `docs/specs/build-ticketed-events-public-view.md` | Build spec for Codex Agent 2: create public-event-view.tsx                  |
| `docs/specs/build-ticketed-events-wiring.md`      | Build spec for Codex Agent 3: fix event detail page + tickets tab + webhook |

All 3 agents are independent (zero file overlap) and can run in parallel.
