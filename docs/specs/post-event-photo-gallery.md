# Post-Event Photo Gallery

> **Status:** SPEC-READY
> **Priority:** P1
> **Origin:** "Picky Client" persona stress test (2026-05-16)
> **Depends On:** Social Proof Loop (portfolio gallery component reuse)

---

## Problem Statement

Chef takes beautiful photos of the food. Client wants to see them. Wants to share them on Instagram. Wants to show friends what they missed. Right now those photos live on the chef's phone and never reach the client.

---

## Solution

### 1. Chef Photo Upload (Post-Event)

After event completion, prompt the chef to upload event photos:

- Trigger: event transitions to "completed" state
- Prompt on event debrief/closeout page: "Upload photos from this event"
- Drag-and-drop or mobile camera roll upload
- Auto-resize/compress for web (keep originals in local FS)
- Chef can tag photos: plated dish, prep, table setting, team, venue
- Chef selects which photos are client-visible vs portfolio-only vs private

### 2. Client Photo Gallery

On the client portal event page, after event completion:

- "Your Event Photos" section with grid gallery
- Only shows photos marked client-visible by chef
- Each photo expandable to full-screen
- "Download All" button (zip of full-resolution originals)
- Share buttons: copy image link, native share sheet
- Gallery link also works via the event recap email

### 3. Event Recap Email Enhancement

48 hours post-event (before the review request):

- Include 2-3 best photos as inline previews
- "View all photos" link to portal gallery
- This becomes the "shareable moment" the client forwards to friends
- Friends see the photos, click "Hire [Chef]" link at bottom (referral loop)

### 4. Integration with Social Proof Loop

Photos marked as "portfolio" by the chef flow into the portfolio gallery on their public profile (from social-proof-loop.md). Same upload, two destinations based on visibility tag.

### Files Likely Touched

- `lib/events/photo-actions.ts` (new, CRUD for event photos with visibility tags)
- `app/(chef)/events/[id]/photos/page.tsx` (new, upload + manage)
- `components/events/photo-upload-prompt.tsx` (new, post-completion trigger)
- `components/events/photo-gallery.tsx` (new, reusable grid gallery)
- `app/client/[token]/page.tsx` (add photo gallery section post-completion)
- `components/client-portal/event-photo-gallery.tsx` (new, client-facing)
- `lib/email/templates/event-recap.tsx` (new or enhance, include photo previews)
- `lib/lifecycle/trigger-engine.ts` (add photo upload prompt at completion)
- Database: `event_photos` table (event_id, file_path, tag, visibility, sort_order, uploaded_at)

---

## Verification

- [ ] Event completion prompts chef to upload photos
- [ ] Chef can tag photos and set visibility (client/portfolio/private)
- [ ] Client portal shows photo gallery for completed events
- [ ] "Download All" produces zip of client-visible photos
- [ ] Event recap email includes photo previews with gallery link
- [ ] Portfolio-tagged photos appear on chef's public profile
- [ ] Photos auto-compressed for web, originals preserved
