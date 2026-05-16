# Agent Context: Circles Domain

> **Load this document into any agent working on circles, hub, communication, events, clients, inquiries, menus, sourcing, corporate, crew, or community features.**
> Last updated: 2026-05-15

---

## 0. Current North Star

Users live in portals and Circles.

- **Portal:** private cockpit for a role. Source-of-truth edits, settings, private work, finance, admin, and canonical records live here.
- **Circle:** shared operating space for relationships. Multi-party context, messages, decisions, status, memory, evidence, approvals, and handoffs live here.

If work is private or canonical, it belongs in a portal. If work involves other people, shared context, approvals, visibility, support, or relationship continuity, it belongs in a Circle or is projected into one.

The canonical domain charter is `docs/domain/circles.md`. The research-to-build extraction is `docs/specs/circles-operating-loop-build-extraction.md`.

## 1. What Circles Are

Circles are ChefFlow's **shared relationship primitive**. One table (`hub_groups`) backs the shared workspace substrate: members, messages, notes, media, polls, invitations, notifications, and public token access.

A Circle is NOT a chat group. It is a communication channel, operational workspace, shared memory layer, and handoff surface. It coordinates around canonical business records but does not replace them.

### Source-Of-Truth Boundary

Circles coordinate. Domain records own canonical truth.

| Canonical truth                              | Owning domain                              |
| -------------------------------------------- | ------------------------------------------ |
| Event lifecycle, date, address, status       | Events                                     |
| Menu contents, approval state, revisions     | Menus                                      |
| Quote pricing, quote state, line items       | Quotes                                     |
| Payments, deposits, balance, refunds         | Ledger / financials                        |
| Client CRM identity and relationship history | Clients                                    |
| Guest dietary facts and RSVP facts           | Guests / event guests / hub profile inputs |
| Staff identity and assignments               | Staff                                      |
| Vendor identity, sourcing, orders            | Vendors / purchasing                       |
| Contract status and document state           | Contracts                                  |

### Group Types (discriminator on `hub_groups.group_type`)

Current and planned naming is still being consolidated. Treat the following as the compatibility map until `lib/hub/circle-types.ts` exists.

| Current value | Canonical Circle type   | Purpose                                                                                                                       | Auto-created?                                    |
| ------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `circle`      | Dinner Circle           | Chef-to-client around an event/inquiry                                                                                        | Yes, at inquiry / event share                    |
| `dinner_club` | Client/recurring Circle | Multi-event persistent group for recurring clients; public discovery may legacy-project visible rows as community-style cards | Yes, on recurring setup where implemented        |
| `crew`        | Crew Circle             | Event staff coordination                                                                                                      | Yes, on first staff assignment where implemented |
| `community`   | Community Circle        | Public or member-scoped community group                                                                                       | Manual/system                                    |
| `planning`    | Planning Circle         | Pre-booking collaborative planning                                                                                            | Manual/system                                    |
| `bridge`      | Bridge Circle           | Chef-to-chef or cross-context collaboration workspace                                                                         | Manual/system                                    |

Potential future types such as `client`, `vendor`, `partner`, `chef_collab`, or `event_collab` must go through the Circle taxonomy/access policy first. Do not add ad hoc `group_type` strings from feature code.

Current drift to preserve for the next policy item: `crew` is live in `lib/hub/crew-circle-actions.ts`, but `HubGroup.group_type` and `CreateGroupSchema` still omit it. `dinner_club` is policy-canonical as client/recurring, while some public discovery behavior still projects it beside community Circles. Public join/email copy also still treats non-community groups as Dinner Circles.

---

## 2. Database Schema (Key Tables)

All tables in `lib/db/schema/schema.ts`.

### `hub_groups` (the Circle container)

- `group_type` - discriminator (see above)
- `event_id` FK - links to `events`
- `inquiry_id` FK - links to `inquiries`
- `tenant_id` FK - chef who owns this circle
- `group_token` - unique, used for public URLs
- `is_open_table` - boolean for discoverable open-seating circles
- `display_area`, `display_vibe`, `dietary_theme`, `open_seats`, `max_group_size` - community discovery metadata
- `visibility` - `'public' | 'private' | 'secret'`
- `last_message_at`, `last_message_preview`, `message_count` - denormalized for fast listing
- `planning_brief` - JSONB for planning groups

### `hub_group_members` (membership + permissions)

- `role` - `'owner' | 'admin' | 'chef' | 'host' | 'member' | 'viewer' | 'delegate'`
- `can_post`, `can_invite`, `can_pin` - granular permissions
- `notify_email`, `notify_push`, `quiet_hours_start/end`, `digest_mode` - notification prefs
- `last_read_at`, `last_notified_at` - read/notification tracking
- `is_co_host` - co-hosting flag

### `hub_messages` (the message store)

- `message_type` - `'text' | 'image' | 'system' | 'poll' | 'rsvp_update' | 'menu_update' | 'note' | 'photo_share' | 'notification'`
- `source` - `'circle' | 'email' | 'remy' | 'system'` - tracks origin channel
- `notification_type` - 16 lifecycle notification types (quote_sent through open_slot)
- `action_url`, `action_label` - deep-link buttons in notification messages
- `reply_to_message_id` - threading

### `hub_guest_profiles` (identity for circle participants)

- Dietary preferences, allergies, dislikes, favorites, spice tolerance, cuisine preferences
- `client_id` FK - links to `clients` table when upgraded
- `upgraded_to_client_at` - conversion tracking

### `circle_approval_gates` (corporate workflow)

- Ordered approval steps per event (menu sign-off, budget approval, legal review)
- Status: `pending | in_review | approved | rejected | skipped`

### `chef_trusted_circle` (chef-to-chef trust network)

- `trust_level` - `'partner' | 'preferred' | 'inner_circle'`
- Used for handoff visibility scoping

### Cross-table FKs

- `clients.dinner_circle_group_id` - every client has a primary circle
- `clients.referred_from_group_id` - referral tracking
- `beta_onboarding_checklist.primary_circle_id` - onboarding tracking
- `event_share_settings.circle_config` - JSONB storing `DinnerCircleConfig`

---

## 3. The DinnerCircleConfig (Operational JSONB)

Defined in `lib/dinner-circles/types.ts`. Stored per-event in `event_share_settings.circle_config`. This is the operational spine of an event:

| Section           | What It Stores                                                                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `money`           | Pay split rules, ticket seller, compensation model, platform fee %                                                                                                      |
| `supplier`        | Raw ingredient text, parsed lines, source links                                                                                                                         |
| `menu`            | Manual notes, poll/suggestion toggles, version label, lock state, fixed/flexible elements, changelog                                                                    |
| `publicPage`      | Story narrative, past event links, guest map toggle                                                                                                                     |
| `layout`          | Named layout with zones (kitchen/prep/service/guest/storage/path), timeline items                                                                                       |
| `farm`            | Showcase title, animal profiles, notes (farm-to-table events)                                                                                                           |
| `social`          | Linked social media posts (Instagram, TikTok, etc.)                                                                                                                     |
| `adaptive`        | Live ingredient sourcing: availability items with statuses, substitution proposals with cost deltas, price tolerance, sourcing event log                                |
| `popUp`           | Full pop-up lifecycle: stage tracking (concept through analyzed), order sources, location profile, menu item plans with production status, closeout with unit-level P&L |
| `theme`           | Visual palette (field/hearth/market/coastal/custom), accent color, background mode                                                                                      |
| `vendorInquiries` | Vendor interest submissions                                                                                                                                             |
| `corporate`       | Company/dept/PO, payment terms, budget ceiling, contacts with decision-maker flags, required docs with compliance status                                                |

### DinnerCircleSnapshot (computed read-time view)

`DinnerCircleSnapshot` in same file. Aggregates config + computed data:

- `counts` - collaborators, ticket types, paid tickets/guests, photos, menus
- `money` - revenue, refunds, projected capacity/revenue, platform fees, net payout
- `checks` - readiness gates: people, ingredients, layout, menu, money, expectations, substitutions, publish, timeline, capture
- `adaptive` - sourcing status counts, estimated cost, menu state (locked/fluid/needs_sourcing)

---

## 4. Domain Connection Map (18 Domains)

### Events

- `hub_groups.event_id` FK. Circle auto-creates when inquiry converts to event.
- `buildDinnerCircleSnapshot()` in `lib/dinner-circles/event-circle.ts` computes readiness gates.
- Readiness checks gate event execution (10 dimensions).

### Inquiries

- `hub_groups.inquiry_id` FK. Circle created at inquiry arrival.
- First response posted deterministically via `lib/hub/inquiry-circle-first-message.ts`.
- Circle lookup falls through: event circle -> inquiry circle.

### Clients

- `clients.dinner_circle_group_id` FK. Every client has a primary circle.
- `lib/recurring/circle-bridge.ts`: `ensureRecurringClientCircle()` auto-creates circle for recurring services.
- `postRecurringLifecycleMessage()` posts system messages for ongoing service updates.

### Email (Circle-First Architecture)

- **Outbound**: `lib/hub/circle-first-notify.ts` posts to circle first, then short email points back.
- **Inbound**: `lib/hub/email-to-circle.ts` parses Gmail replies, strips signatures/quoted text, inserts as `source: 'email'` messages.
- Standalone fallback email if no circle exists.

### Menus

- `visible_to_dinner_circle` column on menus table. UI toggle: `components/menus/dinner-circle-toggle.tsx`.
- Menu polling: `lib/hub/menu-poll-actions.ts` (course-based, ranked choice, materializes into event menu).
- Config stores menu notes, version labels, fixed/flexible elements, lock state.

### Recipes

- `PopUpMenuItemPlan.recipeId` links pop-up items to recipes.
- `lib/dinner-circles/ingredient-showcase.ts` queries full recipe chain (event->menu->dish->component->recipe->ingredient).

### Finance

- Config stores pay splits, ticket seller, platform fees.
- Snapshot computes revenue/refunds/projections/net payout.
- Pop-up closeout tracks per-item P&L.
- Corporate config tracks budget ceilings, payment terms, PO numbers.

### Sourcing / Ingredients

- `lib/dinner-circles/sourcing-actions.ts`: availability tracking, substitution proposals with cost deltas, price flexibility, audit trail.
- `lib/dinner-circles/ingredient-showcase.ts`: ingredient display from recipe chain.
- Status changes trigger circle notifications.

### Scheduling / Workload

- `lib/hub/circle-pipeline-stats.ts` queries financial summary + event dates for workload overlay.

### Onboarding

- Steps 2-3 of 5-step beta checklist: create circle, invite members.
- `beta_onboarding_checklist.primary_circle_id` tracks progress.

### Presence / Real-Time

- `hub_group_members.last_read_at` read receipts.
- `components/hub/circles-unread-badge.tsx` in chef nav.
- Push notifications via `lib/push/send.ts` with throttling (5-min cooldown, quiet hours, digest modes).

### Reviews / Growth / Rebooking

- `components/events/circle-rebook-button.tsx` after completed events.
- Community discovery: `app/(public)/hub/circles/page.tsx` (SEO-indexed, searchable).
- Open Tables: discoverable circles with seats/vibes/dietary themes.
- `clients.referred_from_group_id` traces growth to circles.

### AI / Remy

- `hub_messages.source` includes `'remy'`. Remy posts messages into circles.
- Feature map ties pain points to circle communication.

### Lifecycle Hooks

- `lib/hub/circle-lifecycle-hooks.ts` posts structured messages at every transition.
- `circleFirstNotify` is the production entry point (circle + email/push).

### Corporate / Compliance

- `CorporateConfig` in DinnerCircleConfig: company, dept, PO, cost center, contacts, required docs.
- `circle_approval_gates` table: ordered multi-step approval workflows.

### Chef Network / Collaboration

- `chef_trusted_circle` table: trust levels, handoff visibility scoping.
- Crew circles (`lib/hub/crew-circle-actions.ts`): `group_type: 'crew'` for staff.

### Tickets / Purchases

- `lib/tickets/purchase-actions.ts` imports `normalizeDinnerCircleConfig`.
- Pop-up config manages ticket IDs, order sources, preorder windows.

### Settings / Sharing

- `event_share_settings` stores circle config + share token.
- Theme system customizes public event page.

---

## 5. File Index

### Core Types

| File                          | What                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `lib/dinner-circles/types.ts` | DinnerCircleConfig, DinnerCircleSnapshot, all sub-types                       |
| `lib/hub/types.ts`            | HubGroup, HubGroupMember, HubMessage, HubPoll, HubGuestProfile, all hub types |

### lib/dinner-circles/ (6 files)

| File                     | What                                                         |
| ------------------------ | ------------------------------------------------------------ |
| `actions.ts`             | Circle CRUD, config normalization                            |
| `corporate-actions.ts`   | Corporate gate management                                    |
| `event-circle.ts`        | `buildDinnerCircleSnapshot()`, readiness checks              |
| `ingredient-showcase.ts` | Recipe chain ingredient display                              |
| `sourcing-actions.ts`    | Adaptive sourcing, substitution proposals, price flexibility |
| `types.ts`               | All type definitions                                         |

### lib/hub/ (56 files, key ones listed)

| File                              | What                                          |
| --------------------------------- | --------------------------------------------- |
| `circle-lookup.ts`                | Find circle for event (falls through inquiry) |
| `circle-first-notify.ts`          | Circle-first notification architecture        |
| `circle-lifecycle-hooks.ts`       | Structured messages at lifecycle transitions  |
| `email-to-circle.ts`              | Inbound email routing                         |
| `inquiry-circle-first-message.ts` | Auto-first-message on inquiry                 |
| `chef-circle-actions.ts`          | Chef circle dashboard data                    |
| `circle-detail-actions.ts`        | Circle detail page data                       |
| `circle-pipeline-stats.ts`        | Workload/financial overlay                    |
| `circle-notification-actions.ts`  | Push/email notifications                      |
| `circle-approval-actions.ts`      | Corporate approval gates                      |
| `community-circle-actions.ts`     | Public community circles                      |
| `crew-circle-actions.ts`          | Staff coordination circles                    |
| `menu-poll-actions.ts`            | Course-based menu polling                     |
| `message-actions.ts`              | Message CRUD                                  |
| `invite-actions.ts`               | Circle invitations                            |
| `invite-links.ts`                 | Shareable invite links                        |
| `group-actions.ts`                | Low-level group operations                    |
| `profile-actions.ts`              | Guest profile management                      |
| `private-message-actions.ts`      | 1:1 threads within circles                    |
| `circle-digest.ts`                | Batched email digests                         |
| `realtime.ts`                     | SSE/real-time updates                         |
| `types.ts`                        | All hub type definitions                      |

### App Routes

| Route                                               | What                                  |
| --------------------------------------------------- | ------------------------------------- |
| `app/(chef)/circles/page.tsx`                       | Chef circle dashboard                 |
| `app/(chef)/circles/[id]/page.tsx`                  | Circle detail                         |
| `app/(chef)/circles/[id]/circle-detail-client.tsx`  | Client-side circle detail             |
| `app/(public)/hub/circles/page.tsx`                 | Public community discovery            |
| `app/(public)/e/[shareToken]/public-event-view.tsx` | Public event page (circle-configured) |
| `app/(public)/hub/g/[groupToken]/page.tsx`          | Public circle page                    |

### Key Components

| Component                                            | What                        |
| ---------------------------------------------------- | --------------------------- |
| `components/hub/circles-unread-badge.tsx`            | Nav unread count            |
| `components/hub/circles-page-tabs.tsx`               | Circle dashboard tabs       |
| `components/hub/circles-pipeline-header.tsx`         | Pipeline view header        |
| `components/hub/circles-momentum-strip.tsx`          | Activity momentum           |
| `components/hub/circles-inbox.tsx`                   | Circle inbox                |
| `components/hub/dinner-circle-menu-board.tsx`        | Guest menu voting           |
| `components/hub/circle-invite-card.tsx`              | Invitation UI               |
| `components/hub/circle-menu-card.tsx`                | Menu display in circle      |
| `components/hub/circle-share-card.tsx`               | Sharing UI                  |
| `components/hub/community-circle-card.tsx`           | Community circle card       |
| `components/hub/create-community-circle-form.tsx`    | Create community circle     |
| `components/events/dinner-circle-command-center.tsx` | Event circle command center |
| `components/events/circle-rebook-button.tsx`         | Post-event rebook           |
| `components/events/crew-circle-card.tsx`             | Crew circle display         |
| `components/menus/dinner-circle-toggle.tsx`          | Menu visibility toggle      |

### Specs & Docs

| Doc                                                             | What                                        |
| --------------------------------------------------------------- | ------------------------------------------- |
| `docs/prompts/dinner-circle-unification-spec.md`                | Unification vision (chef-to-chef expansion) |
| `docs/specs/hub-consolidation.md`                               | Hub consolidation spec                      |
| `docs/specs/dinner-circle-elevation.md`                         | Circle elevation spec                       |
| `docs/specs/dinner-circles-elevation-spec.md`                   | Elevation details                           |
| `docs/specs/dinner-circles-expansion-spec.md`                   | Expansion spec                              |
| `docs/specs/dinner-circle-multi-host-collaboration.md`          | Multi-host collab                           |
| `docs/specs/crew-circles-build-spec.md`                         | Crew circles build spec                     |
| `docs/specs/system-integrity-question-set-community-circles.md` | Community circles integrity questions       |
| `CONTEXT.md` (line 121)                                         | Canonical definition                        |

### Migrations (key ones)

| Migration                                          | What                      |
| -------------------------------------------------- | ------------------------- |
| `20260330000063_circle_first_communication.sql`    | Circle-first architecture |
| `20260425000014_circle_approval_gates.sql`         | Corporate approval gates  |
| `20260415000012_menu_dinner_circle_visibility.sql` | Menu visibility control   |
| `20260509000002_menu_dinner_circle_fk.sql`         | Menu-circle FK            |

---

## 6. Architectural Invariants (Do Not Violate)

1. **Portals own private/canonical work. Circles own shared coordination.** Do not make Circle membership equivalent to full linked-record access.
2. **One substrate, many Circle types.** Relationship work should use `hub_groups`, membership, messages, notes, media, polls, invites, and access policy instead of new parallel group/chat systems.
3. **Circle-first communication.** Email can notify or bridge back into Circles. Do not make email the long-term primary shared workspace when a Circle exists.
4. **Auto-creation at inquiry/event-share.** Standard chef-client flows should not require manual Dinner Circle creation.
5. **Tenant isolation.** Each chef's tenant data stays tenant-scoped. Circles allow controlled sharing through membership, token access, and linked-object policy, not data copying.
6. **Client-safe token views.** Public `/hub/g/[groupToken]` access is intentionally low-friction but must sanitize members, profile tokens, financial data, chef-only notes, internal risk, and private household detail.
7. **Operational JSONB is event projection, not Circle identity.** `DinnerCircleConfig` carries event-specific operational projection. `hub_groups` owns the shared workspace container.
8. **Readiness and status are evidence-labeled.** Unknown, claimed, inferred, stale, and disputed facts must not be smoothed into confirmed public copy.
9. **Source tracking.** Every message records its `source` (`circle`, `email`, `remy`, `system`). Never lose provenance.
10. **Lifecycle hooks.** Event and quote transitions should post structured Circle messages through Circle-first notification paths where applicable.

---

## 7. Common Agent Tasks & Entry Points

| Task                      | Start Here                                                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add new notification type | `lib/hub/types.ts` (add to `HubNotificationType`), `lib/hub/circle-first-notify.ts` (add case), `lib/hub/circle-lifecycle-hooks.ts` (add hook)                   |
| Add circle config section | `lib/dinner-circles/types.ts` (extend `DinnerCircleConfig`), `lib/dinner-circles/actions.ts` (update normalization)                                              |
| New readiness check       | `lib/dinner-circles/event-circle.ts` (add to `checks` array in `buildDinnerCircleSnapshot`)                                                                      |
| New Circle type           | Start with `docs/domain/circles.md`, then add/extend a taxonomy helper such as `lib/hub/circle-types.ts`; do not bypass policy with ad hoc `group_type` strings. |
| Circle UI work            | `app/(chef)/circles/` (pages), `components/hub/` (components)                                                                                                    |
| Corporate features        | `lib/dinner-circles/corporate-actions.ts`, `lib/hub/circle-approval-actions.ts`                                                                                  |
| Menu polling              | `lib/hub/menu-poll-actions.ts`, `lib/hub/menu-poll-core.ts`                                                                                                      |
| Ingredient/sourcing       | `lib/dinner-circles/sourcing-actions.ts`, `lib/dinner-circles/ingredient-showcase.ts`                                                                            |
| Email integration         | `lib/hub/email-to-circle.ts` (inbound), `lib/hub/circle-first-notify.ts` (outbound)                                                                              |
| Community/discovery       | `lib/hub/community-circle-actions.ts`, `app/(public)/hub/circles/page.tsx`                                                                                       |
| Crew circles              | `lib/hub/crew-circle-actions.ts`, `components/events/crew-circle-card.tsx`                                                                                       |

---

## 8. Testing Notes

- Agent account: `.auth/agent.json`
- Auth endpoint: `POST http://localhost:3100/api/e2e/auth`
- Circle pages: `/circles` (dashboard), `/circles/[id]` (detail)
- Public pages: `/hub/circles` (discovery), `/e/[shareToken]` (public event)
- Key flows to verify: inquiry -> auto-circle -> event conversion -> lifecycle messages -> rebook
