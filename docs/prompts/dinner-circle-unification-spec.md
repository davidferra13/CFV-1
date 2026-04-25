# Prompt: Dinner Circle Unification & Chef-to-Chef Collaboration Spec

## Your Role

You are a planner agent. Your job is to write a complete implementation spec. Do NOT write code. Read the codebase, understand what exists, and produce a spec document at `docs/specs/dinner-circle-unification.md`.

Use the `/planner` skill to run the full Planner Gate procedure.

---

## What ChefFlow Is

ChefFlow is a full-stack private chef operations platform (Next.js, PostgreSQL, Drizzle ORM, Auth.js v5). Chefs run their businesses here: events, clients, recipes, menus, finances. Clients have their own portal to view proposals, approve menus, and communicate with their chef.

---

## What Exists Today (Two Separate Systems)

### System 1: Dinner Circles (hub_groups)

Dinner Circles are the communication layer between a chef and their guests around events. They live in the `hub_groups` table and related tables (`hub_group_members`, `hub_messages`, `hub_polls`, `hub_guest_profiles`).

**Key files to read:**

- `lib/db/schema/schema.ts` — search for `hub_groups`, `hub_group_members`, `hub_messages`, `hub_polls`
- `lib/hub/chef-circle-actions.ts` — chef circle CRUD, auto-creation
- `lib/hub/inquiry-circle-actions.ts` — auto-create circle on inquiry
- `lib/hub/community-circle-actions.ts` — community (non-chef-owned) circles
- `lib/hub/circle-first-notify.ts` — notification architecture
- `lib/hub/menu-poll-actions.ts` — menu polling inside circles
- `lib/hub/circle-digest.ts` — batched email digests
- `lib/hub/email-to-circle.ts` — inbound email routing to circles
- `app/(chef)/circles/page.tsx` — chef circle dashboard
- `app/(public)/hub/g/[groupToken]/page.tsx` — public circle page
- `components/hub/dinner-circle-menu-board.tsx` — guest menu voting

**Current group_type values:** `'circle' | 'dinner_club' | 'planning' | 'bridge' | 'community'`

**What works well:**

- Auto-creation at inquiry, linking to event on conversion, archive on completion
- Circle-first notifications (lifecycle events post to circle, email points back)
- Menu polling (course-based, ranked choice, lock/finalize, materializes into event menu)
- Email-to-circle routing
- Digests (hourly/daily)
- Community circles (public, discoverable, no chef owner)
- Dinner clubs (multi-event persistent groups)
- Open Tables (discovery with seats, vibes, dietary themes)

### System 2: Chef Network (Separate Tables)

The Chef Network is a professional social network for chefs. Completely separate from Dinner Circles.

**Key files to read:**

- `lib/db/schema/schema.ts` — search for `chef_network_posts`, `chef_network_contact_shares`, `chef_network_feature_preferences`, `chef_connections`
- `app/(chef)/network/trusted-circle.tsx` — trust levels (partner/preferred/inner_circle)
- `app/(chef)/network/collab-inbox.tsx` — 1600-line collaboration handoff system (lead swaps, backup requests, referrals, availability signals, introduction bridges)

**What it does:**

- Network posts (12 feature categories: availability, referral_asks, collab_requests, etc.)
- Contact/client sharing between chefs
- Trusted circle management with trust levels
- Collaboration handoff system (lead swaps, backup requests, referrals)
- Availability signals and recipient auto-matching
- Introduction bridges

---

## The Problem

These two systems are isolated. The developer's real use case:

> "I have a chef friend who also runs a private chef business. I want a private space where we can share recipes, share clients, co-plan events, split purchasing, and communicate — all within ChefFlow. The Chef Network handles referrals, but there's no shared workspace where two chef operators can actually collaborate on the day-to-day."

Additionally, Dinner Circles should serve ALL relationship types on the platform, not just chef-to-guest. The circle is a **relationship primitive** — same infrastructure, different modes based on who's in it and what they share.

---

## The Seven Circle Types to Support

| #   | Circle Type      | Creator | Members                   | Purpose                                                                                                                                                      |
| --- | ---------------- | ------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Chef-Client**  | Chef    | Chef + Clients/Guests     | Event communication, menu polling, lifecycle notifications. **Already built.**                                                                               |
| 2   | **Community**    | Anyone  | Anyone                    | Public food circles, discoverable. **Already built.**                                                                                                        |
| 3   | **Dinner Club**  | Chef    | Chef + Recurring Guests   | Multi-event persistent group. **Already built.**                                                                                                             |
| 4   | **Chef-Chef**    | Chef    | 2+ Chef operators         | **NEW.** Private professional collaboration. Shared recipes, shared clients, co-hosted events, split purchasing, private messaging. This is the primary gap. |
| 5   | **Chef-Vendor**  | Either  | Chefs + Vendors/Suppliers | **FUTURE.** Price lists, seasonal availability, bulk order coordination. Vendor role doesn't exist yet — just note the extension point, don't design fully.  |
| 6   | **Chef-Staff**   | Chef    | Chef + Crew               | **FUTURE.** Prep lists, event briefs, schedules. Staff identity is lightweight today — note the extension point.                                             |
| 7   | **Event Circle** | Chef(s) | Multiple Chefs + Guests   | **NEW variant of #1.** Temporary, lives only for one event. Two chefs co-hosting a farm dinner with 40 guests.                                               |

**Focus the spec on #4 (Chef-to-Chef) and #7 (Event Circle with multiple chefs).** Types 5 and 6 just need extension points noted.

---

## What the Chef-to-Chef Circle Must Support

This is the core deliverable of the spec. Two (or more) chef operators, each with their own ChefFlow tenant, creating a private shared workspace.

### Recipe Sharing

- Chef A can share specific recipes from their recipe book into the circle
- Shared recipes are read-only copies (or references with permission controls)
- Chef B can import a shared recipe into their own book (with attribution)
- Neither chef loses ownership of their originals
- Recipe sharing is opt-in per recipe, never bulk/automatic

### Client Sharing & Referrals

- Upgrade the existing `chef_network_contact_shares` into the circle context
- Chef A can refer a client to Chef B through the circle
- Both chefs can see shared client history within the circle (not full CRM access)
- Client consent model: clients must opt-in to being shared

### Co-Hosted Events

- Two chefs co-host an event (farm dinner scenario already spec'd in `docs/specs/ticketed-events-and-distribution.md`)
- Shared event circle where both chefs have operator-level access
- Responsibility split (mains vs pastry, setup vs service)
- Shared prep lists, shared shopping lists
- Financial split (how revenue and costs divide)

### Co-Purchasing

- "I'm ordering 20 lbs of wagyu from this vendor, want to split?"
- Shared ingredient sourcing within the circle
- Not a full procurement system — just visibility and coordination

### Communication

- Private messaging between chef members
- Shared notes, files, photos
- Uses the existing `hub_messages` infrastructure

### Privacy & Permissions

- Each chef's data stays in their own tenant
- The circle is a controlled window — you choose what to expose
- Leaving a circle revokes access to shared content
- No chef can see another chef's financials, full client list, or full recipe book unless explicitly shared

---

## Architectural Constraints

1. **Zero new tables if possible.** Extend `hub_groups` with a new `group_type` value (e.g., `'chef_collab'`). Add columns to existing tables. Use junction tables for shared content references.
2. **Tenant isolation must not break.** Two chefs in a circle are two separate tenants. Shared content is referenced, not copied (unless explicitly imported).
3. **The Chef Network should flow INTO circles, not stay separate.** Referrals, collab handoffs, and introductions from the Chef Network should be able to create or link to a Chef-to-Chef circle. Don't rebuild what the network already does — bridge it.
4. **Use existing infrastructure:** `hub_messages` for communication, `hub_polls` for decision-making, `circle-first-notify.ts` for notifications, SSE for realtime (not polling).
5. **Read the co-hosting spec:** `docs/specs/ticketed-events-and-distribution.md` — it already covers multi-chef events with co-host roles. This spec should be compatible with it, not duplicate it.
6. **Read the surface grammar:** `docs/specs/surface-grammar-governance.md` — all new UI surfaces must declare a mode.
7. **Read the interface philosophy:** `docs/specs/universal-interface-philosophy.md` — mandatory for UI design decisions.

---

## Spec Deliverable Format

Write the spec to `docs/specs/dinner-circle-unification.md`. It must include:

1. **Problem Statement** — what's broken or missing today
2. **Circle Type Taxonomy** — the 7 types with their characteristics
3. **Chef-to-Chef Circle Deep Design** — the full feature breakdown (recipe sharing, client sharing, co-hosting, co-purchasing, communication, permissions)
4. **Schema Changes** — exact column additions, new junction tables, migration SQL
5. **Server Action Inventory** — every new or modified server action with signature
6. **UI Surface Map** — every new page, component, or modification to existing surfaces
7. **Network-to-Circle Bridge** — how Chef Network features connect to circles
8. **Permission Model** — who can do what in each circle type
9. **Migration Path** — how existing circles and network features transition
10. **Gaps & Future Extensions** — Chef-Vendor, Chef-Staff, and any other deferred work
11. **System Integrity Questions** — 20+ questions in the style of `docs/specs/system-integrity-question-set-cohosting.md`, with answers

Every claim must cite file paths and line numbers. No citation = not verified.

---

## What NOT to Do

- Do not write code
- Do not create migrations
- Do not modify existing files (except writing the spec)
- Do not redesign what already works (Dinner Circles, Chef Network)
- Do not propose a vendor or staff role system — just note the extension points
- Do not use em dashes anywhere in the spec
