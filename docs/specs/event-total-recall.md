# Event Total Recall

> **Status:** SPEC-READY
> **Priority:** P0
> **Origin:** "Picky Client" persona stress test, edge case: chef couldn't remember what they served when a repeat client asked (2026-05-16)
> **Depends On:** Returning Client Recognition

---

## Problem Statement

A client texts the chef: "We loved what you made last time!"

The chef freezes. It was two years ago. 20 people. A 60th birthday on the beach. But what did they actually cook? Was it the lamb or the short rib? What was the appetizer? Did they do a pasta course? What was the dessert besides the Lord of the Rings cake? How much did they charge? What was the tip? What equipment did they bring? What did the client provide?

The chef scrolls through old texts. Checks a notes app. Digs through emails. Finds nothing useful. Responds with something vague. The client senses it. The magic of "this chef remembers everything about us" is gone.

This is the single most embarrassing moment in a private chef's career: being asked about a past event and drawing a blank. ChefFlow must make this impossible.

---

## Solution

### 1. Complete Event Archive

Every completed event produces a permanent, searchable archive containing:

**Service Details:**

- Date, time, duration
- Location (full address, venue type, notes about the space)
- Guest count (confirmed, actual)
- Occasion (birthday, anniversary, holiday, corporate, etc.)
- Service style (plated, family style, buffet, stations)
- Who provided what (chef brought X, client provided Y)
- Equipment used (chef's own vs client's kitchen)
- Kitchen notes (counter space, oven type, grill availability, parking, access instructions)

**Menu (Complete):**

- Every course, every dish, every component
- Dietary variants served (who got what)
- Any last-minute changes or substitutions
- Wine/beverage pairings if applicable
- Special items (the Lord of the Rings cake, custom requests)

**Financial:**

- Quote amount and line items
- Final invoice amount
- Payment method and dates
- Tip amount and date
- Any adjustments or credits
- Per-head cost (calculated)

**Contract:**

- Full contract text (archived, not just a reference)
- Terms agreed to
- Cancellation policy in effect
- Special clauses or amendments

**Communication History:**

- Key messages exchanged (opt-in archival, not surveillance)
- Decision points: when menu was approved, when deposit was paid, when changes were requested
- Response times (how quickly chef responded at each stage)

**People:**

- Host name and contact
- Guest list (from dinner circle, if used)
- Dietary restrictions per guest
- Relationship notes: who is connected to whom
- Birthdates and ages (if known from occasion context)
- Family connections mapped: "[Husband] is [Host]'s husband, turned 60 at this event"

**Chef's Private Notes:**

- Internal-only observations (never client-visible, EVER)
- "Kitchen was tight, bring extra prep table next time"
- "Host's father-in-law loves Lord of the Rings, surprise cake theme. DON'T MENTION to other guests."
- "Husband poured expensive wine, probably a collector. Don't bring cheap pairings."
- "Daughter and her husband are vegan. Made beet variant. They raved about it."
- Flagged as CONFIDENTIAL with a visual lock icon in the UI
- Cannot be shared, emailed, exported, or shown on any client-facing surface
- Search-indexed for the chef only

**Post-Event:**

- Debrief notes (what went well, what to improve)
- Client feedback / review (if submitted)
- Photos (tagged by course, dish, venue)
- Follow-up actions taken

### 2. One-Tap Recall

When a returning client inquiry arrives (or any time the chef needs to reference a past event):

- **Event card with full summary** renders in under 1 second
- Chef can pull up any past event from: client name, date range, occasion, location, or dish name
- "What did I make for [Name]?" -> instant answer
- "When was the last time I used that lamb recipe?" -> searchable
- "Show me all events at [Address]" -> venue history

**Quick-reply context:** When a client texts "we loved what you made last time," the chef opens ChefFlow, taps the client's name, sees the full event archive, and responds in 30 seconds: "The herb-crusted lamb with spring vegetables! That was a great night. Want to do something similar or go a different direction?"

### 3. Confidential Notes System

Two tiers of notes, clearly separated:

**Shared notes** (visible to client in portal if chef enables):

- Menu preferences, dietary restrictions, service preferences
- "Prefers formal plating" "Loves bold flavors" "No cilantro"

**Confidential notes** (chef-eyes-only, ABSOLUTE boundary):

- Surprise planning details ("Lord of the Rings cake, don't mention")
- Internal observations ("Client's mother seems to make all the decisions")
- Pricing strategy notes ("Willing to pay premium, don't discount")
- Relationship dynamics ("Daughter-in-law booked, but mother-in-law is the decision maker")
- Operational notes ("Parking is tight, arrive 30 min early")

**Confidentiality rules:**

- Confidential notes display with a lock icon and red "PRIVATE" label
- Cannot appear in any email, portal, shared link, or client-facing surface
- Cannot be exported in client-facing reports or invoices
- Search results for confidential notes only appear when chef is authenticated
- Remy never references confidential notes in client-facing communications
- If chef tries to share a note marked confidential, system warns: "This note is marked private. Remove confidential flag before sharing."

### 4. People Intelligence (Ages, Milestones, Connections)

Track people across events, not just within them:

**Age and milestone tracking:**

- When an event is a birthday, capture the person's age and calculate birthdate
- System maintains: "[Father], born ~March 1964, turned 60 at March 2024 event, now 62"
- Dashboard nudge at milestone birthdays: "[Father] turns 65 in March 2027. Reach out to [Host] about a celebration?"
- Ages auto-update; the system doesn't think someone is perpetually 60

**Family and relationship mapping:**

- "[Mother-in-law] is the repeat booker. She books for family events."
- "[Daughter-in-law] is married to [Mother-in-law]'s son. She referred [Picky Client Mother]."
- "[Father] is [Mother-in-law]'s husband. The birthday honoree."
- "[Daughter] and [Son-in-law] are vegan."
- Mapped visually: a simple relationship diagram on the client detail page
- Chef doesn't have to input this as structured data; system infers from event context and lets chef confirm/edit

**Cross-event people tracking:**

- "[Daughter] attended as host at Event A and as guest at Event B"
- "[Father] was the honoree at Event A, may attend Event C"
- "You've served [Daughter] vegan meals at 3 events over 2 years"

### 5. Seasonal Context Engine

When a returning client books again, the system notes the seasonal shift:

**Example from this scenario:**

- Last event: March (late winter/early spring)
  - Menu: hearty, warming, root vegetables, braised meats, citrus
- New event: June (early summer)
  - Available: stone fruit, berries, summer squash, tomatoes at peak, fresh herbs abundant, lighter proteins, grilling season
  - Not available (or past peak): butternut squash, root vegetables, heavy braises feel wrong

**Chef sees:**

- "Last event was in March. This event is in June. Seasonal shift: winter -> summer."
- "Ingredients that were in season last time but NOT now: [list]"
- "New seasonal opportunities: [list]"
- "Suggestion: keep the spirit of what they loved (bold flavors, the wow factor) but translate to summer. Grilled lamb with stone fruit chutney instead of braised lamb with root vegetables."

PIE integration: pull current seasonal scores for suggested ingredients to confirm availability and pricing.

### 6. Venue Memory

The beach mansion is a venue. If the chef goes back:

- Kitchen layout, equipment available, parking, access, setup notes
- What the client provided last time vs what chef brought
- "Client has a 6-burner Viking range, double oven, outdoor grill. You brought: prep table, immersion circulator, plating supplies."
- Photos of the kitchen/venue if chef took them
- Any issues: "No counter space near the grill, had to use a folding table"

If the event is at a NEW venue:

- System prompts: "Different location than last time. Collect kitchen details?"
- But doesn't lose the old venue data (they may go back)

### 7. Proactive "We Remember" Communication

When a returning client books and dietary-known guests are in the potential guest list:

**The scenario:** Mother books a girls' dinner in June. We don't know the guest list yet. But we know the daughter and son-in-law are vegan from past events.

**System generates a proactive note for the chef to send (draft, not auto):**

"Just wanted to let you know, if [Daughter] and [Son-in-law] are joining, we already have their vegan preferences on file. Every course will have a matching vegan option ready. No need to worry about it."

This accomplishes three things:

1. Shows the mother that the chef REMEMBERS her family
2. Removes the burden of the mother having to re-explain dietary needs
3. Demonstrates professionalism ("they've already thought of everything")

**The system doesn't assume attendance.** It says "if they're joining." Because this is a girls' dinner; maybe they're not coming. But the offer shows the chef is thinking about it.

---

## Edge Cases

### A. The Chef Didn't Use ChefFlow for the Original Event

Past events happened before the chef started using ChefFlow. No digital record exists.

- "Import Past Event" feature: chef manually enters key details from memory
- Minimal required: date, client name, occasion, rough guest count
- Optional but valuable: menu (even from memory), location, notes, photos
- Even a partial record is better than nothing. "March 2024, 60th birthday, beach mansion, ~20 guests, lamb was the star" is enough to trigger recognition.
- Import from photos: if chef has photos from the event, upload them and tag with event details

### B. Text Message History as Context

The client said "we loved what you made last time" in a text. The chef needs to reference the past event to respond intelligently.

- ChefFlow is not a texting platform (yet). But the chef can:
  1. Open ChefFlow on their phone
  2. Search by client name
  3. See full event archive
  4. Copy-paste relevant details into their text response
- Future: Remy integration where chef can ask "what did I make for [Name] last time?" and get an instant answer via the Remy chat interface
- Even further future: if Gmail/communication sync is active, relevant past messages surface alongside the event archive

### C. Confidential Notes About Surprise Events

The Lord of the Rings cake was a surprise. The mother-in-law told the chef in confidence. If anyone else (especially the father) had seen that note, the surprise would be ruined.

- Confidential notes support a "surprise" sub-tag
- Surprise-tagged notes get extra warnings: "This note contains surprise planning details. Extra caution."
- Surprise notes auto-archive after the event (the surprise has happened; it's safe now, but still private)
- Never surface surprise notes in any pre-event communication visible to the honoree

### D. Notes That Age Out vs Notes That Are Permanent

"Parking is tight" is permanent venue knowledge. "Surprise LOTR cake" is event-specific. "Father is 60" ages out (he's not 60 anymore).

- Notes tagged as: `permanent` (venue/preference), `event-specific` (one-time context), `time-sensitive` (ages, temporary conditions)
- Time-sensitive notes show with a warning: "This was noted 2 years ago. Verify current accuracy."
- Age-related notes auto-update if birthdate is captured
- Event-specific notes archived with the event but don't surface for future events unless searched

### E. Venue Changed But Client Wants "The Same Vibe"

Last time was a beach mansion. This time is a downtown loft. Client says "same vibe as last time."

- Chef can pull up the venue notes AND the event atmosphere notes side by side
- "Same vibe" translated through the event archive: what made it special? The plating style? The course pacing? The service approach?
- System helps the chef separate: what was venue-dependent (outdoor grill, beach setting) vs what was chef-dependent (plating, timing, menu style)

### F. Multi-Generation Event Tracking

This family has now spanned: mother-in-law's events, daughter-in-law's events, picky client mother's events. Three generations potentially booking the same chef.

- Family tree view: shows all connected clients and their event history
- "You've served 3 members of this family across 4 events over 3 years"
- Total family relationship value: combined spend, total events, total guests served
- This is the chef's most valuable client network. Surface it as such.

---

## Files Likely Touched

- `lib/events/archive-actions.ts` (new, complete event archive CRUD)
- `lib/events/recall-actions.ts` (new, search/query past events by client, date, dish, venue, occasion)
- `lib/notes/confidential-notes.ts` (new, two-tier note system with confidentiality enforcement)
- `lib/notes/note-tags.ts` (new, permanent/event-specific/time-sensitive/surprise tagging)
- `lib/clients/people-intelligence.ts` (new, age tracking, milestone detection, relationship mapping)
- `lib/clients/family-tree.ts` (new, cross-client relationship graph, multi-generation tracking)
- `lib/events/venue-memory.ts` (new, venue-specific notes, equipment, kitchen details, persistent across events)
- `lib/events/seasonal-context.ts` (new, detect seasonal shift between past and current event, suggest adaptations)
- `lib/menus/suggestion-engine.ts` (extend, seasonal translation suggestions)
- `components/events/event-archive-card.tsx` (new, one-tap full event summary)
- `components/events/past-event-detail-modal.tsx` (new, complete event recall view)
- `components/notes/confidential-note-editor.tsx` (new, with lock icon, PRIVATE label, share prevention)
- `components/notes/note-tag-selector.tsx` (new, permanent/event-specific/time-sensitive)
- `components/clients/family-tree-diagram.tsx` (new, visual relationship map)
- `components/clients/milestone-nudge.tsx` (new, birthday/anniversary dashboard widget)
- `components/events/venue-memory-card.tsx` (new, kitchen layout, equipment, parking notes)
- `components/events/seasonal-shift-card.tsx` (new, March->June ingredient/style changes)
- `app/(chef)/events/[id]/archive/page.tsx` (new, full archived event view)
- `app/(chef)/clients/[id]/page.tsx` (extend with family tree, milestone tracking, cross-event history)
- `app/(chef)/search/page.tsx` (extend or new, "what did I make for X?" search)
- `lib/events/import-past-event.ts` (new, manual import for pre-ChefFlow events)
- Database: `confidential_notes` table (event_id, client_id, content, note_type, tags[], is_confidential, surprise_flag), `people_milestones` table (person_id, milestone_type, date, age_at_event, event_id), `venue_profiles` table (address, kitchen_notes, equipment, parking, photos, last_used), `family_connections` table (person_a_id, person_b_id, relationship_type)

---

## Verification

### Event Archive

- [ ] Completed event produces full archive (menu, financial, contract, people, notes, photos)
- [ ] Archive searchable by client name, date, dish, venue, occasion
- [ ] "What did I make for [Name]?" returns instant, complete answer
- [ ] Archive persists indefinitely, never auto-deleted

### Confidential Notes

- [ ] Confidential notes display with lock icon and PRIVATE label
- [ ] Confidential notes NEVER appear on any client-facing surface
- [ ] Confidential notes excluded from email, portal, shared links, exports
- [ ] Remy never references confidential notes in client comms
- [ ] System warns if chef tries to share a confidential note
- [ ] Surprise-tagged notes get extra caution warnings
- [ ] Surprise notes auto-archive post-event (still private, but the surprise has happened)

### People Intelligence

- [ ] Birthday captured from event context, age auto-updates annually
- [ ] Milestone birthday nudge fires (e.g., "Father turns 65 next March")
- [ ] Family relationships mapped and displayable
- [ ] Cross-event people tracking works ("served [Person] at 3 events")
- [ ] Relationship diagram renders on client detail page

### Seasonal Context

- [ ] Seasonal shift detected between past and current event dates
- [ ] Ingredients in season then vs now compared and displayed
- [ ] Menu suggestions adapted for seasonal shift
- [ ] PIE seasonal scores integrated for current availability

### Venue Memory

- [ ] Venue details persist across events at same location
- [ ] Kitchen notes, equipment, parking info retrievable
- [ ] "Different location" prompt fires when venue changes
- [ ] Old venue data preserved even when booking at new location

### Proactive Communication

- [ ] System drafts "we remember [Daughter] is vegan" message for chef
- [ ] Message uses "if they're joining" language (doesn't assume attendance)
- [ ] Chef can send or discard the proactive note
- [ ] Note demonstrates memory without oversharing

### Import and Search

- [ ] Past events importable manually (pre-ChefFlow history)
- [ ] Partial imports accepted (date + name + occasion minimum)
- [ ] Global search finds events by any attribute (dish, guest, venue, date range)

### Multi-Generation

- [ ] Family tree view shows all connected clients
- [ ] Total family relationship value calculated (spend, events, guests)
- [ ] Cross-generation event history visible on any family member's profile
