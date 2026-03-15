# Growth Radar Research

**Question:** How should ChefFlow turn the existing internal prospecting system into a real chef-facing growth feature?

## Executive Conclusion

ChefFlow should ship this as a separate chef-facing product surface built on the existing `prospects` and `outreach_campaigns` rail, not by ungating the current admin prospecting pages and not by reusing the current client-marketing campaign system.

The right shape is:

1. Search and source business prospects through permitted first-party or API-backed sources.
2. Store and score them in the existing prospect pipeline.
3. Let chefs approve outbound drafts before any first-touch send.
4. Route replies back into ChefFlow as leads, conversations, and inquiries.

The current repo already contains much of the data model for this, but there are real productization blockers around tenancy, compliance, deliverability, and source policy.

## What Already Exists

### 1. Internal prospecting engine already exists

- Prospecting is explicitly documented as admin-only in [docs/prospecting-hub-feature.md](./prospecting-hub-feature.md):19-22.
- Repo-level operating guidance says prospecting must never appear in the non-admin chef portal in [CLAUDE.md](../CLAUDE.md):633-638.
- The current prospecting pages still hard-gate on `requireAdmin()` in:
  - [app/(chef)/prospecting/page.tsx](<../app/(chef)/prospecting/page.tsx>):39
  - [app/(chef)/prospecting/scrub/page.tsx](<../app/(chef)/prospecting/scrub/page.tsx>):19
  - [app/(chef)/prospecting/queue/page.tsx](<../app/(chef)/prospecting/queue/page.tsx>):16
  - [app/(chef)/prospecting/[id]/page.tsx](<../app/(chef)/prospecting/[id]/page.tsx>):18

### 2. Chef-facing marketing is a different system

- Current marketing is Pro-gated under the `marketing` feature in [lib/billing/pro-features.ts](../lib/billing/pro-features.ts):82-84.
- Pro itself is positioned as "Automation and growth functions" in [lib/billing/pricing-catalog.ts](../lib/billing/pricing-catalog.ts):141.
- The current marketing schema is explicitly for existing-client lifecycle messaging, not net-new prospecting:
  - "Chef-composed email campaigns for client re-engagement and announcements" in [supabase/migrations/20260303000019_marketing_campaigns.sql](../supabase/migrations/20260303000019_marketing_campaigns.sql):48
  - "all subscribed clients with an email" in [docs/marketing-execution-system.md](./marketing-execution-system.md):57
  - "Staying top-of-mind with past clients" in [docs/outreach-campaign-center.md](./outreach-campaign-center.md):9

### 3. There is already a separate outbound prospecting rail

- `outreach_campaigns` exists in [supabase/migrations/20260331000050_outreach_campaigns.sql](../supabase/migrations/20260331000050_outreach_campaigns.sql).
- Prospects already support outbound fields like `outreach_campaign_id`, `instantly_lead_id`, `email_sent_at`, `reply_received_at`, and `reply_sentiment` in [supabase/migrations/20260331000050_outreach_campaigns.sql](../supabase/migrations/20260331000050_outreach_campaigns.sql):39-82.
- Bulk lead import already exists in [app/api/prospecting/import/route.ts](../app/api/prospecting/import/route.ts).
- Reply ingestion already exists in [app/api/prospecting/webhook/reply/route.ts](../app/api/prospecting/webhook/reply/route.ts).
- The intended external workflow is already documented in [scripts/n8n/README.md](../scripts/n8n/README.md).

## Why ChefFlow Should Not Ship This By Simply Reusing Existing Systems

### Do not just ungate admin prospecting

That would expose a tool designed for internal, operator-driven use. The current category system includes business targets such as `yacht_club`, `wedding_planner`, `estate_manager`, and `concierge_service`, but it also includes more sensitive individual targeting such as `business_owner`, `ceo_executive`, `celebrity`, `athlete`, and `high_net_worth` in [lib/prospecting/constants.ts](../lib/prospecting/constants.ts):8-27.

That is too aggressive for a first chef-facing launch. Product scope should start with organizations and public-facing business intermediaries, not named wealthy individuals.

### Do not reuse the current marketing send path for cold outreach

- Current marketing sends use a shared platform sender by default: `info@cheflowhq.com` in [lib/email/resend-client.ts](../lib/email/resend-client.ts):19-20.
- The marketing send path sends as `${chefName} via ChefFlow <${FROM_EMAIL}>` in [lib/marketing/actions.ts](../lib/marketing/actions.ts):394-405.
- The campaign template includes sender identity and an unsubscribe link, but there is no evidence of a postal address in the footer in [lib/email/templates/campaign.tsx](../lib/email/templates/campaign.tsx):62-69.
- There is also no evidence in the current `resend.emails.send()` call of RFC 8058 / one-click unsubscribe headers being set in [lib/marketing/actions.ts](../lib/marketing/actions.ts):394-405.

That path is fine for lifecycle campaigns to existing clients. It is the wrong rail for chef-facing first-touch outbound.

## Productization Blockers In Current Code

### 1. Reply handling is still effectively single-tenant

- The prospecting pipeline auth explicitly says the pipeline key "always resolves to the admin chef's tenant ID" in [lib/prospecting/api-auth.ts](../lib/prospecting/api-auth.ts):6-7.
- The reply webhook also reads `PROSPECTING_TENANT_ID` directly and scopes all lookups and writes to that tenant in [app/api/prospecting/webhook/reply/route.ts](../app/api/prospecting/webhook/reply/route.ts):25-57.

That is acceptable for an internal/admin workflow. It is not acceptable for a multi-chef product. Reply routing needs to resolve the tenant from campaign metadata, provider account metadata, or a signed per-chef webhook secret.

### 2. Outreach log RLS looks wrong for the repo's auth model

- `prospect_outreach_log` policy uses `chef_id = auth.uid()` in [supabase/migrations/20260327000012_prospect_wave4_outreach_pipeline.sql](../supabase/migrations/20260327000012_prospect_wave4_outreach_pipeline.sql):46-50.
- Most of the repo uses chef entity IDs, not raw auth user IDs, for tenant scoping. Example: stage history uses `user_roles` lookup in [supabase/migrations/20260327000015_prospect_stage_history_and_reminders.sql](../supabase/migrations/20260327000015_prospect_stage_history_and_reminders.sql):19-31.

That policy should be treated as suspicious and likely incorrect before exposing outreach logs directly to chefs.

### 3. Complaint tracking likely does not match current Resend event names

- The Resend webhook currently maps `email.spam_complaint` in [app/api/webhooks/resend/route.ts](../app/api/webhooks/resend/route.ts):90-95.
- Internal docs elsewhere already describe the event as `email.complained` in [docs/api-reference.md](./api-reference.md):212.
- Resend's official webhook docs currently list `email.complained`, not `email.spam_complaint`.

If complaint telemetry is wrong, ChefFlow cannot safely meter or shut down abusive senders.

## External Research

### 1. Email compliance and sender requirements

- FTC CAN-SPAM applies to commercial email generally, including business-to-business email. It requires honest header/subject information, a valid postal address, a clear opt-out method, prompt honoring of opt-outs, and responsibility for vendors acting on your behalf.
  - Source: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- Google sender guidelines require SPF or DKIM, DMARC for sending domains, and for marketing/subscribed mail, one-click unsubscribe. Google also calls out keeping spam rates below 0.3%.
  - Source: https://support.google.com/a/answer/81126?hl=en
- Yahoo sender best practices likewise require SPF/DKIM/DMARC, easy unsubscribe, and keeping complaint rates under control.
  - Source: https://senders.yahooinc.com/best-practices/
- Microsoft guidance for outbound bulk sending also points to SPF, DKIM, DMARC, warmup, and RFC 8058 one-click unsubscribe.
  - Source: https://learn.microsoft.com/en-us/dynamics365/customer-insights/journeys/email-outbound-bulk-sending

### 2. Provider fit and deliverability

- Resend recommends using a subdomain instead of the root domain for sending.
  - Source: https://resend.com/docs/dashboard/domains/introduction
- Resend's bulk list feature is `Audiences` / `Broadcasts`, which is designed for list mail and automatically handles some suppression events.
  - Source: https://resend.com/docs/dashboard/audiences/introduction
- Resend's official webhook docs list `email.complained`.
  - Source: https://resend.com/docs/dashboard/webhooks/introduction
- Resend's acceptable use guidance strongly prefers opt-in recipients and places the compliance burden on the sender when emailing unsolicited recipients.
  - Source: https://resend.com/legal/acceptable-use-policy

Conclusion: if ChefFlow wants to support outbound prospecting, it needs a dedicated outbound path with reputation controls. It should not casually push cold traffic through the same generic sender used for normal product mail.

### 3. Search/source constraints

- Google Places / Maps APIs support place search for business discovery, but Google Maps Platform terms impose restrictions on how content can be stored, exported, or reused.
  - Source: https://developers.google.com/maps/documentation/places/web-service/search
  - Source: https://cloud.google.com/maps-platform/terms
- LinkedIn's user agreement prohibits scraping and use of bots/scripts to scrape the service.
  - Source: https://www.linkedin.com/legal/user-agreement

Conclusion: ChefFlow should not make direct LinkedIn scraping or unrestricted Google Maps extraction a core product dependency. Use first-party data, permitted APIs, licensed providers, manual CSV import, and public website enrichment instead.

### 4. SMS and calling

- FCC guidance makes marketing texts to wireless numbers a consent-heavy channel.
  - Source: https://www.fcc.gov/telemarketing-rules
- FTC telemarketing rules are more nuanced for business calls, but that does not make cold SMS safe.
  - Source: https://www.ftc.gov/business-guidance/resources/complying-telemarketing-sales-rule

Conclusion: v1 should not include cold SMS. Email plus manual call workflow is the safer launch shape.

## Recommended Product Scope

### Positioning

`Growth Radar` should be sold as "find and convert the next booking" rather than as a generic scraping tool.

### v1 audience

Limit v1 to business-facing prospect types:

- wedding planners
- venues and clubs
- concierge services
- estate managers
- corporate event contacts
- hotels and resorts

Do not launch v1 with named wealthy-individual prospecting.

### v1 source types

1. First-party ChefFlow sources:
   - dormant clients
   - former guests
   - referral partners
   - prior inquiry contacts that never booked
2. API-backed external search:
   - Google Places / Places API text or nearby search
   - licensed business data providers
3. Manual import:
   - CSV
   - paste a company list or website list
4. Public website enrichment:
   - contact page
   - about page
   - catering/private dining/service pages

### v1 send policy

1. Manual chef approval for every first-touch email.
2. No cold SMS.
3. Low daily quotas per chef.
4. Hard suppression on bounce, complaint, or unsubscribe.
5. Dedicated outbound sender identity, separate from transactional mail.

## Recommended Architecture

### Keep the domain split

Keep two separate communication systems:

- `marketing_campaigns` for known contacts and lifecycle marketing
- `outreach_campaigns` for net-new prospecting

Do not merge them.

### Search and sourcing flow

1. Chef chooses a goal such as "fill open Fridays", "find planners", or "find corporate lunch leads".
2. Chef chooses a location and prospect type.
3. ChefFlow translates that goal into API-backed search jobs.
4. Results are deduped against existing prospects and known contacts.
5. Website enrichment fills in email, phone, contact name, and service fit.
6. ChefFlow scores and ranks prospects before showing them to the chef.

### Sending flow

1. Chef approves selected prospects.
2. ChefFlow drafts first-touch outreach and follow-ups.
3. A dedicated outbound provider adapter sends the message.
4. Delivery, reply, bounce, unsubscribe, and complaint events update the prospect.
5. Interested replies convert into inquiry or conversation records.

### Tenant resolution

Every outbound campaign should carry enough provider metadata to resolve the owning chef without relying on global environment variables.

Preferred matching order:

1. provider campaign ID -> `outreach_campaigns`
2. provider mailbox/account ID -> sender profile -> chef
3. signed webhook secret per chef sender profile

### New data needed

The current repo is close, but productization likely needs:

- outbound sender profiles
- sender/domain warmup status
- per-chef suppression list
- complaint-rate metrics
- provider event log for auditing
- source-run records for external searches
- explicit consent/source metadata on prospects

## Recommended Rollout

### Phase 1

- Launch a chef-facing UI on top of `outreach_campaigns`
- Restrict sources to first-party data, manual import, and permitted business search APIs
- Require approval for each first-touch draft
- Keep quotas low
- No cold SMS

### Phase 2

- Add saved search presets
- Add website enrichment and better scoring
- Add shared but isolated outbound sender pools or connected sender domains
- Add reply assistant and follow-up automation

### Phase 3

- Add higher-volume sending for trusted accounts
- Add advanced attribution to booked revenue
- Add more source connectors only where terms and licensing are defensible

## Recommendation

ChefFlow should build this feature, but as a separate outbound growth system with stricter controls than the current client marketing suite.

The immediate implementation path is:

1. Productize `outreach_campaigns`, not `marketing_campaigns`.
2. Keep prospect sourcing to permitted business sources and first-party data.
3. Fix the tenancy and telemetry bugs before exposing outbound automation broadly.
4. Launch with email plus manual calls, not SMS.
5. Gate it as a new paid growth feature, likely above or alongside current Pro marketing.

## Must-Fix Before Launch

1. Replace `PROSPECTING_TENANT_ID`-based reply routing with real campaign/account-based tenant resolution.
2. Fix or verify `prospect_outreach_log` RLS.
3. Fix the Resend complaint event mapping.
4. Separate cold-outreach sending from `info@cheflowhq.com`.
5. Add postal-address and one-click unsubscribe support to any outbound email path used for prospecting.
