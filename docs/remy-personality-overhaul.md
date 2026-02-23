# Remy Personality Overhaul + Archetype System

**Date:** 2026-02-22
**Branch:** feature/risk-gap-closure

## Problem

Remy had zero personality. All four variants (chef, public, client, landing) were professional and competent but robotic — no emojis, no warmth, no character. Felt like talking to a customer service bot rather than a kitchen partner.

## Solution: Two-Part Overhaul

### Part 1: Base Personality Upgrade (All 4 Variants)

Rewrote all four Remy personality definitions to give Remy the character of a **40-year Michelin-star veteran** — someone who's run kitchens, built businesses, and now serves as the chef's ride-or-die kitchen partner.

**Key changes across all variants:**

- Added emojis throughout (natural, not overloaded — maybe 1-2 per message)
- Kitchen metaphors and food references woven in naturally (not forced every message)
- Warmer, more human tone examples
- Added "HYPED" tone mode for wins and milestones
- More personality in redirects and refusals
- Updated guardrail refusal messages to match the new voice

**Files changed:**

| File                                 | Variant                                               |
| ------------------------------------ | ----------------------------------------------------- |
| `lib/ai/remy-personality.ts`         | Chef-facing (primary, most extensive)                 |
| `lib/ai/remy-public-personality.ts`  | Public visitor-facing                                 |
| `lib/ai/remy-client-personality.ts`  | Client portal concierge                               |
| `lib/ai/remy-landing-personality.ts` | Landing page (prospective chefs)                      |
| `lib/ai/remy-guardrails.ts`          | Refusal messages (empty, dangerous, abuse, injection) |

### Part 2: Archetype Selection System

Chefs (and admins) can now choose Remy's personality archetype from a dropdown. This changes tone and energy — not what Remy knows or can do.

**6 Archetypes:**

| ID        | Name             | Emoji | Vibe                                                                            |
| --------- | ---------------- | ----- | ------------------------------------------------------------------------------- |
| `veteran` | The Veteran      | `🔪`  | Default. Seasoned, direct, warm, food-first.                                    |
| `hype`    | The Hype Chef    | `🔥`  | HIGH ENERGY. Every win is a celebration. Guy Fieri meets Gordon Ramsay.         |
| `zen`     | The Zen Chef     | `🍃`  | Calm, measured, intentional. Kaiseki master energy. Fewer emojis.               |
| `numbers` | The Numbers Chef | `📊`  | Data-driven. Leads with margins and food cost %. CFO who ran the pass.          |
| `mentor`  | The Mentor       | `👨‍🍳`  | Teaching mode. Drops knowledge naturally. Jacques Pepin meets a business coach. |
| `classic` | Classic Remy     | `🐀`  | The original: warm, professional, minimal flourishes. Clean and focused.        |

**How it works:**

1. Chef goes to Settings > Privacy & Data (or admins access it)
2. Archetype grid shows all 6 options with emoji, name, tagline, description
3. Click to select — saves immediately to `ai_preferences.remy_archetype`
4. Next Remy conversation uses the selected archetype's prompt modifier
5. The modifier is injected between the base personality and the drafts/privacy/guardrails sections

**Architecture:**

- `lib/ai/remy-archetypes.ts` — Type-safe archetype definitions, `getArchetype()` lookup
- `lib/ai/privacy-actions.ts` — `saveRemyArchetype()` + `getRemyArchetype()` server actions
- `app/api/remy/stream/route.ts` — Loads archetype in parallel with other context, passes to `buildRemySystemPrompt()`
- `components/ai-privacy/remy-archetype-selector.tsx` — UI grid component
- `app/(chef)/settings/ai-privacy/page.tsx` — Selector added to settings page
- `supabase/migrations/20260322000050_remy_archetype.sql` — Adds `remy_archetype TEXT` column

**Key design decisions:**

- Archetype only affects chef-facing Remy (not public, client, or landing — those have fixed personalities appropriate to their audience)
- Default is `veteran` (NULL in DB maps to veteran in code)
- Archetype modifies tone/energy, never overrides safety rules, data boundaries, or core capabilities
- Loading is parallel with other context (no extra latency)

## Migration

```sql
ALTER TABLE ai_preferences
ADD COLUMN IF NOT EXISTS remy_archetype TEXT DEFAULT NULL;
```

Additive only. NULL = veteran (default). No existing data affected.

## Testing

- Change archetype in settings → next Remy conversation should reflect the new voice
- Verify default (no archetype set) still works = veteran personality
- Verify guardrail refusals have personality (emoji, kitchen language)
- Verify public/client/landing Remy variants are unaffected by archetype selection
