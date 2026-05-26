# Everything a Partner Never Needs to Leave ChefFlow For

> **Purpose:** The inverse of `partner-exit-points-analysis.md`. Every workflow a referral
> partner, venue, host, concierge, supplier, or business partner can complete inside ChefFlow
> from start to finish, no outside tool required.
>
> **Codebase grounding:** This is scoped to the current partner/referral-partner surfaces:
> public partner intake, chef-generated partner invites, `requirePartner()`-guarded `/partner`
> portal pages, partner profile/location actions, partner location change requests, public preview,
> protected event history, tokenized contribution reports, and chef-side partner attribution tools
> visible to the partner through reports or portal outcomes.
>
> **Date:** 2026-05-25

---

## Category 1: PUBLIC PARTNER INTAKE

| #   | What They Do Entirely In-App                                                      |
| --- | --------------------------------------------------------------------------------- |
| 1   | Open the generic `/partner-signup` intake page                                    |
| 2   | Enter a chef profile slug to reach the chef-specific partner form                 |
| 3   | Open `/chef/[slug]/partner-signup` directly from a chef-specific link             |
| 4   | Confirm the chef identity shown on the partner intake page                        |
| 5   | Select partner type: Airbnb host, business, platform, individual, venue, or other |
| 6   | Submit partner or business name                                                   |
| 7   | Submit contact name                                                               |
| 8   | Submit email and phone                                                            |
| 9   | Submit website URL                                                                |
| 10  | Submit external booking URL                                                       |
| 11  | Submit public-facing partner description                                          |
| 12  | Submit private notes for chef review                                              |
| 13  | See successful partner detail submission confirmation                             |
| 14  | Submit another partner profile from the success state                             |
| 15  | Return from partner intake to the chef public profile                             |
| 16  | Change chef context from the partner signup page                                  |

---

## Category 2: INVITE CLAIMING & ROLE ACCESS

| #   | What They Do Entirely In-App                                                 |
| --- | ---------------------------------------------------------------------------- |
| 17  | Open `/auth/partner-signup?token=...` from a chef-generated invite           |
| 18  | See invalid-invite messaging when token is missing                           |
| 19  | Enter email for partner account creation                                     |
| 20  | Create a password for the partner account                                    |
| 21  | Accept ChefFlow privacy policy and partner terms during invite claim         |
| 22  | Claim the partner invite                                                     |
| 23  | Link an existing auth user to the partner role when the email already exists |
| 24  | Create a new auth user when the partner email is new                         |
| 25  | Persist legal acceptance for the partner subject                             |
| 26  | Sign in after successful invite claim                                        |
| 27  | Redirect into `/partner/dashboard` after signup                              |
| 28  | Sign in later through the partner portal sign-in path                        |
| 29  | Sign out from the partner portal                                             |
| 30  | Use role switching when the authenticated account has multiple roles         |

---

## Category 3: PARTNER PORTAL SHELL & NAVIGATION

| #   | What They Do Entirely In-App                                        |
| --- | ------------------------------------------------------------------- |
| 31  | Access authenticated partner layout guarded by `requirePartner()`   |
| 32  | See partner name in the desktop sidebar                             |
| 33  | Navigate to Dashboard                                               |
| 34  | Navigate to My Locations                                            |
| 35  | Navigate to Events                                                  |
| 36  | Navigate to My Profile                                              |
| 37  | Navigate to Preview Page                                            |
| 38  | Use mobile partner navigation                                       |
| 39  | Open and close the mobile partner menu                              |
| 40  | See role-aware partner rail content                                 |
| 41  | Load partner pages with portal/surface metadata                     |
| 42  | Recover from partner page errors through the partner error boundary |
| 43  | See partner loading states while portal pages resolve               |

---

## Category 4: DASHBOARD & IMPACT SUMMARY

| #   | What They Do Entirely In-App                                      |
| --- | ----------------------------------------------------------------- |
| 44  | Open partner dashboard                                            |
| 45  | See welcome header with partner name                              |
| 46  | View total active locations                                       |
| 47  | View completed events hosted                                      |
| 48  | View guests served                                                |
| 49  | View total partner photos                                         |
| 50  | See partnership origin story when origin client/event data exists |
| 51  | View active location cards from dashboard                         |
| 52  | Open a location detail page from dashboard                        |
| 53  | See location cover image or fallback state                        |
| 54  | See location city/state                                           |
| 55  | See location event count                                          |
| 56  | See location guest capacity                                       |
| 57  | View recent events table                                          |
| 58  | See recent event date                                             |
| 59  | See recent event occasion                                         |
| 60  | See recent event location                                         |
| 61  | See recent event guest count                                      |
| 62  | See empty-state messaging when no locations exist                 |
| 63  | See discovery rail recommendations for partner venues             |

---

## Category 5: LOCATION LIST & LOCATION DETAIL

| #   | What They Do Entirely In-App                                     |
| --- | ---------------------------------------------------------------- |
| 64  | Open `/partner/locations`                                        |
| 65  | View all active locations tied to the partner                    |
| 66  | See location thumbnail or fallback icon                          |
| 67  | See completed-event count per location                           |
| 68  | See location capacity from the list                              |
| 69  | Open a specific location detail page                             |
| 70  | View full location name and address                              |
| 71  | View location-level stats                                        |
| 72  | View location description                                        |
| 73  | View location media tags                                         |
| 74  | View location best-for tags                                      |
| 75  | View location service-format tags                                |
| 76  | View location photo gallery                                      |
| 77  | View completed event history for the location                    |
| 78  | See empty-state messaging for locations without completed events |
| 79  | Return from location detail to all locations                     |

---

## Category 6: PARTNER-AUTHORED LOCATION CHANGE REQUESTS

| #   | What They Do Entirely In-App                           |
| --- | ------------------------------------------------------ |
| 80  | Open location update form from location detail         |
| 81  | Propose a location name update                         |
| 82  | Propose booking URL update                             |
| 83  | Propose public description update                      |
| 84  | Propose address, city, state, or ZIP update            |
| 85  | Propose max guest count update                         |
| 86  | Propose media tag changes                              |
| 87  | Propose best-for tag changes                           |
| 88  | Propose service-format tag changes                     |
| 89  | Add a note for the chef explaining the change          |
| 90  | Submit public location updates for chef approval       |
| 91  | See pending-review state after submission              |
| 92  | See which fields are waiting for review                |
| 93  | See previous location change request history           |
| 94  | See approved, rejected, or pending status              |
| 95  | See chef review notes when present                     |
| 96  | Avoid duplicate pending requests for the same location |

---

## Category 7: EVENT HISTORY WITHOUT CLIENT PII

| #   | What They Do Entirely In-App                                    |
| --- | --------------------------------------------------------------- |
| 97  | Open `/partner/events`                                          |
| 98  | View all partner-location events exposed to the portal          |
| 99  | See total event count                                           |
| 100 | See event date                                                  |
| 101 | See event occasion                                              |
| 102 | See event location                                              |
| 103 | See event guest count                                           |
| 104 | See event status labels                                         |
| 105 | Review confirmed, in-progress, and completed events             |
| 106 | View event history without client names or client PII           |
| 107 | See no-events empty state                                       |
| 108 | See location-specific event history from a location detail page |

---

## Category 8: PROFILE SETTINGS

| #   | What They Do Entirely In-App                                                    |
| --- | ------------------------------------------------------------------------------- |
| 109 | Open `/partner/profile`                                                         |
| 110 | See whether public showcase visibility is enabled                               |
| 111 | Understand that chef controls visibility                                        |
| 112 | Edit business/property name                                                     |
| 113 | Edit public description                                                         |
| 114 | Edit contact name                                                               |
| 115 | Edit phone number                                                               |
| 116 | Edit website URL                                                                |
| 117 | Edit booking URL                                                                |
| 118 | Edit cover image URL                                                            |
| 119 | Save profile changes                                                            |
| 120 | Keep protected fields unchanged because partner profile updates are whitelisted |

---

## Category 9: PUBLIC PREVIEW & SHOWCASE CONFIDENCE

| #   | What They Do Entirely In-App                                  |
| --- | ------------------------------------------------------------- |
| 121 | Open `/partner/preview`                                       |
| 122 | Preview how the partner appears on the chef's public page     |
| 123 | See chef business or display name in preview context          |
| 124 | See whether profile is live or hidden                         |
| 125 | View partner cover image in preview                           |
| 126 | View partner name and description in preview                  |
| 127 | View website link label in preview                            |
| 128 | View booking link label in preview                            |
| 129 | View active public spaces                                     |
| 130 | View public location city/state and capacity                  |
| 131 | View public gallery images                                    |
| 132 | Navigate from preview back to profile editing                 |
| 133 | Open the chef public page anchor for live public verification |

---

## Category 10: TOKENIZED CONTRIBUTION REPORTS

| #   | What They Do Entirely In-App                                               |
| --- | -------------------------------------------------------------------------- |
| 134 | Open a chef-generated `/partner-report/[token]` link                       |
| 135 | Pass partner-report rate limiting                                          |
| 136 | See expired or invalid report-token messaging                              |
| 137 | View partner contribution report without signing in                        |
| 138 | See chef identity on the report                                            |
| 139 | See partner identity and type                                              |
| 140 | See generated date                                                         |
| 141 | See total events served                                                    |
| 142 | See completed event count                                                  |
| 143 | See guests hosted                                                          |
| 144 | See catering value                                                         |
| 145 | View report grouped by location                                            |
| 146 | View per-location event counts                                             |
| 147 | View per-location guest counts                                             |
| 148 | View per-location catering value                                           |
| 149 | View additional events not tied to a specific location                     |
| 150 | Review event dates, occasions, guest counts, and statuses in report format |

---

## Category 11: CHEF-SIDE PARTNER OUTCOMES VISIBLE TO PARTNERS

| #   | What They Do Entirely In-App                                                        |
| --- | ----------------------------------------------------------------------------------- |
| 151 | Benefit from chef-created partner profile records                                   |
| 152 | Benefit from chef-added partner locations                                           |
| 153 | Benefit from chef-added partner images                                              |
| 154 | Benefit from chef-controlled public showcase visibility                             |
| 155 | Benefit from chef-generated referral links                                          |
| 156 | Benefit from chef-generated partner report links                                    |
| 157 | Benefit from chef-tagged historical events                                          |
| 158 | Benefit from partner/location attribution on inquiries and events                   |
| 159 | Benefit from chef-reviewed location update requests                                 |
| 160 | Benefit from active/inactive partner lifecycle status preserving history            |
| 161 | Benefit from commission type and rate being stored in the partner record            |
| 162 | Benefit from partner payout history being recorded by the chef                      |
| 163 | Benefit from partner leaderboard and referral-performance analytics                 |
| 164 | Benefit from public showcase partners appearing on chef public profile when enabled |

---

## Category 12: PRIVACY, SECURITY & TRUST BOUNDARIES

| #   | What They Do Entirely In-App                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------- |
| 165 | Stay scoped to the partner's own `referral_partners.id`                                                     |
| 166 | Stay scoped to the chef tenant from the partner record                                                      |
| 167 | View events without client names or private client data                                                     |
| 168 | Update only allowed partner profile fields                                                                  |
| 169 | Submit location changes without directly publishing them                                                    |
| 170 | See chef approval as the gate before public location changes go live                                        |
| 171 | Use partner-specific route policy instead of chef/client route access                                       |
| 172 | Get redirected away from partner portal when not authenticated as partner                                   |
| 173 | Use public report links without exposing full chef portal access                                            |
| 174 | Use noindex partner report pages for private sharing                                                        |
| 175 | Keep chef-only payout, commission, and internal notes out of the partner portal unless intentionally shared |

---

## THE SCORE

| Metric                             | Count                                                          |
| ---------------------------------- | -------------------------------------------------------------- |
| **Total in-app partner workflows** | **175**                                                        |
| **Total partner exit scenarios**   | **56**                                                         |
| **Ratio**                          | **76% of the partner-side digital journey is inside ChefFlow** |

---

## What This Means

A referral partner using ChefFlow fully only leaves for:

1. **Their own business systems**: Airbnb, VRBO, Peerspace, hotel PMS, venue calendars, website CMS.
2. **Native communication**: email, SMS, WhatsApp, phone calls, internal staff channels.
3. **Money rails**: bank apps, Venmo, Zelle, PayPal, checks, accounting/tax systems.
4. **Maps and physical operations**: directions, parking, loading, access systems, property management.
5. **Legal and compliance**: counsel, insurance, licensing, formal venue policy review.
6. **Media and promotion surfaces**: photo libraries, editing tools, partner website, printed materials, guidebooks.

Everything else: partner intake, account claiming, protected portal access, profile editing, public preview,
location review requests, event history, impact stats, tokenized contribution reports, public showcase state,
and privacy-scoped partner proof can happen without leaving ChefFlow.

---

## The Remaining Gap (What Would Get This to 90%+)

| Fix                                             | Exits Eliminated or Reduced                          |
| ----------------------------------------------- | ---------------------------------------------------- |
| Partner-visible payout ledger                   | Bank/payment-status checking, commission uncertainty |
| Direct partner photo upload with chef approval  | Image URL hunting, email/cloud-photo handoff         |
| Submit referral / missing event flow            | Spreadsheets, texts about attribution gaps           |
| Partner-to-chef messaging                       | Email/text loops for non-urgent relationship updates |
| Request publish / feature / reorder action      | Offline visibility requests                          |
| Report PDF/export/share controls                | Screenshots, manual report forwarding                |
| Partner document upload                         | Email/Drive partner setup documents                  |
| Map/address validation                          | External map checks for proposed location edits      |
| Commission terms display                        | Hunting for agreement terms in email/contracts       |
| Embeddable referral block and QR card generator | Manual website/guidebook promotion work              |

Ten improvements would push ChefFlow from roughly 76% to 90%+ of the partner-side digital journey.
