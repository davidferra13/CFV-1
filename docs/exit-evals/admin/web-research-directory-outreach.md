# Exit Eval: Admin / WEB RESEARCH, DIRECTORY & OUTREACH

> **Wave 3** | 8 scenarios (#41-#48) | Role: **Admin**
> **Mode:** Solo (batch) | All scenarios marked `NEEDS-DEVELOPER-REVIEW`
> **Date:** 2026-05-25
> **Evaluator:** Claude (solo rubric application)

---

## Scenario #41: Verify a web research candidate

**Original classification:** Permanent
**Reclassified to:** Partially Reducible | `NEEDS-DEVELOPER-REVIEW`

**Why admin leaves:** The admin needs to confirm that a web research candidate (restaurant, chef, caterer) actually exists as a legitimate business. The candidate record in `/admin/web-research` has a name, city, state, confidence score, and source evidence, but the admin must verify that the source URLs are real, the business is operating, the cuisine matches, and the entity is not a duplicate of something already in the directory. The operational need is trust verification before publishing a record that will appear on the public `/nearby` directory.

**Context ChefFlow has:**

- Candidate name, city, state, business type, cuisine hints
- Source evidence count, freshness rating, confidence percentage
- Source URL (clickable link to external site)
- Duplicate detection flag (`duplicateOf`)
- Review status workflow (candidate -> needs_review -> reviewed -> published)
- Field provenance tracking (`fieldProvenance` on `DirectoryListingCandidate`)
- Audit trail of all candidate actions
- Published listing slug if already pushed to directory

**Data source?** Partially yes. Google Custom Search API is already integrated (`lib/web-research/providers.ts`) with `createGoogleCustomSearchProvider`. The provider can run `public_listing_verification` and `restaurant_profile_enrichment` job types. However, verification requires human judgment on whether search results confirm the business identity, not just that results exist.

**Client-collaborative angle:** None. This is an admin-only platform operations workflow. No client, chef, or guest is involved in directory candidate verification.

**Physical reality:** Screen-only. Desktop admin work. No kitchen, no hands-free, no print needs.

**Compounding:** High. Every verified candidate builds the directory's trust layer. Verification patterns (what signals confirm a real business) compound into better confidence scoring over time. Source URL freshness tracking already exists.

**Solution design:**

- Add an inline verification panel to the candidate review row that auto-runs a `public_listing_verification` web research job against the candidate name + city when the admin clicks "Verify"
- Display the verification results (titles, snippets, source URLs) directly in the admin UI alongside the candidate record, so the admin can compare without tab-switching
- Add a "verification confidence" field that aggregates source evidence count, freshness, and whether the Google results match the candidate name
- Store `last_verified_at` timestamp and `verification_evidence_ids` on the candidate record so future reviews can skip re-verification of recently checked candidates
- Keep the external source URL link as a fallback for edge cases where automated verification is inconclusive

**Where it appears:**

- `/admin/web-research` candidate review queue (primary)
- `/admin/directory-listings` listing management table (secondary, for re-verification)

**What remains as permanent exit:**
Admin still leaves for ambiguous cases: businesses with common names, recently renamed businesses, businesses that exist only on social media with no website, or candidates where the confidence is borderline. The automated verification handles the clear matches; human judgment handles the fuzzy ones.

**Priority:** Medium frequency (every batch of candidates) x Medium effort (API integration exists, UI extension needed) = **Medium-High**
**Spec needed?** No (add to reclassification sprint doc; existing web research infrastructure covers most of the build)

---

## Scenario #42: Search for new directory leads

**Original classification:** Permanent
**Reclassified to:** Partially Reducible | `NEEDS-DEVELOPER-REVIEW`

**Why admin leaves:** The admin wants to grow the `/nearby` directory by finding new restaurants, private chefs, caterers, food trucks, and other food businesses. Today this means opening Google, Maps, Instagram, Yelp, or industry lists and manually searching for candidates by city, cuisine, or business type. The operational need is pipeline growth: more listings means more discoverability, which drives platform value.

**Context ChefFlow has:**

- Existing directory listings by city, state, business type, cuisine (`directory_listings` table)
- Coverage gap analysis (`/admin/pricing-coverage` pattern could be adapted)
- Lead scoring (`lead_score` on directory listings)
- Web research provider infrastructure (Google Custom Search API)
- `restaurant_browse_candidate_discovery` job type already exists
- Mock candidate discovery action already wired in `/admin/web-research`
- Geographic coverage data (which cities/states have listings)

**Data source?** Yes. Google Custom Search API, Google Places API (not yet integrated), and the existing `restaurant_browse_candidate_discovery` job type. The mock discovery action in `runMockDirectoryCandidateDiscoveryAction` already demonstrates the pattern: search -> normalize -> create candidate -> queue for review.

**Client-collaborative angle:** None directly. However, the `/nearby` nomination system (`adminGetNominations` in directory-listings page) already accepts external nominations from users. This is a passive lead source that feeds the admin review queue.

**Physical reality:** Screen-only. Desktop admin work.

**Compounding:** Very high. Every discovered lead potentially becomes a directory listing. Coverage maps by city/state/cuisine compound into a strategic view of where to focus discovery efforts. The discovery queries themselves can be saved and re-run periodically.

**Solution design:**

- Replace the mock discovery action with a live Google Custom Search discovery action that uses the existing `createGoogleCustomSearchProvider` when credentials are configured
- Add a "Discovery Campaigns" section to `/admin/web-research` where admin can define saved search queries (e.g., "private chefs in Boston MA", "caterers in Portland OR") and run them on demand or on a schedule
- Build a coverage gap dashboard that shows cities/states with low listing counts, suggesting where to focus discovery
- Auto-deduplicate discovered candidates against existing `directory_listings` by name + city fuzzy match (entity resolution already exists in `lib/discover/entity-resolution.ts`)
- Add batch candidate creation from discovery results (multiple candidates from one search)

**Where it appears:**

- `/admin/web-research` discovery campaigns section (primary)
- `/admin/directory-listings` coverage gap insights (secondary)

**What remains as permanent exit:**
Instagram, TikTok, and other social media discovery cannot be automated through search APIs. Industry-specific lists (e.g., local chef associations, food truck rallies, farmer's market vendor lists) require manual browsing. The admin still leaves for these niche sources, but the high-volume Google/Maps discovery is handled in-app.

**Priority:** High frequency (directory growth is ongoing) x Medium effort (infrastructure exists, needs live provider swap + saved queries) = **High**
**Spec needed?** No (the web research infrastructure is already built; this is primarily a configuration and UI extension)

---

## Scenario #43: Validate a chef's public identity

**Original classification:** Permanent
**Reclassified to:** Bridgeable | `NEEDS-DEVELOPER-REVIEW`

**Why admin leaves:** When a chef signs up for ChefFlow or claims a directory listing, the admin may need to verify that the person is who they claim to be. This means checking their Instagram, LinkedIn, personal website, or other public profiles to confirm they are a real food professional. The operational need is trust and safety: preventing impersonation, fake accounts, or non-food-industry users from appearing on the platform.

**Context ChefFlow has:**

- Chef account email, name, phone, created date
- Chef profile data (bio, specialties, service area)
- Directory listing claim data (`claimed_by_name`, `claimed_at`)
- Web research `chef_profile_research` job type exists
- Linked chef resolution (`entity-resolution.ts` with confidence and reason tracking)
- Chef directory approval status (`directory_approved` flag)

**Data source?** Partially. Google Custom Search can find public profiles, but social media APIs (Instagram Graph API, LinkedIn API) require separate OAuth integrations that ChefFlow does not have. The `chef_profile_research` job type in the web research system could search for a chef's name + city and return matching web results.

**Client-collaborative angle:** None. This is admin trust verification. The chef themselves could be asked to provide verification links during onboarding, which would reduce the admin's need to hunt for them.

**Physical reality:** Screen-only. Desktop admin work.

**Compounding:** High. Verified identity links (Instagram URL, LinkedIn URL, personal site URL) become permanent profile data. Once verified, the chef's identity is confirmed for all future interactions. The verification timestamp tracks when it was last checked.

**Solution design:**

- Add a "Verified Links" section to the chef detail page in `/admin/users` where admin can store confirmed social/web profile URLs with `last_verified_at` timestamps
- Run an automated `chef_profile_research` web research job when admin clicks "Verify Identity", displaying results inline
- Allow admin to mark specific URLs as "verified" (confirmed match) or "unrelated" (false positive)
- During chef onboarding or directory claim, prompt the chef to provide their Instagram/LinkedIn/website URL, pre-populating the verification links
- Show a "verified identity" badge on the chef's admin detail page once at least one external link is confirmed

**Where it appears:**

- `/admin/users/[id]` chef detail page (primary)
- `/admin/directory` approval workflow (secondary, for directory-specific identity checks)

**What remains as permanent exit:**
Admin still leaves for deep investigation: checking Instagram post history to confirm active cooking, verifying LinkedIn work history, reading reviews on external platforms, or investigating suspicious accounts. The in-app tools reduce the search phase; the judgment phase remains human.

**Priority:** Low-medium frequency (per new chef signup or claim) x Medium effort (web research job exists, needs UI and storage for verified links) = **Medium**
**Spec needed?** No (add to reclassification sprint doc)

---

## Scenario #44: Review external directory listing quality

**Original classification:** Permanent
**Reclassified to:** Bridgeable | `NEEDS-DEVELOPER-REVIEW`

**Why admin leaves:** The admin wants to check how a ChefFlow directory listing or a chef's public profile appears on external platforms (Google Business, Yelp, marketplace profiles). The operational need is reputation and quality management: ensuring that external representations of businesses in the ChefFlow directory are accurate, complete, and positive.

**Context ChefFlow has:**

- Directory listing data (name, address, phone, website, hours, photos, description, cuisine, business type)
- Listing status and verification state
- Source provenance on web research candidates (`sourceEvidenceIds`, `fieldProvenance`)
- SEO metadata generation (`nearby-browse-seo.ts`, `nearby-collection-seo.ts`)
- Indexability evaluation (`public-listing-indexability.ts`)
- Trust scoring (`lib/discover/trust.ts`)

**Data source?** Partially. Google Custom Search can find external listings, but the quality assessment (are photos current? is the description accurate? are reviews positive?) requires visiting the actual listing pages on Google Business, Yelp, etc. There is no API that summarizes "listing quality" across platforms.

**Client-collaborative angle:** The business owner (if they have claimed their listing) knows best about their own external profiles. A claim workflow prompt could ask: "Where else is your business listed? Share links so we can track consistency."

**Physical reality:** Screen-only. Desktop admin work.

**Compounding:** High. External listing URLs, quality notes, and last-reviewed timestamps compound into a quality dossier per business. Over time, the admin builds a picture of which listings need attention and which are well-maintained externally.

**Solution design:**

- Add an "External Profiles" section to the listing detail in `/admin/directory-listings` where admin can store URLs to Google Business, Yelp, TripAdvisor, and other external listings
- Store `last_quality_review_at` and `quality_notes` fields per external profile link
- Run a `source_freshness_recheck` web research job to confirm external links are still live
- During listing claim, prompt the claimer to provide their external listing URLs
- Add a "needs quality review" filter to the listing management table for listings not reviewed in 90+ days

**Where it appears:**

- `/admin/directory-listings` listing detail (primary)
- `/admin/web-research` source freshness checks (secondary)

**What remains as permanent exit:**
Admin always leaves to visit the actual external listing pages. Reading reviews, checking photo quality, verifying hours accuracy, and assessing overall presentation quality cannot be automated. ChefFlow tracks which listings exist and when they were last checked, but the quality judgment is human.

**Priority:** Low frequency (periodic quality audits) x Low effort (storage fields + link management) = **Low-Medium**
**Spec needed?** No (add to reclassification sprint doc)

---

## Scenario #45: Send outreach campaign beyond current preview commands

**Original classification:** Bridgeable
**Reclassified to:** Reducible | `NEEDS-DEVELOPER-REVIEW`

**Why admin leaves:** The admin wants to send invitation emails to discovered food businesses, inviting them to claim their listing on the `/nearby` directory. Currently, the `/admin/outreach` page shows campaign stats and batch history, but actual email sending requires running a CLI script (`node scripts/run-outreach-batch.mjs`). The operational need is lead conversion: turning discovered listings into claimed, active directory participants.

**Context ChefFlow has:**

- Full outreach campaign engine (`lib/discover/outreach-campaign.ts`)
- Queue selection with deduplication, opt-out checking, and lead score filtering
- Batch creation and completion tracking (`outreach_batches` table)
- Email templates (`DirectoryInvitationEmail`)
- CAN-SPAM compliance (physical address, opt-out URL)
- Funnel tracking (not_contacted -> contacted -> opened -> replied -> claimed)
- Bounce rate monitoring with 5% threshold warning
- Batch history display in admin UI
- Opt-out management with `directory_email_preferences` table
- Outreach logging in `directory_outreach_log` table

**Data source?** No external data source needed. This is entirely an internal workflow. The email provider (Resend) is already integrated via `lib/email/send.ts`.

**Client-collaborative angle:** None. This is admin-to-external-business outreach.

**Physical reality:** Screen-only. Desktop admin work.

**Compounding:** High. Every outreach batch builds the funnel data. Open rates, reply rates, and claim rates inform future batch targeting. The lead scoring improves as more data accumulates.

**Solution design:**

- Add a "Send Batch" button to `/admin/outreach` that calls the existing `getOutreachQueue` + `sendDirectoryInvitationEmail` + `createOutreachBatch` + `completeBatch` server actions directly from the UI instead of requiring the CLI script
- Add batch configuration controls: batch size (default 25), minimum lead score slider, dry-run preview toggle
- Show a preview of the selected recipients (name, email, city, lead score) before confirming send
- Add a confirmation dialog with CAN-SPAM compliance checks (physical address set? from email set?)
- Keep the CLI script as a power-user alternative but make the UI the primary interface
- Add per-batch status tracking (in-progress, complete) with sent/bounced/error counts updating in real-time

**Where it appears:**

- `/admin/outreach` send controls and batch preview (primary)
- `/admin/directory-listings` outreach stats sidebar (secondary)

**What remains as permanent exit:**
None for standard invitation campaigns. The admin may still leave for: custom outreach templates not yet in the system, one-off personal emails to high-value leads, or follow-up campaigns that require different messaging. But the standard batch invitation flow can be fully in-app.

**Priority:** High frequency (regular outreach campaigns) x Low effort (all server actions exist, just needs UI controls) = **Very High**
**Spec needed?** No (infrastructure is complete; this is a UI wiring task)

---

## Scenario #46: Verify opt-out or unsubscribe behavior

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible | `NEEDS-DEVELOPER-REVIEW`

**Why admin leaves:** The admin needs to confirm that opt-out/unsubscribe is working correctly across the outreach system. This means: (1) checking that the public unsubscribe page (`/nearby/unsubscribe`) works, (2) verifying that opted-out emails are excluded from future batches, (3) confirming that the email provider (Resend) is honoring suppression lists, and (4) ensuring CAN-SPAM compliance. The operational need is deliverability compliance: a broken unsubscribe flow can cause legal issues and destroy sender reputation.

**Context ChefFlow has:**

- Public unsubscribe page (`app/(public)/nearby/unsubscribe/page.tsx`) with form UI
- Opt-out recording action (`optOutDirectoryEmail` in `lib/discover/outreach.ts`)
- Opt-out check before every email send (`isOptedOut` function)
- Opt-out table (`directory_email_preferences`) with email, opted_out flag, opted_out_at timestamp, and reason
- Recent opt-outs displayed in `/admin/outreach` dashboard
- Queue selection that filters opted-out emails (`getOutreachQueue`)
- CAN-SPAM physical address and opt-out URL in every outreach email

**Data source?** Partially. The Resend email provider has its own suppression list and bounce data that ChefFlow does not currently pull. Resend dashboard shows delivery events (delivered, bounced, complained) that could inform opt-out state.

**Client-collaborative angle:** None. This is admin compliance verification.

**Physical reality:** Screen-only. Desktop admin work.

**Compounding:** Medium. Opt-out compliance is binary (working or not), but delivery reputation compounds. Early compliance problems snowball into deliverability crises.

**Solution design:**

- Add an "Opt-Out Verification" section to `/admin/outreach` that shows: total opt-outs, recent opt-out entries with timestamps, and a test button that confirms an email is correctly excluded from queue selection
- Add a "test unsubscribe" action that lets admin enter an email, opt it out, and verify it disappears from the outreach queue (with rollback)
- Display Resend delivery events (if available via Resend webhook or API) alongside outreach log entries to show delivery status per email
- Add a compliance health badge: green if unsubscribe page loads, opt-out table is accessible, and no recent opt-out failures; amber/red otherwise
- Show CAN-SPAM configuration status (physical address set? from email set?) prominently

**Where it appears:**

- `/admin/outreach` compliance section (primary)
- `/admin/system` or `/admin/silent-failures` for delivery health alerts (secondary)

**What remains as permanent exit:**
Admin still leaves for: Resend dashboard to check sender reputation scores, bounce rate trends, and ISP-level deliverability data. Email provider-level compliance monitoring cannot be fully absorbed. The admin also leaves for actual browser testing of the unsubscribe page flow.

**Priority:** Low frequency (periodic compliance checks) x Medium effort (Resend API integration for delivery events) = **Medium**
**Spec needed?** No (add to reclassification sprint doc)

---

## Scenario #47: Check search indexing or SEO state

**Original classification:** Permanent
**Reclassified to:** Bridgeable | `NEEDS-DEVELOPER-REVIEW`

**Why admin leaves:** The admin wants to know if ChefFlow's public pages (especially `/nearby` directory listings and `/chefs` profiles) are being indexed by Google and appearing in search results. The operational need is organic discovery: if the directory pages are not indexed, the platform gets no search traffic, and the directory's value proposition collapses.

**Context ChefFlow has:**

- Sophisticated SEO metadata generation for Nearby directory (`nearby-browse-seo.ts` with canonical URLs, robots directives, Open Graph, Twitter cards, JSON-LD)
- Indexability evaluation engine (`public-listing-indexability.ts` with 7 indexability reasons)
- Minimum results thresholds for index eligibility (`getMinimumResultsForIndexing`)
- Collection page SEO (`nearby-collection-seo.ts` with breadcrumb JSON-LD, ItemList schema)
- Trust scoring that feeds indexability decisions (`lib/discover/trust.ts`)
- Stale listing detection (365-day verified, 180-day claimed max age)
- robots.txt and sitemap generation (standard Next.js)

**Data source?** Yes, but not free/simple. Google Search Console API requires OAuth setup. Google "site:" searches via Custom Search API can check index status but are imprecise. The actual indexing state is owned by Google.

**Client-collaborative angle:** None. This is admin platform operations.

**Physical reality:** Screen-only. Desktop admin work.

**Compounding:** High. Indexing patterns compound: knowing which page types get indexed fastest, which cities have search demand, and which listing quality thresholds correlate with indexing informs directory strategy.

**Solution design:**

- Add an "SEO Health" section to `/admin/directory-listings` or a new `/admin/seo` page that shows:
  - Count of listings with `indexable: true` vs `false` from `evaluateDirectoryListingIndexability`
  - Breakdown by indexability reason (verified_listing, claimed_listing_ready, status_requires_noindex, missing_claim_timestamp, listing_stale, missing_location, insufficient_detail)
  - Listings closest to indexability threshold (e.g., 2/3 signals met for a city+type combo)
- Store Google Search Console link and last-checked notes for admin reference
- Run `seo_query_check` web research jobs to spot-check if specific listings appear in Google results (using the existing job type)
- Add a "crawl readiness" badge per listing showing whether its metadata, canonical URL, and JSON-LD are properly configured

**Where it appears:**

- `/admin/directory-listings` SEO health section or `/admin/seo` (primary)
- `/admin/web-research` SEO query check jobs (secondary)

**What remains as permanent exit:**
Admin always leaves for Google Search Console to see: actual indexed page count, crawl errors, search queries driving traffic, and Core Web Vitals. ChefFlow can show what it believes should be indexed, but only Google knows what actually is indexed. This is a permanent exit with good bridge data.

**Priority:** Medium frequency (weekly/monthly SEO checks) x Medium effort (indexability data exists, needs admin UI surface) = **Medium**
**Spec needed?** No (add to reclassification sprint doc; indexability engine already built)

---

## Scenario #48: Update external listing or social profile

**Original classification:** Permanent
**Reclassified to:** Permanent | `NEEDS-DEVELOPER-REVIEW`

**Why admin leaves:** The admin needs to update information about a food business on an external platform (Google Business, Yelp, Instagram, personal website CMS, marketplace profile). This might be correcting hours, updating photos, changing a description, or responding to reviews. The operational need is reputation management: keeping external representations accurate and professional.

**Context ChefFlow has:**

- Directory listing data that could serve as the "source of truth" for what the external profile should say
- Listing detail fields: name, address, phone, email, website, hours, photos, description, cuisine, business type, menu URL, price range
- Outreach system to contact business owners about their listings
- Claim workflow where business owners can self-manage their listing data

**Data source?** No. External platforms (Google Business, Yelp, etc.) each have their own CMS/admin interfaces. There is no universal "update my listing" API. Google Business Profile API exists but requires the business to grant access. Yelp does not allow programmatic listing edits.

**Client-collaborative angle:** Strong. The business owner is the only person who can update their own Google Business, Yelp, and social profiles. ChefFlow can notify them that their listing data has changed and suggest they update their external profiles to match, but ChefFlow cannot do it for them.

**Physical reality:** Screen-only. Desktop admin/business owner work.

**Compounding:** Low per update, but high systemically. A notification system that prompts business owners to keep external profiles in sync with their ChefFlow listing creates compounding consistency across the ecosystem.

**Solution design:**

- Add a "Sync Reminder" action on `/admin/directory-listings` that sends a templated email to a claimed listing's owner when their ChefFlow data has been updated, suggesting they update their external profiles to match
- Store last-updated timestamps for the ChefFlow listing vs. "last external sync reminder sent" to avoid spamming
- Add admin notes field for tracking which external profiles need attention
- Accept this as a permanent exit for the admin themselves; focus on enabling the business owner to self-serve

**Where it appears:**

- `/admin/directory-listings` per-listing actions (primary)
- Outreach email templates for sync reminders (secondary)

**What remains as permanent exit:**
Everything. ChefFlow does not own external platforms. The admin (or business owner) must visit Google Business, Yelp, Instagram, etc. to make changes. This is fundamentally a permanent exit. ChefFlow's role is to be the canonical data source and to nudge owners toward consistency.

**Priority:** Low frequency (ad hoc, triggered by data changes) x Low effort (email template + reminder tracking) = **Low**
**Spec needed?** No (add to reclassification sprint doc)

---

## Batch Summary

| #   | Title                                                  | Reclassified To     | Spec Needed? |
| --- | ------------------------------------------------------ | ------------------- | ------------ |
| 41  | Verify a web research candidate                        | Partially Reducible | no           |
| 42  | Search for new directory leads                         | Partially Reducible | no           |
| 43  | Validate a chef's public identity                      | Bridgeable          | no           |
| 44  | Review external directory listing quality              | Bridgeable          | no           |
| 45  | Send outreach campaign beyond current preview commands | Reducible           | no           |
| 46  | Verify opt-out or unsubscribe behavior                 | Partially Reducible | no           |
| 47  | Check search indexing or SEO state                     | Bridgeable          | no           |
| 48  | Update external listing or social profile              | Permanent           | no           |

**Summary stats:** 1 Reducible, 3 Partially Reducible, 3 Bridgeable, 1 Permanent. 0 specs written. 8 need developer review.

**Key finding:** ChefFlow's web research and directory infrastructure is remarkably mature. The `lib/web-research/` module has provider abstraction, evidence tracking, candidate lifecycle, and audit logging. The `lib/discover/` module has outreach campaigns, opt-out management, entity resolution, SEO metadata, and indexability evaluation. The highest-impact improvement is Scenario #45 (outreach send from UI), which requires zero new infrastructure, only wiring existing server actions to UI controls. Scenarios #41 and #42 are close behind, leveraging the existing Google Custom Search provider for inline verification and live discovery.
