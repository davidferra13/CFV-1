-- ============================================================
-- Product Public Media Links
-- Durable attribution-preserving links from commerce products
-- to approved public media assets.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_public_media_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL UNIQUE REFERENCES public.product_projections(id) ON DELETE CASCADE,
  public_media_asset_id UUID NOT NULL REFERENCES public.public_media_assets(id) ON DELETE RESTRICT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text TEXT,
  source_name TEXT NOT NULL,
  source_label TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  provider_url TEXT,
  creator_name TEXT,
  creator_url TEXT,
  license_name TEXT,
  license_url TEXT,
  attribution_text TEXT,
  landing_url TEXT,
  usage_restrictions TEXT[] NOT NULL DEFAULT '{}',
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_public_media_links_tenant
  ON public.product_public_media_links (tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_public_media_links_asset
  ON public.product_public_media_links (public_media_asset_id, updated_at DESC);
ALTER TABLE public.product_public_media_links ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.enforce_product_public_media_link_integrity()
RETURNS TRIGGER AS $$
DECLARE
  linked_product_tenant UUID;
  asset_approval_status TEXT;
BEGIN
  SELECT tenant_id
  INTO linked_product_tenant
  FROM public.product_projections
  WHERE id = NEW.product_id;

  IF linked_product_tenant IS NULL THEN
    RAISE EXCEPTION 'Product % not found for public media link', NEW.product_id;
  END IF;

  IF NEW.tenant_id IS DISTINCT FROM linked_product_tenant THEN
    RAISE EXCEPTION 'Product public media link tenant mismatch';
  END IF;

  SELECT approval_status
  INTO asset_approval_status
  FROM public.public_media_assets
  WHERE id = NEW.public_media_asset_id;

  IF asset_approval_status IS NULL THEN
    RAISE EXCEPTION 'Public media asset % not found', NEW.public_media_asset_id;
  END IF;

  IF asset_approval_status <> 'approved' THEN
    RAISE EXCEPTION 'Public media asset % must be approved before linking', NEW.public_media_asset_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_product_public_media_links_updated_at
  ON public.product_public_media_links;
DROP TRIGGER IF EXISTS trg_product_public_media_links_updated_at ON product_public_media_links;
CREATE TRIGGER trg_product_public_media_links_updated_at
  BEFORE UPDATE ON public.product_public_media_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_product_public_media_links_integrity
  ON public.product_public_media_links;
DROP TRIGGER IF EXISTS trg_product_public_media_links_integrity ON product_public_media_links;
CREATE TRIGGER trg_product_public_media_links_integrity
  BEFORE INSERT OR UPDATE ON public.product_public_media_links
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_product_public_media_link_integrity();
DROP POLICY IF EXISTS "chef_product_public_media_links" ON public.product_public_media_links;
CREATE POLICY "chef_product_public_media_links" ON public.product_public_media_links
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id
      FROM public.user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id
      FROM public.user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
DROP POLICY IF EXISTS "service_product_public_media_links" ON public.product_public_media_links;
CREATE POLICY "service_product_public_media_links" ON public.product_public_media_links
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
COMMENT ON TABLE public.product_public_media_links IS
  'Approved public-media attachments for commerce products with attribution snapshots for public display.';
