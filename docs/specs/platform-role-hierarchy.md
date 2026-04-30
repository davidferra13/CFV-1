# Platform Role Hierarchy

> Canonical spec for ChefFlow's 6-tier access hierarchy.
> Governs platform_admins, billing tier, feature gating, and UI visibility.

---

## The Hierarchy (highest to lowest)

```
OWNER          David only. Founder Authority.
ADMIN          Platform administration. Trusted partner(s). Admin panel access.
VIP            All features unlocked. No admin panel. Close friends, inner circle.
PRO (paid)     Paying subscriber. All paid features.
COMPED         Pro-level access, $0. Manually granted by admin.
FREE           Default. Core features only.
```

---

## Tier Definitions

### 1. OWNER

- **Who:** `davidferra13@gmail.com` only. Hardcoded in `lib/platform/owner-account.ts`.
- **How granted:** `platform_admins` row with `access_level = 'owner'`.
- **Failsafe:** `Founder Authority` resolves the canonical founder session as owner even if the `platform_admins` row is stale.
- **Database guard:** `20260430000002_founder_authority_platform_guard.sql` blocks direct SQL from deleting, disabling, demoting, or retargeting the canonical founder `platform_admins` row.
- **Access:** Everything. Admin panel, dev tools, all features, all modules, focus mode bypass, Remy in admin portal.
- **UI:** Full admin nav, environment badge, all modules visible regardless of focus mode.

### 2. ADMIN

- **Who:** Trusted partners/operators. Currently only one planned besides owner.
- **How granted:** `platform_admins` row with `access_level = 'admin'`.
- **Access:** Admin panel (`/admin` routes), all chef-facing features, all modules, focus mode bypass, billing bypass.
- **UI:** Admin nav items visible, environment badge, all modules visible.
- **Distinction from Owner:** No founder-only features (Remy in admin portal). Cannot remove the owner. Cannot change own access level.

### 3. VIP (Inner Circle)

- **Who:** Close friends, trusted chefs, beta testers with special status.
- **How granted:** `platform_admins` row with `access_level = 'vip'`.
- **Access:** All chef-facing features unlocked (bypasses billing). All modules visible. Focus mode bypass. NO admin panel access.
- **UI:** Sees everything a Pro user sees plus extended modules. Does NOT see `adminOnly` nav items. No environment badge. No admin panel link.
- **Distinction from Admin:** Cannot access `/admin` routes. Cannot manage other users' platform access. Cannot see admin-only nav items or tools.
- **Distinction from Pro:** Doesn't pay. Sees all modules (focus mode bypassed). Gets any future VIP-only experimental features.

### 4. PRO (Paid)

- **Who:** Paying subscribers ($29/mo via Stripe).
- **How granted:** `chefs.subscription_status` = `'active'`, `'past_due'`, or `'trialing'` (within window).
- **Access:** All features in the `'paid'` tier of `feature-classification.ts`.
- **UI:** Standard chef portal. Focus mode applies. Module toggles apply.
- **No platform_admins row.**

### 5. COMPED (Bypassed)

- **Who:** Users granted Pro access without payment. Promotional, partnership, or courtesy accounts.
- **How granted:** `chefs.subscription_status = 'comped'`.
- **Access:** Identical to Pro. All paid-tier features unlocked.
- **UI:** Account looks and feels exactly like a paying Pro user. No special indicators.
- **Distinction from VIP:** Focus mode still applies. Module toggles still apply. No extended privileges beyond Pro features.
- **Distinction from Grandfathered:** `grandfathered` is legacy (pre-existing accounts). `comped` is an intentional admin grant for specific users.

### 6. FREE

- **Who:** Default for all new accounts.
- **How granted:** No subscription, or `subscription_status` = `null` / `'unpaid'` / `'canceled'` (past period).
- **Access:** Features in the `'free'` tier of `feature-classification.ts`.
- **UI:** Standard chef portal. Focus mode applies (default ON for new users). Upgrade prompts after free actions.

---

## Permission Matrix

| Capability                 | Owner | Admin | VIP | Pro | Comped | Free |
| -------------------------- | ----- | ----- | --- | --- | ------ | ---- |
| Admin panel (`/admin`)     | Yes   | Yes   | No  | No  | No     | No   |
| `adminOnly` nav items      | Yes   | Yes   | No  | No  | No     | No   |
| Environment badge          | Yes   | Yes   | No  | No  | No     | No   |
| Remy in admin portal       | Yes   | No    | No  | No  | No     | No   |
| All paid features          | Yes   | Yes   | Yes | Yes | Yes    | No   |
| Focus mode bypass          | Yes   | Yes   | Yes | No  | No     | No   |
| All modules visible        | Yes   | Yes   | Yes | No  | No     | No   |
| Billing required           | No    | No    | No  | Yes | No     | No   |
| Can manage platform_admins | Yes   | Yes   | No  | No  | No     | No   |
| Founder-only features      | Yes   | No    | No  | No  | No     | No   |

---

## Implementation Map

### Storage

| Tier   | Where stored      | Column/Value                                                |
| ------ | ----------------- | ----------------------------------------------------------- |
| Owner  | `platform_admins` | `access_level = 'owner'`                                    |
| Admin  | `platform_admins` | `access_level = 'admin'`                                    |
| VIP    | `platform_admins` | `access_level = 'vip'`                                      |
| Pro    | `chefs`           | `subscription_status IN ('active', 'past_due', 'trialing')` |
| Comped | `chefs`           | `subscription_status = 'comped'`                            |
| Free   | `chefs`           | `subscription_status IS NULL / 'unpaid' / 'canceled'`       |

### Key Functions

| Function           | File                            | Returns true for                                 |
| ------------------ | ------------------------------- | ------------------------------------------------ |
| `isAdmin()`        | `lib/auth/admin.ts`             | Owner, Admin                                     |
| `isVIPOrAbove()`   | `lib/auth/admin.ts`             | Owner, Admin, VIP                                |
| `isFounderEmail()` | `lib/platform/owner-account.ts` | Owner only                                       |
| `hasProAccess()`   | `lib/billing/tier.ts`           | Owner, Admin, VIP, Pro, Comped                   |
| `requireAdmin()`   | `lib/auth/admin.ts`             | Owner, Admin (redirects others)                  |
| `requirePro()`     | `lib/billing/require-pro.ts`    | Owner, Admin, VIP, Pro, Comped (redirects Free)  |
| `getAccessLevel()` | `lib/auth/admin-access.ts`      | Returns `'owner'` / `'admin'` / `'vip'` / `null` |

### UI Gating

| Check                      | Controls                                               |
| -------------------------- | ------------------------------------------------------ |
| `isAdmin` prop in nav      | `adminOnly` items, environment badge, admin panel link |
| `isPrivileged` prop in nav | Focus mode bypass, all modules visible                 |
| `requirePro()`             | Paid feature page access                               |
| `requireFocusAccess()`     | Extended module route gating                           |

---

## Granting Access

### VIP

Admin inserts a row into `platform_admins`:

```sql
INSERT INTO platform_admins (auth_user_id, email, access_level, is_active, notes, created_by_auth_user_id)
VALUES ('<auth_user_id>', '<email>', 'vip', true, 'Inner circle - granted by admin', '<admin_auth_user_id>');
```

### Comped

Admin updates the chef's subscription status:

```sql
UPDATE chefs SET subscription_status = 'comped' WHERE id = '<chef_id>';
```

### Revoking

- VIP: set `is_active = false` on platform_admins row, or delete it.
- Comped: set `subscription_status = NULL` (drops to free).

---

## Rules

1. **Owner is immutable.** Cannot be removed, demoted, or overridden by any other admin.
2. **VIP is not admin.** VIP never sees admin panel, admin nav items, or platform management tools.
3. **Comped is invisible.** A comped user's account is indistinguishable from a paying Pro user. No special badges or indicators.
4. **Access level check order:** Owner > Admin > VIP > Pro/Comped > Free. Higher levels inherit all lower-level access.
5. **platform_admins.access_level is a text column.** No migration needed to add 'vip' as a value.
6. **Focus mode bypass = VIP or above.** Pro and below respect focus mode settings.
