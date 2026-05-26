# Exit Eval: Partner / PROFILE CONTENT & PUBLIC SHOWCASE

> Wave 5 | 7 scenarios | Role: PARTNER
> Status: `NEEDS-DEVELOPER-REVIEW` (solo mode, no chef input)
> Date: 2026-05-25

---

## Scenario #11: Find a cover image URL

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why partner leaves:** The partner profile form (`app/(partner)/partner/profile/page.tsx`) has a "Cover Image URL" text input field. The partner must find/host an image somewhere externally, copy its URL, and paste it in. They leave ChefFlow to locate an existing image URL on their website CMS, Google Drive, or cloud photo host.

**Context ChefFlow has:**

- Partner profile record with `cover_image_url` field (text column in `referral_partners`)
- Existing Cloudinary integration (`lib/images/cloudinary.ts`) for image optimization/CDN
- Chef-side image upload capability (`addPartnerImage` in `lib/partners/actions.ts` requires `requireChef()`)
- Partner images table (`partner_images`) already stores uploaded images
- Preview page already renders cover images via Next.js `<Image>`

**Data source?** No. The image lives on the partner's device/cloud. This is a file upload gap, not a data source.

**Client-collaborative angle:** Not applicable. The partner owns their own photos.

**Physical reality:** Screen-based workflow. Partner takes property photos on their phone, currently must host them elsewhere and copy a URL. Direct upload from phone gallery is the natural flow.

**Compounding:** High. Cover image is set once and displayed on every public showcase view. Investment pays off immediately and permanently.

**Solution design:**

- Add direct file upload to partner profile page (reuse existing upload patterns from `components/entities/entity-photo-upload.tsx` or `components/events/photo-upload-prompt.tsx`)
- Store uploaded images in local FS or Cloudinary (matching existing chef-side partner image flow)
- Insert uploaded image into `partner_images` table with partner attribution
- Update `cover_image_url` on `referral_partners` to point to the uploaded asset
- Keep URL paste as fallback for partners who prefer external hosting

**Where it appears:**

- `/partner/profile` page (replace URL-only input with upload + URL hybrid)
- `/partner/preview` page (already renders the result)

**What remains as permanent exit:**
Nothing. Direct upload eliminates this exit entirely.

**Priority:** High frequency (every new partner hits this) x Low effort (upload component patterns exist) = P1
**Spec needed?** No. Straightforward adaptation of existing upload patterns.

---

## Scenario #12: Edit or crop venue photos

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why partner leaves:** The partner needs to adjust image composition, brightness, crop, or aspect ratio before the image looks good on the showcase. Photo editing is a creative/media task that belongs to dedicated tools (Lightroom, Photos, Canva, phone gallery editor).

**Context ChefFlow has:**

- Stored images in `partner_images` table with caption, season, display_order
- Cloudinary transformations available (`lib/images/cloudinary.ts`) for resize, crop, format conversion
- Preview page shows how images render at specific aspect ratios (h-48 cover, aspect-square gallery)

**Data source?** No. Photo editing is a creative workflow, not a data lookup.

**Client-collaborative angle:** Not applicable. Photo quality is the partner's concern.

**Physical reality:** Screen-based. Partners typically edit on phone or desktop before sharing.

**Compounding:** Low. Each photo is edited once. The editing skill stays with the partner, not ChefFlow.

**Solution design:**

- Accept uploads at any resolution; use Cloudinary URL-based transformations (already built) for display-time crops
- Show aspect ratio guidelines on upload ("Best at 16:9 for cover, 1:1 for gallery")
- Offer basic Cloudinary gravity/crop presets (center, face-detect) without building a full editor
- Preserve original upload; serve transformed versions

**Where it appears:**

- `/partner/profile` (upload guidance)
- Cloudinary URL transform layer (invisible to partner)

**What remains as permanent exit:**
Full creative photo editing (exposure, color correction, object removal, text overlay) will always require Lightroom/Canva/phone editor. ChefFlow handles display cropping, not creative editing.

**Priority:** Low frequency (one-time per photo set) x High effort (building an editor is wrong) = P4
**Spec needed?** No. Just add aspect ratio hints to upload UI.

---

## Scenario #13: Update the partner's own website

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why partner leaves:** The partner's website (Squarespace, Wix, WordPress, custom CMS) is their own business property. Content changes there (new menus, seasonal hours, property descriptions) are managed in their CMS. ChefFlow has no role in managing their independent web presence.

**Context ChefFlow has:**

- Partner `website` field stored in `referral_partners` table
- Partner can update their website URL in `/partner/profile`
- Public showcase links out to partner website (`partner?.website` rendered in preview page)
- No awareness of partner website content or freshness

**Data source?** No. The partner's website is their own creative/business surface.

**Client-collaborative angle:** Not applicable. Website management is partner-internal.

**Physical reality:** Desktop browser workflow in their CMS. Unrelated to ChefFlow.

**Compounding:** Low. Each website update is independent of ChefFlow's data model.

**Solution design:**

- Store the outbound website link (already done)
- Optionally add a "last verified" or "website updated" timestamp if partner wants to signal freshness
- Ensure the public showcase link opens in new tab with proper attribution (already implemented)

**Where it appears:**

- `/partner/profile` (website URL field, already present)
- `/partner/preview` (website link rendered, already working)

**What remains as permanent exit:**
Everything. ChefFlow will never be a website CMS for partners. The partner manages their own web presence in their own tools.

**Priority:** N/A (permanent exit, no build needed) x N/A = Not actionable
**Spec needed?** No.

---

## Scenario #14: Update external booking page copy

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why partner leaves:** The partner's booking page lives on Airbnb, VRBO, Peerspace, hotel PMS, or their own venue CMS. These platforms own the inventory, conversion copy, pricing, availability, and booking flow. ChefFlow cannot and should not manage external marketplace content.

**Context ChefFlow has:**

- Partner `booking_url` stored in `referral_partners` table
- Location-level `booking_url` stored in `partner_locations` table
- Public showcase renders "Book this space" link pointing to external booking page
- Partner can update booking URL in `/partner/profile` and via location change requests

**Data source?** No. Booking platforms are full-featured marketplaces with their own content management.

**Client-collaborative angle:** Not applicable. Booking content is between the partner and their marketplace.

**Physical reality:** Desktop browser workflow in Airbnb/VRBO/Peerspace host dashboard.

**Compounding:** Low. Each booking page update is platform-specific and independent of ChefFlow.

**Solution design:**

- Store and link to external booking URLs (already done at both partner and location level)
- Keep links current by making URL editing frictionless in partner portal (already present)
- Optionally add a "verify your booking link" reminder if the URL returns errors (future enhancement)

**Where it appears:**

- `/partner/profile` (booking URL field, already present)
- Partner location change requests (booking_url proposable, already built)

**What remains as permanent exit:**
Everything. Booking page content is owned by Airbnb/VRBO/Peerspace. ChefFlow links out but never manages that content.

**Priority:** N/A (permanent exit) x N/A = Not actionable
**Spec needed?** No.

---

## Scenario #15: Check how public listing looks outside ChefFlow

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why partner leaves:** The partner wants to verify that their representation on ChefFlow matches their canonical listing on Airbnb, Google Business Profile, or their own website. They compare visual branding, description accuracy, and link validity across platforms.

**Context ChefFlow has:**

- Full public preview page (`/partner/preview`) showing exactly how the partner appears on the chef's public page
- Live public page link with anchor (`/chef/[slug]#partners`) accessible from preview
- Cover image, description, locations, gallery all rendered in preview
- Visibility status (live vs hidden) clearly shown
- Website URL and booking URL stored and linked

**Data source?** Partially. Google Business Profile API could fetch their public listing for comparison, but Airbnb/VRBO have no partner-facing API.

**Client-collaborative angle:** Not applicable. Brand consistency is the partner's concern.

**Physical reality:** Desktop multi-tab comparison workflow.

**Compounding:** Medium. Once the partner confirms alignment, it compounds until they update either side. A "last verified" state reduces repeat checking.

**Solution design:**

- Add a "saved links" section to preview page with partner's external listing URLs (website, booking, Google Business) for quick side-by-side access
- Add a "last verified" checkbox: "I've confirmed this matches my external listing" with date
- Show all publicly rendered fields alongside their raw values so the partner can spot inconsistencies
- Optionally surface a checklist: "Cover photo matches? Description current? Links working?"

**Where it appears:**

- `/partner/preview` (enhanced with external link cluster and verification state)
- `/partner/profile` (verification reminder if stale)

**What remains as permanent exit:**
The partner will always need to visit their external listings to see how those platforms render their content. ChefFlow can only show how ChefFlow renders them.

**Priority:** Medium frequency (quarterly or after updates) x Low effort (UI additions to existing page) = P3
**Spec needed?** No. Minor UI enhancement to preview page.

---

## Scenario #16: Ask chef to make profile public

**Original classification:** Bridgeable
**Reclassified to:** Reducible

**Why partner leaves:** The partner portal shows `is_showcase_visible` as read-only with text "Your chef controls public visibility. Contact them to update this." The partner must leave ChefFlow to email/text the chef asking to be made public. The profile page (`app/(partner)/partner/profile/page.tsx` line 56) explicitly says "Contact them to update this."

**Context ChefFlow has:**

- `is_showcase_visible` boolean on `referral_partners` table (chef-controlled)
- Partner sees their current visibility state in profile and preview pages
- Chef has full toggle control via `lib/partners/actions.ts`
- No mechanism for partner to request visibility change
- No partner-to-chef messaging surface exists

**Data source?** No. This is a permission/workflow gap, not data.

**Client-collaborative angle:** Not directly, but the Dinner Circle pattern applies: the request can be structured and tracked rather than lost in email.

**Physical reality:** Text/email to chef. Low urgency. In-app request button is the natural fix.

**Compounding:** High. Visibility is set once and compounds forever (the partner's showcase appears on the public page permanently). The request only happens once per partner, but the friction is blocking.

**Solution design:**

- Add a "Request to go public" button on the partner profile/preview page when `is_showcase_visible` is false
- Store the request in a new `partner_visibility_requests` record or reuse notification/inbox pattern
- Notify the chef (in-app notification or email) of the partner's publish request
- Chef approves/denies from their partner management UI
- Show partner the request status (pending/approved/denied) in place of the current static text

**Where it appears:**

- `/partner/profile` (replace "Contact them" text with request button)
- `/partner/preview` (same button when hidden)
- Chef partner detail page (approval action)
- Chef notifications/inbox

**What remains as permanent exit:**
Nothing. The in-app request flow eliminates the need to email/text the chef entirely.

**Priority:** High frequency (every new partner hits this) x Medium effort (request + notification flow) = P1
**Spec needed?** Yes. This requires a request/approval workflow with notifications.

---

## Scenario #17: Ask chef to reorder or feature partner

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why partner leaves:** The chef controls `showcase_order` (integer field on `referral_partners`) which determines display position on the public page. Partners who want to be featured more prominently must ask the chef via email/phone. Unlike visibility (binary yes/no), ordering is a subjective chef decision about how to present their business.

**Context ChefFlow has:**

- `showcase_order` integer on `referral_partners` table
- Public showcase queries ordered by `showcase_order` ascending (`lib/partners/actions.ts` line 1550)
- Partner can see their position implicitly in preview (relative to other partners)
- No mechanism for partner to request reordering
- Chef manages order from partner detail UI

**Data source?** No. This is a preference/negotiation workflow.

**Client-collaborative angle:** Not applicable. This is between partner and chef.

**Physical reality:** Conversational request. Low urgency. In-app note is appropriate.

**Compounding:** Low. Order preferences change occasionally (seasonal, new partners added, partnership deepens).

**Solution design:**

- Add a "Request feature/priority" note field on the partner preview page
- Attach the request to the chef's partner management view as an actionable note
- Show the partner that their request was seen (acknowledged state)
- Chef retains full control; this is a suggestion, not an action the partner can self-serve

**Where it appears:**

- `/partner/preview` (optional "suggest featuring" link)
- Chef partner management (incoming partner notes/requests)

**What remains as permanent exit:**
If the chef doesn't respond in-app, the partner may still email/call. The ordering decision is subjective and may require conversation. This bridges the request but cannot eliminate the negotiation.

**Priority:** Low frequency (rare, only ambitious partners) x Low effort (note/request field) = P4
**Spec needed?** No. Can be bundled with Scenario #16's request workflow.

---

## Batch Summary

| #   | Title                                           | Reclassified To     | Spec Needed? |
| --- | ----------------------------------------------- | ------------------- | ------------ |
| 11  | Find a cover image URL                          | Reducible           | No           |
| 12  | Edit or crop venue photos                       | Permanent           | No           |
| 13  | Update the partner's own website                | Permanent           | No           |
| 14  | Update external booking page copy               | Permanent           | No           |
| 15  | Check how public listing looks outside ChefFlow | Partially Reducible | No           |
| 16  | Ask chef to make profile public                 | Reducible           | Yes          |
| 17  | Ask chef to reorder or feature partner          | Bridgeable          | No           |

---

## Key Findings

- **2 Reducible** (#11, #16): Direct upload and visibility request flow eliminate these exits
- **1 Partially Reducible** (#15): Preview page enhancement with verification state
- **1 Bridgeable** (#17): In-app request note bridges the communication
- **3 Permanent** (#12, #13, #14): Creative editing and external platform management will always be external

**Highest-impact build:** Scenario #16 (request publish) affects every new partner and blocks their public visibility. Combined with Scenario #11 (direct image upload), these two builds eliminate the most common friction in the partner profile content category.

**Existing infrastructure leveraged:**

- `lib/images/cloudinary.ts` for image optimization
- `addPartnerImage()` in `lib/partners/actions.ts` (chef-side pattern to adapt)
- Upload components exist across the codebase (69 files reference upload patterns)
- Partner location change request flow (`requestPartnerLocationChange`) provides a pattern for partner-initiated requests with chef approval
