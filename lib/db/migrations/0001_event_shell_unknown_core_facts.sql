ALTER TABLE "events" ALTER COLUMN "serve_time" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "location_address" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "location_city" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "location_state" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "location_state" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "location_zip" DROP NOT NULL;
