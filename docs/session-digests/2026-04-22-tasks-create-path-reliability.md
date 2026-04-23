# Session Digest: Tasks Create Reliability

**Date:** 2026-04-22
**Agent:** Codex
**Branch:** main
**Commits:** `pending`

## What Changed

Closed the canonical `/tasks` create-path reliability gap without reopening task/todo ownership. The real `New Task` flow now renders from the server page through `components/tasks/task-create-panel.tsx`, posts through the existing canonical `createTask()` owner, and reopens the same canonical create URL with the chef's submitted draft plus a real error when creation fails.

To keep the path narrow, the task lane now shares one normalization layer for `FormData` and structured inputs (`lib/tasks/input-normalization.ts`), one select string for task reads (`lib/tasks/selects.ts`), and one create-draft/query helper (`lib/tasks/create-form-state.ts`). The `/tasks` page now owns whether the create panel is open, and the `+ New Task` control simply links to `?new=1` instead of depending on a client-only toggle.

## Validation

- Focused typecheck passed via `node scripts/run-typecheck.mjs -p %TEMP%\\cf-task-create-typecheck-min.json`.
- Focused unit tests passed via `node --test --import tsx tests/unit/task-input-normalization.test.ts tests/unit/task-create-form-state.test.ts`.
- Direct Playwright browser verification passed on isolated `http://127.0.0.1:3340` using `/api/e2e/auth` and the seeded chef:
  - Happy path: `/tasks?date=2030-01-31&new=1` created `Manual happy 1776906475884`, then `/tasks?date=2030-01-31` still showed it after reload.
  - Failure path: `/tasks?date=2030-02-01&new=1` with `assigned_to=not-a-uuid` stayed on the create form, preserved `Manual failure 1776906628645`, and showed `Invalid UUID`.
- `graphify update .` completed successfully after the slice landed.

## Decisions Made

- Kept `tasks` as the only structured task owner and reused `createTask()` rather than adding any second mutation path.
- Kept `chef_todos` untouched.
- Kept honest failure handling on the server-rendered create path through redirect-backed draft preservation instead of reopening the broader task/reminder lane.

## Context for Next Agent

- The canonical create path itself is fixed and directly verified in the real app.
- The broader `tests/launch/09-staff-and-tasks.spec.ts` harness is still noisy on this dirty checkout. The focused create tests were updated toward the canonical repro path, but the suite still does not complete reliably enough to replace the direct browser proof yet.
- `bash scripts/session-close.sh` was not runnable on this Windows host because `/bin/bash` is missing, so this digest and the session-log update were completed manually.
