# Everything a Public Guest Never Needs to Leave ChefFlow For

> **Purpose:** The inverse of `guest-exit-points-analysis.md`. Every workflow an anonymous
> public visitor, invited guest token user, no-login household participant, or Dinner Circle
> participant can complete inside ChefFlow from start to finish, no outside tool required.
>
> **Codebase grounding:** `lib/auth/route-policy.ts` public unauthenticated routes, public route
> coverage tests, `app/(public)` pages, `lib/sharing/actions.ts`, menu/catalog token actions,
> proposal/tip/review/feedback actions, hub and Dinner Circle public routes, and public surface
> navigation config.
>
> **Date:** 2026-05-25

---

## Guest Role Split

| Role State                               | In-App Completion Model                                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Anonymous public visitor                 | Can browse ChefFlow public surfaces, learn, search, compare, submit booking/contact/guest lead forms, and discover Dinner Circles.               |
| Invited guest token user                 | Can open token links, RSVP, edit details, submit dietary/menu/feedback/review/tip/proposal actions, and return through guest or share tokens.    |
| No-login household or circle participant | Can join a Circle, get a profile token/cookie, chat, browse group context, manage simple preferences, and recover access without a full account. |

---

## Category 1: PUBLIC DISCOVERY & ORIENTATION

| #   | What They Do Entirely In-App                                            |
| --- | ----------------------------------------------------------------------- |
| 1   | Land on the public homepage                                             |
| 2   | Browse the main "Hire a Chef" public navigation                         |
| 3   | Open `/eat` consumer discovery                                          |
| 4   | Browse public chef directory results at `/chefs`                        |
| 5   | Search and filter chef directory pages                                  |
| 6   | Open a chef public profile                                              |
| 7   | View chef service, package, menu, and proof sections when exposed       |
| 8   | Browse service pages                                                    |
| 9   | Browse cuisine pages                                                    |
| 10  | Read how ChefFlow works                                                 |
| 11  | Read trust and safety pages                                             |
| 12  | Read FAQ and legal pages                                                |
| 13  | Use public secondary entry links to continue browsing without dead ends |

---

## Category 2: PUBLIC BOOKING, INQUIRY & LEAD CAPTURE

| #   | What They Do Entirely In-App                                       |
| --- | ------------------------------------------------------------------ |
| 14  | Start a general booking request at `/book`                         |
| 15  | Submit event type, date, guest count, budget, and location context |
| 16  | Submit dietary requirements during booking intake                  |
| 17  | Request a specific chef from a chef profile                        |
| 18  | Submit a single-chef inquiry from `/chef/[slug]/inquire`           |
| 19  | Use location-specific chef booking or inquiry routes               |
| 20  | Submit contact questions through the public contact page           |
| 21  | Submit a guest lead from `/g/[code]` after scanning an event QR    |
| 22  | Move from guest lead success to the chef profile                   |
| 23  | Move from guest lead success to a prefilled inquiry                |
| 24  | Browse all chefs after a guest lead submission                     |
| 25  | Track public booking status from a booking token                   |

---

## Category 3: EVENT SHARE PAGE & RSVP

| #   | What They Do Entirely In-App                            |
| --- | ------------------------------------------------------- |
| 26  | Open a private event share page from `/share/[token]`   |
| 27  | View host/chef-controlled event details                 |
| 28  | View date, time, arrival time, and timezone when shared |
| 29  | View location and location notes when shared            |
| 30  | View guest count and service style when shared          |
| 31  | View public menu summary when shared                    |
| 32  | View dietary information visible to guests              |
| 33  | View guest list and RSVP status when shared             |
| 34  | Submit an RSVP as attending, maybe, or declined         |
| 35  | Add name and email to an RSVP                           |
| 36  | Add dietary restrictions during RSVP                    |
| 37  | Add allergies during RSVP                               |
| 38  | Add guest notes during RSVP                             |
| 39  | Add plus-one details when allowed                       |
| 40  | Add plus-one allergies and dietary notes                |
| 41  | Give photo consent                                      |
| 42  | Give data-processing consent                            |
| 43  | Opt into marketing updates when offered                 |
| 44  | Update an RSVP from the same browser cookie             |
| 45  | Handle RSVP waitlist state when capacity is full        |
| 46  | Open the guest portal after RSVP                        |
| 47  | Request a resend link from the share page               |

---

## Category 4: GUEST EVENT PORTAL

| #   | What They Do Entirely In-App                                         |
| --- | -------------------------------------------------------------------- |
| 48  | Open `/event/[eventId]/guest/[secureToken]` without login            |
| 49  | See cancelled, expired, revoked, or invalid link states              |
| 50  | View event title, occasion, host, date, serve time, and arrival time |
| 51  | View host message                                                    |
| 52  | View menu when finalized                                             |
| 53  | View dish course, description, dietary tags, and allergen flags      |
| 54  | Submit or update RSVP status                                         |
| 55  | Confirm full name                                                    |
| 56  | Add dietary notes                                                    |
| 57  | Add accessibility notes                                              |
| 58  | Add menu preference notes                                            |
| 59  | Add additional guest notes                                           |
| 60  | Confirm final attendance                                             |
| 61  | Complete optional cannabis intake when event settings require it     |
| 62  | Confirm age for cannabis-enabled events                              |
| 63  | Set cannabis participation preference                                |
| 64  | Add familiarity and consumption method details                       |
| 65  | Confirm cannabis acknowledgments                                     |
| 66  | View pre-event content published to guests                           |
| 67  | View shared guest documents                                          |
| 68  | Open published document links from the portal                        |
| 69  | Message the chef from the guest portal                               |
| 70  | Save "about me" context for the chef                                 |

---

## Category 5: DIETARY CONFIRMATION & PRE-SERVICE WORKSHEETS

| #   | What They Do Entirely In-App                       |
| --- | -------------------------------------------------- |
| 71  | Open `/dietary-confirm/[token]`                    |
| 72  | View prefilled guest dietary information           |
| 73  | Select common dietary restrictions                 |
| 74  | Enter allergies as structured text                 |
| 75  | Set allergy severity                               |
| 76  | Set spice tolerance                                |
| 77  | Add dietary notes                                  |
| 78  | Submit dietary confirmation                        |
| 79  | See already-responded state                        |
| 80  | See expired or invalid dietary link state          |
| 81  | Open `/worksheet/[token]`                          |
| 82  | Review chef note and event date on worksheet       |
| 83  | Submit name, email, and phone                      |
| 84  | Submit guest count                                 |
| 85  | Submit event address                               |
| 86  | Submit dietary restrictions and allergies          |
| 87  | Submit food preferences                            |
| 88  | Submit special requests                            |
| 89  | See worksheet completed state                      |
| 90  | Move from worksheet to chef profile when available |

---

## Category 6: MENU & CATALOG CHOICE

| #   | What They Do Entirely In-App                                   |
| --- | -------------------------------------------------------------- |
| 91  | Open `/menu-pick/[token]` without login                        |
| 92  | View chef name and event occasion on menu picker               |
| 93  | Browse dishes grouped by course                                |
| 94  | Select one or more dishes                                      |
| 95  | Enter picker name                                              |
| 96  | Add optional notes for the chef                                |
| 97  | Submit menu selections                                         |
| 98  | See submitted menu-pick success state                          |
| 99  | Open `/catalog-pick/[token]` without login                     |
| 100 | View catalog description and event context                     |
| 101 | Browse catalog items grouped by course                         |
| 102 | See dietary tags on catalog dishes                             |
| 103 | Select one or more catalog courses                             |
| 104 | Add catalog notes for allergies, dietary needs, or preferences |
| 105 | Submit catalog picks                                           |
| 106 | See submitted catalog success state                            |

---

## Category 7: PUBLIC EVENT, TICKETS & OPEN TABLES

| #   | What They Do Entirely In-App                                         |
| --- | -------------------------------------------------------------------- |
| 107 | Open `/e/[shareToken]` public ticketed event pages                   |
| 108 | View public event title, story, date, and location text when enabled |
| 109 | View ticket types, prices, capacities, and remaining counts          |
| 110 | Select a ticket type                                                 |
| 111 | Choose ticket quantity                                               |
| 112 | Enter buyer name, email, and phone                                   |
| 113 | Add dietary and allergy context for ticket purchase                  |
| 114 | Add buyer notes                                                      |
| 115 | Join the waitlist when tickets are unavailable                       |
| 116 | Submit vendor/collaborator interest for a public event               |
| 117 | View ticket confirmation state after successful return               |
| 118 | View ticket QR code after purchase return                            |
| 119 | Open the linked Dinner Circle after purchase                         |
| 120 | Browse `/hub/open-tables`                                            |
| 121 | Search open tables by area                                           |
| 122 | Filter open tables by vibe                                           |
| 123 | Request to join an open table through the join flow                  |

---

## Category 8: DINNER CIRCLES & COMMUNITY HUB

| #   | What They Do Entirely In-App                          |
| --- | ----------------------------------------------------- |
| 124 | Open `/hub` and learn what Dinner Circles are         |
| 125 | Browse `/hub/circles` community circles               |
| 126 | Search public circles by query                        |
| 127 | Filter public circles by topic                        |
| 128 | Load more public circle results                       |
| 129 | Open a public Circle at `/hub/g/[groupToken]`         |
| 130 | View public Circle name, members, and visible context |
| 131 | See a join prompt when not yet a member               |
| 132 | Request access recovery from a Circle page            |
| 133 | Join a Circle from `/hub/join/[groupToken]`           |
| 134 | Join via QR token from `/join/[token]`                |
| 135 | Enter name and optional email/phone for quick join    |
| 136 | Add initial allergy/dietary context while joining     |
| 137 | Store `hub_profile_token` cookie for return access    |
| 138 | Open `/hub/me/[profileToken]` profile view            |
| 139 | View groups associated with a profile token           |
| 140 | View profile event history                            |
| 141 | View upcoming events for the profile                  |
| 142 | View unread group counts                              |

---

## Category 9: CIRCLE PARTICIPATION

| #   | What They Do Entirely In-App                                   |
| --- | -------------------------------------------------------------- |
| 143 | Read Circle chat                                               |
| 144 | Post to Circle chat when member permissions allow              |
| 145 | Use private guest chat when profile token and membership allow |
| 146 | Browse Circle member list                                      |
| 147 | Browse Circle photos                                           |
| 148 | Upload or view Circle media where permitted                    |
| 149 | Browse pinned notes                                            |
| 150 | Search Circle messages                                         |
| 151 | View meal board entries                                        |
| 152 | Use shared dinner planning panel                               |
| 153 | View household dietary summary                                 |
| 154 | View event plan/layout tabs when configured                    |
| 155 | View event lifecycle status for linked event circles           |
| 156 | View chef proof data shown in Circle                           |
| 157 | View RSVP summary in Circle                                    |
| 158 | View notification preferences                                  |
| 159 | Mute or unmute Circle notifications                            |
| 160 | Open profile from Circle header                                |
| 161 | Copy or open invite links when allowed                         |

---

## Category 10: GUEST WALL, PHOTOS & INVITES

| #   | What They Do Entirely In-App                    |
| --- | ----------------------------------------------- |
| 162 | Read guest wall messages on `/share/[token]`    |
| 163 | Post a guest wall message                       |
| 164 | Add quick emoji to guest wall message           |
| 165 | View pinned guest messages                      |
| 166 | Browse guest photo gallery                      |
| 167 | Upload an event photo                           |
| 168 | Add photo caption                               |
| 169 | Open photo lightbox                             |
| 170 | Create a viewer link from guest share controls  |
| 171 | Create a guest invite from guest share controls |
| 172 | Copy generated viewer or guest invite link      |
| 173 | Open generated guest portal link                |
| 174 | Open own guest portal from invite controls      |

---

## Category 11: FEEDBACK, REVIEWS, TIPS & RECAPS

| #   | What They Do Entirely In-App                       |
| --- | -------------------------------------------------- |
| 175 | Open `/feedback/[token]` post-event survey         |
| 176 | Submit post-event survey answers                   |
| 177 | See already-completed feedback state               |
| 178 | Open `/guest-feedback/[token]` guest feedback form |
| 179 | Rate overall experience                            |
| 180 | Rate food quality                                  |
| 181 | Rate atmosphere/service                            |
| 182 | Submit dish-level sentiment                        |
| 183 | Submit dish-level rating and comments              |
| 184 | Add highlights and improvement suggestions         |
| 185 | Consent to testimonial use                         |
| 186 | Open `/review/[token]`                             |
| 187 | Submit star rating                                 |
| 188 | Submit written review                              |
| 189 | Choose display name                                |
| 190 | Allow or deny public display                       |
| 191 | Open `/tip/[token]`                                |
| 192 | Select suggested tip amount                        |
| 193 | Enter custom tip amount                            |
| 194 | Select tip method as card, cash, Venmo, or other   |
| 195 | Add optional tip note                              |
| 196 | See completed or declined tip state                |
| 197 | Open `/share/[token]/recap`                        |
| 198 | View recap menu highlights                         |
| 199 | View recap guest messages                          |
| 200 | View recap photos                                  |
| 201 | Submit a recap testimonial                         |

---

## Category 12: PROPOSALS, QUOTES & POST-ACTION PATHS

| #   | What They Do Entirely In-App                                          |
| --- | --------------------------------------------------------------------- |
| 202 | Open `/proposal/[token]`                                              |
| 203 | View proposal title, cover photo, and personal note                   |
| 204 | View chef and business context                                        |
| 205 | View menu proposal and dish grouping                                  |
| 206 | View selected add-ons                                                 |
| 207 | View subtotal, add-on total, total, and per-guest price               |
| 208 | Approve proposal                                                      |
| 209 | Decline proposal                                                      |
| 210 | Add optional decline reason                                           |
| 211 | See approved terminal state                                           |
| 212 | See declined terminal state                                           |
| 213 | See expired terminal state                                            |
| 214 | Open chef profile from proposal footer                                |
| 215 | Start "book again" path from proposal footer                          |
| 216 | Use post-action footers on feedback, review, tip, and worksheet pages |
| 217 | Move from guest feedback to chef inquiry with source context          |
| 218 | Move from review or tip page to chef profile                          |
| 219 | Follow "Powered by ChefFlow" links from public token pages            |

---

## THE PATTERN: What Guests Can Finish Without Leaving

### 1. TOKENIZED MICRO-WORKFLOWS

Guest actions work best when each token page has one clear job:

- RSVP and guest portal updates (26-70)
- Dietary confirmation and worksheet intake (71-90)
- Menu and catalog picking (91-106)
- Feedback, review, tip, and proposal responses (175-219)

**Product rule:** Preserve token continuity, keep forms short, and give a clear terminal state.

### 2. NO-LOGIN RELATIONSHIP WORKFLOWS

The hub/Circle code supports lightweight participation without full client account creation:

- Join Circle by group token or QR token (133-137)
- Return by profile token/cookie (138-142)
- Chat, private chat, photos, notes, meal board, plan, and notifications (143-161)

**Product rule:** Treat profile tokens as a durable no-login identity layer, not a throwaway form key.

### 3. PUBLIC DISCOVERY TO ACTION

Anonymous visitors can complete meaningful action before authentication:

- Browse, search, compare, and learn (1-13)
- Submit booking, inquiry, contact, and guest-lead forms (14-25)
- Browse public Circles and open tables (120-129)

**Product rule:** Do not force account creation until the user needs ownership, persistence, or private account controls.

---

## Priority Gaps

| Priority | Gap                                                                               | Why It Matters                                                                              | Candidate Fix                                                                                                       |
| -------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| P0       | Calendar and arrival workflows are stronger on `/e` than `/share` or guest portal | Invited dinner guests need the same add-to-calendar and arrival clarity as ticket buyers    | Reuse public event calendar/address handoff components on share and guest portal surfaces                           |
| P0       | Token/profile recovery is not a single guest pattern                              | Lost links break no-login value                                                             | Standardize resend/recover link UI across guest portal, share, hub, dietary, worksheet, menu-pick, and catalog-pick |
| P1       | Guest post-action paths are useful but scattered                                  | Review, feedback, tip, worksheet, and proposal pages each have different next-step clusters | Create a shared guest post-action component with chef profile, book again, recap, review, tip, and support slots    |
| P1       | Menu/catalog pickers can collect choices but not deeply educate                   | Unfamiliar dishes push guests to search externally                                          | Add dish photo, allergen, ingredient, and chef-note display to pickers                                              |
| P1       | Circle access state is powerful but opaque                                        | Anonymous viewer vs member vs recovered profile token changes what the user can do          | Add access-state explanation and one-click recovery/join prompts                                                    |
| P2       | Public discovery and guest-token conversion are under-connected                   | A guest at dinner can become a future client through several separate routes                | Normalize guest lead source, source event, chef slug, and prefill handling                                          |
| P2       | Health and allergy boundaries need consistent wording                             | Guests can submit sensitive dietary/cannabis data without login                             | Add shared safety/privacy copy and escalation route to all sensitive guest forms                                    |
