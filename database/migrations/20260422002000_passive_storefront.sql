-- Passive storefront catalog and purchases
-- Additive-only MVP for auto-generated chef products derived from existing data.

CREATE TABLE IF NOT EXISTS public.passive_products (
  product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('menu', 'recipe', 'event', 'generic')),
  source_id TEXT NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('digital', 'service', 'gift_card')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  fulfillment_type TEXT NOT NULL CHECK (fulfillment_type IN ('download', 'booking', 'code')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  product_key TEXT NOT NULL,
  preview_image_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (chef_id, product_key)
);

CREATE INDEX IF NOT EXISTS idx_passive_products_chef_status
  ON public.passive_products (chef_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_passive_products_source
  ON public.passive_products (chef_id, source_type, source_id);

DROP TRIGGER IF EXISTS passive_products_updated_at ON public.passive_products;
CREATE TRIGGER passive_products_updated_at
  BEFORE UPDATE ON public.passive_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.passive_product_purchases (
  purchase_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.passive_products(product_id) ON DELETE RESTRICT,
  chef_id UUID NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  buyer_auth_user_id UUID,
  buyer_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  recipient_name TEXT,
  recipient_email TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  status TEXT NOT NULL DEFAULT 'fulfilled' CHECK (status IN ('paid', 'fulfilled', 'cancelled')),
  fulfillment_type TEXT NOT NULL CHECK (fulfillment_type IN ('download', 'booking', 'code')),
  product_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  fulfillment_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  access_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passive_product_purchases_chef_created
  ON public.passive_product_purchases (chef_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_passive_product_purchases_client_created
  ON public.passive_product_purchases (buyer_client_id, created_at DESC)
  WHERE buyer_client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_passive_product_purchases_auth_created
  ON public.passive_product_purchases (buyer_auth_user_id, created_at DESC)
  WHERE buyer_auth_user_id IS NOT NULL;

COMMENT ON TABLE public.passive_products IS
  'Auto-generated passive storefront products derived from menus, recipes, event history, and chef pricing data.';

COMMENT ON COLUMN public.passive_products.price IS
  'Stored in cents to match the rest of the ChefFlow pricing model.';

COMMENT ON TABLE public.passive_product_purchases IS
  'Lightweight in-app purchase records for passive storefront orders. access_token powers guest order lookup.';
