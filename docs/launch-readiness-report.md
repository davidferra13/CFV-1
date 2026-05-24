# Launch Readiness Report

**Generated:** 2026-05-23
**Branch:** main

## Summary

**NOT READY** - 4 V1 exit criteria remain unmet (real chef usage, external E2E test, non-technical onboarding test, iOS app blocked on hardware). 7 migration timestamp collisions need resolution. Core build queue is 95.1% DONE (332/349).

## Detailed Results

### 1. Build Queue Completion

Source: `docs/UNIFIED-BUILD-QUEUE.md`

| Status      | Count   |
| ----------- | ------- |
| DONE        | 332     |
| VERIFY-ONLY | 1       |
| BLOCKED     | 1       |
| UNSPECCED   | 15      |
| **TOTAL**   | **349** |

**Remaining non-DONE breakdown:**

- 1 VERIFY-ONLY: Portal Rail Foundation (needs Playwright runtime proof)
- 1 BLOCKED: iOS PWA/Tauri (needs macOS hardware)
- 15 UNSPECCED: 10 Human Body Build Waves + 4 V1 Exit Criteria + Real Fire Testing

**Completion rate:** 95.1% DONE

### 2. Queue Spot-Check (20 Items)

20 DONE items selected from across multiple categories. Each verified by searching for the primary code artifact mentioned in the queue entry.

| #   | Queue Item                                        | Expected Artifact              | Result                                                                                                                                         |
| --- | ------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Rate Limiting (Cloudflare WAF)                    | `rate-limit-actions.ts`        | VERIFIED (`lib/security/rate-limit-actions.ts`)                                                                                                |
| 2   | Chef Navigation & Page Header Unification         | `nav-config-actions.ts`        | VERIFIED (`lib/navigation/nav-config-actions.ts`)                                                                                              |
| 3   | Mobile Chef Operations UI Pass                    | `mobile-ops-actions.ts`        | VERIFIED (`lib/mobile/mobile-ops-actions.ts`)                                                                                                  |
| 4   | Chef Offline & Bad-Network Continuity             | `offline-actions.ts`           | VERIFIED (`lib/mobile/offline-actions.ts`)                                                                                                     |
| 5   | Android Home Screen Widgets                       | `widget-actions.ts`            | VERIFIED (`lib/dashboard/widget-actions.ts`)                                                                                                   |
| 6   | Cloud Mobile Unified Migration (PWA)              | `public/sw.js`                 | VERIFIED                                                                                                                                       |
| 7   | Data Portability (One-Click Export)               | `data-takeout-actions.ts`      | VERIFIED (`lib/exports/data-takeout-actions.ts`)                                                                                               |
| 8   | First Next Handoff Bar                            | `handoff-bar.tsx`              | VERIFIED (`components/rail/handoff-bar.tsx`)                                                                                                   |
| 9   | Rail Item Lifecycle & Scoring Engine              | `lib/rail/` directory          | VERIFIED (7 files: aggregator, scoring, state, types, resolvers, sources, handoff-resolver)                                                    |
| 10  | Unified Daily Command Center                      | `lib/command-center/`          | VERIFIED (attention-actions.ts, attention-aggregator.ts)                                                                                       |
| 11  | Kitchen Mode (Full-Screen Live Service UI)        | kitchen-mode `page.tsx`        | VERIFIED (found via find)                                                                                                                      |
| 12  | Recipe Quick-Capture (Voice and Photo)            | quick-capture `page.tsx`       | VERIFIED (`app/(chef)/recipes/quick-capture/page.tsx`)                                                                                         |
| 13  | Financial Clarity Dashboard                       | profit calculator files        | VERIFIED (5 files: profit-actions.ts, profit-calculator.ts, profit-loss-report-actions.ts, profitability.ts, profitability-cockpit-actions.ts) |
| 14  | Cold Start & First-Event Wizard                   | first-event `page.tsx`         | VERIFIED (`app/(chef)/onboarding/first-event/page.tsx`)                                                                                        |
| 15  | Communication Unification (One Thread Per Client) | `unified-thread.ts`            | VERIFIED (`lib/communication/unified-thread.ts`)                                                                                               |
| 16  | Action Vocabulary System                          | `action-vocabulary-actions.ts` | VERIFIED (`lib/lifecycle/action-vocabulary-actions.ts`)                                                                                        |
| 17  | Design Debt Tracking                              | `design-debt-actions.ts`       | VERIFIED (`lib/ui/design-debt-actions.ts`)                                                                                                     |
| 18  | High Contrast & Readability Mode                  | `high-contrast-actions.ts`     | VERIFIED (`lib/ui/high-contrast-actions.ts`)                                                                                                   |
| 19  | Lifecycle Feed Integration                        | `dashboard-feed-actions.ts`    | VERIFIED (`lib/lifecycle/dashboard-feed-actions.ts`)                                                                                           |
| 20  | Dead Route Detection & Classification             | `detect-dead-routes.ts`        | VERIFIED (`scripts/detect-dead-routes.ts`)                                                                                                     |

**Result: 20/20 verified.** All sampled DONE items have corresponding code in the codebase.

### 3. Migration Integrity

- **Total migrations:** 1,069 files in `database/migrations/`
- **Date range:** `20260215000001` (Feb 15) through `20260523180000` (May 23)
- **Timestamp ordering:** 7 COLLISIONS detected

| Timestamp      | Collision Pair                                                        |
| -------------- | --------------------------------------------------------------------- |
| 20260423000004 | `ingredient_storage_requirement.sql` vs `prep_completions.sql`        |
| 20260505000003 | `pie_reliability_suite.sql` vs `pricing_config_overhead_labor.sql`    |
| 20260510000001 | `dismissed_duplicates.sql` vs `event_station_dishes.sql`              |
| 20260510000001 | `event_station_dishes.sql` vs `grocery_run_and_service_ticker.sql`    |
| 20260510000001 | `grocery_run_and_service_ticker.sql` vs `preset_automation_rules.sql` |
| 20260511000001 | `sourcing_sessions.sql` vs `vendor_call_metrics.sql`                  |
| 20260523100000 | `circle_co_hosts.sql` vs `remy_skill_proposals.sql`                   |

**Verdict:** FAIL. 7 timestamp collisions across 5 unique timestamps. The `20260510000001` timestamp has a 3-way collision. These need renumbering to guarantee deterministic migration ordering.

### 4. PWA Manifest

**File:** `public/manifest.json` - EXISTS

| Required Field | Present | Value                                       |
| -------------- | ------- | ------------------------------------------- |
| `name`         | Yes     | "ChefFlow"                                  |
| `short_name`   | Yes     | "ChefFlow"                                  |
| `icons`        | Yes     | 4 icons (192px + 512px, regular + maskable) |
| `start_url`    | Yes     | "/dashboard"                                |
| `display`      | Yes     | "standalone"                                |

**Extras present:** description, id, scope, background_color, theme_color, orientation, categories, shortcuts (2), screenshots (2)

**Verdict:** PASS. All required PWA manifest fields present. Service worker (`public/sw.js`) also exists.

### 5. Route Coverage

**Route manifest:** `public/route-manifest.json` - EXISTS
**Total routes:** 938

| Tier          | Count |
| ------------- | ----- |
| chef          | 682   |
| public        | 120   |
| client        | 64    |
| admin         | 44    |
| vendor        | 6     |
| staff         | 6     |
| partner       | 6     |
| authenticated | 4     |
| kiosk         | 3     |
| mobile        | 2     |
| demo          | 1     |

**Nav config:** `components/navigation/nav-config.tsx` contains 621 href entries.

**Top 7 daily-driver nav items vs route manifest:**

| Nav Item   | In Route Manifest |
| ---------- | ----------------- |
| /dashboard | MATCH             |
| /inbox     | MATCH             |
| /inquiries | MATCH             |
| /events    | MATCH             |
| /culinary  | MATCH             |
| /clients   | MATCH             |
| /finance   | MATCH             |

**Nav-to-route gaps:** 24 of 620 nav hrefs have no matching route in the manifest. Notable gaps include `/intelligence`, `/clients/contribution`, `/waiting`, `/culinary/chromatic-atlas`, `/culinary/sustainability`, `/finance/clarity`, `/finance/cockpit`. These may be unbuilt routes or routes not yet picked up by the manifest generator.

**Verdict:** PASS (with minor gaps). All 7 primary nav items resolve. 24 secondary nav hrefs (3.9%) lack manifest entries.

### 6. Environment Variables

**Source:** `.env.local` (variable names only)

**Critical variable check:**

| Variable        | Present |
| --------------- | ------- |
| DATABASE_URL    | Yes     |
| NEXTAUTH_SECRET | Yes     |
| NEXTAUTH_URL    | Yes     |
| AUTH_SECRET     | Yes     |
| AUTH_URL        | Yes     |

**All env vars (61 total):**
DATABASE_URL, NEXT_PUBLIC_DB_URL, DATABASE_E2E_ALLOW_LOCAL, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, GEMINI_API_KEY, GITHUB_MODELS_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, NEXT_PUBLIC_TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, CRON_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL, PLATFORM_OWNER_CHEF_ID, FOUNDER_AUTH_USER_ID, COMM_TRIAGE_ENABLED, OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_MODEL_FAST, OLLAMA_MODEL_COMPLEX, GROQ_API_KEY, CEREBRAS_API_KEY, MISTRAL_API_KEY, SAMBANOVA_API_KEY, OPENCLAW_API_URL, PROSPECTING_API_KEY, PROSPECTING_TENANT_ID, NOTIFICATIONS_OUTBOUND_ENABLED, BRAND_MONITOR_WEB_SEARCH_ENABLED, AUTH_SECRET, NEXTAUTH_URL, AUTH_URL, E2E_ALLOW_TEST_AUTH, SENTINEL_SECRET, KROGER_CLIENT_ID, KROGER_CLIENT_SECRET, NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION, GOOGLE_CUSTOM_SEARCH_CX, GOOGLE_CUSTOM_SEARCH_KEY, VAPID_PUBLIC_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_CONTACT_EMAIL, MC_PIN, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, CHEFFLOW_IDENTITY_EMAIL, CHEFFLOW_IDENTITY_PASSWORD, CHEFFLOW_IDENTITY_PHONE, CHEFFLOW_IDENTITY_VAULT_KEY, USDA_FDC_API_KEY, ELEVENLABS_API_KEY, COMMS_ENCRYPTION_KEY, INBOUND_EMAIL_WEBHOOK_SECRET, INBOUND_EMAIL_DOMAIN, DEVELOPER_ALERTS_ENABLED, PUBLIC_AI_GATEWAY_ENABLED, GROQ_PUBLIC_MODEL, PUBLIC_AI_GATEWAY_TIMEOUT_MS, NEXTAUTH_SECRET

**Verdict:** PASS. All 3 critical variables present. `.env.example` also exists with documented template.

### 7. Code Debt Scan (TODO/FIXME/HACK)

**Scan scope:** `lib/` and `app/` directories, `.ts` and `.tsx` files

| Type      | Count  |
| --------- | ------ |
| TODO      | 26     |
| FIXME     | 0      |
| HACK      | 0      |
| **Total** | **26** |

**Breakdown:**

- 18 are auto-generated `tsvector` parse warnings in `lib/db/migrations/schema.ts` (harmless, from Drizzle introspection)
- 5 are in `lib/todos/actions.ts` referencing the `TODO_FIELDS` constant (false positives, this is the todos feature)
- **3 are real actionable TODOs:**

| File                                            | TODO                                                                                                                                | Severity                                                                                               |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `lib/feature-gates/gate-check.ts:43`            | "read from subscription/billing table when it exists"                                                                               | **Medium** - Feature gate currently has no billing backend. Free/paid split may not enforce correctly. |
| `lib/chef-services/service-config-actions.ts:2` | "clean up dangling imports in remy-context, remy-public-context, inquiry-first-response, chef-profile-readiness, circle-chef-proof" | Low - Cleanup, no runtime impact.                                                                      |
| `lib/menus/catalog-selection-actions.ts:560`    | "Fire notification to chef when notification category for catalog picks is added"                                                   | Low - Missing notification, not a broken path.                                                         |

**Verdict:** PASS. Only 3 real TODOs, none critical. Zero FIXME or HACK comments. The feature-gate TODO is the most notable, as it means billing enforcement may be incomplete.

## Blocking Issues

1. **V1 Exit Criteria unmet (4 items):**
   - Real chef usage for 2+ weeks with feedback (UNSPECCED)
   - Public booking page tested E2E by non-developer (UNSPECCED)
   - Onboarding tested with non-technical user (UNSPECCED)
   - iOS app (BLOCKED on macOS hardware)

2. **Migration timestamp collisions (7):** Non-deterministic migration ordering could cause issues on fresh database setup. Must renumber before production deployment.

3. **Feature gate billing TODO:** `lib/feature-gates/gate-check.ts` has no billing backend. If the app ships with a paid tier, enforcement will not work.

## Recommended Pre-Launch Actions

1. **Fix 7 migration timestamp collisions** by renumbering the later file in each pair to use the next available timestamp. Priority: the 3-way collision at `20260510000001`.

2. **Resolve 24 nav-to-route gaps** to ensure all navigation links lead to real pages. Run the route manifest generator after any route additions.

3. **Complete the feature-gate billing integration** or explicitly document that all features are free at launch.

4. **Run the full shakedown manifest** (`docs/SHAKEDOWN-MANIFEST.md`) before any external user touches the app.

5. **Verify PWA icon files exist** at `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-192.png`, `public/icon-maskable-512.png`. The manifest references them but file existence was not confirmed.

6. **Clean up the 3 real TODO comments** before launch, particularly the billing/feature-gate one.

7. **Run `npm run regression:firewall`** for a full automated verification pass.
