-- Add every major US grocery chain for nationwide price coverage.
-- A chef anywhere in America must be able to look up prices at their local stores.
--
-- Grouped by region and type:
--   Southeast, Mid-Atlantic, Midwest, South, West, National, Wholesale, Specialty

INSERT INTO openclaw.chains (slug, name, scraper_type, is_active) VALUES
  -- Southeast / Carolinas
  ('harris_teeter',         'Harris Teeter',           'instacart', true),
  ('ingles',                'Ingles Markets',          'instacart', true),
  ('lowes_foods',           'Lowe''s Foods',           'instacart', true),
  ('food_lion',             'Food Lion',               'instacart', true),
  ('publix',                'Publix',                  'instacart', true),
  ('piggly_wiggly',         'Piggly Wiggly',           'instacart', true),
  ('bi_lo',                 'BI-LO',                   'instacart', true),
  ('winn_dixie',            'Winn-Dixie',              'instacart', true),
  ('harveys',               'Harvey''s Supermarket',   'instacart', true),
  ('earth_fare',            'Earth Fare',              'instacart', true),

  -- Mid-Atlantic / Northeast (beyond existing NE chains)
  ('giant_food',            'Giant Food',              'instacart', true),
  ('giant_eagle',           'Giant Eagle',             'instacart', true),
  ('shoprite',              'ShopRite',                'instacart', true),
  ('acme',                  'ACME Markets',            'instacart', true),
  ('wegmans',               'Wegmans',                 'instacart', true),
  ('food_bazaar',           'Food Bazaar',             'instacart', true),
  ('foodtown',              'Foodtown',                'instacart', true),
  ('key_food',              'Key Food',                'instacart', true),

  -- Midwest
  ('meijer',                'Meijer',                  'instacart', true),
  ('hy_vee',                'Hy-Vee',                  'instacart', true),
  ('jewel_osco',            'Jewel-Osco',              'instacart', true),
  ('schnucks',              'Schnucks',                'instacart', true),
  ('woodmans',              'Woodman''s',              'instacart', true),
  ('festival_foods',        'Festival Foods',          'instacart', true),
  ('cub_foods',             'Cub Foods',               'instacart', true),
  ('hyvee',                 'Hy-Vee',                  'instacart', true),
  ('fresh_thyme',           'Fresh Thyme',             'instacart', true),
  ('market_district',       'Market District',         'instacart', true),

  -- South / Southwest
  ('heb',                   'H-E-B',                   'instacart', true),
  ('central_market',        'Central Market',          'instacart', true),
  ('brookshires',           'Brookshire''s',           'instacart', true),
  ('randalls',              'Randalls',                'instacart', true),
  ('tom_thumb',             'Tom Thumb',               'instacart', true),

  -- West
  ('safeway',               'Safeway',                 'instacart', true),
  ('vons',                  'Vons',                    'instacart', true),
  ('albertsons',            'Albertsons',              'instacart', true),
  ('ralphs',                'Ralphs',                  'instacart', true),
  ('fred_meyer',            'Fred Meyer',              'instacart', true),
  ('qfc',                   'QFC',                     'instacart', true),
  ('winco',                 'WinCo Foods',             'instacart', true),
  ('sprouts',               'Sprouts Farmers Market',  'instacart', true),
  ('stater_bros',           'Stater Bros',             'instacart', true),
  ('smart_and_final',       'Smart & Final',           'instacart', true),
  ('grocery_outlet',        'Grocery Outlet',          'instacart', true),
  ('raley',                 'Raley''s',                'instacart', true),
  ('save_mart',             'Save Mart',               'instacart', true),

  -- National (fill gaps for chains not yet in DB)
  ('the_fresh_market',      'The Fresh Market',        'instacart', true),
  ('fresh_market',          'Fresh Market',            'instacart', true),
  ('food_city',             'Food City',               'instacart', true),
  ('price_rite',            'Price Rite',              'instacart', true),
  ('eataly',                'Eataly',                  'instacart', true),
  ('lidl',                  'Lidl',                    'instacart', true),

  -- Wholesale / Foodservice
  ('us_foods',              'US Foods / ChefStore',    'api',       true),
  ('sysco',                 'Sysco',                   'api',       true),
  ('restaurant_depot',      'Restaurant Depot',        'instacart', true),
  ('gfs',                   'Gordon Food Service',     'api',       true),
  ('chefstore',             'ChefStore (US Foods)',    'api',       true),

  -- International / Specialty
  ('super_g_mart',          'Super G Mart',            'manual',    true),
  ('hmart',                 'H Mart',                  'instacart', true),
  ('99_ranch',              '99 Ranch Market',         'instacart', true),
  ('mitsuwa',               'Mitsuwa Marketplace',     'instacart', true),
  ('patel_brothers',        'Patel Brothers',          'instacart', true),

  -- More regional fills
  ('stop_and_shop',         'Stop & Shop',             'instacart', true),
  ('market_basket',         'Market Basket',           'instacart', true),
  ('shaws',                 'Shaw''s',                 'instacart', true),
  ('hannaford',             'Hannaford',               'instacart', true),
  ('star_market',           'Star Market',             'instacart', true),
  ('price_chopper',         'Price Chopper',           'instacart', true),
  ('whole_foods',           'Whole Foods',             'instacart', true),
  ('aldi',                  'Aldi',                    'instacart', true),
  ('kroger',                'Kroger',                  'instacart', true),
  ('walmart',               'Walmart',                 'api',       true),
  ('target',                'Target',                  'api',       true),
  ('costco',                'Costco',                  'website',   true),
  ('bjs',                   'BJ''s Wholesale',         'website',   true),
  ('trader_joes',           'Trader Joe''s',           'graphql',   true),
  ('sams_club',             'Sam''s Club',             'website',   true)
ON CONFLICT (slug) DO NOTHING;
