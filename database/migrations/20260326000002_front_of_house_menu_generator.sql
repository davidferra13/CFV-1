-- Front-of-House Menu Generator
-- Adds editable menu templates and persisted generated front-of-house menu renders.

CREATE TABLE IF NOT EXISTS menu_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES chefs(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('default', 'holiday', 'special_event')),
  event_type TEXT CHECK (
    event_type IN (
      'regular_menu',
      'birthday',
      'bachelorette_party',
      'anniversary',
      'holiday',
      'corporate_event'
    )
  ),
  theme TEXT,
  layout JSONB NOT NULL DEFAULT '{}'::jsonb,
  placeholders TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  styles JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_menu_templates_tenant ON menu_templates(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_menu_templates_system ON menu_templates(is_system, type);

CREATE TABLE IF NOT EXISTS front_of_house_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  template_id UUID REFERENCES menu_templates(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL DEFAULT 'regular_menu' CHECK (
    event_type IN (
      'regular_menu',
      'birthday',
      'bachelorette_party',
      'anniversary',
      'holiday',
      'corporate_event'
    )
  ),
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  rendered_html TEXT NOT NULL,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_foh_menus_tenant ON front_of_house_menus(tenant_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_foh_menus_menu ON front_of_house_menus(menu_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_foh_menus_event ON front_of_house_menus(event_id, generated_at DESC);

ALTER TABLE menu_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE front_of_house_menus ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mt_chef_select ON menu_templates;
DROP POLICY IF EXISTS mt_chef_insert ON menu_templates;
DROP POLICY IF EXISTS mt_chef_update ON menu_templates;
DROP POLICY IF EXISTS mt_chef_delete ON menu_templates;

CREATE POLICY mt_chef_select ON menu_templates
  FOR SELECT USING (
    get_current_user_role() = 'chef'
    AND (tenant_id = get_current_tenant_id() OR (is_system = true AND tenant_id IS NULL))
  );

DROP POLICY IF EXISTS mt_chef_insert ON menu_templates;
CREATE POLICY mt_chef_insert ON menu_templates
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS mt_chef_update ON menu_templates;
CREATE POLICY mt_chef_update ON menu_templates
  FOR UPDATE USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
    AND is_system = false
  )
  WITH CHECK (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
    AND is_system = false
  );

DROP POLICY IF EXISTS mt_chef_delete ON menu_templates;
CREATE POLICY mt_chef_delete ON menu_templates
  FOR DELETE USING (
    get_current_user_role() = 'chef'
    AND tenant_id = get_current_tenant_id()
    AND is_system = false
  );

DROP POLICY IF EXISTS foh_chef_select ON front_of_house_menus;
DROP POLICY IF EXISTS foh_chef_insert ON front_of_house_menus;
DROP POLICY IF EXISTS foh_chef_update ON front_of_house_menus;
DROP POLICY IF EXISTS foh_chef_delete ON front_of_house_menus;
DROP POLICY IF EXISTS foh_client_select ON front_of_house_menus;

CREATE POLICY foh_chef_select ON front_of_house_menus
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS foh_chef_insert ON front_of_house_menus;
CREATE POLICY foh_chef_insert ON front_of_house_menus
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS foh_chef_update ON front_of_house_menus;
CREATE POLICY foh_chef_update ON front_of_house_menus
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS foh_chef_delete ON front_of_house_menus;
CREATE POLICY foh_chef_delete ON front_of_house_menus
  FOR DELETE USING (
    get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS foh_client_select ON front_of_house_menus;
CREATE POLICY foh_client_select ON front_of_house_menus
  FOR SELECT USING (
    get_current_user_role() = 'client'
    AND event_id IN (
      SELECT id
      FROM events
      WHERE client_id = get_current_client_id()
    )
  );

DROP TRIGGER IF EXISTS trg_menu_templates_updated_at ON menu_templates;
CREATE TRIGGER trg_menu_templates_updated_at
  BEFORE UPDATE ON menu_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_foh_menus_updated_at ON front_of_house_menus;
CREATE TRIGGER trg_foh_menus_updated_at
  BEFORE UPDATE ON front_of_house_menus
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO menu_templates (
  tenant_id,
  slug,
  name,
  description,
  type,
  event_type,
  theme,
  layout,
  placeholders,
  styles,
  default_fields,
  is_system
)
VALUES
  (
    NULL,
    'default-classic',
    'Default Classic',
    'Clean, professional front-of-house menu for everyday events.',
    'default',
    'regular_menu',
    'Default',
    '{"header": "centered", "showStamp": false}'::jsonb,
    ARRAY['chefName', 'date', 'hostName', 'theme', 'winePairing', 'specialNote', 'customStamp'],
    '{"palette":{"bg":"#f8f4ec","text":"#1f1f1f","accent":"#6b4f3a"},"font":{"title":"Georgia, serif","body":"Times New Roman, serif"}}'::jsonb,
    '{"showHostName":false,"showTheme":false,"showWinePairing":true,"showSpecialNote":false,"showStamp":false}'::jsonb,
    true
  ),
  (
    NULL,
    'holiday-christmas',
    'Christmas Glow',
    'Festive holiday design with evergreen and gold accents.',
    'holiday',
    'holiday',
    'Christmas',
    '{"header": "centered", "showStamp": true}'::jsonb,
    ARRAY['chefName', 'date', 'hostName', 'theme', 'winePairing', 'specialNote', 'customStamp'],
    '{"palette":{"bg":"#f6f2ea","text":"#1f2a1f","accent":"#b22222"},"font":{"title":"Georgia, serif","body":"Garamond, serif"}}'::jsonb,
    '{"showHostName":true,"showTheme":true,"showWinePairing":true,"showSpecialNote":true,"showStamp":true}'::jsonb,
    true
  ),
  (
    NULL,
    'holiday-hanukkah',
    'Hanukkah Light',
    'Elegant blue and silver style for Hanukkah menus.',
    'holiday',
    'holiday',
    'Hanukkah',
    '{"header": "centered", "showStamp": true}'::jsonb,
    ARRAY['chefName', 'date', 'hostName', 'theme', 'winePairing', 'specialNote', 'customStamp'],
    '{"palette":{"bg":"#f4f8fc","text":"#0f2747","accent":"#5c7ea5"},"font":{"title":"Georgia, serif","body":"Garamond, serif"}}'::jsonb,
    '{"showHostName":true,"showTheme":true,"showWinePairing":true,"showSpecialNote":true,"showStamp":true}'::jsonb,
    true
  ),
  (
    NULL,
    'holiday-valentines-day',
    'Valentine Romance',
    'Warm romantic styling with blush and berry accents.',
    'holiday',
    'holiday',
    'Valentine''s Day',
    '{"header": "centered", "showStamp": true}'::jsonb,
    ARRAY['chefName', 'date', 'hostName', 'theme', 'winePairing', 'specialNote', 'customStamp'],
    '{"palette":{"bg":"#fff5f7","text":"#4a1d2f","accent":"#c44569"},"font":{"title":"Playfair Display, serif","body":"Georgia, serif"}}'::jsonb,
    '{"showHostName":true,"showTheme":true,"showWinePairing":true,"showSpecialNote":true,"showStamp":true}'::jsonb,
    true
  ),
  (
    NULL,
    'holiday-easter',
    'Easter Garden',
    'Soft spring palette for Easter and spring gatherings.',
    'holiday',
    'holiday',
    'Easter',
    '{"header": "centered", "showStamp": true}'::jsonb,
    ARRAY['chefName', 'date', 'hostName', 'theme', 'winePairing', 'specialNote', 'customStamp'],
    '{"palette":{"bg":"#f7fbf2","text":"#254029","accent":"#7fb77e"},"font":{"title":"Georgia, serif","body":"Garamond, serif"}}'::jsonb,
    '{"showHostName":true,"showTheme":true,"showWinePairing":true,"showSpecialNote":true,"showStamp":true}'::jsonb,
    true
  ),
  (
    NULL,
    'holiday-halloween',
    'Halloween Night',
    'Playful dark-orange styling for Halloween dinners.',
    'holiday',
    'holiday',
    'Halloween',
    '{"header": "centered", "showStamp": true}'::jsonb,
    ARRAY['chefName', 'date', 'hostName', 'theme', 'winePairing', 'specialNote', 'customStamp'],
    '{"palette":{"bg":"#1f1a17","text":"#f5e9da","accent":"#f08a24"},"font":{"title":"Georgia, serif","body":"Garamond, serif"}}'::jsonb,
    '{"showHostName":true,"showTheme":true,"showWinePairing":true,"showSpecialNote":true,"showStamp":true}'::jsonb,
    true
  ),
  (
    NULL,
    'event-birthday',
    'Birthday Celebration',
    'Celebration-first layout that highlights host name prominently.',
    'special_event',
    'birthday',
    'Birthday',
    '{"header": "celebration", "showStamp": true}'::jsonb,
    ARRAY['chefName', 'date', 'hostName', 'theme', 'winePairing', 'specialNote', 'customStamp'],
    '{"palette":{"bg":"#fff7eb","text":"#3d2d1a","accent":"#ff8c42"},"font":{"title":"Playfair Display, serif","body":"Georgia, serif"}}'::jsonb,
    '{"showHostName":true,"showTheme":true,"showWinePairing":true,"showSpecialNote":true,"showStamp":true}'::jsonb,
    true
  ),
  (
    NULL,
    'event-bachelorette-party',
    'Bachelorette Brunch',
    'Playful and chic style designed for bachelorette parties.',
    'special_event',
    'bachelorette_party',
    'Bachelorette Party',
    '{"header": "celebration", "showStamp": true}'::jsonb,
    ARRAY['chefName', 'date', 'hostName', 'theme', 'winePairing', 'specialNote', 'customStamp'],
    '{"palette":{"bg":"#fff3f8","text":"#3b1f2b","accent":"#ff5fa2"},"font":{"title":"Playfair Display, serif","body":"Georgia, serif"}}'::jsonb,
    '{"showHostName":true,"showTheme":true,"showWinePairing":true,"showSpecialNote":true,"showStamp":true}'::jsonb,
    true
  ),
  (
    NULL,
    'event-anniversary',
    'Anniversary Elegance',
    'Elegant romantic style for anniversary celebrations.',
    'special_event',
    'anniversary',
    'Anniversary',
    '{"header": "centered", "showStamp": true}'::jsonb,
    ARRAY['chefName', 'date', 'hostName', 'theme', 'winePairing', 'specialNote', 'customStamp'],
    '{"palette":{"bg":"#fbf8f2","text":"#2f2a23","accent":"#a87c4f"},"font":{"title":"Playfair Display, serif","body":"Garamond, serif"}}'::jsonb,
    '{"showHostName":true,"showTheme":true,"showWinePairing":true,"showSpecialNote":true,"showStamp":true}'::jsonb,
    true
  ),
  (
    NULL,
    'event-corporate',
    'Corporate Signature',
    'Professional style for client dinners and corporate events.',
    'special_event',
    'corporate_event',
    'Corporate Event',
    '{"header": "structured", "showStamp": false}'::jsonb,
    ARRAY['chefName', 'date', 'hostName', 'theme', 'winePairing', 'specialNote', 'customStamp'],
    '{"palette":{"bg":"#f4f7fb","text":"#1e293b","accent":"#0f4c81"},"font":{"title":"Merriweather, serif","body":"Georgia, serif"}}'::jsonb,
    '{"showHostName":true,"showTheme":true,"showWinePairing":true,"showSpecialNote":true,"showStamp":false}'::jsonb,
    true
  )
ON CONFLICT (tenant_id, slug) DO NOTHING;
