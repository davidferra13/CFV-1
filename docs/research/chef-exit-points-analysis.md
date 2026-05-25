# Every Scenario Where a Chef Still Leaves ChefFlow

> **Purpose:** Map every moment a working chef exits ChefFlow to use another tool.
> These are the boundaries of the product. Some are permanent (ChefFlow will never be Amazon).
> Others are opportunities to reduce friction without replacing the external tool.
>
> **Companion docs:**
>
> - `docs/specs/zero-friction-exit-handoffs.md` (handoff spec for all 91 exit reasons)
> - `docs/research/chef-never-leaves-analysis.md` (353 workflows that stay in-app)
>
> **Date:** 2026-05-25

---

## Category 1: COSTING & PRICING (Highest Frequency Exit)

| #   | Scenario                                     | Where They Go                                                       | Why They Leave                                        | ChefFlow Could...                                                       |
| --- | -------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | Cost out a menu using real retail prices     | Amazon/Whole Foods app, Instacart, store websites                   | PIE data incomplete or stale for their region/items   | Improve PIE coverage + freshness; but retail browsing will always exist |
| 2   | Check current price of a specific ingredient | Google, store apps, vendor portals                                  | Need today's price, not a synthetic estimate          | Real-time price lookup (API or scrape) for top items                    |
| 3   | Compare prices across multiple stores        | Multiple store apps/websites open simultaneously                    | Finding cheapest source for a shopping list           | Price comparison dashboard (PIE expansion)                              |
| 4   | Check specialty ingredient availability      | Specialty vendor websites (spice houses, importers, ethnic markets) | Long-tail items PIE will never cover                  | Allow manual price pinning per ingredient                               |
| 5   | Verify seasonal availability                 | Farmer websites, market schedules, wholesaler portals               | "Can I even get ramps in May in my area?"             | Seasonal availability calendar (PIE layer)                              |
| 6   | Look up bulk/wholesale pricing               | Restaurant Depot, US Foods, Sysco portals                           | Wholesale pricing is login-gated, not public          | Vendor price import (manual or integration)                             |
| 7   | Calculate food cost % against a target       | Spreadsheet (Google Sheets, Excel)                                  | Need to model "what if I swap this protein" scenarios | Built-in menu cost modeler with margin targets                          |

---

## Category 2: VENDOR & SUPPLIER INTERACTION

| #   | Scenario                               | Where They Go                                                       | Why They Leave                                             | ChefFlow Could...                                                                                     |
| --- | -------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 8   | Browse vendor's full product catalog   | Vendor website (US Foods, Sysco, Restaurant Depot, local purveyors) | Discovering what's available, not just pricing             | **Permanent exit.** Vendor catalogs are their product. Link out cleanly.                              |
| 9   | Place an order with a vendor           | Vendor ordering portal or app                                       | Actual purchasing transaction                              | **Permanent exit.** ChefFlow is not an ordering system. Could generate a shopping list to carry over. |
| 10  | Check order status / delivery tracking | Vendor app, FedEx/UPS, Amazon                                       | Tracking a specific shipment                               | **Permanent exit.** Could store tracking links.                                                       |
| 11  | Contact a vendor (call, email, chat)   | Phone, email, vendor portal chat                                    | Asking about availability, substitutions, delivery windows | Could store vendor contacts + last-contact notes                                                      |
| 12  | Research new vendors/suppliers         | Google, Yelp, industry forums, word of mouth                        | Finding a better fish guy, new farm, specialty supplier    | Vendor directory (future; low priority)                                                               |
| 13  | Compare vendor quality/reliability     | Google reviews, chef forums, personal notes                         | "Should I switch from Vendor A to Vendor B?"               | Vendor rating/notes per chef (lightweight CRM)                                                        |

---

## Category 3: CLIENT RESEARCH & RELATIONSHIP

| #   | Scenario                                                   | Where They Go                                  | Why They Leave                                             | ChefFlow Could...                                                                                   |
| --- | ---------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 14  | Research a new client before first meeting                 | Client's Facebook, Instagram, LinkedIn, Google | Learn dietary preferences, lifestyle, family size, vibe    | **Permanent exit.** Social stalking is inherently external. Could store findings in client profile. |
| 15  | Check client's social media for event context              | Instagram, Facebook, Pinterest                 | Client mentioned a theme; chef looks for visual references | **Permanent exit.** Could allow image/link pinning to events.                                       |
| 16  | Look up client's company for corporate event               | Company website, LinkedIn                      | Understanding the org, attendee count, corporate culture   | **Permanent exit.** Could store company info in client profile.                                     |
| 17  | Check a client's dietary/allergy info from external source | Medical/allergy databases, Google              | Client mentioned a condition chef doesn't know well        | **Permanent exit.** Could maintain allergy reference library.                                       |
| 18  | View client's venue/home on map                            | Google Maps, Street View, Zillow               | Assess kitchen, parking, access, neighborhood              | **Permanent exit.** Could embed map link in event detail.                                           |

---

## Category 4: RECIPE & CULINARY RESEARCH

| #   | Scenario                                      | Where They Go                                          | Why They Leave                                                 | ChefFlow Could...                                                                             |
| --- | --------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 19  | Look up a technique or method                 | YouTube, ChefSteps, Serious Eats, Google               | "How do you temper chocolate at altitude?"                     | **Permanent exit.** ChefFlow is not a culinary school.                                        |
| 20  | Find recipe inspiration for a menu            | Food blogs, Instagram, Pinterest, cookbooks (physical) | Creative ideation for a new client or season                   | **Permanent exit.** Creativity happens everywhere. Could have an inspiration board/clipboard. |
| 21  | Research a cuisine they're less familiar with | Google, food blogs, YouTube, cookbooks                 | Client wants Thai and chef specializes in French               | **Permanent exit.** Reference, not ops.                                                       |
| 22  | Check nutritional info for a dish             | USDA database, MyFitnessPal, Cronometer                | Client wants macros, calorie counts, or specific nutrient info | Could integrate USDA data for common ingredients                                              |
| 23  | Verify food safety temps/times                | FDA guidelines, state health dept, ServSafe materials  | "What's the safe hold temp for sous vide chicken?"             | Built-in food safety quick reference (static data, rarely changes)                            |
| 24  | Find a substitute ingredient                  | Google, allergy-specific sites, chef forums            | Client has an allergy; need a swap that works                  | Substitution engine (AI-assisted, tied to recipes)                                            |

---

## Category 5: COMMUNICATION (The Messy Reality)

| #   | Scenario                                                      | Where They Go                                               | Why They Leave                                                   | ChefFlow Could...                                                   |
| --- | ------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| 25  | Text/iMessage a client                                        | Phone's native messaging app                                | Client texted first; chef responds in same channel               | **Permanent exit.** Can't hijack SMS. Remy handles email channel.   |
| 26  | WhatsApp with a client                                        | WhatsApp                                                    | Common for international clients, food photos                    | **Permanent exit.** Could log conversation summaries.               |
| 27  | Call a client                                                 | Phone                                                       | Some conversations need voice (sensitive topics, quick confirms) | **Permanent exit.** Could log call notes.                           |
| 28  | Check personal email for client replies                       | Gmail, Outlook                                              | Client replied to a non-ChefFlow thread                          | Remy email integration should reduce this over time                 |
| 29  | Respond to inquiry on a 3rd-party platform                    | Thumbtack, Bark, Take a Chef, personal website contact form | Inquiry came through an external channel                         | Inquiry consolidation hub (planned)                                 |
| 30  | Send food photos to client                                    | iMessage, WhatsApp, Instagram DM                            | "Here's what I made tonight!"                                    | **Permanent exit.** Social/personal sharing is inherently external. |
| 31  | Coordinate with other vendors (florist, event planner, venue) | Email, phone, text                                          | Multi-vendor events require external coordination                | Could store vendor contacts per event                               |

---

## Category 6: MARKETING & SOCIAL PRESENCE

| #   | Scenario                             | Where They Go                                      | Why They Leave                              | ChefFlow Could...                                            |
| --- | ------------------------------------ | -------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------ |
| 32  | Post food photos to Instagram/TikTok | Instagram, TikTok apps                             | Building personal brand, attracting clients | **Permanent exit.** ChefFlow is ops, not social media.       |
| 33  | Update Google Business Profile       | Google Business dashboard                          | Hours, photos, responding to reviews        | **Permanent exit.** Could remind chef to update.             |
| 34  | Respond to Yelp/Google reviews       | Yelp, Google                                       | Reputation management                       | **Permanent exit.** Could surface review alerts.             |
| 35  | Update personal website/portfolio    | Squarespace, Wix, WordPress, etc.                  | Showcasing work, updating menus/services    | **Permanent exit.** ChefFlow profile page could reduce need. |
| 36  | Create marketing materials           | Canva, Adobe, etc.                                 | Flyers, business cards, social graphics     | **Permanent exit.** Design tools are design tools.           |
| 37  | Manage ads                           | Facebook Ads, Google Ads, Instagram promoted posts | Paid client acquisition                     | **Permanent exit.** Could track ad spend in financials.      |

---

## Category 7: MONEY & PAYMENTS

| #   | Scenario                               | Where They Go                             | Why They Leave                                     | ChefFlow Could...                                                  |
| --- | -------------------------------------- | ----------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------ |
| 38  | Check if a client payment cleared      | Stripe dashboard, bank app, Venmo, Zelle  | Verifying deposit arrived                          | Stripe integration shows payment status in-app                     |
| 39  | Send a payment request via Venmo/Zelle | Venmo, Zelle, PayPal                      | Client prefers informal payment method             | **Permanent exit.** Could log informal payments.                   |
| 40  | Reconcile bank statements              | Bank website/app                          | Monthly bookkeeping, matching invoices to deposits | **Permanent exit.** Could export reconciliation report.            |
| 41  | Handle taxes / quarterly estimates     | TurboTax, tax software, accountant portal | Tax prep, expense categorization                   | **Permanent exit.** Could export financial summaries for tax prep. |
| 42  | Manage business insurance              | Insurance provider portal                 | Renew, update coverage, file claims                | **Permanent exit.** Could store policy info + renewal reminders.   |

---

## Category 8: LOGISTICS & TRAVEL

| #   | Scenario                                 | Where They Go                      | Why They Leave                                      | ChefFlow Could...                                                       |
| --- | ---------------------------------------- | ---------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| 43  | Route planning for the day               | Google Maps, Waze, Apple Maps      | Multiple clients/stops, optimizing drive time       | Could show event locations on a map view; **routing is permanent exit** |
| 44  | Check traffic before leaving             | Google Maps, Waze                  | "Should I leave now or wait 20 min?"                | **Permanent exit.** Real-time traffic is not our domain.                |
| 45  | Find a grocery store near an event venue | Google Maps                        | "I need cilantro and the nearest Whole Foods is..." | **Permanent exit.** Could show nearby stores on event map.              |
| 46  | Book travel for destination events       | Airlines, hotels, car rental sites | Out-of-town gig logistics                           | **Permanent exit.** Could store travel details on event.                |
| 47  | Rent equipment for large events          | Rental company websites            | Tables, chafing dishes, extra burners, tents        | **Permanent exit.** Could store rental contacts + costs on event.       |

---

## Category 9: LEGAL & COMPLIANCE

| #   | Scenario                                     | Where They Go                            | Why They Leave                                      | ChefFlow Could...                                       |
| --- | -------------------------------------------- | ---------------------------------------- | --------------------------------------------------- | ------------------------------------------------------- |
| 48  | Renew food handler's license                 | State/county health department website   | Annual/biannual requirement                         | Could track expiration + remind                         |
| 49  | Check local cottage food / home kitchen laws | State government websites                | "Can I do this event under cottage food exemption?" | Could maintain a regulation reference (but laws change) |
| 50  | Get business license / permits               | City/county government portals           | Event-specific permits, annual renewals             | **Permanent exit.** Could track + remind.               |
| 51  | Review/sign a venue's liability waiver       | Email attachment, DocuSign-like platform | Venue requires chef's insurance/waiver              | **Permanent exit.** Could store signed docs.            |
| 52  | Consult with a lawyer                        | Email, phone, video call                 | Contract disputes, liability questions              | **Permanent exit.**                                     |

---

## Category 10: PROFESSIONAL DEVELOPMENT

| #   | Scenario                                       | Where They Go                                                  | Why They Leave                               | ChefFlow Could...                               |
| --- | ---------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------- |
| 53  | Take an online course or certification         | Coursera, MasterClass, CIA online, local culinary schools      | Expanding skills, maintaining certifications | **Permanent exit.** Could track certifications. |
| 54  | Read industry news                             | Eater, Food & Wine, James Beard Foundation, trade publications | Staying current on trends, local scene       | **Permanent exit.**                             |
| 55  | Network with other chefs                       | Instagram DMs, WhatsApp groups, industry events                | Finding subs, sharing intel, community       | **Permanent exit.**                             |
| 56  | Find a sous chef / assistant for a large event | Word of mouth, Instagram, staffing agencies                    | Need extra hands                             | Could maintain a trusted-staff roster           |

---

## Category 11: EVENT-SPECIFIC RESEARCH

| #   | Scenario                                   | Where They Go                                   | Why They Leave                                        | ChefFlow Could...                                       |
| --- | ------------------------------------------ | ----------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| 57  | Research a venue's kitchen capabilities    | Venue website, Google, calling the venue        | "Does this venue have a commercial oven?"             | Could store venue profiles with kitchen specs           |
| 58  | Check weather for outdoor event            | Weather app, weather.com                        | "Do I need a backup plan for Saturday's farm dinner?" | Could show weather forecast on event detail             |
| 59  | Find local farm for farm-to-table sourcing | Google, farm websites, farmers market schedules | "Who has the best tomatoes within 30 miles?"          | Vendor directory with farm focus                        |
| 60  | Research wine/beverage pairings            | Wine apps, Google, distributor catalogs         | Client wants pairing recommendations                  | **Permanent exit.** Could store pairing notes on menus. |
| 61  | Get table/seating layout ideas             | Pinterest, event planning sites                 | Visual inspiration for a special event                | **Permanent exit.**                                     |

---

## Category 12: HARDWARE & EQUIPMENT

| #   | Scenario                        | Where They Go                                      | Why They Leave                               | ChefFlow Could...                                    |
| --- | ------------------------------- | -------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------- |
| 62  | Buy kitchen equipment           | Amazon, WebstaurantStore, restaurant supply stores | Replacing a broken tool, upgrading for a gig | **Permanent exit.** Could track equipment inventory. |
| 63  | Get equipment serviced/repaired | Google for local repair, manufacturer website      | Broken immersion circulator, dull knives     | **Permanent exit.** Could store service contacts.    |
| 64  | Research new equipment          | YouTube reviews, Amazon reviews, chef forums       | "Is this combi oven worth it?"               | **Permanent exit.**                                  |

---

## Category 13: PEOPLE & DELEGATION

| #   | Scenario                                                            | Where They Go                | Why They Leave                                                              | ChefFlow Could...                                                |
| --- | ------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 65  | Coordinate with client's household staff (house manager, nanny, PA) | Email, phone, text           | Dietary info, access codes, schedule changes come through staff, not client | Store household contacts on client profile                       |
| 66  | Hire/coordinate photographer for events                             | Instagram DMs, email, phone  | Portfolio shots, client requests event coverage                             | **Permanent exit.** Could store photographer contacts per event. |
| 67  | Communicate with commissary kitchen landlord                        | Email, phone, portal         | Booking kitchen time, rent, maintenance                                     | **Permanent exit.** Could store commissary details.              |
| 68  | Manage cleaning crew / dishwashers for large events                 | Text, phone, staffing apps   | Extra hands for cleanup at big events                                       | **Permanent exit.** Could track trusted staff roster.            |
| 69  | Coordinate with delivery drivers (meal prep clients)                | Text, phone, delivery apps   | Recurring meal prep needs reliable delivery                                 | **Permanent exit.** Could log delivery contacts per client.      |
| 70  | Talk to accountant/bookkeeper (non-tax)                             | Email, phone, portal         | Monthly reconciliation, expense categorization, payroll questions           | **Permanent exit.** Could export financial summaries on demand.  |
| 71  | Deal with health inspector                                          | In-person, government portal | Scheduled/surprise inspections, follow-up documentation                     | **Permanent exit.** Could store inspection records + dates.      |

---

## Category 14: OPERATIONAL TOOLS & CALCULATIONS

| #   | Scenario                                             | Where They Go                             | Why They Leave                                               | ChefFlow Could...                                               |
| --- | ---------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| 72  | Sync events to personal calendar                     | Google Calendar, Apple Calendar           | Chef's life is not only ChefFlow; need unified view          | Calendar export/sync (iCal feed or Google Calendar integration) |
| 73  | Track mileage for tax deductions                     | MileIQ, Everlance, spreadsheet            | IRS requires mileage logs; chef drives to every event        | Log trip distance per event; export annual mileage report       |
| 74  | Scale a recipe from 4 to 40 servings                 | Calculator, spreadsheet                   | Party of 40 needs proportional scaling with adjustments      | Built-in recipe scaling engine (core recipe feature)            |
| 75  | Convert units (metric/imperial, volume/weight)       | Google, converter app                     | "How many grams in 3/4 cup of flour?"                        | Built-in unit converter (trivial to build)                      |
| 76  | Edit food photos before posting                      | Lightroom, Snapseed, VSCO                 | Raw photos need color/crop before social                     | **Permanent exit.** Photo editing is its own domain.            |
| 77  | Print allergen/nutrition labels                      | Label software, Canva, Word               | Meal prep clients or events require labels                   | Generate label content from recipe data; chef prints externally |
| 78  | Create contracts/proposals beyond ChefFlow templates | Google Docs, Word                         | Client needs custom terms, venue-specific clauses            | Export proposals to editable format                             |
| 79  | Check competitor pricing/offerings                   | Other chefs' websites, Thumbtack listings | "Am I charging enough for a 12-person dinner?"               | **Permanent exit.** Could surface PIE market rate context.      |
| 80  | Manage a waitlist during busy season                 | Spreadsheet, notes app, CRM               | More inquiries than capacity; need to track priority/order   | Client queue with waitlist status (reducible)                   |
| 81  | Calculate tip/gratuity split for hired staff         | Calculator, spreadsheet, Venmo            | Multi-person events with shared tips                         | Staff payment tracker per event                                 |
| 82  | Create/manage gift certificates                      | Canva, Square, custom templates           | Client wants to gift a dinner to someone                     | Could generate gift certificates tied to bookings               |
| 83  | Send thank-you / follow-up gifts to clients          | Amazon, gift sites, florists              | Post-event relationship building                             | **Permanent exit.** Could remind + track.                       |
| 84  | Manage recurring meal prep schedule                  | Spreadsheet, notes, calendar              | Meal prep clients have different cadence than one-off events | Recurring event type with weekly/biweekly templates (reducible) |
| 85  | Schedule social media posts                          | Later, Buffer, Meta Business Suite        | Batch-create content, post at optimal times                  | **Permanent exit.** Social scheduling is its own domain.        |
| 86  | Track personal pantry / dry stock inventory          | Notes app, spreadsheet                    | "Do I already have saffron or do I need to buy it?"          | Pantry tracker (lightweight inventory)                          |

---

## Category 15: TIME & LOCATION LOGISTICS

| #   | Scenario                                      | Where They Go                        | Why They Leave                                                   | ChefFlow Could...                                                 |
| --- | --------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| 87  | Set prep timing reminders/alarms              | Phone alarm, timer app               | "Start brining the turkey at 6 AM tomorrow"                      | Prep timeline with push notifications per event                   |
| 88  | Time zone math for destination events         | Google, world clock                  | Flying to a client in another time zone; prep schedule shifts    | Event timezone field with auto-adjusted prep timeline             |
| 89  | Find a commissary/commercial kitchen to rent  | Google, The Kitchen Door, Craigslist | Need licensed kitchen space for large prep or meal prep business | Venue profiles with commissary type; **search is permanent exit** |
| 90  | Check parking/loading dock logistics at venue | Google Maps, call venue, Street View | "Can I park a van and unload 50 lbs of equipment?"               | Venue profile notes (access, parking, loading)                    |

---

## Category 16: MARKET & COMPETITIVE INTELLIGENCE

| #   | Scenario                                       | Where They Go                            | Why They Leave                                       | ChefFlow Could...                                                  |
| --- | ---------------------------------------------- | ---------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| 91  | Research trending cuisines/food trends in area | Instagram, Eater, food blogs, TikTok     | "What are clients asking for this season?"           | **Permanent exit.** Trend-watching is cultural, not operational.   |
| 92  | Validate own pricing against market rates      | Thumbtack, competitor sites, chef forums | "Am I undercharging for a 20-person cocktail party?" | PIE market rate context; **external validation is permanent exit** |

---

## Category 17: DURING-SERVICE (The Kitchen Boundary)

> ChefFlow is an operations tool, not a kitchen companion. These exits define where "planning" ends and "cooking" begins.

| #   | Scenario                                   | Where They Go                             | Why They Leave                                 | ChefFlow Could...                                                              |
| --- | ------------------------------------------ | ----------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------ |
| 93  | Multiple concurrent kitchen timers         | Phone timer app, physical timers          | Braise, bread, custard all on different clocks | **Permanent exit.** Timer apps are purpose-built.                              |
| 94  | Quick recipe glance mid-cook (hands dirty) | Phone screen (recipe app, photo of notes) | Need to confirm a ratio or temp while working  | Could optimize recipe view for glance-able mobile (large text, minimal scroll) |
| 95  | Music/ambiance control                     | Spotify, Apple Music, smart speaker       | Background music for service or personal focus | **Permanent exit.**                                                            |

---

## THE PATTERN: Three Types of Exits

### 1. PERMANENT EXITS (ChefFlow should never try to replace these)

External platforms with their own ecosystems. ChefFlow's job: reduce friction at the boundary.

- Vendor catalogs & ordering (8, 9, 10)
- Social media & marketing (32-37, 76, 85, 91)
- Communication apps (25-27, 30)
- Travel & booking (46)
- Government portals (48-52, 71)
- Equipment purchasing (62-64)
- Creative research & education (19-21, 53-55)
- People coordination (66-70)
- During-service tools (93, 95)
- Competitive intelligence (79)
- Gifting & relationship gestures (83)

**Strategy:** Clean link-outs, store context from the trip, log what was learned.

### 2. REDUCIBLE EXITS (ChefFlow could eliminate or reduce these)

Chef leaves because ChefFlow data is incomplete, stale, or missing a feature.

- Menu costing on store apps because PIE is unreliable (1-3, 6, 7)
- Checking personal email because Remy doesn't cover all channels (28-29)
- Googling food safety because no reference library (23)
- Spreadsheet costing because no margin modeler (7)
- Checking payment status outside Stripe (38)
- Recipe scaling on a calculator (74)
- Unit conversion on Google (75)
- Waitlist management in a spreadsheet (80)
- Recurring meal prep in a spreadsheet/calendar (84)

**Strategy:** Improve PIE, expand Remy, build lightweight reference tools, add missing core recipe/scheduling features.

### 3. BRIDGEABLE EXITS (Chef will always go external, but ChefFlow can smooth the round-trip)

- Client research on social media -> store findings in client profile (14-16, 65)
- Venue research -> store venue kitchen specs on event (57, 89, 90)
- Weather check -> show forecast on event detail (58)
- Route planning -> show map with day's stops (43)
- Vendor calls -> log notes and next-contact date (11, 31)
- Tax prep -> export clean financial summary (41)
- Informal payments -> log them against invoices (39)
- Calendar sync -> iCal export or Google Calendar feed (72)
- Mileage tracking -> log distance per event (73)
- Label generation -> produce content from recipe data (77)
- Contract export -> editable format for custom terms (78)
- Staff tips -> payment tracker per event (81)
- Gift certificates -> generate tied to bookings (82)
- Pantry tracking -> lightweight inventory (86)
- Prep reminders -> push notifications per event (87)
- Timezone handling -> auto-adjusted prep timeline (88)
- Market rate validation -> PIE context for own pricing (92)
- Mid-cook recipe glance -> optimized mobile view (94)

**Strategy:** Don't replace the external tool. Make it easy to leave, and easy to bring the intel back.

### 1. PERMANENT EXITS (ChefFlow should never try to replace these)

External platforms with their own ecosystems. ChefFlow's job: reduce friction at the boundary.

- Vendor catalogs & ordering (8, 9, 10)
- Social media & marketing (32-37)
- Communication apps (25-27, 30)
- Travel & booking (46)
- Government portals (48-52)
- Equipment purchasing (62-64)
- Creative research & education (19-21, 53-55)

**Strategy:** Clean link-outs, store context from the trip, log what was learned.

### 2. REDUCIBLE EXITS (ChefFlow could eliminate or reduce these)

Chef leaves because ChefFlow data is incomplete, stale, or missing a feature.

- Menu costing on store apps because PIE is unreliable (1-3, 6, 7)
- Checking personal email because Remy doesn't cover all channels (28-29)
- Googling food safety because no reference library (23)
- Spreadsheet costing because no margin modeler (7)
- Checking payment status outside Stripe (38)

**Strategy:** Improve PIE, expand Remy, build lightweight reference tools.

### 3. BRIDGEABLE EXITS (Chef will always go external, but ChefFlow can smooth the round-trip)

- Client research on social media -> store findings in client profile (14-16)
- Venue research -> store venue kitchen specs on event (57)
- Weather check -> show forecast on event detail (58)
- Route planning -> show map with day's stops (43)
- Vendor calls -> log notes and next-contact date (11, 31)
- Tax prep -> export clean financial summary (41)
- Informal payments -> log them against invoices (39)

**Strategy:** Don't replace the external tool. Make it easy to leave, and easy to bring the intel back.

---

## PRIORITY RANKING (By Chef Pain)

**Leaves most often for:**

1. Costing/pricing on store apps (daily, multiple times)
2. Client texting/calling (daily)
3. Calendar sync to personal calendar (daily)
4. Vendor ordering/browsing (weekly, per event)
5. Recipe scaling on a calculator (per menu creation)
6. Recipe/technique research (per menu creation)
7. Route planning (per event day)
8. Social media posting (weekly)
9. Payment verification (per event)
10. Unit conversion on Google (per recipe)
11. Client social media research (per new client)
12. Grocery store finding near venue (per event)
13. Weather checking (per outdoor event)
14. Mileage tracking (per event, for taxes)
15. Recurring meal prep scheduling (weekly, for meal prep clients)

**Highest-impact improvements:**

1. **PIE reliability** = eliminates #1 exit (costing on store apps)
2. **Inquiry consolidation** = reduces #2 (scattered communication)
3. **Calendar sync** = bridges #3 (unified schedule)
4. **Recipe scaling** = eliminates #5 (calculator exit)
5. **Unit converter** = eliminates #10 (Google exit)
6. **Shopping list export** = bridges #4 (vendor ordering)
7. **Event map view** = bridges #7 and #12 (routing + nearby stores)
8. **Client profile enrichment** = bridges #11 (social research)
9. **Mileage logging per event** = bridges #14 (tax deduction tracking)
10. **Recurring event type** = eliminates #15 (meal prep scheduling)

---

_95 exit scenarios. 35 permanent. 16 reducible. 44 bridgeable._
_The product's job is not to replace everything. It's to make every exit and return frictionless._
_The kitchen boundary (Category 17) marks where operations end and cooking begins._
