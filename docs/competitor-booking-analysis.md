# Competitor Booking Flow Analysis

> Research conducted 2026-03-27. Every platform was visited and analyzed for real user experience.

---

## Platforms Studied

| Platform          | Model                         | Budget Approach                                | Form Style                      | Key Differentiator                                                 |
| ----------------- | ----------------------------- | ---------------------------------------------- | ------------------------------- | ------------------------------------------------------------------ |
| **Take a Chef**   | Inquiry-first, chef proposals | 3 abstract tiers (Casual/Gourmet/Exclusive)    | 10-step wizard                  | Per-person budget, chefs compete with proposals                    |
| **yhangry**       | Inquiry-first, chef proposals | Named tiers (Good Value/Fine Dining/Celebrity) | Multi-step wizard               | "Who is this for?" question, split payments                        |
| **Cozymeal**      | Browse-and-book (e-commerce)  | Fixed per-person pricing shown upfront         | Search + filter + book          | No form at all, transparent pricing ($49+/person)                  |
| **Table at Home** | Inquiry-first, chef proposals | Per-person dollar ranges ($30-$300)            | 4-step wizard                   | Fastest form (under 1 minute), account creation at end             |
| **CHEFIN**        | Package selection             | Fixed package pricing shown upfront            | Browse packages, then customize | Pre-designed packages ($65-$1250), details collected after booking |
| **Thumbtack**     | Zip code first, then browse   | Not asked upfront                              | Zip code -> browse pros         | Shows per-person ranges on pro profiles, no budget form field      |
| **CookinGenie**   | Browse-and-book               | Transparent pricing                            | Chef selection first            | 3-step: choose chef, customize menu, enjoy                         |

---

## The Budget Question: What Everyone Does

This is the single most important finding. **Our current budget dropdown is the worst approach in the industry.**

### What's Wrong With Ours

Our current options:

- Flexible (open to suggestions)
- Under $500
- $500 - $1,000
- $1,000 - $2,000
- $2,000 - $5,000
- $5,000+

**Problems:**

1. **Flat dollar amounts with no context.** A first-time client has no idea if $500 is cheap or expensive for a private chef. They don't know if that's for the whole event or per person. Is $2,000 a lot? Is it reasonable for 20 people? There's zero guidance.

2. **"Under $500" is misleading.** Most private dinners for 4-6 people start at $400-$800 (ingredients + labor + travel). Showing "Under $500" as an option signals that good private chef service exists at $200-$300. It doesn't. Chefs will see that budget and skip the inquiry.

3. **The ranges don't scale with guest count.** $500 for 2 people is reasonable. $500 for 50 people is insulting. But both look the same in our dropdown.

4. **No per-person framing.** Every serious competitor frames budget per person, not as a flat total. This is industry standard because it normalizes across party sizes.

### What Competitors Do Instead

**Tier 1: Abstract named tiers (Take a Chef, yhangry)**

- Take a Chef: Casual / Gourmet / Exclusive (no dollar amounts shown)
- yhangry: Good Value / Fine Dining / Celebrity Chef
- **Why it works:** Removes sticker shock entirely. Client picks a vibe, not a number. Chef interprets the tier based on their own pricing. No one feels priced out or embarrassed.

**Tier 2: Per-person dollar ranges (Table at Home)**

- $30-$50 / $50-$80 / $80-$120 / $120-$180 / $180-$225 / $225-$300 per person
- **Why it works:** Per-person normalizes across party sizes. "$80 per person for 8 guests" is immediately understandable. Client can do the math. Chef knows exactly what to expect.

**Tier 3: Don't ask at all (Cozymeal, Thumbtack, CookinGenie, CHEFIN)**

- Either show transparent pricing upfront or let the chef handle pricing in their proposal
- **Why it works:** Removes the awkward money question from the first interaction. Client describes what they want; pricing comes later from the chef who knows their costs.

**Nobody uses flat total dollar ranges like we do.** We are the only platform framing budget this way.

### Recommendation

Switch to **per-person experience tiers** that combine the best of abstract naming with per-person pricing guidance:

| Tier | Label                                | Per-Person Range   | What It Signals                    |
| ---- | ------------------------------------ | ------------------ | ---------------------------------- |
| 1    | Casual dining                        | $40 - $75/person   | Family-style, approachable menus   |
| 2    | Elevated experience                  | $75 - $150/person  | Multi-course, curated menus        |
| 3    | Fine dining                          | $150 - $300/person | Tasting menus, premium ingredients |
| 4    | Luxury / custom                      | $300+/person       | White-glove, no budget constraints |
| 0    | Not sure yet (help me figure it out) | --                 | Escape hatch for first-timers      |

Add a small helper line under the dropdown: "This is per person and helps chefs tailor their proposal. The final price is set by your chef."

---

## Form Flow: What Everyone Does

### Single-Page Form (Our Current Approach)

- **Who does this:** Nobody among the serious competitors
- **Pros:** Fast to build, everything visible at once
- **Cons:** Overwhelming, no progressive disclosure, no validation between steps

### Multi-Step Wizard (Industry Standard)

- **Take a Chef:** 10 steps
- **yhangry:** ~10 steps
- **Table at Home:** 4 steps (proves brevity is possible)
- **Pros:** Each step feels manageable, validates as you go, can gate later steps on earlier answers
- **Cons:** More complex to build, back-button handling

### Browse-and-Book (E-commerce)

- **Cozymeal, CHEFIN, CookinGenie:** No form, browse packages/chefs then book
- **Pros:** Transparent pricing, client picks the chef, feels like shopping
- **Cons:** Requires robust chef profiles and pricing to be set up

### Recommendation

A **4-step wizard** like Table at Home proves you don't need 10 steps. Our current form has the right fields, just displayed wrong. Break it into:

1. **When & Where** (date, time, location, guest count) - validates service area before asking more
2. **What's the occasion?** (service type, occasion, dietary needs)
3. **Your preferences** (budget tier, cuisine preferences, notes)
4. **Your contact info** (name, email, phone) + submit

This is the same data we collect now, just presented progressively. Step 1 could even pre-validate location before the user fills out everything else.

---

## Guest Count: What Everyone Does

| Platform            | Input Type        | Options                             |
| ------------------- | ----------------- | ----------------------------------- |
| Take a Chef         | Range brackets    | "Select a range of guests"          |
| Table at Home       | Free text number  | Type any number                     |
| Cozymeal            | Dropdown filter   | 1-51+                               |
| Thumbtack           | Not asked upfront | Part of detailed request            |
| **ChefFlow (ours)** | Dropdown          | 2, 4, 6, 8, 10, 15, 20, 30, 50, 75+ |

### Problems With Ours

1. **No option for 1 guest.** Solo meal prep / personal chef is a real use case.
2. **Pre-selected at 6.** User might not notice it's pre-filled and submit wrong count.
3. **75+ is vague.** A 200-person wedding and a 76-person corporate event look the same.

### Recommendation

Change to a number input with a placeholder. If we want to keep a dropdown for simplicity, use ranges instead of exact numbers, and start with a "Select" placeholder:

- Select guest count
- 1-2 (intimate)
- 3-6 (small gathering)
- 7-12 (dinner party)
- 13-25 (large party)
- 26-50 (event)
- 50+ (large event)

---

## Service Type: What Everyone Does

| Platform            | How They Ask                                                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Take a Chef         | Occasion-focused: anniversary, birthday, etc.                                                                                                                  |
| Table at Home       | "Type of Meal" dropdown: 2-3 Course Plated, 4+ Course Plated, Banquet, BBQ, Brunch, Cooking Lesson, Party Canapes, Vacation Rental, Catering, Weekly Meal Prep |
| CHEFIN              | Package categories: Fine Dining, BBQ, Cocktail, etc.                                                                                                           |
| **ChefFlow (ours)** | "What do you need?" dropdown with 10 generic options                                                                                                           |

### Problems With Ours

1. **"What do you need?" is vague** for someone who doesn't know the industry terminology.
2. **Overlap between options:** "Private dinner" vs "Event chef" vs "Personal chef" are near-identical to a consumer. They don't know the difference.
3. **10 options is too many** for a dropdown without descriptions.

### Recommendation

Consolidate to 6 clear, consumer-friendly options with brief descriptions:

- Dinner party (private dining for your guests)
- Meal prep (weekly meals prepared in your kitchen)
- Catering (buffet or stations for larger groups)
- Wedding or celebration (your special day)
- Cooking class (learn from a pro)
- Something else (tell us in the notes)

---

## Location: What Everyone Does

| Platform            | Input                               | When Asked              |
| ------------------- | ----------------------------------- | ----------------------- |
| Take a Chef         | Full street address                 | During booking          |
| Table at Home       | ZIP code                            | Step 1 (first thing)    |
| Thumbtack           | ZIP code                            | First thing on the page |
| Cozymeal            | City dropdown                       | Search filter           |
| **ChefFlow (ours)** | Free text "City, state or ZIP code" | Mid-form                |

### Recommendation

**Ask location first** (or at minimum, very early). Table at Home and Thumbtack both gate everything on location/ZIP code before collecting other details. This lets us:

1. Validate we have chefs in the area before the user fills out 10 more fields
2. Show a "We don't have chefs in your area yet, but we'll notify you" early instead of at the end
3. Pre-populate city/state from ZIP for a smoother experience

---

## Date Validation: Critical Bug

Our form has **no minimum date constraint**. Users can select past dates. The API doesn't validate either. Every competitor either:

- Sets `min` to today's date on the date picker
- Shows "Select a future date" validation error

This needs fixing immediately.

---

## What Happens After Submission: The Bigger Picture

This is what you were getting at: the booking isn't the end, it's the beginning of the entire client relationship.

### What Competitors Do After Submission

| Platform      | After Submit                                                                |
| ------------- | --------------------------------------------------------------------------- |
| Take a Chef   | Creates account, enters "proposals" inbox, 2-5 chefs send menus within 24h  |
| yhangry       | Matching begins, chefs send quotes with menus, client compares in dashboard |
| Table at Home | Account created (step 4 of form!), proposals appear in 24h                  |
| CHEFIN        | Confirmation email, short follow-up form for dietary needs, chef assigned   |
| Cozymeal      | Instant booking confirmation, chef reaches out within 24-48h                |

### What ChefFlow Does Now

1. Client submits form
2. API matches chefs by location
3. Creates inquiry + draft event under each matched chef
4. Sends email to chefs + confirmation to client
5. **...and then the client has no account, no dashboard, no way to track their request**

### The Gap

Every competitor creates a client account at submission time so the client can:

- See which chefs received their request
- Track proposal status
- Message chefs directly
- Compare proposals side-by-side
- Accept a proposal and pay

We create the inquiry records on the chef side, but the client has no visibility. They submit a form and wait for an email. That's a 2015 contact form experience, not a 2026 marketplace.

### Recommendation (Future Phase)

This is beyond the current form fix, but worth noting as the next evolution:

1. After form submission, offer "Create a free account to track your request"
2. Client gets a dashboard showing matched chefs and their response status
3. Chefs can send proposals through the platform
4. Client compares, accepts, and the event workflow begins

This is the "getting the ball rolling" vision: one form submission creates the client, maps them into the system, and everything from that point (booking, menus, notes, communication) flows through ChefFlow.

---

## Actionable Changes (Priority Order)

### Immediate Fixes (Do Now)

1. **Fix budget dropdown** - Switch to per-person experience tiers with helper text
2. **Add date minimum** - Prevent past date selection (`min={today}`)
3. **Consolidate service types** - 6 clear options instead of 10 overlapping ones
4. **Fix guest count** - Add "Select" placeholder, don't pre-select 6, add ranges or free input
5. **Surface email suggestions** - The API returns typo suggestions but the form ignores them

### Short-Term Improvements

6. **Move location to first field** - Validate service area early
7. **Add helper text** - Under budget, under guest count, under occasion
8. **Add "what happens next" text** - Near submit button: "Matched chefs typically respond within 24 hours"
9. **Break into multi-step wizard** - 4 steps, same data, better UX

### Future Vision

10. **Client account creation** - At submission or post-submission
11. **Request tracking dashboard** - Client sees matched chefs and proposal status
12. **In-platform proposals** - Chefs respond through ChefFlow, not email
13. **Acceptance flow** - Client picks a chef, event workflow begins automatically
