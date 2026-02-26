# Canonical Glossary (ChefFlow V1)

**Document ID**: GLOSS-001
**Version**: 1.0
**Status**: LOCKED
**Last Updated**: 2026-02-14

---

## Purpose

This document is the **single source of truth** for all ChefFlow terminology. It defines canonical terms used across all documentation, code, and user interfaces to ensure consistency and prevent ambiguity.

**Authority**: When a term has multiple possible meanings, this glossary defines the official ChefFlow usage.

---

## How to Use This Glossary

1. **Writing Documentation**: Use exact terms from this glossary
2. **Naming Code Artifacts**: Reference this glossary for variable/function names
3. **User Interface Copy**: Use glossary terms in UI labels and messages
4. **Resolving Disputes**: This glossary is authoritative

---

## Table of Contents

- [Core Entities](#core-entities)
- [Roles and Access](#roles-and-access)
- [Event Lifecycle](#event-lifecycle)
- [Financial Terms](#financial-terms)
- [Data Architecture](#data-architecture)
- [Security Concepts](#security-concepts)
- [System Concepts](#system-concepts)
- [Technical Terms](#technical-terms)

---

## Core Entities

### Chef

**Definition**: A tenant owner who operates a culinary business using ChefFlow.

**Usage**: Always capitalize when referring to the role (e.g., "Chef portal"). Lowercase when generic (e.g., "a chef prepares food").

**Database**: `chefs` table, `role = 'chef'`

**Not**: "vendor", "caterer", "business owner" (use "Chef" consistently)

---

### Client

**Definition**: An end-user customer who books events with a Chef.

**Usage**: Always capitalize when referring to the role (e.g., "Client portal"). Lowercase when generic.

**Database**: `clients` table (now `client_profiles` to avoid confusion), `role = 'client'`

**Not**: "customer", "guest", "user" (use "Client" for clarity)

**Note**: "Guest" refers to attendees at an event (guest_count), not the Client booking the event.

---

### Tenant

**Definition**: An isolated data partition belonging to a single Chef. All data is scoped to a tenant.

**Usage**: "Tenant" and "Chef" are often synonymous (tenant_id = chef.id), but "tenant" emphasizes data isolation, while "Chef" emphasizes the user role.

**Database**: `tenant_id` foreign key references `chefs.id`

**Example**: "Events belong to a tenant" (data isolation), "Chef creates events" (user action)

---

### Event

**Definition**: A booked culinary service with a specific date, location, client, and menu.

**Usage**: Singular "event", plural "events". Not "booking", "job", "gig", "order".

**Database**: `events` table

**Lifecycle**: draft → proposed → accepted → paid → confirmed → in_progress → completed OR canceled

---

### Menu

**Definition**: A structured list of dishes (sections + items) created by a Chef.

**Usage**: Can be a "menu template" (reusable) or an "event menu" (linked to specific event).

**Database**: `menus` table (templates), `event_menus` table (linked to events)

**Not**: "recipe", "offering", "selection"

---

### Subaccount

**Definition**: A limited-access user within a Chef's tenant (e.g., assistant, sous chef).

**Usage**: "Chef subaccount" or "subaccount user". Always lowercase "subaccount".

**Database**: `role = 'chef_subaccount'`

**Not**: "sub-chef", "team member", "staff" (use "subaccount" for precision)

---

## Roles and Access

### Role

**Definition**: A user's permission level, determining which portal they access and what actions they can perform.

**Allowed Values**: `chef`, `chef_subaccount`, `client`

**Database**: `user_roles.role` column

**Not**: "permission", "privilege", "access level" (use "role" consistently)

---

### Portal

**Definition**: A distinct user interface tailored to a specific role.

**Portals**:

- **Chef Portal**: `/chef/*` (chefs and subaccounts)
- **Client Portal**: `/client/*` (clients)
- **Public Layer**: `/` (unauthenticated visitors)

**Usage**: Always capitalize (e.g., "Chef Portal", "Client Portal")

**Not**: "dashboard", "app", "interface" (use "portal" for consistency)

---

### Authority

**Definition**: The definitive source of truth for a decision or piece of data.

**Example**: "Server is authoritative for all business logic" (server authority)

**Usage**: "Server-authoritative", "database-authoritative", "chef-authoritative menu"

**Not**: "source of truth" (use both interchangeably, but "authority" is more precise)

---

### Projection

**Definition**: A filtered, read-only view of data tailored for a specific audience.

**Example**: "Client-safe projection" excludes chef-private fields like `internal_notes`.

**Usage**: "Chef truth → Client projection" (transformation from authoritative to view)

**Not**: "view", "filtered data", "subset" (use "projection" for clarity)

---

### Boundary

**Definition**: A logical separation between system components, often enforcing trust or access rules.

**Examples**:

- **Trust Boundary**: Server vs. client (server never trusts client input)
- **Tenant Boundary**: Data isolation between tenants
- **Portal Boundary**: Chef Portal vs. Client Portal

**Usage**: "Cross-boundary access is forbidden"

**Not**: "separation", "division", "barrier" (use "boundary" for precision)

---

## Event Lifecycle

### Draft

**Definition**: Event status before being shared with the Client. Fully editable by Chef.

**Database**: `status = 'draft'`

**Usage**: "Draft event", "event in draft state"

---

### Proposed

**Definition**: Event status after Chef sends proposal to Client. Client can now view and accept/decline.

**Database**: `status = 'proposed'`

**Transition**: draft → proposed (Chef action)

---

### Accepted

**Definition**: Event status after Client accepts proposal. Awaiting payment.

**Database**: `status = 'accepted'`

**Transition**: proposed → accepted (Client action)

---

### Paid

**Definition**: Event status after deposit payment succeeds. Stripe webhook triggers this transition.

**Database**: `status = 'paid'`

**Transition**: accepted → paid (System webhook)

---

### Confirmed

**Definition**: Event status after Chef confirms all details are final. Ready for preparation.

**Database**: `status = 'confirmed'`

**Transition**: paid → confirmed (Chef action)

---

### In Progress

**Definition**: Event status when event is actively being executed (day of event).

**Database**: `status = 'in_progress'`

**Transition**: confirmed → in_progress (Chef action)

**Not**: "in-progress" (no hyphen), "ongoing", "active"

---

### Completed / Executed

**Definition**: Event status after event has been successfully executed. Terminal state.

**Database**: `status = 'completed'` OR `status = 'executed'`

**Usage**: Use "completed" in UI, "executed" in internal docs (both are valid)

**Transition**: in_progress → completed (Chef action)

---

### Canceled

**Definition**: Event status when event is canceled before execution. Terminal state.

**Database**: `status = 'canceled'`

**Usage**: American spelling "canceled" (one 'l'), not "cancelled"

**Transition**: Any non-terminal state → canceled (Chef action)

---

### Terminal State

**Definition**: An event status from which no further transitions are allowed.

**Terminal States**: `completed`, `canceled`

**Usage**: "Event is in a terminal state" (cannot transition)

---

### Transition

**Definition**: A change from one event status to another, logged in the audit trail.

**Database**: `event_transitions` table

**Usage**: "Event transition from draft to proposed", "transition map", "state transition"

**Not**: "change", "update", "move" (use "transition" for state changes)

---

## Financial Terms

### Ledger

**Definition**: An append-only log of all financial transactions. The single source of truth for payment state.

**Database**: `ledger_entries` table

**Usage**: "Ledger entry", "financial ledger", "append to ledger"

**Not**: "transaction log", "payment log", "financial record" (use "ledger" consistently)

---

### Ledger Entry

**Definition**: A single immutable record in the ledger representing a financial event.

**Database**: One row in `ledger_entries`

**Entry Types**: `charge_succeeded`, `charge_failed`, `refund_succeeded`, `refund_failed`, `adjustment`

**Usage**: "Create ledger entry", "ledger entry type"

---

### Append-Only

**Definition**: A data structure where records can be added but never updated or deleted.

**Applied To**: Ledger entries, event transitions, audit logs

**Usage**: "Ledger is append-only", "append-only audit trail"

**Enforcement**: Database triggers prevent UPDATE/DELETE

---

### Minor Units

**Definition**: The smallest currency denomination (cents for USD, pence for GBP).

**Usage**: "Store amounts in minor units" (e.g., $10.00 = 1000 cents)

**Database**: `amount_cents` columns are INTEGER (not DECIMAL)

**Not**: "cents", "pennies" (use "minor units" for currency-agnostic language)

---

### Deposit

**Definition**: A partial payment made upfront to secure an event booking.

**Database**: `deposit_amount_cents` column

**Usage**: "Deposit payment", "pay deposit", "deposit required"

**Typical**: 50% of total amount (configurable)

---

### Balance

**Definition**: The remaining amount owed after partial payments.

**Calculation**: `balance = total - collected`

**Database**: Computed from ledger entries (not stored)

**Usage**: "Balance due", "remaining balance"

---

### Fully Paid

**Definition**: Payment state where collected amount equals or exceeds total amount.

**Calculation**: `collected >= total`

**Database**: Derived from `event_financial_summary` view

**Usage**: "Event is fully paid", "payment complete"

---

### Idempotency

**Definition**: The property that an operation can be repeated multiple times with the same result (no duplicate effects).

**Applied To**: Stripe webhooks, ledger writes, invite acceptance

**Example**: Processing the same Stripe webhook twice does not create duplicate ledger entries.

**Enforcement**: Unique constraints on `stripe_event_id`

---

## Data Architecture

### RLS (Row-Level Security)

**Definition**: Database-enforced access control that filters query results based on user session.

**Applied To**: All Supabase tables

**Usage**: "RLS policy", "RLS enforcement", "RLS enabled"

**Example**: Chef can only query events where `tenant_id` matches their session tenant_id.

---

### Immutability

**Definition**: The property that a record, once created, can never be modified or deleted.

**Applied To**: Ledger entries, event transitions, user roles (V1)

**Enforcement**: Database triggers prevent UPDATE/DELETE

**Usage**: "Immutable ledger", "immutability enforcement"

---

### Tenant Isolation

**Definition**: Data segregation ensuring one tenant cannot access another tenant's data.

**Enforcement**: RLS policies, foreign key constraints, server-side checks

**Usage**: "Enforce tenant isolation", "tenant boundary"

**Violation**: "Cross-tenant data leak"

---

### Projection Contract

**Definition**: A formal specification of which fields are visible to which roles.

**Example**: Client projection of menu excludes `chef_notes` field.

**Usage**: "Client-safe projection", "projection rules"

**Not**: "filtered view", "subset" (use "projection" for clarity)

---

### View (Database)

**Definition**: A virtual table derived from underlying tables, often used for computed data.

**Examples**: `event_financial_summary`, `client_events`

**Usage**: "Financial summary view", "database view"

**Not**: "projection" (views are for computation, projections are for filtering)

---

### Derived Data

**Definition**: Data computed from other tables, not stored directly.

**Examples**: Event balance (from ledger), loyalty points (from events)

**Usage**: "Balance is derived", "derived from ledger"

**Enforcement**: No direct UPDATE allowed on derived data

---

## Security Concepts

### Server Authority

**Definition**: The principle that all critical business logic and validation happens on the server, never trusting client input.

**Usage**: "Server is authoritative", "server-side enforcement"

**Violation**: "Client-trusted logic" (forbidden)

---

### Fail Closed

**Definition**: The principle that systems default to denial when uncertain (opposite of "fail open").

**Example**: If role is unknown, deny access (don't default to a permissive role).

**Usage**: "Fail closed policy", "deny by default"

---

### Defense in Depth

**Definition**: Layered security approach with multiple enforcement points.

**Layers**: Middleware, server layout, RLS, server actions

**Usage**: "Defense in depth strategy", "multiple layers of enforcement"

---

### Safe Freeze

**Definition**: A UI state where an operation is pending and user input is temporarily disabled to prevent race conditions.

**Example**: "Processing payment..." (button disabled until webhook confirms)

**Usage**: "Safe freeze during payment", "freeze state"

**Not**: "loading state" (loading is generic, safe freeze is specific to race prevention)

---

### Signed URL

**Definition**: A temporary URL with embedded authentication, used for secure file access.

**Applied To**: Menu PDFs, attachment downloads

**Expiration**: 1 hour (default)

**Usage**: "Generate signed URL", "signed URL expiration"

---

## System Concepts

### Webhook

**Definition**: An HTTP callback sent by external service (Stripe) to notify ChefFlow of events.

**Example**: `payment_intent.succeeded` webhook triggers ledger entry creation.

**Usage**: "Stripe webhook", "webhook handler", "webhook signature verification"

**Endpoint**: `/api/webhooks/stripe` (POST)

---

### Server Action

**Definition**: A Next.js function marked `'use server'` that executes server-side business logic, callable from client components.

**Example**: `createEvent()`, `transitionEvent()`, `acceptProposal()`

**Usage**: "Server action", "action handler"

**Not**: "API route", "RPC" (use "server action" for Next.js pattern)

---

### Revalidation

**Definition**: Next.js cache invalidation triggered after data mutation to ensure UI reflects latest data.

**Example**: After creating event, revalidate `/events` path.

**Usage**: "Revalidate path", "cache revalidation"

**Function**: `revalidatePath()`, `revalidateTag()`

---

### Service Role

**Definition**: A privileged Supabase client that bypasses RLS, used only for system operations.

**Usage**: Stripe webhooks use service role to write ledger entries.

**Security**: Service role key is server-only, never exposed to client.

**Usage**: "Service role key", "service role bypass"

---

### Guard

**Definition**: A precondition check that determines if a state transition is allowed.

**Example**: "Can only transition to `paid` if deposit amount is collected"

**Usage**: "Transition guard", "guard condition"

---

### Side Effect

**Definition**: An action triggered by a state transition (e.g., sending email, creating ledger entry).

**Example**: Transitioning to `paid` creates a ledger entry (side effect).

**Usage**: "Transition side effects", "side effect handling"

---

## Technical Terms

### Schema

**Definition**: The structure of database tables, columns, types, and constraints.

**Usage**: "Database schema", "schema migration", "schema contract"

**File**: Defined in Supabase migrations (`supabase/migrations/*.sql`)

---

### Migration

**Definition**: A versioned SQL script that modifies database schema.

**Usage**: "Run migrations", "migration script", "database migration"

**Ordering**: Migrations applied sequentially by timestamp

---

### Enum

**Definition**: A database type with a fixed set of allowed values.

**Examples**: `event_status`, `ledger_entry_type`, `user_role`

**Usage**: "Event status enum", "enum values"

**Database**: PostgreSQL ENUMs or TEXT with CHECK constraint

---

### UUID

**Definition**: Universally Unique Identifier, used as primary keys in ChefFlow.

**Format**: `550e8400-e29b-41d4-a716-446655440000`

**Usage**: "Event UUID", "generate UUID"

**Database**: All primary keys are `UUID DEFAULT gen_random_uuid()`

---

### Seed Data

**Definition**: Pre-populated data used for development, testing, or demo environments.

**Usage**: "Seed database", "seed script", "seed scenarios"

**File**: `scripts/seed-dev-data.ts`

---

### Verification Script

**Definition**: An automated test that validates system invariants (RLS, immutability, etc.).

**Examples**: `verify-rls.sql`, `verify-immutability.sql`

**Usage**: "Run verification scripts", "verification harness"

**Location**: `scripts/verify-*.sql`

---

### Acceptance Test

**Definition**: A black-box test scenario verifying system behavior from a user perspective.

**Usage**: "Acceptance test scenario", "acceptance criteria"

**Not**: "unit test", "integration test" (acceptance tests are end-to-end)

---

## User Interface Terms

### Dashboard

**Definition**: The main overview page after login, showing key metrics and recent activity.

**Usage**: "Chef dashboard", "Client dashboard"

**Routes**: `/chef/dashboard`, `/client/dashboard`

---

### Invitation

**Definition**: A one-time link sent to a Client's email, allowing them to create an account.

**Database**: `invitations` table (if exists) or embedded in `clients` table

**Usage**: "Send invitation", "invitation token", "accept invitation"

**Expiration**: 7 days

---

### Notification

**Definition**: A system-generated message alerting users of events (e.g., payment received).

**Usage**: "Email notification", "in-app notification"

**Future**: V2 feature (V1 scope: email only)

---

### Attachment

**Definition**: A file uploaded by Chef or Client and linked to an event thread.

**Database**: `attachments` table

**Storage**: Supabase Storage bucket

**Usage**: "Upload attachment", "attachment link"

---

### Thread

**Definition**: A conversation context scoped to a specific event, containing messages and attachments.

**Usage**: "Event thread", "message thread"

**Not**: "chat", "conversation" (use "thread" for consistency)

---

## Naming Conventions (Code)

### Table Names

**Convention**: Plural, lowercase, snake_case

**Examples**: `events`, `ledger_entries`, `event_transitions`, `user_roles`

**Not**: Singular (`event`), CamelCase (`EventTransitions`)

---

### Column Names

**Convention**: Lowercase, snake_case

**Examples**: `tenant_id`, `created_at`, `amount_cents`, `is_finalized`

**Not**: CamelCase (`createdAt`), PascalCase (`TenantId`)

---

### Enum Values

**Convention**: Lowercase, snake_case

**Examples**: `charge_succeeded`, `in_progress`, `chef_subaccount`

**Not**: UPPER_CASE (`CHARGE_SUCCEEDED`), CamelCase (`chargeSucceeded`)

---

### TypeScript Types

**Convention**: PascalCase for types, camelCase for variables

**Examples**: `Event`, `LedgerEntry`, `CreateEventInput`

**Variables**: `event`, `ledgerEntry`, `createEventInput`

---

### File Names

**Convention**: kebab-case for files

**Examples**: `event-actions.ts`, `verify-rls.sql`, `create-event-form.tsx`

**Not**: snake_case (`event_actions.ts`), PascalCase (`EventActions.ts`)

---

### Markdown Docs

**Convention**: UPPER_SNAKE_CASE for topic docs, kebab-case for procedural docs

**Examples**: `SYSTEM_LAWS.md`, `PERMISSION_MATRIX.md`, `059-data-seeding-guide.md`

---

## Anti-Patterns (Avoid)

### Don't Say "User"

**Problem**: Ambiguous (Chef? Client? Public visitor?)

**Use Instead**: Specify role (Chef, Client, unauthenticated visitor)

---

### Don't Say "Customer"

**Problem**: Ambiguous (Client? Chef as our customer?)

**Use Instead**: "Client" for end-users, "Chef" for our customers

---

### Don't Say "Booking"

**Problem**: Not ChefFlow terminology

**Use Instead**: "Event"

---

### Don't Say "Transaction"

**Problem**: Ambiguous (database transaction? payment?)

**Use Instead**: "Ledger entry" (financial), "database transaction" (SQL)

---

### Don't Say "Record"

**Problem**: Too generic

**Use Instead**: Specific entity (event, client, ledger entry)

---

### Don't Say "Status"

**Problem**: Ambiguous (event status? payment status? user status?)

**Use Instead**: Qualified status (event status, payment state)

---

### Don't Say "Cancelled" (British Spelling)

**Problem**: Inconsistent with American English codebase

**Use Instead**: "canceled" (one 'l')

---

## Acronyms and Abbreviations

| Acronym  | Full Term                         | Usage                        |
| -------- | --------------------------------- | ---------------------------- |
| **RLS**  | Row-Level Security                | Database access control      |
| **UUID** | Universally Unique Identifier     | Primary key format           |
| **API**  | Application Programming Interface | External service integration |
| **UI**   | User Interface                    | Frontend components          |
| **UX**   | User Experience                   | Design principles            |
| **DoD**  | Definition of Done                | Completion criteria          |
| **V1**   | Version 1                         | Initial release scope        |
| **MVP**  | Minimum Viable Product            | Synonymous with V1           |

---

## Cross-References

When using terms from this glossary in documentation:

**Good**:

- "The Chef creates an Event in draft status" (uses glossary terms)
- "RLS enforces tenant isolation" (uses exact glossary phrase)

**Bad**:

- "The user creates a booking" (ambiguous, not glossary terms)
- "Row level security prevents cross-customer access" (inconsistent phrasing)

---

## Updating This Glossary

**Process**:

1. Identify term conflict or ambiguity
2. Propose canonical definition in GitHub issue
3. Update this glossary (requires approval)
4. Update all docs to use canonical term
5. Update codebase to align

**Authority**: This glossary is versioned and locked. Changes require scope unlock.

---

## Related Documents

- [PERMISSION_MATRIX.md](./PERMISSION_MATRIX.md) - Uses role/resource terminology from this glossary
- [01_SYSTEM_LAWS.md](./chef-portal/01_SYSTEM_LAWS.md) - Uses authority, immutability, tenant isolation terms
- [06_EVENT_TRANSITION_MAP.md](./chef-portal/06_EVENT_TRANSITION_MAP.md) - Uses event status terminology
- [32_DATA_DICTIONARY.md](./chef-portal/32_DATA_DICTIONARY.md) - Database-specific definitions

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14
**Governance**: ChefFlow System Constitution
