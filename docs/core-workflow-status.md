# Core Workflow Status

> Last verified: (not yet run)

This document tracks the health of ChefFlow's 6 core workflows — the irreducible minimum a private chef needs to run their business.

## Core Workflows

| #   | Workflow                     | Status          | Last Tested | Notes                                                                    |
| --- | ---------------------------- | --------------- | ----------- | ------------------------------------------------------------------------ |
| 1   | **Inquiry → Event creation** | ⬜ Not verified | —           | Public inquiry form → client + event created → appears in pipeline       |
| 2   | **Quote creation & sending** | ⬜ Not verified | —           | Event → quote draft → PDF preview → send to client                       |
| 3   | **Payment tracking**         | ⬜ Not verified | —           | Ledger entry → payment status derived → financial summary updates        |
| 4   | **Event lifecycle (FSM)**    | ⬜ Not verified | —           | draft → proposed → accepted → paid → confirmed → in_progress → completed |
| 5   | **Client communication**     | ⬜ Not verified | —           | Chat thread → message sent → notification delivered                      |
| 6   | **Menu & recipe management** | ⬜ Not verified | —           | Recipe CRUD → menu assembly → event menu assignment                      |

## Verification Checklist

For each workflow, verify:

- [ ] **Happy path works end-to-end** — the primary use case completes without error
- [ ] **Data persists correctly** — refresh the page, data is still there
- [ ] **Error states are handled** — bad input shows a user-visible error, not a blank screen
- [ ] **Financial math is correct** — unit tests in `tests/unit/ledger.*.test.ts` and `tests/unit/quotes.*.test.ts` pass

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

| Date | Workflow | Change           | Verified By |
| ---- | -------- | ---------------- | ----------- |
| —    | —        | Document created | —           |
