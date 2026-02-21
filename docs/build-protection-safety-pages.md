# Build: Protection Hub & Safety Pages

## What was built

11 server-rendered Next.js page files covering two new surface areas: the **Protection Hub** (under `/settings/protection/`) and the **Safety** section (under `/safety/`).

## Files created

### Protection Hub

| File                                                      | Route                                  | Purpose                                                      |
| --------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------ |
| `app/(chef)/settings/protection/page.tsx`                 | `/settings/protection`                 | Overview grid — status of all 6 protection areas             |
| `app/(chef)/settings/protection/insurance/page.tsx`       | `/settings/protection/insurance`       | Insurance policy list                                        |
| `app/(chef)/settings/protection/business-health/page.tsx` | `/settings/protection/business-health` | Business health checklist                                    |
| `app/(chef)/settings/protection/certifications/page.tsx`  | `/settings/protection/certifications`  | Professional certifications (distinct from compliance certs) |
| `app/(chef)/settings/protection/nda/page.tsx`             | `/settings/protection/nda`             | NDA & photo permissions explainer (redirects to /clients)    |
| `app/(chef)/settings/protection/continuity/page.tsx`      | `/settings/protection/continuity`      | Business continuity plan form                                |
| `app/(chef)/settings/protection/crisis/page.tsx`          | `/settings/protection/crisis`          | Crisis response playbook (static)                            |

### Safety

| File                                        | Route                    | Purpose                              |
| ------------------------------------------- | ------------------------ | ------------------------------------ |
| `app/(chef)/safety/incidents/page.tsx`      | `/safety/incidents`      | Incident log with Report button      |
| `app/(chef)/safety/incidents/new/page.tsx`  | `/safety/incidents/new`  | New incident form                    |
| `app/(chef)/safety/incidents/[id]/page.tsx` | `/safety/incidents/[id]` | Incident detail + resolution tracker |
| `app/(chef)/safety/backup-chef/page.tsx`    | `/safety/backup-chef`    | Backup chef contacts                 |

## Patterns followed

All pages follow the established server-component pattern from `settings/compliance/page.tsx` and `settings/emergency/page.tsx`:

- `async` server components (no `'use client'`)
- `requireChef()` from `@/lib/auth/get-user` for auth + role enforcement
- `createServerClient()` from `@/lib/supabase/server` for data fetching
- Tenant scoping on every query via `chef.tenantId!`
- `?? []` null coalescing on all query results
- Client components imported for interactive parts (not called directly)
- Tailwind CSS, `@/components/ui/card`, `@/components/ui/badge`, lucide-react icons

## Data fetching strategy

Pages fetch directly from Supabase rather than calling server action functions. Server actions are mutation-only (called from client components); pages use the Supabase client directly for reads.

## Client components expected (to be created separately)

The following client components are imported but not yet implemented. They will need to be created:

- `@/components/protection/insurance-list`
- `@/components/protection/business-health-checklist`
- `@/components/protection/certification-list`
- `@/components/protection/continuity-plan-form`
- `@/components/protection/crisis-playbook`
- `@/components/safety/incident-list`
- `@/components/safety/incident-form`
- `@/components/safety/incident-resolution-tracker`
- `@/components/safety/backup-chef-list`

## Database tables expected (to be created separately)

These pages query tables that will need migration files:

- `insurance_policies` (columns: `id`, `tenant_id`, `status`, `expiry_date`, `created_at`, ...)
- `business_health_items` (columns: `id`, `tenant_id`, `completed`, `sort_order`, ...)
- `protection_certifications` (columns: `id`, `tenant_id`, `status`, `expiry_date`, `created_at`, ...)
- `safety_incidents` (columns: `id`, `tenant_id`, `title`, `incident_date`, `severity`, `status`, `incident_type`, `location`, `description`, `immediate_actions`, ...)
- `backup_chef_contacts` (columns: `id`, `tenant_id`, `priority`, ...)
- `chefs.business_continuity_plan` (column on existing `chefs` table — ALTER TABLE)

## Protection Hub overview card design

The overview page (`/settings/protection`) shows a 2-column responsive grid with one card per protection area. Each card has:

- A lucide-react icon (amber-600)
- A title
- Status badge(s) derived from live data (e.g., "8/13 complete", "3 active", "1 expiring soon")
- A short description
- A "Manage →" link

Badge colors follow the established convention:

- `success` for fully complete
- `warning` for partial completion or items expiring soon
- `error` for expired or critical
- `default` for neutral counts
- `info` for informational labels (e.g., "Per-client")

## NDA page design decision

The NDA page is intentionally a server-only page with no client component. NDA and photo permissions are per-client settings managed on the client profile, not global settings. The page explains this and provides a direct link to `/clients`. This avoids building a confusing global override UI when the real data lives per client record.

## Crisis playbook design decision

The crisis response playbook is static content — no database fetch needed. It is rendered entirely within `<CrisisPlaybook />` which can be a simple client component with hardcoded playbook steps. No tenant data is involved.
