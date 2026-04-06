-- Remaining chains to reach ~200 total.
-- Additional Kroger banners, regionals, ethnic, wholesale, discount, co-ops.

INSERT INTO openclaw.chains (slug, name, scraper_type, is_active) VALUES
  -- Additional Kroger
  ('foods_co',            'Foods Co',                  'instacart', true),
  ('metro_market',        'Metro Market',              'instacart', true),
  ('owens',               'Owen''s',                   'instacart', true),

  -- Southeast
  ('save_a_lot',          'Save-A-Lot',                'instacart', true),
  ('food_depot',          'Food Depot',                'instacart', true),
  ('grocery_depot',       'Grocery Depot',             'instacart', true),
  ('bravo',               'Bravo Supermarkets',        'instacart', true),
  ('presidente',          'Presidente Supermarkets',   'instacart', true),
  ('lucky_ca',            'Lucky California',          'instacart', true),

  -- Northeast / Mid-Atlantic
  ('market_32',           'Market 32',                 'instacart', true),
  ('uncle_giuseppes',     'Uncle Giuseppe''s',         'instacart', true),
  ('fairway',             'Fairway Market',            'instacart', true),
  ('morton_williams',     'Morton Williams',           'instacart', true),
  ('westside_market',     'Westside Market',           'instacart', true),
  ('deciccos',            'DeCicco''s',                'instacart', true),
  ('balducci',            'Balducci''s',               'instacart', true),
  ('kings_food',          'Kings Food Markets',        'instacart', true),
  ('food_emporium',       'Food Emporium',             'instacart', true),
  ('ctown',               'C-Town',                    'instacart', true),
  ('western_beef',        'Western Beef',              'instacart', true),
  ('associated',          'Associated Supermarkets',   'instacart', true),
  ('pathmark',            'Pathmark',                  'instacart', true),
  ('redner',              'Redner''s Markets',         'instacart', true),
  ('karns',               'Karns Foods',               'instacart', true),

  -- Midwest
  ('county_market',       'County Market',             'instacart', true),
  ('martins_super',       'Martin''s Super Markets',   'instacart', true),
  ('spartan_nash',        'SpartanNash',               'instacart', true),
  ('piggly_wiggly_mw',    'Piggly Wiggly (Midwest)',   'instacart', true),
  ('sentry',              'Sentry Foods',              'instacart', true),
  ('roundys',             'Roundy''s',                 'instacart', true),
  ('buehlers',            'Buehler''s',                'instacart', true),
  ('marcs',               'Marc''s',                   'instacart', true),
  ('jungle_jims',         'Jungle Jim''s',             'instacart', true),
  ('dorothy_lane',        'Dorothy Lane Market',       'instacart', true),
  ('lunds_byerlys',       'Lunds & Byerlys',          'instacart', true),
  ('kowalskis',           'Kowalski''s',               'instacart', true),

  -- South / Texas
  ('food_town_tx',        'Food Town (TX)',            'instacart', true),
  ('la_michoacana',       'La Michoacana',             'instacart', true),
  ('ranch_market',        'Ranch Market',              'instacart', true),
  ('el_rancho',           'El Rancho Supermercado',    'instacart', true),
  ('market_street',       'Market Street',             'instacart', true),
  ('amigos',              'Amigos',                    'instacart', true),
  ('specs',               'Spec''s',                   'instacart', true),

  -- West Coast
  ('lazy_acres',          'Lazy Acres',                'instacart', true),
  ('erewhon',             'Erewhon',                   'instacart', true),
  ('nugget_markets',      'Nugget Markets',            'instacart', true),
  ('super_king',          'Super King Markets',        'instacart', true),
  ('jons',                'Jon''s Fresh Marketplace',  'instacart', true),
  ('super_a_foods',       'Super A Foods',             'instacart', true),
  ('metropolitan_market', 'Metropolitan Market',       'instacart', true),
  ('town_country',        'Town & Country Markets',    'instacart', true),
  ('central_coop',        'Central Co-op',             'instacart', true),
  ('market_of_choice',    'Market of Choice',          'instacart', true),

  -- Mountain / Plains
  ('harmons',             'Harmons',                   'instacart', true),
  ('maceys',              'Macey''s',                  'instacart', true),
  ('lins',                'Lin''s',                    'instacart', true),
  ('ridleys',             'Ridley''s',                 'instacart', true),
  ('rosauers',            'Rosauers',                  'instacart', true),
  ('super_1_foods',       'Super 1 Foods',             'instacart', true),
  ('yokes',               'Yoke''s Fresh Market',      'instacart', true),

  -- International / Ethnic
  ('great_wall',          'Great Wall Supermarket',    'instacart', true),
  ('good_fortune',        'Good Fortune Supermarket',  'instacart', true),
  ('hana_world',          'Hana World Market',         'instacart', true),
  ('kam_man',             'Kam Man Food',              'instacart', true),
  ('apna_bazaar',         'Apna Bazaar',               'instacart', true),
  ('intl_fresh',          'International Fresh Market', 'instacart', true),
  ('la_bodega',           'La Bodega',                 'instacart', true),
  ('el_ahorro',           'El Ahorro Supermarket',     'instacart', true),
  ('market_168',          '168 Market',                'instacart', true),

  -- Wholesale
  ('jetro',               'Jetro Cash & Carry',        'api',       true),
  ('chefs_warehouse',     'Chef''s Warehouse',         'api',       true),
  ('performance_food',    'Performance Food Group',    'api',       true),

  -- Natural / Organic
  ('mom_organic',         'MOM''s Organic Market',     'instacart', true),
  ('lucky_market',        'Lucky''s Market',           'instacart', true),
  ('fresh_fields',        'Fresh Fields',              'instacart', true),

  -- Discount
  ('five_below',          'Five Below',                'website',   true),
  ('sharp_shopper',       'Sharp Shopper',             'instacart', true),
  ('ollies',              'Ollie''s Bargain Outlet',   'instacart', true)
ON CONFLICT (slug) DO NOTHING;
