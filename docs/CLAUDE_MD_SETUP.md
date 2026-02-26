# CLAUDE.md — Project Safety Rules Setup

**Date:** 2026-02-17
**Type:** Project configuration

## What Changed

Created a `CLAUDE.md` file in the project root. This file is automatically read by Claude Code at the start of every conversation, acting as a permanent set of rules and guardrails.

## Why This Was Done

ChefFlow V1 is now a live production application with real client data. As development continues — adding new features, modifying existing ones — there's a real risk that an AI-assisted coding session could accidentally:

- Drop a database table or column, destroying data
- Run a destructive migration without the user understanding the consequences
- Modify financial or event data in ways that can't be undone

The `CLAUDE.md` file exists to prevent this by establishing mandatory rules that every future AI session must follow.

## What the Rules Cover

### 1. Data Safety (Highest Priority)

- No migration can contain `DROP TABLE`, `DROP COLUMN`, `DELETE`, or `TRUNCATE` without explicit warning and approval
- No column type changes or renames without explaining the risk first
- All migrations must be additive by default (add, don't remove)
- Full SQL must be shown before any migration file is created
- User must be reminded to back up before applying migrations

### 2. Development Workflow

- Changes must be explained in plain terms before being made
- Every code change requires a follow-up `.md` document
- Feature branches for new work (not direct commits to `main`)

### 3. Architecture Reminders

- Existing patterns (server actions, role checks, tenant scoping, ledger model) are documented so they're consistently followed

### 4. Key File Locations

- Quick reference table so Claude doesn't need to search for core files every session

## How It Connects to the System

The `CLAUDE.md` file is a project-level configuration mechanism. It lives alongside the code and is version-controlled, meaning:

- It persists across every conversation
- It can be updated as the project evolves
- It serves as documentation for any developer (human or AI) working on the project
- It protects against the most dangerous failure mode: accidental data loss in production

## Additional Recommendations

For maximum data protection, the user should also:

1. **Enable Supabase backups** — Point-in-Time Recovery (PITR) on the Pro plan allows restoring to any second. Daily backups are available on the free plan.
2. **Review migration SQL** before running `supabase db push` — the `CLAUDE.md` rules enforce this, but the user should build this habit independently.
3. **Use preview deploys** on Vercel to test changes before they go to the live site.
