# Spec: Chef Shell Clarity and Guided Settings

> **Status:** ready
> **Priority:** P1
> **Depends on:** none
> **Estimated complexity:** large (9+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date             | Agent/Session | Commit |
| --------------------- | ---------------- | ------------- | ------ |
| Created               | 2026-04-01 13:52 | Planner       |        |
| Status: ready         | 2026-04-01 13:52 | Planner       |        |
| Claimed (in-progress) |                  |               |        |
| Spike completed       |                  |               |        |
| Pre-flight passed     |                  |               |        |
| Build completed       |                  |               |        |
| Type check passed     |                  |               |        |
| Build check passed    |                  |               |        |
| Playwright verified   |                  |               |        |
| Status: verified      |                  |               |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

The developer said AI-built products often look bad in a very specific way: not broken, but uncanny. Zero personality. Nothing feels easy or ready to use. Everything gets presented like a dataset, a control panel, or an overstuffed admin surface with too much clutter and noise. The result screams "AI-made" in the worst way.

They also called out a second failure mode: builders often ignore leverage that already exists. They skip modern interaction behavior, simple UI polish, and obvious backend and frontend integrations. They miss easy practical wins like using another company's free cloud when that is the right tradeoff for a chatbot, or setting up the stack so important data stays under product control and can be stored locally when needed.

They did not want blind execution. Before proceeding they explicitly required full context awareness, goal definition, validation of prior work, assumption exposure, proof, a clear plan before execution, scope control, regression checks, and uncertainty checks. The subtext was clear: do not improvise a shiny redesign. Prove what exists, then make the highest-leverage decisions in the correct order.

### Developer Intent

- **Core goal:** Make the chef-facing shell feel curated, calm, useful, and trustworthy instead of encyclopedic, overly configurable, or machine-generated.
- **Key constraints:** Do not redesign the whole app. Do not delete deep capabilities. Reuse existing mechanisms like the Action Bar, command palette, modules/focus mode, and current integration flows instead of inventing parallel systems. Do not overlap AI runtime and disclosure work that already has its own spec.
- **Motivation:** The product already has real substance. The current problem is the first impression and the curation layer, which make that substance feel noisier and less human than it should.
- **Success from the developer's perspective:** A chef opens ChefFlow and immediately understands what matters now, where to go next, and what is advanced or secondary. The app feels guided and intentional, not like a pile of features.

---

## What This Does (Plain English)

This spec recuts the chef-facing entry surfaces so they behave like a guided workspace instead of a feature directory. The dashboard becomes a task-first morning brief with secondary intelligence moved behind a deliberate expansion point. The sidebar goes back to a tight daily-driver shortcut set with the full directory still available, but not visually shouting. The root settings page gains a guided overview before the full settings encyclopedia. The integrations page keeps the good guided capture flow up front and pushes generic provider inventory and manual connection tools into an explicitly advanced layer. No routes are removed, no schemas change, and deep functionality stays reachable.

---

## Why It Matters

ChefFlow already has breadth, styling, and real workflows. What still reads as "AI slop" is the presentation layer: too many choices at once, too many control-surface affordances on day one, and too little distinction between daily flow, occasional setup, and advanced/admin behavior. This spec fixes the curation problem without pretending the answer is a full product rewrite.

---

## Files to Create

| File                                                    | Purpose                                                                                              |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `components/dashboard/dashboard-secondary-insights.tsx` | Collapsible dashboard wrapper that hides low-frequency business and intelligence sections by default |
| `components/settings/settings-guided-overview.tsx`      | Guided settings overview cards that surface the highest-signal configuration paths first             |
| `components/integrations/business-tool-strip.tsx`       | Compact status row for the primary business-system connectors (QuickBooks, DocuSign, Square)         |

---

## Files to Modify

| File                                                     | What to Change                                                                                                                                                                    |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/dashboard/page.tsx`                          | Reorder the dashboard around immediate action and today's work. Remove the full encyclopedia feel from the primary viewport and mount secondary insights behind a collapsed panel |
| `components/dashboard/command-center.tsx`                | Replace the current 24-area feature encyclopedia with a condensed 6-card "Core Areas" panel using visible, limited actions instead of hover trays                                 |
| `app/(chef)/dashboard/_sections/command-center-data.tsx` | Stop fetching low-signal counts used only by removed dashboard cards; only query the counts needed by the condensed core areas panel                                              |
| `components/navigation/nav-config.tsx`                   | Re-curate `actionBarItems` back to 8 daily-driver shortcuts. Keep all removed items in existing groups and routes; only remove them from the action bar                           |
| `components/navigation/all-features-collapse.tsx`        | Default the full directory to collapsed on first load and rename the section header from "All Features" to "Browse Everything" while preserving deep-link auto-expand             |
| `components/navigation/recent-pages-section.tsx`         | Default the section to collapsed and cap the visible list to 5 items so it behaves like a lightweight memory aid instead of a second nav block                                    |
| `app/(chef)/settings/page.tsx`                           | Add the new guided overview above the existing settings directory and move the full directory behind an "Advanced settings directory" disclosure                                  |
| `app/(chef)/settings/integrations/page.tsx`              | Reframe the page into guided sections: capture opportunities, business tools, and advanced/manual connections                                                                     |
| `components/integrations/connected-accounts.tsx`         | Rename and reframe the generic connector as an advanced/manual surface; keep current API behavior but hide the form behind an explicit expand action                              |
| `app/(chef)/settings/modules/page.tsx`                   | Update page copy so modules/focus mode are framed as optional shell simplification, not tier or feature-control semantics                                                         |
| `app/(chef)/settings/modules/modules-client.tsx`         | Rewrite focus mode copy so it reads as an optional minimal navigation mode; keep behavior but remove "strict" framing and clarify visible/hidden areas                            |
| `lib/billing/focus-mode-actions.ts`                      | Align the fallback and comments with the current optional behavior by defaulting `isFocusModeEnabled()` to `false` when no preference row exists                                  |

---

## Database Changes

None.

### New Tables

```sql
-- None
```

### New Columns on Existing Tables

```sql
-- None
```

### Migration Notes

- No DB migration is required for this spec.
- Existing data models stay in place. This is a shell-curation and truthful-framing pass, not a schema change.

---

## Data Model

No persistence schema changes are required. This spec only re-presents existing data and aligns one server-side fallback with the current stored preference model.

### Existing Entities Used

- `chef_preferences`
  - Relevant fields: `enabled_modules`, `focus_mode`, `primary_nav_hrefs`, `mobile_tab_hrefs`
  - Used to determine which nav areas are visible and whether focus mode is active
- `integration_connections`
  - Relevant fields: `provider`, `status`, `auth_type`, `external_account_name`, `external_account_id`, `last_sync_at`, `error_count`, `last_error`, `connected_at`
  - Used for the integrations status inventory and manual connections surface
- `integration_events`
  - Relevant fields: `provider`, `source_event_type`, `status`, `received_at`, `processed_at`, `error`
  - Used for recent integration event summaries

### Explicit Non-Changes

- Do not modify `ai_preferences`, `remy_conversations`, `remy_messages`, `remy_memories`, or `remy_artifacts` in this spec. Those surfaces have a separate runtime and disclosure correction spec.
- Do not modify `integration_connections` or `integration_events` schema, policies, or API contract.

---

## Server Actions

| Action                 | Auth            | Input | Output    | Side Effects                                                                                                                                     |
| ---------------------- | --------------- | ----- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `isFocusModeEnabled()` | `requireChef()` | none  | `boolean` | Reads `chef_preferences.focus_mode`; fallback changes from `true` to `false` to match current optional-mode behavior and existing cache fallback |

No new server actions are added. All other dashboard and integration data loads continue using their existing server components and server-side query helpers.

---

## UI / Component Spec

_Describe what the user sees. Be specific: layout, components, states._

### Page Layout

#### Dashboard

- Keep the existing greeting/header, primary CTA cluster, onboarding banner, and hero metrics.
- Keep `Respond Next` high on the page.
- Replace the current `Command Center` section with a condensed `Core Areas` section:
  - Exactly 6 cards
  - Cards: `Inbox`, `Inquiries`, `Events`, `Clients`, `Menus`, `Money`
  - Each card shows:
    - icon
    - label
    - optional count
    - one-line description
    - at most 2 visible helper links
  - No hover-revealed quick-link trays
  - No more than 6 cards in the panel
- Keep daily operations visible without expansion:
  - `Priority Queue`
  - `Upcoming Touchpoints`
  - `Today & This Week` schedule section
  - `Dinner Circles`
  - `AARPromptBanner`
- Move these into `DashboardSecondaryInsights`, collapsed by default:
  - `WeeklyBriefingSection`
  - `CoverageHealthSection`
  - `AlertCards`
  - `IntelligenceCards`
  - `BusinessCards`
- Use a concise collapsed label such as `Business Health, Pricing, and Intelligence`.
- The collapsed dashboard should still feel complete without expansion.

#### Sidebar / Mobile Nav

- `actionBarItems` becomes a curated 8-link set:
  - `Inbox`
  - `Calendar`
  - `Events`
  - `Clients`
  - `Menus`
  - `Money`
  - `Prep`
  - `Circles`
- Remove these only from the action bar:
  - `Notifications`
  - `Inquiries`
  - `Recipes`
  - `Tasks`
  - `Food Catalog`
  - `Store Prices`
  - `Rewards`
- These removed items must remain reachable through the existing nav groups, direct routes, and command palette.
- Rename the full directory section header from `All Features` to `Browse Everything`.
- On first load with no saved preference, `Browse Everything` starts collapsed.
- If the active route is inside the directory, auto-expand still wins.
- `Recent` remains available, but starts collapsed and shows at most 5 rows.

#### Settings Root

- Add `SettingsGuidedOverview` above the current grouped settings directory.
- `SettingsGuidedOverview` renders 5 cards:
  - `Daily workflow`
  - `Your business`
  - `Client-facing`
  - `Integrations`
  - `AI and system`
- Each card contains 2-3 direct links to the highest-signal destinations already present in the app.
- The existing grouped settings directory remains intact, but lives under a collapsed `Advanced settings directory` disclosure.
- The advanced directory should preserve the current category structure and child links. This spec does not require rewriting every settings subsection.

#### Integrations Page

- Keep `TakeAChefSetup` first as the main guided capture flow.
- Keep `PlatformSetup` near it as the source-of-opportunities configuration surface.
- Add `BusinessToolStrip` directly below guided capture. It shows connection status and connect/manage actions for:
  - QuickBooks
  - DocuSign
  - Square
- Move the current broad provider inventory and generic connector into a collapsed `Advanced provider directory` section.
- `ConnectedAccounts` changes from an always-open admin form to an advanced/manual connector:
  - collapsed by default
  - short explanatory copy: use this only when a provider does not have a guided setup lane
  - existing connect/disconnect behavior remains unchanged

#### Modules / Focus Mode

- Keep the modules page as the place for optional shell simplification.
- Rewrite the top explanation so it clearly says:
  - this is about navigation calmness, not feature entitlement
  - focus mode is optional
  - focus mode hides sidebar areas but does not delete routes or data
- Keep the current visual list of visible groups/items when focus mode is on.
- Do not add monetization or tier messaging here.

### States

- **Loading:** Reuse current loading skeletons and fallbacks. `DashboardSecondaryInsights` should show a single collapsed skeleton shell instead of rendering all secondary widgets open by default.
- **Empty:** If there are no recent pages, keep the current behavior and render nothing for the recent section. If integration event history is empty, keep the existing `No integration events processed yet.` state inside the advanced directory.
- **Error:** Reuse existing `WidgetErrorBoundary` and current integration action error handling. Do not show fake counts or fake connection status.
- **Populated:** Primary surfaces should render a smaller, more directed set of actions first. Secondary or advanced surfaces stay reachable behind explicit expansion.

### Interactions

- `Browse Everything` collapse state persists in local storage, but deep-link auto-expand still overrides the saved collapsed state when the current route lives inside the hidden directory.
- `Recent` collapse state persists in local storage. When expanded, show the 5 most recent items only.
- `DashboardSecondaryInsights` is collapsed by default on first load and should persist its open/closed state in local storage.
- The 6 dashboard `Core Areas` cards use visible links only. No hover-only navigation.
- `ConnectedAccounts` form stays inert until the user explicitly opens the advanced/manual section.
- Focus mode toggle behavior stays the same, but the fallback default and explanatory copy align with the current optional-mode model.

---

## Edge Cases and Error Handling

| Scenario                                                     | Correct Behavior                                                                              |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| User is on a route that lives only inside the full directory | `Browse Everything` auto-expands so the current route stays discoverable                      |
| User has no recent pages                                     | `Recent` section does not render                                                              |
| Secondary dashboard data fails                               | Existing widget boundaries keep the dashboard usable; primary task flow still shows           |
| Integrations data loads partially                            | Guided sections still render; advanced directory sections show their own empty/error states   |
| Focus mode preference row is missing                         | `isFocusModeEnabled()` falls back to `false`, matching current optional-mode behavior         |
| User opens advanced/manual integrations but has no accounts  | Show the existing `No connected accounts yet.` state plus the collapsed connect form          |
| User expects removed action-bar items to be gone entirely    | Those areas remain reachable via `Browse Everything`, direct route entry, and command palette |

---

## Verification Steps

1. Sign in as a chef and open `/dashboard`.
2. Verify the first viewport contains greeting, CTA cluster, onboarding banner (if applicable), hero metrics, the 6-card `Core Areas` panel, and immediate daily workflow widgets.
3. Verify the old 24-card command-center encyclopedia is no longer present on the primary dashboard.
4. Verify the business/pricing/intelligence widgets are reachable through a collapsed secondary insights section and still render correctly when expanded.
5. Open the desktop sidebar. Verify the action bar shows only 8 daily-driver shortcuts.
6. Verify `Browse Everything` is collapsed on first load, then auto-expands if you navigate to a deep route that only exists inside that directory.
7. Verify the `Recent` section starts collapsed and shows no more than 5 entries when expanded.
8. Open `/settings`. Verify the guided overview appears before the full directory, and the advanced directory is collapsed by default.
9. Open `/settings/integrations`. Verify guided capture appears first, the business-tool strip appears before the provider inventory, and the generic/manual connector is hidden behind an advanced expand action.
10. Use the advanced/manual integrations connector to connect and disconnect a test provider. Verify `/api/integrations/connect` behavior still works and the page refreshes correctly.
11. Open `/settings/modules`. Verify focus mode copy reads as optional simplification, not a locked-feature or tier flow.
12. Verify a chef with no `chef_preferences.focus_mode` row gets `false` from `isFocusModeEnabled()` and the shell loads in the non-focus default state.
13. Verify none of the AI/privacy pages or cloud-runtime disclosure surfaces changed as part of this build.

---

## Out of Scope

- Rewriting AI runtime, privacy, or truthful disclosure surfaces in `app/(chef)/settings/ai-privacy/page.tsx` or `components/ai-privacy/*`
- Changing any database schema, migration, or RLS policy
- Removing routes, nav groups, or command palette entries from the app
- Reworking the integrations backend, OAuth clients, or `/api/integrations/connect` contract
- Rewriting monetization or tier semantics beyond avoiding new leakage in touched copy
- Full dashboard widget redesign beyond the shell-level re-sequencing described above

---

## Notes for Builder Agent

- This is a curation spec, not a capability-removal spec. If you delete route discoverability instead of moving it behind secondary layers, you missed the point.
- Use the original verified action-bar intent in `docs/specs/navigation-action-bar.md:12-20` as the design anchor for "daily-driver first, reference directory second."
- The AI/privacy truth-gap is real, but do not fix it here. The ready spec `docs/specs/full-cloud-ai-runtime-and-disclosure.md:52-59` already owns that work.
- `docs/specs/respectful-monetization-foundation.md:220-222` touches adjacent modules/settings copy. Keep this build focused on shell simplification and avoid reviving any lock or upgrade semantics while editing those files.
- Reuse existing route/link components and existing data loaders wherever possible. The simplest complete version is re-sequencing and reframing, not new data plumbing.

---

## Planner Validation

### 1. What exists today that this touches?

- The dashboard currently renders greeting/actions, onboarding, hero metrics, `CommandCenterSection`, `RespondNextCard`, `DinnerCirclesSection`, priority queue, touchpoints, schedule, weekly briefing, price coverage, alerts, intelligence, and business sections in one always-open flow: `app/(chef)/dashboard/page.tsx:287-470`.
- The current command center is a 24-area feature encyclopedia with hover-only quick links: `components/dashboard/command-center.tsx:73-423` and `components/dashboard/command-center.tsx:427-535`.
- The command-center data layer currently counts 18 different feature areas in parallel to feed that encyclopedia: `app/(chef)/dashboard/_sections/command-center-data.tsx:22-124`.
- The nav shell still follows a "nothing hidden" philosophy in config and then renders an action bar plus the full directory plus recent history: `components/navigation/nav-config.tsx:1-4`, `components/navigation/nav-config.tsx:1930-1947`, `components/navigation/chef-nav.tsx:1003-1052`, `components/navigation/all-features-collapse.tsx:74-99`, `components/navigation/recent-pages-section.tsx:41-127`.
- The root settings page is already large and data-heavy before render: `app/(chef)/settings/page.tsx:63-915`, with the reusable accordion category shell in `components/settings/settings-category.tsx:54-109`.
- The integrations page already mixes guided setup, platform toggles, provider inventory, and manual account connection: `app/(chef)/settings/integrations/page.tsx:25-99`, `components/integrations/take-a-chef-setup.tsx:74-215`, `components/settings/integration-center.tsx:72-183`, `components/integrations/connected-accounts.tsx:101-205`, `components/integrations/platform-setup.tsx:153-192`.
- Focus mode and module visibility already exist through `chef_preferences.enabled_modules` and `chef_preferences.focus_mode`: `types/database.ts:7201-7265`, `lib/billing/module-actions.ts:17-61`, `lib/billing/focus-mode-actions.ts:13-50`, `lib/navigation/focus-mode-nav.ts:1-27`.
- Integration persistence already exists through `integration_connections` and `integration_events`: `types/database.ts:29000-29204`, `lib/integrations/core/query-actions.ts:20-113`, `lib/integrations/integration-hub.ts:76-238`, `app/api/integrations/connect/route.ts:21-75`.

### 2. What exactly changes?

- The dashboard shell changes from an always-open feature inventory to a primary-flow + secondary-insights layout. This is surgical to `app/(chef)/dashboard/page.tsx`, `components/dashboard/command-center.tsx`, and `app/(chef)/dashboard/_sections/command-center-data.tsx`. No route or table changes.
- The action bar changes from 15 items back to 8 curated daily-driver shortcuts by editing `components/navigation/nav-config.tsx:1931-1947`. The removed shortcuts stay in the existing nav groups and routes.
- The full directory presentation changes by editing `components/navigation/all-features-collapse.tsx:44-99` and `components/navigation/recent-pages-section.tsx:41-127`, not by deleting nav groups.
- The root settings page gains a new guided overview file and wraps the current directory instead of exposing it immediately: `app/(chef)/settings/page.tsx:105-915`.
- The integrations page becomes guided-first and advanced-second while reusing the existing data loaders and API contract: `app/(chef)/settings/integrations/page.tsx:28-57`, `lib/integrations/core/query-actions.ts:20-113`, `lib/integrations/integration-hub.ts:121-238`, `app/api/integrations/connect/route.ts:38-75`.
- The focus mode behavior only changes at the fallback/copy level. The data model remains `chef_preferences.focus_mode`; only the default assumption in `lib/billing/focus-mode-actions.ts:13-29` is aligned with the current optional-mode model.

### 3. What assumptions are you making?

- **Verified:** The current shell problem is curation, not missing features. Evidence: the breadth already exists across dashboard, nav, settings, and integrations files cited above.
- **Verified:** A smaller action bar matches prior product intent. The verified nav spec explicitly described an 8-item daily-driver bar: `docs/specs/navigation-action-bar.md:12-20`. The current config has drifted to 15 items: `components/navigation/nav-config.tsx:1931-1947`.
- **Verified:** Focus mode is currently intended to be optional, not the universal default. Evidence: `lib/chef/layout-cache.ts:46-68` already falls back to `false`, and the newest migration set the DB default to false: `database/migrations/20260401000107_focus_mode_default_false.sql:1-9`.
- **Unverified but non-blocking:** Which exact 5 settings overview cards will feel best long-term is a product judgment, not a correctness fact. This spec fixes the structure and gives a concrete first pass; later tuning can adjust card groupings without invalidating the architecture.
- **Unverified but non-blocking:** The perfect 8-item shortcut mix is not backed by current telemetry in this session. It is backed by prior verified design intent and current route reality. That is enough for a buildable curation pass.

### 4. Where will this most likely break?

- **Nav discoverability regression:** If a builder removes items from the action bar and forgets they must remain in `navGroups`, discoverability breaks. Relevant shared logic lives in `components/navigation/nav-config.tsx:249-1546`, `components/navigation/all-features-collapse.tsx:19-35`, and `components/navigation/chef-nav.tsx:1009-1050`.
- **Focus mode mismatch:** If a builder changes fallback behavior without respecting the existing strict-group logic, focus mode can become inconsistent between settings, layout cache, and visible groups. Relevant files: `lib/billing/focus-mode-actions.ts:13-50`, `lib/chef/layout-cache.ts:46-68`, `lib/navigation/focus-mode-nav.ts:1-27`, `app/(chef)/settings/modules/modules-client.tsx:106-189`.
- **Integrations page framing drift:** A builder could move pieces around visually but accidentally break connect/disconnect expectations if they touch the API route or hub helpers. Relevant files: `app/(chef)/settings/integrations/page.tsx:25-99`, `components/integrations/connected-accounts.tsx:48-99`, `app/api/integrations/connect/route.ts:38-75`, `lib/integrations/integration-hub.ts:121-238`.

### 5. What is underspecified?

- The current builder risk is "condense" being interpreted as "make it prettier but still dense." This spec resolves that by locking:
  - 6 dashboard core cards
  - 8 action-bar shortcuts
  - 5 settings overview cards
  - advanced/manual integration tools behind explicit disclosure
- The only intentionally flexible area is the exact visual treatment of the new overview cards and secondary insights disclosure. The behavior, placement, and scope are specified here. Builders should follow the repo's existing visual language instead of inventing a new design system.

### 6. What dependencies or prerequisites exist?

- No schema or migration prerequisite exists. Existing data models already support this surface pass: `types/database.ts:7201-7265` and `types/database.ts:29000-29204`.
- The verified nav-action-bar spec is the design precedent for the smaller shortcut set: `docs/specs/navigation-action-bar.md:12-20`.
- The ready cloud-AI disclosure spec owns truthful AI/privacy rewrites and must remain separate: `docs/specs/full-cloud-ai-runtime-and-disclosure.md:52-59`, `docs/specs/full-cloud-ai-runtime-and-disclosure.md:74-95`.
- The draft respectful monetization spec touches modules/settings copy, so builders must avoid expanding scope into monetization cleanup while editing adjacent files: `docs/specs/respectful-monetization-foundation.md:220-222`.

### 7. What existing logic could this conflict with?

- Shared nav rendering across desktop and mobile depends on `actionBarItems` and `resolveStandaloneTop`: `components/navigation/nav-config.tsx:1906-1947`, `components/navigation/action-bar.tsx:21-121`, `components/navigation/chef-mobile-nav.tsx:430-560`.
- Focus-mode visibility depends on strict group ordering and visibility helpers: `lib/navigation/focus-mode-nav.ts:1-27`.
- Layout caching pulls `primary_nav_hrefs`, `mobile_tab_hrefs`, `enabled_modules`, and `focus_mode` together: `lib/chef/layout-cache.ts:46-68`.
- Manual integrations connect/disconnect behavior depends on the existing route and hub helpers, not just the visible form: `components/integrations/connected-accounts.tsx:48-99`, `app/api/integrations/connect/route.ts:38-75`, `lib/integrations/integration-hub.ts:121-238`.

### 8. What is the end-to-end data flow?

- **Dashboard core areas:** user opens `/dashboard` -> `ChefDashboard` renders server-side -> `CommandCenterSection()` queries selected counts from tenant-scoped tables -> condensed `CommandCenter` receives only core-area counts -> dashboard renders primary flow first -> user expands `DashboardSecondaryInsights` to see lower-frequency sections. Evidence: `app/(chef)/dashboard/page.tsx:287-470`, `app/(chef)/dashboard/_sections/command-center-data.tsx:22-124`.
- **Nav / focus mode:** layout renders -> cached layout loader reads `chef_preferences.primary_nav_hrefs`, `mobile_tab_hrefs`, `enabled_modules`, `focus_mode` -> sidebar/mobile nav compose visible items -> user toggles focus mode on `/settings/modules` -> `toggleFocusMode()` updates `chef_preferences` and revalidates layout cache -> shell rerenders with new visibility. Evidence: `app/(chef)/layout.tsx:153-170`, `lib/chef/layout-cache.ts:46-68`, `app/(chef)/settings/modules/modules-client.tsx:38-57`, `lib/billing/focus-mode-actions.ts:36-50`.
- **Integrations:** user opens `/settings/integrations` -> server page loads overview, recent events, Gmail/platform state, OAuth statuses, and manual accounts -> guided sections render first -> if user opens advanced/manual connector and submits, the form POSTs to `/api/integrations/connect` -> route validates CSRF + auth -> `connectIntegrationAccount()` or `disconnectIntegrationAccount()` writes `integration_connections` -> page refresh shows updated status. Evidence: `app/(chef)/settings/integrations/page.tsx:28-57`, `components/integrations/connected-accounts.tsx:48-99`, `app/api/integrations/connect/route.ts:21-75`, `lib/integrations/integration-hub.ts:121-238`.

### 9. What is the correct implementation order?

1. Re-curate the action bar and collapse defaults in nav files.
2. Build the dashboard secondary-insights wrapper and condensed core-areas panel.
3. Add the guided settings overview and wrap the current settings directory behind the advanced disclosure.
4. Reframe the integrations page into guided/business/advanced sections while keeping the same backend contracts.
5. Align focus mode fallback and copy last, once the main shell structure is stable.

This order is correct because the shell and dashboard define the new information hierarchy first, the settings and integrations pages then follow the same mental model, and the focus-mode copy/fallback alignment becomes a small consistency fix rather than a driver of the broader layout.

### 10. What are the exact success criteria?

- The action bar renders exactly 8 shortcuts and no longer includes Notifications, Inquiries, Recipes, Tasks, Food Catalog, Store Prices, or Rewards.
- Those removed shortcuts remain reachable via `Browse Everything`, existing routes, and command palette.
- The dashboard no longer shows the 24-card feature encyclopedia in its primary viewport.
- The dashboard still exposes all existing business/intelligence widgets, but behind an explicit secondary-insights disclosure.
- The settings root opens with a guided overview and keeps the full directory behind an advanced disclosure.
- The integrations page leads with guided setup, then business tools, then advanced/manual connections.
- `ConnectedAccounts` is no longer an always-open admin-looking form.
- `isFocusModeEnabled()` falls back to `false`, matching current optional-mode behavior.
- No AI/privacy disclosure files are changed by this spec's implementation.

### 11. What are the non-negotiable constraints?

- Keep tenant scoping and `requireChef()` protections intact across all touched server-side paths: `lib/billing/focus-mode-actions.ts:17-24`, `lib/integrations/core/query-actions.ts:20-31`, `lib/integrations/integration-hub.ts:76-86`, `app/api/integrations/connect/route.ts:21-29`.
- Do not remove routes or nav-group membership from the app. This is presentation and sequencing work only.
- Do not change integration schema, RLS, or API contracts: `database/migrations/20260224000011_integration_core_and_chef_website_controls.sql:96-169`, `app/api/integrations/connect/route.ts:11-75`.
- Do not introduce any new false privacy or AI-runtime claims while editing shell copy. Existing AI disclosure work is fenced to another spec.
- Do not reintroduce tier-lock or upgrade semantics into modules/settings copy.

### 12. What should NOT be touched?

- `app/(chef)/settings/ai-privacy/page.tsx`
- `components/ai-privacy/*`
- `lib/ai/privacy-actions.ts`
- `lib/ai/providers.ts`, `lib/ai/llm-router.ts`, `app/api/remy/*`, and related cloud-runtime files owned by the separate AI-runtime spec
- `database/migrations/*` and `types/database.ts`
- `app/api/integrations/connect/route.ts` behavior and `lib/integrations/integration-hub.ts` data contracts unless a bug blocks the page restructuring
- Existing route files for the removed action-bar shortcuts

### 13. Is this the simplest complete version?

Yes. It reuses the current routes, server actions, tables, settings categories, and integrations plumbing. It only adds thin wrapper components where needed to change the information hierarchy. Anything larger would drift into product redesign or backend refactor. Anything smaller would fail to solve the first-impression clutter problem.

### 14. If implemented exactly as written, what would still be wrong?

- The product would still have a truthful AI/privacy gap until `docs/specs/full-cloud-ai-runtime-and-disclosure.md` is built. This spec intentionally does not fix that.
- The total feature count would still be large. This spec makes the shell calmer; it does not reduce the underlying breadth of the product.
- The exact best 8-item action bar and 5-card settings overview may still need tuning once real users interact with the calmer shell. That is a product-optimization question, not a correctness blocker.
- A builder could still get this wrong by treating "guided" as a cosmetic reskin while leaving the same density exposed. The key requirement is hierarchy change, not just prettier cards.

## Final Check

> Is this spec production-ready, or am I proceeding with uncertainty?

This spec is production-ready for build.

> If uncertain: where specifically, and what would resolve it?

There is non-blocking product-tuning uncertainty around the perfect long-term action-bar mix and settings overview grouping. That does not affect build correctness because the structural decisions are explicit, the existing routes are verified, and the scope is fenced away from unrelated architecture work.
