# Feedback Loop Closure: AAR Recipe Feedback

> Implemented: 2026-03-26
> Status: Phase 2 complete

## What Changed

The system now closes the feedback loop: **post-event recipe observations flow back to the recipe itself**, building a track record over time.

Previously, AAR data was captured but dead-ended:

- Chef rated calm/preparation levels (useful for personal trends)
- Chef noted forgotten items (feeds the checklist system)
- Chef wrote text notes about the menu (free text, not connected to recipes)

None of this fed back to specific recipes. A chef with 50 events and 200 recipe uses had no way to answer: "How does this recipe actually perform in the field?"

## How It Works Now

### New Tables

**`aar_recipe_feedback`** - Per-recipe feedback from each AAR:

| Column            | Purpose                                            |
| ----------------- | -------------------------------------------------- |
| `aar_id`          | FK to after_action_reviews                         |
| `recipe_id`       | FK to recipes                                      |
| `tenant_id`       | FK to chefs (tenant scoping)                       |
| `timing_accuracy` | faster / accurate / slower (vs estimate)           |
| `would_use_again` | boolean (would the chef put this on a menu again?) |
| `notes`           | Optional per-recipe notes from this event          |

Unique constraint: one feedback per recipe per AAR.

**`aar_ingredient_issues`** - Per-ingredient problems from each AAR:

| Column          | Purpose                                                          |
| --------------- | ---------------------------------------------------------------- |
| `aar_id`        | FK to after_action_reviews                                       |
| `ingredient_id` | FK to ingredients                                                |
| `tenant_id`     | FK to chefs                                                      |
| `issue_type`    | forgotten / substituted / quality / quantity_wrong / price_wrong |
| `notes`         | Optional context                                                 |

Unique constraint: one issue per ingredient per type per AAR.

### Updated AAR Form

The AAR form now has a new "Recipe Feedback" section between forgotten items and text notes:

1. Auto-loads all recipes used at the event (via menu -> dishes -> components -> recipes chain)
2. For each recipe, the chef can:
   - Rate timing accuracy (faster/on time/slower) with single-tap buttons
   - Toggle "would use again" (defaults to yes)
   - Add optional notes
3. Feedback is saved in batch when the AAR is submitted (non-blocking: if feedback save fails, the AAR still saves)
4. When editing an existing AAR, previous feedback is pre-populated

### Recipe Track Record

The recipe detail page now shows a "Track Record" panel:

- **Times cooked** (from `recipes.times_cooked`)
- **Last cooked** date
- **Would-use-again rate** (percentage across all feedback)
- **Timing accuracy distribution** (visual bar chart: faster / on time / slower)
- **Recent event feedback** (expandable list: event name, date, client, timing, notes)

The panel self-hides when there's no data (new recipes with no events).

### Data Flow

```
Event completed
  -> Chef files AAR at /events/{id}/aar
  -> Rates calm/prep (existing)
  -> Rates each recipe: timing, would-repeat, notes (NEW)
  -> Saves to aar_recipe_feedback
  -> Recipe detail page shows aggregated track record
  -> Chef can see: "This recipe is consistently slower than expected"
  -> Chef adjusts prep time estimate
  -> Next event's prep timeline is more accurate
```

## Files Changed

| File                                                         | Change                                                                        |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `database/migrations/20260401000105_aar_feedback_tables.sql` | New tables: aar_recipe_feedback, aar_ingredient_issues                        |
| `lib/aar/feedback-actions.ts`                                | New server actions: save/get recipe feedback, track record, ingredient issues |
| `components/aar/recipe-feedback-section.tsx`                 | New UI: per-recipe rating section for AAR form                                |
| `components/aar/aar-form.tsx`                                | Modified: added recipe feedback section, wired save on submit                 |
| `components/recipes/recipe-track-record.tsx`                 | New UI: track record panel for recipe detail page                             |
| `app/(chef)/events/[id]/aar/page.tsx`                        | Modified: loads existing feedback when editing AAR                            |
| `app/(chef)/recipes/[id]/recipe-detail-client.tsx`           | Modified: added RecipeTrackRecordPanel                                        |

## What's Next

- Wire `aar_ingredient_issues` into the AAR form (ingredient issue picker from event's ingredient list)
- Feed timing feedback into prep timeline calculations (if a recipe is consistently "slower", auto-adjust the estimate)
- Include recipe track record in menu suggestion context (prefer recipes with high would-use-again rates)
- Trend analysis: "Your salmon wellington prep time is consistently 20% longer than estimated"
