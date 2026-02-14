# ChefFlow — Chef Portal Master Definition (V1 Locked)

This document defines exactly what the Chef Portal is in ChefFlow V1. It is the authoritative operational surface for chefs and approved chef sub-accounts. It is not the public website and not the Client Portal. It is the control room for running the business: turning inquiries into booked events, running the event lifecycle, managing clients, locking menus, and maintaining immutable financial truth.

This definition assumes the V1 scope lock: ledger-first finance, server-enforced lifecycle, multi-tenant isolation by RLS, and no client-trusted logic.

---

## 1) What the Chef Portal is

### 1.1 Purpose

The Chef Portal is the private, authenticated operational interface where a chef runs their entire ChefFlow V1 workflow:

- Capture and manage clients and events
- Drive a finite event lifecycle (server-enforced)
- Build and lock menus for events
- Create and manage financial truth through an append-only ledger
- Send invites to clients to link to client profiles (without duplicates)
- Maintain auditability: every critical action is traceable and irreversible where required

### 1.2 Core design principles

The Chef Portal is built around these non-negotiables:

- **Deterministic**: the same inputs produce the same state changes; no "best guess."
- **Tenant-safe**: chefs never see other chefs' data, ever.
- **Server authoritative**: lifecycle, permissions, money, and linking are enforced server-side + DB (RLS), not in frontend.
- **Ledger-first financial truth**: money status is derived from immutable ledger entries (Stripe is an input stream, not the database of record).
- **Finite lifecycle**: events have a locked state machine; transitions are explicit and logged.
- **Audit and immutability**: certain records are append-only or immutable and cannot be edited/deleted.

---

## 2) What the Chef Portal is not

The Chef Portal is not:

- A public marketing site or landing page
- A cold-lead marketplace (no browsing chefs, no marketplace discovery)
- A social platform or reviews platform
- A full accounting suite (no bookkeeping, no tax automation, no payroll)
- A client experience surface (clients use the Client Portal)
- An AI "assistant playground" that changes records without explicit human action
- A place where cross-tenant or cross-role access is "handled by UI hiding things"

**If a feature requires:**
- trusting the frontend,
- aggregating across tenants,
- rewriting financial history,
- or introducing "optional intelligence systems" that aren't revenue-critical,

…**it does not belong in V1 Chef Portal.**

---

## 3) Roles & access control (Chef Portal)

### 3.1 Roles in V1

- **chef**: primary tenant owner; full access to their tenant.
- **chef_subaccount** (if present in V1): a user scoped to a single chef tenant with limited permissions.
- **client**: never permitted into Chef Portal routes/layouts.

### 3.2 Role authority

Role is authoritative only when:
- confirmed server-side from `user_roles` (or equivalent authoritative table), and
- enforced by:
  - middleware / route guards,
  - server layout gating, and
  - database RLS.

### 3.3 Chef sub-accounts (if included)

If sub-accounts exist in V1, they are tenant-bound and permissioned. If they are not fully implemented, they can exist as a structural stub but must not create security ambiguity:

- A subaccount can never cross tenants
- A subaccount's permissions are enforced server-side
- No "client masquerading as chef" state is possible

---

## 4) Tenant model (multi-tenant reality)

### 4.1 Canonical tenant identifier

The chef tenant is identified by `tenant_id` (or `chef_id`) consistently.

All core tables are scoped by `tenant_id`, except where tenant is inherently the row (e.g., `chefs` table itself).

### 4.2 Enforcement layer

Tenant isolation must be true even if the UI is compromised:

- RLS deny-by-default on all tables
- Policies allow access only if:
  - requesting user belongs to that tenant as chef (or permitted subaccount), and
  - record `tenant_id` matches their `tenant_id`

### 4.3 Storage isolation

If Supabase Storage is used:

- Object paths and/or buckets are tenant scoped
- Signed URLs are time-limited
- No public buckets for private portal assets
- A chef cannot list or retrieve another tenant's objects

---

## 5) Chef Portal navigation and layout (conceptual)

The Chef Portal is organized by the operational lifecycle. V1 must remain minimal and deterministic. Use this as the baseline structure:

### 5.1 Primary navigation (Chef Portal)

1. **Dashboard**
2. **Inquiries / Pipeline**
3. **Events**
4. **Menus**
5. **Clients**
6. **Finance**
7. **Settings**

**If you have more tabs than this in V1, you are drifting.**

### 5.2 What each section is responsible for

- **Dashboard**: "what needs attention" view; shows next actions and at-risk items derived from real state.
- **Inquiries / Pipeline**: intake records that may convert into events (V1 may treat inquiries as a lightweight event-precursor or an event in draft; whichever is locked in scope).
- **Events**: canonical event records; lifecycle transitions; event detail; state truth.
- **Menus**: menu templates and event-linked menus; versioning and locking.
- **Clients**: client profiles, notes (chef-private), invite status, event history.
- **Finance**: ledger view (append-only); event financial summary derived from ledger; payment state derived not edited.
- **Settings**: tenant settings (minimal); service configuration stubs only if already in scope lock.

---

## 6) Core entities the Chef Portal controls (V1)

### 6.1 Chef (Tenant)

Represents the business entity. Owns:
- clients
- events
- menus
- ledger entries
- invitations
- audit logs

### 6.2 Client (Profile)

- A client can exist before they create an auth account.
- The chef can create a client profile with minimal fields.
- A client later links by invite token or deterministic linking rule.
- Client profile is tenant-scoped and cannot be shared across chefs in V1 unless explicitly supported (default: forbid).

**Chef-private vs client-visible data:**
- Chef portal can store private notes and internal tags.
- Client portal must never read those fields; enforce separation via schema + RLS + projection.

### 6.3 Event (Booking)

The canonical operational unit. Events:
- belong to exactly one tenant
- link to exactly one client profile
- have a finite status and a transition log
- have time block (start_ts, end_ts) with overlap rules
- have financial expectations (total_amount_cents, deposit_amount_cents) that are locked at defined lifecycle points

### 6.4 Menu (Event-linked)

Menus must support:
- draft creation and edits
- explicit "shared"/"confirmed" boundaries
- immutable version history after lock (no silent overwrites)
- client rendering only from safe projections

### 6.5 Ledger (Financial truth)

Ledger entries are append-only. They drive:
- payment state
- balances
- totals
- loyalty derivations (if loyalty exists in V1; otherwise stub)

The Chef Portal can append entries via controlled server functions; it cannot rewrite history.

---

## 7) Event lifecycle (operational state machine)

### 7.1 Lifecycle requirement

Events must have a finite status enum and transitions must be:
- server-enforced
- idempotent
- audited (append to `event_transitions`)
- valid only if allowed by the transition map

### 7.2 Minimal lifecycle (V1 operational states)

Use the locked 8-state model referenced in your scope lock (names may vary by implementation, but must be finite and consistent). A typical V1 set:

1. `draft`
2. `proposed`
3. `deposit_pending`
4. `confirmed`
5. `menu_in_progress` (or equivalent)
6. `menu_locked`
7. `executed`
8. `closed` (or `canceled` as terminal alternative)

**Cancellations should be terminal or strictly controlled with explicit transition rules. No undefined regressions.**

### 7.3 Transition rules (conceptual)

- `draft` → `proposed`: chef creates proposal terms.
- `proposed` → `deposit_pending`: deposit requested / payment intent created.
- `deposit_pending` → `confirmed`: only after Stripe webhook confirms settlement (or your defined "confirmed deposit" rule).
- `confirmed` → `menu_in_progress`: menu work begins (optional transition if you keep menu as separate state).
- `menu_in_progress` → `menu_locked`: menu confirmed/locked.
- `menu_locked` → `executed`: after event completion.
- `executed` → `closed`: finalization step; financial reconciliation complete.

### 7.4 Calendar overlap rules (time block model)

Events are time blocks:
- `start_ts`, `end_ts` are required for anything beyond `draft`.
- Overlap rules are enforced server-side (and optionally DB constraint helpers).
- The Chef Portal can allow "soft inquiries" without reserving time, but once reserved/confirmed, overlap prevention must be deterministic.

---

## 8) Financial model (Chef Portal)

### 8.1 Canonical truth

- **Stripe is not truth; it is an external event stream.**
- **ChefFlow truth is the internal immutable ledger.**
- Payment state shown in Chef Portal is derived from ledger, not editable.

### 8.2 Ledger entry types (V1)

You referenced 7 locked entry types. Typical set (example; must match your enum):

1. `charge_pending`
2. `charge_succeeded`
3. `charge_failed`
4. `refund_pending`
5. `refund_succeeded`
6. `refund_failed`
7. `adjustment`

### 8.3 Amount storage rules

- All amounts are stored as integer cents (`amount_cents`).
- Rounding is deterministic and applied once at the boundary (when writing ledger entries).

### 8.4 Invoice locking rules

Once deposit is paid:
- the event's financial terms become locked according to V1 contract
- any change becomes either:
  - a new ledger adjustment (append-only), and/or
  - a new "invoice version" record (if in V1), but never mutation of historical totals

### 8.5 Stripe integration boundary

Chef Portal manages:
- Stripe connection per tenant (if tenant-scoped Stripe is in V1)
- Payment intent creation for deposits (client-facing UI triggers)
- Webhook ingestion (service role) that appends ledger entries
- Idempotency keys to prevent duplicates

---

## 9) Menu system in the Chef Portal (V1)

### 9.1 Chef drafting vs client rendering

**Chef Portal can contain:**
- internal prep notes
- sourcing notes
- internal structure and planning data

**Client portal must only see:**
- client-safe menu projection
- the correct version associated with the event

### 9.2 Versioning rules

- Draft versions can be edited.
- Once "locked" (menu confirmed), that version becomes immutable.
- Subsequent changes create a new version, not edits to the locked one.
- The Chef Portal must clearly indicate which version is active and which are archived.

### 9.3 Event-menu linkage

- An event references the active menu version.
- Changing active menu requires explicit action and is audited.

---

## 10) Client invites & linking (Chef Portal responsibilities)

The Chef Portal controls creation of a client profile and the invite flow.

### 10.1 Invite is the safe linking path

Chef generates an invite token tied to:
- `tenant_id`
- `client_profile_id`
- intended email (optional but recommended)
- expiration timestamp

Client uses invite link to sign up/login.

Linking is deterministic and auditable.

### 10.2 Duplicate prevention

Chef Portal must avoid creating duplicate client profiles by:
- enforcing per-tenant uniqueness constraints where appropriate (email normalized, phone normalized if used)
- presenting "possible existing match" warning only if necessary (V1 can keep this minimal, but linking must remain safe)

### 10.3 Chef-private fields

Chef portal may store private notes; these must be in:
- separate columns with no client RLS access, or
- separate tables that client RLS policies never allow.

---

## 11) Audit & immutability (Chef Portal)

### 11.1 Immutable tables

From your current implementation notes:
- `ledger_entries` is immutable (no update/delete)
- `event_transitions` is immutable (no update/delete)

These immutability guarantees are enforced by DB triggers and must be tested.

### 11.2 What gets audited

At minimum:
- every lifecycle transition (who, when, from, to)
- every ledger write (who/system, when, type, amount, event linkage)
- invite creation and acceptance
- identity linking events

---

## 12) Automation (Chef Portal boundaries in V1)

If automation exists in V1, it must be minimal and safe:

- No autonomous decisions that change money or lifecycle state without explicit triggers.
- Any background jobs must be tenant-scoped.
- Any retry must be idempotent.

If automation is excluded from V1, it may exist only as structural stubs:
- tables may exist
- no active triggers beyond what is required for Stripe/webhooks and lifecycle integrity

---

## 13) Error handling and fail-safes (Chef Portal)

### 13.1 Fail closed

If something is uncertain, the system must:
- deny access
- freeze state transition
- show "processing / pending verification"
- require reconciliation rather than guessing

### 13.2 Required safety behaviors

- Stripe webhook delays do not lie to the UI; show "processing"
- webhook retries do not create duplicate ledger entries
- duplicate clicks do not create duplicate events, payments, or transitions
- any attempt to access cross-tenant data is blocked by RLS

---

## 14) Integration points (Chef Portal in infrastructure)

### 14.1 Supabase (Auth + DB + RLS)

Chef Portal relies on:
- Supabase Auth for sessions
- a `user_roles` mapping table as the authoritative role source
- DB RLS for isolation
- service role key only server-side for webhooks/administration

### 14.2 Hosting/runtime

- Next.js app router
- middleware + server layouts enforce role before rendering
- server actions / API routes enforce validation and write constraints

### 14.3 Stripe

- per-tenant Stripe configuration if required
- webhook handler is the only place "Stripe events become ledger entries"
- idempotency by event id / webhook id

---

## 15) Chef Portal "done" definition (V1)

Chef Portal is considered implemented (V1) only when:

### 15.1 Enforcement is provable

- RLS deny-by-default is enabled on all tables
- tenant isolation is verified
- ledger and transitions are immutable and verified
- role routing prevents wrong portal rendering

### 15.2 Operational loop is complete

Chef can:
- create/manage client profiles
- create/manage events
- transition event lifecycle states via server-authoritative function
- create and lock menus for events
- accept client deposit payments via Stripe
- see financial summary derived from ledger (not hand-edited)

### 15.3 Nothing leaks

- no client can ever see chef-private notes
- no tenant can ever see another tenant's data
- no endpoint returns internal fields accidentally

---

## 16) One-sentence definition

**The Chef Portal is ChefFlow's tenant-isolated, role-protected, server-authoritative operational workspace where chefs manage clients, events, menus, and finances through a finite lifecycle and an immutable ledger, with all access enforced by RLS and all critical changes auditable.**
