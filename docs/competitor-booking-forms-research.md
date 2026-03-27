# Competitor Booking Form Research

> Research date: 2026-03-27
> Purpose: Document how competitor private chef platforms handle their booking/inquiry forms

---

## 1. Take a Chef (takeachef.com)

**UX Flow:** Multi-step wizard (approximately 11 steps). Starts with a "Get Started" / "Begin" CTA on the homepage. The form is a sequential questionnaire, one question per screen. Estimated completion: 5-10 minutes.

### Form Fields (in order)

| #   | Field                      | Type                                               | Required          | Details                                                                                                                                                                                                                         |
| --- | -------------------------- | -------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Service type               | Radio/toggle                                       | Yes               | "Single Request" (one service, one day) vs "Multiple Request" (multiple services, multiple days)                                                                                                                                |
| 2   | Occasion                   | Selection                                          | Yes               | Birthday, anniversary, family reunion, casual dining, etc.                                                                                                                                                                      |
| 3   | Event location             | Address input                                      | Yes               | Full street address. Platform routes the request to local chefs.                                                                                                                                                                |
| 4   | Guest count                | Range selector (single) / Numeric input (multiple) | Yes               | Single: range brackets. Multiple: exact headcount.                                                                                                                                                                              |
| 5   | Cuisine / food preferences | Selection                                          | Yes (single only) | Users choose food preferences; chefs design menus around them. Skipped for "Multiple" requests.                                                                                                                                 |
| 6   | Service date(s)            | Calendar picker                                    | Yes               | Specific date(s). Guidance provided for uncertain dates.                                                                                                                                                                        |
| 7   | Schedule / meal timing     | Selection                                          | Yes               | Single: specify meal timing. Multiple: check/uncheck specific dates.                                                                                                                                                            |
| 8   | Budget                     | 3-tier selection                                   | Yes               | Three named tiers: **Casual**, **Gourmet**, **Exclusive**. Exact dollar amounts not shown upfront. For single services, budget is quoted per guest. For multiple services, quoted per group. Does NOT include ingredient costs. |
| 9   | Allergies / restrictions   | Text field                                         | Optional          | Free-text for dietary requirements.                                                                                                                                                                                             |
| 10  | Additional notes           | Textarea                                           | Optional          | Comment box shared with chefs. Preferences, clarifications, special requests.                                                                                                                                                   |
| 11  | Contact information        | Name, email, etc.                                  | Yes               | Creates a Take a Chef profile.                                                                                                                                                                                                  |

### Budget Handling

- Three abstract tiers (Casual / Gourmet / Exclusive) rather than dollar amounts
- Budget is a "guideline for chefs to understand the budget you have in mind"
- Chefs may propose menus within or slightly above the selected range
- Single services: budget per guest. Multiple services: budget per group
- Ingredient costs are explicitly excluded from the budget tier
- Users can negotiate via messaging after receiving proposals

### Post-Submission

- Within a few hours, user receives up to 3 customized menu proposals from qualified chefs
- Each proposal includes: chef bio, reviews, proposed menu, and price quote
- Users chat with chefs via the platform to negotiate and customize
- No commitment until the user accepts a proposal and pays

### Notable UX Patterns

- The "Single vs Multiple" split at the very first step is clever. It tailors the entire flow.
- Budget is intentionally vague (tier names, not dollar amounts). This avoids anchoring and lets chefs propose what they think is right.
- The platform is a marketplace: chefs compete for the booking with proposals.

---

## 2. yhangry (yhangry.com)

**UX Flow:** Multi-step wizard (approximately 10 steps). Quick - marketed as "only takes around 5 minutes." After submission, chefs send competing quotes. Originally UK-based, now also serves the US.

### Form Fields (in order)

| #   | Field                     | Type              | Required    | Details                                                                                                                        |
| --- | ------------------------- | ----------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Event date and time       | Date/time picker  | Yes         | When the event will happen                                                                                                     |
| 2   | Service type              | Selection         | Yes         | Home cooking vs food delivery                                                                                                  |
| 3   | Serving style             | Selection         | Yes         | Seated vs standing event format                                                                                                |
| 4   | Guest context             | Selection         | Yes         | Relationship type: family, friends, colleagues, etc.                                                                           |
| 5   | Chef tier                 | 3-tier selection  | Yes         | "Good Value", "Fine Dining", or "Celebrity"                                                                                    |
| 6   | Budget                    | Adjustable / text | Flexible    | Customers can adjust the budget or stick to the chef's prices. Budget range is optional - helps chefs propose realistic menus. |
| 7   | Cuisine type              | Selection         | Yes         | What type of cuisine desired                                                                                                   |
| 8   | Kitchen info              | Text/selection    | Conditional | For home cooking: describe kitchen capabilities                                                                                |
| 9   | Dietary needs / allergies | Text              | Optional    | Free-text for allergies and restrictions                                                                                       |
| 10  | Event description         | Textarea          | Yes         | Occasion details and preferences                                                                                               |
| 11  | Postcode / city           | Text input        | Yes         | Location for chef matching (UK: postcode, US: zip/city)                                                                        |

### Budget Handling

- Budget is NOT a fixed required field - it's flexible
- Users "can adjust the budget or stick to the chef's prices"
- Pricing starts "from GBP 100, including groceries"
- The chef tier selection (Good Value / Fine Dining / Celebrity) acts as a soft budget signal
- After submission, individual chefs send quotes with specific menus and prices
- Users compare and negotiate

### Post-Submission

- Request sent to all matching chefs in the area
- Interested chefs respond with a quote (menu + price)
- User reviews, compares, and chats with chefs
- Payment secures the chef and blocks their calendar
- Payment options: full upfront, or 10% deposit (if event > 5 weeks away)
- Split payment available: user pays their share, gets a link to share with guests

### Notable UX Patterns

- The "Guest context" question (family/friends/colleagues) is unique. It helps chefs calibrate formality.
- Chef tier selection (Good Value / Fine Dining / Celebrity) is an elegant proxy for budget without asking a dollar amount.
- Split payment link for group events is a smart social feature.
- The UK postcode system makes location very precise.

---

## 3. Cozymeal (cozymeal.com)

**UX Flow:** Browse-and-book (like Airbnb for food). NOT a request/inquiry form. Users browse pre-built chef experiences with fixed per-person pricing, select one, pick a date, enter guest count, and book immediately. Single-page checkout.

### Search/Filter Interface

| #   | Field           | Type                   | Details                                                                                      |
| --- | --------------- | ---------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Location        | Dropdown (400+ cities) | "Select City" placeholder. Cities across US, Canada, France, Italy, etc.                     |
| 2   | Experience type | Dropdown               | "All Experiences", "Cooking Classes", "Private Chefs", "At-Home Hibachi", "Food Tours", etc. |
| 3   | Date            | Date picker            | "When?" field                                                                                |
| 4   | Group size      | Dropdown               | "1 Guest" through "51+ Guests"                                                               |

### Listing Page Filters

- **Cuisine:** Italian, French, Fusion, Mediterranean, American, Asian, Japanese, Korean, Moroccan, Spanish
- **Dietary:** Healthy, Pescatarian, Vegan, Vegetarian
- **Services:** Hibachi, BBQ, Brunch, Luxury Experiences
- **Price range:** Under $80, $80-$100, Over $100
- **Date:** Tomorrow, This Weekend, This Week, Next Week, Custom
- **Sort:** Recommended, Soonest, Price Low-High, Price High-Low, Reviews High-Low, Reviews Low-High

### Individual Chef Experience Page (Booking)

| #   | Field       | Type               | Details                                                           |
| --- | ----------- | ------------------ | ----------------------------------------------------------------- |
| 1   | Date/time   | Dropdown/calendar  | Pre-set available dates and time slots (11 AM, 12 PM, 5 PM, 6 PM) |
| 2   | Guest count | Selectize dropdown | Max 25 guests. Price adjusts in real-time as count changes.       |
| 3   | Book Now    | Button             | Opens checkout modal                                              |

### Budget/Pricing Handling

- **No budget question at all.** Pricing is completely transparent and fixed upfront.
- Each experience has a per-person price displayed prominently (e.g., "$99 each")
- Tiered group pricing: larger groups get discounts (e.g., $139/person for small groups, $119 for larger)
- 10.25% catering tax added
- Price updates in real-time as guest count changes
- Fees not shown by default (config: SHOW_PRICE_WITH_FEE: false)
- Special requests, wine pairings, extra courses may adjust final price (discussed with chef post-booking)

### Post-Submission

- Instant confirmation via email
- Chef contacts user to discuss menu details and special requests
- Free cancellation/reschedule up to 48 hours before event

### Notable UX Patterns

- Completely different model from Take a Chef / yhangry. No inquiry form at all. It's e-commerce.
- Fixed pricing removes all ambiguity and negotiation anxiety
- Real-time price updates as you change guest count is satisfying UX
- The "From $49/person" headline is an effective anchor
- Chef cards show: photo, experience title, per-person price, star rating, review count, next available dates
- Large group / custom requests handled via concierge (phone, email, chat) rather than a form

---

## 4. HireAChef.com

**UX Flow:** Directory search, then direct contact. No standardized booking form. This is the United States Personal Chef Association (USPCA) directory, operating since 1991.

### Search Interface

| #   | Field          | Type                       | Details                                                                          |
| --- | -------------- | -------------------------- | -------------------------------------------------------------------------------- |
| 1   | Service type   | Dropdown                   | "What do you need": Business Partners / Personal Chef                            |
| 2   | Specialization | Text/dropdown              | "Specializing in" - cuisine/service types                                        |
| 3   | Location       | Google Places autocomplete | "Search by location" with auto-complete. Also has "Use Current Location" button. |

### Budget/Pricing Handling

- **No pricing shown anywhere.** No budget field. No price ranges.
- Users find chefs via the directory and contact them directly
- All pricing discussion happens off-platform

### Post-Search

- Browse chef profiles with reviews and ratings
- Contact chefs directly (off-platform communication)
- No standardized proposal or quote system

### Notable UX Patterns

- This is the simplest model: just a directory. No booking flow, no inquiry form, no pricing.
- Location uses Google Places API with reverse geocoding
- The lack of any pricing transparency is notable (and likely a weakness)

---

## 5. Thumbtack (thumbtack.com)

**UX Flow:** Multi-step questionnaire wizard (~16 questions). Thumbtack is a general services marketplace, not chef-specific. The chef request is one of hundreds of service categories, so the form is generated from a template system.

### Form Fields (reconstructed from completed request data)

| #    | Field                  | Type                  | Details                                                                                   |
| ---- | ---------------------- | --------------------- | ----------------------------------------------------------------------------------------- |
| 1    | Zip code               | Text input (5 digits) | Primary location field. "Confirm your location to see quality pros near you"              |
| 2    | Type of event/occasion | Radio/selection       | Special occasion (birthday, anniversary), brunch/dinner party, wedding, etc.              |
| 3    | Number of guests       | Range brackets        | 3-5 guests, 6-10 guests, 11-20 guests, larger ranges                                      |
| 4    | Meal components        | Checkboxes            | Lunch, Dinner, Dessert, Cocktail hour/hors d'oeuvres                                      |
| 5    | Ingredient level       | Radio                 | "Premium (high end ingredients)" vs "Standard (basic ingredients)"                        |
| 6    | Cuisine type           | Selection             | Southern, French, Mediterranean/Middle Eastern, American - formal, etc.                   |
| 7    | Service details        | Selection             | Meal prepared onsite, frequency (only once vs recurring), location (my home, venue, etc.) |
| 8-16 | Additional questions   | Various               | ~8 more questions loaded dynamically (exact content varies by responses)                  |

### Budget/Pricing Handling

- **No explicit budget question in the questionnaire.** Thumbtack does NOT ask the user what they want to spend.
- Instead, chefs see the request details and set their own prices
- Chef listings show rates like "$50/person (starting price)" or "Contact for price"
- The "Ingredient level" question (Premium vs Standard) is a soft proxy for budget
- Users get "Free Estimates" from multiple pros

### Post-Submission

- Matched with relevant local pros
- Pros respond with custom quotes and messages
- Users compare side-by-side (pricing, reviews, photos)
- Communication and booking happen through the platform

### Notable UX Patterns

- The "Ingredient level" (Premium vs Standard) question is a clever indirect way to gauge budget expectations without asking a dollar amount
- Range brackets for guest count (3-5, 6-10, etc.) rather than exact number
- The form is dynamically generated (questions change based on prior answers)
- As a general marketplace, the form is more generic than chef-specific platforms

---

## 6. Table at Home (tableathome.com) - Bonus

**UX Flow:** 4-step wizard. Clean, fast. Marketed as "Takes less than a minute!" After submission, chefs send proposed menus.

### Form Fields (in order)

**Step 1: Date & Time**

| #   | Field         | Type                  | Required | Details                    |
| --- | ------------- | --------------------- | -------- | -------------------------- |
| 1   | Date and time | Date/time picker      | Yes      | "Select a date and time"   |
| 2   | Zip code      | Text input (5 digits) | Yes      | Validated for service area |

**Step 2: Meal Basics**

| #   | Field              | Type                  | Required | Details                                                                                                      |
| --- | ------------------ | --------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| 3   | Meal type          | Dropdown              | Yes      | "2-3 Course Plated Meal", "4+ Course Plated Meal", "Banquet Meal", "BBQ", "Brunch", etc.                     |
| 4   | Cuisine preference | Multi-select dropdown | Yes      | African, Asian, Caribbean, French, Italian, Japanese, Mediterranean, Mexican, Modern American, Spanish, etc. |
| 5   | Number of people   | Numeric input         | Yes      | Exact number                                                                                                 |

**Step 3: Preferences & Budget**

| #   | Field                | Type                  | Required | Details                                                               |
| --- | -------------------- | --------------------- | -------- | --------------------------------------------------------------------- |
| 6   | Dietary requirements | Multi-select dropdown | Optional | Vegetarian, Gluten Free, Kosher, Halal, Low carb, Keto, Organic, etc. |
| 7   | Budget per person    | Dropdown              | Yes      | **$30-$50, $50-$80, $80-$120, $120-$180, $180-$225, $225-$300**       |
| 8   | Meal description     | Textarea              | Yes      | Event details, preferences, special notes                             |

**Step 4: Contact Details**

| #   | Field      | Type                 | Required | Details         |
| --- | ---------- | -------------------- | -------- | --------------- |
| 9   | First name | Text                 | Yes      |                 |
| 10  | Email      | Email input          | Yes      | Validated       |
| 11  | Phone      | Phone input (masked) | Yes      |                 |
| 12  | Password   | Password             | Yes      | Creates account |

### Budget Handling

- **Explicit per-person budget ranges via dropdown.** Most direct approach of all platforms.
- Six clear brackets: $30-$50, $50-$80, $80-$120, $120-$180, $180-$225, $225-$300
- Framed as "Budget per person" (clear, honest label)
- Required field - you must set a budget
- This budget guides what chefs propose, not a binding price

### Post-Submission

- Chefs receive the request and send proposed menus within the budget range
- User reviews proposals and picks their chef

### Notable UX Patterns

- The most straightforward and honest budget handling of all platforms
- 4-step wizard is the fastest of any competitor (under 1 minute claim is credible)
- Meal type before cuisine is smart ordering (narrows scope before preference)
- Zip code + date first gets the "can we serve you?" question answered immediately

---

## 7. Gathar (gathar.com) - Bonus

**UX Flow:** Concierge-driven. Limited self-serve form data available, but configuration reveals key parameters.

### Key Parameters (from platform config)

- **Location:** Supports multiple US cities (LA, SF, NYC, Austin, Miami, etc.)
- **Guest count:** Min 6, Max 100
- **Menu types:** Curated menu, Custom menu, Grazing table, Private chef
- **Pricing model:** $1,800 flat booking fee for "platform + concierge services", plus sales tax, includes gratuity
- **Budget:** Not a user-facing field. Pricing is set by the platform per experience.

---

## Cross-Platform Analysis

### How Budget/Pricing Is Handled

| Platform          | Budget Approach                                                       | When Asked     | Format                                |
| ----------------- | --------------------------------------------------------------------- | -------------- | ------------------------------------- |
| **Take a Chef**   | 3 abstract tiers (Casual/Gourmet/Exclusive)                           | During inquiry | Selection (no dollar amounts shown)   |
| **yhangry**       | Chef tier (Good Value/Fine Dining/Celebrity) + optional budget adjust | During inquiry | Tier selection + flexible text        |
| **Cozymeal**      | Not asked. Fixed transparent pricing.                                 | Never          | Pre-set per-person prices on listings |
| **HireAChef**     | Not asked. No pricing shown.                                          | Never          | Direct chef contact                   |
| **Thumbtack**     | Not asked directly. "Ingredient level" as proxy.                      | During inquiry | Radio (Premium/Standard)              |
| **Table at Home** | Explicit per-person dollar ranges                                     | During inquiry | Dropdown with 6 brackets              |
| **Gathar**        | Not asked. Platform sets flat fee.                                    | Never          | Fixed platform pricing                |

**Key insight:** The majority of platforms either avoid asking about budget entirely (Cozymeal, HireAChef, Gathar) or use indirect/abstract proxies (Take a Chef's tier names, yhangry's chef tier, Thumbtack's ingredient level). Only Table at Home asks for explicit dollar ranges. Nobody uses free-text budget input.

### How Location Is Handled

| Platform          | Location Method                                     |
| ----------------- | --------------------------------------------------- |
| **Take a Chef**   | Full street address (text input)                    |
| **yhangry**       | Postcode (UK) / Zip code or city (US)               |
| **Cozymeal**      | City dropdown (400+ pre-set cities)                 |
| **HireAChef**     | Google Places autocomplete + "Use Current Location" |
| **Thumbtack**     | 5-digit zip code                                    |
| **Table at Home** | 5-digit zip code                                    |

**Key insight:** Zip code is the most common approach in the US. Cozymeal's city dropdown is unique but limits granularity. Full address (Take a Chef) is the most precise but adds friction.

### How Guest Count Is Handled

| Platform          | Guest Count Method                                |
| ----------------- | ------------------------------------------------- |
| **Take a Chef**   | Range brackets (single) / Exact number (multiple) |
| **yhangry**       | Numeric input                                     |
| **Cozymeal**      | Dropdown (1-51+ guests)                           |
| **Thumbtack**     | Range brackets (3-5, 6-10, 11-20, etc.)           |
| **Table at Home** | Exact numeric input                               |

**Key insight:** Split between exact numbers and range brackets. Range brackets reduce decision friction ("about 8 people" fits easily into "6-10") but lose precision.

### UX Flow Comparison

| Platform          | Flow Type                  | Steps               | Est. Time             |
| ----------------- | -------------------------- | ------------------- | --------------------- |
| **Take a Chef**   | Multi-step wizard          | ~11 steps           | 5-10 min              |
| **yhangry**       | Multi-step wizard          | ~10 steps           | ~5 min                |
| **Cozymeal**      | Browse & book (e-commerce) | 3 clicks            | 1-2 min               |
| **HireAChef**     | Directory search           | 2-3 fields          | < 1 min (search only) |
| **Thumbtack**     | Multi-step questionnaire   | ~16 questions       | 5-8 min               |
| **Table at Home** | 4-step wizard              | 4 steps / 12 fields | < 1 min               |

### What Happens After Submission

| Platform          | Post-Submit Model                                                       |
| ----------------- | ----------------------------------------------------------------------- |
| **Take a Chef**   | Chefs send customized menu proposals (up to 3). Chat to negotiate.      |
| **yhangry**       | All matching chefs see request. Interested ones send quotes with menus. |
| **Cozymeal**      | Instant booking confirmation. Chef contacts to finalize details.        |
| **HireAChef**     | User contacts chefs directly. No platform mediation.                    |
| **Thumbtack**     | Matched pros send quotes. Compare side-by-side.                         |
| **Table at Home** | Chefs send proposed menus within budget. User picks.                    |

---

## Patterns Worth Stealing

1. **Abstract budget tiers instead of dollar amounts** (Take a Chef, yhangry). Avoids anchoring, reduces sticker shock, and lets chefs propose what's appropriate. The tier names (Casual/Gourmet/Exclusive or Good Value/Fine Dining/Celebrity) communicate expectations without specific numbers.

2. **Real-time price updates** (Cozymeal). As guest count changes, the total updates instantly. Satisfying and transparent.

3. **Guest context question** (yhangry). Asking "who is this for?" (family/friends/colleagues) helps chefs calibrate formality and menu style. No other platform asks this.

4. **Ingredient level as budget proxy** (Thumbtack). "Premium vs Standard ingredients" communicates budget expectations without asking a dollar amount. Feels like a preference question, not a money question.

5. **Split payment links** (yhangry). For group events, user pays their share and gets a link to share with guests. Reduces the "one person pays for everyone" friction.

6. **Zip code first** (Table at Home, Thumbtack). Checking service availability before collecting all the details avoids wasted effort.

7. **4-step wizard** (Table at Home). Proves you can collect all necessary info in under 1 minute with smart grouping.

8. **Meal type before cuisine** (Table at Home). Narrowing "what kind of meal" (plated, banquet, BBQ, brunch) before "what cuisine" is a smarter funnel than asking cuisine first.

9. **No-commitment framing** (Take a Chef). "Receive tailored proposals with no commitment at all" is prominent. Reduces anxiety about submitting.

10. **Chef competition model** (Take a Chef, yhangry, Table at Home). Multiple chefs bid on the request. This creates urgency for chefs and choice for clients. The client feels empowered, not locked in.
