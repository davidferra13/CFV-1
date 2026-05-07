# ChefFlow Workflow Domains

> Maps David's daily workflows into domains, tasks, skills, and automations.
> This is the "agentic OS" backbone: what you DO, not where code lives.
>
> **Rule:** When Claude sees a task that matches a workflow domain, use the mapped skill. When a task repeats 3+ times without a skill, create one via `/write-a-skill` and add it here.

---

## Domain Map Overview

```
YOU (David: chef + developer + business owner)
  |
  |-- CLIENT COMMUNICATION ---- respond, update, follow up, acknowledge
  |-- INQUIRY PIPELINE -------- receive, triage, quote, convert
  |-- EVENT OPERATIONS --------- plan, prep, shop, cook, serve, debrief
  |-- RECIPE MANAGEMENT -------- capture, document, scale, cost
  |-- PRICING & COSTING ------- price ingredients, cost menus, margin analysis
  |-- FINANCIAL OPS ------------ track income, expenses, receipts, invoicing
  |-- MARKETING & GROWTH ------ social, reviews, directory, reputation
  |-- INFRASTRUCTURE ----------- servers, Pi, database, deploys, backups
  |-- PRODUCT DEVELOPMENT ------ plan, build, test, ship features
  |-- DATA INTELLIGENCE -------- OpenClaw, PIE, synthesis, coverage
```

---

## 1. CLIENT COMMUNICATION

> **Pain:** Clients sitting in the dark. Reputation bleeding. Friends waiting months.

| Task                                   | Skill                                       | Automation?                | Status  |
| -------------------------------------- | ------------------------------------------- | -------------------------- | ------- |
| Send status update to pending client   | `/quick-update`                             | No                         | BUILT   |
| Acknowledge new inquiry (0-72h window) | `/acknowledge`                              | Yes (on inquiry receive)   | BUILT   |
| Follow up after event                  | `/close-session` covers session, not client | No                         | GAP     |
| Check who hasn't heard from you        | `/client-pulse`                             | Yes (daily morning report) | BUILT   |
| Draft client email (natural voice)     | Remy + email templates                      | No                         | PARTIAL |
| Send menu for approval                 | Menu sharing flow                           | No                         | BUILT   |

**Skills built:**

- `/client-pulse` - Show all clients waiting for a response, ranked by how long they've waited
- `/quick-update` - One-liner status update to a client (picks channel: email/SMS/portal)
- `/acknowledge` - Auto-acknowledge new inquiry within minutes

**Automation candidates:**

- Morning report includes "clients in the dark" section (Hermes)
- Auto-acknowledge trigger on inquiry receipt

---

## 2. INQUIRY PIPELINE

> **Pain:** Take a Chef, Airbnb, direct contacts, chef referrals all hitting from different channels simultaneously.

| Task                                | Skill                    | Automation?   | Status  |
| ----------------------------------- | ------------------------ | ------------- | ------- |
| Receive inquiry from any channel    | Gmail parser, Wix parser | Yes (partial) | PARTIAL |
| Triage inquiry priority             | `/triage`                | No            | BUILT   |
| Extract client details from message | AI NLP parsing           | Yes           | BUILT   |
| Generate quote from inquiry         | Quote builder            | No            | BUILT   |
| Track inquiry-to-booking conversion | Analytics                | Yes (passive) | BUILT   |
| Consolidate multi-channel inquiries | `/inbox-zero`            | Yes           | BUILT   |

**Skills built:**

- `/inbox-zero` - Multi-channel inbox consolidation. All unread items (chat, messages, Wix, notifications, inquiries, Gmail) in one view with triage actions.

---

## 3. EVENT OPERATIONS

> **Pain:** 10+ active dinners. Each has its own prep, shopping, guests, dietary needs. Day-of is chaos without documents ready.

| Task                              | Skill                | Automation? | Status |
| --------------------------------- | -------------------- | ----------- | ------ |
| Plan event from accepted quote    | Event creation flow  | No          | BUILT  |
| Build menu for event              | Menu builder         | No          | BUILT  |
| Generate prep timeline            | Prep timeline engine | No          | BUILT  |
| Generate shopping list            | Grocery list gen     | No          | BUILT  |
| Generate day-of documents         | Document auto-gen    | No          | BUILT  |
| Pack-the-car checklist            | Equipment/packing    | No          | BUILT  |
| Post-event debrief (AAR)          | `/aar` trigger       | No          | BUILT  |
| Simulate event before service day | Service simulation   | No          | BUILT  |
| Check event readiness             | Completion contract  | No          | BUILT  |

**Skills built:**

- `/next-dinner` - What's your next event? Full briefing: menu, guests, dietary, shopping status, prep timeline, what's not ready (includes week-ahead mode)

**Key skills needed:**

- `/week-ahead` - Dedicated weekly view (available as `/next-dinner` week-ahead mode)

**Automation candidates:**

- 48h before event: auto-generate all documents
- Morning of: push "today's dinner" briefing

---

## 4. RECIPE MANAGEMENT

> **Pain:** 500+ recipes in David's head. Zero written down. Re-derives chocolate lava cake every time.

| Task                                 | Skill                      | Automation? | Status  |
| ------------------------------------ | -------------------------- | ----------- | ------- |
| Brain-dump recipe from memory        | `/brain-dump`              | No          | BUILT   |
| Voice-to-recipe (talk through it)    | `/brain-dump` (same flow)  | No          | BUILT   |
| Photo-to-recipe (scan handwritten)   | OCR exists                 | No          | PARTIAL |
| Import from PDF/document             | CSV import, migration      | No          | PARTIAL |
| Scale recipe for guest count         | Scaling engine             | No          | BUILT   |
| Cost recipe with PIE                 | Costing engine + PIE       | No          | BUILT   |
| Track recipe variations              | Variations exist in schema | No          | BUILT   |
| Allergen-check recipe against guests | Dietary cross-check        | No          | BUILT   |

**Skills built:**

- `/brain-dump` - Stream-of-consciousness recipe capture. David talks, AI structures it into recipe format with ingredients, steps, yield. No precision required on first pass.

**Skills built:**

- `/recipe-blitz` - Rapid-fire batch capture: 5-10 recipes per session, bare minimum fields, flesh out later via `/brain-dump`.

---

## 5. PRICING & COSTING

> **Pain:** "Utter dog shit" per David. Clients see wrong prices. Manual costing wastes entire Sundays.

| Task                          | Skill                  | Automation?            | Status |
| ----------------------------- | ---------------------- | ---------------------- | ------ |
| Price an ingredient           | PIE 11-tier resolution | Yes (automatic)        | BUILT  |
| Cost a full menu              | Costing engine         | No                     | BUILT  |
| Check pricing coverage gaps   | `/pie-census`          | No                     | BUILT  |
| Monitor price anomalies       | `/pie-alert`           | Yes (cron)             | BUILT  |
| Expand pricing to new regions | `/pie` commands        | No                     | BUILT  |
| Validate pricing accuracy     | `/pie-accuracy`        | Yes (weekly)           | BUILT  |
| Run nationwide simulation     | `/pie-simulate`        | No                     | BUILT  |
| Query Pi price bridge         | Pi bridge API          | Yes (in resolve chain) | BUILT  |

**This domain is the most mature.** 10+ skills, automations running, 1.1M prices.

---

## 6. FINANCIAL OPS

> **Pain:** Doesn't know how much he makes. Receipts pile up. No P&L.

| Task                               | Skill                  | Automation? | Status |
| ---------------------------------- | ---------------------- | ----------- | ------ |
| Scan receipt (photo -> line items) | OCR + AI parsing       | No          | BUILT  |
| Track expense                      | Expense tracking       | No          | BUILT  |
| Record payment from client         | Ledger entry           | No          | BUILT  |
| Generate invoice                   | Invoice gen            | No          | BUILT  |
| View profit/loss for event         | Financial summary view | No          | BUILT  |
| Mileage tracking                   | Finance module         | No          | BUILT  |
| Tax prep (1099, deductions)        | Tax module             | No          | BUILT  |

**Skills built:**

- `/money-check` - Quick P&L snapshot: outstanding balances, deposits due, this month vs last month, pipeline forecast, profit margins.

---

## 7. MARKETING & GROWTH

> **Pain:** 100+ Take a Chef reviews but no systematic growth. No social presence from ChefFlow.

| Task                             | Skill             | Automation?    | Status |
| -------------------------------- | ----------------- | -------------- | ------ |
| Post event recap to social       | Social module     | No             | BUILT  |
| Track online reputation          | Reputation module | No             | BUILT  |
| Manage directory listing         | Directory module  | No             | BUILT  |
| Run referral campaign            | Marketing module  | No             | BUILT  |
| Generate event story for sharing | Stories module    | No             | BUILT  |
| Holiday campaign outreach        | Holiday campaigns | Yes (seasonal) | BUILT  |

**Low priority per urgency recalibration.** Infrastructure exists, not the bottleneck.

---

## 8. INFRASTRUCTURE

> **Context:** Self-hosted everything. Pi runs OpenClaw. Hermes runs overnight. No cloud bills.

| Task                      | Skill                | Automation?      | Status |
| ------------------------- | -------------------- | ---------------- | ------ |
| Check Pi health           | `/pi`                | No               | BUILT  |
| Check ChefFlow server     | `/health`            | No               | BUILT  |
| Start/stop services       | `/services`          | No               | BUILT  |
| Backup database           | `/backup`            | Yes (Hermes 12h) | BUILT  |
| Monitor OpenClaw pipeline | `/pipeline`          | No               | BUILT  |
| Check build state         | `/status`            | No               | BUILT  |
| Morning system briefing   | `/morning`           | No               | BUILT  |
| Warm up dev environment   | `/warmup`            | No               | BUILT  |
| Hermes overnight ops      | Hermes cron (6 jobs) | Yes (24/7)       | BUILT  |

**Fully covered.** Most automated domain.

---

## 9. PRODUCT DEVELOPMENT

> **Context:** David describes what he wants in chef language. Claude translates to code.

| Task                            | Skill                            | Automation?         | Status |
| ------------------------------- | -------------------------------- | ------------------- | ------ |
| Plan a feature                  | `/planner`, `/grill-me`          | No                  | BUILT  |
| Research before building        | `/research`                      | No                  | BUILT  |
| Build a feature (TDD)           | `/builder`, `/tdd`               | No                  | BUILT  |
| Review code before shipping     | `/review` (hook-enforced)        | Yes (pre-commit)    | BUILT  |
| Ship code                       | `/ship`                          | No                  | BUILT  |
| Debug a bug                     | `/debug`, `/diagnose`, `/5-whys` | No                  | BUILT  |
| Break spec into issues          | `/to-issues`                     | No                  | BUILT  |
| Synthesize conversation to spec | `/to-prd`                        | No                  | BUILT  |
| Architecture analysis           | `/improve-codebase-architecture` | No                  | BUILT  |
| Stress test a plan              | `/persona-stress-test`           | No                  | BUILT  |
| Start of session context        | `context-load` (hook-enforced)   | Yes (every session) | BUILT  |
| End of session cleanup          | `/close-session`                 | No                  | BUILT  |
| Compliance checks               | `/compliance` (hook-enforced)    | Yes (every edit)    | BUILT  |
| Track build times               | Build timer                      | Yes (every build)   | BUILT  |
| Create new skills               | `/write-a-skill`                 | No                  | BUILT  |

**Fully covered.** Most skills live here.

---

## 10. DATA INTELLIGENCE

> **Context:** OpenClaw on Pi collects prices. PIE synthesizes. ChefFlow consumes.

| Task                         | Skill                     | Automation?   | Status |
| ---------------------------- | ------------------------- | ------------- | ------ |
| Run price synthesis          | Pi cron (11 synthesizers) | Yes (nightly) | BUILT  |
| Check data coverage          | `/pie-census`             | No            | BUILT  |
| Expand to new stores/regions | `/pie` commands           | No            | BUILT  |
| Measure PIE health           | `/pie-measure`            | No            | BUILT  |
| Forecast pricing trends      | `/pie-forecast`           | No            | BUILT  |
| Run accuracy validation      | `/pie-accuracy`           | Yes (weekly)  | BUILT  |
| Alert on anomalies           | `/pie-alert`              | Yes (cron)    | BUILT  |
| Ratchet improvement          | `/pie-ratchet`            | No            | BUILT  |

**Fully covered.** PIE has its own skill ecosystem.

---

## Gap Analysis

### Critical Gaps (directly cause reputation/business damage)

| Gap                              | Domain               | Fix             | Status |
| -------------------------------- | -------------------- | --------------- | ------ |
| No "who's waiting?" view         | Client Communication | `/client-pulse` | BUILT  |
| No quick status update to client | Client Communication | `/quick-update` | BUILT  |
| No auto-acknowledge on inquiry   | Inquiry Pipeline     | `/acknowledge`  | BUILT  |
| No recipe brain-dump flow        | Recipe Management    | `/brain-dump`   | BUILT  |
| No batch recipe capture          | Recipe Management    | `/recipe-blitz` | BUILT  |

### Nice-to-Have Gaps

| Gap                                  | Domain           | Fix                            | Status |
| ------------------------------------ | ---------------- | ------------------------------ | ------ |
| No "next dinner" briefing            | Event Operations | `/next-dinner`                 | BUILT  |
| No week-ahead view                   | Event Operations | `/next-dinner` week-ahead mode | BUILT  |
| No quick P&L snapshot                | Financial Ops    | `/money-check`                 | BUILT  |
| No multi-channel inbox consolidation | Inquiry Pipeline | `/inbox-zero`                  | BUILT  |

---

## Maturity by Domain

| Domain               | Skills                                                  | Automations | Maturity              |
| -------------------- | ------------------------------------------------------- | ----------- | --------------------- |
| Client Communication | 4 (`client-pulse`, `quick-update`, `acknowledge`, Remy) | 0           | MEDIUM                |
| Inquiry Pipeline     | 4 (+`acknowledge`)                                      | 1 partial   | MEDIUM                |
| Event Operations     | 9+ (+`next-dinner`)                                     | 0           | HIGH (no automations) |
| Recipe Management    | 4 (+`brain-dump`)                                       | 0           | MEDIUM                |
| Pricing & Costing    | 10+                                                     | 4           | FULL                  |
| Financial Ops        | 6+                                                      | 0           | HIGH (no automations) |
| Marketing & Growth   | 5+                                                      | 1           | MEDIUM                |
| Infrastructure       | 8+                                                      | 6 (Hermes)  | FULL                  |
| Product Development  | 15+                                                     | 4 (hooks)   | FULL                  |
| Data Intelligence    | 8+                                                      | 3           | FULL                  |

---

## Priority Build Order for Missing Skills

Based on urgency recalibration (2026-04-24): communication > recipes > inquiries > everything else.

1. ~~`/client-pulse`~~ BUILT - Who's waiting? How long?
2. ~~`/quick-update`~~ BUILT - One-liner to any client
3. ~~`/brain-dump`~~ BUILT - Stream recipe from memory
4. ~~`/acknowledge`~~ BUILT - Auto-ack new inquiries
5. ~~`/next-dinner`~~ BUILT - Next event full briefing (includes week-ahead mode)
6. ~~`/recipe-blitz`~~ BUILT - Batch recipe capture (CORE PAIN AT SCALE)
7. ~~`/inbox-zero`~~ BUILT - Multi-channel inquiry view (CONSOLIDATION)
8. ~~`/money-check`~~ BUILT - Quick P&L snapshot (FINANCIAL VISIBILITY)
