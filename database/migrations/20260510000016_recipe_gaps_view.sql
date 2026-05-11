-- Recipe Gaps View
-- Surfaces menu components that have no linked recipe yet.
-- Purely additive. No tables modified.
--
-- Use case: prep planning, recipe coverage audits, and Remy nudges.
-- Joins dishes -> menus -> components, with an optional event join for date context.
-- Filters out archived menus and only shows components where recipe_id IS NULL.

CREATE OR REPLACE VIEW recipe_gaps AS
SELECT
  d.id AS dish_id,
  d.name AS dish_name,
  d.menu_id,
  m.name AS menu_name,
  e.id AS event_id,
  e.occasion AS event_title,
  e.event_date,
  c.id AS component_id,
  c.name AS component_name,
  m.tenant_id
FROM dishes d
JOIN menus m ON m.id = d.menu_id
JOIN components c ON c.dish_id = d.id
LEFT JOIN events e ON e.menu_id = d.menu_id
WHERE c.recipe_id IS NULL
  AND m.status != 'archived'
ORDER BY e.event_date ASC NULLS LAST;
