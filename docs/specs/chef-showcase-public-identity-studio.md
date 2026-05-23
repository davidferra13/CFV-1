# Spec: Chef Showcase Public Identity Studio

> **Status:** draft
> **Priority:** P0
> **Depends on:** public-profile-and-marketplace-trust-visual-upgrade, chef-reputation-studio-for-reviews-testimonials-and-social-proof, unified-review-command-center-with-source-links, chef-settings-and-public-profile-media-upload-completeness, public-discovery-and-directory-media-upload-coverage, dinner-circle-growth-engine-google-reviews-guest-leads-follow
> **Estimated complexity:** large (9+ files, migrations, multiple routes, multiple role surfaces)

## Timeline

| Event            | Date       | Agent/Session | Commit |
| ---------------- | ---------- | ------------- | ------ |
| Created          | 2026-05-20 | Codex         |        |
| Status: ready    |            |               |        |
| Claimed          |            |               |        |
| Spike completed  |            |               |        |
| Pre-flight       |            |               |        |
| Build completed  |            |               |        |
| Type check       |            |               |        |
| Runtime proof    |            |               |        |
| Status: verified |            |               |        |

---

## Developer Notes

### Raw Signal

The developer asked whether the chef user has the opportunity to present all of their work history, media assets, links, bio, service packages, a follow button, and other public-facing professional proof. The developer then asked to "make a spec for everything."

### Developer Intent

- **Core goal:** Give each chef a complete public identity, showcase, reputation, media, services, and follow system that turns their work history into trust, bookings, followers, referrals, and repeat demand.
- **Key constraints:** Do not expose private tenant, client, guest, event, media, or review data without explicit approval and consent. Do not scatter the experience across disconnected settings pages. Do not build a fake marketing shell that looks complete but cannot be managed by the chef.
- **Motivation:** ChefFlow already has pieces of public profile, portfolio, media, reviews, services, and Dinner Circle growth, but the chef needs a single professional surface where everything they are proud of can be presented and acted on.
- **Success from the developer's perspective:** A chef can open one studio, complete every public profile/work/proof/service/follow field, preview exactly what clients see, publish with confidence, and track what the showcase produces.

---

## What This Does

Chef Showcase Public Identity Studio becomes the chef's canonical public presence builder. It merges profile basics, career/work history, media assets, portfolio collections, service packages, links, reviews, testimonials, social proof, follow/join actions, profile analytics, consent controls, and booking handoff into one chef-managed system. Public visitors see a rich chef profile that feels like a professional portfolio and conversion surface, not a thin directory listing.

## Why It Matters

The public chef profile is the trust engine for discovery, inquiry, rebooking, referrals, Dinner Circles, and post-event growth. If the chef cannot show credible work, proof, packages, and follow paths, ChefFlow loses demand that should compound after every event.

---

## Current Baseline To Reuse

| Surface                 | Current Evidence                                                                                                                                                                                                                        | Reuse Direction                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Public chef profile     | `app/(public)/chef/[slug]/page.tsx` already renders profile, booking, socials, reviews, portfolio, portfolio entries, locations, and inquiry CTAs.                                                                                      | Treat as public rendering baseline. Refactor only where needed.                  |
| Profile basics          | `app/(chef)/settings/my-profile/chef-profile-form.tsx` supports display name, tagline, bio, website, Google review URL, social links, and profile image.                                                                                | Reuse fields, then consolidate into Showcase Studio navigation.                  |
| Public profile settings | `app/(chef)/settings/public-profile/page.tsx` and `components/settings/public-profile-settings.tsx` manage slug, tagline/background, partners, and discovery settings.                                                                  | Reuse as publishing and visibility tab.                                          |
| Portfolio               | `app/(chef)/portfolio/page.tsx`, `components/portfolio/*`, `lib/portfolio/actions.ts`, and `lib/profile/portfolio-actions.ts` support gallery, curated items, collections, public link, event-linked entries, and public/private state. | Reuse as Media and Portfolio tabs.                                               |
| Services                | `app/(chef)/settings/my-services/page.tsx` and `lib/chef/service-config-actions.ts` manage operational service config, minimums, add-ons, dietary handling, policies, and communication behavior.                                       | Convert public-safe parts into package display and inquiry prefill.              |
| Reviews                 | `components/public/review-showcase.tsx` and `lib/reviews/public-actions.ts` support public review feeds.                                                                                                                                | Reuse for proof/reputation tab.                                                  |
| Save/follow fragments   | `components/discovery/save-chef-button.tsx`, `lib/discovery/saved-chefs.ts`, Dinner Circle growth queue item, and public shortlist behavior show partial save/follow intent.                                                            | Build a true follow system instead of only local save.                           |
| Media/upload blockers   | Existing blocked queue items cover public profile media upload completeness and public discovery media upload coverage.                                                                                                                 | Make this spec the umbrella contract and keep upload implementation coordinated. |

---

## Product Principle

This is not only "edit public profile." It is the chef's living proof system.

Every public claim should answer:

- What does this chef do?
- Where have they done it?
- What can I see?
- What proof exists?
- What package can I choose?
- How do I follow, book, inquire, share, or refer?
- What is public, private, consented, pending, or missing?

---

## Deep-Pass Validation

### Status

This is the first deep-pass run for the Chef Showcase zone. The zone is fresh, high-yield, and not saturated. The highest-risk gap in the initial draft was not missing feature ideas; it was missing the hard contracts that prevent a public profile project from turning into a privacy leak, fake website builder, or disconnected marketing shell.

### Selected Lenses

| Lens            | Why Selected                                                                                                                               | Source Basis                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Take a Chef     | Private chef discovery and booking require profile, menu, guest count, service style, and price expectation to be understood together.     | Cached over-the-shoulder source card: Take a Chef.                  |
| HoneyBook       | Service packages should connect to inquiry, proposal, contract, invoice, and next step state instead of becoming static cards.             | Cached over-the-shoulder source card: HoneyBook services/proposals. |
| Tock            | Booking intent needs availability, deposit/commitment expectations, capacity, and timing boundaries.                                       | Cached over-the-shoulder source card: Tock and deposits.            |
| Airbnb          | Public trust in hospitality depends on strong visuals, reviews, host/person context, expectations, and policies.                           | Cached over-the-shoulder source card: Airbnb marketplace trust.     |
| Stripe          | Package and booking flows must avoid client-side-only commitment state and keep payment/booking state authoritative.                       | Cached over-the-shoulder source card: Stripe Payment Intents.       |
| Google SRE      | A public profile that affects leads and money needs runtime proof, clear success criteria, and observable failure states.                  | Cached over-the-shoulder source card: Google SRE.                   |
| ChefFlow Native | ChefFlow already has profile, reviews, services, portfolio, Dinner Circles, and discovery rails. The move is convergence, not reinvention. | Current repo surfaces and queue items listed above.                 |

### Expert-Validated Moves

1. **Make Showcase the canonical public identity workspace.** Endorsed because scattered settings pages create incomplete profiles and inconsistent public output. Caveat: reuse existing profile/settings/service/portfolio modules instead of rewriting them.
2. **Separate presentation packages from operational service config.** Endorsed because public package cards need buyer clarity while internal service config needs operational precision. Caveat: package cards must point back to actual service constraints and never invent availability or price certainty.
3. **Build follow as a consented growth primitive, not a heart icon.** Endorsed because Dinner Circles, referrals, post-event loops, and public discovery all need a durable identity/follow state. Caveat: follow collection must respect consent and unsubscribe from day one.
4. **Treat media and proof as governed assets.** Endorsed because photos, reviews, client names, venues, and event stories are high-trust and high-risk. Caveat: public profile should hide weak/unsafe proof rather than ask the builder to fill gaps with placeholders.
5. **Add analytics as first-class conversion evidence.** Endorsed because the chef needs to know whether the public profile creates follows, inquiry starts, package clicks, review-link opens, referrals, and bookings. Caveat: analytics must not become a PII sink.
6. **Give public profile a deterministic read model.** Endorsed because public rendering should be simple, fast, and safe. Caveat: do not let public components query raw tenant tables directly.

### Rejected

- **Arbitrary website builder:** rejected because it creates huge design, security, and support scope while the real need is a structured professional showcase.
- **Auto-import every external profile in V1:** rejected because importers create verification, rate-limit, copyright, and stale-data problems. Manual links and proof are enough for the first build.
- **Public follower counts by default:** rejected because small or private chefs can be harmed by low counts, sensitive guests, or misleading social proof.
- **AI-written public claims without approval:** rejected because credibility and legal risk are worse than sparse copy. AI can draft privately; chef approval is canonical.

### Pause When

Pause deepening after this pass until at least one of these changes happens:

- A queue item is fired for Showcase.
- Media upload coverage is unblocked.
- Dinner Circle follow/review growth lands.
- Unified review command center changes public review display contracts.
- The public chef profile route changes substantially.

---

## User Roles

| Role           | Needs                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| Chef           | Manage profile, proof, media, packages, links, follow audience, visibility, and analytics.           |
| Public visitor | Understand chef identity, trust, style, pricing expectations, work examples, and next actions.       |
| Client         | Revisit chef proof, rebook, follow updates, approve public proof, and share/referral links.          |
| Guest          | Follow the chef, leave a Google review, approve event proof, book their own event, or join a circle. |
| Admin/staff    | Moderate public visibility, troubleshoot unsafe content, and inspect audit trails.                   |

---

## Scope

### In Scope

1. Unified chef-facing Showcase Studio route.
2. Public profile completion checklist and preview.
3. Work history and career highlights.
4. Media asset vault for profile-safe assets.
5. Portfolio collections and public story sections.
6. Service package cards tied to inquiry and booking.
7. Links hub for website, socials, press, menus, Google reviews, and external profiles.
8. Follow/join/save system with visitor opt-in states.
9. Public proof controls for reviews, testimonials, photos, press, clients, venues, and event examples.
10. Consent, privacy, rights, moderation, and public/private state.
11. Analytics for profile views, follows, link clicks, inquiries, package clicks, review-link opens, shares, and conversions.
12. Public profile rendering upgrades needed to expose the above.
13. Discovery card and inquiry handoff integration.
14. Command palette and navigation access.
15. Runtime proof pack and finish-gate verification.

### Out Of Scope

- Building a full website builder with arbitrary sections, custom domains, CSS editing, or drag-anywhere layout.
- Sending public posts automatically to social platforms.
- Importing from LinkedIn, Take a Chef, Instagram, Google Business Profile, or other external providers in V1.
- Publicly exposing private client names, private event details, guest identities, home addresses, invoices, menus, documents, or internal notes.
- Incentivizing reviews. Review CTAs must ask only for genuine experience reviews.

---

## Routes

### Chef-Facing Routes

| Route                               | Purpose                                                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| `/showcase` or `/settings/showcase` | Main Studio. Preferred route: `/showcase` if nav allows a primary chef work surface.   |
| `/showcase/profile`                 | Identity, bio, links, socials, website, slug, public preview.                          |
| `/showcase/work-history`            | Career timeline, prior roles, notable clients/categories, awards, press, achievements. |
| `/showcase/media`                   | Media vault filtered to public-safe assets.                                            |
| `/showcase/portfolio`               | Collections, event stories, portfolio entries, menu highlights, public visibility.     |
| `/showcase/services`                | Public-facing service packages and package inquiry behavior.                           |
| `/showcase/proof`                   | Reviews, testimonials, press, Google review link, consented public proof.              |
| `/showcase/followers`               | Follows, sources, segments, permissions, export-safe analytics.                        |
| `/showcase/analytics`               | Views, CTA clicks, follows, inquiries, conversions, top assets, broken links.          |
| `/showcase/preview`                 | Authenticated preview of public profile states.                                        |

### Public Routes

| Route                           | Purpose                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `/chef/[slug]`                  | Main public profile and showcase.                                               |
| `/chef/[slug]/portfolio`        | Optional deep public portfolio route if profile length becomes too heavy.       |
| `/chef/[slug]/services`         | Optional package-focused public route for SEO and direct package links.         |
| `/chef/[slug]/follow`           | Follow action endpoint/page if accountless follow needs email/SMS verification. |
| `/chef/[slug]/inquire?package=` | Inquiry handoff with selected service package context.                          |

### Route Registration

If new routes are added, update `lib/auth/route-policy.ts`:

- Chef protected: all `/showcase` routes.
- Public unauthenticated: public chef profile and follow landing routes.
- Any API route must self-authenticate or remain explicitly public with no tenant/private data leakage.

---

## Information Architecture

### Studio Navigation

1. Overview
2. Profile
3. Work History
4. Media
5. Portfolio
6. Services
7. Proof
8. Followers
9. Analytics
10. Preview

### Overview Cards

| Card                   | Shows                                                         | Primary Action      |
| ---------------------- | ------------------------------------------------------------- | ------------------- |
| Profile completeness   | Missing fields, public-safe warnings, profile URL.            | Complete next field |
| Public proof readiness | Reviews, testimonials, photos, press, consent queue.          | Review proof        |
| Service readiness      | Published packages, package gaps, inquiry handoff state.      | Edit packages       |
| Follow growth          | Followers, recent follows, source attribution, opt-in health. | View followers      |
| Conversion health      | Views, inquiry clicks, package clicks, booking starts.        | View analytics      |
| Risk and privacy       | Unapproved media, broken external links, stale claims.        | Fix issues          |

---

## Canonical State Model

### Showcase Status

| Status                 | Meaning                                             | Public Behavior                                                     | Chef Behavior                                             |
| ---------------------- | --------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------- |
| `draft`                | Chef has not published the Showcase system yet.     | Existing public profile can render baseline safe profile data only. | Studio shows setup checklist and preview.                 |
| `review_needed`        | Public data exists but has blocking issues.         | Hide unsafe sections and show only already-approved public data.    | Studio shows required fixes before publish.               |
| `published`            | Public-safe read model is valid.                    | Public profile renders Showcase sections.                           | Studio shows live status, analytics, and draft changes.   |
| `published_with_draft` | Live version exists and chef has unpublished edits. | Public profile renders last published version.                      | Studio shows compare, preview, publish, discard.          |
| `unpublished`          | Chef intentionally removed Showcase.                | Public route shows minimal safe fallback or hidden state.           | Studio preserves drafts and explains public impact.       |
| `suspended`            | Admin or safety gate disabled public display.       | Public route hides Showcase sections.                               | Chef sees escalation/support state, not publish controls. |

### Asset Visibility

| State                    | Meaning                                             | Can Appear Publicly                |
| ------------------------ | --------------------------------------------------- | ---------------------------------- |
| `private`                | Chef-only asset.                                    | No                                 |
| `portfolio_only`         | Safe for chef portfolio but not broader marketing.  | Only in approved portfolio context |
| `public_pending_consent` | Intended for public display but consent is missing. | No                                 |
| `public_pending_review`  | Consent exists but chef/admin review is pending.    | No                                 |
| `public_approved`        | Approved for public display.                        | Yes                                |
| `revoked`                | Consent or rights were removed.                     | No                                 |
| `archived`               | Retained for history but no longer active.          | No                                 |

### Proof Status

| State             | Meaning                                  | Public Behavior                          |
| ----------------- | ---------------------------------------- | ---------------------------------------- |
| `unreviewed`      | Imported or captured but not classified. | Hidden                                   |
| `private_note`    | Useful internally, not public proof.     | Hidden                                   |
| `public_source`   | Already public external source.          | Can display with source link if safe     |
| `client_approved` | Client explicitly approved public use.   | Can display                              |
| `guest_approved`  | Guest explicitly approved public use.    | Can display with approved identity level |
| `featured`        | Chef selected it as a top proof item.    | Prioritize in public layout              |
| `revoked`         | Approval removed or source unsafe.       | Hidden                                   |

### Follow Lifecycle

| State                  | Meaning                                                               | Allowed Actions                                             |
| ---------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------- |
| `anonymous_click`      | Visitor clicked follow but has not submitted contact or identity.     | Show follow modal and source attribution.                   |
| `pending_verification` | Contact submitted but not verified if verification is required.       | Resend verification, edit preferences.                      |
| `active`               | Follow is valid and consent preferences are stored.                   | Receive approved updates, unfollow, update preferences.     |
| `muted`                | Follower remains connected but receives no updates.                   | Unmute, unfollow.                                           |
| `unsubscribed`         | Follower opted out.                                                   | No marketing sends; allow resubscribe with explicit action. |
| `suppressed`           | System/admin suppression for abuse, bounce, complaint, or compliance. | No sends; chef sees aggregate only.                         |

---

## Public Read Model

Do not let the public profile assemble itself from raw tables ad hoc. Build one public-safe read model that can be unit tested.

### `PublicChefShowcase`

```ts
type PublicChefShowcase = {
  chef: PublicChefIdentity
  status: 'draft' | 'published' | 'unpublished' | 'suspended'
  hero: PublicShowcaseHero | null
  trustSummary: PublicTrustSummary
  packages: PublicServicePackage[]
  portfolioCollections: PublicPortfolioCollection[]
  workHistory: PublicWorkHistoryEntry[]
  media: PublicMediaAsset[]
  proof: PublicProofItem[]
  links: PublicChefLink[]
  follow: PublicFollowConfig
  inquiry: PublicInquiryConfig
  seo: PublicShowcaseSeo
}
```

### Public Data Contract

| Field Group  | Source                                                   | Public Filter                                                             |
| ------------ | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| Identity     | `chefs`, discovery profile, marketplace profile          | Published profile fields only.                                            |
| Packages     | `chef_service_packages`, service config                  | `is_public = true`; package copy cannot contradict service config.        |
| Portfolio    | `portfolio_entries`, portfolio items, event photos       | Public visibility and consent approved only.                              |
| Work history | `chef_work_history_entries`                              | `is_public = true`; no private client names unless explicit proof exists. |
| Media        | `chef_showcase_media_assets` plus existing media sources | `public_approved` only.                                                   |
| Proof        | reviews/testimonials/external reviews/profile highlights | Public-approved or public-source only.                                    |
| Follow       | `chef_followers` config/aggregate                        | Public config only; no follower identities.                               |
| Analytics    | `chef_showcase_events`                                   | Aggregates only.                                                          |

### Public Profile Fallback Rules

- If Showcase is not published, continue rendering the current public profile baseline where safe.
- If one section is empty, omit that section or show a compact honest empty state only where useful.
- Never show fake stats, fake reviews, fake packages, fake availability, or placeholder chef work.
- If a package exists but inquiry is disabled, show "Currently not accepting inquiries" with no dead CTA.
- If follow is disabled, hide follow controls but keep share/book/inquiry actions.

---

## Public Profile Content Model

### Identity

- Display name
- Business name
- Slug
- Tagline
- Short intro
- Long bio
- Profile image
- Logo
- Hero/background media
- Service area
- Cuisine/style tags
- Dietary specialty tags
- Languages
- Response-time expectation
- Booking model: inquiry only, instant book, website handoff, both

### Work History

- Career timeline entries
- Prior restaurant or hospitality roles
- Private chef roles
- Popups, residencies, catering/event history
- Notable event categories, not private names by default
- Awards and certifications
- Press mentions
- Culinary school/apprenticeship
- Charity/community work
- Brand or venue collaborations
- Years of experience
- Signature achievements

### Media Assets

- Profile images
- Logo/brand images
- Hero images
- Dish photos
- Event photos
- Venue/service photos
- Menu PDFs or images
- Press images
- Short video clips or external video links
- Social-ready crops
- OG/social share image
- Alt text, captions, rights, visibility, source event, consent status

### Portfolio

- Featured collection
- Collections by event type, season, cuisine, service style, venue, package, or menu format
- Event-linked story entries
- Menu highlights
- Guest count range
- Event date or season
- Photo grid
- Testimonial linkage
- Public/private toggle
- Consent state
- Display order

### Service Packages

Each public service package supports:

- Name
- Short description
- Best-for label
- Guest count range
- Starting price, minimum spend, or "inquire"
- Included services
- Optional add-ons
- Lead time
- Service area limitations
- Deposit/payment expectation
- Cancellation/reschedule notes
- Allergy/dietary capability notes
- Sample menu or portfolio links
- Package-specific inquiry CTA
- Public visibility state
- Internal notes hidden from public

### Links

- Website
- Google review link
- Instagram
- TikTok
- Facebook
- YouTube
- Linktree
- Press links
- External marketplace profiles
- Menu PDFs
- Gift cards/store links
- Booking/inquiry links
- Share profile
- QR codes for follow, review, book, and portfolio

### Proof

- Public-approved reviews
- Featured testimonials
- Google review link and Google review proof summary
- Press mentions
- Awards
- Certifications
- Insurance/license badges where appropriate
- Approved client/venue logos only when permission exists
- Verified event badges
- ChefFlow-generated trust summaries that cite public-safe evidence

### Follow System

Public visitors, guests, and clients can:

- Follow chef
- Save chef
- Join chef Dinner Circle
- Subscribe to updates
- Choose update types: availability, events, menus, classes/popups, packages, openings, seasonal menus
- Unfollow/unsubscribe
- Share referral link
- Book or inquire from follow confirmation

Chef can:

- See follower count
- See source attribution
- Segment by public visitor, guest, client, past attendee, referral, Dinner Circle member
- See conversion from follow to inquiry/book/review/referral
- Send updates only through approved communication channels and consent states
- Avoid showing private follower identities publicly by default

---

## Data Model

Prefer additive tables and columns. Reuse existing tables where they already represent the source of truth.

### New Tables

```sql
create table chef_work_history_entries (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  title text not null,
  organization text,
  location text,
  entry_type text not null,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text,
  proof_url text,
  media_asset_id uuid,
  display_order integer not null default 0,
  is_public boolean not null default false,
  visibility_status text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table chef_service_packages (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  name text not null,
  slug text not null,
  short_description text,
  full_description text,
  best_for text,
  guest_count_min integer,
  guest_count_max integer,
  starting_price_cents integer,
  minimum_spend_cents integer,
  pricing_label text,
  included_services jsonb not null default '[]'::jsonb,
  add_ons jsonb not null default '[]'::jsonb,
  sample_menu_refs jsonb not null default '[]'::jsonb,
  portfolio_refs jsonb not null default '[]'::jsonb,
  lead_time_days integer,
  service_area_note text,
  booking_policy_note text,
  dietary_note text,
  display_order integer not null default 0,
  is_public boolean not null default false,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chef_id, slug)
);

create table chef_showcase_media_assets (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  source_kind text not null,
  source_id uuid,
  asset_type text not null,
  url text not null,
  storage_path text,
  title text,
  caption text,
  alt_text text,
  credit text,
  rights_status text not null default 'unknown',
  consent_status text not null default 'unknown',
  visibility_status text not null default 'private',
  tags jsonb not null default '[]'::jsonb,
  focal_point jsonb,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table chef_followers (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  client_id uuid,
  guest_id uuid,
  email text,
  phone text,
  display_name text,
  source_kind text not null,
  source_id uuid,
  source_url text,
  follower_type text not null default 'public',
  status text not null default 'pending',
  consent_email boolean not null default false,
  consent_sms boolean not null default false,
  consent_marketing boolean not null default false,
  preferences jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  followed_at timestamptz not null default now(),
  unfollowed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table chef_showcase_events (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references chefs(id) on delete cascade,
  actor_kind text not null default 'anonymous',
  actor_id uuid,
  event_name text not null,
  source_route text,
  target_kind text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

### New Columns On Existing Tables

```sql
alter table chefs
  add column if not exists public_showcase_status text not null default 'draft',
  add column if not exists public_showcase_updated_at timestamptz,
  add column if not exists public_showcase_published_at timestamptz,
  add column if not exists public_showcase_config jsonb not null default '{}'::jsonb;

alter table portfolio_entries
  add column if not exists showcase_section text,
  add column if not exists proof_status text not null default 'unreviewed';
```

### RLS And Security

- Chef-facing tables must require `requireChef()` in all server actions.
- All tenant-owned reads and writes must scope by `chef_id = user.tenantId`.
- Public reads must only return rows where `is_public = true` and public profile status allows display.
- Public follow APIs must rate-limit, validate input, and avoid returning whether a private client/guest identity exists.
- Public analytics writes must not store PII unless the visitor explicitly submits it.
- Any storage URLs shown publicly must be public-safe or signed through an access-checked route.

---

## Permissions Matrix

| Data / Action                 | Public Visitor | Follower            | Client              | Guest               | Chef                               | Admin                                                      |
| ----------------------------- | -------------- | ------------------- | ------------------- | ------------------- | ---------------------------------- | ---------------------------------------------------------- |
| View published profile        | Yes            | Yes                 | Yes                 | Yes                 | Yes                                | Yes                                                        |
| View draft profile            | No             | No                  | No                  | No                  | Own tenant only                    | Yes                                                        |
| View private media            | No             | No                  | No                  | No                  | Own tenant only                    | Yes with audit                                             |
| Approve own testimonial/media | No             | If identity matches | If identity matches | If identity matches | No, except chef-owned media        | Yes with audit                                             |
| Publish package               | No             | No                  | No                  | No                  | Own tenant only                    | No direct publish unless impersonation/audit policy exists |
| Follow chef                   | Yes            | Yes                 | Yes                 | Yes                 | No self-follow needed              | No                                                         |
| See follower identity         | No             | Own identity only   | Own identity only   | Own identity only   | Own tenant only, if consent allows | Yes with audit                                             |
| See aggregate follower count  | Optional       | Optional            | Optional            | Optional            | Yes                                | Yes                                                        |
| Send follower update          | No             | No                  | No                  | No                  | Only to consented followers        | No, unless admin communication tool exists                 |
| View analytics                | No             | No                  | No                  | No                  | Own tenant only                    | Yes                                                        |
| Moderate unsafe public asset  | No             | No                  | No                  | No                  | Can unpublish own asset            | Yes                                                        |

### Privacy Defaults

- Default work history visibility: private.
- Default media visibility: private.
- Default package visibility: private until published.
- Default proof visibility: hidden until public-safe classification exists.
- Default follower identity visibility: chef-only, never public.
- Default analytics retention: aggregate public activity can persist; raw PII must follow existing privacy/data-retention policy.

---

## Validation Rules

### Slug And Links

- Slug must be unique, lowercase, stable, and safe for public URLs.
- Link fields must accept only `https://` except clearly local/internal routes.
- Social links must be normalized before display.
- External links must render with `target="_blank"` and `rel="noopener noreferrer"`.
- Broken links should warn in Studio and hide from public display only when they create user harm or dead primary CTAs.

### Package Validation

- `guest_count_min` cannot exceed `guest_count_max`.
- `starting_price_cents` and `minimum_spend_cents` cannot be negative.
- Package public copy cannot claim services turned off in `chef_service_config`.
- If deposit/payment language exists, it must match actual booking/payment capability or be marked as an expectation, not a live charge.
- Package inquiry handoff must preserve package id, package name, guest range, and source route.

### Work History Validation

- Entry title is required.
- Date ranges must be valid.
- Current role cannot have an end date unless the UI labels it as historical.
- Private client names, home addresses, and protected/private organizations require an explicit public proof URL or explicit visibility override.
- Press/award/certification entries should support proof URL and source label.

### Media Validation

- Public media must have alt text or a generated draft requiring chef approval.
- Public media must have rights and consent status resolved.
- Images must use approved MIME types and size limits consistent with existing upload actions.
- Public media should have a stable thumbnail/fallback to avoid layout shifts.
- Removing public media must update any package, portfolio, hero, OG image, or proof reference.

### Follow Validation

- Email must be validated and normalized.
- SMS consent must be separate from email consent.
- Marketing consent must be explicit.
- Duplicate follows should update preferences/source history, not create duplicate active records.
- Unfollow must be idempotent and should not reveal private existence of a follower row to attackers.

---

## Server Actions

| Action                                       | Auth            | Input                                | Output                | Side Effects                                      |
| -------------------------------------------- | --------------- | ------------------------------------ | --------------------- | ------------------------------------------------- |
| `getChefShowcaseOverview()`                  | `requireChef()` | none                                 | overview model        | none                                              |
| `saveShowcaseProfile(input)`                 | `requireChef()` | profile fields                       | success/error         | revalidate `/showcase`, `/chef/[slug]`            |
| `createWorkHistoryEntry(input)`              | `requireChef()` | work entry                           | entry/error           | revalidate showcase/profile                       |
| `updateWorkHistoryEntry(id, input)`          | `requireChef()` | partial entry                        | entry/error           | revalidate                                        |
| `deleteWorkHistoryEntry(id)`                 | `requireChef()` | id                                   | success/error         | revalidate                                        |
| `createShowcaseMediaAsset(input)`            | `requireChef()` | media metadata/upload ref            | asset/error           | storage write if needed                           |
| `updateShowcaseMediaAsset(id, input)`        | `requireChef()` | partial metadata                     | asset/error           | revalidate                                        |
| `setShowcaseMediaVisibility(id, visibility)` | `requireChef()` | asset id, visibility                 | success/error         | audit event                                       |
| `createServicePackage(input)`                | `requireChef()` | package                              | package/error         | revalidate profile                                |
| `updateServicePackage(id, input)`            | `requireChef()` | partial package                      | package/error         | revalidate profile                                |
| `reorderServicePackages(ids)`                | `requireChef()` | ordered ids                          | success/error         | revalidate                                        |
| `publishShowcase()`                          | `requireChef()` | optional checklist overrides         | success/error         | profile becomes public/published                  |
| `unpublishShowcase()`                        | `requireChef()` | reason optional                      | success/error         | public profile hides showcase-only sections       |
| `getPublicChefShowcase(slug)`                | public          | slug                                 | public-safe profile   | no private data                                   |
| `followChef(input)`                          | public          | chef slug, contact/preference/source | success/pending/error | writes follower row, sends verification if needed |
| `unfollowChef(token)`                        | public          | signed token                         | success/error         | updates follower state                            |
| `trackShowcaseEvent(input)`                  | public/server   | event metadata                       | success/error         | writes non-sensitive analytics event              |

---

## UI Spec

### Chef Showcase Overview

The overview should be dense and operational, not a landing page. It should show:

- Profile URL with copy/open buttons.
- Publishing status: draft, published, unpublished, needs review.
- Completeness checklist by category.
- Warnings for private/unapproved media.
- Broken link checker results.
- Public proof readiness.
- Follow growth and conversion summary.
- Next best action cards.

Primary actions:

- Preview public profile
- Publish changes
- Copy public link
- Add work history
- Add package
- Add media
- Review public proof

### Profile Tab

Fields:

- Display name
- Business name
- Slug
- Tagline
- Short intro
- Bio
- Service area
- Cuisine/style tags
- Dietary specialties
- Website
- Social links
- Google review link
- Profile photo
- Logo
- Hero image
- Inquiry destination preference

States:

- Empty: show setup checklist.
- Draft changes: save/publish separation.
- Invalid slug/link: inline error.
- Public preview: side-by-side or drawer preview.

### Work History Tab

The chef can add timeline entries and highlight cards.

Entry types:

- Restaurant role
- Private chef role
- Catering/event work
- Pop-up/residency
- Education/apprenticeship
- Award
- Certification
- Press
- Community/charity
- Collaboration
- Other

Controls:

- Add entry
- Edit entry
- Reorder
- Mark public/private
- Attach proof link
- Attach media
- Pin as highlight

Public rendering:

- Timeline section with compact public-safe entries.
- Highlights row for pinned entries.
- No private employer/client details unless public toggle is explicit.

### Media Tab

Capabilities:

- Upload image/video where supported by existing storage rules.
- Import from event photos and portfolio photos.
- Add external media URL when upload is unavailable.
- Set asset type, tags, caption, alt text, credit, rights status, consent status.
- Filter by type, visibility, event, package, consent, missing alt text, and broken asset.
- Bulk mark public/private where safe.
- Preview public crop.

States:

- No media: show upload/import actions.
- Pending consent: show locked/warning state.
- Broken asset: show repair/remove actions.
- Private asset: cannot appear on public profile.

### Portfolio Tab

Capabilities:

- Curated grid.
- Collections.
- Event stories.
- Featured collection.
- Link to service packages.
- Link to public reviews/testimonials.
- Visibility controls.
- Drag/reorder.
- Public profile placement controls.

Portfolio story fields:

- Title
- Event type
- Occasion
- Date or season
- Guest count range
- Menu highlights
- Photos
- Testimonial/ref link
- Package link
- Consent state

### Services Tab

The chef creates public package cards from service config and custom package data.

Package editor:

- Name
- Description
- Best for
- Guest count range
- Price/minimum/inquire label
- Included services
- Add-ons
- Lead time
- Sample menus
- Portfolio examples
- Policies
- Dietary notes
- Public/private
- Featured

Public rendering:

- Package cards near top or after proof section.
- Package CTA: "Inquire about this package".
- Inquiry prefill includes package id, name, guest range, and service expectations.
- Packages must never imply guaranteed price if package is only an estimate.

### Proof Tab

Capabilities:

- Select featured reviews.
- Select featured testimonials.
- Add press links.
- Add awards/certifications.
- Connect Google review link.
- Queue review request actions.
- Approve public proof.
- Hide or archive proof.
- Check structured data eligibility.

Trust controls:

- Public-safe only.
- No private feedback by default.
- Consent metadata visible.
- Source links open safely with `target="_blank"` and `rel="noopener noreferrer"`.

### Followers Tab

Capabilities:

- Follower count and trend.
- Segments by source.
- Recent follow activity.
- Source attribution: public profile, Dinner Circle, QR, review link, shared link, event, referral.
- Communication consent status.
- Unverified/pending states.
- Export-safe aggregate analytics.
- No public follower list by default.

Visitor follow flow:

1. Visitor clicks Follow.
2. If signed in or known through client/guest portal, use known identity and request consent.
3. If anonymous, collect email and optional phone with explicit preferences.
4. Confirm pending verification if needed.
5. Show next actions: book, share, leave review if appropriate, view packages.

### Analytics Tab

Metrics:

- Profile views
- Unique visitors where available
- Follow clicks
- Verified follows
- Package clicks
- Inquiry starts
- Inquiry submissions
- Website/social link clicks
- Google review link opens
- Portfolio views
- Media interactions
- Share/referral clicks
- Conversion by source
- Top package
- Top portfolio asset
- Broken/stale public assets

Analytics must separate:

- Public anonymous activity
- Known clients
- Guests
- Followers
- Inquiries
- Bookings

No analytics should expose private user identity in public UI.

---

## Analytics Event Taxonomy

All analytics events should include `chef_id`, `event_name`, `source_route`, `target_kind`, `target_id` where applicable, `created_at`, and a metadata object that avoids raw PII by default.

| Event                                  | Trigger                                  | Metadata                                                  |
| -------------------------------------- | ---------------------------------------- | --------------------------------------------------------- |
| `showcase.profile_viewed`              | Public profile route rendered.           | `slug`, `referrer_domain`, `utm`, `viewer_kind` if known. |
| `showcase.hero_cta_clicked`            | Main Book/Inquire CTA clicked.           | `cta`, `source_section`, `package_id` optional.           |
| `showcase.follow_clicked`              | Follow button opened.                    | `source_section`, `source_route`, `viewer_kind`.          |
| `showcase.follow_submitted`            | Visitor submits follow form.             | `preferences`, `verification_required`, `source_kind`.    |
| `showcase.follow_verified`             | Follow becomes active.                   | `follower_type`, `source_kind`.                           |
| `showcase.unfollowed`                  | Follower unsubscribes.                   | `channel`, `reason` optional.                             |
| `showcase.package_viewed`              | Package card/detail viewed.              | `package_id`, `position`, `source_section`.               |
| `showcase.package_inquiry_started`     | Package CTA starts inquiry.              | `package_id`, `guest_range`, `pricing_label`.             |
| `showcase.package_inquiry_submitted`   | Inquiry submitted with package context.  | `package_id`, `inquiry_id`, `source_route`.               |
| `showcase.portfolio_collection_viewed` | Collection opened.                       | `collection_id`, `position`.                              |
| `showcase.media_opened`                | Asset lightbox/media view opened.        | `asset_id`, `asset_type`, `section`.                      |
| `showcase.review_link_clicked`         | Google/external review link clicked.     | `provider`, `source_section`.                             |
| `showcase.social_link_clicked`         | Social or website link clicked.          | `link_type`, `destination_domain`.                        |
| `showcase.profile_shared`              | Share/copy/QR action used.               | `share_method`, `source_section`.                         |
| `showcase.public_proof_viewed`         | Review/testimonial/proof section viewed. | `proof_kind`, `proof_id` optional.                        |
| `showcase.publish_attempted`           | Chef tries to publish.                   | `blocking_issue_count`, `warning_count`.                  |
| `showcase.published`                   | Chef publishes.                          | `section_count`, `package_count`, `public_asset_count`.   |
| `showcase.publish_blocked`             | Publish prevented.                       | `blocking_reasons`.                                       |

### Analytics Dashboards

Chef-facing analytics should answer:

- Which source brings profile views?
- Which source brings followers?
- Which package drives inquiry starts?
- Which package actually submits inquiries?
- Which portfolio collection gets attention?
- Which proof items correlate with inquiry starts?
- Which links are dead weight?
- Which visitor path ends in follow but not inquiry?
- Which Dinner Circle, event, guest, referral, QR, or public route created the follow?

### Analytics Guardrails

- Use aggregate metrics by default.
- Keep raw event metadata minimal.
- Do not show public visitor IP, raw user agent, private email, phone, home address, guest identity, or client identity in analytics tables.
- If identity is known, link to CRM/client context only inside chef-protected routes with tenant scope.
- Public profile should not display analytics-derived claims unless they are reviewed and public-safe.

---

## Public Profile Layout

### First Viewport

The first viewport must establish:

- Chef name or business name
- Real food/service visual
- Tagline
- Service area
- Cuisine/service tags
- Primary CTA: inquire/book
- Secondary CTA: follow/save
- Trust summary: rating/reviews, events served, packages, or verified proof where available
- Social/website links in a restrained row or menu

### Body Sections

1. Trust strip
2. About the chef
3. Featured packages
4. Portfolio highlights
5. Work history and credentials
6. Reviews/testimonials
7. Media collections
8. Locations/service area
9. Inquiry/booking handoff
10. Follow/share/footer actions

### Action Hierarchy

Primary:

- Book/Inquire

Secondary:

- Follow
- View packages
- View portfolio

Contextual:

- Open website
- Open social link
- Read reviews
- Share profile
- Leave Google review, only for people who had a genuine experience

Grouped menu:

- Copy link
- QR code
- Report issue
- View external profiles

---

## Mobile Spec

Mobile profile must include:

- Sticky bottom action bar with Book/Inquire and Follow.
- Compact profile header with image, name, service area, trust signal.
- Horizontal package cards.
- Swipeable portfolio/media sections only where accessible.
- Short sections with "View all" expansion.
- No text overlap in buttons/cards.
- Follow modal that fits at 390px and 430px widths.
- Media upload controls in chef Studio must support mobile camera upload if storage policy allows.

---

## Privacy, Consent, And Trust Rules

1. Public profile must never expose private client names, home addresses, event addresses, guest identities, contracts, invoices, private notes, internal score fields, or unapproved media.
2. Every public photo needs one of:
   - chef-owned/public-safe,
   - client-approved,
   - event-level public permission,
   - explicit override with audit trail.
3. Every testimonial/review shown publicly must have public display approval or come from an already-public external source with safe attribution.
4. Work history cannot imply unverifiable celebrity/client relationships without explicit public proof and permission.
5. Follow collection must use explicit consent for email/SMS/marketing.
6. Unsubscribe/unfollow must work from public links.
7. Public pages must degrade gracefully when a section has no approved data.
8. All public links must be validated and displayed safely.
9. The chef must see what is hidden and why.
10. Public structured data must use only public-approved proof.

---

## Edge Cases

| Scenario                                       | Correct Behavior                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Chef has no public profile slug                | Studio shows setup state and disables public link until slug exists.                        |
| Chef has media but no consent                  | Media appears in Studio with warning but not public profile.                                |
| Chef has services config but no packages       | Studio can generate draft package suggestions, but chef must approve before publishing.     |
| Chef has no reviews                            | Public page shows other proof or omits reviews without fake zeros.                          |
| External link is invalid                       | Inline error in Studio; public page hides or disables unsafe link.                          |
| Package price is not fixed                     | Use "Starting at", "Minimum", or "Inquire" labels accurately.                               |
| Visitor follows twice                          | Idempotent follow update, no duplicate follower rows.                                       |
| Visitor unsubscribes                           | Follower becomes inactive and no further marketing updates are sent.                        |
| Public profile unpublished                     | Public route shows existing safe fallback or not-found/setup state, not private draft data. |
| Chef deletes media used by package/portfolio   | Studio warns and removes or replaces public references.                                     |
| Multiple agents touch profile/media/reputation | Lead orchestrator owns merge order and route-policy/security verification.                  |

---

## Failure Modes To Design Against

| Failure Mode                                    | Why It Matters                                   | Required Prevention                                                                                               |
| ----------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Pretty but unmanageable public profile          | Chef cannot keep it current.                     | Every public section maps to a Studio control and read model field.                                               |
| Private event data leak                         | Trust and legal failure.                         | Public read model filters by visibility and consent before render.                                                |
| Package cards overpromise price or availability | Creates bad leads and disputes.                  | Pricing labels and package copy must be validated against service config and booking capability.                  |
| Follow button without persistence               | No growth loop.                                  | Follow must write durable consented state and source attribution.                                                 |
| Media vault becomes duplicate storage chaos     | Future profile/social/proposal surfaces diverge. | Use canonical media references and source links to existing event/portfolio assets.                               |
| Analytics becomes vanity metrics                | Chef cannot act.                                 | Analytics must connect to package, inquiry, follow, review, referral, and booking outcomes.                       |
| Public proof without rights                     | Legal/trust risk.                                | Every public proof item carries approval/source/rights status.                                                    |
| Low-data chefs look empty or amateur            | New chefs need a credible profile.               | Public fallback should emphasize bio, package, work history, and service expectations without fake stats.         |
| Heavy public route slows discovery              | Profile affects conversion and SEO.              | Use public-safe read model, cached data where appropriate, optimized images, and no unnecessary client hydration. |
| Overbuilt route tree                            | Navigation and maintenance get worse.            | Keep `/chef/[slug]` canonical; add deep public routes only when content length or SEO needs prove it.             |

---

## Action Surface Requirements

### Chef Studio Actions

Primary actions:

- Publish showcase
- Preview public profile
- Add package
- Add work history
- Add media
- Review public proof

Secondary actions:

- Copy public profile link
- Open public profile
- Run public readiness check
- Fix broken links
- Import from event photos
- Convert service config into draft package
- Create QR code

Grouped actions:

- Visibility bulk edit
- Reorder sections
- Archive old asset/proof/package
- Export profile proof pack
- Send profile to a client
- Share profile to social manually

Recovery actions:

- Restore last published version
- Unpublish section
- Remove public asset everywhere
- Revoke proof display
- Re-send follower verification
- Repair broken package inquiry handoff

### Public Visitor Actions

Primary:

- Inquire or book

Secondary:

- Follow
- View packages
- View portfolio
- Share profile

Contextual:

- Ask about this package
- Open sample menu
- Read reviews
- Open Google review link if they had a genuine experience
- Open website/social link
- Join Dinner Circle where applicable

---

## Acceptance Criteria

1. Chef can manage identity, bio, links, socials, website, profile image, logo, and hero image from the Showcase Studio.
2. Chef can add, edit, reorder, and publish/unpublish work history entries.
3. Chef can manage public-safe media assets with rights, consent, captions, alt text, tags, and visibility.
4. Chef can curate portfolio collections and event/story entries from existing portfolio/event photo sources.
5. Chef can create public service packages with pricing labels, guest ranges, included services, add-ons, package examples, and package inquiry handoff.
6. Public profile displays selected packages, portfolio, work history, proof, links, and follow CTA without leaking private data.
7. Visitor can follow the chef with explicit consent state, source attribution, and duplicate prevention.
8. Chef can see follower counts, sources, consent states, and conversion analytics.
9. Public inquiry receives selected package context where relevant.
10. Public profile supports desktop and mobile layouts with visible primary CTA and follow action.
11. Broken links, missing consent, and unpublished drafts are visible to the chef and hidden from public visitors.
12. All new server actions call `requireChef()` before tenant data access.
13. All tenant DB reads and writes scope by `chef_id` or `tenant_id`.
14. Public APIs return only public-safe data.
15. Route policy is updated for every new route.
16. Finish gate includes runtime proof at `http://localhost:3100`.

---

## Verification Steps

1. Run `git status --short` before implementation and preserve unrelated dirty work.
2. Start or reuse canonical dev server at `http://localhost:3100`.
3. Sign in as a chef and open `/showcase`.
4. Create or update profile basics, social links, website, and Google review URL.
5. Add at least three work history entries with mixed visibility.
6. Upload or attach at least three media assets with different consent states.
7. Create at least two service packages: fixed/starting price and inquire-only.
8. Curate one portfolio collection and one event-linked story.
9. Publish the showcase.
10. Open `/chef/[slug]` and verify public layout shows only approved data.
11. Use Follow as anonymous visitor, known guest/client if fixtures exist, and repeat follow attempt.
12. Confirm inquiry from package CTA includes package context.
13. Check mobile viewport at 390px and 430px for sticky CTA, follow modal, package cards, and no overlap.
14. Check browser console, network, server logs, and runtime errors.
15. Run focused unit/integration tests for server actions, tenant scoping, public data filtering, follow idempotency, consent enforcement, and package inquiry handoff.
16. Run type check and lint/test commands appropriate to changed files.
17. Run `/wiring-audit` as post-build integration gate, covering public profile, Dinner Circles, Universal Rail Intelligence, Priority Queue, Commitment UI, Menu Intelligence, PIE, Client Intelligence, communications, lifecycle, ledger, navigation, Remy, automation, and CIL where relevant.
18. Generate proof pack with screenshots, acceptance evidence, wiring proof, runtime proof, verification output, and partial-work notes.
19. Run `build-queue.mjs finish-check` for fired queue items before moving anything to done.

---

## Suggested Build Slices

### Slice 1: Showcase Studio Shell And Overview

- Add route.
- Reuse existing profile/public-profile/portfolio/service/review data.
- Add completion model.
- No new public behavior except preview links.

### Slice 2: Work History

- Add work history table/actions/components.
- Render public-safe work history on public profile.

### Slice 3: Service Packages

- Add package table/actions/components.
- Add public package cards.
- Add inquiry package prefill.

### Slice 4: Media Asset Contract

- Consolidate media slots and visibility/consent metadata.
- Reuse existing upload actions where available.
- Do not duplicate blocked media upload queue work without claiming it.

### Slice 5: Follow System

- Add follower table/actions.
- Add public follow button and modal.
- Add source attribution and duplicate prevention.

### Slice 6: Proof And Analytics

- Connect reviews/testimonials/press/proof controls.
- Add analytics event tracking and chef-facing dashboard.

### Slice 7: Public Profile Integration And Mobile Polish

- Public route final layout.
- Discovery card hooks.
- Mobile sticky CTA.
- SEO/structured data from public-safe proof only.

### Slice 8: Finish Gate Proof Pack

- Full runtime verification.
- Wiring audit.
- Screenshots.
- Build queue finish checks.

---

## Wave Ownership Plan

Use this when firing the queue with multiple agents. The lead orchestrator owns migrations, merge order, route policy, and final proof pack.

### Wave 1: Foundations

| Lane         | Ownership                                         | Files / Modules                                     |
| ------------ | ------------------------------------------------- | --------------------------------------------------- |
| Read model   | Public-safe data contract and tests.              | `lib/showcase/public-read-model.ts`, tests.         |
| Studio shell | Chef-facing route shell and overview.             | `app/(chef)/showcase/**`, nav/command registration. |
| Migrations   | Additive tables/columns, types, RLS expectations. | DB migrations, schema generation.                   |

### Wave 2: Core Content

| Lane             | Ownership                                                     | Files / Modules                                                                   |
| ---------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Work history     | Work history actions/UI/public render.                        | `lib/showcase/work-history-actions.ts`, `components/showcase/work-history-*`.     |
| Packages         | Package actions/UI/inquiry handoff.                           | `lib/showcase/package-actions.ts`, `components/showcase/package-*`, inquiry code. |
| Media governance | Media asset metadata/visibility, reuse existing upload paths. | `lib/showcase/media-actions.ts`, `components/showcase/media-*`.                   |

### Wave 3: Growth And Proof

| Lane      | Ownership                                                     | Files / Modules                                                                    |
| --------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Follow    | Follow public action, modal, unsubscribe, follower dashboard. | `lib/showcase/follow-actions.ts`, public follow components, protected follower UI. |
| Proof     | Review/testimonial/press/credential public selection.         | `lib/showcase/proof-actions.ts`, existing review modules.                          |
| Analytics | Event taxonomy writes, aggregates, dashboard.                 | `lib/showcase/analytics.ts`, analytics tab, tests.                                 |

### Wave 4: Public Integration

| Lane         | Ownership                                                   | Files / Modules                                                                 |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Public route | Integrate read model into `/chef/[slug]`.                   | `app/(public)/chef/[slug]/page.tsx`, public components.                         |
| Discovery    | Cards and rails route to package/profile/follow correctly.  | `app/(public)/chefs/**`, `app/(public)/eat/**`, discovery save/follow surfaces. |
| Mobile/proof | Mobile action bar, screenshots, wiring audit, finish check. | UI polish, Playwright/smoke proof, proof pack.                                  |

### Merge Rules

- Do not let two lanes edit `app/(public)/chef/[slug]/page.tsx` in parallel.
- Do not let two lanes edit the same migration in parallel.
- Public read model must land before public route integration.
- Follow and analytics can be parallel only if event names and source attribution contract are locked first.
- Package inquiry handoff must merge before public package CTA is considered complete.

---

## Dispatch-Ready Agent Prompts

These prompts are copied into `docs/intensify/chef-showcase-public-identity-studio.md` by the deep-pass run. They are included here so a queue fire can assign lanes without re-interpreting the product intent.

### Wave 1 Prompt: Public Read Model

- **Model:** opus
- **Task:** Create the public-safe `PublicChefShowcase` read model and tests. It must assemble identity, packages, portfolio, work history, media, proof, links, follow config, inquiry config, and SEO from existing/current tables plus new showcase tables where present. It must filter by public visibility and consent before returning data.
- **Read first:** `docs/specs/chef-showcase-public-identity-studio.md`, `lib/profile/actions.ts`, `app/(public)/chef/[slug]/page.tsx`, `lib/profile/portfolio-actions.ts`, `lib/reviews/public-actions.ts`, `lib/chef/service-config-actions.ts`, `lib/auth/route-policy.ts`.
- **Done when:** Public read model has focused tests for hidden private media, unpublished packages, revoked proof, no reviews, no slug, and published showcase. Type check passes for touched files.
- **Caveats:** Do not expose private tenant data from public routes. Do not rewrite existing public profile rendering in this lane.

### Wave 1 Prompt: Studio Shell

- **Model:** opus
- **Task:** Build the protected Showcase Studio shell and overview route. It should reuse existing profile, public profile, portfolio, services, and review data enough to show completeness and next actions without implementing every editor yet.
- **Read first:** `docs/specs/chef-showcase-public-identity-studio.md`, `app/(chef)/settings/my-profile/page.tsx`, `app/(chef)/settings/public-profile/page.tsx`, `app/(chef)/portfolio/page.tsx`, `app/(chef)/settings/my-services/page.tsx`, `components/navigation/chef-nav-config.ts`.
- **Done when:** `/showcase` or the selected protected route loads for chef users, route policy is correct, overview cards render real existing data where available, and unauthenticated/client users cannot access it.
- **Caveats:** Keep it dense and operational. Do not create a marketing landing page.

### Wave 2 Prompt: Work History

- **Model:** opus
- **Task:** Add work history persistence, chef editor UI, and public-safe rendering contract. Support entry type, title, organization, dates, description, proof URL, media ref, display order, and visibility.
- **Read first:** `docs/specs/chef-showcase-public-identity-studio.md`, existing migration patterns, `lib/profile/portfolio-actions.ts`, `components/portfolio/highlight-editor.tsx`.
- **Done when:** Chef can create/edit/reorder/hide work entries, public read model only returns public entries, and tests cover private entries and invalid date ranges.
- **Caveats:** Do not expose private client names by default.

### Wave 2 Prompt: Service Packages

- **Model:** opus
- **Task:** Add public service package persistence, chef editor UI, package cards, and inquiry prefill. Packages must remain consistent with service config and must not overpromise price or booking availability.
- **Read first:** `docs/specs/chef-showcase-public-identity-studio.md`, `app/(chef)/settings/my-services/page.tsx`, `lib/chef/service-config-actions.ts`, `components/proposals/package-picker.tsx`, `components/public/public-inquiry-form.tsx`, `app/(public)/chef/[slug]/inquire/page.tsx`.
- **Done when:** Chef can publish at least two packages, public profile shows public packages, package CTA starts inquiry with package context, and validation blocks impossible guest ranges/prices.
- **Caveats:** Price labels must be honest: starting, minimum, or inquire.

### Wave 2 Prompt: Media Governance

- **Model:** opus
- **Task:** Add showcase media asset metadata and visibility controls while reusing existing upload/photo systems. Support rights, consent, alt text, captions, source refs, visibility, and public-approved filtering.
- **Read first:** `docs/specs/chef-showcase-public-identity-studio.md`, `app/(chef)/portfolio/page.tsx`, `components/portfolio/portfolio-gallery.tsx`, `lib/events/photo-actions.ts`, `lib/portfolio/permission-check.ts`, blocked media upload queue items listed in this spec.
- **Done when:** Chef can classify existing portfolio/event assets for public showcase, public read model hides unapproved media, and tests cover revoked/public/private states.
- **Caveats:** Do not duplicate storage/upload implementations if existing actions can be reused.

### Wave 3 Prompt: Follow System

- **Model:** opus
- **Task:** Build durable follow state for public visitors, clients, and guests with consent preferences, source attribution, duplicate prevention, unsubscribe, and protected follower dashboard.
- **Read first:** `docs/specs/chef-showcase-public-identity-studio.md`, `components/discovery/save-chef-button.tsx`, `lib/discovery/saved-chefs.ts`, `app/(public)/eat/_components/shortlist-button.tsx`, Dinner Circle growth queue item if available.
- **Done when:** Public profile Follow flow writes one durable follower record, repeated follow is idempotent, unsubscribe works, source attribution is stored, and chef can see aggregate/source data without public identity leakage.
- **Caveats:** Do not treat follow as only a local saved state.

### Wave 3 Prompt: Proof And Analytics

- **Model:** opus
- **Task:** Add public proof selection and analytics event tracking according to this spec. Connect review/testimonial/press/proof controls to public profile display and capture conversion events for views, follows, package clicks, inquiries, review links, social links, shares, and portfolio interactions.
- **Read first:** `docs/specs/chef-showcase-public-identity-studio.md`, `components/public/review-showcase.tsx`, `lib/reviews/public-actions.ts`, `app/(chef)/reputation/page.tsx`, `app/(chef)/reputation/studio/page.tsx`.
- **Done when:** Public proof display uses only approved proof, analytics writes and aggregates are tested, and chef analytics answer source, package, follow, inquiry, and proof performance questions.
- **Caveats:** Analytics metadata must avoid raw PII unless explicitly submitted and protected.

### Wave 4 Prompt: Public Profile Integration

- **Model:** opus
- **Task:** Integrate the `PublicChefShowcase` read model into `/chef/[slug]` and update public components for packages, work history, proof, portfolio, links, follow, and mobile sticky CTA.
- **Read first:** `docs/specs/chef-showcase-public-identity-studio.md`, `app/(public)/chef/[slug]/page.tsx`, `components/public/*`, `components/profile/portfolio-gallery.tsx`, `components/portfolio/portfolio-showcase.tsx`.
- **Done when:** Public profile renders published showcase sections, hides unsafe/private data, works at desktop and 390px/430px mobile, and browser console/network/server logs are clean.
- **Caveats:** Do not make `/chef/[slug]` a giant client component. Keep first viewport focused on chef, trust, Book/Inquire, and Follow.

### Wave 4 Prompt: Finish Gate Proof Pack

- **Model:** opus
- **Task:** Verify the full fired Showcase build in the running app at `http://localhost:3100`, run focused tests/typecheck, inspect console/network/server logs, run wiring-audit, and generate the proof pack.
- **Read first:** `docs/specs/chef-showcase-public-identity-studio.md`, `.agents/build-queue` fired item files, `scripts/wiring-audit-results.json` if present.
- **Done when:** Acceptance criteria are proven with screenshots, runtime proof, test output, route-policy/auth evidence, public/private leak checks, mobile proof, and `build-queue.mjs finish-check` passes.
- **Caveats:** Do not move queue items to done unless the running app proves the work.

---

## Existing Queue Coordination

Do not blindly create duplicate queue items. Before firing this spec, reconcile with:

- `BQ-20260516T155602Z-public-profile-and-marketplace-trust-visual-upgrade` - done, public profile baseline.
- `BQ-20260516T151626Z-chef-reputation-studio-for-reviews-testimonials-and-social-p` - blocked, proof/reputation.
- `BQ-20260519T164719Z-unified-review-command-center-with-source-links` - active, reviews/proof display.
- `BQ-20260519T014703Z-chef-settings-and-public-profile-media-upload-completeness` - blocked, media upload completeness.
- `BQ-20260519T014438Z-public-discovery-and-directory-media-upload-coverage` - blocked, public media coverage.
- `BQ-20260519T171511Z-dinner-circle-growth-engine-google-reviews-guest-leads-follo` - active, follow/review/referral growth loop.

Recommended queue approach:

1. Create one umbrella queue item from this spec.
2. Link existing queue items as dependencies or related work.
3. Fire in slices, not as one giant unbounded build.
4. Keep file ownership lanes separate: profile/studio shell, work history, packages, media, follow, analytics, public profile rendering.

---

## Notes For Builder Agent

- Follow ChefFlow Build Queue First rules. This spec is not authorization to implement until a queue item is fired or the developer explicitly says direct hotfix.
- Start with real existing routes/components. Avoid rebuilding public profile from scratch.
- Prefer server components for public rendering and small client components for follow/modal interactions.
- Keep public profile visually dense, inspectable, and proof-heavy. Do not make it a generic SaaS landing page.
- Public profile first viewport must show the chef/brand, real media, trust, Book/Inquire, and Follow.
- Every new public route/API must be reviewed for auth, route policy, rate limiting, and public-only data exposure.
- All media and testimonials require permission clarity. Hidden private proof is acceptable in Studio, never on public profile.
- The follow system is product-critical. Do not reduce it to a heart icon without persistence, consent, source attribution, and analytics.
