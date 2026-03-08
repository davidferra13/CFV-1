# Admin Super View

Platform-wide visibility for the admin. See everything happening across all chefs.

## Architecture

Two complementary systems:

### 1. View as Chef (Impersonation Mode)

Admin clicks "View as Chef" on `/admin/users` and the entire app renders as if they ARE that chef. All data queries route through the impersonated chef's tenant context.

**How it works:**

- Cookie `chefflow-admin-impersonate` stores the target chef_id (4hr auto-expiry)
- `requireChef()` in `lib/auth/get-user.ts` checks for the cookie when caller is admin
- Returns modified AuthUser with target chef's entityId and tenantId
- Admin's real auth identity (user.id) is preserved for security
- Amber banner shows at top of page with chef name + exit button

**Security:**

- Only admin emails (ADMIN_EMAILS env var + founder) can set the cookie
- Every start/stop is logged to `admin_audit_log` (immutable, append-only)
- Cookie is httpOnly, sameSite: lax, 4hr max age
- Target chef is verified to exist before impersonation starts

**Files:**

- `lib/auth/admin-impersonation.ts` - cookie reader
- `lib/auth/admin-impersonation-actions.ts` - server actions (start/stop)
- `components/admin/impersonation-banner.tsx` - persistent amber banner
- `components/admin/view-as-chef-button.tsx` - button component
- `lib/auth/get-user.ts` - requireChef() impersonation logic

### 2. Cross-Tenant Admin Data Pages

Dedicated pages that show ALL data across ALL chefs in one view. Filterable, searchable, with "View as Chef" buttons on every row.

**Pages built:**
| Route | What it shows |
|-------|--------------|
| `/admin/recipes` | All recipes across all chefs |
| `/admin/menus` | All menus across all chefs |
| `/admin/quotes` | All quotes/invoices with amounts |
| `/admin/inquiries` | All inquiries with GOLDMINE lead scores |
| `/admin/staff` | All staff members across all chefs |
| `/admin/documents` | All contracts/documents |

**Data queries:** `lib/admin/platform-data.ts` (uses service role to bypass RLS)

## Planned (Not Yet Built)

### Phase 2: View as Client

- See client portal, event shares, invoices as a specific client sees them

### Phase 3 remaining:

- `/admin/calendar` - Unified cross-tenant calendar
- `/admin/loyalty` - Per-chef loyalty configs and redemptions
- `/admin/equipment` - Equipment inventory across chefs
- `/admin/allergens` - Cross-platform dietary restrictions (safety-critical)

### Phase 4: Chef Health & Onboarding

- Per-chef setup completeness tracker
- Tier management (Free/Pro toggle, module overrides)
- Stripe connection health per chef

### Phase 5: Intelligence & Monitoring

- Remy activity feed per chef
- Gmail sync health
- Notification audit
- Prospecting overview
- Activity timeline

### Phase 6: Platform Search & Export

- Platform-wide search bar
- CSV export on all admin pages
