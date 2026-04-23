-- Client-saved Nearby operators
-- Lets authenticated clients favorite food operators/listings from the Nearby directory
-- and reuse that shortlist later from their hub.

CREATE TABLE IF NOT EXISTS public.directory_listing_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.directory_listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_directory_listing_favorites_client_created
  ON public.directory_listing_favorites (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_directory_listing_favorites_listing
  ON public.directory_listing_favorites (listing_id);

ALTER TABLE public.directory_listing_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "directory_listing_favorites_client_read" ON public.directory_listing_favorites;
CREATE POLICY "directory_listing_favorites_client_read" ON public.directory_listing_favorites
  FOR SELECT
  USING (
    client_id = (
      SELECT entity_id
      FROM public.user_roles
      WHERE auth_user_id = auth.uid() AND role = 'client'
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS "directory_listing_favorites_client_insert" ON public.directory_listing_favorites;
CREATE POLICY "directory_listing_favorites_client_insert" ON public.directory_listing_favorites
  FOR INSERT
  WITH CHECK (
    client_id = (
      SELECT entity_id
      FROM public.user_roles
      WHERE auth_user_id = auth.uid() AND role = 'client'
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS "directory_listing_favorites_client_delete" ON public.directory_listing_favorites;
CREATE POLICY "directory_listing_favorites_client_delete" ON public.directory_listing_favorites
  FOR DELETE
  USING (
    client_id = (
      SELECT entity_id
      FROM public.user_roles
      WHERE auth_user_id = auth.uid() AND role = 'client'
      LIMIT 1
    )
  );

COMMENT ON TABLE public.directory_listing_favorites IS
  'Client-saved Nearby directory listings (food operators, restaurants, caterers, bakeries, etc.) for later review.';
