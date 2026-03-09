# Menu, Recipe & Public Page Terminology Cleanup

**Date:** 2026-03-09
**Branch:** feature/risk-gap-closure

## Problem

Em dashes (banned per CLAUDE.md) were scattered across recipe and menu page titles, comments, and user-visible text. Production log used database jargon ("records", "entries") instead of chef language ("batches"). Sprint page said "configured" (technical) instead of "set up". Public pages had minor jargon: "manage" (vague), "leverage" (consulting-speak), "network nodes" (tech jargon).

## Changes

### Em Dash Removal (15 instances across recipes, menus, and public files)

| File                                               | Old                                     | New                             |
| -------------------------------------------------- | --------------------------------------- | ------------------------------- |
| `recipes/ingredients/page.tsx`                     | `Ingredient Library -- ChefFlow`        | `Ingredient Library - ChefFlow` |
| `recipes/page.tsx`                                 | `Recipe Book -- Library Page` (comment) | `Recipe Book - Library Page`    |
| `recipes/production-log/page.tsx`                  | `Production Log -- ChefFlow`            | `Production Log - ChefFlow`     |
| `recipes/production-log/page.tsx`                  | `Global Production Log --` (comment)    | `Global Production Log -`       |
| `recipes/production-log/production-log-client.tsx` | `kitchen -- who made what`              | `kitchen: who made what`        |
| `recipes/sprint/page.tsx`                          | `Recipe Sprint -- Backfill` (comment)   | `Recipe Sprint - Backfill`      |
| `recipes/sprint/page.tsx`                          | `Recipe Sprint -- ChefFlow`             | `Recipe Sprint - ChefFlow`      |
| `recipes/sprint/page.tsx`                          | `recorded -- let's fix`                 | `recorded. Let's fix`           |
| `recipes/sprint/page.tsx`                          | `method text -- you can`                | `method text. You can`          |
| `recipes/[id]/recipe-detail-client.tsx`            | `on-demand -- fetches USDA` (comment)   | `on-demand, fetches USDA`       |
| `recipes/[id]/recipe-detail-client.tsx`            | `on-demand -- uses Edamam` (comment)    | `on-demand, uses Edamam`        |
| `menus/[id]/editor/page.tsx`                       | `menu.name -- ChefFlow`                 | `menu.name - ChefFlow`          |
| `menus/menus-client-wrapper.tsx`                   | ` -- clientName`                        | ` - clientName`                 |
| `menus/[id]/menu-detail-client.tsx`                | `Cocktail Browser --` (comment)         | `Cocktail Browser -`            |
| `staff-login/page.tsx`                             | `Staff Login Page --` (comment)         | `Staff Login Page -`            |
| `opengraph-image.tsx`                              | `ChefFlow -- Ops for Artists`           | `ChefFlow - Ops for Artists`    |

### Production Log Jargon (production-log-client.tsx)

| Old                             | New                             | Why                                  |
| ------------------------------- | ------------------------------- | ------------------------------------ |
| "No production records yet"     | "Nothing logged yet"            | Chef language, not database language |
| "No entries match your filters" | "No batches match your filters" | Chefs think in batches, not entries  |

### Recipe Detail (recipe-detail-client.tsx)

| Old                       | New            | Why                            |
| ------------------------- | -------------- | ------------------------------ |
| "past production entries" | "past batches" | Consistent with production log |

### Sprint Page (sprint/page.tsx)

| Old                           | New                       | Why                          |
| ----------------------------- | ------------------------- | ---------------------------- |
| "Auto-parsing not configured" | "Auto-parsing not set up" | Chef language, not technical |

### Create Recipe (create-recipe-client.tsx)

| Old                              | New                          | Why                          |
| -------------------------------- | ---------------------------- | ---------------------------- |
| "Smart import is not configured" | "Smart import is not set up" | Chef language, not technical |

### Sign Up Page (auth/signup/page.tsx)

| Old                                   | New                                | Why                               |
| ------------------------------------- | ---------------------------------- | --------------------------------- |
| "Manage your chef work, your way"     | "Run your chef business, your way" | Active verb, not vague SaaS-speak |
| "Recommended: create your account..." | "Create your account..."           | Clear path, no hedging            |

### Pricing Page (pricing/page.tsx)

| Old                               | New                             | Why                             |
| --------------------------------- | ------------------------------- | ------------------------------- |
| "Pro for leverage and automation" | "Pro for automation and growth" | "leverage" is consulting jargon |

### Client Relationships Page (client-relationships/page.tsx)

| Old                                      | New                                             | Why                             |
| ---------------------------------------- | ----------------------------------------------- | ------------------------------- |
| "Treat happy clients like network nodes" | "Turn happy clients into your referral network" | Chef language, not graph theory |

## What Was NOT Changed (and Why)

- **BOH/FOH abbreviations**: Every chef knows Back of House and Front of House. These are industry-standard abbreviations, not jargon. Kept as-is.
- **"Components" in menu detail**: Standard culinary term for dish elements. Kept as-is.
- **Admin page em dashes**: Admin pages use `'--'` as data placeholders (empty cell display). Standard convention, not user-facing copy. Lower priority.
- **Sprint comment arrows**: Changed `paste -> AI parse -> save -> next` arrows to `>` since the original used em-dash-like arrows.

## No Database Changes

All changes are UI-only string replacements.

## Files Changed

- `app/(chef)/recipes/ingredients/page.tsx`
- `app/(chef)/recipes/page.tsx`
- `app/(chef)/recipes/production-log/page.tsx`
- `app/(chef)/recipes/production-log/production-log-client.tsx`
- `app/(chef)/recipes/sprint/page.tsx`
- `app/(chef)/recipes/new/create-recipe-client.tsx`
- `app/(chef)/recipes/[id]/recipe-detail-client.tsx`
- `app/(chef)/menus/[id]/editor/page.tsx`
- `app/(chef)/menus/menus-client-wrapper.tsx`
- `app/(chef)/menus/[id]/menu-detail-client.tsx`
- `app/auth/signup/page.tsx`
- `app/(public)/pricing/page.tsx`
- `app/(public)/client-relationships/page.tsx`
- `app/staff-login/page.tsx`
- `app/opengraph-image.tsx`
