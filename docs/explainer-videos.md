# Explainer Videos — Remotion Compositions

## Overview

ChefFlow has 12 Remotion compositions (2 existing + 10 new) that explain confusing concepts to users. Each is a 12-second looping animation rendered inline using `@remotion/player` — no video files needed.

## Existing Compositions (do not recreate)

| #   | Composition                 | File                                             | What it explains                           | Used on                                   |
| --- | --------------------------- | ------------------------------------------------ | ------------------------------------------ | ----------------------------------------- |
| 1   | ProductExplainerComposition | `lib/remotion/product-explainer-composition.tsx` | Inquiry → Event → Quote → Payment pipeline | Landing page                              |
| 2   | DataFlowComposition         | `lib/remotion/data-flow-composition.tsx`         | AI privacy — ChefFlow vs cloud AI          | AI privacy settings, Remy hub, onboarding |

## New Compositions (10)

| #   | Composition                | File                                            | What it explains                                      | Best used on                          |
| --- | -------------------------- | ----------------------------------------------- | ----------------------------------------------------- | ------------------------------------- |
| 3   | EventLifecycleComposition  | `lib/remotion/event-lifecycle-composition.tsx`  | 8-state event FSM with triggers                       | Event detail page                     |
| 4   | LedgerExplainerComposition | `lib/remotion/ledger-explainer-composition.tsx` | Append-only ledger, running totals, revenue vs profit | Finance page, event financial summary |
| 5   | MenuHierarchyComposition   | `lib/remotion/menu-hierarchy-composition.tsx`   | Menu → Dish → Component → Recipe nesting              | Menu creation, recipe library         |
| 6   | ClientJourneyComposition   | `lib/remotion/client-journey-composition.tsx`   | What clients see at each step                         | Client portal, onboarding             |
| 7   | TierVsModuleComposition    | `lib/remotion/tier-vs-module-composition.tsx`   | Free/Pro tiers vs module visibility toggles           | Settings > Modules                    |
| 8   | QuoteLifecycleComposition  | `lib/remotion/quote-lifecycle-composition.tsx`  | Quote draft → sent → outcomes + deposits              | Quote creation page                   |
| 9   | MessagingGuideComposition  | `lib/remotion/messaging-guide-composition.tsx`  | 4 messaging channels and when to use each             | Chat/inbox pages                      |
| 10  | EventOpsComposition        | `lib/remotion/event-ops-composition.tsx`        | Staff, temp logs, contingency, modifications          | Event detail Ops tab                  |
| 11  | SeasonalPaletteComposition | `lib/remotion/seasonal-palette-composition.tsx` | Micro-windows, proven wins, creative thesis           | Repertoire settings                   |
| 12  | SettingsRoadmapComposition | `lib/remotion/settings-roadmap-composition.tsx` | Settings priorities (essential → optional)            | Settings main page                    |

## Player Wrappers

All player components live in `components/explainers/` with a barrel export:

```tsx
import { EventLifecyclePlayer } from '@/components/explainers'
```

Each player:

- Is a `'use client'` component
- Renders at 640x400px, 30fps, 12 seconds
- Auto-plays in a loop with no controls
- Has rounded borders and card shadow styling

## How to Integrate

Drop any player into a page or component:

```tsx
import { LedgerExplainerPlayer } from '@/components/explainers'

// In a collapsible "How It Works" section, tooltip, or modal:
;<LedgerExplainerPlayer />
```

## Design Consistency

All compositions follow the same visual language:

- **Brand gradient bar** at top (terracotta `#eda86b → #e88f47 → #d47530`)
- **Font:** Inter (system-ui fallback)
- **Colors:** Brand palette (terracotta), Stone (grays), semantic colors (green/red/blue/amber/purple)
- **Animations:** Remotion `spring()` for entrances, `interpolate()` for fades
- **Structure:** Section title → progress indicator → detail cards with staggered reveals

## Audit Reference

These compositions were created based on a UX clarity audit that identified 23 areas of user confusion. The audit findings are grouped as:

- **Tier 1 (hard to explain):** Event lifecycle, financial model, menu hierarchy, pipeline, AI privacy
- **Tier 2 (confusing terminology):** Revenue vs profit, ledger types, tier vs module, readiness gates, seasonal jargon
- **Tier 3 (flows need explanation):** Client payment flow, messaging channels, auto/manual transitions, quote lifecycle, settings
- **Tier 4 (domain knowledge):** Temp logs, contingency, staff pay, menu modifications, carry-forward
- **Tier 5 (UX friction):** Event detail overload, client labels, public inquiry form
