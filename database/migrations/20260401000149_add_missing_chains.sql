-- Add missing chains that have data on the Pi (catalog_stores + current_prices)
-- but no matching entry in openclaw.chains, causing pull.mjs to skip them.
--
-- This unlocks ~180K price points that already exist on the Pi.

INSERT INTO openclaw.chains (slug, name, scraper_type, is_active) VALUES
  ('star_market',           'Star Market',            'instacart', true),
  ('price_chopper',         'Price Chopper',          'instacart', true),
  ('roche_bros',            'Roche Bros',             'instacart', true),
  ('brothers_marketplace',  'Brothers Marketplace',   'instacart', true),
  ('restaurant_depot',      'Restaurant Depot',       'instacart', true),
  ('wegmans',               'Wegmans',                'instacart', true),
  ('kroger',                'Kroger',                 'api',       true),
  ('bigy',                  'Big Y',                  'website',   true),
  ('sams_club',             'Sam''s Club',            'website',   true),
  ('dollar_general',        'Dollar General',         'website',   true),
  ('walgreens',             'Walgreens',              'website',   true),
  ('cvs',                   'CVS',                    'website',   true),
  ('ocean_state',           'Ocean State Job Lot',    'website',   true),
  ('family_dollar',         'Family Dollar',          'website',   true)
ON CONFLICT (slug) DO NOTHING;
