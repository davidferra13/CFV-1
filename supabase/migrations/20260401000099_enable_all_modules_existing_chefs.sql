-- Enable all modules for existing chefs who still have the old 6-module defaults.
-- Only upgrades chefs who never customized their modules.
-- Chefs who manually toggled modules on/off are left untouched.

UPDATE chef_preferences
SET enabled_modules = ARRAY[
  'dashboard',
  'pipeline',
  'events',
  'culinary',
  'clients',
  'finance',
  'protection',
  'more',
  'commerce',
  'social-hub',
  'station-ops',
  'operations'
]
WHERE enabled_modules IS NOT NULL
  AND enabled_modules = ARRAY[
    'dashboard',
    'pipeline',
    'events',
    'culinary',
    'clients',
    'finance'
  ];
