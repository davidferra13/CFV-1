-- Studio / Website Builder: 5 new tables
-- chef_sites, chef_site_pages, chef_site_sections, chef_site_media, chef_site_analytics

-- Root entity: one site per tenant
CREATE TABLE chef_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  chef_id UUID NOT NULL REFERENCES chefs(id),
  template_key TEXT NOT NULL DEFAULT 'private-chef',
  site_slug TEXT UNIQUE,
  custom_domain TEXT,
  custom_domain_verified BOOLEAN DEFAULT false,
  custom_domain_verified_at TIMESTAMPTZ,

  -- Branding (overrides profile-branding defaults)
  primary_color TEXT,
  secondary_color TEXT,
  background_color TEXT,
  font_family TEXT DEFAULT 'inter',
  logo_url TEXT,
  favicon_url TEXT,

  -- SEO
  site_title TEXT,
  site_description TEXT,
  og_image_url TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'suspended')),
  published_at TIMESTAMPTZ,
  last_edited_at TIMESTAMPTZ DEFAULT now(),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tenant_id),
  UNIQUE(chef_id)
);

-- Pages within a site
CREATE TABLE chef_site_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES chef_sites(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id),

  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  page_type TEXT NOT NULL DEFAULT 'custom' CHECK (page_type IN ('home', 'about', 'services', 'menu', 'gallery', 'contact', 'blog', 'custom')),

  -- Navigation
  show_in_nav BOOLEAN DEFAULT true,
  nav_order INTEGER DEFAULT 0,

  -- SEO overrides
  meta_title TEXT,
  meta_description TEXT,

  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(site_id, slug)
);

-- Ordered content sections within pages
CREATE TABLE chef_site_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES chef_site_pages(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id),

  section_type TEXT NOT NULL,
  section_order INTEGER NOT NULL DEFAULT 0,

  -- Content (freeform JSON per section type)
  content JSONB NOT NULL DEFAULT '{}',

  -- Data binding (pulls from existing ChefFlow data)
  data_source TEXT,
  data_config JSONB DEFAULT '{}',

  -- Display
  is_visible BOOLEAN DEFAULT true,
  background_color TEXT,
  padding TEXT DEFAULT 'normal' CHECK (padding IN ('none', 'compact', 'normal', 'spacious')),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Media library (stored in local filesystem via lib/storage)
CREATE TABLE chef_site_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES chef_sites(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id),

  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  alt_text TEXT,
  width INTEGER,
  height INTEGER,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Anonymous page view tracking (pruned after 90 days)
CREATE TABLE chef_site_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES chef_sites(id) ON DELETE CASCADE,
  page_id UUID REFERENCES chef_site_pages(id) ON DELETE SET NULL,

  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  country TEXT,

  viewed_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_chef_site_analytics_site_viewed ON chef_site_analytics(site_id, viewed_at);
CREATE INDEX idx_chef_sites_custom_domain ON chef_sites(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX idx_chef_sites_slug ON chef_sites(site_slug);
CREATE INDEX idx_chef_site_pages_site ON chef_site_pages(site_id, nav_order);
CREATE INDEX idx_chef_site_sections_page ON chef_site_sections(page_id, section_order);
CREATE INDEX idx_chef_site_media_site ON chef_site_media(site_id);
