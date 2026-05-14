# Discovery Rail Taxonomy

This is the source of truth for the public homepage Discovery Rail, `/eat`, profile persistence, analytics grouping, and future rail expansion.

## Lanes

| Lane              | Purpose                                                                                                       | Discovery value                                                                  | Visibility                                               | Audience                                         | Data and logic                                                                                            | Control model                                                                | Routes and filters                                                                                     | UI behavior                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Taste             | Cuisine, dishes, cravings, dietary, mood, seasonal, and culinary signals.                                     | Helps consumers start from food intent before they know a chef or venue.         | Desktop row 1; first content in mobile composition.      | Public consumers and returning users.            | Static pools in `cuisine-marquee.tsx`, cuisine page mapping, culinary signals, preference scoring.        | Code-owned taxonomy plus future editorial review.                            | `/cuisines/[slug]`, `/chefs?cuisine=`, `/nearby?q=`, `/eat?craving=`, `/ingredients`.                  | Horizontal pill rail with flag/image or icon treatment; personalized order may change, item meaning does not. |
| Occasion          | Service format, event moment, timing, budget, group size, location, and circles.                              | Turns an abstract dining need into an actionable planning path.                  | Desktop row 2; mixed into mobile.                        | Consumers planning meals, hosts, group planners. | Static intent/service pools, location context, planning brief state.                                      | Code-owned defaults, editable through future templates and editorial slots.  | `/eat?intent=`, `/eat?eventStyle=`, `/chefs?serviceType=`, `/hub`, `/hub/open-tables`, `/hub/circles`. | Concise action labels; location labels only appear when user or saved profile provides location.              |
| ChefFlow Picks    | Featured chefs, saved/pinned/recent items, local highlights, stories, surprise items, and public collections. | Gives shortcuts when the user wants curation instead of browsing every category. | Desktop row 3; mobile row is a fast-decision projection. | Public consumers and authenticated users.        | Featured chefs, local storage, authenticated discovery profile, seasonal signals, future editorial slots. | Mixed: user-controlled saved/pinned/hidden state plus admin/editorial slots. | `/chef/[slug]`, `/chefs?sort=featured`, `/eat`, `/ingredients`, approved public info pages.            | Saved and pinned items win over recents; hidden/dismissed items are suppressed.                               |
| Mobile Projection | Fast choice list combining urgent occasion, saved/recent, local, chef, and surprise items.                    | Reduces density on small screens while preserving the three product lanes.       | Mobile only.                                             | Mobile consumers.                                | Derived from Taste, Occasion, and ChefFlow Picks rows after dedupe and scoring.                           | Derived from canonical lanes.                                                | Same contract as source lanes.                                                                         | Desktop rows are hidden on mobile; mobile row is hidden on desktop.                                           |

## Item Types

| Type              | Canonical lane | Current status                | Route family                                       | Empty or fallback rule                                                |
| ----------------- | -------------- | ----------------------------- | -------------------------------------------------- | --------------------------------------------------------------------- |
| `cuisine`         | Taste          | Live                          | `/cuisines`, `/chefs`, `/nearby`                   | Keep broad cuisine routes; do not show local claims without location. |
| `food_type`       | Taste          | Live                          | `/nearby`, `/eat`                                  | Route to nearby search or craving discovery.                          |
| `craving`         | Taste          | Live                          | `/eat`                                             | Fall back to broad `/eat` results.                                    |
| `dietary`         | Taste          | Live where backed by filters  | `/chefs`, `/eat`, `/nearby`                        | Suppress unsupported claims; show only filter-backed tags.            |
| `mood`            | Taste          | Live as intent copy           | `/eat`, `/chefs`, `/nearby`                        | Treat as vibe, not proof.                                             |
| `seasonal`        | Taste          | Live where source is explicit | `/ingredients`, `/eat`, `/nearby`                  | Avoid freshness claims unless modeled.                                |
| `culinary_signal` | Taste          | Live dynamic insert           | `/ingredients`, `/eat`, `/nearby`                  | Hide when no current signal exists.                                   |
| `service`         | Occasion       | Live                          | `/chefs`, `/eat`                                   | Degrade to `/eat` planning context.                                   |
| `occasion`        | Occasion       | Live                          | `/eat`, `/chefs`                                   | Templates may prefill but must remain editable.                       |
| `special_dining`  | Occasion       | Live                          | `/eat`, `/chefs`, public info                      | Avoid private/event-specific claims.                                  |
| `circle`          | Occasion       | Live                          | `/hub`, `/hub/open-tables`, `/hub/circles`, `/eat` | Persist as first-class profile item; no private group IDs.            |
| `location`        | Occasion       | Live dynamic insert           | `/chefs`, `/nearby`, `/eat`                        | Render only with location context.                                    |
| `price`           | Occasion       | Live as filter                | `/eat`, `/chefs`, `/nearby`                        | Label as budget comfort, not exact quote.                             |
| `time`            | Occasion       | Live as filter                | `/eat`, `/chefs`                                   | Availability language must not guarantee a booking slot.              |
| `group_size`      | Occasion       | Live as filter                | `/eat`, `/chefs`                                   | Use headcount for planning fit only.                                  |
| `featured_chef`   | ChefFlow Picks | Live                          | `/chef/[slug]`                                     | Hide if no featured chefs; use editorial fallback.                    |
| `chef_pick`       | ChefFlow Picks | Live                          | `/chef`, `/chefs`, `/eat`                          | Validate route before rendering.                                      |
| `combo`           | ChefFlow Picks | Live                          | `/eat`, `/chefs`, `/nearby`                        | Must combine supported filters only.                                  |
| `story`           | ChefFlow Picks | Live/future editorial         | `/eat`, `/ingredients`, public info                | Do not render empty SEO-thin stories.                                 |
| `surprise`        | ChefFlow Picks | Live                          | `/eat`, `/chefs`                                   | Keep reversible and broad.                                            |
| `technique`       | Taste          | Live                          | `/eat`, `/chefs`                                   | Route to technique filter; do not claim chef mastery without proof.   |
| `ingredient`      | Taste          | Live                          | `/ingredients`, `/eat`                             | Route to ingredient detail or filtered discovery.                     |
| `vibe`            | Occasion       | Live                          | `/eat`, `/chefs`                                   | Atmosphere and experience intent; treat as preference, not guarantee. |
| `saved`           | ChefFlow Picks | Live                          | `/chef`, `/chefs`, `/eat`, `/hub`                  | Saved/pinned/recent dedupe; hidden wins.                              |

## Destination Contract

Allowed public families are `/eat`, `/chefs`, `/nearby`, `/ingredients`, `/cuisines/[slug]`, `/chef/[slug]`, `/hub`, `/hub/open-tables`, `/hub/circles`, and approved public informational pages. Private routes such as admin, invoices, quotes, private recipes, event records, API routes, and client-only pages are invalid for rail items.

Location behavior is route-specific: `/chefs` receives `location`, `lat`, and `lng`; `/nearby` receives `location`, `lat`, and `lon`; `/eat` receives location text only.

## Product Concepts

Saved means durable user interest. Pinned means user-promoted saved interest. Recent means lightweight navigation memory. Shortlisted means an explicit planning candidate inside a planning circle. Discovery saves and pins must not automatically create inquiries, bookings, events, or circles.

## Expansion Governance

Every new category must answer: why it exists, which canonical lane owns it, which public route it powers, which data backs it, who controls it, how success is measured, and when it should be demoted or removed. Use `aggregateDiscoveryAnalytics` and `evaluateDiscoveryPruning` for analytics review, with protected fallbacks for saved, featured chef, and circle items.

Worked example: the seasonal/timely expansion belongs to Taste when it is an ingredient or culinary signal, and Occasion when it is a timing need. It may route to `/ingredients` or `/eat`, but should not claim market freshness unless the source field explicitly supports that claim.
