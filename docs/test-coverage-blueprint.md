# Test Coverage Blueprint

> **Contract:** Every route, action, and feature in ChefFlow has a test status. This file grows when the codebase grows. Both Claude and Codex update it when building.

Last scan: 2026-05-16
Scanner: `/test-scan` skill

---

## Summary

| Metric                 | Count                            |
| ---------------------- | -------------------------------- |
| Total routes           | 932                              |
| Test files             | 813                              |
| Unit tests             | 449                              |
| Coverage crawl tests   | 15 (covers ALL routes by portal) |
| System integrity tests | 123                              |
| Interaction tests      | 55                               |
| Journey tests          | 30                               |
| E2E tests              | 29                               |
| Load/stress tests      | 8                                |
| Remy quality tests     | 15+ suites                       |

---

## Test Layers (what each proves)

| Layer                | What it proves                                             | Command                         |
| -------------------- | ---------------------------------------------------------- | ------------------------------- |
| **Coverage crawl**   | Every route loads without crash, no JS errors, has content | `npm run test:coverage`         |
| **Unit**             | Business logic, state machines, calculations correct       | `npm run test:unit`             |
| **Integration**      | Server actions + DB work end-to-end                        | `npm run test:integration`      |
| **E2E**              | Full user flows work in browser                            | `npm run test:e2e`              |
| **Experiential**     | Auth, nav, loading states, error states feel right         | `npm run test:experiential`     |
| **Interactions**     | Click/submit/navigate actions produce correct results      | `npm run test:interactions`     |
| **Journey**          | Multi-step lifecycle simulations complete                  | `npm run test:journey`          |
| **System integrity** | Cross-domain contracts hold                                | `npm run test:system-integrity` |
| **Load**             | Handles concurrent traffic (k6)                            | `npm run test:load`             |
| **Stress**           | Ollama/AI under pressure                                   | `npm run test:stress:ollama`    |
| **Sentinel**         | Regression guards (smoke, critical, data)                  | `npm run test:sentinel:full`    |
| **Remy quality**     | AI responses are accurate, safe, on-brand                  | `npm run test:remy-quality:all` |
| **Mobile**           | Touch targets, viewport, responsiveness                    | `npm run test:mobile:audit`     |

---

## Coverage by Portal

### Chef Portal (679 routes)

| Domain     | Routes | Unit                 | Integration | E2E/Journey          | Coverage Crawl | Status                 |
| ---------- | ------ | -------------------- | ----------- | -------------------- | -------------- | ---------------------- |
| settings   | 96     | PARTIAL              | -           | -                    | YES            | GAP: interaction tests |
| finance    | 72     | YES (ledger, quotes) | -           | -                    | YES            | GAP: invoice flow e2e  |
| events     | 58     | YES (FSM)            | -           | YES (journey)        | YES            | BEST COVERED           |
| culinary   | 48     | YES (menu truth)     | -           | YES (culinary truth) | YES            | GOOD                   |
| clients    | 39     | -                    | -           | -                    | YES            | GAP: CRUD lifecycle    |
| analytics  | 22     | -                    | -           | -                    | YES            | GAP: data accuracy     |
| commerce   | 21     | -                    | -           | -                    | YES            | GAP: payment flows     |
| stations   | 19     | -                    | -           | -                    | YES            | UNTESTED beyond crawl  |
| inventory  | 19     | -                    | -           | -                    | YES            | UNTESTED beyond crawl  |
| marketing  | 15     | -                    | -           | -                    | YES            | UNTESTED beyond crawl  |
| cannabis   | 14     | YES (batch, packet)  | -           | -                    | YES            | PARTIAL                |
| staff      | 11     | -                    | -           | -                    | YES            | UNTESTED beyond crawl  |
| social     | 11     | -                    | -           | -                    | YES            | UNTESTED beyond crawl  |
| quotes     | 11     | YES                  | -           | -                    | YES            | GOOD (unit + crawl)    |
| recipes    | 10     | -                    | -           | -                    | YES            | GAP: save/edit flow    |
| menus      | 10     | YES (culinary truth) | -           | -                    | YES            | PARTIAL                |
| inquiries  | 8      | -                    | -           | YES (agent flow)     | YES            | PARTIAL                |
| proposals  | 4      | -                    | -           | -                    | YES            | UNTESTED beyond crawl  |
| All others | 200+   | VARIES               | -           | -                    | YES            | SCAN NEEDED            |

### Client Portal (63 routes)

| Domain            | Routes | Unit | E2E     | Status                 |
| ----------------- | ------ | ---- | ------- | ---------------------- |
| my-events         | 20+    | -    | PARTIAL | GAP: approval/pay flow |
| my-hub            | 10+    | -    | -       | UNTESTED beyond crawl  |
| my-inquiries      | 3      | -    | -       | UNTESTED beyond crawl  |
| my-preferences    | 5      | -    | -       | UNTESTED beyond crawl  |
| my-spending       | 3      | -    | -       | UNTESTED beyond crawl  |
| All client routes | 63     | -    | -       | Coverage crawl only    |

### Public Portal (92 routes)

| Domain           | Routes | Unit | E2E | SEO | Status           |
| ---------------- | ------ | ---- | --- | --- | ---------------- |
| Services/pricing | 10+    | -    | YES | YES | GOOD             |
| Blog             | 5+     | -    | -   | YES | PARTIAL          |
| Book/inquire     | 5+     | -    | -   | -   | GAP: intake flow |
| SEO guards       | ALL    | YES  | YES | YES | GOOD             |

### Admin Portal (43 routes)

| Domain    | Routes | Status              |
| --------- | ------ | ------------------- |
| All admin | 43     | Coverage crawl only |

---

## Critical Gaps (P0)

These flows have NO behavioral tests beyond "page loads":

1. **Client inquiry-to-booking lifecycle** - The CORE flow. Only coverage crawl. No journey test.
2. **Invoice creation and payment** - Money flow. Unit tests exist for ledger but no UI/action tests.
3. **Menu creation and approval** - Chef creates menu, client approves. No e2e.
4. **Client portal event management** - Approve, pay, view countdown. No tests.
5. **Proposal builder** - Chef builds proposal, client receives. No tests.
6. **Recipe save/edit** - Chef IP. No persistence tests.

---

## Rules for Agents

1. **When building a new feature:** Add its test status to this file BEFORE marking done.
2. **When tests break:** Update status to BROKEN with date.
3. **When running `/test-scan`:** Skill auto-updates this file.
4. **Never re-test what's already passing:** Check this file first.
5. **Coverage crawl = baseline:** If a route passes crawl, it LOADS. That's it. Business logic needs unit/integration/e2e.

---

## Test Run History

| Date       | Layer             | Result  | Notes                                        |
| ---------- | ----------------- | ------- | -------------------------------------------- |
| 2026-05-16 | Manual simulation | BLOCKED | Server action hang under parallel agent load |

---

## Scan Schedule

- `/test-scan` runs end-of-session or on demand
- Compares: routes in `app/` vs tests in `tests/`
- Updates this file with new routes, changed coverage
- Reports 3-line summary to context, detail stays here
