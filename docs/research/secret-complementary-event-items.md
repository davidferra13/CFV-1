# Research: Secret and Complementary Event Items

> **Date:** 2026-04-28
> **Question:** How should ChefFlow support chef-private notes, secret event items, and complementary item planning without breaking transparent client and guest workflows?
> **Status:** complete

## Origin Context

The request came from a private chef workflow: chefs often add surprise bites, birthday cakes, gifts, truffles, leftovers repurposed as planned extras, or other complimentary touches that should help the chef prep without spoiling the surprise. Some surprises are known only to the chef, some to one client, some to most of a group except the guest of honor. The product already emphasizes transparency, so the problem is not to hide normal menu data. The problem is to give chefs a private operational layer attached to a Dinner Circle or event while preserving every existing client-visible and guest-visible surface.

## First Principles

PROBLEM: ChefFlow needs event-attached private planning objects that can support surprise or complimentary items without leaking into canonical menu, proposal, approval, guest portal, or Dinner Circle surfaces.

WHO: Primarily the chef, secondarily selected co-planners in the client party, never the excluded guest of honor.

ASSUMPTIONS: Normal menu transparency remains correct. Secret and complementary items are operational overlays, not canonical billable menu lines by default. Some future suggestions can be deterministic from existing cost, inventory, and preference data, but AI must not generate recipes.

SIMPLEST FIX: Add a chef-only event private note and private item layer keyed to `tenant_id`, `event_id`, and optional `menu_id` or `dish_id`, visible only on chef-authenticated event/menu screens.

OUT OF SCOPE: Public Dinner Circle secrecy, AI-generated dish ideas, automatic client-facing reveal flows, and destructive schema changes.

RISKS: Leakage through menu snapshots or public selectors is high severity. Cost hallucination is high severity if unknown costs become zero. Social complexity is medium severity because guest-of-honor exclusion needs explicit participants.

FRAMEWORK: Sustainable, yes. Cost-efficient, yes. Learning value, high. Profitable, likely if it protects chef margin. Preserves autonomy, yes. Alternatives considered, yes. Risk acceptable only with separate private data model.

VERDICT: Build in phases, starting with private notes and manually created private items.

## Summary

Secret and complementary items should not be stored as normal `dishes` today. Current event menus are transparent by design: when a `menus` row is linked to an event, public, client, proposal, approval, guest portal, and ticketed event paths can read nested `dishes` from that shared object. `menus` and `dishes` have no per-item private visibility column in the base schema, while client approval snapshots freeze menu content into JSONB, so hiding by convention would be fragile. `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:83`, `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:150`, `lib/events/menu-approval-actions.ts:129`

The right first architecture is a separate, chef-only event overlay: private event notes plus private event items. Later, a selected-participant surprise planning space can be added with explicit allowlists. Complementary suggestions can be deterministic and evidence-backed from existing Dish Index, inventory, cost, poll, and preference data, but must only surface existing chef-authored dishes or recipes. `database/migrations/20260426000004_hub_private_threads.sql:8`, `database/migrations/20260422000200_dinner_circle_menu_polling.sql:10`, `lib/hub/menu-poll-actions.ts:650`

## Detailed Findings

### 1. Canonical Menu Data Is Too Public For Secrets

`menus` are event-linked canonical records with `tenant_id`, `event_id`, name, description, status, notes, and target guest count. `dishes` are nested records under `menus` with course number, course name, description, dietary flags, allergen flags, `chef_notes`, and `client_notes`. There is no existing item visibility audience model in the base menu schema. `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:83`, `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:150`

Core chef actions create menus, attach them to events, and add dishes under authenticated `requireChef()` with tenant filters. This is safe for normal menu transparency, but it means a secret normal dish becomes part of the same canonical object used elsewhere. `lib/menus/actions.ts:174`, `lib/menus/actions.ts:690`, `lib/menus/actions.ts:875`

Menu approval builds a client-facing snapshot from event menus and nested dishes. It intentionally excludes `chef_notes` from the final course objects, but any future private fields placed on normal dishes would need explicit filtering before snapshot creation. `lib/events/menu-approval-actions.ts:129`, `lib/events/menu-approval-actions.ts:154`, `lib/events/menu-approval-actions.ts:169`

### 2. Dinner Circle Is Not A Secret Planning Primitive

Dinner Circle groups are token-addressed and can be linked to events. `hub_groups` includes `event_id`, `tenant_id`, and `group_token`, and `hub_group_events` links groups to multiple events. Public read policies and token access make this a broad shared workspace, not an exclusion-safe secret channel. `database/migrations/20260330000004_hub_groups.sql:8`, `database/migrations/20260330000004_hub_groups.sql:84`, `database/migrations/20260330000004_hub_groups.sql:107`

Public group messages are readable by group ID plus token. Pinned notes are worse for secrets because `getGroupNotes(groupId)` does not accept a group token or profile token in the traced function. `lib/hub/message-actions.ts:189`, `lib/hub/message-actions.ts:195`, `lib/hub/message-actions.ts:753`

Existing private threads are safer but narrow. They are one chef to one member per circle, and actions verify the caller is a participant before sending or reading. That can cover chef-to-one-client side conversations, but it does not solve “everyone except the guest of honor” planning. `database/migrations/20260426000004_hub_private_threads.sql:8`, `lib/hub/private-message-actions.ts:82`, `lib/hub/private-message-actions.ts:158`, `lib/hub/private-message-actions.ts:195`

### 3. Chef-Only Event Notes Already Have A Natural Shape

The permissions research found existing event-attached `client_notes.event_id` as the closest chef-only note primitive. Before using it as the first UX slice, its insert path should verify that both `client_id` and `event_id` belong to the authenticated chef tenant. This should be treated as private notes, not secret item planning. `lib/notes/actions.ts:56`, `lib/notes/actions.ts:64`, `lib/notes/actions.ts:195`

### 4. Complementary Suggestions Can Be Deterministic

ChefFlow already computes menu and recipe costs from components and recipe ingredients. The menu cost summary exposes total recipe cost, cost per guest, food cost percentage, and whether all recipe costs exist. That means complementary recommendations can be gated on known data rather than guessing. `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:357`, `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:859`, `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:912`

Dinner Circle menu polls preserve strong preference evidence. Polls can be scoped to `menu_course`, options can link to canonical `dish_index_id`, and votes preserve ranked or historical ballots. This supports “the group almost picked X” or “one person ranked X high” as evidence for a complementary option. `database/migrations/20260422000200_dinner_circle_menu_polling.sql:10`, `database/migrations/20260422000200_dinner_circle_menu_polling.sql:86`, `database/migrations/20260422000200_dinner_circle_menu_polling.sql:112`

Menu preferences store loves, avoids, selected menu, customization notes, and chef viewed status by event. These are useful as explicit preference signals, but public menu-pick selected dish persistence needs separate verification before relying on it for unchosen item intelligence. `database/migrations/20260330000013_menu_preferences_and_showcase.sql:14`, `database/migrations/20260330000013_menu_preferences_and_showcase.sql:23`, `database/migrations/20260330000013_menu_preferences_and_showcase.sql:30`

### 5. AI Must Stay Out Of Recipe Creation

The complementary engine should be rules-based first. It can search existing chef-authored dishes, recipes, ingredients, cost summaries, inventory stock, expiring batches, and menu poll outcomes. It must not generate dishes, recipes, ingredients, methods, or missing costs. This follows the project AI rule and keeps chef creative IP intact. `lib/ai/agent-actions/restricted-actions.ts:81`, `lib/ai/command-task-descriptions.ts:131`, `lib/ai/remy-input-validation.ts:249`

## Proposed Data Model

### Phase 1: Chef-Only Private Event Notes

Use or harden existing event-attached notes for the simplest quality of life feature:

- `tenant_id`
- `event_id`
- `client_id`
- `body`
- `note_type = private_event_note`
- chef-authenticated create, update, archive
- visible on chef event detail and chef menu planning only

Do not show these notes in Dinner Circle, guest portal, public event pages, proposal pages, menu approvals, emails, PDFs, or client dashboard.

### Phase 2: Private Event Items

Add a new additive table rather than modifying normal menu item visibility first:

- `id`
- `tenant_id`
- `event_id`
- `menu_id` nullable
- `source_dish_id` nullable
- `source_recipe_id` nullable
- `title`
- `description`
- `item_kind`: `secret`, `complimentary`, `piggyback`, `gift`, `other`
- `planning_status`: `idea`, `planned`, `prepped`, `packed`, `served`, `cancelled`
- `estimated_cost_cents` nullable
- `cost_confidence`: `known`, `estimated`, `unknown`
- `visibility_scope`: initially `chef_only`
- `notes`
- `created_by`, `updated_by`, timestamps, `archived_at`

This keeps private items out of client selectors and out of approval snapshots by construction.

### Phase 3: Selective Surprise Planning

Add a separate event-private planning thread with explicit participants:

- `event_private_threads`: `tenant_id`, `event_id`, `title`, `created_by`, `archived_at`
- `event_private_thread_participants`: `thread_id`, `profile_id`, `role`, `can_invite`
- `event_private_messages`: `thread_id`, `sender_profile_id`, `body`, timestamps

Do not reuse public Dinner Circle messages or pinned notes. This is the only clean way to support “everyone except the guest of honor.”

### Phase 4: Deterministic Complementary Suggestions

Add a persisted suggestion table only after the manual private item UX works:

- `event_private_item_suggestions`
- `tenant_id`
- `event_id`
- `candidate_dish_id`
- `candidate_recipe_id`
- `reason_codes`
- `incremental_cost_cents` nullable
- `cost_confidence`
- `inventory_evidence`
- `preference_evidence`
- `poll_evidence`
- `status`: `suggested`, `accepted`, `dismissed`

Suggestion rules should rank existing candidates by shared ingredients, expiring stock, known low cost, strong client preference, poll near-miss, and allergy safety.

## Gaps and Unknowns

1. Existing `client_notes.event_id` needs a focused security review before becoming the first event-private note UX because the research flagged a need to verify both `client_id` and `event_id` against `user.tenantId`. `lib/notes/actions.ts:56`, `lib/notes/actions.ts:64`
2. Some public ticketing code still has legacy `event_menus` fallback paths while active menu architecture uses `menus.event_id` and `events.menu_id`. That should be audited before expanding menu visibility. `lib/tickets/purchase-actions.ts:430`, `lib/tickets/purchase-actions.ts:467`
3. There is no current guest-of-honor exclusion model. Roles are too coarse, so any selective secret planning needs explicit allowlists.
4. Public menu-pick selection persistence may not retain every selected dish ID, so unchosen preference inference should start from Dinner Circle polls, not menu-pick, until that is fixed.

## Recommendations

1. **Quick fix:** Harden and expose chef-only event private notes on the chef event detail page. Do not touch canonical menu visibility yet.
2. **Needs a spec:** Build `event_private_items` as a separate chef-only overlay with manual create, edit, archive, status tracking, and optional links to existing dish or recipe records.
3. **Needs a spec:** Build selective surprise planning as an explicit allowlisted private thread model, not public Dinner Circle chat.
4. **Needs discussion:** Decide if a private item can later be promoted into the public menu. If yes, promotion must be an explicit chef action that creates or updates a normal visible dish.
5. **Later automation:** Build deterministic complementary suggestions from existing Dish Index, cost, inventory, preferences, and poll evidence. No AI recipe generation.
