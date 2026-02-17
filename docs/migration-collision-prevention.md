# Migration Timestamp Collision Prevention

## Date

2026-02-17

## Problem

When running multiple Claude Code agents concurrently (e.g., six at once), each agent independently generates migration files. Since agents don't share state, two or more agents can pick the same timestamp prefix for their migration filenames. This causes **migration collisions** - two `.sql` files with identical timestamps that Supabase cannot reliably order.

### Example of the collision found

```
supabase/migrations/20260220000002_client_conversation_create.sql
supabase/migrations/20260220000002_client_reviews.sql
```

Two completely unrelated migrations sharing `20260220000002`. Supabase sorts migrations lexicographically by filename, so the execution order becomes alphabetical by the description suffix - which is arbitrary and can break if either migration has dependencies.

## Root Cause

No rule existed telling agents to **check existing migration files before choosing a timestamp**. Each agent simply picked a reasonable-looking timestamp in isolation.

## Fix

Added a **Migration Timestamp Collisions** rule to `CLAUDE.md` under the Database Migrations section. Since every Claude Code agent reads `CLAUDE.md` at conversation start, this rule applies globally to all agents.

The rule requires agents to:

1. **Glob `supabase/migrations/*.sql`** before creating any new migration
2. Pick a timestamp **strictly higher** than the highest existing one
3. Never reuse or guess a timestamp

## Residual Risk

There is still a small window where two agents could glob simultaneously, both see the same highest timestamp, and both pick the same next number. This is unlikely in practice because:

- Agents typically don't create migrations at the exact same instant
- The rule dramatically reduces the collision surface compared to no rule at all

If this becomes a recurring problem, a stronger mitigation would be using actual clock-time timestamps (`YYYYMMDDHHMMSS`) instead of sequential numbers, making collisions nearly impossible.

## Files Changed

- `CLAUDE.md` - Added "Migration Timestamp Collisions" subsection under Database Migrations

## Lesson

When running concurrent AI agents against a shared filesystem, any file-naming convention based on sequential numbers or date prefixes is vulnerable to collisions. Shared rules (via `CLAUDE.md`) are the primary coordination mechanism between agents - use them proactively for any resource that multiple agents might create simultaneously.
