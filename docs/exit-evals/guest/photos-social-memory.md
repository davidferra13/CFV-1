# Exit Eval: Guest / PHOTOS, SOCIAL & MEMORY

> Wave 4 | 6 scenarios | Category 8
> Evaluated: 2026-05-25 | Mode: Solo | Status: NEEDS-DEVELOPER-REVIEW

---

## Scenario #48: Take event photos

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why guest leaves:** The guest needs to use their device's native camera hardware to capture images. No web app can replace the native camera experience (shutter speed, burst mode, HDR, portrait mode, zoom, etc.). The guest opens their phone camera app because that is the only tool that can physically capture the moment.

**Context ChefFlow has:**

- Event date, time, location, occasion
- Guest identity (via token/cookie)
- Photo consent status from RSVP
- Event share token for immediate upload path
- Guest gallery already exists on share page

**Data source?** No. The camera is a physical hardware device, not a data API.

**Client-collaborative angle:** The host's photo consent settings (already collected during RSVP via `photo_consent` field in `event_guests`) determine whether photos can be shared. The Circle/share page already serves as the destination for captured photos.

**Physical reality:** This is entirely a physical moment. Guests are at dinner, possibly with drinks in hand, dim lighting, social setting. The camera app is muscle memory. The key moment is AFTER capture, when the guest wants to share.

**Compounding:** Medium. Each photo becomes part of the event memory (recap page, Circle gallery, chef portfolio). Photos compound into the chef's marketing asset library and the group's shared memory.

**Solution design:**

- The upload path already exists and works well (`GuestPhotoGallery` on share page with `uploadGuestPhoto` server action)
- Consider adding camera-direct capture via `<input type="file" capture="environment">` attribute to make the upload button open camera directly
- Add a post-event push/email reminder: "Share your photos from tonight" with deep link back to share page photo section

**Where it appears:**

- `/share/[token]` page, Photos card (already live)
- Post-event email via `sendGuestThankYou` in `lib/guests/comms-actions.ts` (already includes recap URL)

**What remains as permanent exit:**
The act of taking the photo itself. The native camera app will always be the capture tool. ChefFlow's job is to make the upload path from camera roll to event gallery as frictionless as possible (already built).

**Priority:** High frequency (every event with guests) x Low effort (mostly built) = Low remaining work
**Spec needed?** No. Core functionality exists. Minor enhancement: `capture` attribute on file input.

---

## Scenario #49: Edit photos before sharing

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why guest leaves:** The guest wants to crop, filter, adjust brightness/contrast, remove blemishes, or apply aesthetic edits before sharing their dinner photos. Photo editing is a deep creative domain with dedicated tools (iOS Photos, Lightroom, Snapseed, VSCO) that ChefFlow should never attempt to replicate.

**Context ChefFlow has:**

- The destination (guest photo gallery, recap page)
- Photo consent status
- Event context for tagging/captioning
- 10MB file size limit already handles edited outputs

**Data source?** No. Photo editing is a creative tool, not a data source.

**Client-collaborative angle:** None. Photo editing is purely personal creative expression.

**Physical reality:** Editing typically happens after the event, on the couch, reviewing camera roll. This is a relaxed screen-based activity. The guest will edit in their preferred tool, then return to ChefFlow to upload the final version.

**Compounding:** Low. Each edited photo is a one-off creative decision. No learning accumulates.

**Solution design:**

- Accept final edited uploads (already works: `uploadGuestPhoto` accepts any image file up to 10MB, supports JPG/PNG/HEIC)
- Ensure the upload flow does not re-compress or degrade edited images
- The file input already accepts `image/*` which includes edited exports from any app

**Where it appears:**

- `/share/[token]` photo upload form (already live)
- Hub photo gallery for Circle members (already live via `uploadHubMediaFile`)

**What remains as permanent exit:**
All photo editing. ChefFlow accepts the output. Never attempts to be an editor.

**Priority:** Medium frequency (subset of photo-takers edit) x Zero effort (already handled) = No action needed
**Spec needed?** No.

---

## Scenario #50: Post dinner photos socially

**Original classification:** Permanent
**Reclassified to:** Bridgeable

**Why guest leaves:** The guest wants to share dinner photos on Instagram, TikTok, or Facebook to show their social network the experience. The social graph, audience, and posting mechanics all live on external platforms. However, ChefFlow can make the guest's social posting better by providing share-ready context (chef tag, event details, location).

**Context ChefFlow has:**

- Event occasion, date, location
- Chef name and social handles (stored in chef profile: `instagram_handle`, social links)
- Menu served (event_menu_items)
- Photos already uploaded to ChefFlow gallery
- Share snippets system (`lib/events/default-behaviors.ts` generates `shareSnippets`)
- Recap page URL with OpenGraph metadata for rich link previews

**Data source?** No. Social platforms are interactive destinations, not data sources.

**Client-collaborative angle:** The chef benefits from being tagged. The chef's social handles should be easy for guests to copy. The share page already has chef attribution ("Hosted by [ChefName]").

**Physical reality:** Screen-based. Guest is on their phone, switching between ChefFlow recap/photos and their social app. Copy-paste is the bridge.

**Compounding:** High for the chef. Every guest social post is free marketing. Compounding value as more events generate more guest-created content mentioning the chef.

**Solution design:**

- Add "Share to social" quick actions on the recap page with pre-filled copy text (chef mention, event name, recap link)
- Surface chef's Instagram/social handle prominently on recap and share pages for easy tagging
- Provide a "Copy caption" button with a pre-written social snippet: "Amazing dinner by @[chef_handle]! [occasion] [recap_link]"
- The `social-captions.ts` template system already exists for the chef side; create a lightweight guest-facing equivalent
- Add OpenGraph image to recap page (event hero photo or first gallery photo) so shared links preview beautifully

**Where it appears:**

- `/share/[token]/recap` page (add share actions)
- Guest photo lightbox (add "Share" button per photo)
- Post-event email (include social share prompt)

**What remains as permanent exit:**
The actual posting to Instagram/TikTok/Facebook. ChefFlow can pre-load context and make copying effortless, but the guest will always open their social app to post.

**Priority:** High frequency (social sharing is cultural default) x Medium effort (UI additions, copy generation) = High value
**Spec needed?** No. Incremental additions to recap page. Add to build queue as enhancement.

---

## Scenario #51: Store photos long term

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why guest leaves:** The guest wants their dinner photos safely stored in their personal photo library (iCloud Photos, Google Photos) for long-term memory. Personal cloud storage is the canonical archive. However, ChefFlow can ALSO serve as a secondary memory layer, especially for the collective event memory that no single guest's camera roll captures fully.

**Context ChefFlow has:**

- All guest-uploaded photos stored in `guest-photos` storage bucket
- Chef-uploaded professional photos in `event_photos` table
- Recap page aggregates all photos from all guests
- Event metadata (date, occasion, menu, attendees) enriches the photo context
- `event_recaps` table tracks recap video render status (Remotion-based)
- Client portal has `ClientEventPhotoGallery` with download capability

**Data source?** Partially. ChefFlow IS a photo storage system for event photos. The permanent exit is only for personal device backup/sync.

**Client-collaborative angle:** The collective gallery (all guests' photos in one place) is something no individual's camera roll provides. This is ChefFlow's unique value: the complete event photo set, curated and captioned.

**Physical reality:** Screen-based. Download/export is the bridge. The client portal already has `handleDownloadAll()` for downloading photos.

**Compounding:** High. The photo gallery is a permanent memory asset. Years later, guests can return to the recap URL and see all photos from the event. This compounds as a chef's portfolio and a group's shared history.

**Solution design:**

- Add "Download All Photos" button to the public recap page (currently only on client portal)
- Provide individual photo download from the lightbox view on share/recap pages
- Photos already persist in ChefFlow storage indefinitely (no expiry)
- The recap URL (`/share/[token]/recap`) serves as a permanent bookmark for the memory
- Consider a "Save to your account" prompt for guests who want persistent access across events

**Where it appears:**

- `/share/[token]/recap` page (add download actions)
- Guest photo lightbox (add download button)
- Post-event email already links to recap page

**What remains as permanent exit:**
Syncing to personal iCloud/Google Photos. ChefFlow stores the collective event memory; personal device backup is always external.

**Priority:** Medium frequency (some guests want downloads) x Low effort (download button on recap) = Medium value
**Spec needed?** No. Single UI addition to recap page.

---

## Scenario #52: Share recap with friends

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why guest leaves:** The guest wants to forward the event recap to friends who attended (or didn't) via text, WhatsApp, or email. The sharing itself happens in native messaging channels, but ChefFlow controls the content and the landing experience.

**Context ChefFlow has:**

- Full recap page at `/share/[token]/recap` with menu, photos, guest messages, testimonials
- OpenGraph metadata already configured (`generateMetadata` in recap page generates title, description, OG tags)
- Share snippets system for events (`buildPublicDefaults().shareSnippets`)
- `GuestNetworkShare` component already creates viewer/guest invite links
- The recap URL is publicly accessible (no auth required)
- Post-event thank-you email already includes recap URL

**Data source?** No. Native sharing channels are interactive destinations.

**Client-collaborative angle:** The host benefits from guests sharing the recap (social proof, word of mouth). The chef benefits from the "Book [ChefName]" CTA at the bottom of every recap page.

**Physical reality:** Screen-based. The guest copies a link or uses native share sheet to send to friends. The key is making the link easy to copy and the landing page beautiful.

**Compounding:** High for the chef. Every shared recap is a free marketing touchpoint with a built-in booking CTA. The recap page already has "Want to host your own private dining experience? Book [Chef]" at the bottom.

**Solution design:**

- Add native Web Share API button to recap page header (like `ClientEventPhotoGallery.handleShare()` already does)
- Add "Copy link" button alongside share button for fallback
- Ensure the recap URL is short and memorable (already: `/share/[token]/recap`)
- The OpenGraph metadata is already set for rich previews when shared
- Add "Share with friends" prompt in the post-event email alongside the recap link

**Where it appears:**

- `/share/[token]/recap` page header (add share/copy buttons)
- Post-event email from `sendGuestThankYou` (already links to recap)
- Guest portal post-event state

**What remains as permanent exit:**
The act of sending a message to friends via SMS/WhatsApp/email. ChefFlow provides the perfect link and landing page; the guest chooses their messaging channel.

**Priority:** High frequency (social sharing is natural post-event behavior) x Low effort (Web Share API + copy button) = High value
**Spec needed?** No. Minor UI addition to recap page.

---

## Scenario #53: Leave a public third-party review

**Original classification:** Permanent
**Reclassified to:** Bridgeable

**Why guest leaves:** The guest wants to leave a review on Google, Yelp, or a marketplace where it carries public trust weight. In-app reviews/testimonials (which ChefFlow already collects via `submitTestimonial` on the recap page and `/review/[token]`) serve the chef's owned profile, but public reviews on third-party platforms serve the chef's reputation in the broader market.

**Context ChefFlow has:**

- Chef's `google_review_url` stored in chef profile (configurable in settings)
- In-app testimonial collection already working on recap page (`TestimonialForm`)
- `/review/[token]` dedicated review page with star rating, written review, display name
- `/guest-feedback/[token]` detailed feedback (food quality, atmosphere, dish-level ratings)
- Review request drafter (`lib/ai/review-request.ts`) generates personalized asks
- External review source sync (`lib/reviews/external-actions.ts`) pulls Google/website reviews back in
- Yelp integration exists (`lib/integrations/yelp/`)

**Data source?** No. Third-party review platforms are interactive destinations with their own trust/reputation systems.

**Client-collaborative angle:** After the guest leaves an in-app review/testimonial, ChefFlow can surface the chef's preferred external review link as a "bonus" ask: "Loved it? Help others find [ChefName] too!" with a direct link to Google Reviews.

**Physical reality:** Screen-based. The guest clicks through to Google/Yelp, writes their review there. The key insight: collect the in-app review FIRST (frictionless, already on recap page), then offer the external link as a second step.

**Compounding:** Very high. External reviews are permanent public reputation assets. Each one compounds the chef's discoverability and trust score permanently.

**Solution design:**

- After in-app testimonial submission on recap page, show a "Help others find [Chef]" card with direct link to chef's `google_review_url`
- The link is already stored in the database and accessible on the chef profile
- Keep the two-step flow: easy in-app testimonial first (low friction), external review as opt-in second step (higher friction but higher value)
- The external review link should open in a new tab with return path preserved
- `draftReviewRequest` in `lib/ai/review-request.ts` already generates platform suggestions

**Where it appears:**

- `/share/[token]/recap` page, after testimonial submission (add "Review on Google" CTA)
- Post-event email could include external review link alongside recap
- `/guest-feedback/[token]` completion state (add external review prompt)

**What remains as permanent exit:**
Writing the actual review on Google/Yelp. The external platform owns the trust signal. ChefFlow's job is to make the path from "great experience" to "public review" as short as possible with a pre-loaded link.

**Priority:** High frequency (every completed event is a review opportunity) x Low effort (one CTA after testimonial) = High value
**Spec needed?** No. Single CTA addition to existing recap/review flows.

---

## Batch Summary

| #   | Title                             | Reclassified To     | Spec Needed? |
| --- | --------------------------------- | ------------------- | ------------ |
| 48  | Take event photos                 | Permanent           | No           |
| 49  | Edit photos before sharing        | Permanent           | No           |
| 50  | Post dinner photos socially       | Bridgeable          | No           |
| 51  | Store photos long term            | Partially Reducible | No           |
| 52  | Share recap with friends          | Bridgeable          | No           |
| 53  | Leave a public third-party review | Bridgeable          | No           |

---

## Key Findings

**ChefFlow's photo infrastructure is surprisingly mature:**

- `lib/guests/photo-actions.ts` provides full public upload/retrieval (no auth required)
- `GuestPhotoGallery` component with upload form, lightbox, privacy masking
- `RecapPhotoGrid` on the recap page displays the collective photo memory
- `HubPhotoGallery` for Circle-level photo sharing
- `PhotoConsentSummary` tracks consent status per guest
- Chef-side: `EventPhotoGallery` with drag-drop, tagging, portfolio flagging, reordering
- Client portal: `ClientEventPhotoGallery` with download-all and Web Share API

**The social/sharing pipeline is partially built:**

- Chef social posting: full pipeline (`event-social-actions.ts`, caption generation, platform adapters)
- Guest social sharing: mostly missing (no share buttons on recap, no copy-caption for guests)
- Recap page has great content but no share/download actions for guests

**Remaining gaps (all low-effort):**

1. Add Web Share API + copy-link button to recap page header
2. Add "Download All" button to public recap page (exists on client portal)
3. Add individual photo download from lightbox
4. Add "Review on Google" CTA after testimonial submission
5. Add guest-facing social copy snippet (chef handle + recap link)
6. Add `capture="environment"` to photo upload input for camera-direct flow
