# Feature Flag Registry — ChefFlow V1

**Last reviewed:** 2026-02-20

This document is the authoritative list of all feature flags in the system. When a flag is added or removed, this document must be updated.

---

## Flag Types

ChefFlow has two categories of feature flags:

1. **Global flags** — Environment variables in Vercel/`.env.local`. Apply to all users/tenants.
2. **Per-chef flags** — Rows in the `chef_feature_flags` table. Apply to specific chef tenants.

---

## Global Flags (Environment Variables)

Defined in `lib/features.ts`.

| Flag | Variable | Type | Default | Purpose | Sunset Date |
|------|----------|------|---------|---------|-------------|
| Communication Triage UI | `COMM_TRIAGE_ENABLED` | boolean | `false` | Enables `/inbox` communication triage view and dual-write ingestion pipeline | TBD |
| Ops Copilot | `OPS_COPILOT_ENABLED` | boolean | `false` | Enables scheduled copilot planning runs and run logging | TBD |
| Ops Autonomy Level | `OPS_AUTONOMY_LEVEL` | integer | `0` | `0` = draft only, `1` = assisted, `2` = auto-safe | TBD |
| PWA Build | `ENABLE_PWA_BUILD=1` | boolean | off | Enables next-pwa manifest/service worker generation (disabled on Windows due to build bug) | TBD |
| Sentry Force Enable | `SENTRY_FORCE_ENABLE=true` | boolean | off | Enables Sentry in local development (default: production only) | permanent |
| E2E Remote DB | `SUPABASE_E2E_ALLOW_REMOTE=true` | boolean | off | Allows E2E tests to run against remote Supabase (not local) | permanent |
| Maintenance Mode | `MAINTENANCE_MODE=1` | boolean | off | Displays maintenance page to all visitors (see disaster-recovery.md) | emergency use only |

---

## Per-Chef Flags (Database Table)

Managed via `lib/admin/flag-actions.ts` and the admin panel.

Table: `chef_feature_flags` (migration: `20260306000011_chef_feature_flags.sql`)

| Flag Name | Description | Default | Who enables it | Status |
|-----------|-------------|---------|----------------|--------|
| `beta_realtime` | Enable Supabase Realtime subscription hooks (live event status, notifications) | false | Admin on request | Beta |
| `beta_calendar_sync` | Enable Google Calendar two-way sync | false | Admin on request | Beta |
| `beta_client_portal_v2` | Enable redesigned client portal | false | Admin on request | Beta |
| `advanced_analytics` | Enable advanced revenue analytics charts | false | Admin on request | Stable |
| `ops_copilot` | Per-chef override for Ops Copilot (requires global flag ON) | false | Admin on request | Alpha |
| `comm_triage` | Per-chef override for Communication Triage (requires global flag ON) | false | Admin on request | Alpha |
| `instacart_integration` | Enable Instacart cart generation in Grocery Quote | false | Admin on request | Beta |
| `mealme_pricing` | Enable MealMe local store pricing in Grocery Quote | false | Admin on request | Beta |

---

## Flag Lifecycle Policy

Every flag must go through a lifecycle:

1. **Alpha** — Only 1–3 chef testers. Not documented in changelog. May be removed without notice.
2. **Beta** — Available to chefs who request it. Documented. May have rough edges.
3. **Stable** — Available to all chefs. Default-on or admin-on via per-chef flag.
4. **Sunset** — Flag is being removed. All chefs transitioned. Code cleanup scheduled.
5. **Removed** — Flag deleted from code and this registry.

### Sunset Rules

- A flag cannot be removed without a documented sunset date and 30-day notice (for stable/beta flags)
- A flag that has been "stable" for 6+ months should either be made the default (flag removed) or kept as a permanent option
- Flags must not accumulate indefinitely — if a flag hasn't been toggled in 3 months, evaluate for promotion or removal

---

## How to Add a New Flag

### Global flag:

1. Add the env var to `.env.local.example` with a comment explaining what it does
2. Add the check to `lib/features.ts`:
   ```typescript
   export const FEATURE_NEW_THING = process.env.NEW_THING_ENABLED === 'true'
   ```
3. Add a row to this document (with a sunset date if appropriate)
4. Add the variable to Vercel environment for production when ready

### Per-chef flag:

1. Decide on the flag name (snake_case, descriptive)
2. The `chef_feature_flags` table is a JSONB column — no migration needed for new flag names
3. Add the check in code:
   ```typescript
   const { data: flag } = await supabase
     .from('chef_feature_flags')
     .select('enabled')
     .eq('tenant_id', tenantId)
     .eq('flag_name', 'new_flag_name')
     .single()
   const isEnabled = flag?.enabled ?? false
   ```
4. Add a row to this document
5. Enable for alpha testers via admin panel

---

## Admin Operations

```typescript
import { toggleChefFlag, setBulkChefFlags } from '@/lib/admin/flag-actions'

// Enable a flag for a specific chef:
await toggleChefFlag(tenantId, 'beta_realtime', true)

// Enable for multiple chefs at once:
await setBulkChefFlags(['tenantId1', 'tenantId2'], 'beta_calendar_sync', true)
```

All flag changes are logged to `admin_audit_log` via `logAdminAction()`.

---

*Last updated: 2026-02-20*
