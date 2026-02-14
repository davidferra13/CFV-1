# Changelog

All notable changes to ChefFlow V1 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### In Progress
- Initial V1 development

---

## [1.0.0] - 2026-02-13

### Added - Initial V1 Release

#### Authentication & User Management
- Chef signup (email/password via Supabase Auth)
- Client signup (invitation-based only)
- Email/password signin (both portals)
- Session management (Supabase cookies)
- Authoritative role assignment (`user_roles` table)
- Password reset (Supabase built-in)

#### Chef Portal Features
- Chef dashboard (summary view of events)
- Event CRUD (create, read, update, delete)
- Event lifecycle management (draft → proposed → confirmed → completed)
- Client invitation system (email-based invitations)
- Client management (view client list and details)
- Financial view (ledger audit log, payment status)
- Basic menu CRUD (create menu templates, attach to events)

#### Client Portal Features
- Client dashboard ("My Events" list)
- Event details view (read-only event info)
- Event acceptance (accept proposed events)
- Payment integration (Stripe Checkout/Elements)
- Payment receipt view (from ledger)
- Menu viewing (read-only attached menus)

#### Public Layer Features
- Landing page (static marketing content)
- Pricing page (static content)
- Contact page (simple form or email link)

#### Payment & Financial System
- Stripe integration (PaymentIntent API)
- Stripe Elements for card input
- Webhook endpoint (`/api/webhooks/stripe`)
- Webhook event handling:
  - `payment_intent.succeeded` → ledger entry → event transition
  - `payment_intent.payment_failed` → logged to ledger
  - `charge.refunded` → negative ledger entry
- Append-only ledger system
- Computed financial views (`event_financial_summary`)
- Idempotency via `stripe_event_id` unique constraint
- Event financial status (deposit paid, fully paid, balance calculation)

#### Database & Infrastructure
- PostgreSQL schema (via Supabase)
- Row Level Security (RLS) policies on all tables
- Database migrations (version-controlled)
- Immutability triggers (ledger, transitions)
- Database indexes (tenant_id, event_id, created_at)
- Multi-tenant isolation (database-enforced)

#### Developer Experience
- TypeScript types (generated from schema)
- Environment configuration (.env.local)
- Verification scripts (RLS, immutability, migrations)

### Security
- Multi-tenant isolation enforced at database layer
- Row Level Security (RLS) on all tables
- Defense in depth (middleware + layouts + RLS)
- Authoritative role resolution (never inferred from URL)
- Service role key server-side only
- Stripe webhook signature verification
- Idempotent webhook handling

### Documentation
- CHEFFLOW_V1_SCOPE_LOCK.md (system laws and scope)
- ARCHITECTURE.md (system architecture)
- README.md (project overview)
- VERIFICATION_GUIDE.md (testing procedures)
- All feature documentation (20+ docs)

---

## Version History

- **1.0.0** (2026-02-13) - Initial V1 release

---

## Scope Change Log

From `CHEFFLOW_V1_SCOPE_LOCK.md`:

_No changes as of V1.0 (2026-02-13)_

---

## Upgrade Notes

### From Development to 1.0.0

1. Run database migrations:
   - `20260213000001_initial_schema.sql`
   - `20260213000002_rls_policies.sql`

2. Set environment variables (see ENV_VARIABLES.md)

3. Deploy to Vercel

4. Configure Stripe webhook

5. Run verification scripts

---

## Future Versions

Post-V1 features planned for V2:

- Email notifications (event updates, payment receipts)
- Calendar integration (Google Calendar, iCal)
- File uploads (photos, contracts)
- Advanced menu builder
- Analytics dashboard
- Multi-chef collaboration

See `CHEFFLOW_V1_SCOPE_LOCK.md` for full V1 exclusions list.

---

**Maintained By**: ChefFlow V1 Team
**Last Updated**: 2026-02-13
