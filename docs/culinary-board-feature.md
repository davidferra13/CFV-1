# Culinary Composition Board — Feature Doc

**Date:** 2026-03-22
**Branch:** `feature/risk-gap-closure`

## What This Is

A culinary composition cheat sheet — a visual reference of every word you could use to describe food, organized to help chefs compose balanced, complete dishes. Inspired by a culinary school exercise: a whiteboard covered in handwritten descriptors that you glance at while building a plate to make sure you're not missing a dimension (crunch, acid, aroma, contrast, etc.).

## Two Views

### Board View (default)

- Dark chalkboard background with chalk-dust aesthetic
- 200+ words scattered in a Jackson Pollock style — different sizes, colors, handwritten fonts, and rotations
- Tier 1 words (CRUNCHY, UMAMI, FAT, ACID, BALANCE) are huge; Tier 4 words (Spherification, Terroir) are small
- 10 chalk marker colors, 6 handwritten Google Fonts, rotations from -7° to +7°
- Hover any word to see it glow and scale up
- Deterministic styling via word hash — looks random but renders the same every time

### List View

- Clean document organized by 11 categories: Texture, Flavor, Temperature, Mouthfeel, Aroma, Technique, Visual, Composition, Emotion, Sauce, Action
- Each word shows as a pill/badge with tier indicator (T1–T4)
- Categories have emoji icons for quick scanning
- Legend at the bottom explains tier levels

## User-Added Words

Any chef can click "Add Word" to contribute their own word to the board. The word is:

- Added to **their personal board only** (doesn't change other chefs' boards)
- Stored in the `chef_culinary_words` database table, scoped by `chef_id`
- Visible in both Board and List views

### Admin Submissions Tab

Admins see a third tab ("Submissions") showing all user-submitted words across all chefs — a simple table with word, category, tier, and date. This lets admin see what words chefs are adding for inspiration on what to include in the global list.

## Files Created / Modified

### New Files

| File                                                         | Purpose                                                    |
| ------------------------------------------------------------ | ---------------------------------------------------------- |
| `lib/culinary-words/constants.ts`                            | 230+ word list, types, categories, board styling constants |
| `lib/culinary-words/actions.ts`                              | Server actions: get/add/remove user words, admin view      |
| `app/(chef)/culinary-board/page.tsx`                         | Main page (server component, loads fonts + data)           |
| `components/culinary/culinary-board.tsx`                     | Client wrapper with view toggle (Board/List/Admin)         |
| `components/culinary/board-view.tsx`                         | Artistic chalkboard word cloud                             |
| `components/culinary/list-view.tsx`                          | Organized list by category                                 |
| `components/culinary/add-word-dialog.tsx`                    | Form to add a new word                                     |
| `components/culinary/admin-word-list.tsx`                    | Admin table of all user submissions                        |
| `supabase/migrations/20260322000041_chef_culinary_words.sql` | User words table with RLS                                  |
| `docs/culinary-cheat-sheet.html`                             | Standalone HTML version (bonus, no DB needed)              |

### Modified Files

| File                                   | Change                                                             |
| -------------------------------------- | ------------------------------------------------------------------ |
| `components/navigation/nav-config.tsx` | Added "Culinary Board" under Menus & Recipes (advanced visibility) |

## Database

### `chef_culinary_words` table

```sql
id          UUID PRIMARY KEY
chef_id     UUID NOT NULL REFERENCES chefs(id)
word        TEXT NOT NULL
tier        INTEGER (1–4, default 3)
category    TEXT (one of 11 categories)
created_at  TIMESTAMPTZ
```

RLS: Chefs can only read/insert/delete their own words.

## Tier Assignment

**Free tier** — This is a reference/inspiration tool closely tied to the core recipe and menu composition workflow. No billing gating required.

## Word Categories & Counts

| Category    | Example Words                      | Approx Count |
| ----------- | ---------------------------------- | ------------ |
| Texture     | Crunchy, Slimy, Chewy, Pillowy     | ~60          |
| Flavor      | Umami, Smoky, Funky, Gamey         | ~45          |
| Mouthfeel   | Fat, Greasy, Numbing, Electric     | ~25          |
| Aroma       | Fragrant, Barnyard, Piney          | ~20          |
| Technique   | Foam, Spherification, Sous Vide    | ~25          |
| Visual      | Contrast, Quenelle, Negative Space | ~18          |
| Composition | Acid, Salt, Balance, Layers        | ~14          |
| Emotion     | Comfort, Primal, Decadent          | ~14          |
| Temperature | Hot, Molten, Flash-Chilled         | ~12          |
| Sauce       | Jus, Gastrique, Beurre Blanc       | ~16          |
| Action      | Sear, Deglaze, Braise              | ~23          |

**Total: 230+ words**

## How to Test

1. Navigate to `/culinary-board`
2. Verify the Board view renders with scattered, colorful, multi-font words on a dark background
3. Toggle to List view — verify words are grouped by category with tier badges
4. Click "Add Word" — add a custom word, verify it appears on the board
5. As admin, check the "Submissions" tab to see all user-added words
