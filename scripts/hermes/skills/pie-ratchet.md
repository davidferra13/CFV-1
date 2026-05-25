# pie-ratchet

Find and fix the highest-ROI coverage gap. Run daily after measure.

## What to do

1. Query ingredient_census for items with zero price observations
2. Group by category. Pick the category with most gaps.
3. For each unpriced item in that category:
   a. Try to find a price from any source (store API, government data, regional average)
   b. If found: insert to ingredient_price_history, log success
   c. If not found: log gap, move to next
4. Stop after 50 items or 5 minutes (whichever first)
5. Log to hermes_actions: how many gaps fixed, which category, duration

## Priority logic

Prefer items that appear in active menus (check hermes_queue for recent menu.created events).
Prefer items in chef's home region (MA) over distant regions.
Prefer volatile categories (produce, seafood) over stable (dry goods).
