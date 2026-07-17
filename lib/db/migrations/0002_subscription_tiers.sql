ALTER TABLE "chefs" ADD COLUMN IF NOT EXISTS "subscription_tier" text DEFAULT 'free' NOT NULL;
