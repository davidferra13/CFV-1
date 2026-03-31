-- Make openclaw.products.upc unique (partial, WHERE upc IS NOT NULL)
-- Required for pull.mjs upsert conflict resolution on UPC.

DROP INDEX IF EXISTS openclaw.idx_oc_products_upc;
CREATE UNIQUE INDEX idx_oc_products_upc ON openclaw.products(upc) WHERE upc IS NOT NULL;
