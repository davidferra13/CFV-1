# Returning Client Recognition

> **Status:** SPEC-READY
> **Priority:** P0
> **Origin:** "Picky Client" persona stress test, edge case: chef cooked for this client 2 years ago and didn't recognize them (2026-05-16)
> **Depends On:** Inquiry-to-Booking Orchestration (trigger engine)

---

## Problem Statement

A chef cooked a $4,000 dinner for 20 people at a client's mansion two years ago. The client loved it. Tipped generously. Now the client's daughter reaches out to book again, and the chef treats the mother like a cold lead off the internet. "What do you like to eat?"

The system has all the data: past events, menus served, dietary restrictions, address, guest count, spend history, notes. But none of it surfaces when the new inquiry arrives. The chef doesn't connect the dots. The client feels forgotten. That's worse than being a first-timer, because now there's betrayal of a relationship that DID exist.

This is the highest-value failure mode in private chef services. Returning clients are the most profitable, most loyal, most likely to refer. Treating them like strangers is leaving money and reputation on the table.

---

## Solution

### 1. Automatic Client Matching on Inquiry

When a new inquiry arrives (from any channel), the system attempts to match against existing clients:

**Match signals (any combination):**

- Email address (exact match)
- Phone number (exact or normalized match)
- Full name (fuzzy match: "Margaret Smith" = "Peggy Smith" = "Mrs. Smith")
- Address (fuzzy match on street + city)
- Referrer connection (daughter is in a circle with a past client who shares last name or address)
- Mentioned name in inquiry text ("my mom Margaret loved your lamb last time")

**Match confidence levels:**

- **Confirmed match** (email or phone exact): auto-link, full history surfaces
- **Likely match** (name + address fuzzy): prompt chef to confirm ("Is this the same Margaret Smith from the June 2024 dinner?")
- **Possible match** (referrer connection or name only): subtle hint ("This inquiry may be connected to a past client. Check?")

### 2. Returning Client Alert

When a match is found, the inquiry card transforms:

- **"Returning Client" banner** (gold/premium visual treatment, not just a badge)
- Past event count and total spend: "2 past events, $6,200 total"
- Last event summary: "June 2024: Husband's 50th Birthday, 20 guests, Lamb + Seasonal Menu"
- Quick-access to full past event detail (menu, notes, dietary, photos, debrief)
- Time since last event: "Last booked 2 years ago"
- Client preferences loaded: dietary restrictions, kitchen notes, service preferences
- Suggested opening: "Welcome back, [Name]! Last time we did [Menu]. Want to build on that or try something new?"

### 3. Referral Chain Recognition

When the daughter (referrer) is linked to a past client:

- System checks: does the referrer share a dinner circle, last name, or address with any past client?
- If yes: flag the inquiry with "Connected to past client [Name]"
- Chef sees: "This inquiry came from [Daughter], who is connected to [Mother] from your June 2024 dinner"
- Even if the mother's contact info isn't on the inquiry yet, the chef is primed to ask the right question

### 4. VIP Treatment Automation

Returning clients get automatic upgrades in the pipeline:

| Feature                 | First-Time Client         | Returning Client                                 |
| ----------------------- | ------------------------- | ------------------------------------------------ |
| Response time target    | 24 hours                  | 4 hours                                          |
| Priority queue position | Standard                  | Top of queue                                     |
| Inquiry pre-fill        | Empty                     | Past data loaded                                 |
| Sample menu suggestion  | Generic seasonal          | "Based on your last dinner..."                   |
| Quote generation        | Manual                    | Auto-draft from past pricing (adjusted)          |
| Portal experience       | Standard                  | Personalized welcome, past event history visible |
| Communication tone      | Professional introduction | Warm reunion                                     |

### 5. "Welcome Back" Flow

When a confirmed returning client submits an inquiry (or chef confirms match):

1. **Instant recognition email:** "Welcome back, [Name]! [Chef] remembers your [occasion] and is excited to work with you again."
2. **Pre-loaded portal:** Client's portal shows past events, past menus, dietary info already on file. "Anything changed since last time?"
3. **Menu suggestion:** Chef receives a suggested menu based on past preferences with seasonal updates. "Last time: lamb rack. This season: pair with spring peas and morels?"
4. **Streamlined booking:** Skip deep discovery. Date + guest count + "same location?" = ready to quote.

### 6. Lapsed Client Proactive Outreach

Don't wait for the client to come back. Detect lapse and reach out:

- **12 months since last event:** Chef gets a dashboard nudge: "[Name] hasn't booked in a year. Send a seasonal hello?"
- **Anniversary of past event approaching:** "It's been a year since [Name]'s dinner. Reach out?"
- **Chef can one-click send:** A warm, non-pushy seasonal message. Not a marketing email. A personal note from the chef.
- **Opt-out:** Chef can snooze or dismiss per client. Client can unsubscribe.

This is the "dentist office" model: they don't wait for you to remember your appointment. They reach out because they have the relationship data.

### 7. Relationship Memory Never Dies

Even if a client hasn't booked in 5 years:

- Their data persists (never auto-deleted)
- Any new inquiry that matches surfaces full history
- Chef can browse past clients and filter by "hasn't booked in X months"
- Past client data is treated as the chef's most valuable asset

---

## Edge Cases

### A. Client Changed Their Name

Client got married, divorced, or goes by a nickname. "Margaret Smith" is now "Margaret Johnson" or "Peggy."

- Matching engine uses ALL signals, not just name. Email or phone match overrides name mismatch.
- Fuzzy name matching includes common nickname maps (Margaret/Peggy, William/Bill, Robert/Bob, Elizabeth/Liz, etc.)
- When chef confirms a match, system updates the client record with the new name AND stores aliases. Future inquiries match on any known alias.
- Chef-side note: "Previously booked as Margaret Smith"

### B. Client Moved

Different address. They had the mansion in Wellesley, now they're in a Back Bay condo.

- Address is a match signal, not a requirement. Email/phone/name still trigger matching even if address differs.
- When match is confirmed with new address, system updates primary address and keeps old address in history.
- Chef sees: "New location. Previously hosted at [old address]. Kitchen notes from that venue may not apply."
- Old kitchen notes (counter space, oven type, parking) flagged as "from previous location, verify for new venue."

### C. Different Household Member Booking

Last time the wife booked. This time the husband is calling. Same household, different contact person.

- Household matching: if new inquiry name + address matches a known client's address, flag it.
- If new inquiry shares a last name with a past client, check for household connection.
- Chef sees: "This may be from the same household as [Wife Name], your client from June 2024."
- When confirmed, link both contacts to the same household. Future inquiries from either match.
- Dietary data from the household is shared (husband's shellfish allergy surfaces even though wife booked).

### D. Inquiry Through a Platform (Not Direct)

Client originally booked through TakeAChef or another marketplace. Chef has the event record but may have limited contact info (platform withheld email/phone).

- Match on: name + approximate date + guest count + occasion description
- Lower confidence: "Possible match" tier, not auto-confirmed
- Chef prompt: "A [Name] booked a [20-guest dinner] through TakeAChef in June 2024. Could this be them?"
- If confirmed, NOW the chef has direct contact info. System captures it. Next time = instant match. This is the platform-to-direct conversion moment.

### E. Past Event Had Issues

Last dinner had a problem. Debrief noted: "Client complained about late arrival" or "Dessert course was rushed." The system shouldn't auto-celebrate a reunion if the relationship ended poorly.

- Check past event debrief/notes for negative signals (complaint keywords, low rating, incident flag)
- If negative history found, change the banner tone:
  - Instead of gold "Returning Client" banner, show amber "Returning Client (Review History)" banner
  - Surface the debrief notes prominently: "Last event notes: [issue]"
  - Suggested opening changes: "Great to hear from [Name] again. Note: last event had [issue]. Consider addressing proactively."
- Chef decides how to handle. System surfaces the truth; it doesn't hide it.

### F. Client Doesn't Want to Be Recognized

Client is planning a surprise event. Booking under a different name intentionally. Or simply values privacy and doesn't want "we remember everything about you" vibes.

- Recognition is CHEF-FACING only. The client never sees "we matched you to your 2024 dinner" unless the chef chooses to mention it.
- The "Welcome Back" email is sent by the CHEF (through the system), not auto-sent. Chef decides whether to acknowledge the history.
- Exception: if auto-send is enabled for welcome-back, chef must have explicitly opted in. Default is draft mode.
- Client portal shows past events only if the client is authenticated under the same account. Token-based portal for a new inquiry does NOT auto-show past history until the chef confirms the link.

### G. A Past Guest (Not the Host) Now Wants to Book

Someone who attended the 20-person dinner as a GUEST loved the food and now wants to hire the chef independently. They're not the past client, but they experienced the service.

- Guest-to-client matching: if the new inquiry name matches a guest from a past dinner circle, flag it.
- Chef sees: "[Name] was a guest at [Host]'s dinner in June 2024. They experienced your food firsthand."
- This is a warm lead, not a returning client. Different treatment:
  - No past event pre-fill (they weren't the host)
  - But chef knows: "This person already tasted your lamb. They know what they're getting."
  - Referral credit to the original host if applicable

### H. Price Expectations from Last Time

Client paid $200/head two years ago. Ingredient costs went up. Chef's rates increased. Client expects the same price.

- When generating a returning client quote draft, show BOTH:
  - "Last event pricing: $200/head (June 2024)"
  - "Current estimated pricing: $235/head (adjusted for current costs)"
  - Delta: "+$35/head (+17.5%)"
- Chef can see the gap before the client does and prepare the conversation.
- Suggested framing (for chef, not auto-sent): "Costs have shifted since 2024. Here's the updated pricing with current seasonal ingredients."
- PIE integration: pull actual ingredient cost changes to justify the delta if needed.

### I. Multiple Chefs on the Platform

Client used Chef A two years ago. Now they're inquiring with Chef B.

- Chef B CANNOT see Chef A's relationship data. That's Chef A's client relationship.
- But the system can note (to Chef B): "This client has used ChefFlow before." (No details, no event history, no spend data.)
- Why this matters: Chef B knows the client understands the private chef experience. Not a first-timer to the concept, just first-time with this chef. Adjust communication accordingly.
- If client explicitly mentions Chef A: "I used Chef A before but want to try someone new" -- that's the client's choice to share. System doesn't surface it.

### J. Duplicate Client Records

Same person, two records. Booked once with personal email, once with work email. Or created two accounts.

- Matching engine flags potential duplicates: "These two clients may be the same person" (same name + overlapping address/phone)
- Chef can merge records: combine event history, unify contact info, designate primary email/phone
- Merge is reversible (soft-merge: link records, don't delete either)
- After merge, all future matching checks both records

### K. Chef's Private Notes About the Client

Chef wrote in their debrief: "Kitchen had limited counter space, bring extra prep table." "Host prefers formal plating, not family style." "Husband says he's not allergic to anything but his wife says he can't have shellfish."

- ALL chef notes from past events surface on the returning client banner
- Notes are tagged by event, so chef sees which visit each note came from
- Notes that reference the venue/kitchen are flagged as location-specific: "These notes are from [old address]. Verify if hosting at the same location."
- Dietary contradiction detection: if past notes conflict with current stated preferences, flag it. "In 2024, wife noted shellfish allergy for husband. Current inquiry says no restrictions. Verify."

### L. Seasonal and Preference Evolution

Client was pescatarian two years ago. Now eats meat. Or developed a new allergy.

- "Welcome Back" portal includes: "We have these preferences on file from your last dinner. Anything changed?"
  - Dietary restrictions (with edit capability)
  - Cuisine preferences
  - Service style preferences
  - Guest count patterns
- Changes are tracked: "Updated 2026-05-20. Previously: pescatarian. Now: no restrictions."
- Chef sees the change history, not just current state. Context matters: "Client was pescatarian for years but recently changed. Maybe still lean toward seafood-heavy menus."

### M. Multiple Returning Relationships at One Event (The Full Family Web)

Real scenario with all layers stacked:

**The relationship web:**

- The **mother-in-law** has been the repeat booker all along (multiple events over years)
- Her most recent: her husband's (the **father**) 60th birthday, March 2024, 20 people, beach mansion
- The **daughter-in-law** is married to the mother-in-law's son. She also booked the chef independently.
- The daughter-in-law referred the **picky client mother** (the new inquiry) to the chef.
- The daughter-in-law and her husband are vegan.
- The father is now 62 (turned 60 at that March 2024 event).

**The current situation:**

- Picky client mother is booking a girls' dinner in June
- Guest list unknown yet (it's a girls' dinner, so maybe the daughter-in-law comes, maybe not, maybe the son-in-law doesn't)
- Chef has cooked for the mother-in-law AND the daughter-in-law independently
- The mother-in-law might be a guest at this event too

**What the chef should see on the inquiry:**

- Gold "Returning Client" banner if the picky client mother has booked before, OR "New Client, Connected to Returning Clients" if she's new
- Relationship map: "Connected to [Mother-in-law] (your repeat client, 4 events) via [Daughter-in-law] (referred this inquiry, also a past client)"
- Combined family intelligence:
  - "Total family relationship: 5+ events across 3 connected clients over 3 years"
  - Mother-in-law's history: repeat booker, last event March 2024 (60th birthday, beach mansion)
  - Daughter-in-law's history: independent booking, vegan, husband also vegan
  - Father: turned 60 in March 2024, now 62
- Dietary pre-load from across the family: "[Daughter-in-law] and [Son-in-law] are vegan (confirmed across 2 independent bookings). If attending, vegan variants auto-ready."
- Menu intelligence from ALL family events: "This family has experienced your lamb, your seafood tower, your spring risotto. For June: suggest summer ingredients they haven't had from you yet."
- Seasonal shift note: "Last family event was March (winter menu). June opens up summer produce, grilling, lighter preparations."

**Proactive dietary intelligence (the key insight):**

This is a girls' dinner. We don't know the guest list. But the system knows the daughter-in-law is vegan. The chef shouldn't wait to be asked.

Draft message for chef to send to the host:

> "Quick note: if [Daughter-in-law] and [Son-in-law] are joining, I already have their dietary preferences from past dinners. Every course will have a matching vegan version ready. Just let me know the final guest list whenever you have it."

This accomplishes:

1. Shows the host that the chef remembers the whole family
2. Removes the burden of re-explaining dietary needs
3. Demonstrates professionalism without assuming attendance
4. Uses "if" language (it's a girls' dinner, they might not be there)

**Guest list intelligence:**

- When the dinner circle guest list populates, system recognizes any past clients or past guests
- Known dietary data auto-fills for recognized people
- Chef sees: "3 of 15 guests are known to you from past events. Dietary data pre-loaded."
- Unknown guests still get the dietary collection prompt via the circle

**The referrer paradox (extended):**

The daughter-in-law occupies up to FOUR roles simultaneously:

1. **Referrer** (she connected the picky client mother to the chef)
2. **Past client** (she booked independently)
3. **Potential guest** (might attend the girls' dinner)
4. **Family bridge** (connects the picky client mother to the mother-in-law's relationship)

System handles all four without conflict or duplicate communications.

### N. Chef's Notes Span Multiple Clients at Same Event

From the mother's past event: "Husband prefers formal plating." From the daughter's past event: "Loves family-style, doesn't like fussy presentation."

Conflicting style preferences at the same table.

- Chef sees both notes, flagged as potentially conflicting: "Mother's household prefers formal. Daughter prefers casual. Discuss with host."
- System doesn't resolve this. Chef uses judgment. But the system surfaces the conflict instead of hiding it.
- This is the kind of intelligence that makes a chef look like a mind reader: "I remember you like things elegant, and I know your daughter prefers relaxed. How about we meet in the middle with rustic-refined plating?"

---

## Files Likely Touched

- `lib/inquiries/client-matching.ts` (new, fuzzy matching engine with nickname map, household detection, guest-to-client matching)
- `lib/inquiries/actions.ts` (run client matching on inquiry creation)
- `lib/clients/relationship-memory.ts` (new, aggregate past event history per client, preference evolution tracking)
- `lib/clients/household-linking.ts` (new, link multiple contacts to same household, share dietary data)
- `lib/clients/client-merge.ts` (new, soft-merge duplicate records, reversible)
- `lib/clients/lapsed-detection.ts` (new, identify lapsed clients, nudge generation)
- `lib/clients/nickname-map.ts` (new, common name variants: Margaret/Peggy, William/Bill, etc.)
- `components/inquiries/returning-client-banner.tsx` (new, gold/amber banner with past history, debrief warnings)
- `components/inquiries/past-event-quick-view.tsx` (new, inline past event summary with kitchen notes, dietary flags)
- `components/inquiries/price-delta-card.tsx` (new, past vs current pricing comparison)
- `app/(chef)/inquiries/[id]/page.tsx` (integrate returning client banner)
- `lib/email/templates/welcome-back.tsx` (new, returning client recognition email, draft-mode default)
- `lib/lifecycle/trigger-engine.ts` (add returning client detection + VIP routing)
- `lib/queue/providers/inquiry.ts` (priority bump for returning clients)
- `components/dashboard/lapsed-clients-widget.tsx` (new, proactive outreach prompts)
- `lib/menus/suggestion-engine.ts` (new, suggest menus based on past preferences + season + preference evolution)
- `app/(chef)/clients/[id]/page.tsx` (household view, merge UI, alias management, preference history)
- `components/clients/dietary-contradiction-alert.tsx` (new, flags conflicts between past and current dietary data)
- `components/client-portal/preference-review.tsx` (new, "anything changed?" pre-fill review for returning clients)

---

## What This Does NOT Cover

- CRM-style client segmentation or tagging (future enhancement)
- Automated marketing campaigns (this is personal, not bulk)
- Cross-chef client data visibility (Chef B cannot see Chef A's relationship data, ever)
- Automated win-back campaigns for clients who had bad experiences (chef decides manually)

---

## Verification

### Core Matching

- [ ] Inquiry from known email auto-links to past client, surfaces history
- [ ] Inquiry from known phone auto-links to past client
- [ ] Fuzzy name + address match prompts chef for confirmation
- [ ] Referrer-to-past-client connection detected and flagged
- [ ] "Returning Client" banner shows on matched inquiry with past event summary

### VIP Treatment

- [ ] Returning client inquiry gets 4h response target (vs 24h standard)
- [ ] Returning client inquiry jumps to top of priority queue
- [ ] "Welcome Back" email created as DRAFT (not auto-sent) by default
- [ ] Client portal shows past event history for returning clients
- [ ] Menu suggestion engine proposes dishes based on past preferences

### Lapsed Outreach

- [ ] Lapsed client nudge fires at 12 months since last event
- [ ] Anniversary-of-event nudge fires for annual occasions
- [ ] Chef can browse past clients filtered by recency
- [ ] Past client data never auto-deleted regardless of time elapsed

### Edge Case: Name Changes

- [ ] Nickname matching works (Margaret = Peggy, William = Bill)
- [ ] Chef can confirm match and add alias to client record
- [ ] Future inquiries match on any known alias

### Edge Case: Address Changes

- [ ] Match triggers on email/phone even with different address
- [ ] Old kitchen notes flagged as "from previous location, verify"
- [ ] New address stored, old address kept in history

### Edge Case: Household Members

- [ ] Same-address + same-last-name inquiry flags household connection
- [ ] Confirmed household link shares dietary data across members
- [ ] Either household member booking triggers returning client treatment

### Edge Case: Platform-Originated Clients

- [ ] Name + occasion fuzzy match works for platform-booked events with limited contact info
- [ ] Confirmed match captures direct contact info (platform-to-direct conversion)

### Edge Case: Negative History

- [ ] Past event with complaints shows amber banner (not gold)
- [ ] Debrief notes with issues surface prominently
- [ ] Suggested opening acknowledges history, not just celebrates it

### Edge Case: Privacy

- [ ] Client-facing portal does NOT auto-show past history until chef confirms link
- [ ] Recognition is chef-facing only; client sees nothing unless chef chooses to acknowledge
- [ ] Client can opt out of being recognized

### Edge Case: Past Guests Booking

- [ ] Guest name from past dinner circle matched to new inquiry
- [ ] Chef sees "was a guest at [Host]'s dinner" context
- [ ] No past event pre-fill (guest, not host), but warm lead flagged

### Edge Case: Price Expectations

- [ ] Returning client quote shows past pricing alongside current pricing
- [ ] Delta displayed with percentage change
- [ ] PIE integration explains cost drivers behind the increase

### Edge Case: Preference Evolution

- [ ] "Anything changed?" prompt on returning client portal
- [ ] Dietary changes tracked with timestamp and previous value
- [ ] Contradictions between past notes and current stated preferences flagged
- [ ] Chef sees preference change history, not just current state

### Edge Case: Duplicate Records

- [ ] Potential duplicates flagged to chef (same name + overlapping contact info)
- [ ] Merge is soft (links records, doesn't delete)
- [ ] Merge is reversible
- [ ] Merged client shows combined event history from both records

### Edge Case: Multi-Chef Platform

- [ ] Chef B cannot see Chef A's client relationship data
- [ ] Chef B sees only "Client has used ChefFlow before" (no details)
- [ ] Cross-chef data boundary is absolute and untestable by either chef

### Edge Case: Multiple Returning Relationships at One Event

- [ ] System detects when multiple past clients are involved in same inquiry (host + guest who booked independently)
- [ ] Inquiry shows combined relationship summary across all recognized parties
- [ ] Total relationship spend aggregates across all linked past clients
- [ ] Dietary data auto-fills for past clients when they RSVP to the dinner circle
- [ ] Past client attending as guest doesn't re-enter known dietary info
- [ ] Referrer who is also a past client and a guest gets unified experience (no duplicate comms)
- [ ] Menu suggestion engine considers preferences from ALL recognized attendees
- [ ] "2 of 20 guests are past clients with known preferences" surfaced to chef

### Edge Case: Conflicting Style Preferences Across Relationships

- [ ] Notes from different past clients surfaced side by side when both attend
- [ ] Conflicting preferences flagged (formal vs casual, etc.)
- [ ] Chef sees both with source attribution ("Mother's event: formal. Daughter's event: casual.")
- [ ] System does not auto-resolve; surfaces conflict for chef judgment
