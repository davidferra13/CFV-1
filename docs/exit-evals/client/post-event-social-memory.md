# Exit Eval: Client / POST-EVENT, SOCIAL & MEMORY

> Wave 2 | 7 scenarios | Category 13
> Evaluated: 2026-05-25 | Mode: Solo | Status: NEEDS-DEVELOPER-REVIEW

---

## Scenario #85: Post event photos

**Original classification:** Permanent exit
**Reclassified to:** Partially Reducible

**Why client leaves:** Client wants to share the event experience with their social network (Instagram, TikTok, Facebook). The act of posting is performative and social; it belongs on platforms where their audience lives. The client is seeking validation, memory-marking, and social capital from having hosted a special event.

**Context ChefFlow has:**

- Event date, occasion, location, guest count
- All event photos (chef-uploaded and guest-uploaded via `lib/guests/photo-actions.ts`)
- Full menu served (dishes, courses, descriptions)
- Chef name and profile
- Social caption templates (`lib/templates/social-captions.ts`) with tone variants (personal/elegant/casual)
- Hashtag library organized by occasion type
- Event-to-social pipeline (`lib/social/event-social-actions.ts`) that generates platform-specific posts

**Data source?** No. Social platforms are the destination, not a data source.

**Client-collaborative angle:** Guests contribute photos via the share page (up to 20 per guest per event). The Dinner Circle already collects crowd-sourced event photography. The recap page (`app/(public)/share/[token]/recap/page.tsx`) aggregates guest messages and photos, forming a rich content pool for social sharing.

**Physical reality:** Screen-based. Client is browsing their phone post-event, selecting highlights. No hands-free needs. The recap video system (`lib/remotion/render-event-recap.ts`) already renders shareable video content.

**Compounding:** Medium. Each posted event builds the chef's social proof and the client's hosting identity. Photo collections improve over events as guests learn the upload flow.

**Solution design:**

- "Share to Social" button on client recap page that packages photos + caption into platform-native share sheets (Web Share API)
- Pre-generated captions using existing `lib/templates/social-captions.ts` system, adapted for client voice (not chef voice)
- Photo picker on recap page letting client select their favorite shots for sharing
- Open Graph metadata already exists on public recap pages (`app/(public)/share/[token]/recap/page.tsx` has OG tags) for link previews
- Downloadable "highlight reel" from the Remotion recap video system

**Where it appears:**

- Client event recap page (`app/(client)/my-events/[id]/recap`)
- Public share recap page (`app/(public)/share/[token]/recap`)
- Post-event email with direct recap link

**What remains as permanent exit:**
The actual posting to Instagram/TikTok/Facebook. ChefFlow prepares the content package; the social platform receives it. The creative act of crafting the post caption in the client's own voice may override templates.

**Priority:** High frequency (most clients photograph events) x Low effort (Web Share API + existing photo/caption infrastructure) = HIGH
**Spec needed?** No. Existing infrastructure covers 80%. Wire Web Share API to recap page photo grid.

---

## Scenario #86: Store photos in personal album

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why client leaves:** Client wants event photos in their personal photo library (iCloud, Google Photos) alongside life memories. ChefFlow is a service tool, not a personal archive. The client's photo library is their lifelong memory system.

**Context ChefFlow has:**

- All event photos (chef-uploaded and guest-contributed)
- Photo metadata: captions, photo type, guest attribution
- Full-resolution files stored in guest-photos storage bucket
- Photo gallery with lightbox (`components/sharing/recap-photo-grid.tsx`)
- Event context (date, occasion, location) for album naming

**Data source?** No. Personal photo libraries are the destination.

**Client-collaborative angle:** Guests upload photos to the event share page. The Dinner Circle's photo contribution flow already aggregates the full event photo set. Client gets access to photos they never took themselves.

**Physical reality:** Screen-based. Client is scrolling through photos on their phone, downloading selectively or in bulk.

**Compounding:** Low. Each event is a discrete photo set. No learning compounds across events, though having all guest photos in one place adds value each time.

**Solution design:**

- "Download All" button on client recap page (zip of full-resolution photos)
- Individual photo download from lightbox view
- Album-ready naming (event date + occasion in filename)
- Optional: "Add to Google Photos" integration via Google Photos API (if cost-free)

**Where it appears:**

- Client event recap page photo gallery (`app/(client)/my-events/[id]/recap/recap-client.tsx`)
- Public share recap page photo grid

**What remains as permanent exit:**
The personal photo library (iCloud, Google Photos, camera roll) is the permanent home for life memories. ChefFlow is the source, not the archive. Bulk download is the bridge.

**Priority:** Medium frequency (clients who value photos) x Low effort (download button on existing gallery) = MEDIUM
**Spec needed?** No. Add download buttons to existing `RecapClient` photo gallery component.

---

## Scenario #87: Leave a public review

**Original classification:** Permanent exit
**Reclassified to:** Partially Reducible

**Why client leaves:** Client wants to leave a public review on Google, Yelp, or a marketplace where other potential clients will see it. The social proof has value only on high-traffic platforms where strangers search.

**Context ChefFlow has:**

- In-app review system: `ClientFeedbackForm` on completed event detail page (line 937-939 of event detail page)
- Token-based public review flow (`app/(public)/review/[token]/page.tsx`) with rating + content
- Testimonial submission system (`lib/testimonials/submit-testimonial.ts`)
- Google Review URL stored per tenant (`getGoogleReviewUrlForTenant` in `lib/reviews/actions.ts`)
- Google review click tracking with loyalty trigger (`google_review_clicked` fires loyalty points)
- `SubmittedReview` component shows existing review and links to Google Review

**Data source?** No. Google/Yelp are the destinations for public reputation.

**Client-collaborative angle:** The review request is already part of the post-event follow-up workflow (`lib/workflows/definitions/post-event-follow-up.ts`, step `review_request`). ChefFlow prompts the client at the right moment.

**Physical reality:** Screen-based, relaxed post-event moment. Client is at home, phone in hand.

**Compounding:** High for the chef. Each public review builds permanent reputation. For the client, low (one-off action per event).

**Solution design:**

- Already largely built: in-app review + Google Review link-out with tracking
- Pre-fill review content: after client writes in-app review, offer "Post this on Google too?" with one-tap copy of their review text
- Prompt timing optimization: gratitude system (`lib/commitment/gratitude.ts`) ensures thank-you comes before review request
- Multi-platform links: add Yelp/marketplace profile URLs alongside Google (currently only Google stored per tenant)

**Where it appears:**

- Client event detail page `#review` section (completed events)
- Post-event follow-up workflow (step 3: review_request)
- Token-based review pages (`/review/[token]`)
- Event history page has "Review" button per past event

**What remains as permanent exit:**
Actually posting on Google/Yelp. The platforms own the review. ChefFlow can prepare content and direct traffic, but cannot post on behalf of the client.

**Priority:** High frequency (every completed event triggers review request) x Already built (90%) = LOW (polish only)
**Spec needed?** No. System is built. Polish: add Yelp URL field, pre-fill copy button after in-app review.

---

## Scenario #88: Send thank-you notes to guests

**Original classification:** Bridgeable
**Reclassified to:** Reducible + Client-Collaborative

**Why client leaves:** After hosting, the client wants to thank guests personally. They currently text, email, or use Paperless Post because their guest contact info lives in their phone. The act is social etiquette, not a service interaction.

**Context ChefFlow has:**

- Full guest list with names, emails, RSVP status, dietary info (`event_guests` table)
- Guest communication infrastructure (`lib/guests/comms-actions.ts`)
- Post-event circle message templates (`lib/templates/post-event-circle-messages.ts`) with `generateThankYouCircleMessage`
- Event share page where guests already interact
- Recap page that can serve as the "thank you" vehicle (photos + messages + re-booking CTA)
- Event occasion, date, menu served for personalization

**Data source?** No. The guest contact list is already in ChefFlow from RSVP.

**Client-collaborative angle:** The Dinner Circle already holds guest names and emails. The client hosted the Circle. Thank-you notes can be sent through the Circle: a message from host to all attendees with a link to the recap page.

**Physical reality:** Screen-based, post-event leisure moment. Could be voice-initiated ("Remy, send my guests a thank-you with the recap link").

**Compounding:** Medium. Guest relationships compound. A client who always sends beautiful post-event thank-yous builds loyalty in their own social circle, driving future bookings (referrals).

**Solution design:**

- "Send Thank-You to Guests" button on completed event detail page
- Template: personalized message + recap page link (guests see photos, menu, can leave their own review)
- Use existing guest email list from RSVP data (emails already collected)
- Pre-written templates from `lib/templates/post-event-circle-messages.ts` adapted for client voice
- One-tap send to all attending guests, or selective send
- Optional: attach a "Book your own event" referral link at the bottom (referral system already built)

**Where it appears:**

- Client event detail page (completed events section)
- Post-event workflow step (after chef's thank-you, before rebook prompt)
- Client portal notification/reminder

**What remains as permanent exit:**
Clients who prefer to text/call guests personally. Some thank-yous are intimate and belong in existing relationships. ChefFlow covers the "broadcast thank-you" use case.

**Priority:** Medium frequency (hosts with 6+ guests) x Medium effort (email template + send action for client role) = MEDIUM-HIGH
**Spec needed?** Yes, but lightweight. Wire existing templates and guest email list into a client-facing action.

---

## Scenario #89: Recommend the chef to friends

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible

**Why client leaves:** Client wants to tell friends about the chef. The recommendation happens in social contexts: text threads, dinner conversations, group chats. Word-of-mouth is inherently social and external.

**Context ChefFlow has:**

- Full referral system: `lib/referrals/client-referral-actions.ts` with lifecycle tracking (invited -> signed_up -> first_event_completed)
- Client referral code (stored on `clients` table, `referral_code` field)
- Referral stats dashboard: `app/(client)/my-referrals/referrals-client.tsx` with copy-code button, stats, timeline
- Referral health tracking: `lib/clients/referral-health-actions.ts`
- Referral chain mapping: `lib/intelligence/referral-chain-mapping.ts`
- Referral appreciation system: `lib/referrals/appreciation-actions.ts`
- Loyalty points awarded for referrals
- Chef profile URL for sharing
- Post-event recap page (shareable public link with "Book [Chef]" CTA)

**Data source?** No. Social channels are the distribution mechanism.

**Client-collaborative angle:** The referral system already makes the client a collaborator. They share a code; their friends use it; both get rewarded. The recap share page has a "Book [Chef]" CTA that converts guests into leads.

**Physical reality:** Conversational. "You should try my chef!" happens over dinner, text, or group chat. The referral code needs to be instantly accessible and shareable.

**Compounding:** High. Each successful referral builds the chef's client base and the client's reward balance. Referral chains create network effects tracked by `referral-chain-mapping.ts`.

**Solution design:**

- Already largely built with referral code system + tracking + rewards
- Add: "Share after your event" prompt on recap page (post-event is peak recommendation moment)
- Rich share card: Web Share API with pre-formatted message + chef profile link (not just a code)
- Post-event email to host includes "Share with a friend" CTA with referral link embedded
- Recap page footer already has "Book [Chef]" button for guests (line 143-153 of recap page)

**Where it appears:**

- Client referrals page (`/my-referrals`)
- Post-event recap page (as a natural "loved it? share it" moment)
- Client event detail page (completed events)
- Post-event email communications

**What remains as permanent exit:**
The actual social conversation. Recommendations happen in text threads, at dinner parties, in group chats. ChefFlow provides the referral link and tracks conversions, but cannot replace word-of-mouth.

**Priority:** High frequency (every satisfied client is a potential referrer) x Already built (85%) = LOW (polish: post-event timing prompt)
**Spec needed?** No. System is robust. Add post-event "Share" prompt timing to recap page.

---

## Scenario #90: Recreate a dish at home

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why client leaves:** Client loved a dish and wants to try making it at home. They Google for recipes, check the chef's recipe card, or try to remember from notes. The gap: they know WHAT was served but need the HOW.

**Context ChefFlow has:**

- Shared recipe system: `lib/recipes/client-shared-recipes-actions.ts` with `getSharedRecipesForEvent`
- Chef controls sharing: `shareable_with_client = true` flag on recipes
- Full recipe chain: event -> menus -> dishes -> components -> recipes
- Recipe details: name, description, category, dietary tags, photo
- Menu served is visible on recap page (dish names, courses, descriptions)
- Recipe share email template: `lib/email/templates/recipe-share.tsx`
- Event menu items stored permanently in `event_menu_items` table

**Data source?** No. The recipe IS the data, and ChefFlow owns it (chef's intellectual property with controlled sharing).

**Client-collaborative angle:** The client already experienced the dish. Their feedback (from post-event learning, `lib/events/post-event-learning-actions.ts`) tells the chef which dishes were hits. Popular dishes become candidates for recipe sharing.

**Physical reality:** Kitchen moment. Client is cooking at home, needs hands-free recipe reference. Large text, step-by-step, voice-readable. This is identical to the chef's mid-cook scenario.

**Compounding:** High. Shared recipes are permanent client assets. A client who successfully recreates dishes becomes a deeper fan (and re-booker for harder dishes). Recipe sharing builds the chef's brand as an educator.

**Solution design:**

- Already built: `getSharedRecipesForEvent` fetches shareable recipes for completed events
- Surface recipes on client recap page (currently photos + menu + chef notes, but no recipe links visible)
- Client-friendly recipe view: simplified instructions, no professional jargon, home-kitchen quantities
- Print-friendly recipe card (PDF) for kitchen use
- "Request Recipe" button on menu items where `shareable_with_client` is false (notifies chef)
- Voice-friendly format for Remy to read aloud while cooking

**Where it appears:**

- Client event recap page (add "Recipes" section when shared recipes exist)
- Client event detail page (completed events with shared recipes)
- Client recipe collection page (aggregate of all shared recipes across events)
- Email: recipe share notification when chef marks a recipe shareable after the event

**What remains as permanent exit:**
Dishes the chef does NOT share recipes for (their IP). Client may still Google generic versions. The chef controls what is shared; this is by design.

**Priority:** High frequency (clients regularly ask for recipes) x Low effort (backend exists, needs client-facing surface) = HIGH
**Spec needed?** No. Backend is built. Wire `getSharedRecipesForEvent` into recap page UI. Add recipe section to `RecapClient` component.

---

## Scenario #91: Remember what was served months later

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why client leaves:** Months later, client is planning another event, telling a friend about a dish, or trying to remember dietary accommodations. They search emails, scroll through photos, or check old messages. The memory is scattered across personal systems.

**Context ChefFlow has:**

- Complete event history: `app/(client)/my-events/history/page.tsx` shows all past events with dates, occasions, guest counts, and prices
- Event recap with full menu: `getEventRecap` returns event details + photos + menu items + chef notes
- Menu items stored permanently in `event_menu_items` (dish name, description, course)
- Client event detail page shows menu, photos, guest list for every past event
- Event timeline with dates, locations, financial summaries
- Guest lists with dietary info (what was accommodated)
- Post-event learning data (`lib/events/post-event-learning-actions.ts`) tracking dish performance
- Client intelligence (`lib/client-intelligence/actions.ts`) building preference profiles over time

**Data source?** No. ChefFlow IS the data source. All event history is stored.

**Client-collaborative angle:** Guests who attended can also revisit the public recap page via their share token. The Circle retains the memory collectively.

**Physical reality:** Screen-based, casual browsing moment. Client is at home, scrolling through past events. Search and filter are key.

**Compounding:** Very high. Every completed event adds to the client's dining memory. Over years, this becomes an irreplaceable personal food history. The 50th event should be instantly findable.

**Solution design:**

- Already built: event history page + event detail + recap with full menu
- Add: search/filter on event history (by date range, occasion type, dish name)
- "What did we serve last time?" quick lookup from booking flow (when rebooking, show past menus)
- Menu timeline view: all dishes ever served across all events, chronologically
- Dish favorites: client marks dishes they loved (feeds back to chef intelligence)
- Remy integration: "What did we have at my birthday last year?" natural language query over event history

**Where it appears:**

- Client event history page (`/my-events/history`)
- Individual event detail and recap pages
- Booking flow (past menu reference when creating new event)
- Remy chat (natural language memory queries)

**What remains as permanent exit:**
Nothing meaningful. ChefFlow has 100% of the data needed to answer "what was served." The only exit would be if the client never logs in and relies on email search instead (which is a notification/engagement problem, not a data problem).

**Priority:** High frequency (repeat clients regularly reference past events) x Low effort (data exists, needs search + Remy integration) = HIGH
**Spec needed?** No. Data and pages exist. Add search to history page. Wire Remy to query event history.

---

## Batch Summary

| #   | Title                                 | Reclassified To                  | Spec Needed?      |
| --- | ------------------------------------- | -------------------------------- | ----------------- |
| 85  | Post event photos                     | Partially Reducible              | No                |
| 86  | Store photos in personal album        | Bridgeable                       | No                |
| 87  | Leave a public review                 | Partially Reducible              | No                |
| 88  | Send thank-you notes to guests        | Reducible + Client-Collaborative | Yes (lightweight) |
| 89  | Recommend the chef to friends         | Partially Reducible              | No                |
| 90  | Recreate a dish at home               | Reducible                        | No                |
| 91  | Remember what was served months later | Reducible                        | No                |

### Key Findings

**Infrastructure strength:** This category is remarkably well-served by existing code. The event recap system (`client-recap-actions.ts`, public share recap page, Remotion video), review system (in-app + Google link-out + token-based), referral system (full lifecycle tracking + rewards), and shared recipe system (`client-shared-recipes-actions.ts`) cover 80%+ of every scenario.

**Primary gaps:**

1. Client-facing recipe section missing from recap page UI (backend exists via `getSharedRecipesForEvent`)
2. No "Send Thank-You to Guests" client action (chef has it, client does not)
3. No search/filter on event history page
4. No Web Share API integration for social sharing from recap page
5. No bulk photo download on client recap

**Strongest existing systems:**

- Referral: code + tracking + rewards + chain mapping + appreciation (85% complete)
- Review: in-app + Google link-out + tracking + loyalty triggers + token-based (90% complete)
- Event memory: history page + recap + menu items + photos + chef notes (90% complete)
- Social captions: templates + AI generation + hashtags + platform variants (chef-side, needs client adaptation)

---

_All scenarios marked NEEDS-DEVELOPER-REVIEW (solo mode, no chef input)_
