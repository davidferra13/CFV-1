# AI in ChefFlow — Core Policy

## Core Principle

AI assists thinking and drafting.
AI never owns truth.
AI never mutates canonical state.

**If it touches ledger, lifecycle, or identity directly — it's wrong.**

---

## Where AI Is Allowed

### 1. Drafting Assistance (Chef-Controlled)

AI may:
- Draft proposals from structured event data
- Suggest menu descriptions from selected dishes
- Help rewrite client messages
- Generate follow-up email templates
- Suggest inquiry responses
- Summarize long message threads

**Rules:**
- Output is editable
- Nothing auto-sends
- Nothing auto-saves as canonical without chef confirmation
- AI produces suggestions. Chef commits.

### 2. Structured Suggestions (Non-Canonical)

AI may:
- Suggest pricing ranges (never finalize)
- Suggest wine pairing categories (vague, not prescriptive)
- Suggest prep timelines
- Suggest shopping list drafts
- Suggest loyalty tier upgrades

**Rules:**
- Suggestions exist in a temporary layer
- Chef must explicitly accept
- Acceptance creates normal system records (not "AI records")

### 3. Insight Surfaces (Read-Only Analysis)

AI may:
- Summarize revenue trends
- Highlight repeat client behavior
- Identify slow response patterns
- Surface potential overbooking risks
- Detect margin inconsistencies

**Rules:**
- Insights are advisory
- AI never changes data
- AI never closes events
- AI never triggers financial entries

### 4. Natural Language → Structured Input (With Confirmation)

AI may:
- Parse a pasted inquiry into structured fields
- Convert notes into timeline tasks
- Extract dietary restrictions from messages
- Convert rough menu text into structured components

**Rules:**
- Parsed output must be reviewable
- Chef confirms before commit
- No auto-state transitions

---

## Where AI Is Restricted

### 1. Lifecycle Transitions

AI **cannot**:
- Move Inquiry → Proposal
- Confirm Event
- Close Event
- Cancel Event
- Mark as Paid
- Issue Refund

Only explicit human actions can change state.

### 2. Financial Ledger

AI **cannot**:
- Create ledger entries
- Modify ledger entries
- Delete ledger entries
- Adjust totals automatically
- Issue refunds
- Mark invoices paid

AI may suggest. It cannot write.
**Ledger is deterministic. Not probabilistic.**

### 3. Identity & Access

AI **cannot**:
- Merge client accounts
- Modify tenant isolation
- Alter roles
- Override RLS logic
- Resolve identity conflicts automatically

Identity changes must be deterministic and logged.

### 4. Silent Automation

AI **cannot**:
- Auto-send messages
- Auto-confirm menus
- Auto-generate invoices
- Auto-approve proposals
- Auto-apply discounts
- Auto-trigger loyalty rewards

Nothing happens without an explicit commit action.

---

## UX Rules for AI

AI must:
- Be visually distinct from canonical data
- Clearly labeled as "Suggestion"
- Never appear as system truth
- Never overwrite chef-written content silently
- Be reversible

**ChefFlow is deterministic first, intelligent second.**

---

## AI Should Never Be

- A replacement for business logic
- A shortcut around lifecycle modeling
- A patch for bad architecture
- A way to avoid writing proper schema
- A justification for vague states

If AI is compensating for unclear modeling — the modeling is wrong.

---

## The Hard Boundary

If you unplug AI tomorrow, ChefFlow must:
- Still function completely
- Still preserve financial truth
- Still enforce lifecycle rules
- Still protect tenants
- Still be production-grade

**If removing AI breaks the system, you architected it incorrectly.**
