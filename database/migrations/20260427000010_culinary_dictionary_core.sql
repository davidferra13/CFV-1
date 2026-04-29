-- Canonical Culinary Dictionary core.
-- Additive only: creates dictionary reference tables, chef-scoped overlays,
-- review queue, indexes, RLS for chef-owned rows, and a small seed set.

CREATE TABLE IF NOT EXISTS culinary_dictionary_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_slug TEXT NOT NULL UNIQUE,
  canonical_name TEXT NOT NULL,
  term_type TEXT NOT NULL CHECK (
    term_type IN (
      'ingredient',
      'technique',
      'cut',
      'sauce',
      'texture',
      'flavor',
      'dietary',
      'allergen',
      'equipment',
      'service',
      'composition',
      'other'
    )
  ),
  category TEXT,
  short_definition TEXT,
  long_definition TEXT,
  public_safe BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'system' CHECK (source IN ('system', 'chef', 'import', 'manual_review')),
  confidence NUMERIC(4,3) NOT NULL DEFAULT 1.000 CHECK (confidence >= 0 AND confidence <= 1),
  needs_review BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS culinary_dictionary_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID NOT NULL REFERENCES culinary_dictionary_terms(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en-US',
  alias_kind TEXT NOT NULL DEFAULT 'synonym' CHECK (
    alias_kind IN (
      'synonym',
      'spelling',
      'abbreviation',
      'plural',
      'regional',
      'brand',
      'misspelling',
      'prep_form'
    )
  ),
  confidence NUMERIC(4,3) NOT NULL DEFAULT 1.000 CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT NOT NULL DEFAULT 'system' CHECK (source IN ('system', 'chef', 'import', 'manual_review')),
  needs_review BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (normalized_alias, locale, alias_kind)
);

CREATE TABLE IF NOT EXISTS culinary_dictionary_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID NOT NULL REFERENCES culinary_dictionary_terms(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (
    target_type IN (
      'system_ingredient',
      'openclaw_canonical_ingredient',
      'dietary_rule',
      'allergen',
      'culinary_word',
      'substitution_original',
      'taxonomy_entry'
    )
  ),
  target_id TEXT NOT NULL,
  relationship TEXT NOT NULL DEFAULT 'equivalent' CHECK (
    relationship IN (
      'equivalent',
      'broader',
      'narrower',
      'related',
      'unsafe_for',
      'substitute_for',
      'used_in'
    )
  ),
  confidence NUMERIC(4,3) NOT NULL DEFAULT 1.000 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (term_id, target_type, target_id, relationship)
);

CREATE TABLE IF NOT EXISTS culinary_dictionary_safety_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID NOT NULL REFERENCES culinary_dictionary_terms(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL CHECK (
    flag_type IN ('allergen', 'dietary_violation', 'dietary_caution', 'cross_contact')
  ),
  flag_key TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'caution' CHECK (severity IN ('info', 'caution', 'critical')),
  explanation TEXT,
  source TEXT NOT NULL DEFAULT 'system' CHECK (source IN ('system', 'chef', 'manual_review')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (term_id, flag_type, flag_key)
);

CREATE TABLE IF NOT EXISTS chef_culinary_dictionary_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  term_id UUID REFERENCES culinary_dictionary_terms(id) ON DELETE CASCADE,
  alias_id UUID REFERENCES culinary_dictionary_aliases(id) ON DELETE CASCADE,
  override_type TEXT NOT NULL CHECK (
    override_type IN (
      'custom_alias',
      'hide_alias',
      'custom_definition',
      'review_decision',
      'preferred_term'
    )
  ),
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (term_id IS NOT NULL OR alias_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS culinary_dictionary_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID REFERENCES chefs(id) ON DELETE CASCADE,
  source_surface TEXT NOT NULL,
  source_value TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  suggested_term_id UUID REFERENCES culinary_dictionary_terms(id) ON DELETE SET NULL,
  suggested_alias_id UUID REFERENCES culinary_dictionary_aliases(id) ON DELETE SET NULL,
  confidence NUMERIC(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected', 'dismissed')
  ),
  resolution JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_culinary_dictionary_terms_type
  ON culinary_dictionary_terms(term_type, category);

CREATE INDEX IF NOT EXISTS idx_culinary_dictionary_terms_public
  ON culinary_dictionary_terms(public_safe, term_type)
  WHERE public_safe = true;

CREATE INDEX IF NOT EXISTS idx_culinary_dictionary_aliases_normalized
  ON culinary_dictionary_aliases(normalized_alias);

CREATE INDEX IF NOT EXISTS idx_culinary_dictionary_aliases_term
  ON culinary_dictionary_aliases(term_id);

CREATE INDEX IF NOT EXISTS idx_culinary_dictionary_links_target
  ON culinary_dictionary_links(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_chef_culinary_dictionary_overrides_chef
  ON chef_culinary_dictionary_overrides(chef_id);

CREATE INDEX IF NOT EXISTS idx_culinary_dictionary_review_queue_chef_status
  ON culinary_dictionary_review_queue(chef_id, status);

ALTER TABLE chef_culinary_dictionary_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE culinary_dictionary_review_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chef_dictionary_overrides_select ON chef_culinary_dictionary_overrides;
CREATE POLICY chef_dictionary_overrides_select
  ON chef_culinary_dictionary_overrides
  FOR SELECT USING (chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS chef_dictionary_overrides_insert ON chef_culinary_dictionary_overrides;
CREATE POLICY chef_dictionary_overrides_insert
  ON chef_culinary_dictionary_overrides
  FOR INSERT WITH CHECK (chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS chef_dictionary_overrides_update ON chef_culinary_dictionary_overrides;
CREATE POLICY chef_dictionary_overrides_update
  ON chef_culinary_dictionary_overrides
  FOR UPDATE USING (chef_id = get_current_tenant_id())
  WITH CHECK (chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS chef_dictionary_review_select ON culinary_dictionary_review_queue;
CREATE POLICY chef_dictionary_review_select
  ON culinary_dictionary_review_queue
  FOR SELECT USING (chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS chef_dictionary_review_insert ON culinary_dictionary_review_queue;
CREATE POLICY chef_dictionary_review_insert
  ON culinary_dictionary_review_queue
  FOR INSERT WITH CHECK (chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS chef_dictionary_review_update ON culinary_dictionary_review_queue;
CREATE POLICY chef_dictionary_review_update
  ON culinary_dictionary_review_queue
  FOR UPDATE USING (chef_id = get_current_tenant_id())
  WITH CHECK (chef_id = get_current_tenant_id());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'set_culinary_dictionary_terms_updated_at'
    ) THEN
      CREATE TRIGGER set_culinary_dictionary_terms_updated_at
        BEFORE UPDATE ON culinary_dictionary_terms
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'set_chef_culinary_dictionary_overrides_updated_at'
    ) THEN
      CREATE TRIGGER set_chef_culinary_dictionary_overrides_updated_at
        BEFORE UPDATE ON chef_culinary_dictionary_overrides
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
  END IF;
END $$;

INSERT INTO culinary_dictionary_terms (
  canonical_slug,
  canonical_name,
  term_type,
  category,
  short_definition,
  long_definition,
  public_safe,
  source,
  confidence
)
VALUES
  (
    'green-onion',
    'Green Onion',
    'ingredient',
    'produce',
    'An immature onion harvested before the bulb fully develops.',
    'Green onion, scallion, and spring onion are commonly used for closely related allium forms. ChefFlow groups them so costing and search do not split the same working ingredient across aliases.',
    true,
    'system',
    0.950
  ),
  (
    'extra-virgin-olive-oil',
    'Extra Virgin Olive Oil',
    'ingredient',
    'oil',
    'Cold-extracted olive oil with low acidity and strong flavor identity.',
    'Extra virgin olive oil is the canonical term for EVOO and similar recipe shorthand in ChefFlow matching.',
    true,
    'system',
    0.950
  ),
  (
    'all-purpose-flour',
    'All Purpose Flour',
    'ingredient',
    'baking',
    'General wheat flour used across pastry, breading, sauces, and baking.',
    'All purpose flour is the canonical term for AP flour and common punctuation variants.',
    true,
    'system',
    0.950
  ),
  (
    'brunoise',
    'Brunoise',
    'cut',
    'knife_cut',
    'A very small dice used for precise texture and presentation.',
    'A brunoise cut is a fine dice used when even cooking, elegant texture, or visual consistency matters.',
    true,
    'system',
    0.900
  ),
  (
    'julienne',
    'Julienne',
    'cut',
    'knife_cut',
    'A thin matchstick cut.',
    'Julienne describes thin matchstick strips used for vegetables, garnish, and even cooking.',
    true,
    'system',
    0.900
  ),
  (
    'confit',
    'Confit',
    'technique',
    'cooking_method',
    'A low, slow cooking or preservation method traditionally done in fat.',
    'Confit is a technique term, not a generated recipe instruction. It helps search, staff clarity, and dish vocabulary.',
    true,
    'system',
    0.900
  ),
  (
    'nappe',
    'Nappe',
    'sauce',
    'sauce_texture',
    'A sauce consistency that coats the back of a spoon.',
    'Nappe describes a coating sauce texture and supports technique search without telling a chef what to cook.',
    true,
    'system',
    0.900
  )
ON CONFLICT (canonical_slug) DO UPDATE
SET canonical_name = EXCLUDED.canonical_name,
    term_type = EXCLUDED.term_type,
    category = EXCLUDED.category,
    short_definition = EXCLUDED.short_definition,
    long_definition = EXCLUDED.long_definition,
    public_safe = EXCLUDED.public_safe,
    source = EXCLUDED.source,
    confidence = EXCLUDED.confidence;

INSERT INTO culinary_dictionary_aliases (
  term_id,
  alias,
  normalized_alias,
  alias_kind,
  confidence,
  source
)
SELECT t.id, a.alias, a.normalized_alias, a.alias_kind, a.confidence, 'system'
FROM culinary_dictionary_terms t
JOIN (
  VALUES
    ('green-onion', 'green onion', 'green onion', 'synonym', 1.000),
    ('green-onion', 'green onions', 'green onion', 'plural', 0.980),
    ('green-onion', 'scallion', 'scallion', 'regional', 0.950),
    ('green-onion', 'scallions', 'scallion', 'plural', 0.950),
    ('green-onion', 'spring onion', 'spring onion', 'regional', 0.900),
    ('green-onion', 'spring onions', 'spring onion', 'plural', 0.900),
    ('extra-virgin-olive-oil', 'extra virgin olive oil', 'extra virgin olive oil', 'synonym', 1.000),
    ('extra-virgin-olive-oil', 'EVOO', 'extra virgin olive oil', 'abbreviation', 0.980),
    ('extra-virgin-olive-oil', 'e.v.o.o.', 'extra virgin olive oil', 'abbreviation', 0.940),
    ('all-purpose-flour', 'all purpose flour', 'all purpose flour', 'synonym', 1.000),
    ('all-purpose-flour', 'all-purpose flour', 'all purpose flour', 'spelling', 0.980),
    ('all-purpose-flour', 'AP flour', 'all purpose flour', 'abbreviation', 0.980),
    ('all-purpose-flour', 'a.p. flour', 'all purpose flour', 'abbreviation', 0.950),
    ('brunoise', 'brunoise', 'brunoise', 'synonym', 1.000),
    ('julienne', 'julienne', 'julienne', 'synonym', 1.000),
    ('confit', 'confit', 'confit', 'synonym', 1.000),
    ('nappe', 'nappe', 'nappe', 'synonym', 1.000)
) AS a(slug, alias, normalized_alias, alias_kind, confidence)
ON t.canonical_slug = a.slug
ON CONFLICT (normalized_alias, locale, alias_kind) DO NOTHING;
