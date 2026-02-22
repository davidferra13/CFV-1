# Remy E2E Test Session — Bug Found & Fixed

**Date:** 2026-02-22
**Branch:** `feature/risk-gap-closure`

---

## What Was Tested

Comprehensive Playwright E2E smoke tests across all Remy infrastructure:

| #   | Test                                     | Result                              |
| --- | ---------------------------------------- | ----------------------------------- |
| 1   | Sign-in with agent account               | PASS                                |
| 2   | Dashboard loads                          | PASS                                |
| 3   | Remy FAB button visible                  | PASS                                |
| 4   | Remy drawer opens on FAB click           | PASS                                |
| 5   | Remy drawer closes on Escape             | PASS                                |
| 6   | /commands page loads                     | PASS                                |
| 7   | Command textarea present                 | PASS                                |
| 8   | Quick prompt buttons (4)                 | PASS                                |
| 9   | Command execution pipeline               | PASS (after fix)                    |
| 10  | Drawer textarea found                    | PASS                                |
| 11  | Drawer chat SSE response                 | PASS                                |
| 12  | Remy history page (/remy)                | PASS                                |
| 13  | Public Remy API (POST /api/remy/public)  | PASS (200)                          |
| 14  | Client Remy API (POST /api/remy/client)  | PASS (401 — correctly rejects chef) |
| 15  | Chef Remy Stream (POST /api/remy/stream) | PASS (200, text/event-stream)       |

**Final score: 15/15 PASS, 0 FAIL**

---

## Bug Found & Fixed

### The Bug

The **Ask Remy command center** (`/commands`) was returning HTTP 500 on every command execution. The error:

```
A "use server" file can only export async functions, found object.
```

### Root Cause

`lib/ai/chef-profile-actions.ts` had `'use server'` at line 1 but exported three non-async values:

1. `export const CULINARY_QUESTIONS = [...]` — an array constant
2. `export type CulinaryQuestionKey` — a type alias
3. `export interface CulinaryProfileAnswer` — an interface

Next.js strictly enforces that `'use server'` files can ONLY export async functions. Any other export (constants, types, interfaces, objects) causes a runtime 500 error when the server action is invoked.

### The Fix

Created `lib/ai/chef-profile-constants.ts` (no `'use server'` directive) and moved the constants + types there. Updated imports in:

- `lib/ai/chef-profile-actions.ts` — imports from constants file
- `app/(chef)/settings/culinary-profile/page.tsx` — imports type from constants file

### Why the Drawer Wasn't Affected

The Remy drawer uses the `/api/remy/stream` route (an API route, not a server action). It doesn't import from `chef-profile-actions.ts` at the server action level — it calls `getCulinaryProfileForPrompt()` which is an async function (valid export). The error only triggered when the command center called `runCommand()` as a server action, which imported `getCulinaryProfile` from the same module tree.

---

## Data Context

The agent test account (`agent@chefflow.test`) has:

- **0 clients** — client-related commands return "not found" (expected)
- **0 events** — event-related commands return "No upcoming events found" (expected)
- **Recipes present** — recipe commands work with real data
- **$0 revenue** — financial summary correctly shows zero (expected)

---

## Test Script

`test-remy.ts` — reusable Playwright E2E test. Run with:

```bash
npx tsx test-remy.ts
```

Screenshots saved to `test-screenshots/`.

---

## Files Changed

| File                                            | Change                                                        |
| ----------------------------------------------- | ------------------------------------------------------------- |
| `lib/ai/chef-profile-constants.ts`              | **NEW** — constants + types extracted from actions file       |
| `lib/ai/chef-profile-actions.ts`                | Removed `export const/type/interface`, imports from constants |
| `app/(chef)/settings/culinary-profile/page.tsx` | Updated type import path                                      |
| `test-remy.ts`                                  | Updated E2E test script                                       |
