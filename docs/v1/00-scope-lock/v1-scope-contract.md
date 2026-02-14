# V1 Scope Contract

**Document ID**: 001
**Version**: 1.0
**Status**: LOCKED
**Last Updated**: 2026-02-14

## Purpose

This document defines the immutable contract for what ChefFlow V1 IS and IS NOT. It serves as the authoritative reference for all implementation decisions.

## What V1 Is

ChefFlow V1 is a **minimal viable multi-tenant SaaS platform** for private chefs to manage events, clients, and payments.

### Core Characteristics

1. **Multi-Tenant SaaS**: Each chef operates in an isolated tenant with database-enforced boundaries
2. **Dual-Portal Architecture**: Separate chef and client experiences with role-based access
3. **Ledger-First Financial System**: All payment state derives from append-only ledger
4. **Stripe-Only Payments**: Single payment provider, card payments only
5. **Invitation-Based Client Access**: Clients cannot self-register, must be invited by chef
6. **Server-Rendered by Default**: Next.js App Router, React Server Components, minimal client JS
7. **Database-Enforced Security**: Row Level Security (RLS) as primary defense layer

## What V1 Is NOT

1. **NOT a Marketplace**: No chef discovery, no public chef profiles, no client shopping
2. **NOT Multi-Chef Collaborative**: One chef per tenant, no team members or assistants
3. **NOT a CRM**: No advanced client relationship tools, no email campaigns, no automation
4. **NOT an Inventory System**: No ingredient tracking, no shopping lists, no cost calculations
5. **NOT a Communication Platform**: No in-app messaging, no notifications (email or SMS)
6. **NOT Mobile-Native**: Web-only, responsive design, no native iOS/Android apps
7. **NOT Feature-Rich**: Deliberately minimal, no "nice-to-haves", strictly needs-based

## Scope Boundaries

### Feature Surface

**Included**:
- Event CRUD (create, read, update lifecycle states)
- Client invitation and management (scoped to tenant)
- Payment collection via Stripe (deposit or full amount)
- Ledger-based financial tracking (append-only audit log)
- Basic menu templates (name, description, price, attach to events)
- Event lifecycle state machine (8 states, validated transitions)
- Role-based portal access (chef vs client)

**Excluded**:
- Email/SMS notifications
- File uploads (photos, contracts, invoices)
- Calendar integration
- Advanced reporting/analytics
- Multi-language support
- Payment plans/installments
- Tip/gratuity handling
- Recurring events
- Contract generation
- In-app communication

### Data Model Surface

**7 Core Tables**:
1. `chefs` - Tenant root (one per chef)
2. `clients` - Client records (tenant-scoped)
3. `user_roles` - Auth-to-role mapping (authoritative)
4. `events` - Event records (tenant-scoped)
5. `event_transitions` - State change audit log (immutable)
6. `ledger_entries` - Financial ledger (append-only, immutable)
7. `menus` - Menu templates (tenant-scoped)

**Supporting Tables**:
- `event_menus` - Many-to-many join (events ↔ menus)

**Prohibited Tables** (V1):
- `notifications`
- `messages`
- `files`/`uploads`
- `invoices`
- `contracts`
- `reviews`
- `calendar_events`
- `team_members`

## Technology Boundaries

### Required Stack

**Framework**: Next.js 14+ (App Router, TypeScript strict mode)
**Database**: Supabase (PostgreSQL + Auth + RLS)
**Payments**: Stripe (Checkout, Elements, Webhooks)
**Styling**: Tailwind CSS + Radix UI (via shadcn/ui)
**Validation**: Zod
**Date Handling**: date-fns

### Prohibited Technologies

- ORMs (Prisma, Drizzle, TypeORM)
- State Management (Redux, Zustand, Jotai)
- CSS-in-JS (styled-components, Emotion)
- Alternative Databases (MongoDB, Firebase)
- GraphQL
- WebSockets
- Real-time Subscriptions (in V1)

## User Boundaries

### Chef Capabilities

**CAN**:
- Create/update/delete events (tenant-scoped)
- Invite clients (email-based invitation)
- View financial ledger (read-only)
- Transition event states (with validation)
- Create/edit menu templates
- View client list (tenant-scoped)

**CANNOT**:
- See other chefs' data (enforced by RLS)
- Manually edit ledger (append-only, webhook-driven)
- Skip event lifecycle states
- Delete paid events (soft delete only)
- Assign roles to users (system-managed)

### Client Capabilities

**CAN**:
- View events where they are the client
- Accept proposed events
- Pay via Stripe (deposit or full)
- View payment receipts (from ledger)
- View attached menus (read-only)

**CANNOT**:
- Create events
- Invite other clients
- See other clients' events (enforced by RLS)
- Access chef portal
- Modify event details
- Initiate refunds

## Deployment Boundaries

### Supported Environments

1. **Local Development**: `.env.local` + Supabase CLI
2. **Staging** (optional): Vercel Preview + Supabase Staging Project
3. **Production**: Vercel Production + Supabase Production Project

### Deployment Constraints

- **Hosting**: Vercel only (no AWS, GCP, Azure in V1)
- **Database**: Supabase-hosted Postgres (no self-hosted)
- **Payments**: Stripe-hosted (no self-hosted payment processing)
- **CDN**: Vercel Edge Network (built-in)
- **SSL**: Vercel-managed certificates (no custom cert management)

## Change Control

### Scope Lock Process

This contract is **FROZEN** for V1 implementation.

**To add a feature**:
1. Document as "critical blocker" with justification
2. Update this document with version bump (1.0 → 1.1)
3. Get explicit approval
4. Update scope change log

**To remove a feature**:
1. Document infeasibility reason
2. Identify minimal alternative (if critical)
3. Update this document with version bump
4. Get explicit approval

### Scope Change Log

**V1.0** (2026-02-14): Initial scope lock

---

## Acceptance Criteria

V1 is complete when:

1. All features in CHEFFLOW_V1_SCOPE_LOCK.md are implemented
2. All system laws are enforced
3. All exclusions remain excluded
4. Security verification passes
5. Payment flow works end-to-end (test mode)
6. One chef can serve one client through full lifecycle

---

**Authority**: This document supersedes verbal agreements, assumptions, and "while we're here" suggestions.
**Enforcement**: Any code introducing out-of-scope features MUST be rejected in review.
**Expiry**: This contract remains in effect until V2 planning begins (post-V1 production deployment).
