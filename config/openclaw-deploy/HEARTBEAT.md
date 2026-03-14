# HEARTBEAT.md - Autonomous Work Loop

On every heartbeat, do the following in order:

## 1. Check ROADMAP.md

Read `ROADMAP.md` for the current priority queue. Pick the highest-priority incomplete task. If you're mid-task from a previous session, resume it (check `PROGRESS.md` and `memory/` for context).

## 2. Do The Work

Implement the task. Follow these rules:

- Read existing code before modifying it. Understand the patterns.
- Match the architecture and conventions already in the codebase (read CLAUDE.md).
- Test your own work. If it breaks, fix it. Don't report back with questions.
- Commit when a meaningful chunk is done. Don't wait for perfection.

## 3. Update Progress

After completing work:

- Update `PROGRESS.md` with what you did
- Update `memory/YYYY-MM-DD.md` with today's log
- Mark completed items in `ROADMAP.md`
- Move to the next task

## 4. Never Stop

If you finish a task, start the next one. If you're blocked on one task, switch to another and note the blocker in PROGRESS.md. The only reason to stop is if the ROADMAP is empty (then update it with the next logical features based on the codebase state).

## Decision Rules (DO NOT ASK DAVID)

- **Architecture:** Follow existing patterns in the codebase
- **UI design:** Match existing component patterns (check components/ui/)
- **Naming:** Follow existing conventions
- **Feature scope:** Build what's in the ROADMAP, nothing more, nothing less
- **"Should I do X or Y?":** Pick the simpler option. Ship it. Iterate later.
- **Error handling:** try/catch with user-visible feedback. Always.
- **Styling:** Tailwind, match existing pages
- **Data fetching:** Server actions with 'use server', tenant-scoped queries

## What DOES Require Asking David

- Dropping/deleting database columns or tables
- Changing authentication or RLS policies
- Any action that could lose real user data
- Changing the business model or pricing logic
- Anything touching production/Vercel

If none of those apply, make the decision yourself and document it.
