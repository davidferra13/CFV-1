# Zero-Friction Exit Handoffs: 91 Specifications

> **Purpose:** For every reason a chef leaves ChefFlow, define what ChefFlow does BEFORE they leave.
> The chef never leaves blind. ChefFlow prepares, assembles, and hands off. Zero friction.
>
> **Companion docs:**
>
> - `docs/research/chef-exit-points-analysis.md` (the 95 exit scenarios)
> - `docs/research/chef-never-leaves-analysis.md` (the 353 in-app workflows)
>
> **Principle:** The handoff spectrum runs from LINK (direct link to the right place) to BRIDGE (pre-assembled content the chef carries over) to AUTOMATE (ChefFlow does it, chef just approves).
>
> **Date:** 2026-05-25

---

## Handoff Levels

| Level        | What ChefFlow Does                                             | Chef Effort                 |
| ------------ | -------------------------------------------------------------- | --------------------------- |
| **LINK**     | Context-aware direct link to exact destination. No searching.  | Click and go                |
| **BRIDGE**   | Pre-assembles content, data, or context. Chef carries it over. | Copy/paste or light editing |
| **AUTOMATE** | ChefFlow handles it entirely or via API. Chef approves.        | One click or zero clicks    |
| **EMBED**    | External data pulled into ChefFlow. Chef never leaves.         | None                        |

---

## 1-10: DATA GAPS

### 1. Price is missing (ingredient not in PIE)

**Level:** BRIDGE
**Handoff:** When a chef adds an ingredient PIE doesn't cover, show a "Find Price" button that:

- Opens a search pre-filled with the ingredient name + chef's default stores
- Links directly to Instacart/Amazon Fresh search results for that item
- After chef finds price, one-click "Pin this price" saves it to PIE as a manual entry
- Remy can suggest: "I noticed you priced saffron at $12/gram last week. Want to use that?"

### 2. Price is stale (PIE has it but old)

**Level:** BRIDGE + EMBED
**Handoff:** Flag stale prices with age badge ("47 days old"). One-click "Refresh" button:

- Opens the store page for that item (direct product link if possible)
- Chef sees current price, clicks "Update to $X.XX"
- Background: PIE crawl priority queue bumps stale items chef actively uses

### 3. Price is wrong region (national average, need local)

**Level:** EMBED
**Handoff:** PIE should auto-filter to chef's zip code radius. When showing a national average, badge it "National avg" with a "Find local price" button that:

- Searches chef's preferred stores (set in profile) for that ingredient
- Direct links to those stores' websites with item pre-searched

### 4. Price is wrong tier (need wholesale, have retail)

**Level:** BRIDGE
**Handoff:** Price display shows tier badge (Retail/Wholesale). Toggle between tiers. When wholesale is missing:

- "Check wholesale" button links to chef's configured wholesale vendor portal (US Foods, Sysco, Restaurant Depot)
- Pre-searches the item name if vendor portal supports URL search params
- Chef pins wholesale price back to PIE

### 5. Seasonal availability unknown

**Level:** EMBED + LINK
**Handoff:** PIE seasonal layer shows availability calendar per ingredient per region. When data is thin:

- "Check availability" links to local farm directories, USDA seasonal produce guide
- Account-anchored: uses chef's zip to show regional growing seasons
- Badge on ingredients: "In Season", "Off Season", "Limited"

### 6. Specialty item not covered (long-tail)

**Level:** BRIDGE
**Handoff:** "Specialty Search" button opens multi-vendor search:

- Links to specialty vendor sites (spice houses, importers, ethnic markets) pre-searched
- Chef can save vendor + price as a custom source in PIE
- Over time, chef's custom sources build a personal specialty catalog

### 7. Nutritional data missing

**Level:** EMBED
**Handoff:** Integrate USDA FoodData Central API (free, public). Auto-populate macros for standard ingredients. For custom/composed dishes:

- Calculate from recipe ingredients automatically
- Show per-serving breakdown
- "Export Nutrition Label" generates print-ready label

### 8. Food safety reference missing

**Level:** EMBED
**Handoff:** Built-in food safety quick reference (static data, rarely changes):

- Safe cooking temps per protein
- Hold times (hot and cold)
- Thaw guidelines
- Cross-contamination rules
- Data source: FDA Food Code (public domain)
- Searchable, accessible from recipe view and event prep view

### 9. Substitution knowledge missing

**Level:** EMBED + AUTOMATE
**Handoff:** AI-powered substitution engine:

- Chef flags an allergy on a recipe ingredient
- ChefFlow suggests 2-3 swaps with ratio adjustments
- "Why this works" explanation (texture, flavor profile match)
- Chef approves swap, recipe updates automatically
- Learns from chef's past substitution choices

### 10. Market rate unknown

**Level:** EMBED
**Handoff:** PIE market context layer:

- "What do chefs charge for this?" based on PIE data + event type + guest count + region
- Range display: low / median / high for comparable events
- Chef's own historical pricing shown alongside
- Not prescriptive: "Here's the market. You decide."

---

## 11-29: MISSING FEATURES

### 11. No recipe scaling

**Level:** AUTOMATE
**Handoff:** Built-in recipe scaling engine:

- Slider or input: "Scale to X servings"
- Intelligent scaling (not just multiplication; knows that doubling garlic doesn't mean doubling salt)
- Flags items that don't scale linearly ("baking powder: check ratio at this volume")
- Shopping list auto-updates with scaled quantities

### 12. No unit conversion

**Level:** EMBED
**Handoff:** Built-in converter available everywhere quantities appear:

- Click any measurement to toggle units (cups/ml/oz/grams)
- Chef sets preferred unit system in profile
- Conversion happens inline, not a separate tool
- Knows density-dependent conversions (flour: 1 cup = 120g, not 236g)

### 13. No cost modeler

**Level:** AUTOMATE
**Handoff:** Menu cost modeling workspace:

- "What if I swap ribeye for strip steak?" shows instant cost delta
- Target margin slider: "I want 35% food cost" highlights items that break it
- Scenario comparison: save 2-3 menu variations with cost breakdowns
- Tied to PIE prices, updates when prices change

### 14. No calendar sync

**Level:** AUTOMATE
**Handoff:** iCal feed URL (works with Google Calendar, Apple Calendar, Outlook):

- Auto-generates from ChefFlow events
- Includes: event name, client, venue address, prep start time, service time
- Two-way sync via Google Calendar API (optional, requires auth)
- Chef subscribes once, events flow automatically forever

### 15. No mileage tracking

**Level:** BRIDGE + AUTOMATE
**Handoff:** Per-event mileage logging:

- Event detail shows distance from chef's home (auto-calculated from venue address)
- "Log trip" button records round-trip mileage
- Annual mileage export for tax prep (CSV with dates, destinations, miles)
- Could integrate with phone GPS for automatic tracking (future)

### 16. No waitlist

**Level:** AUTOMATE
**Handoff:** Client queue with waitlist status:

- When chef marks a date range as "full," new inquiries auto-queue
- Waitlist position visible to chef
- If cancellation opens a slot, ChefFlow suggests who to contact from waitlist
- Remy can auto-notify waitlisted clients: "A spot opened up for [date]"

### 17. No recurring events

**Level:** AUTOMATE
**Handoff:** Recurring event templates:

- "Repeat weekly/biweekly/monthly"
- Each instance inherits menu, client, preferences but gets its own prep checklist
- Meal prep clients: weekly template with variation tracking ("Week 12: swap chicken for fish")
- Auto-generates shopping lists per cycle

### 18. No pantry tracker

**Level:** BRIDGE
**Handoff:** Lightweight inventory:

- "I have this" checkbox on shopping list items
- Persistent pantry: staples chef always has (olive oil, salt, flour)
- Shopping list subtracts pantry items automatically
- "Running low" flag for staples

### 19. No prep timeline alerts

**Level:** AUTOMATE
**Handoff:** Event prep timeline with notifications:

- Auto-generates from recipes: "Brine turkey: 24h before" -> notification at exact time
- Push notification or email reminder
- Adjustable: chef can shift timeline
- Shows on mobile as countdown checklist

### 20. No timezone handling

**Level:** AUTOMATE
**Handoff:** Event timezone field:

- Destination events auto-detect timezone from venue address
- Prep timeline adjusts: "Start at 6 AM EST (3 AM your time PST)"
- Calendar sync includes correct timezone
- Travel day buffer suggestion: "Arrive day before?"

### 21. No label generation

**Level:** AUTOMATE
**Handoff:** Generate labels from recipe data:

- Allergen labels (auto-populated from ingredient flags)
- Nutrition facts (from USDA data integration)
- Print-ready PDF or direct-to-label-printer format
- Includes: dish name, date prepared, ingredients list, allergens bolded

### 22. No gift certificates

**Level:** AUTOMATE
**Handoff:** Gift certificate generator:

- Template tied to chef's brand (logo, colors)
- Redeemable for specific service or dollar amount
- Unique code tracked in ChefFlow
- Shareable link or printable PDF
- Redemption tracked against bookings

### 23. No staff payment tracking

**Level:** BRIDGE
**Handoff:** Per-event staff roster with payment:

- Add staff members, hours worked, agreed rate
- Calculate total + tip split
- "Pay via Venmo" button with pre-filled amount (deep link to Venmo)
- Export payment summary for tax records

### 24. No price comparison view

**Level:** EMBED
**Handoff:** PIE comparison dashboard:

- Same ingredient across all known sources (stores, vendors, wholesale)
- Sort by price, freshness of data, distance
- "Best deal" highlight
- One-click to vendor page for items chef wants to buy

### 25. No venue profiles

**Level:** BRIDGE
**Handoff:** Venue profile on event detail:

- Kitchen specs: oven type, burner count, counter space, outlet count
- Access: parking, loading dock, elevator, stairs
- Notes from past events at same venue
- Photos chef took of the kitchen
- Auto-populated from Google Places data where available; chef fills gaps

### 26. No weather on events

**Level:** EMBED
**Handoff:** Weather widget on event detail:

- Pulls forecast from free weather API (OpenWeatherMap, weather.gov)
- Shows forecast for event date + venue location
- Outdoor event flag: alerts if rain/wind/extreme temp predicted
- "Check full forecast" links to weather.com for that location + date

### 27. No map view

**Level:** EMBED + LINK
**Handoff:** Day view with map:

- All events for a day shown on map with route
- Drive time estimates between stops
- "Navigate" button opens Google Maps/Waze with the route pre-loaded
- Nearby grocery stores shown as pins (Google Places API)

### 28. No shopping list export

**Level:** BRIDGE + AUTOMATE
**Handoff:** Shopping list ready for external use:

- Organized by store section (produce, dairy, meat, dry goods)
- Exportable: share link, text message, print, or email
- Instacart integration (future): one-click "Send to Instacart" populates cart
- Checkable on mobile as chef shops

### 29. No payment status visibility

**Level:** EMBED
**Handoff:** Stripe payment status in event detail:

- Invoice status: draft, sent, viewed, paid, overdue
- Payment amount and date
- "Open in Stripe" link for detailed transaction
- Overdue alerts on dashboard and Remy nudges

---

## 30-38: CHANNEL LOCK-IN

### 30. Client texted first (iMessage)

**Level:** LINK + BRIDGE
**Handoff:** ChefFlow can't intercept SMS, but:

- Client profile shows preferred communication channel
- "Text client" button opens SMS with pre-filled message template
- After conversation, "Log conversation" quick-capture: outcome, next steps, promises made
- Remy surfaces context: "Last texted 3 days ago about the vegan menu"

### 31. Client uses WhatsApp

**Level:** LINK + BRIDGE
**Handoff:** Same pattern as SMS:

- "WhatsApp client" button opens WhatsApp chat (wa.me deep link with phone number)
- Pre-built message templates for common scenarios (booking confirm, menu share, day-before reminder)
- Conversation log capture after the fact

### 32. Client called

**Level:** BRIDGE
**Handoff:** Post-call capture:

- "Log call" button on client profile
- Quick fields: duration, topic, outcomes, next steps
- Remy can draft follow-up email summarizing call: "Per our conversation today..."
- Call history timeline on client profile

### 33. Inquiry from Thumbtack/Bark

**Level:** BRIDGE + AUTOMATE
**Handoff:** Inquiry consolidation hub:

- ChefFlow monitors connected platforms for new inquiries (API where available)
- New inquiry appears in ChefFlow inbox with source badge
- Chef responds from ChefFlow; response routes back to platform
- If API not available: email forwarding catches inquiry notifications, surfaces them in ChefFlow
- "Reply on Thumbtack" deep link opens the specific conversation

### 34. Client emailed outside Remy

**Level:** BRIDGE
**Handoff:** Remy email integration expansion:

- Forward client emails to Remy for tracking
- Or: Gmail integration surfaces client-matching emails in ChefFlow
- Thread history visible on client profile regardless of channel
- Goal: chef checks ONE inbox (ChefFlow), not three

### 35. Vendor communicates by phone/email

**Level:** BRIDGE
**Handoff:** Vendor contact card:

- Vendor profile with phone, email, account number, rep name
- "Call vendor" / "Email vendor" buttons
- Last contact date + notes
- "Next contact" reminder

### 36. Multi-vendor event coordination

**Level:** BRIDGE
**Handoff:** Event vendor roster:

- All vendors for an event listed with contact info + role
- "Email all vendors" with pre-built briefing template (event date, time, venue, access info)
- Checklist: vendor confirmed? deposit paid? setup time?
- Shared event brief PDF exportable to send to all parties

### 37. Household staff contacted directly

**Level:** BRIDGE
**Handoff:** Client profile expanded contacts:

- "Household contacts" section: house manager, nanny, PA, partner
- Each contact gets role, phone, email, notes
- "Contact [name]" buttons with deep links
- Remy knows to CC household contacts on relevant communications

### 38. Cleaning crew/dishwashers coordinate by text

**Level:** LINK + BRIDGE
**Handoff:** Event staff roster (same as #23):

- Crew members with phone numbers
- "Text crew" group message link
- Day-of checklist: who's coming, arrival time, duties
- Post-event: rate/review for future reference

---

## 39-47: TRANSACTION LIVES ELSEWHERE

### 39. Placing a vendor order

**Level:** BRIDGE
**Handoff:** Shopping list formatted for vendor:

- Export by vendor (items grouped by who supplies them)
- "Open [Vendor] portal" deep link to vendor's ordering page
- Items listed in vendor's terminology where possible
- Order confirmation: chef logs PO# back in ChefFlow for tracking

### 40. Buying groceries

**Level:** BRIDGE + AUTOMATE
**Handoff:** Shopping list optimized for store trips:

- Organized by store section
- Quantities scaled, units converted to store packaging
- "Send to Instacart" (API integration) or "Share as list" (text/email to self)
- Store preference per item: "Get butter at Costco, herbs at farmers market"

### 41. Buying equipment

**Level:** LINK
**Handoff:** Equipment needs surface contextually:

- Recipe calls for immersion circulator chef doesn't own -> "Need equipment?" link
- Equipment checklist per event type (standard kit vs. large event kit)
- "Buy on Amazon" / "Buy on WebstaurantStore" search links pre-filled with item

### 42. Renting equipment

**Level:** BRIDGE
**Handoff:** Event equipment checklist:

- Template per event size (intimate dinner vs. 100-person reception)
- Rental vendor contacts stored in profile
- "Request quote" email template pre-filled with event details + equipment list
- Cost tracked on event P&L

### 43. Booking travel

**Level:** BRIDGE
**Handoff:** Destination event travel section:

- Travel checklist: flight, hotel, car rental, shipping equipment
- "Search flights" link to Google Flights with dates + destination pre-filled
- Travel costs tracked on event P&L
- Packing checklist for traveling chef (customizable template)

### 44. Paying informal (Venmo/Zelle)

**Level:** LINK + BRIDGE
**Handoff:** Payment logging:

- "Log informal payment" on invoice/event
- "Send Venmo request" deep link with amount pre-filled
- Payment shows in financial records even though it bypassed Stripe
- Receipt: chef can attach screenshot of Venmo confirmation

### 45. Renting commissary kitchen

**Level:** LINK
**Handoff:** Commissary profile:

- Saved commissary locations with address, rates, availability contact
- "Book time" link to commissary's booking system
- Kitchen specs stored (same venue profile pattern as #25)
- Cost tracked in overhead expenses

### 46. Hiring photographer

**Level:** BRIDGE
**Handoff:** Event vendor roster (photographer slot):

- Saved photographer contacts with portfolio links
- "Hire for this event" email template with event brief
- Cost tracked on event P&L
- Photo delivery: link to shared album stored on event

### 47. Sending thank-you gifts

**Level:** BRIDGE
**Handoff:** Client retention prompts:

- Post-event: Remy suggests "Send a thank-you to [client]?"
- Gift ideas based on client profile (wine lover, has kids, dietary preferences)
- "Order on Amazon" link or "Send flowers" link to local florist
- Gift logged on client timeline

---

## 48-60: EXTERNAL PLATFORM OWNS THE DATA

### 48. Client's social media

**Level:** LINK + BRIDGE
**Handoff:** Client profile social links:

- Fields for Instagram, Facebook, LinkedIn handles
- "View profile" deep links
- "Client research notes" free-text field for what chef discovered
- Pre-consultation checklist: "Review client's Instagram for style preferences"

### 49. Client's company info

**Level:** LINK + BRIDGE
**Handoff:** Corporate client section:

- Company name, website, industry, size
- "View company" link to website/LinkedIn
- Event context notes: "Annual holiday party, ~80 employees, casual vibe"
- Past corporate events for same company linked

### 50. Venue's kitchen capabilities

**Level:** BRIDGE
**Handoff:** Venue profile (same as #25):

- Pre-event: "Contact venue about kitchen" email template
- Questions checklist: oven count, burner type, outlet amps, counter space, water access, trash disposal
- Photos: chef uploads venue kitchen photos for future reference
- Shared across all chefs who use ChefFlow (anonymized, opt-in)

### 51. Vendor's full catalog

**Level:** LINK
**Handoff:** Vendor profile with catalog link:

- "Browse catalog" deep link to vendor's website
- Chef's favorite items from this vendor (bookmarked)
- Last order history if logged
- "New items" flag if vendor has a new products page

### 52. Order tracking

**Level:** LINK + EMBED
**Handoff:** Order tracking on event detail:

- Chef logs tracking numbers per order
- "Track shipment" deep link to carrier (auto-detects FedEx/UPS/USPS from tracking format)
- Status badge: ordered, shipped, delivered
- Alert if delivery date is after event date (critical warning)

### 53. Competitor offerings

**Level:** LINK
**Handoff:** Market research section (optional, toggle-able):

- Chef saves competitor profiles for reference
- "View their site" links
- Notes field: "They charge $75/head for similar dinner"
- Not prescriptive, just a notebook

### 54. Trending cuisines/food trends

**Level:** EMBED
**Handoff:** Industry news feed (toggle-able dashboard widget):

- Headlines from Eater, Food & Wine, Bon Appetit, local food media
- RSS/API aggregation, refreshed daily
- "Read more" deep link to the article
- Filter by: region, cuisine type, trend category
- Chef picks sources they care about; ignores the rest

### 55. Real-time traffic

**Level:** LINK
**Handoff:** Event detail "Navigate" button:

- Opens Google Maps/Waze with destination pre-loaded
- Departure time suggestion: "Leave by 2:30 PM to arrive by 3:00 PM" (based on typical traffic)
- Day-of notification: "Time to leave for the Smith dinner"

### 56. Real-time weather

**Level:** EMBED
**Handoff:** Weather on every relevant surface:

- Event detail: forecast for event date + location
- Calendar day view: weather icon per day
- Outdoor event alert: rain/wind/extreme temp warning
- "Full forecast" deep link to weather.com or weather.gov for that location
- API: OpenWeatherMap free tier or weather.gov (no cost)

### 57. Nearby stores

**Level:** EMBED + LINK
**Handoff:** Contextual nearby search:

- Event detail: "Stores near venue" shows grocery stores within 5 miles
- Map pins with store name, distance, hours
- "Get directions" deep link to Google Maps
- Filter: grocery, specialty, wholesale
- API: Google Places (or free alternative)

### 58. Farm/market schedules

**Level:** BRIDGE
**Handoff:** Vendor directory with farm focus:

- Local farms and farmers markets saved with days/hours, location, specialties
- Seasonal calendar: "Hayfield Farm: tomatoes Aug-Oct, greens Apr-Jun"
- "View website" deep link
- Event context: "This event is near [farm], check availability"

### 59. Wine/beverage pairing references

**Level:** LINK + BRIDGE
**Handoff:** Menu pairing notes:

- Per menu item: pairing suggestion field
- "Search pairings" link to Vivino, Wine Spectator, or distributor
- Chef saves pairing notes: "2022 Sancerre worked great with the halibut"
- Client-facing: pairing suggestions can appear on menu PDF

### 60. Venue parking/loading logistics

**Level:** BRIDGE
**Handoff:** Venue profile logistics section (same as #25):

- Parking: street, lot, valet, loading zone
- Loading: dock, elevator, stairs, entrance code
- "View on Street View" deep link (Google Maps URL with venue coordinates)
- Chef's notes from past visits: "Use the side entrance, ring buzzer #3"

---

## 61-67: GOVERNMENT/LEGAL GATEKEEPING

### 61. Food handler's license renewal

**Level:** LINK + AUTOMATE
**Handoff:** License tracker in chef profile:

- Expiration date stored; reminder 60/30/7 days before
- "Renew now" deep link to state/county health department portal
- Account-anchored: knows chef's state, links to correct portal
- Stores license number and scan of certificate

### 62. Cottage food / home kitchen law lookup

**Level:** EMBED + LINK
**Handoff:** Regulatory reference library:

- State-by-state cottage food law summary (curated, reviewed annually)
- Chef's state auto-selected from account location
- "View full law" deep link to state government page
- Key limits highlighted: revenue cap, allowed foods, labeling requirements
- Disclaimer: "Verify with your local authority. Laws change."

### 63. Business license/permits

**Level:** LINK + BRIDGE
**Handoff:** Business compliance checklist:

- Common permits listed by state/city (business license, food establishment permit, catering permit)
- "Apply/renew" deep link to city/county portal
- Expiration tracking with reminders
- Event-specific: "This venue requires a temporary food permit" flag

### 64. Venue liability waivers

**Level:** BRIDGE
**Handoff:** Document storage on event:

- Upload signed waivers, certificates of insurance
- "Venue requires: [list]" checklist auto-generated from venue profile
- Template: standard certificate of insurance request letter
- Stored permanently for legal records

### 65. Health inspection records

**Level:** BRIDGE
**Handoff:** Inspection log in chef profile:

- Date, result, inspector notes, follow-up items
- Upload inspection report
- "Next inspection" date with reminder
- Corrective action checklist if issues flagged

### 66. Insurance management

**Level:** LINK + BRIDGE
**Handoff:** Insurance tracker:

- Policy number, carrier, coverage amount, expiration
- "Manage policy" link to carrier portal
- Renewal reminder 60/30 days before expiration
- Quick-share: "Send proof of insurance" generates email to venue/client with attached certificate

### 67. Lawyer consultation

**Level:** BRIDGE
**Handoff:** Legal contact card:

- Attorney name, firm, phone, email, specialty
- "Call lawyer" / "Email lawyer" deep links
- Document storage: contracts, dispute records
- Context notes: "Last consulted about [topic] on [date]"

---

## 68-71: TAX & FINANCIAL SYSTEMS

### 68. Bank reconciliation

**Level:** BRIDGE
**Handoff:** Financial export + bank quick-access:

- "Open bank" button on finance page (chef configures bank URL in settings, one-time setup)
- Export: all ChefFlow transactions for a date range (CSV, matches common bank import formats)
- Reconciliation view: ChefFlow invoices vs. payments received, highlights discrepancies
- Monthly summary: revenue, expenses, outstanding invoices, exportable for bookkeeper

### 69. Tax prep / quarterly estimates

**Level:** BRIDGE
**Handoff:** Tax prep export package:

- Annual P&L summary
- Mileage log (from #15)
- Equipment purchases
- Ingredient/supply expenses by category
- 1099-reportable payments to staff
- "Send to accountant" bundles everything as PDF + CSV zip
- Quarterly estimate helper: projects tax based on YTD revenue

### 70. Accountant communication

**Level:** BRIDGE
**Handoff:** Accountant contact card (same pattern as #67):

- Stored contact info with "Email accountant" deep link
- "Share financial summary" button sends the export from #69
- Monthly: "Send update to accountant?" prompt

### 71. Expense categorization

**Level:** EMBED
**Handoff:** Built-in expense categories matching IRS Schedule C:

- Auto-categorize from shopping lists and vendor payments
- Categories: ingredients, supplies, equipment, travel, insurance, marketing, professional services
- Override: chef can re-categorize any expense
- Export categories match common tax software import formats

---

## 72-76: CREATIVE PROCESS

### 72. Recipe/technique lookup

**Level:** LINK
**Handoff:** Contextual "Learn more" on recipes:

- Recipe view: "Watch technique" link searches YouTube for the key technique
- "Read about this" link searches Serious Eats / ChefSteps
- Chef's own technique notes field per recipe
- Not trying to be a culinary school; just a launchpad

### 73. Menu inspiration

**Level:** BRIDGE
**Handoff:** Inspiration clipboard:

- "Save inspiration" button: paste a URL, upload a photo, or write a note
- Tagged by cuisine, season, occasion, client
- When building a new menu: "Your saved inspiration" panel
- Shareable: "Show client this inspiration" via portal

### 74. Unfamiliar cuisine research

**Level:** LINK
**Handoff:** Cuisine research launchpad:

- When chef creates menu with a cuisine tag they haven't used before:
  "New to Thai cuisine? Here are resources:"
- Curated links per cuisine (YouTube channels, food blogs, key cookbooks)
- Community-contributed (future): other chefs' recommended resources

### 75. Seating/layout ideas

**Level:** LINK
**Handoff:** Event planning resources:

- Event detail: "Layout inspiration" link to Pinterest board search
- Template diagrams for common setups (cocktail, plated, buffet, family-style)
- Chef's own layout notes + photos from past events

### 76. Photo editing

**Level:** LINK
**Handoff:** Photo workflow:

- After uploading event photos: "Edit in [app]" link (Lightroom, Snapseed)
- Or: basic crop/filter built into ChefFlow (lightweight, not a replacement)
- Edited photos stored on event + available for social media handoff (#77)

---

## 77-83: MARKETING

### 77. Posting to social media

**Level:** AUTOMATE
**Handoff:** Full social media handoff system. This is the GOLD STANDARD pattern.

**Content Assembly Engine:**

- ChefFlow knows: recent events, menus served, food photos uploaded, client testimonials (approved), seasonal specialties
- Generates post-ready content: caption, hashtags, tags, photo selection
- Multiple post types:
  - "Behind the scenes" (prep photos)
  - "Just served" (plated dishes)
  - "Menu drop" (upcoming event teaser)
  - "Available dates" (booking prompt)
  - "Seasonal feature" (ingredient spotlight)
  - "Event recap" (post-event highlight reel)
  - "Ticket sale" (event promotion with booking link)

**Posting Goal Tracker:**

- Chef sets target: "5 posts per week"
- Dashboard: "3/5 this week. Here are 2 ready-to-post suggestions."
- Content calendar: suggested post schedule with drafts

**Cross-Platform Assembly:**

- Instagram: square crop, caption with hashtags, alt text
- Facebook: landscape crop, longer caption, event link
- TikTok: vertical crop suggestion, trending audio hint
- Each platform's post optimized for that platform's algorithm

**One-Click Handoff:**

- "Post to Instagram" opens Instagram app with image copied to clipboard and caption ready to paste
- Or: API integration (Instagram Graph API, Facebook Pages API) for direct publishing
- "Post to all" queues cross-platform posts
- Chef reviews, edits if wanted, approves

**SEO/Discoverability:**

- Location tags auto-populated from event venue
- Hashtag suggestions based on cuisine, location, trending tags
- @mention suggestions for venue, vendors, collaborators

### 78. Scheduling social posts

**Level:** AUTOMATE
**Handoff:** Built into #77's content calendar:

- Draft posts scheduled for future dates
- Auto-post if chef has connected APIs
- Or: notification at scheduled time "Time to post!" with content ready

### 79. Google Business Profile

**Level:** BRIDGE
**Handoff:** Google Business reminder system:

- "Update your Google Business Profile" periodic prompt
- Pre-assembled: new photos from recent events, updated service description
- "Open Google Business" deep link to dashboard
- "Add photos" link goes directly to photo upload

### 80. Review responses

**Level:** BRIDGE + AUTOMATE
**Handoff:** Review monitoring:

- Aggregate Yelp + Google reviews in ChefFlow (API or scrape notifications)
- New review alert with suggested response (Remy drafts it)
- "Reply on Yelp" / "Reply on Google" deep link to the specific review
- Response tone matches chef's voice (learned from past responses)

### 81. Personal website updates

**Level:** BRIDGE
**Handoff:** Content export for website:

- "Export for website" packages: bio, service descriptions, menu samples, photos, testimonials
- Formatted for common platforms (Squarespace, Wix, WordPress)
- "Your website is X months out of date" reminder
- ChefFlow profile page could serve as a lightweight website replacement

### 82. Marketing materials

**Level:** BRIDGE
**Handoff:** Content for design tools:

- Export branded content: logo, color palette, service list, menu, photos
- "Create in Canva" deep link with brand kit context
- Template suggestions: business card, flyer, social graphic
- "Download brand assets" zip file

### 83. Running ads

**Level:** BRIDGE
**Handoff:** Ad content helper:

- Target audience suggestion based on client demographics
- Ad copy drafts (Remy generates)
- "Create ad on Facebook" / "Create ad on Google" deep links
- Ad spend tracked in ChefFlow financials
- ROI tracking: "You spent $X on ads, got Y inquiries"

---

## 84-87: PROFESSIONAL GROWTH

### 84. Online courses/certifications

**Level:** BRIDGE
**Handoff:** Professional development tracker:

- Certifications with expiration dates and renewal reminders
- Courses completed (log for own records)
- "Find courses" curated links by specialty
- Required certifications flagged: "Your ServSafe expires in 45 days"

### 85. Industry news

**Level:** EMBED
**Handoff:** News feed widget (same as #54):

- Headlines from chef-selected sources
- Daily refresh
- "Read more" deep link to article
- Toggle on/off per source
- Category filter: trends, openings, regulations, events, local scene
- Does not require subscriptions: uses RSS feeds, free article previews, and summarized headlines

### 86. Networking with other chefs

**Level:** LINK
**Handoff:** Professional contacts:

- "Chef network" contacts section (separate from clients/vendors)
- Specialty, location, availability for sub work
- "Message on Instagram" deep link
- "Available for sub work" flag searchable

### 87. Finding a sous chef/assistant

**Level:** BRIDGE
**Handoff:** Trusted staff roster:

- Saved assistants with skills, rate, availability, reliability rating
- "Contact [name]" deep links (text, call, email)
- Event staffing: "You used [name] for the last 3 events. Book again?"
- Staff availability calendar (if they share it)

---

## 88-91: THE KITCHEN BOUNDARY

### 88. Multiple concurrent timers

**Level:** LINK
**Handoff:** Timer awareness, not replacement:

- Prep timeline shows what needs timing during service
- "Set timers" summary: printable card with all timing-critical items
- "Hey Siri/Alexa" voice command suggestions for each timer
- ChefFlow is not a timer app. The handoff is giving chef a clear list of what to time.

### 89. Quick recipe glance mid-cook

**Level:** EMBED
**Handoff:** Mobile-optimized recipe view:

- "Cook mode" toggle: huge text, high contrast, minimal UI
- Key info only: ingredient list, current step, temps, times
- Swipe between steps (no scrolling through full recipe)
- Screen stays on (prevents phone from sleeping)
- Voice-readable: "Hey Siri, read my recipe" (future, via Shortcuts integration)

### 90. Music/ambiance

**Level:** LINK
**Handoff:** Minimal:

- Event detail: "Ambiance notes" field ("Client likes jazz, play the dinner party playlist")
- "Open Spotify" link
- This is firmly outside ChefFlow's domain

### 91. The actual cooking

**Level:** N/A
**Handoff:** ChefFlow's job is done when the chef picks up the knife.

- Everything before this moment: planned, costed, prepped, communicated, tracked
- Everything after: the craft. Not software's domain.
- ChefFlow succeeds when the chef can focus entirely on cooking because everything else is handled.

---

## Summary: Handoff Coverage

| Level        | Count | What It Means                                                    |
| ------------ | ----- | ---------------------------------------------------------------- |
| **AUTOMATE** | 19    | ChefFlow does it. Chef approves or it's invisible.               |
| **EMBED**    | 18    | Data pulled into ChefFlow. Chef never leaves.                    |
| **BRIDGE**   | 38    | Content pre-assembled. Chef carries it over with minimal effort. |
| **LINK**     | 15    | Context-aware direct link. One click to the right place.         |
| **N/A**      | 1     | The actual cooking. ChefFlow's boundary.                         |

**Zero exits should be blind.** Every single one gets at minimum a contextual deep link. Most get pre-assembled content. The best ones disappear entirely.

---

## The Social Media Model (Template for ALL Handoffs)

The social media handoff (#77) is the gold standard pattern. It demonstrates:

1. **ChefFlow knows the context** (recent events, photos, menus)
2. **ChefFlow assembles the content** (caption, hashtags, image, optimization per platform)
3. **ChefFlow sets a goal** (5 posts/week, tracks progress)
4. **ChefFlow hands off with zero friction** (one click, content ready, or fully automated via API)
5. **ChefFlow learns** (which posts perform, what content chef prefers)

Apply this pattern everywhere. The question for every exit is:

- What does ChefFlow already know that's relevant?
- What can ChefFlow pre-assemble?
- What goal can ChefFlow help the chef hit?
- How close to one-click can the handoff get?
- Can ChefFlow learn from the outcome?

---

_91 exits. 0 blind. Every departure is a prepared handoff._
_The chef never searches, never starts from scratch, never leaves without a launchpad._
