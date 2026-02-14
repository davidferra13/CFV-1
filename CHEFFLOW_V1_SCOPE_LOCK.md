# ChefFlow V1 - Scope Lock Document

**Version**: 1.0
**Date**: 2026-02-13
**Status**: FROZEN

This document defines the immutable scope for ChefFlow V1. No features may be added, removed, or modified without explicit scope unlock and revision. This is a binding contract for what ships in V1.

---

## Non-Negotiable System Laws

These invariants MUST be enforced at all times. Violation of any system law is a critical defect.

### Law 1: Multi-Tenant Isolation is Database-Enforced
- **Rule**: Every table except `chefs` and `clients` MUST have `tenant_id` column referencing `chefs.id`
- **Enforcement**: Supabase Row Level Security (RLS) policies on ALL tables
- **Prohibition**: NEVER rely on frontend filtering, URL parameters, or client-side state for tenant scoping
- **Verification**: RLS policies MUST prevent Chef A from querying Chef B's data

### Law 2: Roles are Authoritative and Single-Source-of-Truth
- **Rule**: Role (`chef` vs `client`) is stored ONLY in `user_roles` table
- **Enforcement**: Server-side role resolution via `getCurrentUser()` querying `user_roles`
- **Prohibition**: NEVER infer role from URL path, client state, or JWT claims
- **Guarantee**: No "flash of wrong portal" - middleware redirects before HTML is sent

### Law 3: Financial Truth is Ledger-First
- **Rule**: ALL financial state derives from `ledger_entries` table (append-only)
- **Flow**: Stripe webhook → ledger entry → computed balance/status
- **Prohibition**: NEVER store balances, payment status, or totals directly on `events` table
- **Guarantee**: Ledger entries are immutable (enforced by database triggers)
- **Storage**: ALL monetary amounts stored in minor units (cents, INTEGER type)

### Law 4: Event Lifecycle is Finite and Server-Enforced
- **Rule**: Events follow predefined state machine with validated transitions
- **Enforcement**: Server-side validation in `transitionEventStatus()` function
- **Prohibition**: NEVER allow state skipping or client-initiated invalid transitions
- **Audit**: ALL transitions logged to `event_transitions` table (immutable)

### Law 5: No Feature Expansion Beyond V1 Scope
- **Rule**: Only features explicitly listed in "V1 Feature List" below may be implemented
- **Prohibition**: No "nice-to-haves", no "quick additions", no "while we're here" features
- **Exception Process**: Scope changes require explicit scope unlock, document revision, and re-approval

### Law 6: Minimal Diffs and Deterministic Changes
- **Rule**: Every change MUST be verifiable via git diff
- **Prohibition**: No broad refactors, no file moves unless necessary, no route renaming
- **Requirement**: All changes must be reviewable, auditable, and reversible

### Law 7: Defense in Depth Security
- **Rule**: Security enforced at 3 layers: Network (middleware) → Application (layout) → Database (RLS)
- **Requirement**: Even if one layer fails, others MUST prevent unauthorized access
- **Guarantee**: Client NEVER receives HTML or data for wrong portal/tenant

---

## V1 Feature List (What Ships)

### Authentication & User Management
- ✅ Chef signup (email/password via Supabase Auth)
- ✅ Client signup (invitation-based only, sent by chef)
- ✅ Email/password signin (both portals)
- ✅ Session management (Supabase cookies)
- ✅ Role assignment (`user_roles` table, authoritative)
- ✅ Password reset (Supabase built-in)

### Chef Portal Features
- ✅ Chef dashboard (summary view of events)
- ✅ Event CRUD:
  - Create event (title, date, guest count, location, pricing)
  - View event list (tenant-scoped)
  - View event details
  - Update event (draft state only)
  - Cancel event (with reason)
- ✅ Event lifecycle management:
  - Propose event to client
  - Confirm event (after payment)
  - Mark event in progress
  - Mark event completed
- ✅ Client management:
  - Send client invitation (email with signup link)
  - View client list (tenant-scoped)
  - View client details
- ✅ Financial view:
  - Ledger audit log (read-only)
  - Event payment status (computed from ledger)
  - Tenant financial summary (total revenue, refunds, pending)
- ✅ Basic menu CRUD:
  - Create menu template (name, description, price per person)
  - View menu list
  - Attach menu to event (many-to-many)

### Client Portal Features
- ✅ Client dashboard ("My Events" list)
- ✅ Event details view (read-only event info)
- ✅ Event acceptance:
  - View proposed events
  - Accept proposal
- ✅ Payment:
  - View payment amount (deposit or full)
  - Pay via Stripe Checkout/Elements
  - View payment receipt (from ledger)
- ✅ View attached menus (read-only)

### Public Layer Features
- ✅ Landing page (static marketing content)
- ✅ Pricing page (static content)
- ✅ Contact page (simple form or email link)

### Payment & Financial System
- ✅ Stripe integration:
  - Create PaymentIntent (with event metadata)
  - Stripe Elements for card input
  - Webhook endpoint (`/api/webhooks/stripe`)
- ✅ Webhook event handling:
  - `payment_intent.succeeded` → append ledger → transition event
  - `payment_intent.payment_failed` → log to ledger
  - `charge.refunded` → append negative ledger entry
- ✅ Ledger system:
  - Append-only `ledger_entries` table
  - Computed views (`event_financial_summary`)
  - Idempotency via `stripe_event_id` unique constraint
- ✅ Event financial status:
  - Deposit paid check
  - Fully paid check
  - Balance calculation (from ledger)

### Database & Infrastructure
- ✅ PostgreSQL schema (via Supabase)
- ✅ RLS policies (all tables)
- ✅ Database migrations (version-controlled)
- ✅ Immutability triggers (ledger, transitions)
- ✅ Database indexes (tenant_id, event_id, created_at)

### Developer Experience
- ✅ TypeScript types (generated from schema)
- ✅ Environment configuration (.env.local)
- ✅ Development seed data (optional)

---

## V1 Exclusions (What Does NOT Ship)

### Explicitly Out of Scope
- ❌ Email notifications (event updates, payment receipts, reminders)
- ❌ SMS notifications
- ❌ Calendar integration (Google Calendar, iCal export)
- ❌ File uploads (photos, documents, contracts)
- ❌ Advanced menu builder (drag-and-drop, multi-course designer)
- ❌ Ingredient/inventory management
- ❌ Shopping list generation
- ❌ Client reviews/ratings system
- ❌ Automated reminders (event day, payment due)
- ❌ Reporting/analytics dashboard (charts, graphs)
- ❌ Multi-chef collaboration (team members, assistants)
- ❌ Client communication (in-app messaging, chat)
- ❌ Contract generation/e-signatures
- ❌ Tip/gratuity handling
- ❌ Recurring events/subscriptions
- ❌ Dietary restrictions/allergies tracking
- ❌ Multi-language support
- ❌ Mobile app (iOS/Android)
- ❌ Dark mode
- ❌ Advanced search/filtering
- ❌ Data export (CSV, PDF reports)
- ❌ Stripe Connect payouts automation (manual in V1)
- ❌ Tax calculations
- ❌ Invoice PDF generation
- ❌ Multiple payment methods (ACH, wire transfer - cards only in V1)
- ❌ Payment plans/installments
- ❌ Discount codes/coupons
- ❌ Referral system
- ❌ Admin panel (super-admin across all tenants)

### Stubbed for Future (Minimal Placeholder Only)
- 🔲 Email delivery (invitation emails use basic template, no fancy HTML)
- 🔲 Error logging (console.error only, no Sentry integration yet)
- 🔲 Analytics (no Google Analytics/Mixpanel in V1)

---

## Locked Lifecycle States

### Event Status Enum (Immutable)
```sql
CREATE TYPE event_status AS ENUM (
  'draft',        -- Chef creating event
  'proposed',     -- Sent to client, awaiting response
  'accepted',     -- Client accepted, awaiting payment
  'paid',         -- Deposit/full payment received
  'confirmed',    -- Chef confirmed after payment
  'in_progress',  -- Event day
  'completed',    -- Event finished
  'cancelled'     -- Cancelled (with reason)
);
```

### Valid Transitions (Enforced Server-Side)
```
draft → proposed → accepted → paid → confirmed → in_progress → completed
  ↓        ↓          ↓        ↓        ↓            ↓
  └────────┴──────────┴────────┴────────┴────────────→ cancelled
```

### Transition Rules
| From State    | To State      | Triggered By | Validation Required          |
|---------------|---------------|--------------|------------------------------|
| draft         | proposed      | Chef         | Event must have pricing      |
| proposed      | accepted      | Client       | Client must own event        |
| accepted      | paid          | System       | Webhook only                 |
| paid          | confirmed     | Chef         | Deposit paid (ledger check)  |
| confirmed     | in_progress   | Chef         | None                         |
| in_progress   | completed     | Chef         | None                         |
| *             | cancelled     | Chef         | Cancellation reason required |

### Terminal States (No Further Transitions)
- `completed` - Event finished successfully
- `cancelled` - Event cancelled (with audit trail)

---

## Ledger-First Financial Rules

### Rule 1: Append-Only Ledger
- Ledger entries MUST be immutable (enforced by database triggers)
- UPDATE or DELETE on `ledger_entries` MUST fail with error
- Corrections MUST be made via new `adjustment` entry type

### Rule 2: Stripe is Source of Truth
- Money enters system ONLY via Stripe webhooks
- Manual ledger entries allowed ONLY for:
  - Adjustments (chef-initiated, with metadata)
  - Refunds (webhook-initiated)
- NEVER create `charge_succeeded` entries manually

### Rule 3: Amounts in Minor Units
- ALL monetary amounts stored as INTEGER (cents)
- Examples:
  - $100.00 → `10000`
  - $15.50 → `1550`
- NEVER use DECIMAL or FLOAT types for money

### Rule 4: Idempotency via Event ID
- Every webhook event has unique `stripe_event_id`
- `ledger_entries.stripe_event_id` has UNIQUE constraint
- Duplicate webhooks MUST be detected and skipped (return 200)

### Rule 5: Computed Balances Only
- Event payment status derived from `event_financial_summary` view
- NEVER store `balance`, `amount_paid`, or `is_paid` columns on `events` table
- Views MUST recompute on every query (no caching)

### Rule 6: Entry Types (Locked Enum)
```sql
CREATE TYPE ledger_entry_type AS ENUM (
  'charge_created',      -- Stripe PaymentIntent created
  'charge_succeeded',    -- Payment succeeded
  'charge_failed',       -- Payment failed
  'refund_created',      -- Refund initiated
  'refund_succeeded',    -- Refund completed
  'payout_created',      -- Payout to chef initiated (future)
  'payout_paid',         -- Payout completed (future)
  'adjustment'           -- Manual adjustment (requires approval)
);
```

### Rule 7: Reconciliation Requirement
- Ledger totals MUST match Stripe dashboard
- Weekly reconciliation script (post-V1 enhancement)
- Discrepancies are critical bugs

---

## Multi-Tenant Enforcement Rules

### Rule 1: Tenant ID on All Tables
- Tables requiring `tenant_id`: events, event_transitions, ledger_entries, menus, event_menus
- Tables without `tenant_id`: chefs, clients, user_roles (special cases)
- `clients.tenant_id` references which chef invited them

### Rule 2: RLS Policy Pattern (Chef)
```sql
-- Example: Chefs can only SELECT their own tenant's data
CREATE POLICY {table}_chef_select ON {table}
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

### Rule 3: RLS Policy Pattern (Client)
```sql
-- Example: Clients can only SELECT events where they are the client
CREATE POLICY events_client_select ON events
  FOR SELECT USING (
    get_current_user_role() = 'client' AND
    client_id = get_current_client_id()
  );
```

### Rule 4: Server-Side Validation
- ALL mutations (INSERT/UPDATE) MUST validate `tenant_id` server-side
- NEVER trust `tenant_id` from client request body
- Derive `tenant_id` from `getCurrentUser().tenantId`

### Rule 5: Helper Functions (Authoritative)
```sql
-- Returns: 'chef' | 'client'
get_current_user_role()

-- Returns: chef.id (if chef) or NULL
get_current_tenant_id()

-- Returns: client.id (if client) or NULL
get_current_client_id()
```

### Rule 6: No Cross-Tenant References
- Events MUST reference clients in same tenant
- Enforced by CHECK constraint:
  ```sql
  CONSTRAINT fk_client_tenant CHECK (
    (SELECT tenant_id FROM clients WHERE id = client_id) = tenant_id
  )
  ```

---

## Idempotency Requirements

### Webhook Idempotency
- **Requirement**: Webhook handlers MUST be idempotent (safe to retry)
- **Implementation**: Check `ledger_entries.stripe_event_id` before processing
- **Behavior**: If event already processed, return `200 OK` (no error)
- **Stripe Retry**: Return `500` only on actual errors (triggers Stripe retry)

### Database Constraints
```sql
-- Prevent duplicate Stripe events
CONSTRAINT unique_stripe_event UNIQUE(stripe_event_id)

-- Prevent duplicate role assignments
CREATE UNIQUE INDEX idx_user_roles_auth_user ON user_roles(auth_user_id)
```

### Client Invitation Idempotency
- Invitation tokens MUST be single-use
- Mark invitation as `used_at` after signup
- Expired invitations (e.g., 7 days) MUST be rejected

---

## Immutable Data Rules

### Immutable Tables (No UPDATE/DELETE)
1. **ledger_entries** - Enforced by triggers
2. **event_transitions** - Enforced by triggers
3. **user_roles** - No user-facing UPDATE (only via system on signup)

### Immutable Trigger Implementation
```sql
CREATE OR REPLACE FUNCTION prevent_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Table % is immutable. Create a new entry instead.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER {table}_immutable_update
BEFORE UPDATE ON {table}
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER {table}_immutable_delete
BEFORE DELETE ON {table}
FOR EACH ROW EXECUTE FUNCTION prevent_modification();
```

### Soft Deletes (Where Applicable)
- Events, clients, menus use `deleted_at` timestamp
- RLS policies exclude `deleted_at IS NOT NULL`
- NEVER hard delete financial records (events with payments)

### Audit Fields (Required on All Tables)
- `created_at` TIMESTAMPTZ DEFAULT now()
- `created_by` UUID REFERENCES auth.users(id) (where applicable)
- `updated_at` TIMESTAMPTZ DEFAULT now()
- `updated_by` UUID REFERENCES auth.users(id) (where applicable)

---

## Tech Stack Lock (No Substitutions)

### Required Technologies
- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Payments**: Stripe (no alternative payment processors)
- **Styling**: Tailwind CSS + shadcn/ui
- **Language**: TypeScript (strict mode)

### Prohibited Technologies
- ❌ No ORMs (Prisma, Drizzle, TypeORM) - use Supabase client directly
- ❌ No state management libraries (Redux, Zustand, Jotai) - use React Server Components
- ❌ No CSS-in-JS (styled-components, Emotion) - use Tailwind only
- ❌ No alternative databases (MongoDB, Firebase, Planetscale)
- ❌ No GraphQL (use Supabase REST/RPC)

### Minimal Dependencies Only
- Core: `next`, `react`, `react-dom`
- Supabase: `@supabase/ssr`, `@supabase/supabase-js`
- Stripe: `stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`
- Validation: `zod`
- Utilities: `date-fns`
- UI: `tailwindcss`, `@radix-ui/*` (via shadcn/ui)

---

## Scope Change Process

### To Add a Feature
1. Identify feature as "critical blocker" with written justification
2. Update this document with version bump (e.g., 1.0 → 1.1)
3. Document reason in "Scope Change Log" section (append-only)
4. Get explicit approval before proceeding

### To Remove a Feature
1. Document why feature is not feasible
2. Update this document with version bump
3. Identify minimal alternative (if critical)
4. Get explicit approval before proceeding

### Scope Change Log (Append-Only)
_No changes as of V1.0 (2026-02-13)_

---

## Verification Checklist (Pre-Deployment)

Before V1 can be considered "complete", ALL of the following MUST pass:

### Security
- [ ] RLS enabled on all tables (verified via SQL query)
- [ ] Multi-tenant isolation tested (chef A cannot see chef B's data)
- [ ] Role resolution is authoritative (tested via role change in DB)
- [ ] Middleware blocks wrong portal access (manual browser test)
- [ ] Service role key only used server-side (grep codebase)

### Financial
- [ ] Ledger entries are immutable (UPDATE/DELETE triggers block)
- [ ] Amounts stored in cents (no DECIMAL types)
- [ ] Webhook idempotency works (duplicate event test)
- [ ] Balances computed from ledger (no balance columns on events)
- [ ] Stripe reconciliation matches (manual dashboard check)

### Lifecycle
- [ ] Invalid transitions blocked (attempt skip state)
- [ ] Permission checks work (client cannot confirm event)
- [ ] Audit log complete (all transitions logged)
- [ ] Terminal states are terminal (cannot transition from completed)

### Portal Isolation
- [ ] No "flash of wrong portal" (network tab shows redirect)
- [ ] Layout blocks before client code (view-source check)
- [ ] RLS prevents data leak (queries return empty, not wrong data)

### End-to-End
- [ ] Full flow works: chef creates → invites client → client accepts → pays → chef confirms → completes
- [ ] Payment flow works: Stripe test card → webhook fires → ledger updated → event transitions
- [ ] Invitation flow works: chef invites → client receives email → signs up → sees event

---

## Acceptance Criteria

V1 is considered "shipped" when:

1. ✅ All features in "V1 Feature List" are implemented and tested
2. ✅ All items in "Verification Checklist" pass
3. ✅ No features from "V1 Exclusions" are present
4. ✅ All Non-Negotiable System Laws are enforced
5. ✅ Codebase is deployable to Vercel + Supabase production
6. ✅ Stripe webhooks work in production environment
7. ✅ At least one real chef can create an event and receive payment from one real client

---

**Scope Lock Status**: ✅ FROZEN
**Implementation May Begin**: ✅ YES (pending approval)

_This document is the contract for ChefFlow V1. Treat it as immutable._
