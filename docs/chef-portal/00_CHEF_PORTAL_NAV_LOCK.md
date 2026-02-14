# Chef Portal Navigation Lock (V1)

This document defines the **exact and complete** navigation structure for the Chef Portal V1. This is the canonical menu. Any deviation from this structure is scope drift.

---

## 1) Primary Navigation (Top-Level)

The Chef Portal has **exactly 7 primary navigation items**:

1. **Dashboard**
2. **Inquiries**
3. **Events**
4. **Menus**
5. **Clients**
6. **Finance**
7. **Settings**

**If you add an 8th item, you are violating the V1 scope lock.**

---

## 2) Navigation Item Definitions

### 2.1 Dashboard

**Purpose:** High-level operational overview and attention management.

**Route:** `/dashboard` (or `/chef/dashboard` depending on layout structure)

**What it shows:**
- Events requiring action (deposit pending, menu needed, upcoming events)
- Financial summary (recent payments, outstanding balances)
- Recent client activity
- At-risk items (overdue payments, conflicts, expirations)

**What it does NOT show:**
- Cross-tenant data
- Predictive analytics
- Social feeds or notifications from other chefs

**Subpages:** None. Dashboard is a single view.

---

### 2.2 Inquiries

**Purpose:** Intake and pipeline management for potential bookings.

**Route:** `/inquiries`

**What it shows:**
- List of inquiry records (lightweight pre-event records or events in `draft` status, depending on implementation)
- Basic details: client name, event type, requested date, notes
- Conversion actions: "Create Event", "Decline", "Archive"

**What it does NOT show:**
- Confirmed events (those are in Events)
- Clients without an associated inquiry/event

**Subpages:**
- `/inquiries` — List view
- `/inquiries/[id]` — Inquiry detail view (optional; may be handled in modal)

**State transition:**
- Inquiry → Event (via "Create Event" action that transitions to `draft` or `proposed` status)

---

### 2.3 Events

**Purpose:** Canonical event records and lifecycle management.

**Route:** `/events`

**What it shows:**
- List of all events for this tenant, filterable by status
- Event cards/rows with: client, date, status, financial summary
- Detail view with full event information, lifecycle transition controls, linked menu, financial ledger

**What it does NOT show:**
- Events from other tenants
- Inquiries that haven't been converted to events

**Subpages:**
- `/events` — List view (filterable, sortable)
- `/events/[id]` — Event detail view
- `/events/new` — Create new event form (optional; may start from inquiry)

**Key actions:**
- Create event
- Transition event status (server-enforced)
- View/edit event details (according to allowed fields by status)
- View linked menu
- View financial ledger for event
- Cancel event (terminal transition)

---

### 2.4 Menus

**Purpose:** Menu template management and event-linked menu drafting/locking.

**Route:** `/menus`

**What it shows:**
- List of menu templates (reusable menu drafts)
- List of event-linked menus (menus associated with specific events)
- Menu detail view with sections, items, notes
- Version history for locked menus

**What it does NOT show:**
- Client-side rendering (that's in Client Portal)
- Recipe costing or inventory (out of scope)

**Subpages:**
- `/menus` — List view (templates and event menus)
- `/menus/templates` — Template library
- `/menus/templates/[id]` — Template detail/edit
- `/menus/events/[event_id]` — Event-linked menu detail/edit

**Key actions:**
- Create menu template
- Duplicate template
- Link menu to event
- Edit draft menu
- Lock menu (creates immutable version)
- View version history

---

### 2.5 Clients

**Purpose:** Client profile management, notes, history, and invite status.

**Route:** `/clients`

**What it shows:**
- List of client profiles for this tenant
- Client detail view with contact info, private notes, tags, event history
- Invite status (pending, accepted, expired)

**What it does NOT show:**
- Clients from other tenants
- Client auth credentials or passwords
- Clients without a profile (every client the chef interacts with must have a profile)

**Subpages:**
- `/clients` — List view (searchable, filterable)
- `/clients/[id]` — Client detail view
- `/clients/new` — Create new client profile

**Key actions:**
- Create client profile
- Edit client profile
- Add private notes (chef-only)
- Send invite link
- View event history for client
- Merge duplicate profiles (if implemented; must be deterministic and audited)

---

### 2.6 Finance

**Purpose:** Ledger view, event financial summaries, and payment state truth.

**Route:** `/finance`

**What it shows:**
- Aggregate ledger view (append-only entries)
- Financial summary by event
- Payment state derived from ledger (not editable)
- Stripe connection status

**What it does NOT show:**
- Full accounting (P&L, balance sheets)
- Tax reports
- Cross-tenant financial data

**Subpages:**
- `/finance` — Financial overview (recent entries, balances)
- `/finance/ledger` — Full ledger view (filterable by event, type, date)
- `/finance/events/[id]` — Event financial detail (may redirect to `/events/[id]` with finance panel active)
- `/finance/stripe` — Stripe connection management (if separate; may be in Settings)

**Key actions:**
- View ledger entries (read-only)
- Filter ledger by event, date, type
- Export financial data (CSV/PDF)
- Manual adjustment entry (if permitted; must be audited and append-only)

**No edit or delete actions.** Ledger is immutable.

---

### 2.7 Settings

**Purpose:** Tenant configuration, user profile, Stripe connection, system preferences.

**Route:** `/settings`

**What it shows:**
- Tenant profile (business name, contact info, timezone)
- User profile (name, email, password change)
- Stripe connection status and setup
- Notification preferences (if implemented)
- Service configuration (if implemented; minimal in V1)

**What it does NOT show:**
- Cross-tenant admin controls
- Platform-wide settings
- Other users' profiles (unless sub-accounts are implemented with appropriate RLS)

**Subpages:**
- `/settings` — Settings home (may be tabbed interface)
- `/settings/profile` — User profile
- `/settings/business` — Tenant/business details
- `/settings/payments` — Stripe connection setup
- `/settings/notifications` — Notification preferences (if implemented)

**Key actions:**
- Update tenant profile
- Update user profile
- Change password
- Connect/disconnect Stripe account
- Configure notification preferences

---

## 3) Secondary Navigation (Within Pages)

### 3.1 Event Detail Tabs/Panels

When viewing `/events/[id]`, the following panels/tabs may be present:

1. **Details** — Event metadata (client, date, status, notes)
2. **Menu** — Linked menu view (or link to menu detail)
3. **Finance** — Event-specific ledger and payment state
4. **Timeline** — Event transition audit log
5. **Client** — Quick client info card (or link to client detail)

### 3.2 Client Detail Tabs/Panels

When viewing `/clients/[id]`, the following panels/tabs may be present:

1. **Profile** — Contact info, notes
2. **Events** — Event history for this client
3. **Invites** — Invite status and history
4. **Activity** — Audit log for this client (if implemented)

### 3.3 Menu Detail Sections

When viewing `/menus/[id]`, the following sections may be present:

1. **Overview** — Menu name, description, event link (if applicable)
2. **Sections & Items** — Editable menu structure
3. **Version History** — Locked versions and changes (if menu is locked)
4. **Preview** — Client-facing rendering preview

---

## 4) Navigation Visibility by Role

### 4.1 Chef (full access)

- ✅ All 7 primary navigation items
- ✅ All subpages and actions within their tenant

### 4.2 Chef Subaccount (if implemented)

- ✅ Dashboard
- ✅ Inquiries (read-only or limited edit, depending on permissions)
- ✅ Events (read-only or limited edit)
- ✅ Menus (read-only or limited edit)
- ✅ Clients (read-only or limited edit)
- ❌ Finance (hidden or read-only, depending on permissions)
- ❌ Settings (hidden or minimal access)

**Permissions are server-enforced and defined in the role/permissions model.**

### 4.3 Client (never in Chef Portal)

- ❌ **Clients cannot access Chef Portal routes at all.**
- ❌ **Middleware and layout guards prevent rendering.**

---

## 5) Navigation Anti-Patterns (What NOT to Do)

### 5.1 No "hidden" navigation items based on UI state

**Bad:**
```tsx
{isChef && <NavItem href="/finance">Finance</NavItem>}
```

**Why bad:** Role must be enforced server-side, not in client component conditional rendering.

**Good:**
```tsx
// Navigation items are rendered by server component after role check
// Middleware already blocked access if user is not chef
```

### 5.2 No cross-tenant links

**Bad:**
```
/events?chef_id=abc123 // allowing chef_id query param to view other tenants
```

**Why bad:** Tenant is determined from the authenticated user, not from user input.

**Good:**
```
/events // automatically scoped to authenticated user's tenant via RLS
```

### 5.3 No dynamic navigation based on "features"

**Bad:**
```tsx
{features.includes('loyalty') && <NavItem href="/loyalty">Loyalty</NavItem>}
```

**Why bad:** V1 has a locked navigation structure. Feature flags should not add/remove navigation items.

**Good:**
- If a feature is not in V1, it does not have a navigation item, period.
- If a feature is added in V2, the navigation lock is updated as part of scope definition.

---

## 6) Mobile Responsive Behavior

### 6.1 Desktop (>= 1024px)

- Side navigation visible and expanded
- All 7 items shown vertically
- Active item highlighted

### 6.2 Tablet (768px - 1023px)

- Side navigation collapsible or icon-only
- Hamburger menu optional
- Same 7 items

### 6.3 Mobile (< 768px)

- Top bar with hamburger menu
- Navigation drawer slides in
- Same 7 items in vertical list

**No items are hidden or removed on mobile.** Responsive design changes layout, not content.

---

## 7) Active State and Breadcrumbs

### 7.1 Active navigation item

The current page's primary navigation item must be visually highlighted (active state).

Example:
- URL: `/events/abc123`
- Active nav item: **Events**

### 7.2 Breadcrumbs (optional but recommended)

Breadcrumbs provide context within deep pages:

Examples:
- `Dashboard`
- `Events / Event Detail / Menu`
- `Clients / John Doe / Event History`

Breadcrumbs are informational and navigable (each segment is a link).

---

## 8) Navigation Performance

### 8.1 No navigation flicker or wrong-portal flash

- Navigation must not render Client Portal nav items before redirecting.
- Server layouts must enforce role before rendering navigation.

### 8.2 Loading states

- If role resolution is async, show a loading spinner instead of empty navigation.
- Do not show navigation items that will be removed after role loads.

---

## 9) Navigation Accessibility

### 9.1 Semantic HTML

- Navigation uses `<nav>` element
- Navigation items are `<a>` or `<Link>` elements (not `<div>` with `onClick`)

### 9.2 Keyboard navigation

- All navigation items are keyboard accessible (Tab, Enter)
- Active item is focusable and has appropriate ARIA attributes

### 9.3 Screen reader support

- Navigation has appropriate ARIA labels
- Active state is announced to screen readers

---

## 10) Navigation Lock Enforcement

### 10.1 How to prevent drift

1. **Document:** This file is the source of truth.
2. **Code review:** Any PR that adds/removes navigation items must reference this document and update it if scope changes.
3. **Automated test:** A test should verify that the navigation component renders exactly 7 items for the chef role.

### 10.2 Example test

```typescript
describe('Chef Portal Navigation', () => {
  it('renders exactly 7 primary navigation items for chef role', async () => {
    const nav = await renderChefNavigation({ role: 'chef' });
    const items = nav.querySelectorAll('[data-nav-item]');
    expect(items).toHaveLength(7);
    expect(items[0]).toHaveTextContent('Dashboard');
    expect(items[1]).toHaveTextContent('Inquiries');
    expect(items[2]).toHaveTextContent('Events');
    expect(items[3]).toHaveTextContent('Menus');
    expect(items[4]).toHaveTextContent('Clients');
    expect(items[5]).toHaveTextContent('Finance');
    expect(items[6]).toHaveTextContent('Settings');
  });
});
```

---

## 11) Summary

The Chef Portal V1 navigation is **locked to 7 primary items**:

1. Dashboard
2. Inquiries
3. Events
4. Menus
5. Clients
6. Finance
7. Settings

**Any additional item is scope drift.**
**Any removed item breaks the operational loop.**

This structure is final for V1 and enforced by:
- Documentation (this file)
- Code review
- Automated tests
- Role-based access control (server-side)

**One-Sentence Navigation Definition:**

*The Chef Portal navigation is a fixed 7-item menu (Dashboard, Inquiries, Events, Menus, Clients, Finance, Settings) that provides complete access to the operational loop while enforcing tenant isolation and role-based visibility server-side.*
