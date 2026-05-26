# Exit Eval: Chef / MARKETING & SOCIAL PRESENCE

> **Batch:** Wave 1, Prompt 06
> **Role:** Chef
> **Category:** Marketing & Social Presence
> **Scenarios:** #32 - #37 (6 total)
> **Mode:** Solo (NEEDS-DEVELOPER-REVIEW on all)
> **Date:** 2026-05-25

---

## Scenario #32: Post food photos to Instagram/TikTok

**Original classification:** Permanent exit. ChefFlow is ops, not social media.
**Reclassified to:** Partially Reducible

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** The chef needs to build a personal brand and attract new clients by sharing food photos on Instagram and TikTok. The operational reason is client acquisition and reputation building. They compose a post with caption, hashtags, and media, then publish to one or more platforms. Without automation, this means opening the native app, selecting photos from their camera roll, writing a caption from scratch, remembering relevant hashtags, and posting at a good time. Context from the event (what dishes were served, which client, what occasion) lives in ChefFlow but the chef mentally reconstructs it each time.

**Context ChefFlow has:**

- Event photos (uploaded to events, stored in social media vault)
- Event details: occasion, date, guest count, location, service style
- Menu items and dish names for the event
- Client name (for thank-you posts, with permission)
- Social templates library (15+ default templates across Instagram, TikTok, Facebook, LinkedIn, X, Pinterest)
- Hashtag sets (general chef and event-specific)
- Content pillar strategy (recipe, behind_scenes, education, social_proof, offers, seasonal)
- Social queue settings (posts per week, posting schedule, timezone)
- Annual content calendar with slot assignments
- Platform connections via OAuth (Instagram, TikTok, Facebook, LinkedIn, X, Pinterest, YouTube)
- Publishing engine with per-platform adapters and token refresh
- Content performance tracking (impressions, reach, saves, shares, inquiry attribution)

**Data source?** No. Social platforms are publishing destinations, not data sources. However, the Instagram/Facebook Graph API and TikTok Content Posting API are used for direct publishing.

**Client-collaborative angle:** Minimal. Clients are not involved in the chef's social posting. However, client testimonials (from the Reputation Studio) can feed testimonial-style posts. Dinner Circle feedback could auto-surface "quotable" praise for social proof posts.

**Physical reality:** Chefs often want to post quickly after plating, while food looks fresh. Phone camera is the primary tool. The compose flow should work well on mobile. Voice (Remy) could help draft captions hands-free during service.

**Compounding:** High. Every event generates content opportunities. Template libraries, hashtag sets, and content performance data compound over time. Best-performing post formats become reusable patterns. The content calendar provides long-term rhythm. Platform connection tokens persist. The ROI attribution data (which platforms drive inquiries) compounds into a marketing intelligence asset.

**Solution design:**

- ChefFlow already has a robust social publishing stack: content pipeline (turns completed events into post drafts), social template library, annual content calendar, OAuth connections to 7 platforms, a publishing engine with per-platform adapters, and content performance tracking with inquiry attribution
- The remaining gap is streamlining the "event just happened, post right now" flow: a quick-post action on the event detail page that pre-fills caption from event context + selected photos, applies the chef's preferred template, and publishes or queues
- TikTok currently operates in upload_as_draft mode (requires app-level approval for direct publish); this is a platform limitation, not a ChefFlow gap
- Content performance feedback loop (which post types drive inquiries) could auto-suggest pillar mix adjustments

**Where it appears:**

- `/marketing/social` (annual content calendar)
- `/marketing/social/compose/[eventId]` (event-based post composer)
- `/marketing/social/templates` (template library)
- `/marketing/social/connections` (platform OAuth)
- `/marketing/social/settings` (queue configuration)
- `/marketing/content-pipeline` (completed events ready for content)
- Event detail page (link to compose)

**What remains as permanent exit:**

- Browsing Instagram/TikTok for inspiration, trends, and competitor analysis
- Engaging with comments and DMs on native platforms
- Instagram Stories and Reels creation using native camera effects, filters, and AR features
- TikTok video editing with native effects, sounds, and trends
- Platform-specific features that require the native app (polls, Q&A stickers, duets, stitches)

**Priority:** High frequency (weekly+) x Low effort (mostly built) = High value, low remaining work
**Spec needed?** No. The system is substantially built. Remaining work is polish (quick-post shortcut, pillar mix auto-suggestion) that fits in the existing architecture.

---

## Scenario #33: Update Google Business Profile

**Original classification:** Permanent exit. Could remind chef to update.
**Reclassified to:** Bridgeable

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** The chef maintains a Google Business Profile to appear in "private chef near me" searches. They update hours, add photos, respond to reviews, post updates, and manage service descriptions. The operational reason is local SEO and discoverability. Without this, potential clients searching locally never find them. The chef's business info (services offered, service area, hours) lives partly in ChefFlow but must be manually mirrored to Google.

**Context ChefFlow has:**

- Chef's business name, display name
- Service area / zip / region
- Service types offered (via discovery profile)
- Portfolio photos (event photos, plating shots)
- Cuisine specialties
- Price range
- Availability signals
- Review data (from Reputation Studio: client reviews with ratings, responses)
- Testimonials (featured excerpts)

**Data source?** Partially. Google Business Profile API exists and supports programmatic updates to posts, photos, and business information. Review data can be read via the API. However, verification and initial setup require the Google Business dashboard.

**Client-collaborative angle:** None directly. Clients leave Google reviews externally. ChefFlow's Reputation Studio already tracks internal reviews, but Google reviews are a separate channel.

**Physical reality:** Desktop-oriented task. Chef typically does this during admin time, not in the kitchen.

**Compounding:** Medium. Business info is mostly static (update once per season or when services change). Photos compound as the portfolio grows. Reviews compound over time. The value is in maintaining freshness, not frequent deep updates.

**Solution design:**

- Exit link already exists in registry (category: marketing, label "Update Google Business", links to business.google.com with sub-link to Yelp business)
- Build a "Business Profile Sync Reminder" that fires quarterly or when chef updates services/photos in ChefFlow, nudging them to mirror changes to Google
- Surface Google Business Profile API integration (future): push new portfolio photos, update hours, and create "update" posts directly from ChefFlow
- Pull Google reviews into Reputation Studio for unified review management (read-only sync)
- Chef's public profile page (`/chef/[slug]`) already serves as a parallel web presence with SEO, structured data (JSON-LD), portfolio, reviews, and booking links

**Where it appears:**

- `/marketing` page (exit link panel, marketing category)
- Dashboard or settings reminder widget
- `/chef/[slug]` (public profile, already functions as a discoverable web presence)

**What remains as permanent exit:**

- Google Business verification and initial setup
- Responding to Google reviews (must happen on Google's platform to appear publicly)
- Managing Google Business Q&A
- Editing map pin accuracy, service area radius

**Priority:** Medium frequency (monthly) x Medium effort (API integration) = Medium priority
**Spec needed?** No. The exit link bridge exists. A deeper Google Business API integration is a future enhancement, not urgent given the public chef profile already provides discoverability.

---

## Scenario #34: Respond to Yelp/Google reviews

**Original classification:** Permanent exit. Could surface review alerts.
**Reclassified to:** Bridgeable

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** The chef sees a new review on Yelp or Google and needs to respond publicly. The operational reason is reputation management: unanswered reviews (especially negative ones) damage credibility. The chef needs to read the review, assess tone, draft an appropriate response, and post it on the platform. Responding publicly is required for the response to appear under the review.

**Context ChefFlow has:**

- Reputation Studio with review management (client_reviews table)
- Review entries with rating, comment, response status, response text
- Review source tracking (client_review, logged_feedback, external_review)
- Aggregate reputation metrics (score, trend, response rate)
- Testimonial extraction from reviews (featured excerpts for social proof)
- Social proof configuration (show on profile, show on portal)
- Event context linked to reviews (which event the review references)
- AI testimonial panel on marketing page

**Data source?** Partially. Both Yelp Fusion API and Google Business Profile API can surface reviews for reading. However, responding to reviews requires platform-specific authentication and must happen through the platform's own review-response mechanism.

**Client-collaborative angle:** Indirect. Post-event review requests via Dinner Circle or email could direct satisfied clients to leave reviews on Google/Yelp specifically, increasing the volume of positive reviews and reducing the urgency of damage control.

**Physical reality:** Desktop task, during admin time. No physical/kitchen constraints.

**Compounding:** High. Response templates compound (the chef develops their voice and standard responses to common praise/complaints). Review patterns reveal service quality trends. Response rate itself compounds as a reputation signal.

**Solution design:**

- Exit link already exists in registry (category: marketing, label "Reply on Yelp" with sub-link "Reply on Google Reviews")
- Expand Reputation Studio to ingest external reviews: periodic poll of Google Business Profile API for new Google reviews, surfacing them alongside internal client reviews in a unified feed
- AI-drafted response suggestions using event context (Gemma 4): "This review references your June 14 dinner for the Hendersons. The menu featured pan-seared halibut. Here is a suggested response."
- Response drafts are composed in ChefFlow, then the chef clicks through to post on the external platform (copy-to-clipboard + exit link)
- Track response rate across all sources (internal + external) in Reputation Studio overview

**Where it appears:**

- `/marketing` page (exit link panel)
- Reputation Studio (future unified review feed)
- Dashboard notification for new unresponded reviews

**What remains as permanent exit:**

- Posting the response on Yelp/Google (must be done on the platform for public visibility)
- Disputing fraudulent or policy-violating reviews (platform-specific moderation tools)
- Yelp business owner account management

**Priority:** Medium frequency (per-review, varies) x Medium effort (API read integration + AI draft) = Medium-high priority
**Spec needed?** No. The bridge pattern (draft in ChefFlow, post on platform) is clear and fits within the existing Reputation Studio architecture. Implementation is incremental.

---

## Scenario #35: Update personal website/portfolio

**Original classification:** Permanent exit. ChefFlow profile page could reduce need.
**Reclassified to:** Partially Reducible

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** The chef maintains a personal website (Squarespace, Wix, WordPress) to showcase their work, display menus, share testimonials, and accept inquiries. The operational reason is professional credibility and client acquisition. They update it with new photos, revise service descriptions, add seasonal menus, and post testimonials. This is time-consuming because they manually recreate content that already exists in ChefFlow.

**Context ChefFlow has:**

- Full public chef profile page (`/chef/[slug]`) with:
  - Bio, avatar, cover photo
  - Cuisine specialties, service types, price range
  - Portfolio gallery (from event photos and dedicated portfolio entries)
  - Review showcase (client reviews with ratings)
  - Social proof summary (aggregate score, review count)
  - Chef credentials panel (work history, achievements, charity impact)
  - Dietary trust strip (allergen handling capabilities)
  - Availability signals and waitlist
  - Showcase packages with pricing
  - Booking/inquiry links
  - OpenGraph image generation for social sharing
  - JSON-LD structured data for SEO
  - Public secondary entry cluster (multiple CTAs)
  - Follow handoff for social platforms
- Public event share pages (`/e/[shareToken]`)
- Public menu pages (`/menu/[token]`)
- Public proposal pages (`/proposal/[token]`)
- Gift card pages (`/chef/[slug]/gift-cards`)
- Chef's store (`/chef/[slug]/store`)
- Location-specific pages (`/chef/[slug]/locations/[locationId]`)

**Data source?** No. The external website platforms (Squarespace, Wix, WordPress) are publishing destinations.

**Client-collaborative angle:** None. This is a chef-only administrative task.

**Physical reality:** Desktop task, admin time. No physical constraints.

**Compounding:** High. Portfolio photos, testimonials, menu showcases, and credentials all compound over time. The ChefFlow profile auto-updates as new events complete, new reviews arrive, and new portfolio entries are added. A personal website requires manual mirroring of this data.

**Solution design:**

- ChefFlow already has a comprehensive public chef profile that serves as a full alternative to a personal website, with SEO, structured data, portfolio, reviews, booking, and gift cards
- The remaining gap is making chefs aware that `/chef/[slug]` can replace their personal website, and ensuring the profile is feature-complete enough to eliminate the need
- Add "export portfolio" function: generate a downloadable media kit (photos + bio + testimonials + menu highlights) that chefs can bulk-upload to their external website if they choose to keep one
- Add custom domain support (future): let chefs point their own domain to their ChefFlow profile page, fully eliminating the external website need
- Exit link exists in registry (category: marketing, label "Update website" with `{websiteAdminUrl}` context key)

**Where it appears:**

- `/chef/[slug]` (the profile itself, already live)
- `/marketing` page (exit link for those who still maintain external sites)
- Onboarding flow (educate about the public profile as website replacement)

**What remains as permanent exit:**

- Chefs with established websites and existing SEO authority may prefer to keep them
- Custom functionality (blog, online store with non-food items, custom branding beyond what ChefFlow offers)
- Chefs who want full design control over their web presence

**Priority:** Medium frequency (monthly updates) x Low effort (profile already exists) = Medium priority, mostly education
**Spec needed?** No. The public profile is already comprehensive. Remaining work (media kit export, custom domain) is enhancement-level.

---

## Scenario #36: Create marketing materials

**Original classification:** Permanent exit. Design tools are design tools.
**Reclassified to:** Partially Reducible

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** The chef needs flyers, business cards, social media graphics, menu cards for events, rate sheets, or branded collateral. The operational reason is professional presentation for client meetings, event handouts, and social media. They open Canva or Adobe and manually input their business info, select photos, and lay out the design. Much of the content (business name, services, sample menus, pricing, photos) already exists in ChefFlow.

**Context ChefFlow has:**

- Chef business name, display name, bio
- Logo and avatar
- Portfolio photos from events
- Menu data (courses, dishes, descriptions)
- Service types and pricing
- Contact info, service area
- Testimonials and review excerpts
- Social templates with platform-specific formatting
- Event details (for event-specific materials)
- Client data (for personalized proposals, already exported as PDFs)
- Existing PDF generation for proposals, contracts, invoices, and shopping lists

**Data source?** No. Design tools (Canva, Adobe) are creative destinations.

**Client-collaborative angle:** Minimal. Clients might request specific collateral (a printed menu card for their event), which ChefFlow could auto-generate from event menu data.

**Physical reality:** Chefs need printed materials for in-person events: menu cards on the table, rate sheets for tastings, business cards at farmers markets. PDF generation covers the functional need; the aesthetic gap is where Canva excels.

**Compounding:** Medium. Brand templates compound (build once, reuse). Menu card templates compound across events. But each piece of collateral is somewhat unique.

**Solution design:**

- Exit link exists in registry (category: marketing, label "Create design on Canva" linking to canva.com/design/create)
- Build "Export to Canva" data bridge: generate a pre-populated Canva design URL with chef's business info, selected photos, and menu data pre-filled (Canva's Content Planner API or URL parameters)
- Expand existing PDF generation to cover common collateral: printable menu cards from event menu data, one-page rate sheets from service/pricing data, event recap one-pagers
- AI-generated social graphics (Gemma 4 generates caption + layout suggestion, chef downloads and posts)
- Template library for common materials (business card layout, menu card layout) with ChefFlow data auto-fill

**Where it appears:**

- `/marketing` page (exit link panel)
- Event detail page ("Generate menu card" action)
- Chef profile settings ("Download media kit")
- Proposal/contract pages (existing PDF export)

**What remains as permanent exit:**

- Complex graphic design (custom illustrations, branded photography, sophisticated layout)
- Business card printing (design + order)
- Large-format materials (banners, signage)
- Video editing for marketing content
- Brand identity work (logo design, color palette, typography)

**Priority:** Medium frequency (per-event or monthly) x Medium effort (PDF templates + data bridge) = Medium priority
**Spec needed?** No. Incremental: expand existing PDF generation for menu cards and rate sheets, then explore Canva data bridge as a future enhancement.

---

## Scenario #37: Manage ads

**Original classification:** Permanent exit. Could track ad spend in financials.
**Reclassified to:** Bridgeable

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** The chef runs paid ads on Facebook/Instagram or Google to acquire new clients. The operational reason is filling their calendar during slow periods. They create ad campaigns, set budgets, target audiences, and monitor performance. This requires platform-specific tools (Facebook Ads Manager, Google Ads) with complex targeting, bidding, and creative management.

**Context ChefFlow has:**

- Client demographics and event history (informs targeting decisions)
- Service area / zip / region (geographic targeting context)
- Seasonal patterns (when business is slow, when ads should run)
- Financial tracking (could log ad spend as a marketing expense)
- Content performance data (which organic posts performed well, informing ad creative)
- Portfolio photos (potential ad creative assets)
- Push Dinners feature (themed dinner campaigns with booking links, an organic alternative to paid ads)
- Campaign performance with revenue attribution (30-day window post-send)
- Marketing campaign builder with audience segmentation

**Data source?** Partially. Facebook Marketing API and Google Ads API can report ad performance (spend, impressions, clicks, conversions). ChefFlow could ingest this for unified ROI tracking.

**Client-collaborative angle:** None. Ad management is entirely chef-side.

**Physical reality:** Desktop task, admin time. No physical constraints.

**Compounding:** Medium. Ad performance data compounds (learn what works). Audience segments and creative assets can be reused. But ad platforms evolve rapidly and ChefFlow should not try to replicate their functionality.

**Solution design:**

- Exit links exist in registry (category: marketing, label "Create Facebook Ad" with sub-link "Create Google Ad")
- Log ad spend as a marketing expense in ChefFlow's financial tracking, so marketing ROI is visible alongside event revenue
- Surface "best organic posts" from content performance data as ad creative candidates: "Your behind-the-scenes post from June 8 got 3x average engagement; consider boosting it"
- Push Dinners as the primary alternative to paid ads: themed dinner concepts with shareable booking links, personal client invitations, and seat-tracking; this is an organic acquisition channel that lives entirely in ChefFlow
- Future: ingest Facebook/Google ad performance data for unified marketing ROI dashboard (ad spend vs. inquiry volume vs. booking revenue)

**Where it appears:**

- `/marketing` page (exit link panel)
- `/marketing/push-dinners` (organic alternative to paid ads)
- Financial tracking (ad spend logging)
- Content performance page (ad creative suggestions)

**What remains as permanent exit:**

- All ad creation, targeting, bidding, and campaign management (Facebook Ads Manager, Google Ads)
- A/B testing ad creative on platforms
- Audience building and lookalike targeting
- Ad policy compliance and approval
- Retargeting pixel management

**Priority:** Low frequency (monthly or seasonal) x High effort (ad platform integration) = Low priority
**Spec needed?** No. The bridge pattern (exit links + expense tracking + Push Dinners as organic alternative) is sufficient. Full ad platform integration is overkill for the private chef market.

---

## Batch Summary

| #   | Title                                | Reclassified To     | Spec Needed? |
| --- | ------------------------------------ | ------------------- | ------------ |
| 32  | Post food photos to Instagram/TikTok | Partially Reducible | No           |
| 33  | Update Google Business Profile       | Bridgeable          | No           |
| 34  | Respond to Yelp/Google reviews       | Bridgeable          | No           |
| 35  | Update personal website/portfolio    | Partially Reducible | No           |
| 36  | Create marketing materials           | Partially Reducible | No           |
| 37  | Manage ads                           | Bridgeable          | No           |

### Classification Breakdown

- **Partially Reducible:** 3 (#32, #35, #36)
- **Bridgeable:** 3 (#33, #34, #37)
- **Reducible:** 0
- **Permanent:** 0 (all reclassified from original "Permanent")

### Key Findings

1. **ChefFlow's social publishing stack is far more mature than the original "Permanent" classification suggests.** The content pipeline, template library, OAuth connections, publishing engine with 7 platform adapters, and content performance tracking already eliminate most of the friction in scenario #32.
2. **The public chef profile (`/chef/[slug]`) is a near-complete website replacement** for scenario #35, with SEO, structured data, portfolio, reviews, booking, gift cards, and more.
3. **Push Dinners is an organic marketing channel** that partially addresses scenario #37 (ads) by giving chefs a way to proactively fill their calendar without paid ads.
4. **The Reputation Studio** provides the foundation for scenario #34 (review responses), needing only external review ingestion to close the loop.
5. **None of these scenarios need standalone specs.** The existing architecture handles the reducible portions; remaining work is incremental enhancements within existing systems.
