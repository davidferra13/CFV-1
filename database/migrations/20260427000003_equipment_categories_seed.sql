-- Seed: equipment_categories (two-level hierarchy) and equipment_aliases
-- System-managed data, no tenant scope.

-- ============================================
-- TOP-LEVEL CATEGORIES
-- ============================================

INSERT INTO equipment_categories (slug, name, sort_order, icon) VALUES
  ('cookware',          'Cookware',             1, 'cooking-pot'),
  ('bakeware',          'Bakeware',             2, 'cake'),
  ('knives-cutting',    'Knives & Cutting',     3, 'knife'),
  ('small-appliances',  'Small Appliances',     4, 'plug'),
  ('prep-tools',        'Prep Tools',           5, 'utensils'),
  ('storage-transport', 'Storage & Transport',  6, 'truck'),
  ('serving',           'Serving',              7, 'concierge-bell'),
  ('linens-consumables','Linens & Consumables', 8, 'shirt')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SUBCATEGORIES
-- ============================================

-- Cookware subs
INSERT INTO equipment_categories (slug, name, parent_id, sort_order) VALUES
  ('saute-pans',    'Saute Pans',    (SELECT id FROM equipment_categories WHERE slug = 'cookware'), 1),
  ('saucepans',     'Saucepans',     (SELECT id FROM equipment_categories WHERE slug = 'cookware'), 2),
  ('stockpots',     'Stockpots',     (SELECT id FROM equipment_categories WHERE slug = 'cookware'), 3),
  ('skillets',      'Skillets',      (SELECT id FROM equipment_categories WHERE slug = 'cookware'), 4),
  ('woks',          'Woks',          (SELECT id FROM equipment_categories WHERE slug = 'cookware'), 5),
  ('roasting-pans', 'Roasting Pans', (SELECT id FROM equipment_categories WHERE slug = 'cookware'), 6),
  ('dutch-ovens',   'Dutch Ovens',   (SELECT id FROM equipment_categories WHERE slug = 'cookware'), 7)
ON CONFLICT (slug) DO NOTHING;

-- Bakeware subs
INSERT INTO equipment_categories (slug, name, parent_id, sort_order) VALUES
  ('sheet-trays',   'Sheet Trays',   (SELECT id FROM equipment_categories WHERE slug = 'bakeware'), 1),
  ('cake-pans',     'Cake Pans',     (SELECT id FROM equipment_categories WHERE slug = 'bakeware'), 2),
  ('muffin-tins',   'Muffin Tins',   (SELECT id FROM equipment_categories WHERE slug = 'bakeware'), 3),
  ('pie-dishes',    'Pie Dishes',    (SELECT id FROM equipment_categories WHERE slug = 'bakeware'), 4),
  ('loaf-pans',     'Loaf Pans',     (SELECT id FROM equipment_categories WHERE slug = 'bakeware'), 5),
  ('cooling-racks', 'Cooling Racks', (SELECT id FROM equipment_categories WHERE slug = 'bakeware'), 6)
ON CONFLICT (slug) DO NOTHING;

-- Knives & Cutting subs
INSERT INTO equipment_categories (slug, name, parent_id, sort_order) VALUES
  ('chefs-knives',  'Chef''s Knives',  (SELECT id FROM equipment_categories WHERE slug = 'knives-cutting'), 1),
  ('paring-knives', 'Paring Knives',   (SELECT id FROM equipment_categories WHERE slug = 'knives-cutting'), 2),
  ('bread-knives',  'Bread Knives',    (SELECT id FROM equipment_categories WHERE slug = 'knives-cutting'), 3),
  ('cleavers',      'Cleavers',        (SELECT id FROM equipment_categories WHERE slug = 'knives-cutting'), 4),
  ('cutting-boards','Cutting Boards',  (SELECT id FROM equipment_categories WHERE slug = 'knives-cutting'), 5),
  ('sharpening',    'Sharpening',      (SELECT id FROM equipment_categories WHERE slug = 'knives-cutting'), 6)
ON CONFLICT (slug) DO NOTHING;

-- Small Appliances subs
INSERT INTO equipment_categories (slug, name, parent_id, sort_order) VALUES
  ('immersion-circulators', 'Immersion Circulators', (SELECT id FROM equipment_categories WHERE slug = 'small-appliances'), 1),
  ('stand-mixers',          'Stand Mixers',          (SELECT id FROM equipment_categories WHERE slug = 'small-appliances'), 2),
  ('food-processors',       'Food Processors',       (SELECT id FROM equipment_categories WHERE slug = 'small-appliances'), 3),
  ('blenders',              'Blenders',              (SELECT id FROM equipment_categories WHERE slug = 'small-appliances'), 4),
  ('torches',               'Torches',               (SELECT id FROM equipment_categories WHERE slug = 'small-appliances'), 5),
  ('scales',                'Scales',                (SELECT id FROM equipment_categories WHERE slug = 'small-appliances'), 6)
ON CONFLICT (slug) DO NOTHING;

-- Prep Tools subs
INSERT INTO equipment_categories (slug, name, parent_id, sort_order) VALUES
  ('mixing-bowls',   'Mixing Bowls',   (SELECT id FROM equipment_categories WHERE slug = 'prep-tools'), 1),
  ('whisks',         'Whisks',         (SELECT id FROM equipment_categories WHERE slug = 'prep-tools'), 2),
  ('tongs',          'Tongs',          (SELECT id FROM equipment_categories WHERE slug = 'prep-tools'), 3),
  ('spatulas',       'Spatulas',       (SELECT id FROM equipment_categories WHERE slug = 'prep-tools'), 4),
  ('ladles',         'Ladles',         (SELECT id FROM equipment_categories WHERE slug = 'prep-tools'), 5),
  ('mandolines',     'Mandolines',     (SELECT id FROM equipment_categories WHERE slug = 'prep-tools'), 6),
  ('thermometers',   'Thermometers',   (SELECT id FROM equipment_categories WHERE slug = 'prep-tools'), 7)
ON CONFLICT (slug) DO NOTHING;

-- Storage & Transport subs
INSERT INTO equipment_categories (slug, name, parent_id, sort_order) VALUES
  ('hotel-pans',        'Hotel Pans',          (SELECT id FROM equipment_categories WHERE slug = 'storage-transport'), 1),
  ('cambros',           'Cambros',             (SELECT id FROM equipment_categories WHERE slug = 'storage-transport'), 2),
  ('lexans',            'Lexans',              (SELECT id FROM equipment_categories WHERE slug = 'storage-transport'), 3),
  ('vacuum-sealer-bags','Vacuum Sealer Bags',  (SELECT id FROM equipment_categories WHERE slug = 'storage-transport'), 4),
  ('sheet-tray-racks',  'Sheet Tray Racks',    (SELECT id FROM equipment_categories WHERE slug = 'storage-transport'), 5)
ON CONFLICT (slug) DO NOTHING;

-- Serving subs
INSERT INTO equipment_categories (slug, name, parent_id, sort_order) VALUES
  ('platters',       'Platters',        (SELECT id FROM equipment_categories WHERE slug = 'serving'), 1),
  ('chafing-dishes', 'Chafing Dishes',  (SELECT id FROM equipment_categories WHERE slug = 'serving'), 2),
  ('tasting-spoons', 'Tasting Spoons',  (SELECT id FROM equipment_categories WHERE slug = 'serving'), 3),
  ('garnish-tools',  'Garnish Tools',   (SELECT id FROM equipment_categories WHERE slug = 'serving'), 4)
ON CONFLICT (slug) DO NOTHING;

-- Linens & Consumables subs
INSERT INTO equipment_categories (slug, name, parent_id, sort_order) VALUES
  ('towels',          'Towels',          (SELECT id FROM equipment_categories WHERE slug = 'linens-consumables'), 1),
  ('aprons',          'Aprons',          (SELECT id FROM equipment_categories WHERE slug = 'linens-consumables'), 2),
  ('gloves',          'Gloves',          (SELECT id FROM equipment_categories WHERE slug = 'linens-consumables'), 3),
  ('parchment-wrap',  'Parchment & Wrap',(SELECT id FROM equipment_categories WHERE slug = 'linens-consumables'), 4)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- EQUIPMENT ALIASES (common synonyms)
-- ============================================

INSERT INTO equipment_aliases (alias, category_id, canonical_name) VALUES
  ('sheet pan',        (SELECT id FROM equipment_categories WHERE slug = 'sheet-trays'),           'Sheet Tray'),
  ('baking sheet',     (SELECT id FROM equipment_categories WHERE slug = 'sheet-trays'),           'Sheet Tray'),
  ('cookie sheet',     (SELECT id FROM equipment_categories WHERE slug = 'sheet-trays'),           'Sheet Tray'),
  ('half sheet',       (SELECT id FROM equipment_categories WHERE slug = 'sheet-trays'),           'Half Sheet Tray'),
  ('full sheet',       (SELECT id FROM equipment_categories WHERE slug = 'sheet-trays'),           'Full Sheet Tray'),
  ('quarter sheet',    (SELECT id FROM equipment_categories WHERE slug = 'sheet-trays'),           'Quarter Sheet Tray'),
  ('sous vide',        (SELECT id FROM equipment_categories WHERE slug = 'immersion-circulators'), 'Immersion Circulator'),
  ('circulator',       (SELECT id FROM equipment_categories WHERE slug = 'immersion-circulators'), 'Immersion Circulator'),
  ('anova',            (SELECT id FROM equipment_categories WHERE slug = 'immersion-circulators'), 'Immersion Circulator'),
  ('joule',            (SELECT id FROM equipment_categories WHERE slug = 'immersion-circulators'), 'Immersion Circulator'),
  ('fry pan',          (SELECT id FROM equipment_categories WHERE slug = 'skillets'),              'Skillet'),
  ('skillet',          (SELECT id FROM equipment_categories WHERE slug = 'skillets'),              'Skillet'),
  ('frying pan',       (SELECT id FROM equipment_categories WHERE slug = 'skillets'),              'Skillet'),
  ('cambro',           (SELECT id FROM equipment_categories WHERE slug = 'cambros'),               'Insulated Carrier'),
  ('hot box',          (SELECT id FROM equipment_categories WHERE slug = 'cambros'),               'Insulated Carrier'),
  ('chinois',          (SELECT id FROM equipment_categories WHERE slug = 'prep-tools'),            'Fine Mesh Strainer'),
  ('china cap',        (SELECT id FROM equipment_categories WHERE slug = 'prep-tools'),            'Fine Mesh Strainer'),
  ('tamis',            (SELECT id FROM equipment_categories WHERE slug = 'prep-tools'),            'Drum Sieve'),
  ('kitchenaid',       (SELECT id FROM equipment_categories WHERE slug = 'stand-mixers'),          'Stand Mixer'),
  ('stand mixer',      (SELECT id FROM equipment_categories WHERE slug = 'stand-mixers'),          'Stand Mixer'),
  ('vitamix',          (SELECT id FROM equipment_categories WHERE slug = 'blenders'),              'Blender'),
  ('immersion blender',(SELECT id FROM equipment_categories WHERE slug = 'blenders'),              'Immersion Blender'),
  ('stick blender',    (SELECT id FROM equipment_categories WHERE slug = 'blenders'),              'Immersion Blender'),
  ('hand blender',     (SELECT id FROM equipment_categories WHERE slug = 'blenders'),              'Immersion Blender'),
  ('food processor',   (SELECT id FROM equipment_categories WHERE slug = 'food-processors'),       'Food Processor'),
  ('cuisinart',        (SELECT id FROM equipment_categories WHERE slug = 'food-processors'),       'Food Processor'),
  ('robot coupe',      (SELECT id FROM equipment_categories WHERE slug = 'food-processors'),       'Food Processor'),
  ('torch',            (SELECT id FROM equipment_categories WHERE slug = 'torches'),               'Kitchen Torch'),
  ('brulee torch',     (SELECT id FROM equipment_categories WHERE slug = 'torches'),               'Kitchen Torch'),
  ('creme brulee torch',(SELECT id FROM equipment_categories WHERE slug = 'torches'),              'Kitchen Torch'),
  ('dutch oven',       (SELECT id FROM equipment_categories WHERE slug = 'dutch-ovens'),           'Dutch Oven'),
  ('le creuset',       (SELECT id FROM equipment_categories WHERE slug = 'dutch-ovens'),           'Dutch Oven'),
  ('braiser',          (SELECT id FROM equipment_categories WHERE slug = 'dutch-ovens'),           'Braiser'),
  ('mandoline',        (SELECT id FROM equipment_categories WHERE slug = 'mandolines'),            'Mandoline'),
  ('mandolin',         (SELECT id FROM equipment_categories WHERE slug = 'mandolines'),            'Mandoline'),
  ('slicer',           (SELECT id FROM equipment_categories WHERE slug = 'mandolines'),            'Mandoline'),
  ('chafing dish',     (SELECT id FROM equipment_categories WHERE slug = 'chafing-dishes'),        'Chafing Dish'),
  ('sterno setup',     (SELECT id FROM equipment_categories WHERE slug = 'chafing-dishes'),        'Chafing Dish'),
  ('hotel pan',        (SELECT id FROM equipment_categories WHERE slug = 'hotel-pans'),            'Hotel Pan'),
  ('steam table pan',  (SELECT id FROM equipment_categories WHERE slug = 'hotel-pans'),            'Hotel Pan'),
  ('lexan',            (SELECT id FROM equipment_categories WHERE slug = 'lexans'),                'Food Storage Container'),
  ('cambro container', (SELECT id FROM equipment_categories WHERE slug = 'lexans'),                'Food Storage Container'),
  ('vacuum sealer',    (SELECT id FROM equipment_categories WHERE slug = 'vacuum-sealer-bags'),    'Vacuum Sealer'),
  ('foodsaver',        (SELECT id FROM equipment_categories WHERE slug = 'vacuum-sealer-bags'),    'Vacuum Sealer'),
  ('thermometer',      (SELECT id FROM equipment_categories WHERE slug = 'thermometers'),          'Instant-Read Thermometer'),
  ('thermapen',        (SELECT id FROM equipment_categories WHERE slug = 'thermometers'),          'Instant-Read Thermometer'),
  ('probe thermometer',(SELECT id FROM equipment_categories WHERE slug = 'thermometers'),          'Probe Thermometer'),
  ('meat thermometer', (SELECT id FROM equipment_categories WHERE slug = 'thermometers'),          'Probe Thermometer'),
  ('digital scale',    (SELECT id FROM equipment_categories WHERE slug = 'scales'),                'Digital Scale'),
  ('kitchen scale',    (SELECT id FROM equipment_categories WHERE slug = 'scales'),                'Digital Scale')
ON CONFLICT (alias) DO NOTHING;
