# ChefFlow — Project Handoff

> Current state snapshot for the Continue drafter. Updated by Claude Code.

## Stack

- Next.js 14 (App Router) + TypeScript
- PostgreSQL (Postgres + Auth)
- Stripe (payments)
- Tailwind CSS (dark mode permanent, stone-\* neutrals)
- Ollama (local AI, privacy-first)

## Current Branch

`feature/risk-gap-closure`

## Recent Work

- Dark mode conversion (permanent, site-wide)
- Offline-first architecture (OfflineProvider, sync engine, IDB queue)
- Transparent offline/online status bars
- Landing page warm gradient
- Embeddable inquiry widget
- Grocery quote feature

## Key Patterns

- Server actions with `'use server'` for all business logic
- `requireChef()` / `requireClient()` / `requireAuth()` for role checks
- Tenant ID always from session, never request body
- All money in cents (integers)
- 8-state event FSM: draft → proposed → accepted → paid → confirmed → in_progress → completed | cancelled
- Ledger-first financials — immutable, append-only
- Brand color: terracotta orange #e88f47
- Typography: DM Serif Display (h1) + Inter (body)

## What NOT to Touch

- `types/database.ts` — auto-generated, never edit manually
- Ledger immutability triggers
- Event FSM transition logic (use `transitionEvent()`)
- Auth/middleware without explicit approval
