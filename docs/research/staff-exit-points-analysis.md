# Every Scenario Where Staff Still Leave ChefFlow

> **Purpose:** Map every moment a staff member, contractor, sous chef, server, bartender,
> dishwasher, or kitchen assistant exits ChefFlow to use another tool.
> These are the boundaries of the staff-side product. Some exits are permanent because
> ChefFlow will never replace maps, phone calls, banks, payroll rails, government portals,
> or kitchen hardware. Others are opportunities to reduce friction or make the round-trip
> back into ChefFlow smoother.
>
> **Codebase grounding:** Staff auth is gated by `requireStaff()` in `lib/auth/get-user.ts`.
> Staff protected routes are `STAFF_PROTECTED_PATHS` in `lib/auth/route-policy.ts`:
> `/staff-dashboard`, `/staff-recipes`, `/staff-schedule`, `/staff-station`,
> `/staff-tasks`, and `/staff-time`. The staff shell lives under `app/(staff)`.
> Tokenized event briefings live at `app/(public)/staff-portal/[id]`.
> Chef-side staff management lives under `app/(chef)/staff` and
> `app/(chef)/events/[id]/staff`.
>
> **Companion docs:**
>
> - `docs/research/staff-never-leaves-analysis.md` (staff workflows that stay in-app)
> - `docs/research/chef-exit-points-analysis.md` (chef-side exit scenarios)
> - `docs/research/client-exit-points-analysis.md` (client-side exit scenarios)
>
> **Date:** 2026-05-25

---

## Category 1: DAY-OF COMMUNICATION & ESCALATION

| #   | Scenario                             | Where They Go                              | Why They Leave                                                                            | Classification | ChefFlow Could...                                                   |
| --- | ------------------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------- |
| 1   | Call the chef from an event briefing | Phone app                                  | `StaffEventView` exposes a `tel:` call action because urgent service questions need voice | Permanent      | Keep the call button and prompt a post-call note                    |
| 2   | Text the chef about a blocked task   | SMS, iMessage, WhatsApp                    | Staff portal has tasks but no staff-to-chef message thread                                | Reducible      | Add event-scoped staff comments or issue flags                      |
| 3   | Send a photo of a station issue      | SMS, WhatsApp, camera roll                 | Staff can update clipboard notes, but not attach photos from `/staff-station`             | Reducible      | Allow photo attachments on station clipboard entries                |
| 4   | Ask another staffer for help         | Text, group chat, in-person                | Staff can see collaborators in token briefings, but no in-app team chat                   | Bridgeable     | Add lightweight event crew thread or mention-based handoff          |
| 5   | Escalate a safety incident           | Phone, text, in-person, emergency services | Real incidents need immediate human escalation                                            | Permanent      | Add incident log after the fact and keep emergency contacts visible |
| 6   | Resolve an access or building issue  | Phone, text, concierge desk                | Building systems and on-site humans control access                                        | Permanent      | Store access instructions and a visible "access problem" escalation |
| 7   | Ask for clarification on chef notes  | Phone, text                                | Briefing notes are read-only to staff                                                     | Reducible      | Add staff question/comment capture tied to the assignment           |
| 8   | Report being late or unavailable     | Phone, text                                | Staff schedule is read-only; availability is chef-managed                                 | Reducible      | Add staff availability/change request workflow                      |

---

## Category 2: MAPS, TRAVEL & ARRIVAL

| #   | Scenario                                     | Where They Go                 | Why They Leave                                                                | Classification | ChefFlow Could...                                               |
| --- | -------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------- |
| 9   | Navigate to the event                        | Google Maps, Apple Maps, Waze | `StaffEventView` intentionally links out to Google Maps for the event address | Permanent      | Keep clean map links and preserve arrival window in ChefFlow    |
| 10  | Check live traffic before leaving            | Maps app                      | Real-time traffic belongs to navigation platforms                             | Permanent      | Show recommended leave window if route data is integrated later |
| 11  | Find parking or loading access               | Maps, street view, venue call | Staff can read access notes, but parking confidence is external               | Bridgeable     | Add parking/loading fields and link them from briefing          |
| 12  | Coordinate rideshare or transit              | Uber, Lyft, transit app       | Transportation marketplaces are external                                      | Permanent      | Store arrival ETA or reimbursement notes                        |
| 13  | Get directions between prep site and event   | Maps app                      | Multi-leg route planning is not in staff portal                               | Permanent      | Add "open route" links when prep and event locations are known  |
| 14  | Locate a nearby store for emergency supplies | Google Maps, grocery apps     | ChefFlow does not provide nearby store discovery to staff                     | Bridgeable     | Add chef-approved emergency vendor links per event              |

---

## Category 3: CLOCK, PAY, BANKING & TAX

| #   | Scenario                                 | Where They Go                                     | Why They Leave                                                                    | Classification | ChefFlow Could...                                             |
| --- | ---------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------- |
| 15  | Confirm money was deposited              | Bank app, payroll app, Venmo, Zelle               | `/staff-time` logs time, but payout rails live elsewhere                          | Permanent      | Show payment status when chef/payroll integration exists      |
| 16  | Receive informal tip or reimbursement    | Venmo, Cash App, Zelle, cash                      | Staff tip distribution exists chef-side, but staff payout happens externally      | Bridgeable     | Show tip distribution status and allow receipt acknowledgment |
| 17  | Correct a disputed time entry            | Text, phone, email                                | Staff can clock in/out, but not formally dispute a record in the portal           | Reducible      | Add time-entry correction requests                            |
| 18  | Submit tax forms or contractor paperwork | Government forms, payroll portal, DocuSign, email | Staff terms are a placeholder; agreements are chef-managed                        | Bridgeable     | Store signed docs and status in staff profile                 |
| 19  | Download pay stubs or year-end tax docs  | Payroll provider, email, accounting portal        | Chef-side payroll records exist, but staff-facing pay documents are not in portal | Reducible      | Add staff pay history and document download                   |
| 20  | Track mileage for work                   | MileIQ, notes, spreadsheet                        | Staff portal has no mileage capture                                               | Reducible      | Add optional mileage/reimbursement field per assignment       |
| 21  | Check minimum wage/overtime rules        | State labor sites, accountant, employer           | Legal interpretation is external and jurisdiction-specific                        | Permanent      | Link policy docs and show recorded hours clearly              |

---

## Category 4: SCHEDULE, AVAILABILITY & SWAPS

| #   | Scenario                                       | Where They Go                            | Why They Leave                                                                       | Classification | ChefFlow Could...                                  |
| --- | ---------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------ | -------------- | -------------------------------------------------- |
| 22  | Compare ChefFlow schedule to personal calendar | Google Calendar, Apple Calendar, Outlook | `/staff-schedule` is read-only and not a calendar sync source                        | Reducible      | Add staff iCal feed or add-to-calendar links       |
| 23  | Request a shift change                         | Text, phone, email                       | Staff cannot request schedule changes from `/staff-schedule`                         | Reducible      | Add shift change request flow                      |
| 24  | Find someone to cover a shift                  | Group chat, text, phone                  | Shift swaps are not staff-facing in the portal                                       | Bridgeable     | Add chef-approved cover request and visibility     |
| 25  | Tell chef weekly availability                  | Text, spreadsheet, email                 | Staff availability grid exists chef-side under `/staff/availability`, not staff-side | Reducible      | Let staff submit availability in portal            |
| 26  | Track personal reminders for arrival time      | Phone reminders, calendar                | Staff dashboard shows assignments, but no push/calendar reminder surface             | Reducible      | Add notification preferences and reminder delivery |
| 27  | Ask whether assignment was confirmed           | Text, phone                              | Staff sees status badges, but confirmation action is not exposed in staff schedule   | Reducible      | Add "confirm assignment" from schedule             |

---

## Category 5: KITCHEN EXECUTION & HARDWARE

| #   | Scenario                              | Where They Go                           | Why They Leave                                                  | Classification | ChefFlow Could...                                                |
| --- | ------------------------------------- | --------------------------------------- | --------------------------------------------------------------- | -------------- | ---------------------------------------------------------------- |
| 28  | Run active cooking timers             | Phone timer, oven timer, physical timer | ChefFlow is not a hands-free kitchen timer system               | Permanent      | Keep prep timing visible, do not replace timers                  |
| 29  | Use a thermometer or probe app        | Thermometer hardware, vendor app        | Food temperature capture depends on physical tools              | Permanent      | Allow manual temp log or device integration later                |
| 30  | Weigh ingredients during prep         | Scale hardware                          | The station clipboard tracks quantities, not scale readings     | Permanent      | Add printable/large-format prep quantities                       |
| 31  | Scan or print labels                  | Label printer software, kitchen printer | Staff recipes are read-only; label printing is not staff-facing | Bridgeable     | Generate labels from recipe/station data and hand off to printer |
| 32  | Check equipment instructions          | Manufacturer manual, YouTube, chef note | Staff recipe cards do not replace equipment-specific manuals    | Permanent      | Attach equipment notes or SOP links to stations                  |
| 33  | Play music or ambiance during service | Spotify, Apple Music, speaker app       | Not an operations domain                                        | Permanent      | No product expansion needed                                      |

---

## Category 6: RECIPE, SOP & TRAINING REFERENCE

| #   | Scenario                                | Where They Go                              | Why They Leave                                                     | Classification | ChefFlow Could...                                                    |
| --- | --------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------ | -------------- | -------------------------------------------------------------------- |
| 34  | Watch a technique video                 | YouTube, training site                     | Staff recipes expose method text, not full culinary instruction    | Permanent      | Link chef-approved references from recipe cards                      |
| 35  | Translate recipe or instruction text    | Google Translate, phone translate          | Staff portal has no translation/localization surface               | Reducible      | Add preferred language and translation for staff-facing instructions |
| 36  | Ask about a vague prep step             | Phone, text, in-person                     | Read-only recipes do not support inline clarification              | Reducible      | Add comments/questions on recipe cards or station tasks              |
| 37  | Find allergen training or safety policy | ServSafe, state health site, internal docs | Event briefing shows dietary alerts, but not full training library | Bridgeable     | Attach chef-approved SOPs and safety links                           |
| 38  | Look up substitution guidance mid-prep  | Chef, Google, recipe site                  | Staff cannot modify recipes and may need approved substitutions    | Reducible      | Add allowed substitutions from chef/menu context                     |
| 39  | Check company code of conduct or terms  | Staff terms page, HR docs, email           | `staff-terms` is a placeholder and COC acknowledgment is chef-side | Reducible      | Publish staff terms and acknowledgment state in portal               |

---

## Category 7: SUPPLIES, INVENTORY & EMERGENCY PURCHASING

| #   | Scenario                               | Where They Go                          | Why They Leave                                                                   | Classification | ChefFlow Could...                                                    |
| --- | -------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------- |
| 40  | Buy missing ingredient or disposable   | Store app, POS, Amazon, Instacart      | Staff can see station needs, but purchasing is outside staff portal              | Permanent      | Provide approved vendor/store instructions and reimbursement capture |
| 41  | Check store availability               | Store websites, Google, Instacart      | Real-time retail stock is external                                               | Permanent      | Bridge with preferred store links                                    |
| 42  | Photograph a receipt for reimbursement | Camera roll, text, email               | Staff portal has no staff receipt upload for reimbursements                      | Reducible      | Add reimbursement receipt upload tied to assignment                  |
| 43  | Report waste with more context         | Notes app, photo, text                 | Clipboard supports waste quantity/reason/notes but no photo or incident category | Reducible      | Add richer waste evidence and severity                               |
| 44  | Replace broken smallware or equipment  | Amazon, WebstaurantStore, local supply | Procurement is not staff-facing                                                  | Permanent      | Let staff flag broken equipment for chef review                      |

---

## Category 8: ACCOUNT, ACCESS & SUPPORT

| #   | Scenario                             | Where They Go                 | Why They Leave                                                                                 | Classification | ChefFlow Could...                                        |
| --- | ------------------------------------ | ----------------------------- | ---------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------- |
| 45  | Recover a forgotten staff password   | Chef, support, auth email     | Staff login exists, but self-service recovery is not visible on `/staff-login`                 | Reducible      | Add staff-specific password reset and recovery guidance  |
| 46  | Handle revoked or expired token link | Text or call chef             | Token portal displays revoked/expired states and tells staff to contact chef                   | Bridgeable     | Add "request new link" action                            |
| 47  | Report portal bug or issue           | External support, text chef   | Staff layout has a global report button, but urgent recovery still likely leaves               | Bridgeable     | Route bug reports to chef/support with surface context   |
| 48  | Switch to another role/account       | Main sign-in or role switcher | Staff shell has role switcher when multiple roles exist, but identity recovery may be external | Reducible      | Keep role switcher and make current role/account obvious |
| 49  | Read full legal/privacy policies     | Public legal pages, email     | Staff terms are placeholder-level                                                              | Reducible      | Complete staff terms and privacy copy                    |

---

## Category 9: OFFLINE, LOW-SIGNAL & DEVICE BOUNDARIES

| #   | Scenario                           | Where They Go                      | Why They Leave                                                 | Classification | ChefFlow Could...                                              |
| --- | ---------------------------------- | ---------------------------------- | -------------------------------------------------------------- | -------------- | -------------------------------------------------------------- |
| 50  | Work in a kitchen with bad signal  | Paper printout, screenshots, notes | Staff portal depends on web access                             | Bridgeable     | Add offline-friendly printable/event packet                    |
| 51  | Keep a copy of briefing on phone   | Screenshot, PDF, notes             | Staff may not trust link availability during service           | Bridgeable     | Add downloadable mobile packet                                 |
| 52  | Use shared kiosk or kitchen device | Kiosk route, physical clipboard    | Staff auth is individual; shared-device flows are separate     | Bridgeable     | Connect kiosk PIN state to staff portal identity               |
| 53  | Enter data while hands are dirty   | Voice dictation, paper, coworker   | Touchscreen data entry is hard during prep                     | Bridgeable     | Add large controls, voice note capture, and post-shift cleanup |
| 54  | Continue after app error           | Text chef, paper plan              | Staff error boundary can recover UI, but not operational trust | Reducible      | Add resilient retry and cached last briefing                   |

---

## THE PATTERN: Three Types of Staff Exits

### 1. PERMANENT EXITS (ChefFlow should never try to replace these)

External systems with their own ecosystems or physical constraints. ChefFlow's job: reduce friction at the boundary.

- Phone calls and emergency escalation (1, 5)
- Navigation, traffic, rideshare, and transit (9-13)
- Banks, payroll rails, payment apps, tax/labor-law authorities (15-16, 18, 21)
- Kitchen hardware, thermometers, scales, timers, printers, audio apps (28-33)
- Open training/video/manual ecosystems (34, 37)
- Retail purchasing and store availability (40-41, 44)

**Strategy:** Keep link-outs clean, preserve event context, and make return-to-ChefFlow obvious.

### 2. REDUCIBLE EXITS (ChefFlow could eliminate or reduce these)

Staff leave because the portal is read-only in places where staff naturally need to report, confirm, attach, or request.

- Staff-to-chef questions, blocked tasks, and issue comments (2-4, 7)
- Availability, shift changes, confirmation, and calendar sync (22-27)
- Time-entry disputes, pay-history visibility, mileage, and reimbursement receipts (17, 19-20, 42)
- Recipe clarification, translation, substitution, and staff-facing COC/terms (35-36, 38-39, 49)
- Password recovery and runtime resilience (45, 48, 54)

**Strategy:** Add staff-safe request/confirmation surfaces without exposing chef-private data.

### 3. BRIDGEABLE EXITS (Staff will still go external, but ChefFlow can smooth the round-trip)

- Access, parking, and building coordination -> better access fields and escalation capture (6, 11)
- Crew coordination and shift swaps -> event crew thread or chef-approved cover flow (4, 24)
- External documents and compliance -> stored status, signatures, and links (18, 37)
- Token lifecycle -> request-new-link flow from expired/revoked pages (46)
- Offline kitchens -> printable/downloadable staff packets and cached last briefing (50-53)

**Strategy:** Do not pretend staff never leave the kitchen reality. Make every external trip preserve evidence, status, and accountability.

---

## PRIORITY RANKING (By Staff Pain)

**Leaves most often for:**

1. Calling or texting chef for live clarification
2. Opening maps for navigation and arrival logistics
3. Checking personal calendar and requesting shift changes
4. Clock/pay questions after the shift
5. Recipe, SOP, and substitution clarification
6. Reporting photos, receipts, equipment problems, and waste context
7. Working around low-signal kitchens with screenshots or paper

**Highest-value reducible gaps:**

1. Staff comments/questions on tasks, assignments, and station entries
2. Staff availability, shift-change, and assignment-confirmation workflows
3. Staff pay/time correction visibility
4. Photo/receipt upload from station and event briefing contexts
5. Staff-facing legal/COC/training document status
6. Downloadable or offline-friendly event packet

**Staff product boundary:**

ChefFlow should be the operational source of truth for what staff need to do, when they need to show up, what they must know for safety, what they completed, and what time they worked. It should not become maps, payroll rails, government compliance, kitchen hardware, or general culinary education.
