-- Ticket Drops, Add-Ons, and Audience Subscribers
-- Enables: timed ticket releases, early access for Circle members,
-- add-on items at checkout, and public "notify me" audience capture.

-- ─── 1. Ticket Drop Fields on event_ticket_types ─────────────────────

ALTER TABLE "public"."event_ticket_types"
  ADD COLUMN IF NOT EXISTS "sale_starts_at" timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS "sale_ends_at" timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS "early_access_minutes" integer DEFAULT NULL;

COMMENT ON COLUMN "public"."event_ticket_types"."sale_starts_at"
  IS 'When tickets become available for public purchase. NULL = immediately available when tickets_enabled.';

COMMENT ON COLUMN "public"."event_ticket_types"."sale_ends_at"
  IS 'When ticket sales close. NULL = open until event or manual close.';

COMMENT ON COLUMN "public"."event_ticket_types"."early_access_minutes"
  IS 'Minutes before sale_starts_at that Dinner Circle members can purchase. NULL = no early access.';

-- ─── 2. Event Ticket Add-Ons ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."event_ticket_addons" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "price_cents" integer NOT NULL DEFAULT 0,
  "max_per_ticket" integer DEFAULT NULL,
  "total_capacity" integer DEFAULT NULL,
  "sold_count" integer NOT NULL DEFAULT 0,
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "event_ticket_addons_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "event_ticket_addons_event_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE,
  CONSTRAINT "event_ticket_addons_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."chefs"("id") ON DELETE CASCADE,
  CONSTRAINT "event_ticket_addons_price_non_negative" CHECK ("price_cents" >= 0),
  CONSTRAINT "event_ticket_addons_sold_non_negative" CHECK ("sold_count" >= 0)
);

CREATE INDEX IF NOT EXISTS "idx_event_ticket_addons_event" ON "public"."event_ticket_addons" ("event_id", "tenant_id");

COMMENT ON TABLE "public"."event_ticket_addons"
  IS 'Add-on items purchasable alongside event tickets (wine pairings, merch, experience upgrades).';

-- Junction: which addons were purchased with which ticket
CREATE TABLE IF NOT EXISTS "public"."event_ticket_addon_purchases" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "ticket_id" uuid NOT NULL,
  "addon_id" uuid NOT NULL,
  "quantity" integer NOT NULL DEFAULT 1,
  "unit_price_cents" integer NOT NULL,
  "total_cents" integer NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "event_ticket_addon_purchases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "etap_ticket_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."event_tickets"("id") ON DELETE CASCADE,
  CONSTRAINT "etap_addon_fkey" FOREIGN KEY ("addon_id") REFERENCES "public"."event_ticket_addons"("id") ON DELETE CASCADE,
  CONSTRAINT "etap_quantity_positive" CHECK ("quantity" > 0)
);

CREATE INDEX IF NOT EXISTS "idx_etap_ticket" ON "public"."event_ticket_addon_purchases" ("ticket_id");
CREATE INDEX IF NOT EXISTS "idx_etap_addon" ON "public"."event_ticket_addon_purchases" ("addon_id");

-- ─── 3. Audience Subscribers (public notify-me) ─────────────────────

CREATE TABLE IF NOT EXISTS "public"."audience_subscribers" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "chef_id" uuid NOT NULL,
  "email" text NOT NULL,
  "name" text,
  "source" text NOT NULL DEFAULT 'public_event_page',
  "source_event_id" uuid DEFAULT NULL,
  "subscribed_at" timestamptz NOT NULL DEFAULT now(),
  "unsubscribed_at" timestamptz DEFAULT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "audience_subscribers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audience_subscribers_chef_fkey" FOREIGN KEY ("chef_id") REFERENCES "public"."chefs"("id") ON DELETE CASCADE,
  CONSTRAINT "audience_subscribers_unique_email" UNIQUE ("chef_id", "email")
);

CREATE INDEX IF NOT EXISTS "idx_audience_subscribers_chef" ON "public"."audience_subscribers" ("chef_id")
  WHERE "unsubscribed_at" IS NULL;

COMMENT ON TABLE "public"."audience_subscribers"
  IS 'Public email capture for non-Circle members who want notifications of future events.';

-- ─── 4. Triggers ─────────────────────────────────────────────────────

CREATE OR REPLACE TRIGGER "set_updated_at_event_ticket_addons"
  BEFORE UPDATE ON "public"."event_ticket_addons"
  FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
