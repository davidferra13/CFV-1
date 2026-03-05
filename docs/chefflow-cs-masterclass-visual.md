# ChefFlow CS Masterclass (Visual)

Last updated: 2026-03-05

## Why This Exists

This is the "walk into a Harvard CS class" version of ChefFlow.

Use this to answer hard technical questions with confidence:

1. What the system does
2. How it is implemented
3. Why the design is defensible
4. How quality is proven with evidence

---

## 1) System Map (Picture First)

```text
+-------------------------------+
|            End Users          |
| Chef / Client / Staff / Admin |
+---------------+---------------+
                |
                | HTTPS
                v
+-------------------------------+
|      Next.js App Router       |
|   app/* pages + API routes    |
+-----------+-----------+-------+
            |           |
            |           |
            v           v
+----------------+  +----------------------+
| Server Actions |  | Scheduled Jobs/Crons |
|   lib/*        |  | app/api/scheduled/*  |
+--------+-------+  +----------+-----------+
         |                     |
         +----------+----------+
                    |
                    v
+----------------------------------------------+
|                  Supabase                    |
| Postgres + Auth + RLS + Storage + Functions  |
+----------------+-----------------------------+
                 |
                 v
+----------------------------------------------+
| Canonical Data                                |
| ledger_entries, events FSM, docs/assets       |
+----------------------------------------------+
```

Top-level summary:

- User input enters through Next.js.
- Business writes happen through server actions and guarded APIs.
- Supabase enforces storage, auth, and final authorization via RLS.
- Ledger/events remain canonical truth.

---

## 2) Security Layers (Defense in Depth)

```text
Layer 1: Edge/middleware gate
  - Route-level session checks
  - Early block for unauthorized routes

Layer 2: Server action/API gate
  - requireChef / requireClient / requireAdmin
  - Input validation and role checks

Layer 3: Tenant scoping in app code
  - tenantId derived from session
  - never trusted from raw request payload

Layer 4: Database policy enforcement
  - RLS policies are final authority
  - DB blocks cross-tenant data access even if app code slips
```

Core talking point:

- App checks are convenience and early rejection.
- RLS is the final hard boundary.

---

## 3) Four Critical Request Lifecycles

### A) Public Inquiry

```text
Public form submit
  -> app/(public) page
  -> API route validation
  -> anti-abuse/rate checks
  -> create inquiry/client/event draft rows
  -> optional notification fanout
```

### B) Authenticated Mutation

```text
Chef clicks "save"
  -> server action in lib/*
  -> requireChef()
  -> tenant resolved from session
  -> Supabase write (RLS evaluated)
  -> revalidatePath()
  -> UI re-renders canonical backend state
```

### C) Payment/Ledger

```text
Payment signal/webhook
  -> signature + idempotency checks
  -> append ledger entry (immutable-first)
  -> recompute event/payment status
  -> reports read from ledger truth
```

### D) AI Assist (Advisory Path)

```text
User prompt
  -> policy/guardrails
  -> tenant-scoped context fetch
  -> model response
  -> optional suggested actions
  -> explicit user confirmation required for mutations
```

---

## 4) Data Truth Map (What Cannot Be Faked)

```text
Money truth:
  ledger_entries (append-first, auditable)

Lifecycle truth:
  events + state transitions (FSM)

Access truth:
  user identity + role mapping + RLS

Artifact truth:
  storage path + signed URL generation
```

If asked "What is your single source of truth for money?"

- Answer: `ledger_entries` + ledger-focused tests + release gate evidence.

---

## 5) Release Readiness Pipeline (Proof Chain)

```text
npm run verify:release
  -> verify:secrets
  -> typecheck
  -> lint:strict
  -> test:critical
  -> test:unit
  -> build
  -> test:e2e:smoke:release
```

Current evidence anchor:

- `docs/beta-proof-pack-readiness-2026-03-05.md`

---

## 6) Architecture Decisions and Tradeoffs

### Decision 1: App Router + Server Actions

Reason:

- UI and mutation logic are colocated.
- Less API boilerplate for authenticated flows.

Tradeoff:

- Requires discipline around tenant derivation and input trust.

Mitigation:

- strict role helpers
- tenant leak tests
- RLS as final guard

### Decision 2: Supabase for Auth + DB + Storage

Reason:

- Single platform for auth, relational data, storage, and policy.

Tradeoff:

- Drift between schema/policies and app assumptions can break runtime.

Mitigation:

- migration discipline
- generated type refresh
- release verification gates

### Decision 3: Immutable Ledger

Reason:

- Audit-safe financial timeline.
- Better incident forensics and reconciliation.

Tradeoff:

- Fixes require compensating entries, not silent edits.

Mitigation:

- explicit adjustment workflows
- ledger tests in critical suite

---

## 7) Failure Taxonomy (Incident Lens)

```text
Class A: Auth/Access
  Symptom: unauthorized reads/writes
  Area: middleware, require* checks, RLS

Class B: Schema Drift
  Symptom: missing columns/tables at runtime
  Area: migrations not applied, stale types

Class C: Policy Logic
  Symptom: policy recursion or unexpected denies
  Area: complex RLS SQL

Class D: External Dependency
  Symptom: timeout, 5xx, connection resets
  Area: provider health, retries, backoff
```

---

## 8) "Stump Anybody" Question Bank

1. Where is tenant identity derived?

- Session context, not request payload.

2. What is the final authorization authority?

- Postgres RLS policy evaluation.

3. What objectively proves release readiness?

- A passing `npm run verify:release` plus evidence artifacts.

4. Why is financial history not silently editable?

- Ledger immutability protects audit integrity.

5. How do you prevent false-green demos?

- Hard release gates, risk log, and proof-pack artifacting.

6. Biggest active architecture risk?

- Schema/policy drift between DB and app assumptions.

7. Recovery path for bad deploy?

- Rollback runbook plus post-rollback smoke validation.

8. AI output vs canonical truth?

- AI suggests; system state changes require validated writes.

9. How to detect cross-tenant leakage regressions?

- Static checks, auth tests, and RLS enforcement.

10. One-line reliability statement for non-coders?

- "Every release must pass an automated safety checklist before trust."

---

## 9) Oral Defense Format (Use This Live)

For every answer, speak in this sequence:

1. Claim (one sentence)
2. Mechanism (subsystem/file path)
3. Evidence (test/report/command)
4. Risk (what is still open)
5. Next action (owner + immediate fix)

Example:

```text
Claim: Payment history is audit-safe.
Mechanism: Immutable ledger append model.
Evidence: Ledger tests in release gate.
Risk: Schema drift can still break runtime.
Next action: Enforce migration parity and regenerate DB types.
```

---

## 10) One-Page Memory Board (Picture Brain Mode)

```text
+------------------------- CHEFFLOW MEMORY BOARD -------------------------+
|                                                                         |
| NORTH (Architecture): Next.js -> Server Actions -> Supabase             |
| EAST  (Security):     Middleware -> Role Gate -> Tenant Scope -> RLS    |
| SOUTH (Quality):      verify:release -> tests/build/smoke -> proof-pack |
| WEST  (Operations):   monitoring + rollback + known-risk ownership      |
| CENTER (Truth):       ledger_entries + event FSM + authenticated roles  |
|                                                                         |
+-------------------------------------------------------------------------+
```

When stressed:

- Start from CENTER (truth).
- Then walk NORTH/EAST/SOUTH/WEST.

---

## 11) Daily 15-Minute Drill

1. Read one section of this document.
2. Answer 3 skeptic questions out loud.
3. Verify one answer with a real file path.
4. Run one proof command or cite latest proof artifact.
5. Rewrite your weakest answer in the 5-part defense format.
