-- Complete nationwide chain coverage.
-- Every grocery chain a chef in America could walk into.
-- Organized by parent company, then independent regionals, then specialty.
--
-- This is additive (ON CONFLICT DO NOTHING). Safe to run on top of existing data.

-- ══════════════════════════════════════════════════════════════════════
-- KROGER FAMILY (28 banners, #1 grocery company in America)
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO openclaw.chains (slug, name, scraper_type, is_active) VALUES
  ('kroger',            'Kroger',              'instacart', true),
  ('frys_food',         'Fry''s Food',         'instacart', true),
  ('king_soopers',      'King Soopers',        'instacart', true),
  ('smiths',            'Smith''s',            'instacart', true),
  ('dillons',           'Dillons',             'instacart', true),
  ('marianos',          'Mariano''s',          'instacart', true),
  ('pick_n_save',       'Pick ''n Save',       'instacart', true),
  ('metro_market',      'Metro Market',        'instacart', true),
  ('food_4_less',       'Food 4 Less',         'instacart', true),
  ('foods_co',          'Foods Co',            'instacart', true),
  ('city_market',       'City Market',         'instacart', true),
  ('bakers',            'Baker''s',            'instacart', true),
  ('ruler_foods',       'Ruler Foods',         'instacart', true),
  ('gerbes',            'Gerbes',              'instacart', true),
  ('jay_c',             'Jay C',               'instacart', true),
  ('pay_less',          'Pay Less',            'instacart', true),
  ('owens',             'Owen''s',             'instacart', true),
  ('qfc',               'QFC',                 'instacart', true),
  ('fred_meyer',        'Fred Meyer',          'instacart', true),
  ('harris_teeter',     'Harris Teeter',       'instacart', true)
ON CONFLICT (slug) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════
-- ALBERTSONS COMPANIES (20+ banners, #2 traditional grocery)
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO openclaw.chains (slug, name, scraper_type, is_active) VALUES
  ('albertsons',        'Albertsons',          'instacart', true),
  ('safeway',           'Safeway',             'instacart', true),
  ('vons',              'Vons',                'instacart', true),
  ('pavilions',         'Pavilions',           'instacart', true),
  ('jewel_osco',        'Jewel-Osco',          'instacart', true),
  ('shaws',             'Shaw''s',             'instacart', true),
  ('acme',              'ACME Markets',        'instacart', true),
  ('star_market',       'Star Market',         'instacart', true),
  ('tom_thumb',         'Tom Thumb',           'instacart', true),
  ('randalls',          'Randalls',            'instacart', true),
  ('carrs',             'Carrs',               'instacart', true),
  ('haggen',            'Haggen',              'instacart', true),
  ('united_supermarkets','United Supermarkets', 'instacart', true)
ON CONFLICT (slug) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════
-- AHOLD DELHAIZE (East Coast dominant)
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO openclaw.chains (slug, name, scraper_type, is_active) VALUES
  ('stop_and_shop',     'Stop & Shop',         'instacart', true),
  ('giant_food',        'Giant Food',          'instacart', true),
  ('giant_martins',     'Giant / Martin''s',   'instacart', true),
  ('food_lion',         'Food Lion',           'instacart', true),
  ('hannaford',         'Hannaford',           'instacart', true)
ON CONFLICT (slug) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════
-- SOUTHEASTERN GROCERS
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO openclaw.chains (slug, name, scraper_type, is_active) VALUES
  ('winn_dixie',        'Winn-Dixie',          'instacart', true),
  ('harveys',           'Harvey''s Supermarket','instacart', true),
  ('fresco_y_mas',      'Fresco y Más',        'instacart', true)
ON CONFLICT (slug) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════
-- MAJOR INDEPENDENTS & REGIONALS (alphabetical by region)
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO openclaw.chains (slug, name, scraper_type, is_active) VALUES
  -- National / multi-region
  ('aldi',              'Aldi',                'instacart', true),
  ('whole_foods',       'Whole Foods',         'instacart', true),
  ('walmart',           'Walmart',             'api',       true),
  ('target',            'Target',              'api',       true),
  ('trader_joes',       'Trader Joe''s',       'api',       true),
  ('lidl',              'Lidl',                'instacart', true),
  ('sprouts',           'Sprouts Farmers Market','instacart', true),
  ('natural_grocers',   'Natural Grocers',     'instacart', true),
  ('the_fresh_market',  'The Fresh Market',    'instacart', true),
  ('earth_fare',        'Earth Fare',          'instacart', true),

  -- Northeast
  ('market_basket',     'Market Basket',       'instacart', true),
  ('price_chopper',     'Price Chopper',       'instacart', true),
  ('tops_markets',      'Tops Markets',        'instacart', true),
  ('wegmans',           'Wegmans',             'instacart', true),
  ('shoprite',          'ShopRite',            'instacart', true),
  ('price_rite',        'Price Rite',          'instacart', true),
  ('weis_markets',      'Weis Markets',        'instacart', true),
  ('key_food',          'Key Food',            'instacart', true),
  ('foodtown',          'Foodtown',            'instacart', true),
  ('food_bazaar',       'Food Bazaar',         'instacart', true),
  ('stew_leonards',     'Stew Leonard''s',     'instacart', true),
  ('big_y',             'Big Y',               'instacart', true),
  ('roche_bros',        'Roche Bros',          'instacart', true),
  ('brothers_marketplace','Brothers Marketplace','instacart', true),

  -- Mid-Atlantic
  ('giant_eagle',       'Giant Eagle',         'instacart', true),
  ('market_district',   'Market District',     'instacart', true),

  -- Southeast
  ('publix',            'Publix',              'instacart', true),
  ('ingles',            'Ingles Markets',      'instacart', true),
  ('lowes_foods',       'Lowe''s Foods',       'instacart', true),
  ('piggly_wiggly',     'Piggly Wiggly',       'instacart', true),
  ('bi_lo',             'BI-LO',               'instacart', true),
  ('food_city',         'Food City',           'instacart', true),
  ('compare_foods',     'Compare Foods',       'instacart', true),

  -- Midwest
  ('meijer',            'Meijer',              'instacart', true),
  ('hy_vee',            'Hy-Vee',              'instacart', true),
  ('schnucks',          'Schnucks',            'instacart', true),
  ('woodmans',          'Woodman''s',          'instacart', true),
  ('festival_foods',    'Festival Foods',      'instacart', true),
  ('cub_foods',         'Cub Foods',           'instacart', true),
  ('fresh_thyme',       'Fresh Thyme',         'instacart', true),
  ('fareway',           'Fareway',             'instacart', true),
  ('coborns',           'Coborn''s',           'instacart', true),
  ('dierbergs',         'Dierbergs',           'instacart', true),
  ('county_market',     'County Market',       'instacart', true),
  ('martins',           'Martin''s Super Markets','instacart', true),

  -- South / Southwest
  ('heb',               'H-E-B',              'instacart', true),
  ('central_market',    'Central Market',      'instacart', true),
  ('brookshires',       'Brookshire''s',       'instacart', true),
  ('fiesta_mart',       'Fiesta Mart',         'instacart', true),

  -- Mountain / Plains
  ('bashas',            'Bashas''',            'instacart', true),
  ('smiths_food_drug',  'Smith''s Food & Drug','instacart', true),

  -- West Coast
  ('winco',             'WinCo Foods',         'instacart', true),
  ('stater_bros',       'Stater Bros',         'instacart', true),
  ('smart_and_final',   'Smart & Final',       'instacart', true),
  ('grocery_outlet',    'Grocery Outlet',      'instacart', true),
  ('raley',             'Raley''s',            'instacart', true),
  ('save_mart',         'Save Mart',           'instacart', true),
  ('lucky',             'Lucky Supermarkets',  'instacart', true),
  ('gelsons',           'Gelson''s',           'instacart', true),
  ('bristol_farms',     'Bristol Farms',       'instacart', true),
  ('new_seasons',       'New Seasons Market',  'instacart', true),
  ('pcc',               'PCC Community Markets','instacart', true),

  -- Pacific
  ('foodland_hawaii',   'Foodland',            'instacart', true),
  ('times_supermarket', 'Times Supermarket',   'instacart', true),
  ('don_quijote_hi',    'Don Quijote (HI)',    'instacart', true),
  ('carrs',             'Carrs (AK)',          'instacart', true),

  -- Club / Wholesale
  ('costco',            'Costco',              'instacart', true),
  ('bjs',               'BJ''s Wholesale',     'instacart', true),
  ('sams_club',         'Sam''s Club',         'instacart', true),
  ('restaurant_depot',  'Restaurant Depot',    'instacart', true),
  ('us_foods',          'US Foods / ChefStore','api',       true),
  ('chefstore',         'ChefStore (US Foods)','api',       true),
  ('sysco',             'Sysco',               'api',       true),
  ('gfs',               'Gordon Food Service', 'api',       true),

  -- Ethnic / International
  ('hmart',             'H Mart',              'instacart', true),
  ('99_ranch',          '99 Ranch Market',     'instacart', true),
  ('mitsuwa',           'Mitsuwa Marketplace', 'instacart', true),
  ('uwajimaya',         'Uwajimaya',           'instacart', true),
  ('lotte_plaza',       'Lotte Plaza',         'instacart', true),
  ('patel_brothers',    'Patel Brothers',      'instacart', true),
  ('super_g_mart',      'Super G Mart',        'manual',    true),
  ('el_super',          'El Super',            'instacart', true),
  ('cardenas',          'Cardenas Markets',    'instacart', true),
  ('vallarta',          'Vallarta Supermarkets','instacart', true),
  ('northgate',         'Northgate Market',    'instacart', true),
  ('sedanos',           'Sedano''s',           'instacart', true),
  ('fiesta_mart',       'Fiesta Mart',         'instacart', true),

  -- Discount / Dollar
  ('dollar_general',    'Dollar General',      'website',   true),
  ('family_dollar',     'Family Dollar',       'website',   true),
  ('dollar_tree',       'Dollar Tree',         'website',   true),
  ('ocean_state',       'Ocean State Job Lot', 'website',   true),
  ('eataly',            'Eataly',              'instacart', true),
  ('fresh_market',      'Fresh Market',        'instacart', true),
  ('cvs',               'CVS',                 'website',   true),
  ('walgreens',         'Walgreens',           'website',   true)
ON CONFLICT (slug) DO NOTHING;
