# Exit Link Registry: 91 Contextual Links

> Every exit scenario = a direct link with all context pre-filled.
> Chef clicks once, arrives at the exact right place. No searching, no typing, no friction.
>
> **Architecture:** `lib/exit-links/registry.ts` exports `getExitLink(id, context) => { url, label, icon }`
> Each link uses the best available context from ChefFlow (ingredient name, venue address, client phone, event date, etc.)

---

## 1-10: DATA GAPS

| #   | Link Label                         | URL Template                                                                                                             | Context Pre-filled                                            |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| 1   | "Search [ingredient] on Instacart" | `https://www.instacart.com/store/search/{ingredient}`                                                                    | ingredient name, also links for Amazon Fresh, Google Shopping |
| 2   | "Check current price"              | `https://www.instacart.com/store/search/{ingredient}`                                                                    | ingredient name + last known store                            |
| 3   | "Find local price"                 | `https://www.instacart.com/store/search/{ingredient}?zipCode={zip}`                                                      | ingredient + chef's zip code                                  |
| 4   | "Check wholesale"                  | `https://www.usfoods.com/search.html?q={ingredient}` OR Sysco/Restaurant Depot URL from chef profile                     | ingredient name + chef's vendor portal preference             |
| 5   | "Check seasonal availability"      | `https://snaped.fns.usda.gov/seasonal-produce-guide` + `https://www.localharvest.org/search.jsp?jmp&lat={lat}&lon={lon}` | chef's location coordinates                                   |
| 6   | "Search specialty vendors"         | `https://www.google.com/search?q={ingredient}+buy+online+specialty` + configured specialty vendor URLs                   | ingredient name                                               |
| 7   | "USDA Nutrition Lookup"            | `https://fdc.nal.usda.gov/search?query={ingredient}`                                                                     | ingredient name                                               |
| 8   | "FDA Food Safety"                  | `https://www.fda.gov/food/buy-store-serve-safe-food/safe-minimum-cooking-temperatures-chart`                             | static link (also embed data locally)                         |
| 9   | "Find substitution"                | `https://www.google.com/search?q={ingredient}+substitute+for+{allergy}`                                                  | ingredient name + specific allergy                            |
| 10  | "Market rate research"             | `https://www.thumbtack.com/k/personal-chefs/near-me/` + `https://www.bark.com/en/us/personal-chef/`                      | chef's zip code area                                          |

---

## 11-29: MISSING FEATURES (these are internal features, not external links - build in-app)

| #   | What to Build                  | Link If External                                                                                               |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 11  | Recipe scaling engine (in-app) | N/A - internal feature                                                                                         |
| 12  | Unit converter (in-app)        | N/A - internal feature                                                                                         |
| 13  | Cost modeler (in-app)          | N/A - internal feature                                                                                         |
| 14  | Calendar sync                  | `webcal://{host}/api/calendar/{userId}.ics` - generate iCal feed URL                                           |
| 15  | Mileage tracking               | In-app logger + `https://www.google.com/maps/dir/{homeAddress}/{venueAddress}` for distance                    |
| 16  | Waitlist                       | In-app feature                                                                                                 |
| 17  | Recurring events               | In-app feature                                                                                                 |
| 18  | Pantry tracker                 | In-app feature                                                                                                 |
| 19  | Prep timeline alerts           | In-app notifications                                                                                           |
| 20  | Timezone handling              | In-app feature                                                                                                 |
| 21  | Label generation               | In-app PDF generator                                                                                           |
| 22  | Gift certificates              | In-app generator                                                                                               |
| 23  | Staff payment                  | "Pay via Venmo" -> `https://venmo.com/?txn=pay&recipients={staffPhone}&amount={amount}&note=Event+{eventName}` |
| 24  | Price comparison               | In-app PIE dashboard                                                                                           |
| 25  | Venue profiles                 | In-app + "View on Maps" -> `https://www.google.com/maps/search/?api=1&query={venueAddress}`                    |
| 26  | Weather on events              | `https://forecast.weather.gov/MapClick.php?lat={lat}&lon={lon}` embedded + "Full forecast" link                |
| 27  | Map view                       | `https://www.google.com/maps/dir/{stop1}/{stop2}/{stop3}` for multi-stop route                                 |
| 28  | Shopping list export           | In-app + "Send to Instacart" -> `https://www.instacart.com/store` (clipboard pre-loaded)                       |
| 29  | Payment status                 | "View in Stripe" -> `https://dashboard.stripe.com/payments/{paymentId}`                                        |

---

## 30-38: CHANNEL LOCK-IN

| #   | Link Label                         | URL Template                                                                                      | Context Pre-filled                                                                 |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 30  | "Text [client]"                    | `sms:{phoneNumber}?body={prefilledMessage}`                                                       | client phone + context message ("Hi {name}, regarding your {eventDate} dinner...") |
| 31  | "WhatsApp [client]"                | `https://wa.me/{phoneNumber}?text={prefilledMessage}`                                             | client phone (international format) + context message                              |
| 32  | "Call [client]"                    | `tel:{phoneNumber}`                                                                               | client phone number                                                                |
| 33  | "Reply on Thumbtack"               | `https://www.thumbtack.com/messages` + "Reply on Bark" -> `https://www.bark.com/en/us/dashboard/` | deep link to message thread if available                                           |
| 34  | "Open Gmail"                       | `https://mail.google.com/mail/u/0/#search/from:{clientEmail}`                                     | client email address                                                               |
| 35  | "Call [vendor]" / "Email [vendor]" | `tel:{vendorPhone}` / `mailto:{vendorEmail}?subject=Order+for+{eventDate}&body={itemList}`        | vendor contact + event context + item list                                         |
| 36  | "Email all vendors"                | `mailto:{vendor1},{vendor2},{vendor3}?subject=Event+Brief+-+{eventDate}&body={eventBrief}`        | all vendor emails + pre-assembled event brief                                      |
| 37  | "Contact [household member]"       | `tel:{phone}` / `mailto:{email}` / `sms:{phone}`                                                  | household contact from client profile                                              |
| 38  | "Text crew"                        | `sms:{phone1},{phone2},{phone3}?body={dayOfBrief}`                                                | all crew phones + day-of brief                                                     |

---

## 39-47: TRANSACTION LIVES ELSEWHERE

| #   | Link Label                | URL Template                                                                              | Context Pre-filled                                      |
| --- | ------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 39  | "Order from [vendor]"     | Vendor portal URL from profile + search param if supported                                | item list for that vendor                               |
| 40  | "Shop on Instacart"       | `https://www.instacart.com/store/search/{firstItem}`                                      | first item from shopping list (clipboard has full list) |
| 40b | "Shop on Amazon Fresh"    | `https://www.amazon.com/s?k={ingredient}&i=amazonfresh`                                   | ingredient from list                                    |
| 41  | "Buy on Amazon"           | `https://www.amazon.com/s?k={equipmentItem}`                                              | equipment name                                          |
| 41b | "Buy on WebstaurantStore" | `https://www.webstaurantstore.com/search/{equipmentItem}.html`                            | equipment name                                          |
| 42  | "Request rental quote"    | `mailto:{rentalVendorEmail}?subject=Equipment+Rental+{eventDate}&body={equipmentList}`    | vendor email + event date + equipment list              |
| 43  | "Search flights"          | `https://www.google.com/travel/flights?q=Flights+to+{venueCity}+on+{eventDate}`           | venue city + event date                                 |
| 43b | "Search hotels"           | `https://www.google.com/travel/hotels/{venueCity}?dates={checkIn},{checkOut}`             | venue city + dates                                      |
| 44  | "Send Venmo request"      | `https://venmo.com/?txn=charge&recipients={clientPhone}&amount={amount}&note={eventName}` | client phone + invoice amount + event name              |
| 44b | "Send Zelle"              | (bank app deep link) + amount + recipient info displayed for manual entry                 | amount + client info                                    |
| 45  | "Book commissary"         | Commissary booking URL from profile                                                       | link to saved commissary's booking system               |
| 46  | "Hire photographer"       | `mailto:{photographerEmail}?subject=Photography+{eventDate}&body={eventBrief}`            | photographer email + event brief                        |
| 47  | "Send flowers"            | `https://www.google.com/search?q=flower+delivery+near+{clientZip}`                        | client zip code                                         |
| 47b | "Send gift on Amazon"     | `https://www.amazon.com/s?k={giftIdea}`                                                   | gift suggestion based on client profile                 |

---

## 48-60: EXTERNAL PLATFORM OWNS DATA

| #   | Link Label                    | URL Template                                                                                                                                                                                     | Context Pre-filled                              |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| 48  | "View Instagram"              | `https://instagram.com/{handle}`                                                                                                                                                                 | client's Instagram handle from profile          |
| 48b | "View Facebook"               | `https://facebook.com/{handle}`                                                                                                                                                                  | client's Facebook                               |
| 48c | "View LinkedIn"               | `https://linkedin.com/in/{handle}`                                                                                                                                                               | client's LinkedIn                               |
| 49  | "View company"                | `{companyWebsite}` OR `https://www.google.com/search?q={companyName}`                                                                                                                            | company name/URL from client profile            |
| 50  | "Email venue about kitchen"   | `mailto:{venueEmail}?subject=Kitchen+Details+for+{eventDate}&body={kitchenQuestionnaire}`                                                                                                        | venue email + pre-written kitchen questionnaire |
| 51  | "Browse [vendor] catalog"     | `{vendorWebsiteUrl}`                                                                                                                                                                             | vendor URL from vendor profile                  |
| 52  | "Track shipment"              | Auto-detect carrier: `https://www.fedex.com/fedextrack/?trknbr={tracking}` / `https://www.ups.com/track?tracknum={tracking}` / `https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking}` | tracking number + auto-detected carrier         |
| 53  | "View competitor"             | `{competitorUrl}`                                                                                                                                                                                | competitor website from saved profile           |
| 54  | "Read on Eater"               | `https://www.eater.com` / `https://www.bonappetit.com` / `https://www.foodandwine.com`                                                                                                           | chef's selected sources                         |
| 55  | "Navigate to venue"           | `https://www.google.com/maps/dir/?api=1&origin={homeAddress}&destination={venueAddress}&travelmode=driving`                                                                                      | chef home address + venue address               |
| 55b | "Navigate (Waze)"             | `https://waze.com/ul?ll={venueLat},{venueLon}&navigate=yes`                                                                                                                                      | venue coordinates                               |
| 56  | "Full weather forecast"       | `https://weather.com/weather/tenday/l/{venueZip}` OR `https://forecast.weather.gov/MapClick.php?lat={lat}&lon={lon}`                                                                             | venue zip/coordinates + event date              |
| 57  | "Grocery stores near venue"   | `https://www.google.com/maps/search/grocery+store/@{venueLat},{venueLon},14z`                                                                                                                    | venue coordinates                               |
| 57b | "Specialty stores near venue" | `https://www.google.com/maps/search/specialty+food+store/@{venueLat},{venueLon},14z`                                                                                                             | venue coordinates                               |
| 58  | "Farmers markets near venue"  | `https://www.localharvest.org/search.jsp?jmp&lat={venueLat}&lon={venueLon}`                                                                                                                      | venue coordinates                               |
| 59  | "Search wine pairings"        | `https://www.vivino.com/search/wines?q={dishName}+pairing` OR `https://www.google.com/search?q=wine+pairing+{dishName}`                                                                          | dish name from menu                             |
| 60  | "Street View of venue"        | `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint={venueLat},{venueLon}`                                                                                                            | venue coordinates                               |

---

## 61-67: GOVERNMENT/LEGAL

| #   | Link Label                     | URL Template                                                                                                                        | Context Pre-filled                   |
| --- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 61  | "Renew food handler's license" | State-specific URL from lookup table (e.g., MA: `https://www.mass.gov/how-to/apply-for-a-food-establishment-permit`)                | chef's state from account profile    |
| 62  | "View cottage food laws"       | State-specific: `https://foodpreneurs.com/cottage-food-laws/{state}/` OR `https://www.google.com/search?q={state}+cottage+food+law` | chef's state                         |
| 63  | "Apply for business license"   | `https://www.google.com/search?q={city}+{state}+business+license+application+food`                                                  | chef's city + state                  |
| 64  | "Download insurance template"  | In-app template + "Get insurance quote" -> `https://www.google.com/search?q=food+service+liability+insurance+{state}`               | chef's state                         |
| 65  | "Schedule health inspection"   | `https://www.google.com/search?q={county}+{state}+health+department+food+inspection`                                                | chef's county + state                |
| 66  | "Manage insurance policy"      | `{insuranceCarrierPortalUrl}`                                                                                                       | carrier portal URL from chef profile |
| 67  | "Contact lawyer"               | `tel:{lawyerPhone}` / `mailto:{lawyerEmail}`                                                                                        | lawyer contact from chef profile     |

---

## 68-71: TAX & FINANCIAL

| #   | Link Label                        | URL Template                                                                                   | Context Pre-filled                       |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 68  | "Open bank"                       | `{bankPortalUrl}`                                                                              | bank URL configured once in settings     |
| 69  | "Email tax package to accountant" | `mailto:{accountantEmail}?subject=Tax+Documents+{year}&body=Attached+are+my+financial+records` | accountant email + auto-attached exports |
| 70  | "Email accountant"                | `mailto:{accountantEmail}?subject=Monthly+Update+-+{month}+{year}`                             | accountant email from profile            |
| 71  | N/A                               | In-app expense categorization (IRS Schedule C)                                                 | N/A                                      |

---

## 72-76: CREATIVE PROCESS

| #   | Link Label                   | URL Template                                                                                                               | Context Pre-filled                              |
| --- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 72  | "Watch technique on YouTube" | `https://www.youtube.com/results?search_query={techniqueName}+cooking+technique`                                           | technique name from recipe                      |
| 72b | "Read on Serious Eats"       | `https://www.seriouseats.com/search?q={techniqueName}`                                                                     | technique name                                  |
| 73  | "Save inspiration"           | In-app clipboard (URL paste, photo upload, notes)                                                                          | N/A                                             |
| 74  | "Research [cuisine] cuisine" | `https://www.youtube.com/results?search_query={cuisine}+cooking+basics` + `https://www.seriouseats.com/search?q={cuisine}` | cuisine tag from menu                           |
| 75  | "Layout ideas on Pinterest"  | `https://www.pinterest.com/search/pins/?q={eventType}+dinner+table+layout`                                                 | event type (intimate, cocktail, buffet, plated) |
| 76  | "Edit photos"                | `https://www.canva.com/photo-editor/` OR system deep link to Lightroom/Snapseed                                            | photo from event gallery                        |

---

## 77-83: MARKETING

| #   | Link Label               | URL Template                                                                                        | Context Pre-filled                        |
| --- | ------------------------ | --------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 77  | "Post to Instagram"      | `https://www.instagram.com/` (clipboard loaded with caption + hashtags, image saved to camera roll) | AI-generated caption, hashtags, image     |
| 77b | "Post to Facebook"       | `https://www.facebook.com/composer/` OR `https://business.facebook.com/`                            | same content adapted for FB               |
| 77c | "Post to TikTok"         | `https://www.tiktok.com/upload`                                                                     | vertical image + caption                  |
| 78  | "Schedule post"          | In-app content calendar (or link to Buffer/Later if connected)                                      | draft post with date                      |
| 79  | "Update Google Business" | `https://business.google.com/`                                                                      | pre-assembled photos + description update |
| 79b | "Add photos to Google"   | `https://business.google.com/photos`                                                                | new event photos ready                    |
| 80  | "Reply on Yelp"          | `https://biz.yelp.com/`                                                                             | Remy-drafted response in clipboard        |
| 80b | "Reply on Google"        | `https://business.google.com/reviews`                                                               | Remy-drafted response in clipboard        |
| 81  | "Update website"         | `{chefWebsiteAdmin}` (Squarespace/Wix/WordPress admin URL from profile)                             | export package ready                      |
| 82  | "Create in Canva"        | `https://www.canva.com/design/create?type=poster`                                                   | brand assets downloadable                 |
| 83  | "Create Facebook Ad"     | `https://www.facebook.com/adsmanager/create`                                                        | ad copy from Remy in clipboard            |
| 83b | "Create Google Ad"       | `https://ads.google.com/aw/campaigns/new`                                                           | ad copy in clipboard                      |

---

## 84-87: PROFESSIONAL GROWTH

| #   | Link Label                    | URL Template                                                                     | Context Pre-filled              |
| --- | ----------------------------- | -------------------------------------------------------------------------------- | ------------------------------- |
| 84  | "Renew ServSafe"              | `https://www.servsafe.com/ServSafe-Manager/Get-Certified`                        | reminder with expiry date       |
| 84b | "Find courses"                | `https://www.google.com/search?q={specialty}+cooking+certification+course`       | chef's specialty                |
| 85  | "Read [source]"               | RSS feed links (Eater, Food & Wine, Bon Appetit, local)                          | chef-selected sources           |
| 86  | "Message [chef] on Instagram" | `https://instagram.com/{chefHandle}`                                             | chef contact's Instagram handle |
| 87  | "Contact [assistant]"         | `tel:{phone}` / `sms:{phone}?body=Available+for+{eventDate}?` / `mailto:{email}` | assistant contact + event date  |

---

## 88-91: KITCHEN BOUNDARY

| #   | Link Label          | URL Template                                                       | Context Pre-filled                              |
| --- | ------------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| 88  | "Set timer (Siri)"  | `shortcuts://run-shortcut?name=Timer&input={minutes}`              | minutes from prep timeline                      |
| 88b | "Set timer (Alexa)" | Display: "Alexa, set a timer for {minutes} minutes for {dishName}" | voice command text ready to read                |
| 89  | Cook Mode           | In-app (large text, high contrast, swipe steps, screen stays on)   | N/A                                             |
| 90  | "Open Spotify"      | `https://open.spotify.com/search/{ambianceNote}`                   | ambiance notes from event ("jazz dinner party") |
| 91  | N/A                 | ChefFlow's boundary. Chef picks up knife. Job done.                | N/A                                             |

---

## Implementation

### Architecture

```
lib/exit-links/
  registry.ts        -- ExitLink[] with id, urlTemplate, contextKeys, label, icon, category
  generate-link.ts   -- getExitLink(id, context) => { url, label, icon, newTab: true }
  context-helpers.ts -- extractors: getChefZip(), getVenueCoords(), getClientPhone(), etc.

components/exit-links/
  ExitLinkButton.tsx  -- renders a single contextual link button
  ExitLinkPanel.tsx   -- renders all relevant exit links for a given surface
```

### Placement Rules

- Event detail page: weather, navigate, nearby stores, venue street view, vendor contacts
- Recipe view: technique YouTube, substitution search, nutrition lookup, food safety
- Shopping list: Instacart, Amazon Fresh, vendor portals, store maps
- Client profile: text, WhatsApp, call, email, social media profiles
- Menu editor: wine pairings, cuisine research, layout ideas
- Finance page: bank portal, Stripe, accountant email, tax links
- Settings: configure bank URL, vendor portals, accountant email, lawyer, insurance carrier
- Staff roster: Venmo payment, text, call
- Marketing: social post handoffs, Google Business, Yelp, ad platforms
- Compliance: license renewal, permits, insurance, health dept
