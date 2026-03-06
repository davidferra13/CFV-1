# ChefFlow Demo Video Library

> Master list of every demo video that can be produced for ChefFlow.
> Each video is a 30-90 second scripted Playwright walkthrough with animated cursor, recorded as MP4.
> Status: `ready` (script written), `recorded` (MP4 exists), `published` (live on platform), or blank (not started).

---

## Format Presets

| Preset    | Resolution | Aspect | Use                                     |
| --------- | ---------- | ------ | --------------------------------------- |
| `tiktok`  | 1080x1920  | 9:16   | TikTok, Instagram Reels, YouTube Shorts |
| `youtube` | 1920x1080  | 16:9   | YouTube, website embeds                 |
| `square`  | 1080x1080  | 1:1    | Instagram feed, LinkedIn                |

---

## 1. PUBLIC WEBSITE (9 videos)

Anyone visiting cheflowhq.com. No login needed.

| #   | ID                 | Title               | Description                                                 | Status |
| --- | ------------------ | ------------------- | ----------------------------------------------------------- | ------ |
| 1   | `pub-landing`      | What is ChefFlow?   | Landing page hero, scroll through value props, CTA          |        |
| 2   | `pub-pricing`      | Free vs Pro         | Pricing page, tier comparison, feature breakdown            |        |
| 3   | `pub-marketplace`  | Find a Private Chef | Chef directory, browse profiles, filter by location         |        |
| 4   | `pub-chef-profile` | Chef Profile Page   | Public chef page: bio, specialties, reviews, inquiry button |        |
| 5   | `pub-compare`      | How We Compare      | Compare page: ChefFlow vs other platforms                   |        |
| 6   | `pub-trust`        | Trust and Safety    | Trust page, privacy policy, security overview               |        |
| 7   | `pub-faq`          | Common Questions    | FAQ page walkthrough                                        |        |
| 8   | `pub-blog`         | The Blog            | Blog listing, open a post, read                             |        |
| 9   | `pub-beta`         | Join the Beta       | Beta signup page, application form, thank you               |        |

---

## 2. BOOKING FLOW (6 videos)

How clients find and book a chef. No account required.

| #   | ID                    | Title                     | Description                                                     | Status |
| --- | --------------------- | ------------------------- | --------------------------------------------------------------- | ------ |
| 10  | `book-direct`         | Book a Private Chef       | `/book/[chefSlug]` public booking page, fill inquiry            |        |
| 11  | `book-campaign`       | Campaign Landing Page     | `/book/campaign/[token]` custom marketing page                  |        |
| 12  | `book-embed`          | The Embeddable Widget     | Chef embeds inquiry form on their own site, client fills it out |        |
| 13  | `book-inquire`        | Submit an Inquiry         | `/chef/[slug]/inquire` branded inquiry form                     |        |
| 14  | `book-gift`           | Buy a Gift Card           | `/chef/[slug]/gift-cards` purchase flow, success page           |        |
| 15  | `book-partner-signup` | Become a Referral Partner | `/partner-signup` partner application                           |        |

---

## 3. CLIENT PORTAL (21 videos)

What clients see after they have an account. Authenticated experience.

| #   | ID                    | Title                 | Description                                                 | Status |
| --- | --------------------- | --------------------- | ----------------------------------------------------------- | ------ |
| 16  | `client-dashboard`    | Your Client Dashboard | My Events list, upcoming dinners at a glance                |        |
| 17  | `client-event-detail` | Your Event            | `/my-events/[id]` date, menu, location, details             |        |
| 18  | `client-proposal`     | Review a Proposal     | `/my-events/[id]/proposal` see the quote, accept or decline |        |
| 19  | `client-approve-menu` | Approve the Menu      | `/my-events/[id]/approve-menu` review dishes, sign off      |        |
| 20  | `client-choose-menu`  | Choose Your Menu      | `/my-events/[id]/choose-menu` pick from menu options        |        |
| 21  | `client-pay`          | Pay Your Chef         | `/my-events/[id]/pay` Stripe payment flow                   |        |
| 22  | `client-invoice`      | Your Invoice          | `/my-events/[id]/invoice` view and download                 |        |
| 23  | `client-payment-plan` | Payment Plans         | `/my-events/[id]/payment-plan` installment schedule         |        |
| 24  | `client-checklist`    | Pre-Event Checklist   | `/my-events/[id]/pre-event-checklist` prep at home          |        |
| 25  | `client-countdown`    | Event Countdown       | `/my-events/[id]/countdown` excitement builder              |        |
| 26  | `client-contract`     | Your Contract         | `/my-events/[id]/contract` review and sign                  |        |
| 27  | `client-summary`      | Event Summary         | `/my-events/[id]/event-summary` post-event recap            |        |
| 28  | `client-spending`     | Your Spending History | `/my-spending` total spend across all events                |        |
| 29  | `client-rewards`      | Your Loyalty Rewards  | `/my-rewards` tier, points, available rewards               |        |
| 30  | `client-chat`         | Chat with Your Chef   | `/my-chat` direct messaging                                 |        |
| 31  | `client-profile`      | Your Profile          | `/my-profile` dietary preferences, allergies, contact info  |        |
| 32  | `client-feedback`     | Leave Feedback        | `/survey/[token]` post-event satisfaction survey            |        |
| 33  | `client-rebook`       | Book Again            | `/book-now` quick re-booking                                |        |
| 34  | `client-quotes`       | Your Quotes           | `/my-quotes` view and compare active quotes                 |        |
| 35  | `client-inquiries`    | Your Inquiries        | `/my-inquiries` track inquiry status                        |        |
| 36  | `client-cannabis`     | Cannabis Menu         | `/my-cannabis` cannabis-infused event options               |        |

---

## 4. THE HUB (10 videos)

Social and group features. Mix of client-authenticated and public-link access.

| #   | ID                  | Title                   | Description                                                    | Status |
| --- | ------------------- | ----------------------- | -------------------------------------------------------------- | ------ |
| 37  | `hub-landing`       | What is The Hub?        | Hub landing page, overview of social features                  |        |
| 38  | `hub-create`        | Create a Group          | `/my-hub/create` start a dinner group                          |        |
| 39  | `hub-join`          | Join a Group            | `/hub/join/[token]` accept an invitation                       |        |
| 40  | `hub-group`         | Group Chat and Planning | `/hub/g/[groupToken]` feed, messages, availability grid, notes |        |
| 41  | `hub-friends`       | Find Your Friends       | `/my-hub/friends` friend list, connections                     |        |
| 42  | `hub-invite`        | Invite Friends          | `/my-hub/friends/invite/[token]` send invitations              |        |
| 43  | `hub-share-chef`    | Share Your Chef         | `/my-hub/share-chef` refer your chef to friends                |        |
| 44  | `hub-notifications` | Hub Notifications       | `/my-hub/notifications` activity feed                          |        |
| 45  | `hub-profile`       | Your Public Profile     | `/hub/me/[profileToken]` what others see                       |        |
| 46  | `hub-client-group`  | Client Group View       | `/my-hub/g/[groupToken]` authenticated group experience        |        |

---

## 5. GUEST EXPERIENCE (5 videos)

People invited to an event. No account, just a link.

| #   | ID                   | Title           | Description                                                   | Status |
| --- | -------------------- | --------------- | ------------------------------------------------------------- | ------ |
| 47  | `guest-rsvp`         | You're Invited  | `/event/[id]/guest/[token]` RSVP, dietary form, photo consent |        |
| 48  | `guest-availability` | Pick Your Dates | `/availability/[token]` vote on available dates               |        |
| 49  | `guest-recap`        | Event Recap     | `/share/[token]/recap` post-dinner photos, thank you          |        |
| 50  | `guest-shared`       | Shared Content  | `/view/[token]` generic shared page (menus, info)             |        |
| 51  | `guest-worksheet`    | The Worksheet   | `/worksheet/[token]` pre-event planning details               |        |

---

## 6. PARTNER PORTAL (6 videos)

Referral partners, venues, and event planners.

| #   | ID                  | Title                | Description                                           | Status |
| --- | ------------------- | -------------------- | ----------------------------------------------------- | ------ |
| 52  | `partner-dashboard` | Partner Dashboard    | Overview, referral stats, earnings                    |        |
| 53  | `partner-profile`   | Your Partner Profile | Set up listing, description, specialties              |        |
| 54  | `partner-events`    | Your Referral Events | Events that came through your referrals               |        |
| 55  | `partner-locations` | Manage Locations     | Add/edit venue and location listings                  |        |
| 56  | `partner-preview`   | Preview Your Listing | See how clients see your partner page                 |        |
| 57  | `partner-report`    | Performance Report   | `/partner-report/[token]` detailed referral analytics |        |

---

## 7. STAFF PORTAL (6 videos)

Kitchen staff and assistants. Simplified interface for day-of ops.

| #   | ID                | Title                | Description                                     | Status |
| --- | ----------------- | -------------------- | ----------------------------------------------- | ------ |
| 58  | `staff-login`     | Staff Login          | `/staff-login` separate login for staff members |        |
| 59  | `staff-dashboard` | Staff Dashboard      | Overview of assigned events and tasks           |        |
| 60  | `staff-tasks`     | Your Tasks           | Task list with check-off, priority, deadlines   |        |
| 61  | `staff-schedule`  | Your Schedule        | Upcoming events and shifts                      |        |
| 62  | `staff-station`   | Kitchen Station      | Station assignments, course tracking            |        |
| 63  | `staff-time`      | Clock In / Clock Out | Time tracking for staff hours                   |        |
| 64  | `staff-recipes`   | Staff Recipe Access  | View assigned recipes (read-only)               |        |

---

## 8. CHEF PORTAL - GETTING STARTED (5 videos)

First-time chef experience and onboarding.

| #   | ID                    | Title                    | Description                                                   | Status |
| --- | --------------------- | ------------------------ | ------------------------------------------------------------- | ------ |
| 65  | `chef-command-center` | Your Command Center      | Dashboard tour: greeting, widgets, week strip, priority queue |        |
| 66  | `chef-signup`         | Sign Up in 60 Seconds    | Landing, pricing, create account                              |        |
| 67  | `chef-profile-setup`  | Set Up Your Profile      | Settings, photo, business info, branding                      |        |
| 68  | `chef-import`         | Import Your Clients      | CSV import, manual add, brain dump                            |        |
| 69  | `chef-onboarding`     | The Onboarding Checklist | Walk through all 5 setup steps                                |        |

---

## 9. CHEF PORTAL - THE CORE LOOP (9 videos)

The primary workflow: inquiry to close-out.

| #   | ID                    | Title                    | Description                                                | Status |
| --- | --------------------- | ------------------------ | ---------------------------------------------------------- | ------ |
| 70  | `chef-full-lifecycle` | Inquiry to Invoice       | Full lifecycle: inquiry, lead score, event, quote, payment |        |
| 71  | `chef-create-event`   | Create an Event          | New event form: client, date, location, guests             |        |
| 72  | `chef-build-quote`    | Build a Quote            | Line items, deposit %, preview, send                       |        |
| 73  | `chef-8-states`       | The 8 States of an Event | FSM transitions: draft to completed                        |        |
| 74  | `chef-close-out`      | Close Out an Event       | 5-step wizard: tip, receipts, mileage, reflection, close   |        |
| 75  | `chef-invoice`        | Send an Invoice          | Invoice page, PDF, email to client                         |        |
| 76  | `chef-record-payment` | Record a Payment         | Payment modal, method, confirmation                        |        |
| 77  | `chef-kanban`         | The Event Board          | Kanban view, drag events between status columns            |        |
| 78  | `chef-event-detail`   | Event Deep Dive          | 4-tab event detail: Overview, Money, Ops, Wrap-Up          |        |

---

## 10. CHEF PORTAL - CLIENTS (7 videos)

Client relationship management.

| #   | ID                     | Title                              | Description                                                 | Status |
| --- | ---------------------- | ---------------------------------- | ----------------------------------------------------------- | ------ |
| 79  | `chef-know-client`     | Know Your Client                   | Client detail: 30 panels of intelligence                    |        |
| 80  | `chef-dietary`         | Dietary Restrictions and Allergies | Adding allergies, severity, how they surface on events      |        |
| 81  | `chef-loyalty`         | Client Loyalty Program             | Tiers, points, rewards, redemptions                         |        |
| 82  | `chef-kitchen-profile` | Kitchen Profiles                   | Log a client's kitchen: oven, burners, counter, constraints |        |
| 83  | `chef-birthdays`       | Never Forget a Birthday            | Demographics, milestones, upcoming occasions widget         |        |
| 84  | `chef-segments`        | Client Segments                    | Build custom filter rules, save segments                    |        |
| 85  | `chef-gift-cards`      | Issue Gift Cards                   | Create, send, track gift cards and vouchers                 |        |

---

## 11. CHEF PORTAL - CULINARY (5 videos)

Recipe book, menus, food costing.

| #   | ID                | Title                    | Description                                              | Status |
| --- | ----------------- | ------------------------ | -------------------------------------------------------- | ------ |
| 86  | `chef-recipes`    | Your Recipe Book         | Add a recipe, ingredients, method, costing               |        |
| 87  | `chef-build-menu` | Build a Menu             | Menu editor, add courses, assign recipes                 |        |
| 88  | `chef-food-cost`  | Food Cost Breakdown      | Per-recipe cost, per-event %, trend chart                |        |
| 89  | `chef-grocery`    | Grocery Price Comparison | Multi-vendor: USDA, Kroger, Spoonacular, Instacart       |        |
| 90  | `chef-prep`       | Prep Planning            | Prep timeline, task assignments, prep blocks on calendar |        |

---

## 12. CHEF PORTAL - DAY OF EVENT (7 videos)

Everything for execution day.

| #   | ID                   | Title                  | Description                                                    | Status |
| --- | -------------------- | ---------------------- | -------------------------------------------------------------- | ------ |
| 91  | `chef-dop`           | The Day-of Plan        | DOP timeline, task checklist, mobile view                      |        |
| 92  | `chef-packing`       | Packing List           | 5-section checklist, tap to check, car packed                  |        |
| 93  | `chef-travel`        | Travel Planning        | Route stops, travel legs, ingredient sourcing                  |        |
| 94  | `chef-kds`           | Kitchen Display System | KDS: fire, plating, served progression                         |        |
| 95  | `chef-temp-log`      | Temperature Logging    | Food safety temp entries, anomaly detection                    |        |
| 96  | `chef-time-tracking` | Time Tracking          | Start/stop timers: shopping, prep, packing, driving, execution |        |
| 97  | `chef-contingency`   | Contingency Plans      | Emergency scenarios, contacts, AI suggestions                  |        |

---

## 13. CHEF PORTAL - FINANCIALS (7 videos)

Money management and reporting.

| #   | ID                   | Title                    | Description                                              | Status |
| --- | -------------------- | ------------------------ | -------------------------------------------------------- | ------ |
| 98  | `chef-finance-dash`  | Your Financial Dashboard | Revenue, expenses, profit, margins at a glance           |        |
| 99  | `chef-ledger`        | The Ledger               | Immutable append-only ledger, every dollar tracked       |        |
| 100 | `chef-expenses`      | Expense Tracking         | Add expenses, categories, receipt upload, OCR            |        |
| 101 | `chef-tax`           | Tax Center               | Tax-ready reporting, mileage deductions, categories      |        |
| 102 | `chef-goals`         | Revenue Goals            | Set monthly/yearly goals, track progress, dinners needed |        |
| 103 | `chef-split-billing` | Split Billing            | Divide event costs across multiple payers                |        |
| 104 | `chef-payroll`       | Payroll                  | Staff payment tracking                                   |        |

---

## 14. CHEF PORTAL - CALENDAR (3 videos)

Scheduling and availability.

| #   | ID                 | Title           | Description                                       | Status |
| --- | ------------------ | --------------- | ------------------------------------------------- | ------ |
| 105 | `chef-calendar`    | Visual Calendar | Month/week/day views, event blocks, color coding  |        |
| 106 | `chef-gaps`        | Scheduling Gaps | How the system warns about availability conflicts |        |
| 107 | `chef-prep-blocks` | Prep Blocks     | Schedule prep time before events on calendar      |        |

---

## 15. CHEF PORTAL - AI FEATURES (5 videos)

Remy and AI-powered tools.

| #   | ID                 | Title                   | Description                                               | Status |
| --- | ------------------ | ----------------------- | --------------------------------------------------------- | ------ |
| 108 | `chef-remy`        | Meet Remy               | Open AI drawer, ask a question, get business intelligence |        |
| 109 | `chef-ai-insights` | AI Business Insights    | Health score, domain breakdown, recommendations           |        |
| 110 | `chef-ai-contract` | AI Contract Generator   | Generate service contract from event details              |        |
| 111 | `chef-brain-dump`  | Brain Dump              | Paste unstructured notes, AI extracts structure           |        |
| 112 | `chef-ai-pricing`  | AI Pricing Intelligence | Market-aware pricing suggestions on quotes                |        |

---

## 16. CHEF PORTAL - COMMUNICATION (4 videos)

Client messaging, follow-ups, outreach.

| #   | ID                     | Title                | Description                                     | Status |
| --- | ---------------------- | -------------------- | ----------------------------------------------- | ------ |
| 113 | `chef-messaging`       | Client Communication | Message thread, channel selection, templates    |        |
| 114 | `chef-follow-ups`      | Follow-Up Reminders  | Overdue follow-ups, SLA tracking, response time |        |
| 115 | `chef-holiday`         | Holiday Outreach     | AI-drafted outreach, promo codes, bulk send     |        |
| 116 | `chef-direct-outreach` | Direct Outreach      | Email/SMS compose from client profile           |        |

---

## 17. CHEF PORTAL - INQUIRY PIPELINE (6 videos)

Lead management and conversion.

| #   | ID                    | Title              | Description                              | Status |
| --- | --------------------- | ------------------ | ---------------------------------------- | ------ |
| 117 | `chef-inquiries`      | Inquiry Pipeline   | List view, lead scores, status filters   |        |
| 118 | `chef-inquiry-detail` | Inquiry Detail     | Lead score, timeline, conversion actions |        |
| 119 | `chef-leads`          | Lead Management    | Lead tracking, scoring, follow-up        |        |
| 120 | `chef-calls`          | Calls and Meetings | Schedule, log, track consultation calls  |        |
| 121 | `chef-proposals`      | Proposals          | Create and send professional proposals   |        |
| 122 | `chef-testimonials`   | Testimonials       | Collect and manage client testimonials   |        |

---

## 18. CHEF PORTAL - ADVANCED (10 videos)

Power features and deep tools.

| #   | ID                  | Title                     | Description                                          | Status |
| --- | ------------------- | ------------------------- | ---------------------------------------------------- | ------ |
| 123 | `chef-embed-setup`  | Embeddable Widget Setup   | Configure and embed inquiry form on any website      |        |
| 124 | `chef-queue`        | The Priority Queue        | What to do next, urgency ranking                     |        |
| 125 | `chef-aar`          | After Action Review       | Rate event, log what went well/wrong, track patterns |        |
| 126 | `chef-collab`       | Chef Collaboration        | Invite other chefs, assign roles                     |        |
| 127 | `chef-analytics`    | Business Analytics        | Booking seasons, YoY, top clients, trends            |        |
| 128 | `chef-intelligence` | Business Intelligence Hub | 25-engine health score, proactive alerts             |        |
| 129 | `chef-documents`    | Documents and Contracts   | Printable PDFs, contract management                  |        |
| 130 | `chef-staff`        | Staff Management          | Add staff, assign to events, log hours               |        |
| 131 | `chef-debrief`      | Post-Dinner Debrief       | Dish gallery, recipe notes, client insights          |        |
| 132 | `chef-guests`       | Guest Management          | RSVPs, dietary collection, guest pipeline            |        |

---

## 19. CHEF PORTAL - SETTINGS (4 videos)

Configuration and customization.

| #   | ID                  | Title                | Description                                  | Status |
| --- | ------------------- | -------------------- | -------------------------------------------- | ------ |
| 133 | `chef-settings`     | Settings Overview    | All settings categories                      |        |
| 134 | `chef-modules`      | Module Toggles       | Enable/disable Pro features, freemium system |        |
| 135 | `chef-embed-config` | Widget Configuration | Embed settings, branding, form fields        |        |
| 136 | `chef-journal`      | Chef Journal         | Career growth tracking, reflections          |        |

---

## 20. CHEF PORTAL - MARKETING (3 videos)

Outbound marketing and campaigns.

| #   | ID               | Title               | Description                                   | Status |
| --- | ---------------- | ------------------- | --------------------------------------------- | ------ |
| 137 | `chef-campaigns` | Marketing Campaigns | Create and manage outreach campaigns          |        |
| 138 | `chef-social`    | Social Media Tools  | AI captions, content planning                 |        |
| 139 | `chef-partners`  | Referral Partners   | Manage partner relationships, track referrals |        |

---

## 21. CHEF PORTAL - SPECIALTY (3 videos)

Vertical-specific features.

| #   | ID              | Title           | Description                                       | Status |
| --- | --------------- | --------------- | ------------------------------------------------- | ------ |
| 140 | `chef-cannabis` | Cannabis Events | Cannabis-infused event management                 |        |
| 141 | `chef-charity`  | Charity Events  | Pro-bono and charity event tracking               |        |
| 142 | `chef-network`  | Chef Network    | Community features, recipe sharing, collaboration |        |

---

## 22. MOBILE (5 videos)

Phone-optimized experiences across all portals.

| #   | ID                  | Title                   | Description                               | Status |
| --- | ------------------- | ----------------------- | ----------------------------------------- | ------ |
| 143 | `mobile-pwa`        | ChefFlow on Your Phone  | PWA install, mobile dashboard, navigation |        |
| 144 | `mobile-dop`        | Mobile Day-of Plan      | Full-screen DOP with large tap targets    |        |
| 145 | `mobile-client`     | Client Portal on Mobile | What clients see on their phone           |        |
| 146 | `mobile-guest-rsvp` | Guest RSVP on Mobile    | RSVP and dietary form on phone            |        |
| 147 | `mobile-quick`      | Quick Actions on Mobile | Fast creation: event, client, recipe      |        |

---

## Summary

| Section               | Videos  | Coverage                                          |
| --------------------- | ------- | ------------------------------------------------- |
| Public Website        | 9       | Landing, pricing, marketplace, profiles, trust    |
| Booking Flow          | 6       | Direct book, campaigns, embed, gift cards         |
| Client Portal         | 21      | Full client experience: events, payments, loyalty |
| The Hub               | 10      | Groups, friends, sharing, social                  |
| Guest Experience      | 5       | RSVP, availability, recaps                        |
| Partner Portal        | 6       | Dashboard, events, locations, reports             |
| Staff Portal          | 7       | Login, tasks, schedule, station, time             |
| Chef: Getting Started | 5       | Onboarding, setup, import                         |
| Chef: Core Loop       | 9       | Inquiry to close-out lifecycle                    |
| Chef: Clients         | 7       | CRM, dietary, loyalty, segments                   |
| Chef: Culinary        | 5       | Recipes, menus, food cost, grocery                |
| Chef: Day of Event    | 7       | DOP, packing, travel, KDS, temp, time             |
| Chef: Financials      | 7       | Dashboard, ledger, expenses, tax, goals           |
| Chef: Calendar        | 3       | Views, gaps, prep blocks                          |
| Chef: AI Features     | 5       | Remy, insights, contracts, brain dump             |
| Chef: Communication   | 4       | Messaging, follow-ups, outreach                   |
| Chef: Pipeline        | 6       | Inquiries, leads, calls, proposals                |
| Chef: Advanced        | 10      | Queue, AAR, collab, analytics, intelligence       |
| Chef: Settings        | 4       | Modules, embed, journal                           |
| Chef: Marketing       | 3       | Campaigns, social, partners                       |
| Chef: Specialty       | 3       | Cannabis, charity, network                        |
| Mobile                | 5       | PWA, DOP, client, guest, quick actions            |
| **TOTAL**             | **147** | **Every portal, every user type, every flow**     |
