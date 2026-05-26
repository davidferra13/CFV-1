# Every Scenario Where a Partner Still Leaves ChefFlow

> **Purpose:** Map every moment a referral partner, venue, host, concierge, supplier, or business partner exits ChefFlow to use another tool.
> These are the boundaries of the partner-side product. Some exits are permanent because ChefFlow will
> never replace Airbnb, venue booking systems, banks, maps, websites, email, legal review, or native communication.
> Others are opportunities to reduce friction or make the round-trip back into ChefFlow smoother.
>
> **Codebase grounding:** Partner access is the protected `/partner` subtree in `PARTNER_PROTECTED_PATHS`,
> enforced by `requirePartner()`. The current partner portal includes dashboard, events, locations,
> location detail/update requests, profile editing, public-page preview, partner invite claim, public
> partner intake, and tokenized contribution reports.
>
> **Companion docs:**
>
> - `docs/research/partner-never-leaves-analysis.md` (partner workflows that stay in-app)
> - `docs/research/chef-exit-points-analysis.md` (chef-side exit scenarios)
> - `docs/research/client-exit-points-analysis.md` (client-side exit scenarios)
>
> **Date:** 2026-05-25

---

## Category 1: ACCOUNT CLAIMING & ACCESS

| #   | Scenario                                  | Where They Go                                 | Why They Leave                                                | Exit Type      | ChefFlow Could...                                                   |
| --- | ----------------------------------------- | --------------------------------------------- | ------------------------------------------------------------- | -------------- | ------------------------------------------------------------------- |
| 1   | Receive the partner invite link           | Email, SMS, WhatsApp, Slack                   | The chef sends the one-time invite outside ChefFlow           | **Permanent**  | Keep invite URLs clean, branded, and recoverable                    |
| 2   | Ask the chef for a new invite             | Email, phone, text                            | Invalid, expired, or already-claimed token blocks signup      | **Bridgeable** | Add self-service resend/request-new-invite flow                     |
| 3   | Retrieve password from a password manager | 1Password, iCloud Keychain, Chrome, Bitwarden | Credential storage lives outside ChefFlow                     | **Permanent**  | Support browser/password-manager-friendly fields                    |
| 4   | Check email for account or chef context   | Gmail, Outlook, Apple Mail                    | Partner needs context before claiming account                 | **Bridgeable** | Include partner name, chef name, and portal purpose in invite page  |
| 5   | Review partner terms with counsel         | Lawyer, email, PDF viewer                     | Business partner may need legal review before accepting terms | **Permanent**  | Provide printable/exportable partner terms and acceptance timestamp |

---

## Category 2: PARTNER INTAKE & CHEF RELATIONSHIP SETUP

| #   | Scenario                                        | Where They Go                            | Why They Leave                                                                 | Exit Type      | ChefFlow Could...                                             |
| --- | ----------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------ | -------------- | ------------------------------------------------------------- |
| 6   | Find the chef-specific partner form             | Email, chef website, public profile      | The generic `/partner-signup` page needs a chef slug or link                   | **Bridgeable** | Make chef-specific links prominent on public profiles         |
| 7   | Confirm this is the right chef                  | Chef website, Instagram, Google          | Partner wants identity confidence before submitting details                    | **Permanent**  | Show richer chef context on partner intake                    |
| 8   | Send extra setup context to the chef            | Email, text, phone                       | Public partner intake only captures structured details and notes               | **Reducible**  | Add attachment fields and richer partner onboarding questions |
| 9   | Coordinate partnership terms before being added | Phone, email, in-person                  | Revenue share, exclusivity, and operating expectations are negotiated socially | **Permanent**  | Store the agreed terms after the external conversation        |
| 10  | Share business documents with the chef          | Google Drive, Dropbox, email attachments | Current partner intake does not upload documents                               | **Reducible**  | Add partner document upload and review queue                  |

---

## Category 3: PROFILE CONTENT & PUBLIC SHOWCASE

| #   | Scenario                                        | Where They Go                                    | Why They Leave                                                              | Exit Type      | ChefFlow Could...                                                      |
| --- | ----------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------- |
| 11  | Find a cover image URL                          | Website CMS, cloud photo host, CDN, Google Drive | Partner profile currently asks for a direct image URL                       | **Reducible**  | Add direct image upload in the partner portal                          |
| 12  | Edit or crop venue photos                       | Lightroom, Photos, Canva, phone gallery          | ChefFlow stores/display images, not media editing                           | **Permanent**  | Accept uploads and preserve captions, but do not become a photo editor |
| 13  | Update the partner's own website                | Squarespace, Wix, WordPress, custom CMS          | Website content is owned by the partner                                     | **Permanent**  | Store outbound website link and freshness reminders                    |
| 14  | Update external booking page copy               | Airbnb, VRBO, Peerspace, hotel PMS, venue CMS    | Booking marketplace owns inventory and conversion copy                      | **Permanent**  | Mirror key public info and link out cleanly                            |
| 15  | Check how public listing looks outside ChefFlow | Airbnb, venue site, Google Business Profile      | Partner compares ChefFlow preview with their canonical listing              | **Permanent**  | Add side-by-side saved links and checklist reminders                   |
| 16  | Ask chef to make profile public                 | Email, text, phone                               | Partner portal shows visibility as read-only; chef controls showcase toggle | **Bridgeable** | Add "request publish" action from preview/profile                      |
| 17  | Ask chef to reorder or feature partner          | Email, phone                                     | Showcase order is chef-controlled                                           | **Bridgeable** | Add a partner-authored visibility/feature request                      |

---

## Category 4: LOCATION DETAILS & VENUE OPERATIONS

| #   | Scenario                                   | Where They Go                                         | Why They Leave                                                                       | Exit Type      | ChefFlow Could...                                                |
| --- | ------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------- | ---------------------------------------------------------------- |
| 18  | Verify address or map pin                  | Google Maps, Apple Maps, venue website                | Location accuracy depends on map/search systems                                      | **Bridgeable** | Add map preview and address validation before submitting changes |
| 19  | Check parking/loading/access instructions  | Building portal, venue docs, Google Maps, phone       | Operational access details live in external venue systems                            | **Bridgeable** | Store public/private access notes and last-verified date         |
| 20  | Confirm venue capacity with official docs  | Fire marshal docs, venue contract, internal ops sheet | Capacity can be legal/operational, not just marketing copy                           | **Permanent**  | Store the approved max guest count and source note               |
| 21  | Update room availability or blackout dates | Airbnb, VRBO, Peerspace, hotel PMS, event calendar    | ChefFlow does not own the location's booking calendar                                | **Permanent**  | Add calendar link/import or availability notes                   |
| 22  | Coordinate location change approval        | Email/text with chef                                  | Partner can submit public location changes, but nuanced review may move offline      | **Bridgeable** | Add threaded comments on change requests                         |
| 23  | Provide new location photos                | Google Drive, Dropbox, email, text                    | Partner detail currently displays photos but partner portal mainly proposes metadata | **Reducible**  | Add partner-side photo upload with chef approval                 |
| 24  | Handle venue maintenance or closures       | Property management system, contractor portal, phone  | Physical operations are outside ChefFlow                                             | **Permanent**  | Store temporary closure notes and affected-event flags           |

---

## Category 5: EVENT HISTORY, ATTRIBUTION & REPORTING

| #   | Scenario                                         | Where They Go                                       | Why They Leave                                                                     | Exit Type      | ChefFlow Could...                                                   |
| --- | ------------------------------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------- |
| 25  | Verify missing or misattributed events           | Email/text chef, partner calendar, booking platform | Partner portal only shows events already linked to partner/location                | **Bridgeable** | Add "missing event?" report button from events page                 |
| 26  | Export contribution report for internal use      | PDF printer, screenshot, email                      | Tokenized report is viewable but external sharing/reconciliation happens elsewhere | **Bridgeable** | Add export PDF and send-to-email actions                            |
| 27  | Compare ChefFlow event count with venue bookings | Airbnb/VRBO/PMS calendar, spreadsheet               | Partner's canonical booking ledger is external                                     | **Permanent**  | Support CSV import or manual reconciliation notes                   |
| 28  | Share impact results with a manager or owner     | Email, Slack, PDF, board deck                       | Business reporting audience may not use ChefFlow                                   | **Bridgeable** | Add shareable report links, export, and read-only stakeholder links |
| 29  | Investigate event revenue details                | Chef, accounting records                            | Partner portal intentionally avoids client PII and full financial detail           | **Permanent**  | Show allowed aggregate value only and explain privacy boundary      |
| 30  | Track referral source beyond linked events       | Spreadsheet, CRM                                    | Granular `referral_records` are chef-side, not partner-editable                    | **Reducible**  | Add partner-submitted lead/referral log with chef approval          |

---

## Category 6: COMMISSION, PAYOUTS & MONEY

| #   | Scenario                            | Where They Go                                    | Why They Leave                                                            | Exit Type      | ChefFlow Could...                                             |
| --- | ----------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------- |
| 31  | Check whether a commission was paid | Bank app, Venmo, Zelle, PayPal, email            | Partner portal does not expose payout history; chef-side panel records it | **Reducible**  | Add partner-visible payout ledger when commission terms exist |
| 32  | Receive actual payout               | Bank transfer, check, Venmo, Zelle, PayPal, cash | Payment rails are external                                                | **Permanent**  | Record method, reference, paid date, and receipt              |
| 33  | Resolve payout discrepancy          | Email, phone, accounting system                  | Payment disputes need human/business review                               | **Bridgeable** | Add payout question/dispute note tied to report period        |
| 34  | Reconcile tax income                | QuickBooks, accountant portal, spreadsheet       | Partner's tax/accounting system is external                               | **Permanent**  | Export annual partner statement                               |
| 35  | Confirm commission terms            | Contract, email, legal doc                       | Commission agreement may be outside ChefFlow                              | **Bridgeable** | Show current commission terms and effective date in portal    |
| 36  | Send invoice to chef                | Accounting app, PDF, email                       | Some partners invoice before payout                                       | **Bridgeable** | Add partner invoice upload/request flow                       |

---

## Category 7: COMMUNICATION & RELATIONSHIP MANAGEMENT

| #   | Scenario                           | Where They Go                      | Why They Leave                                             | Exit Type      | ChefFlow Could...                                                  |
| --- | ---------------------------------- | ---------------------------------- | ---------------------------------------------------------- | -------------- | ------------------------------------------------------------------ |
| 37  | Message chef about a new referral  | Text, email, phone                 | Partner portal has no messaging surface                    | **Reducible**  | Add partner-to-chef message thread or referral note                |
| 38  | Call chef about urgent venue issue | Phone                              | Urgent operational context needs voice                     | **Permanent**  | Add post-call note capture and event/location association          |
| 39  | Coordinate with venue staff        | Internal chat, Slack, phone, email | Partner's staff do not have ChefFlow partner seats         | **Bridgeable** | Add delegated partner contacts or read-only staff links            |
| 40  | Forward client/guest context       | Email, SMS, WhatsApp               | Referral often starts in existing social/business channels | **Permanent**  | Provide referral link and capture forwarded context after the fact |
| 41  | Ask support for account help       | Email/contact form                 | Partner may not know chef vs ChefFlow support boundary     | **Reducible**  | Add in-portal help and support routing                             |

---

## Category 8: REFERRAL GENERATION & EXTERNAL DISCOVERY

| #   | Scenario                              | Where They Go                                 | Why They Leave                                           | Exit Type      | ChefFlow Could...                                    |
| --- | ------------------------------------- | --------------------------------------------- | -------------------------------------------------------- | -------------- | ---------------------------------------------------- |
| 42  | Share chef referral link with a guest | Email, SMS, WhatsApp, QR print, social DM     | Referrals are social and happen where guests already are | **Permanent**  | Provide copyable links, QR cards, and share tracking |
| 43  | Promote chef on partner website       | Website CMS, Linktree, Airbnb guidebook       | Partner owns promotion surfaces                          | **Bridgeable** | Generate embeddable partner referral blocks          |
| 44  | Mention chef in host guidebook        | Airbnb/VRBO guidebook, printed binder         | Guest discovery happens in property-specific materials   | **Permanent**  | Provide printable cards and canonical inquiry URL    |
| 45  | Track lead before it becomes inquiry  | Spreadsheet, CRM, notes app                   | Partner cannot currently log a referred lead in portal   | **Reducible**  | Add "submit a referral" partner workflow             |
| 46  | Compare chef with other vendors       | Google, Instagram, vendor list, planner tools | Partner may maintain broader vendor network              | **Permanent**  | Store preferred-chef positioning and partner notes   |

---

## Category 9: LEGAL, PRIVACY & COMPLIANCE

| #   | Scenario                                       | Where They Go                                       | Why They Leave                                    | Exit Type      | ChefFlow Could...                                       |
| --- | ---------------------------------------------- | --------------------------------------------------- | ------------------------------------------------- | -------------- | ------------------------------------------------------- |
| 47  | Review privacy or partner terms outside portal | Browser, PDF, lawyer                                | Formal policy review often leaves the app         | **Permanent**  | Keep policies versioned and acceptance logged           |
| 48  | Request data deletion or profile removal       | Email, data request form                            | Account/privacy process may cross support systems | **Bridgeable** | Add self-service partner data/profile removal request   |
| 49  | Verify insurance/licensing requirements        | Venue policy docs, insurer portal, government sites | Legal/regulatory proof lives externally           | **Permanent**  | Store proof links and renewal reminders                 |
| 50  | Handle incident or liability issue             | Insurance portal, legal counsel, phone              | Risk handling belongs to insurer/legal systems    | **Permanent**  | Attach incident notes to partner/location/event records |
| 51  | Approve public use of venue photos             | Email, rights-release docs, cloud drive             | Media consent can require external signoff        | **Bridgeable** | Add photo approval and consent status per image         |

---

## Category 10: DAY-OF OPERATIONS

| #   | Scenario                                         | Where They Go                                | Why They Leave                                   | Exit Type      | ChefFlow Could...                                     |
| --- | ------------------------------------------------ | -------------------------------------------- | ------------------------------------------------ | -------------- | ----------------------------------------------------- |
| 52  | Coordinate arrival/loading day-of                | Phone, text, venue radio, property staff app | Live physical operations happen outside ChefFlow | **Permanent**  | Store confirmed arrival window and access contacts    |
| 53  | Check real-time traffic or directions            | Google Maps, Apple Maps, Waze                | Maps own routing and traffic                     | **Permanent**  | Provide map links from location detail                |
| 54  | Alert chef to last-minute venue issue            | Phone, text                                  | Urgent service blockers need immediate channels  | **Permanent**  | Add after-action issue capture and escalation notes   |
| 55  | Update guest-facing signage or printed materials | Canva, printer, property binder              | Print/design tools are external                  | **Permanent**  | Provide printable referral cards and report summaries |
| 56  | Coordinate cleanup or house rules                | Property management app, staff chat, phone   | Venue operating procedures live with the partner | **Bridgeable** | Store house rules and service checklist attachments   |

---

## THE PATTERN: Three Types of Partner Exits

### 1. PERMANENT EXITS (ChefFlow should never try to replace these)

External ecosystems that are part of the partner's own business infrastructure.

- Booking platforms, PMS, Airbnb, VRBO, Peerspace, venue calendars (14, 21, 27)
- Banks, payment rails, tax/accounting systems (32, 34)
- Native communication for urgent or social referrals (1, 9, 38, 40, 52-54)
- Legal, insurance, compliance, and counsel workflows (5, 20, 47, 49-50)
- Maps, traffic, website CMS, photo editing, and print/design tools (12-15, 18, 53, 55)

**Strategy:** Clean handoffs, canonical links, saved context, and partner-visible proof of what ChefFlow knows.

### 2. REDUCIBLE EXITS (ChefFlow could eliminate or reduce these)

Partner leaves because the current portal is intentionally small and missing self-service surfaces.

- Direct partner photo upload and media approval (11, 23)
- Partner document upload and richer onboarding context (8, 10)
- Partner-visible payout ledger and commission terms (31, 35)
- Partner-submitted lead/referral logging (30, 45)
- Partner-to-chef message/help surface (37, 41)

**Strategy:** Add low-risk self-service workflows that still preserve chef approval and tenant boundaries.

### 3. BRIDGEABLE EXITS (Partner will still go external, but ChefFlow can smooth the round-trip)

Partner needs an outside system, but ChefFlow can preserve state before and after the trip.

- Invite recovery and chef-specific intake discovery (2, 6)
- Visibility, feature, and public-profile publish requests (16-17)
- Address, access, capacity, and closure verification (18-19, 22, 24)
- Report export, stakeholder sharing, and event attribution corrections (25-28)
- Payout questions, invoices, and agreement capture (33, 35-36)
- Referral promotion on partner-owned channels (42-44)
- Privacy/profile removal and photo consent requests (48, 51)
- Day-of house rules and service checklist attachments (56)

**Strategy:** Make every external trip return with structured evidence, not loose memory.

---

## PRIORITY RANKING (By Partner Pain)

**Leaves most often for:**

1. Email/text with the chef
2. Airbnb/VRBO/venue booking systems
3. Bank/Venmo/Zelle/PayPal payout checks
4. Cloud photos and image URLs
5. Website/CMS edits
6. Google Maps/address verification
7. Internal venue calendar or PMS
8. Legal/terms review
9. Spreadsheet/accounting reconciliation
10. Sharing referral links through guest channels
11. Sending extra setup context or documents
12. Asking whether profile is live or events are missing

**Highest-impact improvements:**

1. **Partner-visible payout ledger** = reduces money/status uncertainty
2. **Partner-side photo upload with chef approval** = removes direct-image-URL friction
3. **Submit a referral / missing event button** = closes attribution gaps
4. **Request publish/visibility workflow** = reduces "is my page live?" messages
5. **Report export/share actions** = bridges partner stakeholder reporting
6. **Partner-to-chef message thread** = captures operational context in-app
7. **Document upload and onboarding packet** = improves partnership setup
8. **Map/address validation on location edits** = reduces wrong public location data
9. **Commission terms display** = reduces external agreement hunting
10. **Embeddable referral blocks/QR cards** = bridges external discovery

---

_56 partner exit scenarios. Most are not failures._
_Partner-side ChefFlow wins when it proves impact, protects privacy, and turns external business systems into clean handoffs instead of blind spots._
