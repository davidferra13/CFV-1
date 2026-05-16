# Event Media Vault

> **Status:** SPEC-READY
> **Priority:** P0
> **Origin:** "Picky Client" persona stress test, edge case: chef scrolled 2 years of Snapchat and Instagram to remember what they cooked (2026-05-16)
> **Depends On:** Event Total Recall

---

## Problem Statement

The chef took incredible photos during the 60th birthday dinner. Plated dishes, prep shots, the venue, the table setup, the sunset on the beach. They posted some on Instagram and Snapchat. They edited some into polished portfolio pieces. They shot some video.

Two years later, the client texts "we loved what you made last time." The chef scrolls back through two years of camera roll, two years of Instagram posts, two years of Snapchat stories (most expired), trying to find evidence of what they cooked.

This is insane. The chef created incredible content documenting their work, and none of it is connected to the event record. It's scattered across 5 apps on their phone. The infrastructure should make this impossible.

Meanwhile, BEFORE the event, the client sent 5 photos of the house, the kitchen, the outdoor dining area via text message. Those photos are buried in a text thread from 2 years ago too. The chef can't find them either.

---

## Solution

### 1. Media Tiers (Not All Photos Are Equal)

Every event has a media vault with four tiers:

| Tier          | Description                                                                         | Visibility                | Purpose                                               |
| ------------- | ----------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------- |
| **Raw**       | Unfiltered camera roll dumps. Some great, some bad. The full documentation.         | Chef-only                 | Personal archive, memory, evidence of what happened   |
| **Curated**   | Chef's picks. Good composition, good lighting, representative of the work.          | Chef + client (if shared) | Client photo gallery (spec #17), portfolio candidates |
| **Polished**  | Edited, color-corrected, cropped. Portfolio-grade.                                  | Public (if chef enables)  | Chef profile portfolio, social proof loop             |
| **Published** | Already posted to social media. Includes the post itself (caption, platform, date). | Public                    | Cross-referenced with social presence, proof of work  |

Chef uploads once, tags tier. Can promote (raw -> curated -> polished) or keep at current tier.

### 2. Pre-Event Venue Photos

When a client sends photos of the venue, kitchen, or dining space during the booking process:

- Chef saves them to the event's media vault tagged as `venue`
- Venue photos link to the venue profile (from Event Total Recall spec)
- Next time the chef books at the same venue: "You have 5 venue photos from the March 2024 event. View?"
- Includes: kitchen layout, counter space, oven/range, outdoor setup, parking, access points
- Chef can annotate photos: "This is the only prep counter. Bring folding table." "Grill is gas, 4 burners."

### 3. Media Upload Flow

**During the event:**

- Chef can snap photos directly through ChefFlow (or upload from camera roll)
- Photos auto-tagged with: event ID, timestamp, GPS (venue confirmation)
- Quick-tag options: `prep`, `plated`, `venue`, `table`, `team`, `guest` (opt-in), `behind-scenes`
- Batch upload after the event: select 50 photos from camera roll, drag to the event vault

**After the event:**

- Polished/edited photos uploaded separately with `polished` tier
- Social media posts linked: paste the Instagram/TikTok URL, system stores a reference and screenshot
- Video uploads: short clips stored locally, longer videos as links (YouTube, Vimeo)

### 4. Media as Memory

This is the critical integration with Event Total Recall:

- When the chef searches "what did I make for [Name]?" the answer includes PHOTOS of the dishes
- A plated photo IS the answer. Better than text describing "herb-crusted lamb."
- Event archive card shows: menu text + 3-5 curated photos as thumbnails
- Chef can tap any photo to see full-size, see which course it was, see the recipe link

**The Snapchat/Instagram problem solved:**

- Chef never needs to scroll social media to remember events
- All media lives in ChefFlow, searchable by: event, client, date, dish, venue, tag
- "Show me all plated photos from 2024" -> instant gallery
- "Show me every time I made lamb" -> cross-event dish photo search

### 5. Media Consent and Permissions

Some clients don't want photos taken. Some want photos but not posted publicly. Track this per event:

**Consent levels:**

| Level            | Meaning                                        | Chef Can                                                 |
| ---------------- | ---------------------------------------------- | -------------------------------------------------------- |
| **No photos**    | Client doesn't want any photography            | Nothing. Don't bring the camera.                         |
| **Private only** | Photos OK for chef's records, not public       | Upload to raw/curated tier. No publishing. No portfolio. |
| **Portfolio OK** | Photos can be used in chef's portfolio/profile | All tiers. Can appear on public chef profile.            |
| **Social OK**    | Photos can be posted on social media           | Everything. Full publishing rights.                      |

- Consent captured during booking (contract clause or explicit question)
- Stored on the event record
- System enforces: if consent is "private only," polished photos cannot be promoted to portfolio
- If a curated photo is shared to client gallery, consent for that sharing is separate from public portfolio consent
- Guest-specific consent: some guests may not want to appear in photos (track per-guest)

### 6. Social Media Post Archive

When the chef posts about an event on Instagram, TikTok, Facebook, or anywhere:

- Paste the URL into the event's media vault
- System captures: platform, post date, caption text, engagement metrics (if accessible)
- Screenshot of the post stored as a reference (in case the post is deleted later)
- Chef can see: "I posted 3 times about this event on Instagram. Total reach: [X]."
- Cross-reference: which events generated the most social engagement? Which dishes photograph best?

### 7. Client-Sent Media Ingestion

Clients send photos via text, email, and WhatsApp constantly:

- Venue photos before the event
- "Here's a photo of the dining area" during planning
- "Here's what the table looks like" on event day
- Post-event: "Here are some photos from the night!"

These photos need a home:

- Chef can forward/upload client-sent photos to the event vault with a `client-sent` tag
- If Gmail sync is active: photos from email threads auto-flagged for import
- Client-sent photos tagged with source: "Sent by [Client Name] on [date]"
- Venue photos from clients auto-linked to the venue profile

### 8. Video Content

Short-form video is the chef's most valuable marketing asset:

- Event vault supports video uploads (local storage, not cloud)
- Videos tagged same as photos: tier, course, tag
- Video thumbnails display in the event archive
- Publishable videos can be linked from the chef's public profile
- "Show reel" feature: auto-compile curated clips from multiple events into a highlight reel (future, flag only)

---

## Edge Cases

### A. Chef Didn't Take Photos at an Older Event

Pre-ChefFlow events or events where the chef forgot to photograph:

- Event archive still works with text-only records
- Chef can retroactively add photos found later (camera roll, social media, cloud backup)
- Partial media is better than none. Even one photo triggers visual recall.

### B. Client Requests Photo Deletion

Client changes their mind about photo consent after the event:

- Chef can remove photos from client-facing gallery instantly
- Portfolio/public photos removed on request
- Raw/chef-only photos: chef decides (these are their work records, not client-facing)
- Audit log: "Photos removed from public profile on [date] at client request"

### C. Same Venue, Different Client

Chef cooked at the beach mansion for the mother-in-law, now cooking there for the picky client mother. Same kitchen, same setup.

- Venue profile aggregates photos from ALL events at that location
- Chef sees the most recent venue photos regardless of which client's event they came from
- Kitchen notes and equipment lists shared across events at the same venue
- New client's event doesn't show the other client's personal photos (privacy boundary). Only venue/kitchen photos are shared.

### D. Media Storage Limits

Photos and videos take space. Local filesystem strategy:

- Photos compressed for web viewing, originals preserved
- Videos: short clips stored locally, longer videos as external links
- Archive tier: old event media can be moved to archive storage (slower access, same searchability)
- Never auto-delete media. Chef's work documentation is their intellectual property.

---

## Files Likely Touched

- `lib/media/vault-actions.ts` (new, media CRUD with tier/tag system)
- `lib/media/consent-actions.ts` (new, consent tracking per event, per guest)
- `lib/media/search-actions.ts` (new, cross-event media search by client, dish, venue, date, tag)
- `lib/media/social-archive.ts` (new, social media post reference storage)
- `lib/media/client-media-ingest.ts` (new, import client-sent photos)
- `lib/events/venue-memory.ts` (extend with venue photo linking)
- `lib/events/archive-actions.ts` (extend with media vault integration)
- `components/media/media-vault-panel.tsx` (new, upload, tier, tag UI)
- `components/media/photo-grid.tsx` (new, filterable gallery view)
- `components/media/consent-selector.tsx` (new, 4-level consent picker)
- `components/media/social-post-card.tsx` (new, archived social post display)
- `components/events/event-archive-card.tsx` (extend with photo thumbnails)
- `app/(chef)/events/[id]/media/page.tsx` (new, event media vault page)
- `app/(chef)/media/page.tsx` (new, global media search across all events)
- Database: `event_media` table (event_id, file_path, tier, tags[], source, consent_level, caption, timestamp, dish_id), `media_consent` table (event_id, consent_level, guest_exceptions[]), `social_posts` table (event_id, platform, url, caption, screenshot_path, post_date, engagement_metrics)

---

## Verification

### Core Vault

- [ ] Chef can upload photos to event vault with tier (raw/curated/polished/published)
- [ ] Photos taggable: prep, plated, venue, table, team, behind-scenes
- [ ] Batch upload from camera roll works
- [ ] Video uploads supported (local storage)

### Media as Memory

- [ ] Event archive card shows photo thumbnails alongside menu text
- [ ] "What did I make for [Name]?" search returns photos of plated dishes
- [ ] Cross-event search by dish name returns all photos of that dish
- [ ] "Show me all plated photos from 2024" returns correct results

### Venue Photos

- [ ] Client-sent venue photos stored against venue profile
- [ ] Venue photos accessible from future events at same location
- [ ] Kitchen annotations persist (notes on specific photos)

### Consent

- [ ] Consent level captured per event (no photos / private / portfolio / social)
- [ ] System prevents publishing private-consent photos to portfolio
- [ ] Guest-specific consent exceptions tracked
- [ ] Client photo deletion request honored instantly on public surfaces

### Social Archive

- [ ] Social media post URL stored with platform, caption, date
- [ ] Screenshot of post captured as backup reference
- [ ] Cross-event social engagement queryable

### Client-Sent Media

- [ ] Client-sent photos uploadable with source attribution
- [ ] Venue photos from clients auto-linked to venue profile
- [ ] Gmail-synced photo attachments flagged for import
