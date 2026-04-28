# Private Context, Secret Orchestration, and Complimentary Intelligence

> Spec for the dual-layer visibility and intelligence system.

## Overview

Three interlocking systems that give chefs full internal awareness while preserving external transparency.

1. **Private Context Layer** - Chef-only notes/items on any entity
2. **Secret Orchestration System** - Multi-party selective visibility objects with planning
3. **Complimentary Intelligence Engine** - AI-driven comp suggestions + tracking

## Design Principles

- ChefFlow remains fully transparent by default
- All three systems are opt-in, toggleable, default OFF
- Chef has final control: accept/reject suggestions, override visibility, remove/reveal at any time
- Secrets never leak into client-facing surfaces, exports, or communications
- Complimentary items never affect visible pricing
- Formula > AI: deterministic detection first, Ollama only for synthesis

## Database Schema

### `chef_private_context` - Private notes on any entity

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK chefs | Tenant scope |
| entity_type | ENUM | event, client, menu, circle, dish, recipe |
| entity_id | UUID | Polymorphic reference |
| context_type | ENUM | note, reminder, observation, intention, item |
| title | TEXT | Optional short label |
| content | TEXT | Freeform content |
| structured_data | JSONB | Optional structured payload |
| pinned | BOOLEAN | Default false |
| archived | BOOLEAN | Default false |
| remind_at | TIMESTAMPTZ | Optional reminder time |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `event_secrets` - Controlled-visibility objects

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK chefs | |
| event_id | UUID FK events | |
| circle_group_id | UUID FK hub_groups | Optional |
| secret_type | ENUM | menu_item, surprise_dish, gift, experience, moment |
| title | TEXT | |
| description | TEXT | |
| structured_data | JSONB | Type-specific payload |
| visibility_scope | ENUM | chef_only, chef_and_selected, participant_only |
| reveal_timing | TEXT | When during service |
| reveal_at | TIMESTAMPTZ | Optional scheduled reveal |
| status | ENUM | planning, ready, revealed, cancelled |
| execution_notes | TEXT | |
| estimated_cost_cents | INTEGER | |
| actual_cost_cents | INTEGER | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `event_secret_participants` - Visibility grants

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| secret_id | UUID FK event_secrets | |
| profile_id | UUID FK hub_guest_profiles | |
| can_edit | BOOLEAN | Default false |
| added_at | TIMESTAMPTZ | |
| added_by_tenant_id | UUID | Chef who added |

### `event_secret_threads` - Discussion on secrets

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| secret_id | UUID FK event_secrets | |
| author_type | ENUM | chef, participant |
| author_id | UUID | tenant_id or profile_id |
| message | TEXT | |
| created_at | TIMESTAMPTZ | |

### `event_secret_assets` - Planning assets

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| secret_id | UUID FK event_secrets | |
| asset_type | ENUM | ingredient, design, timing, equipment, other |
| description | TEXT | |
| quantity | TEXT | Optional |
| estimated_cost_cents | INTEGER | |
| status | ENUM | needed, sourced, ready |
| created_at | TIMESTAMPTZ | |

### `complimentary_items` - Executed comp items

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK chefs | |
| event_id | UUID FK events | |
| secret_id | UUID FK event_secrets | Optional link |
| item_type | ENUM | true_comp, piggyback, reuse |
| name | TEXT | |
| description | TEXT | |
| estimated_cost_cents | INTEGER | |
| actual_cost_cents | INTEGER | |
| suggestion_source | ENUM | ai, manual, carry_forward, intelligence |
| suggestion_reason | TEXT | |
| status | ENUM | suggested, accepted, rejected, executed |
| client_reaction | TEXT | Post-event |
| retention_impact | TEXT | Post-event |
| created_at | TIMESTAMPTZ | |
| executed_at | TIMESTAMPTZ | |

### `complimentary_suggestions` - AI-generated suggestions

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK chefs | |
| event_id | UUID FK events | |
| suggestion_type | ENUM | unselected_preference, repeated_interest, celebration, excess_production, high_margin, reusable_component, client_pattern |
| title | TEXT | |
| description | TEXT | |
| reasoning | TEXT | Why this was suggested |
| estimated_cost_cents | INTEGER | |
| effort_level | ENUM | minimal, moderate, significant |
| confidence_score | INTEGER | 0-100 |
| status | ENUM | pending, accepted, rejected, expired |
| source_data | JSONB | What triggered this |
| created_at | TIMESTAMPTZ | |
| expires_at | TIMESTAMPTZ | |

## Integration Points

### CIL Integration
- New signal source: `complimentary` for tracking comp item execution
- New relation types: `comped_for` (chef -> client), `surprised_with` (event -> secret)
- Scanner detects: comp item success patterns, client retention lift from comps

### Remy Integration
- Remy context includes pending comp suggestions for upcoming events
- Remy can surface "You have 3 comp suggestions for Saturday's dinner"
- Chef can accept/reject via Remy conversation

### Menu System
- Secret menu items exist in parallel, never in standard menu views
- Revealed secrets can optionally merge into the visible menu post-reveal

### Financial System
- Comp items tracked separately from event pricing
- Never affect `event_financial_summary` visible totals
- Internal cost tracking for chef's own analytics

## Failure Conditions (Tests)

1. Secret exposed unintentionally -> RLS + app-layer filtering
2. Comp item in client-visible surface -> SELECT list omission + dedicated queries
3. Chef cannot track hidden actions -> dedicated dashboard widget
4. Data disconnected from event -> FK constraints + cascade rules
5. System introduces confusion -> defaults to OFF, progressive disclosure
