# Settings Overhaul Build Plan

## Architecture: Sidebar-Routed Settings

### Current State

- Single monolithic `settings/page.tsx` (1063 lines)
- 20 categories as collapsible accordions inside a collapsed directory wrapper
- No sidebar, no search, no category-level routing
- 73 sub-pages exist but only reachable via Link cards inside accordions

### Target State

- Left sidebar on desktop (240px), drill-down stack on mobile
- Category-level URL routing: `/settings`, `/settings/business`, `/settings/communications`, etc.
- Settings search (client-side fuzzy across all categories)
- Overview page with fix-actions + guided cards
- Each category page renders its settings directly (no accordion nesting)
- All 73 existing sub-pages preserved as-is

---

## Route Structure

```
/settings                    → Overview (fix-actions + guided cards)
/settings/business           → Business Defaults, My Services, Event Config, Print & Docs
/settings/profile            → Profile & Branding, Appearance, Professional Growth, Chef Network
/settings/scheduling         → Availability Rules, Booking Page
/settings/payments           → Payments & Support (Stripe, billing, modules, wallets)
/settings/communications     → Communication & Workflow, Notifications & Alerts
/settings/integrations       → Connected Accounts, Client Reviews, Local AI
/settings/ai-privacy         → AI & Privacy (Trust Center, Culinary Profile, Remy)
/settings/legal              → Legal & Protection
/settings/account            → Account & Security, Sample Data, Desktop App, Feedback
/settings/developer          → API & Developer (feature-flagged)
```

## File Plan

### New Files

1. `app/(chef)/settings/layout.tsx` - Settings layout with sidebar + content pane
2. `components/settings/settings-sidebar.tsx` - Sidebar nav component
3. `components/settings/settings-search.tsx` - Search component
4. `components/settings/settings-mobile-nav.tsx` - Mobile category list
5. `lib/settings/settings-nav.ts` - Navigation config (categories, icons, routes)
6. `app/(chef)/settings/business/page.tsx` - Business category page
7. `app/(chef)/settings/profile-branding/page.tsx` - Profile category page
8. `app/(chef)/settings/scheduling/page.tsx` - Scheduling category page
9. `app/(chef)/settings/payments/page.tsx` - Payments category page
10. `app/(chef)/settings/communications/page.tsx` - Communications category page
11. `app/(chef)/settings/connections/page.tsx` - Integrations category page
12. `app/(chef)/settings/ai/page.tsx` - AI & Privacy category page
13. `app/(chef)/settings/legal-protection/page.tsx` - Legal category page
14. `app/(chef)/settings/system/page.tsx` - System & Account category page

### Modified Files

1. `app/(chef)/settings/page.tsx` - Slim down to overview only (fix-actions + guided cards)
2. `components/settings/settings-category.tsx` - Keep but remove accordion; render open by default when on category page

### Preserved As-Is

- All 73 existing sub-pages
- All 67 existing settings components
- `settings-tone.ts` (tone system)
- `settings-fix-actions.tsx` (fix tasks)
- `settings-guided-overview.tsx` (guided cards, update hrefs)

## Visual Design Rules (from research)

- **Sidebar**: Text-only, no icons. Grouped with muted section headers. 240px width.
- **Active state**: Brand color text + subtle background tint
- **Content area**: max-w-3xl (720px), left-aligned
- **Category pages**: Cards for grouped settings, rows for simple links
- **Color**: Neutral baseline. Brand color only on active nav + primary CTAs. Red only for destructive. No rainbow categories.
- **Mobile**: Below 768px, sidebar becomes full-screen stacked list. Tapping category navigates to category page.
- **Search**: Top of sidebar on desktop, top of mobile list. Fuzzy match against category names + setting labels. Deep-link to setting.

## Build Sequence (Serial)

### Agent 1: Navigation Config + Sidebar

- Create `lib/settings/settings-nav.ts` with all category definitions
- Create `components/settings/settings-sidebar.tsx`
- Create `components/settings/settings-mobile-nav.tsx`
- Create `components/settings/settings-search.tsx`

### Agent 2: Settings Layout

- Create `app/(chef)/settings/layout.tsx`
- Responsive: sidebar on desktop, mobile nav on mobile
- Integrate search component

### Agent 3: Category Pages (batch 1)

- Create business, profile-branding, scheduling, payments pages
- Extract relevant sections from current page.tsx

### Agent 4: Category Pages (batch 2)

- Create communications, connections, ai, legal-protection, system pages
- Extract relevant sections from current page.tsx

### Agent 5: Refactor Main Page

- Slim `settings/page.tsx` to overview only
- Update `settings-guided-overview.tsx` hrefs
- Update `settings-category.tsx` to support both modes (accordion in overview, open on category page)

### Agent 6: Type Check + Build Verification

- `npx tsc --noEmit --skipLibCheck`
- `npx next build --no-lint`
- Fix any issues
