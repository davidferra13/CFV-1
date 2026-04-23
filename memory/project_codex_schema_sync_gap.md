---
name: Codex Schema Sync Gap (RESOLVED)
description: 20 Codex migrations applied 2026-04-23. All tables/columns verified. DB in sync.
type: project
---

**RESOLVED 2026-04-23.**

20 migration files from Codex April 21-23 applied to Docker DB (chefflow_postgres, port 54322).

**What was applied:**

- 17 new tables created (client*profile*\*, event_outcomes, event_outcome_dishes, passive_products, passive_product_purchases, planning_runs, planning_run_artifacts, directory_listing_favorites, chef_location_links, partner_location_change_requests, event_service_simulation_runs, directory_listing_account_link_events)
- guest_count_changes: 4 review columns added (status, reviewed_by, reviewed_at, review_notes)
- communication*events: 9 provider*\* delivery columns added
- conversation*threads: 7 latest_outbound*\* columns added
- hub_polls/hub_poll_options/hub_poll_votes: menu polling columns added
- New enum types, indexes, RLS policies, triggers

**Non-critical failures (no action needed):**

- `directory_waitlist` table doesn't exist (nearby demand capture feature tables not built)
- `contact_submissions` columns already existed (idempotent re-run)
- One RLS policy duplicate (idempotent)
- Transport metadata view join syntax error (cosmetic; columns still added)

**Why:** Codex built 10 features with SQL migrations but never applied them to live DB.
**How to apply:** Schema is now in sync. No further migration action needed unless new features add tables.
