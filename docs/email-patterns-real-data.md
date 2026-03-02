# Email Patterns — Real Data Analysis

> Source: 299 emails from Google Takeout export, 43 conversation threads covering every dinner done from 2021–2026.

---

## Email Demographics

| Domain                                                   | Count  | What                                                                |
| -------------------------------------------------------- | ------ | ------------------------------------------------------------------- |
| gmail.com                                                | 221    | Chef outbound (146) + client personal emails                        |
| emberbrandfire.com                                       | 19     | Repeat client (Ember Escapes — corporate retreats)                  |
| aol.com                                                  | 16     | Repeat clients                                                      |
| yahoo.com                                                | 13     | Clients                                                             |
| eprod.com                                                | 9      | Repeat client (corporate email)                                     |
| wix-forms.com                                            | 8      | Old website inquiry form                                            |
| hotmail.com                                              | 4      | Clients                                                             |
| takeachef.com                                            | 3      | Platform (gatekeeps — only sends booking confirmed + guest details) |
| optonline.net, comcast.net, pg.com, googlemail.com, etc. | 1 each | Clients                                                             |

**Key finding:** ~95% of real client inquiries come from personal email addresses (gmail, yahoo, aol, hotmail, comcast, optonline). The system must NOT treat personal-domain emails as suspicious.

---

## First Contact Patterns (INQUIRY signals)

These are the real patterns from actual first-contact emails:

### 1. Airbnb Referral (DOMINANT — ~60% of inquiries)

> "My husband and I are staying at an airbnb in Harrison Maine next week"
> "the Airbnb host provided your contact information"
> "staying at an Airbnb in Naples, Maine for the nights listed"
> "We got your name from them" (Airbnb hosts Jon/Rose/Courtney)

### 2. Date + Guest Count

> "available for 01/24/26 (Saturday) around 4-5 to prepare a 40th Birthday dinner"
> "dinner for two"
> "8 adults attending"
> "22 people with 6 kids ranging from age 5 to 15"

### 3. Occasion Mention

> "40th Birthday Dinner for Wife"
> "60th birthday"
> "Anniversary"
> "Team bonding"
> "mini-moon"
> "Infused Birthday Dinner Party"

### 4. Price/Availability Ask

> "what your price was for a weekday dinner for two"
> "am I able to get a price estimate"
> "what is your minimum cost to do this service"
> "are you available"

### 5. Referral Language

> "You were highly recommended by Lauren Boccelli"
> "the host provided your contact information"
> "I got your name from them"
> "We came across your website"

### 6. Food Preferences/Dietary (upfront)

> "She enjoys truffle Creme Brule for Dessert Dislikes Raspberry flavor"
> "Not huge seafood eaters, shrimp/calamari/salmon are all fair game"
> "shellfish allergy"
> "gluten free and budget friendly"
> "Tree nuts and almonds"

### 7. Cannabis/THC/Infused

> "cannabis if that is available"
> "THC infused options"
> "great infused food and drinks"
> "different dosing levels"

### 8. Website Follow-up

> "I requested to book with you for June 28th through your website"
> "I submitted a form"

---

## Back-and-forth Patterns (EXISTING_THREAD signals)

### Short Replies

> "Wednesday night would work great for us"
> "sounds good"
> "let's do that"

### Menu Selections

> "Let's do the wilted green salad, the stuffed artichoke appetizer, and the seared ribeye"
> "Pork dumplings, Fried pickles, Rib eye and lobster, Mousse"
> "6 beef entrees and 3 chicken entrees"

### Logistics

> "what time would you like to arrive?"
> "If you park in the back in front of the white fence, you will have direct access to the Kitchen"
> "Her house is right next to the Admiral's Inn... feel free to park there"

### Payment Discussion

> "venmo or zelle"
> "do you need a deposit or would you prefer cash the day of the event"
> "Just confirming that the price per person is $115"

### Pre-event Details

> "my mom prefers her duck cooked through, more done medium/well done"
> "I have 2 driveways as my house is sideways to the street"
> Phone numbers for day-of contact

### Post-event Thank You (NOT a new inquiry)

> "Just had to circle back and tell you again how remarkable the meal was"
> "Every single bite was outstanding!"
> "Looking forward to tomorrow!" (pre-event excitement)

---

## TakeAChef/Private Chef Manager (Platform — gatekept)

Only 2 email types from the platform:

1. **"New booking confirmed (Order ID: XXXXX)!"** from `info@takeachef.com`
   - Fields: Amount, Payment gateway, Menu name, Guests, Address, Date, Time, Occasion, Guest name
   - CTA: "Message your guest" link

2. **"Guest contact details for your upcoming booking"** from `info@takeachef.com`
   - Fields: Guest name, Phone number
   - Only sent close to the event date

The platform handles booking, messaging, and payment. Chefs get very little direct email.

---

## Wix Form Submissions

From `dfprivatechef@wix-forms.com`, subject: "Dinner Inquiry got a new submission"

Consistent key-value structure:

- Full Name
- Address
- Date and Serving Time (ISO format: `2025-08-16 07:00:00 PM`)
- Email
- Phone (with country code: `+1 978-807-9728`)
- Guest Count
- Event Theme/Occasion
- Any favorite ingredients or strong dislikes?
- Allergies/Food Restrictions
- Additional Notes

---

## Deterministic Inquiry Scoring System (Layer 4.5)

Based on this data, the classification system uses a scoring heuristic before Ollama:

| Signal            | Points | Rationale                                      |
| ----------------- | ------ | ---------------------------------------------- |
| Date mention      | +1     | Almost every inquiry mentions dates            |
| Guest count       | +1     | "dinner for X" is a defining inquiry signal    |
| Occasion          | +1     | Birthday, anniversary, etc.                    |
| Price/booking ask | +1     | "how much", "available", "book"                |
| Airbnb referral   | +2     | Dominant pattern — double-weighted             |
| Referral language | +1     | "recommended by", "host provided"              |
| Dietary mention   | +1     | Allergies/restrictions in context of a request |
| Cannabis/THC      | +1     | Unique to this business                        |
| Local geography   | +1     | Maine/NH locations                             |
| Website follow-up | +1     | "submitted a form"                             |

**Threshold:** Score 3+ = high confidence inquiry, Score 2 = medium confidence. Score 0-1 falls through to Ollama.

**Known client bypass:** If sender is already in the client list, Layer 4.5 is skipped — Ollama decides between `existing_thread` and new inquiry.

---

## Geographic Coverage

From the real data, the chef operates primarily in:

**Maine:** Portland, Kennebunk, Kennebunkport, Ogunquit, York, Scarborough, Cape Elizabeth, Freeport, Camden, Rockport, Bar Harbor, Kittery, Naples, Harrison, Norway, Bridgton, Sullivan

**New Hampshire:** Portsmouth, Hampton, North Conway, Conway, Lincoln, Tuftonboro

**Massachusetts (occasional):** Ipswich, Dracut, Pepperell, Brookline

---

## Common False Positives to Watch

1. **"Birthday" in a personal email** — friend mentioning their birthday, not requesting a dinner
2. **"Dinner" in a personal email** — casual mention of dinner plans, not a booking request
3. **"Available" in a non-booking context** — "are you available to chat" vs "are you available to cook"

The scoring system requires 2+ converging signals to avoid these. A single signal alone never triggers inquiry classification.
