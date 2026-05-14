# Spec: Homepage Budget and Price-Fit Discovery Rail Expansion

> **Status:** pending future implementation
> **Queue date:** 2026-05-12
> **Requested date label:** 5/12/26
> **Priority:** P2 after `homepage-discovery-rail-completion-2026-05-12.md`
> **Scope:** budget and price-fit discovery only
> **Implementation note:** Do not implement during the queue-recording pass. This item is for a later build agent.

## Timeline

| Event                                 | Date       | Agent/Session       | Commit |
| ------------------------------------- | ---------- | ------------------- | ------ |
| Queued for future implementation      | 2026-05-12 | Codex queue session |        |
| Status: pending future implementation | 2026-05-12 | Codex queue session |        |

---

## Developer Notes

Budget and price fit should reduce uncertainty without exposing internal costs or making fake price promises.

Intent:

- Help users browse by affordability, value, and premium experience.
- Avoid exact price claims unless backed by public-safe data.
- Keep price context honest and route to existing public surfaces.

---

## What This Does

Create a rail for budget and price-fit discovery:

- budget-friendly
- best value
- group-friendly pricing
- premium experience
- splurge-worthy
- simple drop-off
- under a configured public range when supported
- transparent starting price when public

---

## Price-Fit Classes

- **Budget-sensitive:** budget-friendly, simple, value.
- **Midrange:** balanced, group-friendly, practical premium.
- **Premium:** tasting menu, celebration, fine dining.
- **Transparent:** public starting price, known package, public menu price.
- **Unknown / inquiry-needed:** price requires details.

---

## Homepage Modules

### Value-Oriented

Examples:

- Budget-friendly
- Best value
- Group-friendly
- Simple drop-off

### Premium-Oriented

Examples:

- Splurge-worthy
- Premium private dinner
- Tasting menu
- Celebration-worthy

### Transparent Price

Examples:

- Starting price visible
- Public packages
- Clear price range

### Price Wildcard

Examples:

- Best value nearby
- Splurge pick
- Group-friendly find

---

## Metadata

Recommended fields:

- `name`
- `slug`
- `priceClass`
- `publicPriceAvailable`
- `startingPrice`
- `priceRange`
- `perPersonRange`
- `groupSizeFit`
- `serviceFormatFit`
- `coverageScore`
- `confidenceScore`
- `defaultRoute`
- `defaultQuery`

---

## Slot Model

Example:

- Budget-Friendly
- Best Value
- Group-Friendly
- Starting Price Visible
- Premium Private Dinner
- Splurge-Worthy
- Explore Price Fit

Rules:

- Do not expose internal ingredient costs, margins, labor assumptions, or quote data.
- Do not show exact prices from private data.
- Prefer public package or profile pricing when available.
- Use "price fit" rather than over-promising cheapness.

---

## Routing Rules

- Route to public destinations only.
- Preserve budget/price-fit context.
- No automatic booking, inquiry, quote, event, group, or planning creation.
- No private quotes, invoices, costs, recipes, menus, client data, or event IDs.

---

## Acceptance Criteria

- Rail supports value, midrange, premium, transparent, and inquiry-needed price-fit classes.
- Public copy avoids fake exactness.
- Tests cover public-price gating, route context, no-private-cost boundaries, dedupe, hidden/dismissed behavior, and empty-result handling.

---

## Out Of Scope

- Quote engine changes.
- Costing engine changes.
- New payment or pricing workflows.
