# Client Dietary Pre-population

## What Changed

Added automatic dietary info pre-population when a chef views or creates quotes, events, or menus for an existing client.

## New Files

- `lib/clients/dietary-context-actions.ts` - Server action that fetches all dietary info for a client (allergies, restrictions, dislikes, spice tolerance, favorite cuisines/dishes, dietary protocols, beverage preferences, and past event dietary notes).
- `components/clients/client-dietary-banner.tsx` - Collapsible banner showing a client's dietary profile. Uses color-coded badges: red/error for allergies (always visible), amber/warning for restrictions and protocols, blue/info for dislikes, default for favorites. Auto-expands when allergies exist.
- `components/clients/client-menu-history-banner.tsx` - Collapsible banner showing past menus served to a client (powered by existing `lib/clients/menu-history.ts`). Shows top served components, cuisines used, and recent event menu details. Helps chefs avoid repeating dishes.

## Integration Points

| Page         | File                                      | What Shows                                                                   |
| ------------ | ----------------------------------------- | ---------------------------------------------------------------------------- |
| New Quote    | `components/quotes/quote-form.tsx`        | Both dietary banner and menu history banner appear when a client is selected |
| Edit Quote   | `app/(chef)/quotes/[id]/edit/page.tsx`    | Same as new quote (client_id now passed as prefilledClientId)                |
| Quote Detail | `app/(chef)/quotes/[id]/page.tsx`         | Dietary banner shows below header                                            |
| Event Detail | `app/(chef)/events/[id]/page.tsx`         | Dietary banner shows after intelligence panel                                |
| Menu Detail  | `app/(chef)/culinary/menus/[id]/page.tsx` | Dietary banner shows when menu is linked to an event with a client           |

## Data Sources

All dietary data comes from the `clients` table columns:

- `dietary_restrictions` (string array)
- `allergies` (string array)
- `dislikes` (string array)
- `spice_tolerance` (enum: none, mild, medium, hot, very_hot)
- `favorite_cuisines` (string array)
- `favorite_dishes` (string array)
- `dietary_protocols` (string array)
- `wine_beverage_preferences` (text)

Past event dietary notes come from the `events` table where `client_id` matches.

## Error Handling

- If the fetch fails, a red error card is shown ("Could not load dietary info"). Never substitutes empty/fake data.
- If the client has no dietary info at all, the banner is hidden entirely (not empty).
- Loading state shows a skeleton pulse animation.
