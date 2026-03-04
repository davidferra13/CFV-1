# Research Sources And Design Decisions

This packet structure was built from operational references plus food-safety standards.
All references are used for structure and control points only, not for personal data.

## Sources

1. FDA Food Code (model code for retail food safety)
   - https://www.fda.gov/food/fda-food-code/food-code-2022
2. USDA FSIS guidance on handling takeout and leftovers
   - https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety
   - https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/keep-food-safe-after-takeout
3. FDA major food allergens guidance
   - https://www.fda.gov/food/food-allergies/food-allergies-what-you-need-know
4. Cvent explanation of BEO content and purpose
   - https://www.cvent.com/en/blog/hospitality/what-is-banquet-event-order-better-understanding-beos
5. Tripleseat explanation of BEO as internal operations document
   - https://www.tripleseat.com/blog/what-is-a-beo

## How It Mapped To The Packet

1. Menu sheet includes FOH and BOH sections:
   - Inference from BEO guidance: client-facing service content and internal execution details should be separated but linked.
2. Dietary + allergen matrix is mandatory:
   - Inference from FDA allergen guidance: explicit per-guest allergy controls reduce cross-contact and service errors.
3. Grocery sheet tracks stops, substitutions, and on-hand:
   - Inference from BEO and execution flow: purchasing must trace back to courses/components and include backup items.
4. Prep/service sheet includes run-of-show:
   - Inference from BEO/event-order practice: timing, owner, and sequence are required for reliable execution.
5. Packing sheet is a standalone document:
   - Inference from safe transport guidance: temperature-sensitive food must be separated and controlled in transit.
6. Optional closeout adds food safety, leftovers, and reset:
   - Inference from USDA/FDA safe handling guidance: end-of-service labeling, storage, and cleanup controls are part of safe operations.

## Hard Rules Applied In Templates

1. No personal event data in templates or example JSON.
2. Every row is generic and fillable manually.
3. JSON schema enforces required operational fields.
4. Generator enforces one-page guardrails with truncation warnings.
