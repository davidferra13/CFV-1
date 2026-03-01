# Core Workflow Status

> Last verified: 2026-03-01

This document tracks the health of ChefFlow's 6 core workflows — the irreducible minimum a private chef needs to run their business.

## Core Workflows

| #   | Workflow                     | Status        | Last Tested | Notes                                                                     |
| --- | ---------------------------- | ------------- | ----------- | ------------------------------------------------------------------------- |
| 1   | **Inquiry → Event creation** | ✅ Page loads | 2026-03-01  | /inquiries returns 200, content renders                                   |
| 2   | **Quote creation & sending** | ✅ Page loads | 2026-03-01  | /events returns 200, quote creation flow accessible                       |
| 3   | **Payment tracking**         | ✅ Page loads | 2026-03-01  | /finance returns 200, financial summary renders                           |
| 4   | **Event lifecycle (FSM)**    | ✅ Page loads | 2026-03-01  | /events returns 200, FSM transitions defined in lib/events/transitions.ts |
| 5   | **Client communication**     | ✅ Page loads | 2026-03-01  | /clients returns 200, /chat and /inbox load after compilation             |
| 6   | **Menu & recipe management** | ✅ Page loads | 2026-03-01  | /menus and /culinary/recipes return 200                                   |

## Focus Mode Verification

| Feature                    | Status        | Notes                                                                                        |
| -------------------------- | ------------- | -------------------------------------------------------------------------------------------- |
| **Modules page toggle**    | ✅ Working    | Focus Mode toggle renders, shows core modules when ON                                        |
| **Database column**        | ✅ Applied    | `focus_mode` column on `chef_preferences`, defaults `true`                                   |
| **Layout cache**           | ✅ Integrated | `getChefLayoutData()` includes `focus_mode` field                                            |
| **Sidebar filtering**      | ✅ Correct    | `filteredPrimaryItems` filters by `coreFeature` when focusMode ON                            |
| **Sidebar (dev override)** | ⚠️ Note       | `DEMO_MODE_ENABLED=true` makes `isAdmin=true`, bypasses filter. Production behavior correct. |
| **Route gating**           | ✅ Wired      | `requireFocusAccess()` added to travel, staff, tasks, stations, commerce pages               |
| **Remy action filter**     | ✅ Wired      | `getAvailableActions()` integrated into command-orchestrator.ts                              |
| **Unit tests**             | ✅ 5 passing  | FM1–FM5 in tests/unit/focus-mode.test.ts                                                     |

## Additional Pages Tested

| Page              | Status          | Notes                                                 |
| ----------------- | --------------- | ----------------------------------------------------- |
| /dashboard        | ✅ 200          | Core — loads correctly                                |
| /inquiries        | ✅ 200          | Core — loads correctly                                |
| /events           | ✅ 200          | Core — loads correctly                                |
| /clients          | ✅ 200          | Core — loads correctly (slow first compile)           |
| /finance          | ✅ 200          | Core — loads correctly (slow first compile)           |
| /menus            | ✅ 200          | Core — loads correctly                                |
| /culinary/recipes | ✅ 200          | Core — loads correctly                                |
| /schedule         | ✅ 200          | Fixed import order issue (imports after export)       |
| /daily            | ✅ 200          | Core — loads correctly                                |
| /settings/modules | ✅ 200          | Focus Mode toggle visible and functional              |
| /inbox            | ✅ 200          | Loads after initial compilation (~30s)                |
| /chat             | ✅ 200          | Loads after initial compilation                       |
| /activity         | ✅ 200          | Loads correctly                                       |
| /goals            | ⚠️ 500→fixed    | Added error handling (was crashing with no try/catch) |
| /travel           | ⚠️ Pre-existing | useContext null error (unrelated to Focus Mode)       |
| /staff            | ✅ 200          | Loads after initial compilation                       |
| /tasks            | ✅ 200          | Loads correctly                                       |
| /commerce         | ✅ 200          | Loads correctly                                       |

## Verification Checklist

For each workflow, verify:

- [x] **Pages load without 500 errors** — all 6 core workflow pages return 200
- [x] **Focus Mode toggle works** — modules page shows toggle, core modules listed
- [x] **Database migration applied** — focus_mode column exists and defaults to true
- [x] **Unit tests pass** — FM1–FM5 focus mode tests, ledger tests, quote tests
- [ ] **End-to-end flow testing** — requires manual testing with real interactions
- [ ] **Production deployment** — deploy to beta for external testing

## How to Run Verification

```bash
# 1. Run critical unit tests (no server needed)
npm run test:critical

# 2. Run all unit tests
npm run test:unit

# 3. Manual E2E (requires dev server on port 3100)
npm run test:e2e:smoke
```

## Status Legend

| Symbol | Meaning                             |
| ------ | ----------------------------------- |
| ✅     | Verified working                    |
| ⚠️     | Works with known issues (see notes) |
| ❌     | Broken — needs fix                  |
| ⬜     | Not yet verified                    |

## Change Log

| Date       | Workflow   | Change                                              | Verified By |
| ---------- | ---------- | --------------------------------------------------- | ----------- |
| 2026-03-01 | All 6 core | Initial page-load verification (all return 200)     | Claude Code |
| 2026-03-01 | Focus Mode | Toggle, database, sidebar, route gating verified    | Claude Code |
| 2026-03-01 | /schedule  | Fixed import order (imports after export statement) | Claude Code |
| 2026-03-01 | /goals     | Added error handling for failed getGoalsDashboard() | Claude Code |
