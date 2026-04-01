# Research: OpenClaw Refresh Status Operator Patterns

## Origin Context

The developer explicitly asked for docs-only research on how chefs and restaurant purchasing tools deal with changing costs, refresh ambiguity, and pricing trust so the existing OpenClaw refresh-status spec could be improved without building product code.

Cleaned signal from the conversation:

- The current OpenClaw pages make the developer guess when prices should change.
- The ambiguity is operationally annoying because the data is growing, but the UI does not say whether nothing changed or whether the system has not refreshed yet.
- The spec should follow real chef and operator patterns, not invented UX.
- This phase must stay docs-only: improve the spec, do not build code.

## Summary

Restaurant operator tools do not generally solve pricing trust with a promised countdown timer. They solve it with last verified prices, price history, variance alerts, availability status, and explicit source context tied to invoices, vendor feeds, or order guides. Official product material from MarginEdge, Restaurant365, ChefMod, and meez consistently emphasizes "latest price," "previous price," threshold alerts, order-guide availability, and automatically updated costs rather than a hard next-refresh ETA.

Industry material from the National Restaurant Association and chef-facing platforms also shows why that pattern exists: food costs move unevenly, supply availability changes independently from price, and chefs respond by substituting ingredients, changing vendors, or re-costing menus quickly. For OpenClaw, the research-backed conclusion is that the v1 badge should communicate last verified update time, data source, and degraded or unknown states. An exact countdown would over-promise relative to what operator tools and current repo truth can actually support.

## Detailed Findings

### 1. Operator tools anchor trust in the last verified price, not a guessed next refresh

MarginEdge exposes a product's "Latest Price" as the most recent price paid, and allows a manual estimate only until an invoice arrives and replaces it automatically. Its broader product materials also describe inventory prices as always up to date, with reports updated after invoice processing, not on a promised countdown clock.  
Sources: [MarginEdge: Finding and Editing Your Products](https://help.marginedge.com/hc/en-us/articles/360047714754-Finding-and-Editing-Your-Products-in-MarginEdge), [MarginEdge: How it Works](https://www.marginedge.com/how-it-works), [MarginEdge: Automated Invoice Processing](https://www.marginedge.com/automated-invoice)

Restaurant365 similarly ties pricing truth to vendor and order-guide records. Its order-guide integrations update vendor-item price, split price, effective date, price source, and previous price when vendor files are imported.  
Source: [Restaurant365: Order Guides Vendor Integrations](https://docs.restaurant365.com/docs/order-guides-vendor-integrations)

### 2. Alerting and variance thresholds matter more than passive refreshing

MarginEdge lets operators define price thresholds for key items and sends email alerts when invoice prices arrive at unexpected costs. Restaurant365 sends invoice cost variance notifications and highlights contract violations when invoiced prices exceed acceptable thresholds.  
Sources: [MarginEdge: How it Works](https://www.marginedge.com/how-it-works), [Restaurant365: Notifications](https://docs.restaurant365.com/docs/notifications-overview), [Restaurant365: Vendor Contract Price Verification](https://docs.restaurant365.com/docs/vendor-contract-price-verification)

The pattern is consistent: systems are built to tell operators when something changed materially, not to encourage blind manual rechecking.

### 3. Price movement and provenance are first-class operator needs

MarginEdge's Price Movers feature tracks price changes across a selected date range, supports vendor and category views, and lets the operator drill into graphs, orders, and invoice images. Restaurant365's Item Price Verification compares average paid prices across locations, includes contract price, and surfaces low/high variance.  
Sources: [MarginEdge: What is a Price Mover?](https://help.marginedge.com/hc/en-us/articles/217888548-What-is-a-Price-Mover), [Restaurant365: Item Price Verification](https://docs.restaurant365.com/docs/item-price-verification)

That matters for OpenClaw because a chef looking at unchanged numbers is not just asking "when will this refresh?" They are also asking whether the number is still the latest verified number and what source it came from.

### 4. Availability is treated separately from pricing freshness

Restaurant365 order-guide integrations keep regularly updated lists of available items, show available or unavailable status on purchase-order templates, and can swap to alternative vendor items when the original item is unavailable. ChefMod similarly describes instant notifications, standing orders on fixed schedules, price audits, and alerts for changes within supplier ordering workflows.  
Sources: [Restaurant365: Order Guides Vendor Integrations](https://docs.restaurant365.com/docs/order-guides-vendor-integrations), [Restaurant365: Order Guide Sync on Purchase Order Templates](https://docs.restaurant365.com/docs/purchase-orders-order-guide-sync), [ChefMod: Platform Details](https://chefmod.com/platform-details/)

For OpenClaw, this means page-level refresh status should not pretend to answer separate questions like product availability, substitutions, or vendor ordering readiness.

### 5. Under volatility, chefs react with substitutions, vendor changes, and rapid re-costing

The National Restaurant Association describes operators adopting technology because inflation and food costs are major challenges, with inventory systems helping through automated cost updates, reorder alerts, and purchase-order support. Separate Association coverage on beef and chicken costs describes operators changing menu items or introducing alternative proteins when prices rise. meez markets directly to chefs on the same point: live purchasing data keeps recipe costing current automatically, and chefs use it to re-engineer menus when ingredient costs spike.  
Sources: [National Restaurant Association: Operators turn to tech to offset high costs](https://restaurant.org/education-and-resources/resource-library/restaurants-arm-themselves-with-technology-while-grappling-with-inflation/), [National Restaurant Association: Food costs: Beef and chicken are the story of the summer](https://restaurant.org/education-and-resources/resource-library/food-costs-beef-and-chicken-are-the-story-of-the-summer/), [meez: Culinary Leaders](https://www.getmeez.com/culinary-leaders-landing)

This supports a narrow product conclusion: the OpenClaw surface should reduce ambiguity fast enough for a chef to decide whether to wait, reload, compare sources, or move on to an operational response.

### 6. Research-informed inference for OpenClaw

Inference from the sources above: the common operator pattern is "show me the last verified truth, the source, and the exception state" rather than "promise exactly when the next update will occur." The external products surveyed rely on timestamps, previous-price context, alerts, and availability markers. They do not frame operator trust around a single countdown-style refresh badge.

## Gaps

1. Public vendor docs do not expose every UI detail, so this research is strongest on product behavior and data semantics, not exact visual design patterns.
2. None of the surveyed public sources provide a universal refresh-SLA model that would justify a chef-facing countdown in OpenClaw.
3. The current OpenClaw repo still lacks a canonical schedule source of truth, so external research can improve the spec language, but it cannot convert the product into a truthful ETA system by itself.

## Recommendations

1. Require the OpenClaw badge to show an exact last-updated timestamp with clear source labeling, plus a relative helper if desired. Relative time alone is too easy to misread in long-lived tabs.
2. Constrain badge states to trust states such as verified, degraded, and unknown. Do not color-code age as healthy or unhealthy without a verified cadence contract.
3. Keep page-level refresh status separate from item availability, substitutions, and row-level freshness. Those are related operational questions, but they are not the same feature.
4. Prefer truthful wording such as "loads on search or reload," "last scrape," "last local mirror update," and "status unavailable" over marketing language like "always fresh" or "updated every few hours."
5. Keep exact future refresh timing out of scope until OpenClaw has a schedule source of truth in code or config.
6. Future expansion, if the data model grows, should follow the operator-tool pattern of threshold alerts, previous-price comparisons, and provenance rather than a generic countdown.
