-- Public-path DB hardening for pre-auth browse/search routes.
-- Codifies indexes that the runtime already relies on and aligns them with
-- the current query shapes in lib/discover/actions.ts and lib/openclaw/*.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS idx_canonical_ingredients_name_trgm
  ON openclaw.canonical_ingredients
  USING gin (name extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_chef_preferences_network_discoverable_chef
  ON public.chef_preferences (chef_id)
  WHERE network_discoverable = true;

CREATE INDEX IF NOT EXISTS idx_directory_listings_canonical_state
  ON public.directory_listings (
    (
      CASE
        WHEN state IS NULL THEN NULL
        WHEN upper(btrim(state)) = 'AL' THEN 'AL'
        WHEN lower(btrim(state)) = 'alabama' THEN 'AL'
        WHEN upper(btrim(state)) = 'AK' THEN 'AK'
        WHEN lower(btrim(state)) = 'alaska' THEN 'AK'
        WHEN upper(btrim(state)) = 'AZ' THEN 'AZ'
        WHEN lower(btrim(state)) = 'arizona' THEN 'AZ'
        WHEN upper(btrim(state)) = 'AR' THEN 'AR'
        WHEN lower(btrim(state)) = 'arkansas' THEN 'AR'
        WHEN upper(btrim(state)) = 'CA' THEN 'CA'
        WHEN lower(btrim(state)) = 'california' THEN 'CA'
        WHEN upper(btrim(state)) = 'CO' THEN 'CO'
        WHEN lower(btrim(state)) = 'colorado' THEN 'CO'
        WHEN upper(btrim(state)) = 'CT' THEN 'CT'
        WHEN lower(btrim(state)) = 'connecticut' THEN 'CT'
        WHEN upper(btrim(state)) = 'DE' THEN 'DE'
        WHEN lower(btrim(state)) = 'delaware' THEN 'DE'
        WHEN upper(btrim(state)) = 'DC' THEN 'DC'
        WHEN lower(btrim(state)) = 'district of columbia' THEN 'DC'
        WHEN upper(btrim(state)) = 'FL' THEN 'FL'
        WHEN lower(btrim(state)) = 'florida' THEN 'FL'
        WHEN upper(btrim(state)) = 'GA' THEN 'GA'
        WHEN lower(btrim(state)) = 'georgia' THEN 'GA'
        WHEN upper(btrim(state)) = 'HI' THEN 'HI'
        WHEN lower(btrim(state)) = 'hawaii' THEN 'HI'
        WHEN upper(btrim(state)) = 'ID' THEN 'ID'
        WHEN lower(btrim(state)) = 'idaho' THEN 'ID'
        WHEN upper(btrim(state)) = 'IL' THEN 'IL'
        WHEN lower(btrim(state)) = 'illinois' THEN 'IL'
        WHEN upper(btrim(state)) = 'IN' THEN 'IN'
        WHEN lower(btrim(state)) = 'indiana' THEN 'IN'
        WHEN upper(btrim(state)) = 'IA' THEN 'IA'
        WHEN lower(btrim(state)) = 'iowa' THEN 'IA'
        WHEN upper(btrim(state)) = 'KS' THEN 'KS'
        WHEN lower(btrim(state)) = 'kansas' THEN 'KS'
        WHEN upper(btrim(state)) = 'KY' THEN 'KY'
        WHEN lower(btrim(state)) = 'kentucky' THEN 'KY'
        WHEN upper(btrim(state)) = 'LA' THEN 'LA'
        WHEN lower(btrim(state)) = 'louisiana' THEN 'LA'
        WHEN upper(btrim(state)) = 'ME' THEN 'ME'
        WHEN lower(btrim(state)) = 'maine' THEN 'ME'
        WHEN upper(btrim(state)) = 'MD' THEN 'MD'
        WHEN lower(btrim(state)) = 'maryland' THEN 'MD'
        WHEN upper(btrim(state)) = 'MA' THEN 'MA'
        WHEN lower(btrim(state)) = 'massachusetts' THEN 'MA'
        WHEN upper(btrim(state)) = 'MI' THEN 'MI'
        WHEN lower(btrim(state)) = 'michigan' THEN 'MI'
        WHEN upper(btrim(state)) = 'MN' THEN 'MN'
        WHEN lower(btrim(state)) = 'minnesota' THEN 'MN'
        WHEN upper(btrim(state)) = 'MS' THEN 'MS'
        WHEN lower(btrim(state)) = 'mississippi' THEN 'MS'
        WHEN upper(btrim(state)) = 'MO' THEN 'MO'
        WHEN lower(btrim(state)) = 'missouri' THEN 'MO'
        WHEN upper(btrim(state)) = 'MT' THEN 'MT'
        WHEN lower(btrim(state)) = 'montana' THEN 'MT'
        WHEN upper(btrim(state)) = 'NE' THEN 'NE'
        WHEN lower(btrim(state)) = 'nebraska' THEN 'NE'
        WHEN upper(btrim(state)) = 'NV' THEN 'NV'
        WHEN lower(btrim(state)) = 'nevada' THEN 'NV'
        WHEN upper(btrim(state)) = 'NH' THEN 'NH'
        WHEN lower(btrim(state)) = 'new hampshire' THEN 'NH'
        WHEN upper(btrim(state)) = 'NJ' THEN 'NJ'
        WHEN lower(btrim(state)) = 'new jersey' THEN 'NJ'
        WHEN upper(btrim(state)) = 'NM' THEN 'NM'
        WHEN lower(btrim(state)) = 'new mexico' THEN 'NM'
        WHEN upper(btrim(state)) = 'NY' THEN 'NY'
        WHEN lower(btrim(state)) = 'new york' THEN 'NY'
        WHEN upper(btrim(state)) = 'NC' THEN 'NC'
        WHEN lower(btrim(state)) = 'north carolina' THEN 'NC'
        WHEN upper(btrim(state)) = 'ND' THEN 'ND'
        WHEN lower(btrim(state)) = 'north dakota' THEN 'ND'
        WHEN upper(btrim(state)) = 'OH' THEN 'OH'
        WHEN lower(btrim(state)) = 'ohio' THEN 'OH'
        WHEN upper(btrim(state)) = 'OK' THEN 'OK'
        WHEN lower(btrim(state)) = 'oklahoma' THEN 'OK'
        WHEN upper(btrim(state)) = 'OR' THEN 'OR'
        WHEN lower(btrim(state)) = 'oregon' THEN 'OR'
        WHEN upper(btrim(state)) = 'PA' THEN 'PA'
        WHEN lower(btrim(state)) = 'pennsylvania' THEN 'PA'
        WHEN upper(btrim(state)) = 'RI' THEN 'RI'
        WHEN lower(btrim(state)) = 'rhode island' THEN 'RI'
        WHEN upper(btrim(state)) = 'SC' THEN 'SC'
        WHEN lower(btrim(state)) = 'south carolina' THEN 'SC'
        WHEN upper(btrim(state)) = 'SD' THEN 'SD'
        WHEN lower(btrim(state)) = 'south dakota' THEN 'SD'
        WHEN upper(btrim(state)) = 'TN' THEN 'TN'
        WHEN lower(btrim(state)) = 'tennessee' THEN 'TN'
        WHEN upper(btrim(state)) = 'TX' THEN 'TX'
        WHEN lower(btrim(state)) = 'texas' THEN 'TX'
        WHEN upper(btrim(state)) = 'UT' THEN 'UT'
        WHEN lower(btrim(state)) = 'utah' THEN 'UT'
        WHEN upper(btrim(state)) = 'VT' THEN 'VT'
        WHEN lower(btrim(state)) = 'vermont' THEN 'VT'
        WHEN upper(btrim(state)) = 'VA' THEN 'VA'
        WHEN lower(btrim(state)) = 'virginia' THEN 'VA'
        WHEN upper(btrim(state)) = 'WA' THEN 'WA'
        WHEN lower(btrim(state)) = 'washington' THEN 'WA'
        WHEN upper(btrim(state)) = 'WV' THEN 'WV'
        WHEN lower(btrim(state)) = 'west virginia' THEN 'WV'
        WHEN upper(btrim(state)) = 'WI' THEN 'WI'
        WHEN lower(btrim(state)) = 'wisconsin' THEN 'WI'
        WHEN upper(btrim(state)) = 'WY' THEN 'WY'
        WHEN lower(btrim(state)) = 'wyoming' THEN 'WY'
        ELSE NULL
      END
    )
  )
  WHERE status IN ('discovered', 'claimed', 'verified');

CREATE INDEX IF NOT EXISTS idx_directory_listings_city_trgm
  ON public.directory_listings
  USING gin (city extensions.gin_trgm_ops)
  WHERE city IS NOT NULL
    AND status IN ('discovered', 'claimed', 'verified');
