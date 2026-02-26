# AI Policy — Reflection

**Date:** 2026-02-17
**Document:** `docs/AI_POLICY.md`

## What Was Added

A hard-boundary AI policy document that defines exactly where AI is allowed, restricted, and banned within ChefFlow.

## Why This Matters

ChefFlow's architecture is built on three deterministic pillars: the event FSM, the immutable ledger, and tenant isolation. AI features must never compromise any of these. This policy makes that boundary explicit and enforceable.

## The Four Allowed Zones

| Zone                   | Nature                      | Example                           |
| ---------------------- | --------------------------- | --------------------------------- |
| Drafting Assistance    | Chef-controlled output      | Proposal drafts, message rewrites |
| Structured Suggestions | Temporary, accept-to-commit | Pricing ranges, prep timelines    |
| Insight Surfaces       | Read-only analysis          | Revenue trends, margin alerts     |
| NL → Structured Input  | Parse with confirmation     | Inquiry parsing, menu extraction  |

Every zone requires explicit chef confirmation before anything becomes canonical.

## The Four Hard Restrictions

1. **Lifecycle** — AI cannot transition event states
2. **Ledger** — AI cannot write financial entries
3. **Identity** — AI cannot modify roles, tenants, or RLS
4. **Automation** — Nothing auto-sends, auto-confirms, or auto-triggers

## How This Connects to Existing Architecture

- **Event FSM** (`lib/events/transitions.ts`): Only explicit human actions call `transitionEvent()`. AI features must never invoke transition functions.
- **Ledger** (`lib/ledger/append.ts`): `appendLedgerEntry()` is only called from server actions triggered by human intent (payments, refunds via Stripe webhooks, chef-initiated adjustments).
- **Auth** (`lib/auth/actions.ts`): Role assignment and tenant scoping remain fully deterministic.

## Implementation Guideline

When building any AI-assisted feature:

1. AI output goes to a **suggestion buffer** (UI state or temp table), never directly to canonical tables
2. Chef reviews and explicitly accepts
3. Acceptance triggers normal system writes (standard server actions)
4. AI provenance is never stored in canonical records — the record is just a record

## The Litmus Test

> If you unplug AI tomorrow, ChefFlow must still function completely.

Every AI feature should be wrapped in a conditional that, when disabled, leaves the core system fully operational.
