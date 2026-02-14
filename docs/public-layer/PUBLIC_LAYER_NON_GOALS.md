# Public Layer - Non-Goals

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Purpose

This document explicitly defines what the Public Layer **will NOT do** in V1. These are intentional exclusions to maintain scope discipline and prevent feature creep.

---

## Category 1: Marketplace Features

### ❌ Chef Directory
**What it would be**: Public listing of all registered chefs with profiles, photos, specialties, and ratings.

**Why excluded**:
- Requires complex filtering/search logic
- Requires chef profile management UI
- Requires moderation system
- Requires photo upload/storage
- Not essential for MVP - chefs acquire clients through external channels

**Alternative**: Chefs share their personal booking link (invitation-based model only)

---

### ❌ Public Chef Profiles
**What it would be**: Individual landing pages for each chef (`/chef/[chefId]`) with portfolio, menu samples, reviews.

**Why excluded**:
- Requires dynamic route generation
- Requires media storage (S3/Supabase Storage)
- Requires review system
- Adds complexity to tenant isolation (public data + private data)

**Alternative**: Chefs use external portfolio (Instagram, website)

---

### ❌ Search & Filtering
**What it would be**: Search bar to find chefs by location, cuisine type, price range, availability.

**Why excluded**:
- Requires Algolia/ElasticSearch integration
- Requires geolocation indexing
- Requires availability calendar system
- High complexity for minimal V1 value

**Alternative**: N/A - no public chef discovery in V1

---

## Category 2: Content Management

### ❌ Blog / CMS
**What it would be**: Content management system for blog posts, recipes, cooking tips.

**Why excluded**:
- Requires admin panel for content creation
- Requires rich text editor
- Requires SEO optimization per post
- Requires database schema for posts/categories
- Not essential for core product functionality

**Alternative**: Link to external blog (Medium, Substack) if needed

---

### ❌ FAQ Page
**What it would be**: Frequently asked questions with expandable answers.

**Why excluded**:
- Content not yet validated (we don't know what users will ask)
- Can be added post-V1 based on real user questions
- Low priority compared to core functionality

**Alternative**: Add in V1.1 if needed, based on support tickets

---

### ❌ Downloadable Resources
**What it would be**: PDFs, guides, templates for chefs (e.g., "How to Price Your Services").

**Why excluded**:
- Requires file storage
- Requires download tracking
- Requires content creation effort
- Not essential for product launch

**Alternative**: N/A - focus on product, not content marketing

---

## Category 3: User Engagement Features

### ❌ Newsletter Signup
**What it would be**: Email capture form for marketing newsletter.

**Why excluded**:
- Requires email marketing platform integration (Mailchimp, SendGrid)
- Requires double opt-in flow
- Requires unsubscribe management
- Not essential for V1 launch

**Alternative**: Use inquiry form to collect leads, manually add to email list if needed

---

### ❌ Live Chat Widget
**What it would be**: Real-time chat support (Intercom, Drift, Crisp).

**Why excluded**:
- Requires 24/7 support coverage (or manage expectations)
- Requires chat software integration
- Requires support team training
- Not scalable at early stage

**Alternative**: Contact form (inquiry page) or email support

---

### ❌ Testimonials (Real User Reviews)
**What it would be**: Display real reviews from clients about chefs.

**Why excluded**:
- Requires review collection system
- Requires moderation workflow
- Requires schema for reviews table
- No users yet to leave reviews!

**Alternative**: Use placeholder testimonials (stock or hypothetical) for social proof

---

### ❌ Referral Program
**What it would be**: Invite-a-friend system with rewards/credits.

**Why excluded**:
- Requires referral tracking system
- Requires credit/discount system
- Requires payment adjustments
- Adds complexity to financial ledger

**Alternative**: Manual referral tracking (if needed) post-V1

---

## Category 4: Internationalization & Localization

### ❌ Multi-Language Support
**What it would be**: Translation system for Spanish, French, etc.

**Why excluded**:
- Requires translation infrastructure (i18n library)
- Requires content duplication in multiple languages
- Requires locale-specific date/currency formatting
- English-only market for V1

**Alternative**: N/A - English only for V1

---

### ❌ Currency Conversion
**What it would be**: Display prices in multiple currencies (USD, EUR, GBP).

**Why excluded**:
- Requires real-time exchange rate API
- Requires currency formatting logic
- USD-only for V1 (Stripe default)

**Alternative**: N/A - USD only

---

### ❌ Timezone Localization
**What it would be**: Display event times in user's local timezone.

**Why excluded**:
- Requires timezone detection
- Requires timezone conversion logic
- Requires explicit timezone selection UI
- V1 assumes single-market (e.g., US-based chefs)

**Alternative**: Store times in UTC, display in server's timezone

---

## Category 5: Advanced UI/UX Features

### ❌ Dark Mode
**What it would be**: Toggle between light and dark color schemes.

**Why excluded**:
- Requires duplicate color palette
- Requires persistent user preference storage
- Requires testing all pages in both modes
- Not essential for product functionality

**Alternative**: N/A - light mode only

---

### ❌ Accessibility Beyond WCAG AA
**What it would be**: Full WCAG AAA compliance, screen reader optimization, keyboard navigation advanced features.

**Why excluded**:
- WCAG AA is sufficient for legal compliance
- AAA requires significant additional effort
- Diminishing returns for MVP

**Alternative**: Ensure WCAG AA compliance (minimum viable accessibility)

---

### ❌ Interactive Animations
**What it would be**: Smooth page transitions, parallax scrolling, animated illustrations.

**Why excluded**:
- Performance overhead (JavaScript bundle size)
- Accessibility concerns (motion sickness)
- Not essential for usability

**Alternative**: Simple CSS transitions only (hover states, fade-ins)

---

### ❌ Progressive Web App (PWA)
**What it would be**: Installable web app with offline support.

**Why excluded**:
- Requires service worker setup
- Requires offline data sync strategy
- Requires push notification permissions
- Low priority for V1

**Alternative**: N/A - standard web app only

---

## Category 6: Analytics & Tracking

### ❌ Google Analytics / Mixpanel
**What it would be**: Detailed user behavior tracking, funnel analysis, conversion optimization.

**Why excluded**:
- Requires GDPR/CCPA compliance (cookie consent banners)
- Requires analytics configuration
- Requires tracking plan definition
- Can be added post-launch without code changes

**Alternative**: Add in V1.1 if needed - server logs sufficient for initial monitoring

---

### ❌ A/B Testing Framework
**What it would be**: Test multiple variants of pages to optimize conversion.

**Why excluded**:
- Requires traffic splitting logic
- Requires statistical significance monitoring
- Requires sufficient traffic (not available at launch)
- Premature optimization

**Alternative**: Launch single version, iterate based on user feedback

---

### ❌ Heatmaps / Session Recordings
**What it would be**: Visual tracking of user clicks, scrolls, mouse movements (Hotjar, FullStory).

**Why excluded**:
- Privacy concerns (requires consent)
- Performance overhead
- Not essential for V1 launch

**Alternative**: User interviews and direct feedback

---

## Category 7: Third-Party Integrations

### ❌ Social Login (Google, Facebook OAuth)
**What it would be**: Sign in with Google/Facebook instead of email/password.

**Why excluded**:
- Requires OAuth integration with multiple providers
- Requires fallback for users without social accounts
- Email/password is simpler and sufficient

**Alternative**: Email/password only (Supabase Auth built-in)

---

### ❌ Calendar Integration
**What it would be**: Sync events to Google Calendar, Outlook, Apple Calendar.

**Why excluded**:
- Requires OAuth scopes for calendar access
- Requires calendar API integration
- Requires sync conflict resolution
- Not essential for V1

**Alternative**: Manual calendar entry by users

---

### ❌ Zapier / Automation Integrations
**What it would be**: Connect ChefFlow to other apps (CRM, email marketing, etc.).

**Why excluded**:
- Requires API development
- Requires webhook infrastructure
- Requires Zapier partnership/listing
- Low priority for early stage

**Alternative**: N/A - manual data export if needed

---

## Category 8: Marketing & Growth Tools

### ❌ SEO-Optimized Blog Posts
**What it would be**: Pre-written blog content for organic search traffic.

**Why excluded**:
- Content creation is time-intensive
- SEO takes months to show results
- Not essential for product launch

**Alternative**: Focus on product, add content post-V1 if needed

---

### ❌ Email Drip Campaigns
**What it would be**: Automated email sequences for onboarding, engagement, re-engagement.

**Why excluded**:
- Requires email marketing platform
- Requires copywriting and design
- Requires email deliverability setup (SPF, DKIM, DMARC)
- Not essential for MVP

**Alternative**: Manual email outreach if needed

---

### ❌ Landing Page Variants
**What it would be**: Multiple landing pages for different audiences (chefs vs clients, different niches).

**Why excluded**:
- Requires content duplication
- Requires A/B testing
- Single landing page is sufficient for V1

**Alternative**: One landing page, iterate based on feedback

---

## Category 9: Advanced Inquiry Features

### ❌ Multi-Step Inquiry Form
**What it would be**: Wizard-style form with multiple pages (step 1: event details, step 2: contact info, etc.).

**Why excluded**:
- Higher abandonment rate (more steps = more friction)
- More complex state management
- Single-page form is simpler and faster

**Alternative**: Single-page form with all fields visible

---

### ❌ File Upload (Attach Photos/Documents)
**What it would be**: Allow users to attach inspiration photos, dietary restriction docs, etc.

**Why excluded**:
- Requires file storage (S3/Supabase Storage)
- Requires virus scanning
- Requires file size limits and validation
- Not essential for initial inquiry

**Alternative**: Users can describe needs in text field, share links if needed

---

### ❌ Inquiry Auto-Response Email
**What it would be**: Send confirmation email to user after inquiry submission.

**Why excluded**:
- Requires transactional email service (SendGrid, Resend)
- Requires email template design
- Requires email deliverability setup
- Not essential for V1 (confirmation screen is sufficient)

**Alternative**: Show success message on screen, add email confirmation in V1.1

---

### ❌ Inquiry Assignment to Chefs
**What it would be**: Automatically route inquiries to specific chefs based on location, availability, cuisine type.

**Why excluded**:
- Requires chef availability tracking
- Requires location/cuisine data on chefs
- Requires matching algorithm
- V1 is single-chef per tenant (no marketplace)

**Alternative**: N/A - inquiries are general leads, not routed to specific chefs

---

## Category 10: Performance & Scalability (Deferred)

### ❌ CDN Optimization (Beyond Vercel Default)
**What it would be**: Custom CDN config, edge caching rules, regional optimization.

**Why excluded**:
- Vercel provides global CDN by default
- Premature optimization
- Sufficient performance for V1 traffic levels

**Alternative**: Use Vercel's built-in CDN

---

### ❌ Image CDN (Cloudinary, Imgix)
**What it would be**: Dynamic image optimization, resizing, format conversion.

**Why excluded**:
- Next.js Image component handles optimization
- Additional service adds cost and complexity
- Not needed for limited imagery in V1

**Alternative**: Next.js `<Image>` component with default optimization

---

### ❌ Advanced Caching Strategy
**What it would be**: Redis caching layer, database query caching, incremental static regeneration.

**Why excluded**:
- V1 traffic doesn't warrant caching complexity
- Static pages are already fast
- Can add if performance becomes issue

**Alternative**: Static page generation (already fast)

---

## Category 11: Legal & Compliance (Deferred)

### ❌ Cookie Consent Banner (GDPR)
**What it would be**: Cookie consent UI for European users.

**Why excluded**:
- V1 targets US market only
- No tracking cookies in V1 (no analytics)
- GDPR compliance deferred until needed

**Alternative**: Add if expanding to EU market

---

### ❌ Data Export / Right to Deletion (GDPR)
**What it would be**: User-facing tools to download or delete personal data.

**Why excluded**:
- Manual process is acceptable for V1
- Automated tools are complex to build
- Not required for US-only launch

**Alternative**: Manual data export/deletion via support request

---

### ❌ Terms & Privacy (Full Legal Review)
**What it would be**: Attorney-reviewed, comprehensive legal documents.

**Why excluded**:
- Cost and time for legal review
- Placeholder terms are sufficient for early testing
- Full legal review before public launch (post-MVP)

**Alternative**: Use template terms/privacy for V1, get legal review before scale

---

## Acceptance Criteria

Public Layer is considered "complete" **without** any of these features. If a feature is on this list, it MUST NOT be implemented in V1.

**Exception Process**:
If a feature on this list is later deemed critical, it requires:
1. Written justification
2. Scope unlock (update to this document)
3. Explicit approval
4. Version bump to V1.1

---

**Status**: This non-goals list is LOCKED. These features will NOT ship in V1.
