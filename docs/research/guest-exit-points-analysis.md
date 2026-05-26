# Every Scenario Where a Public Guest Still Leaves ChefFlow

> **Purpose:** Map every moment an anonymous public visitor, invited guest token user,
> no-login household participant, or Dinner Circle participant exits ChefFlow to use another tool.
> These are the boundaries of the public guest product. Some exits are permanent because ChefFlow
> will never replace maps, banks, card processors, social networks, native messaging, or medical
> advice. Others are reducible or bridgeable with cleaner handoffs, saved context, and return paths.
>
> **Codebase grounding:** `lib/auth/route-policy.ts` (`PUBLIC_UNAUTHENTICATED_PATHS` and
> `RouteAccountMode: "guest"`), `app/(public)`, token routes for `/share`, `/event`, `/proposal`,
> `/review`, `/feedback`, `/guest-feedback`, `/tip`, `/worksheet`, `/dietary-confirm`,
> `/menu-pick`, `/catalog-pick`, `/hub`, `/g`, `/join`, public route coverage tests, and
> Dinner Circle / hub code.
>
> **Companion docs:**
>
> - `docs/research/guest-never-leaves-analysis.md` (no-login workflows that stay in-app)
> - `docs/research/client-exit-points-analysis.md` (client-side exit scenarios)
> - `docs/research/client-never-leaves-analysis.md` (client-side in-app workflows)
>
> **Date:** 2026-05-25

---

## Guest Role Split

| Role State                               | Codebase Surfaces                                                                                                                                              | Product Meaning                                                                                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Anonymous public visitor                 | `/`, `/eat`, `/book`, `/chefs`, `/chef/[slug]`, `/nearby`, `/hub`, `/hub/circles`, `/g/[code]`                                                                 | No identity yet. Browses, searches, compares, submits inquiry or lead forms.                                                                           |
| Invited guest token user                 | `/share/[token]`, `/event/[eventId]/guest/[secureToken]`, `/dietary-confirm/[token]`, `/menu-pick/[token]`, `/catalog-pick/[token]`, `/guest-feedback/[token]` | Has event-specific or guest-specific access without login. Can RSVP, share dietary info, pick menu items, message, review, and return by token/cookie. |
| No-login household or circle participant | `/hub/join/[groupToken]`, `/hub/g/[groupToken]`, `/hub/me/[profileToken]`, `/join/[token]`                                                                     | Has a lightweight profile token or cookie. Can join Dinner Circles, chat, view group plans, update allergy context, and receive recovery links.        |

---

## Category 1: PUBLIC DISCOVERY & TRUST VALIDATION

| #   | Scenario                                            | Where They Go                                  | Why They Leave                                          | Classification | ChefFlow Could...                                                 |
| --- | --------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------- | -------------- | ----------------------------------------------------------------- |
| 1   | Search for private chefs before landing on ChefFlow | Google, Bing, social search                    | Discovery begins outside the product                    | Permanent      | Improve SEO and local pages, but open search remains external     |
| 2   | Validate a chef's reputation                        | Google Reviews, Yelp, Instagram, chef website  | Public proof carries more trust than owned profile copy | Permanent      | Surface verified review snippets and outbound proof links         |
| 3   | Check a chef's social presence                      | Instagram, TikTok, Facebook                    | Guests want plating style, personality, and recency     | Permanent      | Keep social/profile links visible and return paths clear          |
| 4   | Compare private chef against restaurants            | Google Maps, Resy, OpenTable, restaurant sites | Guest is still choosing format, not only chef           | Permanent      | Explain private dining fit and store inquiry intent               |
| 5   | Research food operators in local directory results  | Operator websites, maps, social profiles       | Nearby pages expose non-ChefFlow operators too          | Bridgeable     | Mark external profile links clearly and keep "book a chef" nearby |
| 6   | Ask friends whether a chef is worth booking         | Text, WhatsApp, group chat                     | Trust often starts socially                             | Permanent      | Provide shareable chef/event links and copy blocks                |
| 7   | Verify service area manually                        | Google, chef site, maps                        | Public availability or area confidence is incomplete    | Reducible      | Strengthen service-area filters and availability messaging        |

---

## Category 2: EVENT INVITE & RSVP COORDINATION

| #   | Scenario                                            | Where They Go                           | Why They Leave                                           | Classification | ChefFlow Could...                                                         |
| --- | --------------------------------------------------- | --------------------------------------- | -------------------------------------------------------- | -------------- | ------------------------------------------------------------------------- |
| 8   | Find the invitation link again                      | Email, SMS, calendar invite, group chat | Token links arrive through external channels             | Bridgeable     | Send recovery/resend links and make email subjects searchable             |
| 9   | Ask the host whether they should attend             | Text, phone, in-person                  | RSVP is social, not just form input                      | Permanent      | Let host notes and RSVP status stay visible after response                |
| 10  | Coordinate plus-one permission                      | Text, host group chat                   | Guest needs social approval before adding someone        | Bridgeable     | Keep plus-one fields but support host approval status                     |
| 11  | Share the event with someone else                   | Native share sheet, SMS, email          | The recipient is not yet in ChefFlow                     | Bridgeable     | `GuestNetworkShare` already creates viewer/guest links; improve reminders |
| 12  | Chase another guest's RSVP                          | Text, WhatsApp, email                   | Social pressure happens where relationships already live | Bridgeable     | Give hosts/guests copyable reminder links                                 |
| 13  | Recover an expired, revoked, or missing guest token | Email, host, chef                       | Tokenized access fails closed                            | Bridgeable     | Add clearer recovery flow from token failure pages                        |
| 14  | Resolve duplicate RSVP by email                     | Email, chef, host                       | Existing record blocks duplicate form submission         | Reducible      | Offer self-serve "send my existing portal link" in more token pages       |

---

## Category 3: CALENDAR, MAPS & ARRIVAL LOGISTICS

| #   | Scenario                              | Where They Go                            | Why They Leave                               | Classification | ChefFlow Could...                                                                           |
| --- | ------------------------------------- | ---------------------------------------- | -------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------- |
| 15  | Add event to personal calendar        | Google Calendar, Apple Calendar, Outlook | Life calendar lives outside ChefFlow         | Bridgeable     | Public `/e` already offers Google Calendar and `.ics`; add equivalent to share/guest portal |
| 16  | Navigate to the event                 | Google Maps, Apple Maps, Waze            | Maps own routing and traffic                 | Permanent      | Provide clean map links and copyable address blocks                                         |
| 17  | Check traffic before leaving          | Maps apps                                | Real-time traffic is external                | Permanent      | Show leave-window guidance but link out for routing                                         |
| 18  | Coordinate parking or building access | Text, building app, concierge, host      | Access details are situational and sensitive | Bridgeable     | Store parking/access notes in guest portal and Circle plan                                  |
| 19  | Order rideshare                       | Uber, Lyft                               | Transportation marketplace is external       | Permanent      | Store arrival window and offer copyable address                                             |
| 20  | Check weather for outdoor dinner      | Weather app, weather.com                 | Weather habit and forecasts are external     | Bridgeable     | Add event weather widget or status block to guest portal                                    |
| 21  | Look up venue/farm details            | Venue website, farm website, Google      | Public event page may expose farm links      | Permanent      | Keep venue links visible and preserve return-to-event link                                  |

---

## Category 4: PAYMENTS, TICKETS & MONEY

| #   | Scenario                                 | Where They Go                           | Why They Leave                                            | Classification | ChefFlow Could...                                             |
| --- | ---------------------------------------- | --------------------------------------- | --------------------------------------------------------- | -------------- | ------------------------------------------------------------- |
| 22  | Complete public ticket checkout          | Stripe Checkout                         | Card entry and payment processing are processor-owned     | Permanent      | Keep pre-checkout context and return/cancel URLs reliable     |
| 23  | Retry failed or cancelled checkout       | Stripe then `/e/[shareToken]`           | Payment can fail or be abandoned outside ChefFlow         | Bridgeable     | `retryTicketPurchase` exists; keep failed state obvious       |
| 24  | Check bank or card balance before buying | Bank app, credit card app               | Payment readiness lives with the bank                     | Permanent      | Show total due and reservation status only                    |
| 25  | Split ticket or event cost with friends  | Venmo, Cash App, Zelle, Splitwise       | Informal reimbursement is external                        | Bridgeable     | Add contribution links or split-pay later                     |
| 26  | Tip via informal method                  | Venmo, cash, other app                  | Tip form records method but card flow is not fully in-app | Bridgeable     | Let chef attach payment instructions or Stripe tip link       |
| 27  | Resolve card dispute or refund           | Bank, Stripe, credit card issuer        | Dispute rails are external                                | Permanent      | Show status and support contact once authenticated or tokened |
| 28  | Expense ticket or dinner cost            | Employer portal, Expensify, spreadsheet | Reimbursement system is external                          | Bridgeable     | Provide downloadable receipt and event summary                |

---

## Category 5: DIETARY, ALLERGY & HEALTH CONTEXT

| #   | Scenario                                             | Where They Go                                | Why They Leave                                 | Classification | ChefFlow Could...                                                        |
| --- | ---------------------------------------------------- | -------------------------------------------- | ---------------------------------------------- | -------------- | ------------------------------------------------------------------------ |
| 29  | Ask a doctor about allergy seriousness               | Doctor, medical portal, family member        | ChefFlow should not provide medical advice     | Permanent      | Collect severity and notes, not diagnosis                                |
| 30  | Look up whether an ingredient is safe                | Google, allergen databases, product labels   | Guest wants external assurance                 | Permanent      | Add chef-provided ingredient notes and allergy disclaimers               |
| 31  | Check medication, pregnancy, or cannabis interaction | Doctor, pharmacist, government/medical sites | High-stakes health guidance is external        | Permanent      | Link to `cannabis/public` and require acknowledgments, but do not advise |
| 32  | Ask household member what they can eat               | Text, family chat, in-person                 | Household preference is social and distributed | Bridgeable     | Household/circle profile summary can reduce repeat asks                  |
| 33  | Photograph ingredient labels for chef                | Camera, Photos, text message                 | Physical labels live outside app               | Reducible      | Add upload on guest portal or Circle private chat                        |
| 34  | Clarify dietary ambiguity verbally                   | Phone, text, in-person                       | Nuance may need conversation                   | Bridgeable     | `sendGuestMessage` exists; add structured follow-up prompts              |

---

## Category 6: MENU, FOOD & EXPERIENCE RESEARCH

| #   | Scenario                                    | Where They Go                             | Why They Leave                                  | Classification | ChefFlow Could...                                             |
| --- | ------------------------------------------- | ----------------------------------------- | ----------------------------------------------- | -------------- | ------------------------------------------------------------- |
| 35  | Research unfamiliar dishes before picking   | Google, food blogs, YouTube               | Menu labels may not explain enough              | Reducible      | Add dish descriptions, photos, ingredients, and chef notes    |
| 36  | Ask friends which menu option to choose     | Group chat, in-person                     | Menu choice can be social                       | Bridgeable     | Add shareable menu/pick summary or household voting           |
| 37  | Browse wine, cocktail, or beverage pairings | Vivino, retail sites, Google              | Beverage shopping is external and regulated     | Bridgeable     | Store pairing notes and responsibility boundaries             |
| 38  | Buy wine or host-provided items             | Retailer, delivery app, liquor store      | Commerce is outside ChefFlow                    | Permanent      | Track beverage plan, not purchase                             |
| 39  | Save a dish idea for later home cooking     | Notes app, screenshots, browser bookmarks | Guest personal recipe memory is outside product | Reducible      | Offer recap cards or saved dish history after account upgrade |
| 40  | Translate or explain menu language          | Google Translate, search                  | Guest needs accessibility/context               | Reducible      | Add menu language help and glossary where menu data exists    |

---

## Category 7: DINNER CIRCLE & NO-LOGIN PROFILE ACCESS

| #   | Scenario                                       | Where They Go                  | Why They Leave                                                                  | Classification | ChefFlow Could...                                                        |
| --- | ---------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------ |
| 41  | Recover lost Circle profile token              | Email inbox                    | `/hub/me/[profileToken]` and `hub_profile_token` depend on recovery link/cookie | Bridgeable     | Recovery email exists; expose it from every access-denied state          |
| 42  | Receive Circle updates                         | Email, push, SMS if configured | Notifications are delivered outside the app surface                             | Bridgeable     | Keep notification preferences and deep links reliable                    |
| 43  | Continue a Circle conversation from email      | Email client                   | Email replies can be easier than opening portal                                 | Bridgeable     | Email-to-circle ingestion can reduce loss if enabled                     |
| 44  | Create a community circle as anonymous visitor | Sign-in page                   | `hub/circles` requires auth to create, not just browse                          | Reducible      | Explain why creation needs account and preserve intended topic           |
| 45  | Invite someone by SMS                          | Native SMS composer, clipboard | Sharing links happens in native channels                                        | Bridgeable     | Provide role-specific invite copy and SMS deep links                     |
| 46  | Discuss sensitive guest detail privately       | Text, phone                    | Public Circle is not always the right privacy level                             | Reducible      | `GuestPrivateChat` exists for tokened members; make it more discoverable |
| 47  | Download or save a QR code                     | Browser download/files         | QR assets belong in device storage after creation                               | Permanent      | Keep downloads simple and labeled                                        |

---

## Category 8: PHOTOS, SOCIAL & MEMORY

| #   | Scenario                          | Where They Go                     | Why They Leave                      | Classification | ChefFlow Could...                                                   |
| --- | --------------------------------- | --------------------------------- | ----------------------------------- | -------------- | ------------------------------------------------------------------- |
| 48  | Take event photos                 | Native camera app                 | Capture starts on device hardware   | Permanent      | Make upload from guest page fast                                    |
| 49  | Edit photos before sharing        | iOS Photos, Lightroom, Snapseed   | Photo editing is its own domain     | Permanent      | Accept final edited uploads                                         |
| 50  | Post dinner photos socially       | Instagram, TikTok, Facebook       | Social graph lives outside ChefFlow | Permanent      | Provide share snippets and recap links                              |
| 51  | Store photos long term            | iCloud Photos, Google Photos      | Personal memory archive is external | Permanent      | Provide recap download/export later                                 |
| 52  | Share recap with friends          | Native share sheet, SMS, WhatsApp | Sharing happens in social channels  | Bridgeable     | Public recap links and copy snippets help                           |
| 53  | Leave a public third-party review | Google, Yelp, marketplace profile | Public reputation lives externally  | Permanent      | Link to preferred external review destination after in-app feedback |

---

## Category 9: PROPOSAL, BOOKING & FUTURE EVENT HANDOFFS

| #   | Scenario                                      | Where They Go                                  | Why They Leave                                                | Classification | ChefFlow Could...                                        |
| --- | --------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------- | -------------- | -------------------------------------------------------- |
| 54  | Discuss proposal with spouse/team             | Text, Slack, email                             | Approval is shared and social                                 | Bridgeable     | Shareable proposal link and co-approver access           |
| 55  | Negotiate proposal terms verbally             | Phone, email                                   | High-context negotiation may leave forms                      | Bridgeable     | Add structured questions and revision request thread     |
| 56  | Sign a separate venue or company document     | DocuSign, email attachment, procurement portal | Legal/procurement tooling is external                         | Permanent      | Store status and signed document link                    |
| 57  | Book again from post-action footer            | Chef profile/inquiry pages                     | Still in ChefFlow, but role changes from guest to lead/client | Bridgeable     | Preserve guest context and source event in query params  |
| 58  | Compare multiple chefs after attending dinner | ChefFlow `/chefs`, Google, marketplaces        | Guest may shop broadly for their own event                    | Bridgeable     | Keep ChefFlow browse path first, but open market remains |
| 59  | Ask chef directly before submitting lead form | Text, email, in-person                         | Relationship started offline at dinner                        | Permanent      | QR guest lead form captures intent after conversation    |

---

## Category 10: SUPPORT, PRIVACY & LEGAL

| #   | Scenario                                        | Where They Go                                                | Why They Leave                                               | Classification | ChefFlow Could...                                                    |
| --- | ----------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | -------------- | -------------------------------------------------------------------- |
| 60  | Contact support or privacy inbox                | Email client                                                 | Legal/support communication often leaves app                 | Permanent      | Public contact and data-request pages already provide paths          |
| 61  | Request data deletion or privacy help           | Email, data request form                                     | Identity verification and privacy workflow may cross systems | Reducible      | Strengthen no-login self-service where safe                          |
| 62  | Read Stripe or processor terms                  | Stripe legal pages                                           | Processor terms are external                                 | Permanent      | Link clearly from terms/payment contexts                             |
| 63  | Read guest or client legal terms                | ChefFlow public legal pages                                  | Stays on public web, not token flow                          | Reducible      | Keep legal pages linked from guest flows                             |
| 64  | Escalate safety concern                         | Phone, email, emergency services                             | Urgent safety is outside product workflow                    | Permanent      | Provide clear support/safety contact and do not bury it              |
| 65  | Unsubscribe or recover notification preferences | Email unsubscribe, `/unsubscribe`, Circle notification prefs | Notification control starts from an email                    | Bridgeable     | Keep tokenized unsubscribe and profile notification settings aligned |

---

## THE PATTERN: Three Types of Guest Exits

### 1. PERMANENT EXITS

External systems with their own trust, payment, social, or regulated purpose. ChefFlow should not
try to replace these.

- Search, maps, traffic, rideshare, weather, and venue websites (1, 15-21)
- Banks, cards, Stripe checkout, disputes, and informal payment apps (22-28)
- Medical, allergy, pregnancy, cannabis, and safety advice (29-31, 64)
- Social platforms, native messaging, camera, photo editing, and personal photo libraries (6, 48-53)
- Legal/procurement and external review sites (53, 56, 62)

**Strategy:** Clean link-outs, copyable context, saved return URLs, and explicit "bring it back"
capture after the external task is done.

### 2. REDUCIBLE EXITS

The guest leaves because ChefFlow does not yet provide enough clarity, recovery, explanation, or
self-service.

- Service-area confidence and chef discovery comparison (7)
- Duplicate RSVP recovery and expired-token recovery (13-14)
- Dietary clarification, label upload, and health-context collection short of medical advice (33-34)
- Dish explanations, translation, saved dish memory, and menu context (35, 39-40)
- Anonymous community-circle creation and private guest detail routing (44, 46)
- Public/no-login privacy and data controls (61, 63)

**Strategy:** Add lightweight self-service, better page-level recovery states, richer menu context,
and token/profile continuity without forcing account creation.

### 3. BRIDGEABLE EXITS

The guest should be able to leave briefly and return with context intact.

- Calendar, invite sharing, RSVP coordination, plus-one approval, and reminder chasing (8-14, 15)
- Circle recovery, notifications, email replies, and SMS invite copy (41-45, 65)
- Proposal discussion, negotiation, and future event conversion (54-58)
- Social recap sharing and chef profile rebooking (52, 57)

**Strategy:** Every bridgeable exit needs a visible return path, preserved token context, and a
specific next action when the guest comes back.

---

## Priority Gaps

| Priority | Gap                                                 | Why It Matters                                                                                                   | Candidate Fix                                                                                              |
| -------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| P0       | Token recovery is fragmented across guest surfaces  | Guests lose links in email/SMS and cannot always self-recover from expired or duplicate states                   | Standardize "send me my link" on `/share`, `/event`, `/hub/g`, `/dietary-confirm`, and token failure pages |
| P0       | Calendar/map handoffs are inconsistent              | Public `/e` has stronger calendar tooling than RSVP/share and guest portal surfaces                              | Add calendar and map handoff components to share and guest portal pages                                    |
| P1       | Dietary health boundary needs sharper product copy  | Guests may expect medical/allergy advice from collection forms                                                   | Add consistent "tell the chef, consult medical professional for medical advice" copy where needed          |
| P1       | Guest-to-future-client conversion is scattered      | Post-action footers, `/g/[code]`, and guest feedback can create leads but do not share a single conversion model | Normalize source event, guest name/email prefill, and "book own event" tracking                            |
| P1       | Menu choice context is thin for unfamiliar dishes   | Guests may leave to Google before selecting menu/catalog picks                                                   | Add dish photos, ingredient highlights, allergen flags, and chef notes to token pickers                    |
| P2       | Circle public/member boundary is hard to understand | Anonymous viewers, cookie profile members, and recovery-link members see different powers                        | Add a small access-state banner with join/recover/profile actions                                          |
| P2       | External review/social handoffs are not unified     | Feedback, review, recap, and tip pages each use related but separate forward paths                               | Create one post-event guest action cluster for review, tip, recap, rebook, social share, and chef profile  |
