# Universal Rail: Chef Role Complete Item Catalog

> **Date:** 2026-05-14
> **Scope:** Every item type that can appear on the Universal Rail for CHEF (signed in, operates a business through ChefFlow) users.
> **Build rule:** ADDITIVE. Existing chef rail categories (opening, follow_up, event_risk, menu_opportunity, partner_lead) are preserved and enriched. New types extend the system.
> **Design philosophy:** The chef rail IS their business pulse. It replaces checking 12 different pages. A sous chef whispering priorities.

---

## Table of Contents

1. [Legend](#legend)
2. [Category Architecture](#category-architecture)
3. [Master Catalog Table](#master-catalog-table)
   - [INQUIRY LIFECYCLE](#inquiry-lifecycle)
   - [QUOTE LIFECYCLE](#quote-lifecycle)
   - [EVENT LIFECYCLE](#event-lifecycle)
   - [EVENT PREP](#event-prep)
   - [CONTRACT LIFECYCLE](#contract-lifecycle)
   - [COMMUNICATION](#communication)
   - [PAYMENT & MONEY](#payment--money)
   - [CALENDAR & SCHEDULING](#calendar--scheduling)
   - [STAFF & DELEGATION](#staff--delegation)
   - [BUSINESS HEALTH](#business-health)
   - [CLIENT MANAGEMENT](#client-management)
   - [PROFILE & PRESENCE](#profile--presence)
   - [RECIPE & MENU](#recipe--menu)
   - [PRICING & MARKET (PIE)](#pricing--market-pie)
   - [COMPLETION NUDGES](#completion-nudges)
   - [SOCIAL & NETWORK](#social--network)
   - [CULINARY INTELLIGENCE](#culinary-intelligence)
   - [INVENTORY & KITCHEN](#inventory--kitchen)
   - [COMMERCE & POS](#commerce--pos)
   - [MARKETING & SOCIAL MEDIA](#marketing--social-media)
   - [EXPENSES & FINANCE](#expenses--finance)
   - [LEADS & PROSPECTING](#leads--prospecting)
   - [GUEST MANAGEMENT](#guest-management)
   - [DOCUMENTS & PROPOSALS](#documents--proposals)
   - [OPERATIONS & TASKS](#operations--tasks)
   - [TRAVEL & LOGISTICS](#travel--logistics)
   - [LOYALTY & RETENTION PROGRAMS](#loyalty--retention-programs)
   - [CANNABIS OPERATIONS](#cannabis-operations)
   - [REMY AI & AUTOMATION](#remy-ai--automation)
   - [NOTIFICATIONS & REMINDERS](#notifications--reminders)
   - [ONBOARDING](#onboarding)
   - [CLIENT-AS-DINER (toggle)](#client-as-diner-toggle)
   - [SYSTEM & PLATFORM](#system--platform)
4. [Detailed Item Specifications](#detailed-item-specifications)
5. [Interaction Matrix](#interaction-matrix)
6. [Scoring Reference](#scoring-reference)
7. [Data Source Map](#data-source-map)
8. [Toggle & Settings Reference](#toggle--settings-reference)

---

## Legend

| Field                 | Meaning                                                                                                                                                                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **baseUrgency**       | 0-100 static priority before signals/decay                                                                                                                                                                                                         |
| **urgencyDecayFn**    | `deadline` (drops to 0 at expiry), `linear` (fades over days), `step` (jumps at thresholds like 24h/48h), `none` (static), `inverse` (urgency INCREASES over time)                                                                                 |
| **pageAffinity**      | Chef routes where this item gets boosted                                                                                                                                                                                                           |
| **pageAffinityBoost** | 0-50 bonus added when on an affinity page                                                                                                                                                                                                          |
| **hoverAction**       | What appears on pointer hover (desktop)                                                                                                                                                                                                            |
| **clickAction**       | `navigate` (go to page), `toggle_filter` (add/remove facet), `expand_inline` (show sub-items in rail), `quick_action` (do something without leaving page), `deep_link` (jump to specific section of a page)                                        |
| **presentation**      | `pill` (compact text+icon), `card` (image+text), `badge` (small chip), `alert` (red/amber border, demands attention), `progress` (bar/ring showing %), `story` (full-width editorial), `metric` (number+trend arrow), `countdown` (time remaining) |
| **maxImpressions**    | Times shown before suppression (-1 = never suppress)                                                                                                                                                                                               |
| **cooldownMinutes**   | Minutes after dismiss before reappearance                                                                                                                                                                                                          |
| **privacy**           | `tenant` (only visible to owning chef), `shared` (visible to staff with access), `system` (computed, no PII)                                                                                                                                       |

### Existing Chef Rail Categories (from chef-rail-contracts.ts)

`opening`, `follow_up`, `event_risk`, `menu_opportunity`, `partner_lead`

### Existing Chef Rail Actions

`open_inquiry`, `send_follow_up`, `promote_opening`, `create_menu_draft`, `attach_event_note`, `mark_risk_resolved`, `open_workflow`

### New Chef Rail Categories (added by this catalog)

`inquiry_ops`, `quote_ops`, `event_ops`, `event_prep`, `contract_ops`, `communication`, `payment`, `calendar`, `staffing`, `business_health`, `client_mgmt`, `profile`, `recipe_menu`, `pie_market`, `completion`, `social_network`, `culinary_intel`, `inventory_kitchen`, `commerce_pos`, `marketing_social`, `expenses_finance`, `leads_prospecting`, `guest_mgmt`, `documents`, `operations_tasks`, `travel_logistics`, `loyalty_retention`, `cannabis_ops`, `remy_ai`, `notifications`, `onboarding`, `diner_discovery`, `system`

**Total categories: 38** (5 existing + 33 new)

---

## Category Architecture

```
CHEF RAIL (253 items, 49 categories)
+-- NOW (baseUrgency 80-100, alert/countdown presentation)
|   +-- Inquiry: new, aging 24h, aging 48h, channel alert
|   +-- Quote: expiring today
|   +-- Event: tomorrow, today, in-progress
|   +-- Payment: overdue
|   +-- Contract: unsigned warning
|   +-- Communication: unreplied 24h+
|   +-- Commerce: order received
|   +-- Ops: 86'd item, station bottleneck
|   +-- Travel: departure reminder
|   +-- Cannabis: compliance check
|   +-- Safety: certification expiring, allergen protocol
|   +-- Meal Prep: delivery due
|   +-- Guest: dietary conflict
|
+-- ACTION NEEDED (baseUrgency 50-79, pill/card presentation)
|   +-- Inquiry: responded awaiting client, follow-up due
|   +-- Quote: draft ready, sent, accepted (create event)
|   +-- Event: upcoming 3d, prep incomplete, draft
|   +-- Prep: shopping list, timeline, mise, equipment, grocery run
|   +-- Contract: draft ready, sent, viewed
|   +-- Payment: pending, partial
|   +-- Staff: task needs assignment, no-show risk, schedule gap
|   +-- Calendar: overbooking, travel time, block conflict
|   +-- Inventory: low stock, expiring, delivery incoming
|   +-- Commerce: preparing, reconciliation gap
|   +-- Tasks: overdue, due today, checklist, queue
|   +-- Leads: new guest, warm lead, wix submission
|   +-- Guest: RSVP pending, headcount change, waitlist
|   +-- Cannabis: agreement needed, dosage plan, RSVP
|   +-- Consulting: session upcoming
|   +-- Meal Prep: due
|   +-- Inbox: unread count
|   +-- Remy: anomaly, draft ready, client intent
|   +-- Briefing: morning
|   +-- Import: failed
|
+-- OPPORTUNITIES (baseUrgency 30-49, card/metric presentation)
|   +-- PIE: price drops, peak windows, seasonal, food cost impact
|   +-- Market: demand trends, gaps, competitive signals, benchmarks
|   +-- Client: repeat-ready, dormant, VIP, birthday, anniversary, at-risk
|   +-- Business: revenue trend, conversion, retention, reviews, food cost
|   +-- Profile: visibility, completeness, service gaps, photo, bio
|   +-- Recipe/Menu: undocumented, capture nudge, pricing, seasonal stale
|   +-- Marketing: campaign, review request, social post
|   +-- Expense: receipt scan, mileage, overspend
|   +-- Finance: profit margin, year-end
|   +-- Leads: cold reactivation, pipeline change
|   +-- Loyalty: points expiring, referral received
|   +-- Rate Card: stale, below market
|   +-- Partners: opportunity, event collab
|   +-- Pulse: daily, anomaly
|   +-- AAR: pending review
|   +-- Import: ready
|   +-- Inventory: audit due, order pending, waste log
|
+-- INTELLIGENCE (baseUrgency 10-29, pill/story presentation)
|   +-- Culinary: technique trends, yield alerts, lifecycle stages
|   +-- Seasonal: menu suggestions, dish rotation, recipe inspiration
|   +-- Network: circle activity, chef community, vendor updates
|   +-- Completion: event chain, menu, recipe, client, overall
|   +-- Onboarding: setup steps, config engine, progress (new chefs only)
|   +-- Social: post ideas, engagement
|   +-- Nutrition: menu gaps, allergen undeclared
|   +-- Loyalty: tier upgrade, reward earned, gift card
|   +-- Charity: hours log, milestone
|   +-- Quick Log: expense, note
|   +-- Team: member added
|   +-- Remy: insight, autopilot action, CIL signal
|   +-- System: new feature, backup, export
|   +-- AAR: insight available
|   +-- Portfolio: update needed
|
+-- DINER DISCOVERY (toggle-able, baseUrgency 20-40)
|   +-- All public discovery items adapted for chef context
|   +-- Cuisine browse, occasion browse, find tonight, saved, seasonal, personal
```

---

## Master Catalog Table

### INQUIRY LIFECYCLE

| #   | Type                      | Label Template                  | Sublabel                                          | Icon              | Presentation | baseUrgency | decayFn                       | pageAffinity                      | affinityBoost | hoverAction                                                       | clickAction                   | dismissable | expandable                      | maxImpressions | cooldownMin | expiresAt                         | privacy |
| --- | ------------------------- | ------------------------------- | ------------------------------------------------- | ----------------- | ------------ | ----------- | ----------------------------- | --------------------------------- | ------------- | ----------------------------------------------------------------- | ----------------------------- | ----------- | ------------------------------- | -------------- | ----------- | --------------------------------- | ------- |
| 1   | `inquiry_new`             | `New inquiry from {clientName}` | "{channel} - {occasionType}, {guestCount} guests" | inbox + dot       | alert        | 95          | step (jumps at 12h, 24h, 48h) | `/inquiries`, `/dashboard`        | 40            | Preview: client name, date, occasion, guest count, dietary notes  | navigate                      | no          | yes (quick-reply, create quote) | -1             | 0           | Never (until acted on)            | tenant  |
| 2   | `inquiry_aging_12h`       | `{clientName} waiting 12h`      | "Responded to {channel} inquiry"                  | inbox + clock     | alert        | 90          | step                          | `/inquiries`, `/dashboard`        | 35            | Preview: time since inquiry, client details, response rate impact | navigate                      | no          | no                              | -1             | 0           | Resolves when replied             | tenant  |
| 3   | `inquiry_aging_24h`       | `{clientName} waiting 24h`      | "Response time affects booking rate"              | inbox + warning   | alert        | 95          | step                          | `/inquiries`, `/dashboard`        | 45            | Preview: response time stats, conversion impact warning           | navigate                      | no          | yes (quick-reply)               | -1             | 0           | Resolves when replied             | tenant  |
| 4   | `inquiry_aging_48h`       | `{clientName} waiting 48h+`     | "High risk of losing this booking"                | inbox + red       | alert        | 100         | none                          | `/inquiries`, `/dashboard`        | 50            | Preview: days waiting, estimated revenue at risk, "respond now"   | quick_action (open reply)     | no          | yes (quick-reply, decline)      | -1             | 0           | Resolves when replied or declined | tenant  |
| 5   | `inquiry_awaiting_client` | `Waiting on {clientName}`       | "You replied {timeAgo} - follow up?"              | inbox + hourglass | pill         | 45          | inverse (grows after 3 days)  | `/inquiries`, `/clients`          | 15            | Preview: last message sent, days waiting                          | navigate                      | yes         | yes (send follow-up)            | 20             | 1440        | 14 days after last reply          | tenant  |
| 6   | `inquiry_follow_up_due`   | `Follow up: {clientName}`       | "No response in {days} days"                      | inbox + arrow     | pill         | 65          | linear                        | `/inquiries`, `/dashboard`        | 25            | Preview: conversation summary, suggested follow-up                | quick_action (send follow-up) | yes         | yes (view thread, snooze)       | 10             | 720         | 30 days after inquiry             | tenant  |
| 7   | `inquiry_lost`            | `Lost: {clientName}`            | "Expired after {days} days"                       | inbox + x         | badge        | 20          | linear                        | `/inquiries`, `/analytics/funnel` | 10            | Preview: what happened, reason if known                           | navigate                      | yes         | no                              | 5              | 4320        | 7 days after expiry               | tenant  |
| 8   | `inquiry_channel_alert`   | `New {channel} inquiry`         | "{platformName} needs response"                   | platform icon     | alert        | 88          | step                          | `/inquiries`, `/dashboard`        | 35            | Preview: platform, client snippet, response SLA                   | navigate                      | no          | no                              | -1             | 0           | Until responded                   | tenant  |
| 9   | `inquiry_volume_spike`    | `{count} inquiries this week`   | "+{percent}% vs last week"                        | inbox + trending  | metric       | 40          | none                          | `/dashboard`, `/analytics`        | 20            | Preview: weekly comparison chart, top channels                    | navigate                      | yes         | no                              | 7              | 10080       | End of week                       | tenant  |

### QUOTE LIFECYCLE

| #   | Type                  | Label Template                     | Sublabel                        | Icon               | Presentation | baseUrgency | decayFn                  | pageAffinity                     | affinityBoost | hoverAction                                                    | clickAction                   | dismissable | expandable                        | maxImpressions | cooldownMin | expiresAt              | privacy |
| --- | --------------------- | ---------------------------------- | ------------------------------- | ------------------ | ------------ | ----------- | ------------------------ | -------------------------------- | ------------- | -------------------------------------------------------------- | ----------------------------- | ----------- | --------------------------------- | -------------- | ----------- | ---------------------- | ------- |
| 10  | `quote_draft`         | `Draft quote: {clientName}`        | "${amount} - {eventType}"       | file + pencil      | pill         | 55          | linear                   | `/events`, `/inquiries`          | 20            | Preview: line items summary, total, event date                 | navigate                      | yes         | yes (send now)                    | 15             | 1440        | 14 days after creation | tenant  |
| 11  | `quote_ready_to_send` | `Quote ready: {clientName}`        | "${amount} for {eventDate}"     | file + send        | card         | 70          | linear                   | `/events`, `/dashboard`          | 30            | Preview: full quote summary, send button                       | quick_action (send)           | no          | yes (edit, send)                  | -1             | 0           | Until sent             | tenant  |
| 12  | `quote_sent`          | `Quote sent: {clientName}`         | "Sent {timeAgo} - ${amount}"    | file + check       | pill         | 40          | inverse (grows after 3d) | `/events`, `/analytics/pipeline` | 15            | Preview: sent date, viewed status, follow-up suggestion        | navigate                      | yes         | yes (follow up)                   | 20             | 1440        | 30 days after sent     | tenant  |
| 13  | `quote_expiring_soon` | `Quote expires: {clientName}`      | "${amount} expires in {hours}h" | file + clock       | alert        | 90          | deadline                 | `/events`, `/dashboard`          | 40            | Preview: expiry countdown, extend option, client contact       | quick_action (extend/resend)  | no          | yes (extend, contact, let expire) | -1             | 0           | At expiry time         | tenant  |
| 14  | `quote_expired`       | `Quote expired: {clientName}`      | "${amount} expired {timeAgo}"   | file + x           | badge        | 60          | linear                   | `/events`, `/inquiries`          | 20            | Preview: original quote, rebid suggestion                      | navigate                      | yes         | yes (resend, archive)             | 10             | 2880        | 14 days after expiry   | tenant  |
| 15  | `quote_accepted`      | `Accepted! {clientName}`           | "${amount} - create event"      | file + star        | card         | 75          | linear                   | `/events`, `/dashboard`          | 35            | Preview: celebration, next steps (create event, send contract) | navigate                      | no          | yes (create event, send contract) | 5              | 0           | Until event created    | tenant  |
| 16  | `quote_rejected`      | `Quote declined: {clientName}`     | "{clientName} passed"           | file + thumbs-down | badge        | 25          | linear                   | `/events`, `/analytics/funnel`   | 10            | Preview: reason if given, rebid option                         | navigate                      | yes         | no                                | 5              | 4320        | 7 days                 | tenant  |
| 17  | `quote_follow_up`     | `Follow up on quote: {clientName}` | "No response in {days}d"        | file + arrow       | pill         | 60          | inverse                  | `/events`, `/dashboard`          | 25            | Preview: original quote, suggested message                     | quick_action (send follow-up) | yes         | yes (view quote, contact)         | 10             | 1440        | 21 days after send     | tenant  |

### EVENT LIFECYCLE

| #   | Type                 | Label Template                | Sublabel                                             | Icon                | Presentation | baseUrgency | decayFn            | pageAffinity                              | affinityBoost | hoverAction                                                                    | clickAction | dismissable | expandable                                        | maxImpressions | cooldownMin | expiresAt                    | privacy |
| --- | -------------------- | ----------------------------- | ---------------------------------------------------- | ------------------- | ------------ | ----------- | ------------------ | ----------------------------------------- | ------------- | ------------------------------------------------------------------------------ | ----------- | ----------- | ------------------------------------------------- | -------------- | ----------- | ---------------------------- | ------- |
| 18  | `event_today`        | `TODAY: {eventTitle}`         | "{clientName} - {guestCount} guests, {serviceStyle}" | calendar + fire     | alert        | 100         | deadline (day end) | `/dashboard`, `/events`, `/calendar`      | 50            | Preview: full event card (time, location, menu, guest count, notes)            | navigate    | no          | yes (checklist, call sheet, directions)           | -1             | 0           | End of event day             | tenant  |
| 19  | `event_tomorrow`     | `TOMORROW: {eventTitle}`      | "{clientName} - {mealSlot} for {guestCount}"         | calendar + clock    | alert        | 92          | deadline           | `/dashboard`, `/events`, `/culinary/prep` | 45            | Preview: event details, prep status, shopping list status                      | navigate    | no          | yes (prep checklist, shopping list)               | -1             | 0           | Start of event day           | tenant  |
| 20  | `event_upcoming_3d`  | `In 3 days: {eventTitle}`     | "{clientName} - {eventDate}"                         | calendar + upcoming | card         | 75          | deadline           | `/events`, `/calendar`, `/dashboard`      | 30            | Preview: event overview, prep timeline, outstanding tasks                      | navigate    | no          | yes (prep timeline, tasks)                        | -1             | 0           | When event passes 24h window | tenant  |
| 21  | `event_upcoming_7d`  | `This week: {eventTitle}`     | "{clientName} - {dayOfWeek}"                         | calendar            | pill         | 55          | deadline           | `/events`, `/calendar`                    | 20            | Preview: event summary, prep status percentage                                 | navigate    | yes         | no                                                | -1             | 0           | When event enters 3d window  | tenant  |
| 22  | `event_in_progress`  | `LIVE: {eventTitle}`          | "Started {timeAgo} - {guestCount} guests"            | calendar + pulse    | alert        | 100         | none               | `/dashboard`, `/events`                   | 50            | Preview: live status, timer, course tracker                                    | navigate    | no          | yes (course tracker, ops log)                     | -1             | 0           | Event completion             | tenant  |
| 23  | `event_post_event`   | `Wrap up: {eventTitle}`       | "Completed {timeAgo} - log expenses"                 | calendar + check    | card         | 65          | linear             | `/events`, `/analytics`                   | 25            | Preview: event summary, pending tasks (expenses, review request, photo upload) | navigate    | yes         | yes (log expenses, request review, upload photos) | 10             | 1440        | 14 days after event          | tenant  |
| 24  | `event_draft`        | `Draft event: {eventTitle}`   | "Needs: {missingItems}"                              | calendar + pencil   | pill         | 40          | linear             | `/events`, `/dashboard`                   | 15            | Preview: what's missing (menu, contract, deposit)                              | navigate    | yes         | yes (complete sections)                           | 15             | 2880        | 30 days stale                | tenant  |
| 25  | `event_risk_weather` | `Weather alert: {eventTitle}` | "{condition} forecast for {eventDate}"               | cloud + warning     | alert        | 80          | deadline           | `/events`, `/calendar`                    | 35            | Preview: weather forecast, indoor backup suggestion                            | navigate    | yes         | no                                                | 5              | 720         | Event date                   | tenant  |
| 26  | `event_cancelled`    | `Cancelled: {eventTitle}`     | "{clientName} - {reason}"                            | calendar + x        | badge        | 30          | linear             | `/events/cancelled`, `/analytics`         | 10            | Preview: cancellation details, refund status                                   | navigate    | yes         | no                                                | 3              | 4320        | 7 days                       | tenant  |

### EVENT PREP

| #   | Type                      | Label Template                | Sublabel                                           | Icon          | Presentation | baseUrgency | decayFn  | pageAffinity                            | affinityBoost | hoverAction                                                | clickAction | dismissable | expandable                      | maxImpressions | cooldownMin | expiresAt           | privacy |
| --- | ------------------------- | ----------------------------- | -------------------------------------------------- | ------------- | ------------ | ----------- | -------- | --------------------------------------- | ------------- | ---------------------------------------------------------- | ----------- | ----------- | ------------------------------- | -------------- | ----------- | ------------------- | ------- |
| 27  | `prep_shopping_list`      | `Shopping: {eventTitle}`      | "{itemCount} items, {storeCount} stops"            | cart          | card         | 78          | deadline | `/culinary/prep/shopping`, `/events`    | 35            | Preview: shopping list summary by store, estimated cost    | navigate    | no          | yes (view list, mark purchased) | -1             | 0           | Event date          | tenant  |
| 28  | `prep_timeline`           | `Prep timeline: {eventTitle}` | "Start {startTime} - {blockCount} blocks"          | clock + list  | card         | 72          | deadline | `/culinary/prep/timeline`, `/events`    | 30            | Preview: prep blocks with times, current block highlighted | navigate    | no          | yes (view blocks, check off)    | -1             | 0           | Event start         | tenant  |
| 29  | `prep_mise_en_place`      | `Mise ready? {eventTitle}`    | "{completedCount}/{totalCount} components prepped" | knife + check | progress     | 70          | deadline | `/culinary/prep`, `/events`             | 30            | Preview: component checklist with status                   | navigate    | no          | yes (component list)            | -1             | 0           | Event start         | tenant  |
| 30  | `prep_equipment_check`    | `Equipment: {eventTitle}`     | "{missingCount} items need packing"                | toolbox       | pill         | 65          | deadline | `/events/equipment-check`, `/events`    | 25            | Preview: equipment checklist, missing items highlighted    | navigate    | yes         | yes (checklist)                 | -1             | 0           | Day before event    | tenant  |
| 31  | `prep_grocery_run`        | `Grocery run needed`          | "{eventTitle} in {days}d - {itemCount} items"      | cart + clock  | alert        | 80          | deadline | `/culinary/prep/shopping`, `/dashboard` | 35            | Preview: what to buy, suggested stores, estimated time     | navigate    | no          | yes (list, directions)          | -1             | 0           | 2 days before event | tenant  |
| 32  | `prep_specialty_sourcing` | `Source: {ingredientName}`    | "For {eventTitle} - not at regular stores"         | search + leaf | pill         | 60          | deadline | `/culinary/sourcing`, `/events`         | 20            | Preview: ingredient, suggested vendors, lead time needed   | navigate    | yes         | yes (vendor options)            | 10             | 1440        | 5 days before event | tenant  |

### CONTRACT LIFECYCLE

| #   | Type                        | Label Template                 | Sublabel                                | Icon               | Presentation | baseUrgency | decayFn                  | pageAffinity                          | affinityBoost | hoverAction                                         | clickAction           | dismissable | expandable                | maxImpressions | cooldownMin | expiresAt          | privacy |
| --- | --------------------------- | ------------------------------ | --------------------------------------- | ------------------ | ------------ | ----------- | ------------------------ | ------------------------------------- | ------------- | --------------------------------------------------- | --------------------- | ----------- | ------------------------- | -------------- | ----------- | ------------------ | ------- |
| 33  | `contract_draft`            | `Draft contract: {clientName}` | "{eventTitle} - needs review"           | document + pencil  | pill         | 50          | linear                   | `/contracts`, `/events`               | 20            | Preview: contract summary, terms, missing fields    | navigate              | yes         | yes (edit, send)          | 15             | 2880        | 21 days stale      | tenant  |
| 34  | `contract_ready_to_send`    | `Send contract: {clientName}`  | "${amount} - ready for signature"       | document + send    | card         | 72          | linear                   | `/contracts`, `/events`, `/dashboard` | 30            | Preview: contract terms, event details              | quick_action (send)   | no          | yes (review, send)        | -1             | 0           | Until sent         | tenant  |
| 35  | `contract_sent`             | `Contract sent: {clientName}`  | "Sent {timeAgo} - awaiting signature"   | document + clock   | pill         | 45          | inverse (grows after 5d) | `/contracts`, `/events`               | 15            | Preview: sent date, view count, follow-up option    | navigate              | yes         | yes (follow up, resend)   | 20             | 1440        | 30 days            | tenant  |
| 36  | `contract_viewed`           | `{clientName} viewed contract` | "Viewed {timeAgo} - not yet signed"     | document + eye     | pill         | 55          | inverse                  | `/contracts`, `/events`               | 20            | Preview: view timestamp, pages viewed, sign status  | navigate              | yes         | yes (follow up)           | 15             | 720         | 14 days after view | tenant  |
| 37  | `contract_unsigned_warning` | `Unsigned: {clientName}`       | "Event in {days}d - no signed contract" | document + warning | alert        | 88          | deadline                 | `/contracts`, `/events`, `/dashboard` | 40            | Preview: event date, risk assessment, resend option | quick_action (resend) | no          | yes (resend, call client) | -1             | 0           | Event date         | tenant  |
| 38  | `contract_signed`           | `Signed! {clientName}`         | "Contract executed {timeAgo}"           | document + check   | badge        | 30          | linear                   | `/contracts`, `/events`               | 10            | Preview: signed contract summary, next steps        | navigate              | yes         | no                        | 3              | 4320        | 3 days             | tenant  |

### COMMUNICATION

| #   | Type                   | Label Template               | Sublabel                        | Icon           | Presentation | baseUrgency | decayFn         | pageAffinity                      | affinityBoost | hoverAction                                              | clickAction                   | dismissable | expandable                 | maxImpressions | cooldownMin | expiresAt          | privacy |
| --- | ---------------------- | ---------------------------- | ------------------------------- | -------------- | ------------ | ----------- | --------------- | --------------------------------- | ------------- | -------------------------------------------------------- | ----------------------------- | ----------- | -------------------------- | -------------- | ----------- | ------------------ | ------- |
| 39  | `comm_unread_message`  | `Message from {clientName}`  | "{preview}..."                  | chat + dot     | alert        | 82          | step (12h, 24h) | `/chat`, `/dashboard`, `/clients` | 35            | Preview: message text, client context, related event     | navigate                      | no          | yes (quick-reply)          | -1             | 0           | Until read         | tenant  |
| 40  | `comm_unreplied_12h`   | `Unreplied: {clientName}`    | "Waiting {hours}h for response" | chat + clock   | pill         | 72          | step            | `/chat`, `/dashboard`             | 30            | Preview: last message, suggested response                | quick_action (reply)          | no          | yes (view thread, reply)   | -1             | 0           | Until replied      | tenant  |
| 41  | `comm_unreplied_24h`   | `{clientName} waiting 24h+`  | "Response overdue"              | chat + warning | alert        | 88          | step            | `/chat`, `/dashboard`             | 40            | Preview: full conversation context, urgency note         | quick_action (reply)          | no          | yes (reply, snooze)        | -1             | 0           | Until replied      | tenant  |
| 42  | `comm_client_update`   | `{clientName} updated event` | "{updateType}: {detail}"        | chat + refresh | pill         | 60          | linear          | `/events`, `/chat`                | 20            | Preview: what changed (guest count, date, dietary needs) | navigate                      | yes         | yes (view changes)         | 10             | 720         | 7 days             | tenant  |
| 43  | `comm_email_pending`   | `Email draft: {clientName}`  | "{subject} - review and send"   | mail + pencil  | pill         | 50          | linear          | `/chat`, `/events`                | 15            | Preview: email preview, send button                      | quick_action (send)           | yes         | yes (edit, send)           | 10             | 1440        | 7 days stale       | tenant  |
| 44  | `comm_follow_up_timer` | `Follow up: {clientName}`    | "Timer set for {triggerDate}"   | clock + chat   | pill         | 55          | deadline        | `/chat`, `/clients`               | 20            | Preview: original context, suggested message             | quick_action (send follow-up) | yes         | yes (send, snooze, cancel) | 10             | 720         | Timer trigger date | tenant  |

### PAYMENT & MONEY

| #   | Type                     | Label Template                  | Sublabel                                         | Icon              | Presentation | baseUrgency | decayFn  | pageAffinity                           | affinityBoost | hoverAction                                                      | clickAction                  | dismissable | expandable                           | maxImpressions | cooldownMin | expiresAt                 | privacy |
| --- | ------------------------ | ------------------------------- | ------------------------------------------------ | ----------------- | ------------ | ----------- | -------- | -------------------------------------- | ------------- | ---------------------------------------------------------------- | ---------------------------- | ----------- | ------------------------------------ | -------------- | ----------- | ------------------------- | ------- |
| 45  | `payment_received`       | `Payment: ${amount}`            | "{clientName} - {paymentMethod}"                 | dollar + check    | badge        | 25          | linear   | `/analytics`, `/events`                | 10            | Preview: payment details, event, running total                   | navigate                     | yes         | no                                   | 3              | 4320        | 3 days                    | tenant  |
| 46  | `payment_pending`        | `Deposit due: {clientName}`     | "${amount} - event in {days}d"                   | dollar + clock    | card         | 70          | deadline | `/events`, `/dashboard`, `/analytics`  | 30            | Preview: amount, event date, send reminder option                | quick_action (send reminder) | no          | yes (send reminder, mark received)   | -1             | 0           | Event date                | tenant  |
| 47  | `payment_overdue`        | `OVERDUE: {clientName}`         | "${amount} past due {days}d"                     | dollar + warning  | alert        | 95          | none     | `/events`, `/dashboard`, `/analytics`  | 45            | Preview: amount, days overdue, payment history, contact option   | quick_action (send reminder) | no          | yes (send reminder, call, mark paid) | -1             | 0           | Until resolved            | tenant  |
| 48  | `payment_partial`        | `Partial payment: {clientName}` | "${paid} of ${total} received"                   | dollar + partial  | pill         | 55          | inverse  | `/events`, `/analytics`                | 20            | Preview: payment breakdown, remaining balance, next payment date | navigate                     | yes         | yes (send reminder)                  | 15             | 1440        | Final payment due date    | tenant  |
| 49  | `expense_unlogged`       | `Log expenses: {eventTitle}`    | "Event completed {timeAgo} - no expenses logged" | receipt + warning | pill         | 50          | inverse  | `/events`, `/analytics/reconciliation` | 20            | Preview: event revenue, missing expense categories               | navigate                     | yes         | yes (quick log, receipt scan)        | 10             | 2880        | 30 days post-event        | tenant  |
| 50  | `payment_tip_received`   | `Tip received: ${amount}`       | "{clientName} left a tip"                        | dollar + heart    | badge        | 15          | linear   | `/analytics`, `/events`                | 5             | Preview: tip amount, event context                               | navigate                     | yes         | no                                   | 2              | 4320        | 2 days                    | tenant  |
| 51  | `tax_quarterly_reminder` | `Quarterly tax export`          | "Q{quarter} data ready for export"               | calculator        | card         | 60          | deadline | `/analytics/reports`, `/dashboard`     | 25            | Preview: quarter summary, export button                          | quick_action (export)        | yes         | yes (export CSV, view summary)       | 5              | 10080       | 2 weeks after quarter end | tenant  |
| 52  | `revenue_milestone`      | `Revenue milestone: ${amount}`  | "{period} total - {trend} vs last {period}"      | trending + dollar | metric       | 30          | none     | `/analytics`, `/dashboard`             | 15            | Preview: revenue chart, comparison to prior period               | navigate                     | yes         | no                                   | 3              | 10080       | End of period             | tenant  |

### CALENDAR & SCHEDULING

| #   | Type                        | Label Template             | Sublabel                                   | Icon               | Presentation | baseUrgency | decayFn  | pageAffinity                               | affinityBoost | hoverAction                                                      | clickAction           | dismissable | expandable                              | maxImpressions | cooldownMin | expiresAt         | privacy |
| --- | --------------------------- | -------------------------- | ------------------------------------------ | ------------------ | ------------ | ----------- | -------- | ------------------------------------------ | ------------- | ---------------------------------------------------------------- | --------------------- | ----------- | --------------------------------------- | -------------- | ----------- | ----------------- | ------- |
| 53  | `calendar_empty_week`       | `Open week: {weekLabel}`   | "No events booked - market yourself?"      | calendar + empty   | card         | 40          | deadline | `/calendar`, `/dashboard`, `/availability` | 20            | Preview: week view, suggest marketing action, availability check | navigate              | yes         | yes (update availability, run campaign) | 10             | 10080       | Week start        | tenant  |
| 54  | `calendar_overbooking`      | `Overbooking risk: {date}` | "{count} events on same day"               | calendar + warning | alert        | 80          | deadline | `/calendar`, `/events`                     | 35            | Preview: conflicting events, time slots, delegation options      | navigate              | no          | yes (view conflicts, delegate)          | -1             | 0           | Event date        | tenant  |
| 55  | `calendar_availability_gap` | `Availability outdated`    | "Last updated {days}d ago"                 | calendar + refresh | pill         | 35          | inverse  | `/availability`, `/dashboard`              | 15            | Preview: current availability window, update button              | quick_action (update) | yes         | no                                      | 10             | 10080       | Never (recurring) | tenant  |
| 56  | `calendar_travel_time`      | `Travel: {eventTitle}`     | "{duration} drive - leave by {departTime}" | car + clock        | countdown    | 85          | deadline | `/calendar`, `/events`, `/dashboard`       | 40            | Preview: route, traffic estimate, departure time                 | navigate              | no          | no                                      | -1             | 0           | Event start time  | tenant  |
| 57  | `calendar_block_conflict`   | `Block conflict: {date}`   | "Time off overlaps with {eventTitle}"      | calendar + alert   | alert        | 75          | deadline | `/calendar`, `/events`                     | 30            | Preview: conflicting block and event details                     | navigate              | no          | yes (resolve: move block or reschedule) | -1             | 0           | Conflict date     | tenant  |
| 58  | `calendar_target_booking`   | `Target: book {dayOfWeek}` | "Your goal: {target} events/week"          | calendar + target  | pill         | 30          | none     | `/calendar`, `/analytics/goals`            | 15            | Preview: booking goal progress, gap to target                    | navigate              | yes         | no                                      | 7              | 10080       | End of week       | tenant  |

### STAFF & DELEGATION

| #   | Type                           | Label Template               | Sublabel                              | Icon             | Presentation | baseUrgency | decayFn  | pageAffinity        | affinityBoost | hoverAction                                 | clickAction                              | dismissable | expandable                 | maxImpressions | cooldownMin | expiresAt     | privacy |
| --- | ------------------------------ | ---------------------------- | ------------------------------------- | ---------------- | ------------ | ----------- | -------- | ------------------- | ------------- | ------------------------------------------- | ---------------------------------------- | ----------- | -------------------------- | -------------- | ----------- | ------------- | ------- |
| 59  | `staff_task_assigned`          | `Task: {taskTitle}`          | "Assigned to {staffName} - {status}"  | person + task    | pill         | 45          | deadline | `/events`, `/staff` | 15            | Preview: task details, assignee, due date   | navigate                                 | yes         | yes (reassign, complete)   | 15             | 1440        | Task due date | shared  |
| 60  | `staff_task_completed`         | `Done: {taskTitle}`          | "{staffName} completed {timeAgo}"     | person + check   | badge        | 15          | linear   | `/events`, `/staff` | 5             | Preview: completed task, quality notes      | navigate                                 | yes         | no                         | 2              | 4320        | 2 days        | shared  |
| 61  | `staff_delegation_opportunity` | `Delegate: {eventTitle}`     | "{taskCount} tasks could be assigned" | people + arrow   | pill         | 35          | linear   | `/events`, `/staff` | 15            | Preview: delegatable tasks, available staff | navigate                                 | yes         | yes (assign tasks)         | 10             | 2880        | Event date    | tenant  |
| 62  | `staff_no_show_risk`           | `Staff risk: {eventTitle}`   | "{staffName} unconfirmed for {date}"  | person + warning | alert        | 75          | deadline | `/events`, `/staff` | 30            | Preview: unconfirmed staff, backup options  | quick_action (send confirmation request) | no          | yes (confirm, find backup) | -1             | 0           | Event date    | shared  |
| 63  | `staff_schedule_gap`           | `Staff needed: {eventTitle}` | "{roleNeeded} not assigned"           | person + empty   | card         | 65          | deadline | `/events`, `/staff` | 25            | Preview: event needs, available staff       | navigate                                 | no          | yes (assign, hire)         | -1             | 0           | Event date    | tenant  |

### BUSINESS HEALTH

| #   | Type                         | Label Template                   | Sublabel                                         | Icon            | Presentation | baseUrgency | decayFn | pageAffinity                                | affinityBoost | hoverAction                                             | clickAction                       | dismissable | expandable                  | maxImpressions | cooldownMin | expiresAt               | privacy |
| --- | ---------------------------- | -------------------------------- | ------------------------------------------------ | --------------- | ------------ | ----------- | ------- | ------------------------------------------- | ------------- | ------------------------------------------------------- | --------------------------------- | ----------- | --------------------------- | -------------- | ----------- | ----------------------- | ------- |
| 64  | `biz_revenue_trend`          | `Revenue: ${amount}`             | "{period} - {trendDirection}{percent}% vs prior" | trending        | metric       | 30          | none    | `/analytics`, `/dashboard`                  | 15            | Preview: revenue chart, top events, comparison          | navigate                          | yes         | no                          | 5              | 10080       | Period end              | tenant  |
| 65  | `biz_booking_conversion`     | `Conversion: {percent}%`         | "{booked}/{inquiries} inquiries booked"          | funnel          | metric       | 35          | none    | `/analytics/funnel`, `/dashboard`           | 15            | Preview: funnel visualization, drop-off points          | navigate                          | yes         | no                          | 5              | 10080       | Period end              | tenant  |
| 66  | `biz_client_retention`       | `{count} repeat clients`         | "{percent}% retention rate"                      | people + heart  | metric       | 30          | none    | `/clients/insights/retention`, `/analytics` | 15            | Preview: retention stats, top repeat clients            | navigate                          | yes         | no                          | 5              | 10080       | Monthly                 | tenant  |
| 67  | `biz_dormant_client`         | `Re-engage: {clientName}`        | "Last event {months}mo ago - was a repeat"       | person + sleep  | pill         | 40          | none    | `/clients/inactive`, `/clients`             | 15            | Preview: client history, last event, suggested outreach | quick_action (send re-engagement) | yes         | yes (view history, contact) | 5              | 20160       | Never (recurring check) | tenant  |
| 68  | `biz_review_new`             | `New review from {clientName}`   | "{stars} stars - respond?"                       | star            | card         | 55          | linear  | `/analytics`, `/dashboard`                  | 20            | Preview: review text, respond option                    | navigate                          | yes         | yes (respond, share)        | 5              | 2880        | 7 days                  | tenant  |
| 69  | `biz_review_response_needed` | `Review needs response`          | "{clientName} - {stars} stars, {days}d ago"      | star + reply    | pill         | 50          | inverse | `/analytics`, `/dashboard`                  | 20            | Preview: review text, draft response                    | quick_action (respond)            | yes         | yes (respond)               | 10             | 1440        | 14 days                 | tenant  |
| 70  | `biz_avg_rating_change`      | `Rating: {rating} ({direction})` | "{direction} {delta} this month"                 | star + trend    | metric       | 25          | none    | `/analytics`, `/dashboard`                  | 10            | Preview: rating trend, recent reviews driving change    | navigate                          | yes         | no                          | 3              | 10080       | Monthly                 | tenant  |
| 71  | `biz_food_cost_alert`        | `Food cost: {percent}%`          | "{direction} {delta}% vs target {target}%"       | chart + warning | metric       | 45          | none    | `/culinary/costing`, `/analytics`           | 20            | Preview: cost breakdown, high-cost items, trend         | navigate                          | yes         | yes (view breakdown)        | 7              | 4320        | Weekly refresh          | tenant  |
| 72  | `biz_pipeline_value`         | `Pipeline: ${amount}`            | "{count} active quotes/inquiries"                | funnel + dollar | metric       | 30          | none    | `/analytics/pipeline`, `/dashboard`         | 15            | Preview: pipeline breakdown by stage                    | navigate                          | yes         | no                          | 5              | 10080       | Weekly                  | tenant  |
| 73  | `biz_search_appearances`     | `{count} search appearances`     | "You appeared in {count} searches this week"     | eye             | metric       | 25          | none    | `/analytics`, `/dashboard`                  | 10            | Preview: search terms, location breakdown               | navigate                          | yes         | no                          | 5              | 10080       | Weekly                  | tenant  |

### CLIENT MANAGEMENT

| #   | Type                       | Label Template                         | Sublabel                                               | Icon             | Presentation | baseUrgency | decayFn  | pageAffinity                              | affinityBoost | hoverAction                                                     | clickAction                  | dismissable | expandable                    | maxImpressions | cooldownMin | expiresAt          | privacy |
| --- | -------------------------- | -------------------------------------- | ------------------------------------------------------ | ---------------- | ------------ | ----------- | -------- | ----------------------------------------- | ------------- | --------------------------------------------------------------- | ---------------------------- | ----------- | ----------------------------- | -------------- | ----------- | ------------------ | ------- |
| 74  | `client_repeat_ready`      | `{clientName} ready to rebook`         | "Last event {months}mo ago, {eventCount} total events" | person + refresh | card         | 45          | none     | `/clients`, `/dashboard`                  | 20            | Preview: client history, preferred services, suggested outreach | quick_action (send invite)   | yes         | yes (view profile, contact)   | 5              | 20160       | Never (recurring)  | tenant  |
| 75  | `client_vip_attention`     | `VIP: {clientName}`                    | "{reason} - personal touch recommended"                | crown + person   | pill         | 50          | none     | `/clients/vip`, `/dashboard`              | 20            | Preview: VIP status, upcoming milestones, last contact          | navigate                     | yes         | yes (contact, gift card)      | 7              | 10080       | Recurring          | tenant  |
| 76  | `client_birthday_upcoming` | `{clientName} birthday: {date}`        | "Opportunity for personal touch"                       | cake + person    | pill         | 40          | deadline | `/clients`, `/dashboard`                  | 15            | Preview: birthday date, gift suggestion, past celebrations      | quick_action (send greeting) | yes         | no                            | 3              | 43200       | Birthday date      | tenant  |
| 77  | `client_anniversary`       | `{clientName}: {years}yr anniversary`  | "First event was {firstEventDate}"                     | heart + calendar | pill         | 35          | deadline | `/clients`, `/dashboard`                  | 15            | Preview: relationship timeline, total events, total revenue     | quick_action (send note)     | yes         | no                            | 3              | 43200       | Anniversary date   | tenant  |
| 78  | `client_at_risk`           | `At-risk: {clientName}`                | "Engagement declining - {signal}"                      | person + warning | card         | 55          | none     | `/clients/insights/at-risk`, `/dashboard` | 25            | Preview: risk signals, engagement history, save strategies      | navigate                     | yes         | yes (contact, offer discount) | 7              | 10080       | Recurring analysis | tenant  |
| 79  | `client_dietary_update`    | `{clientName} dietary update`          | "New: {dietaryInfo}"                                   | leaf + person    | pill         | 40          | linear   | `/clients`, `/events`                     | 15            | Preview: updated dietary needs, affected upcoming events        | navigate                     | yes         | no                            | 5              | 2880        | 7 days             | tenant  |
| 80  | `client_preferences_gap`   | `{clientName}: preferences incomplete` | "Missing: {missingFields}"                             | person + pencil  | pill         | 25          | none     | `/clients/[id]/preferences`, `/clients`   | 10            | Preview: what's missing, why it matters                         | navigate                     | yes         | no                            | 5              | 10080       | Recurring          | tenant  |

### PROFILE & PRESENCE

| #   | Type                         | Label Template          | Sublabel                                                   | Icon               | Presentation | baseUrgency | decayFn | pageAffinity                          | affinityBoost | hoverAction                                                 | clickAction           | dismissable | expandable              | maxImpressions | cooldownMin | expiresAt               | privacy |
| --- | ---------------------------- | ----------------------- | ---------------------------------------------------------- | ------------------ | ------------ | ----------- | ------- | ------------------------------------- | ------------- | ----------------------------------------------------------- | --------------------- | ----------- | ----------------------- | -------------- | ----------- | ----------------------- | ------- |
| 81  | `profile_completeness`       | `Profile: {percent}%`   | "{missingSection} would boost visibility"                  | person + progress  | progress     | 35          | none    | `/settings/profile`, `/dashboard`     | 15            | Preview: completion breakdown, highest-impact missing item  | navigate              | yes         | yes (complete sections) | 10             | 10080       | Never (until 100%)      | tenant  |
| 82  | `profile_photo_needed`       | `Add photos`            | "Profiles with photos get {multiplier}x more inquiries"    | camera             | pill         | 30          | none    | `/settings/profile`, `/content/vault` | 10            | Preview: current photo count, upload prompt                 | navigate              | yes         | no                      | 5              | 20160       | Until photos added      | tenant  |
| 83  | `profile_bio_incomplete`     | `Complete your bio`     | "{wordCount} words - aim for {target}+"                    | pencil             | pill         | 25          | none    | `/settings/profile`                   | 10            | Preview: current bio preview, tips for improvement          | navigate              | yes         | no                      | 5              | 20160       | Until bio meets minimum | tenant  |
| 84  | `profile_cuisine_coverage`   | `Add cuisines`          | "You offer {count} - area avg is {avg}"                    | utensils + plus    | pill         | 25          | none    | `/settings/profile`, `/culinary`      | 10            | Preview: current cuisines, popular missing ones in area     | navigate              | yes         | no                      | 5              | 20160       | Until adequate coverage | tenant  |
| 85  | `profile_availability_stale` | `Update availability`   | "Last updated {days}d ago"                                 | calendar + refresh | pill         | 40          | inverse | `/availability`, `/settings`          | 20            | Preview: current availability window, quick update          | quick_action (update) | yes         | no                      | 10             | 10080       | Never (recurring)       | tenant  |
| 86  | `profile_visibility_signal`  | `{count} profile views` | "This week - {trend} vs last week"                         | eye + trend        | metric       | 20          | none    | `/analytics`, `/dashboard`            | 10            | Preview: view sources, popular pages, conversion to inquiry | navigate              | yes         | no                      | 5              | 10080       | Weekly                  | tenant  |
| 87  | `profile_service_gap`        | `Add {serviceType}`     | "Searched {searchCount}x in your area, you don't offer it" | plus + service     | pill         | 30          | none    | `/settings/profile`, `/analytics`     | 10            | Preview: search demand data, competitor count               | navigate              | yes         | no                      | 5              | 20160       | Until added             | tenant  |

### RECIPE & MENU

| #   | Type                         | Label Template                   | Sublabel                                        | Icon            | Presentation | baseUrgency | decayFn | pageAffinity                                     | affinityBoost | hoverAction                                               | clickAction | dismissable | expandable                            | maxImpressions | cooldownMin | expiresAt          | privacy |
| --- | ---------------------------- | -------------------------------- | ----------------------------------------------- | --------------- | ------------ | ----------- | ------- | ------------------------------------------------ | ------------- | --------------------------------------------------------- | ----------- | ----------- | ------------------------------------- | -------------- | ----------- | ------------------ | ------- |
| 88  | `recipe_undocumented`        | `Document: {dishName}`           | "Served {servedCount}x, 0% documented"          | book + warning  | card         | 45          | none    | `/culinary/recipes`, `/culinary/menus`           | 20            | Preview: dish name, events where served, capture prompt   | navigate    | yes         | yes (quick capture, full recipe form) | 10             | 4320        | Never (recurring)  | tenant  |
| 89  | `recipe_capture_nudge`       | `Capture: {dishName}`            | "Made for {eventTitle} {timeAgo}"               | camera + book   | pill         | 40          | linear  | `/culinary/recipes`, `/events`                   | 15            | Preview: event where dish was made, quick-capture form    | navigate    | yes         | yes (photo capture, voice note)       | 7              | 2880        | 14 days post-event | tenant  |
| 90  | `recipe_missing_photo`       | `Photo needed: {recipeName}`     | "Recipe has no photos"                          | camera + recipe | pill         | 20          | none    | `/culinary/recipes`, `/content`                  | 10            | Preview: recipe card, upload prompt                       | navigate    | yes         | no                                    | 5              | 20160       | Until photo added  | tenant  |
| 91  | `recipe_missing_yield`       | `Add yield: {recipeName}`        | "No yield/portions defined"                     | scale + recipe  | pill         | 25          | none    | `/culinary/recipes`, `/culinary/costing`         | 10            | Preview: recipe, why yield matters for costing            | navigate    | yes         | no                                    | 5              | 10080       | Until yield added  | tenant  |
| 92  | `recipe_missing_timing`      | `Add timing: {recipeName}`       | "No prep/cook time set"                         | clock + recipe  | pill         | 20          | none    | `/culinary/recipes`, `/culinary/prep`            | 10            | Preview: recipe, impact on prep timeline                  | navigate    | yes         | no                                    | 5              | 10080       | Until timing added | tenant  |
| 93  | `menu_no_prices`             | `Price menu: {menuName}`         | "{dishCount} dishes, $0 total"                  | dollar + menu   | pill         | 45          | none    | `/culinary/menus`, `/culinary/costing`           | 20            | Preview: menu with dishes, pricing prompt                 | navigate    | yes         | yes (quick price entry)               | 10             | 4320        | Until priced       | tenant  |
| 94  | `menu_seasonal_stale`        | `Seasonal check: {menuName}`     | "{season} menu still active in {currentSeason}" | leaf + warning  | card         | 50          | none    | `/culinary/menus`, `/culinary/seasonal-calendar` | 20            | Preview: menu season, current season, update suggestion   | navigate    | yes         | yes (update season, archive)          | 5              | 20160       | Until updated      | tenant  |
| 95  | `menu_no_descriptions`       | `Describe: {menuName}`           | "{undescribedCount} dishes have no description" | pencil + menu   | pill         | 25          | none    | `/culinary/menus`, `/culinary/recipes`           | 10            | Preview: dishes missing descriptions                      | navigate    | yes         | no                                    | 5              | 10080       | Until described    | tenant  |
| 96  | `menu_completeness`          | `Menu: {menuName} {percent}%`    | "Missing: {gaps}"                               | progress + menu | progress     | 35          | none    | `/culinary/menus`, `/dashboard`                  | 15            | Preview: menu completion breakdown, highest-impact gap    | navigate    | yes         | yes (complete sections)               | 10             | 4320        | Until 100%         | tenant  |
| 97  | `recipe_documentation_score` | `Recipes: {percent}% documented` | "{documented}/{total} recipes captured"         | book + progress | progress     | 30          | none    | `/culinary/recipes`, `/dashboard`                | 15            | Preview: documentation progress, most-served undocumented | navigate    | yes         | yes (view undocumented list)          | 7              | 10080       | Never (until 100%) | tenant  |

### PRICING & MARKET (PIE)

| #   | Type                      | Label Template                 | Sublabel                                         | Icon                   | Presentation | baseUrgency | decayFn  | pageAffinity                                           | affinityBoost | hoverAction                                                                 | clickAction | dismissable | expandable                       | maxImpressions | cooldownMin | expiresAt                     | privacy |
| --- | ------------------------- | ------------------------------ | ------------------------------------------------ | ---------------------- | ------------ | ----------- | -------- | ------------------------------------------------------ | ------------- | --------------------------------------------------------------------------- | ----------- | ----------- | -------------------------------- | -------------- | ----------- | ----------------------------- | ------- |
| 98  | `pie_price_drop`          | `Price drop: {ingredient}`     | "${oldPrice} -> ${newPrice} ({percent}% off)"    | trending-down + dollar | card         | 45          | deadline | `/culinary/price-catalog`, `/culinary/ingredients`     | 20            | Preview: price chart, affected menus, savings estimate                      | navigate    | yes         | yes (view menus affected)        | 10             | 2880        | 7 days or until price reverts | system  |
| 99  | `pie_price_spike`         | `Price alert: {ingredient}`    | "${oldPrice} -> ${newPrice} (+{percent}%)"       | trending-up + warning  | alert        | 60          | deadline | `/culinary/price-catalog`, `/culinary/costing`         | 25            | Preview: price chart, affected menus, cost impact, substitution suggestions | navigate    | yes         | yes (view impact, substitutions) | 10             | 2880        | 7 days or until stabilized    | system  |
| 100 | `pie_peak_window`         | `Peak: {ingredient}`           | "Best quality window: {startDate} - {endDate}"   | leaf + star            | card         | 40          | deadline | `/culinary/seasonal-calendar`, `/culinary/ingredients` | 20            | Preview: peak window, recipes using this, menu suggestions                  | navigate    | yes         | yes (view recipes, create menu)  | 5              | 10080       | Window end date               | system  |
| 101 | `pie_seasonal_suggestion` | `In season: {ingredient}`      | "Peak quality, best prices right now"            | leaf + check           | pill         | 35          | deadline | `/culinary/ingredients`, `/culinary/menus`             | 15            | Preview: seasonal info, recipe ideas, current price                         | navigate    | yes         | no                               | 7              | 4320        | Season end                    | system  |
| 102 | `pie_food_cost_impact`    | `Cost impact: {ingredient}`    | "Price change affects {menuCount} menus"         | dollar + chain         | card         | 55          | linear   | `/culinary/costing`, `/culinary/menus`                 | 25            | Preview: affected menus, old vs new food cost %, margin impact              | navigate    | yes         | yes (view menus, adjust prices)  | 7              | 2880        | 14 days                       | system  |
| 103 | `pie_market_gap`          | `Market gap: {serviceType}`    | "No one offers {service} near you"               | target + empty         | card         | 40          | none     | `/analytics`, `/settings/profile`                      | 20            | Preview: demand data, competitor analysis, opportunity size                 | navigate    | yes         | no                               | 3              | 20160       | Recurring quarterly           | system  |
| 104 | `pie_competitive_signal`  | `{count} new chefs nearby`     | "Joined this month in your area"                 | people + plus          | pill         | 30          | none     | `/analytics`, `/community`                             | 10            | Preview: new chef profiles, their specialties, your differentiation         | navigate    | yes         | no                               | 3              | 20160       | Monthly                       | system  |
| 105 | `pie_demand_trend`        | `{cuisine} demand +{percent}%` | "Searches up in your area this month"            | trending + search      | metric       | 35          | none     | `/analytics/demand`, `/settings/profile`               | 15            | Preview: demand chart, your coverage of this cuisine                        | navigate    | yes         | no                               | 5              | 10080       | Monthly                       | system  |
| 106 | `pie_pricing_benchmark`   | `Per-head: ${amount}`          | "{comparison} vs area average ${avg}"            | dollar + gauge         | metric       | 30          | none     | `/analytics/benchmarks`, `/culinary/costing`           | 15            | Preview: your pricing vs area distribution, margin analysis                 | navigate    | yes         | no                               | 3              | 20160       | Quarterly                     | system  |
| 107 | `pie_yield_factor_alert`  | `Yield alert: {ingredient}`    | "Actual yield {actual}% vs expected {expected}%" | scale + warning        | pill         | 35          | none     | `/culinary/ingredients`, `/culinary/costing`           | 15            | Preview: yield discrepancy, cost impact, technique tips                     | navigate    | yes         | no                               | 5              | 10080       | Until acknowledged            | system  |

### COMPLETION NUDGES

| #   | Type                        | Label Template                         | Sublabel                                                 | Icon                | Presentation | baseUrgency | decayFn                    | pageAffinity                                      | affinityBoost | hoverAction                                                                        | clickAction                 | dismissable | expandable                  | maxImpressions | cooldownMin | expiresAt           | privacy |
| --- | --------------------------- | -------------------------------------- | -------------------------------------------------------- | ------------------- | ------------ | ----------- | -------------------------- | ------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------- | --------------------------- | ----------- | --------------------------- | -------------- | ----------- | ------------------- | ------- |
| 108 | `completion_event`          | `Event: {eventTitle} {percent}%`       | "Missing: {deepestGap}"                                  | progress + calendar | progress     | 55          | deadline                   | `/events`, `/dashboard`                           | 25            | Preview: completion tree (Event -> Menu -> Recipe -> Ingredient), gaps highlighted | navigate                    | yes         | yes (drill into gaps)       | -1             | 0           | Event date          | tenant  |
| 109 | `completion_menu`           | `Menu: {menuName} {percent}%`          | "Missing: {gapList}"                                     | progress + menu     | progress     | 35          | none                       | `/culinary/menus`, `/events`                      | 15            | Preview: menu completion breakdown, per-dish status                                | navigate                    | yes         | yes (complete items)        | 10             | 4320        | Never               | tenant  |
| 110 | `completion_recipe`         | `Recipe: {recipeName} {percent}%`      | "Missing: {gapList}"                                     | progress + book     | progress     | 25          | none                       | `/culinary/recipes`                               | 10            | Preview: recipe fields status, quality score                                       | navigate                    | yes         | yes (fill fields)           | 7              | 10080       | Never               | tenant  |
| 111 | `completion_recursive`      | `{topEntity} blocked by {childEntity}` | "{topPercent}% because {childEntity} is {childPercent}%" | chain + warning     | card         | 50          | deadline (if event-linked) | `/events`, `/culinary/menus`, `/culinary/recipes` | 20            | Preview: dependency chain visualization, deepest blocker                           | deep_link (jump to blocker) | yes         | yes (full chain)            | 10             | 2880        | Event date or never | tenant  |
| 112 | `completion_client_profile` | `Client: {clientName} {percent}%`      | "Missing: {gaps}"                                        | person + progress   | progress     | 20          | none                       | `/clients/[id]`, `/clients`                       | 10            | Preview: profile completion, impact on service quality                             | navigate                    | yes         | no                          | 5              | 10080       | Never               | tenant  |
| 113 | `completion_overall`        | `Business: {percent}% ready`           | "Top gap: {biggestGap}"                                  | gauge               | progress     | 30          | none                       | `/dashboard`                                      | 15            | Preview: overall readiness score, top 3 gaps to fix                                | navigate                    | yes         | yes (drill into categories) | 7              | 10080       | Never               | tenant  |

### SOCIAL & NETWORK

| #   | Type                         | Label Template                  | Sublabel                               | Icon              | Presentation | baseUrgency | decayFn  | pageAffinity                              | affinityBoost | hoverAction                                                 | clickAction                   | dismissable | expandable                          | maxImpressions | cooldownMin | expiresAt      | privacy |
| --- | ---------------------------- | ------------------------------- | -------------------------------------- | ----------------- | ------------ | ----------- | -------- | ----------------------------------------- | ------------- | ----------------------------------------------------------- | ----------------------------- | ----------- | ----------------------------------- | -------------- | ----------- | -------------- | ------- |
| 114 | `circle_activity`            | `Circle: {circleName}`          | "{activitySummary}"                    | people + pulse    | pill         | 30          | linear   | `/circles`, `/dashboard`                  | 15            | Preview: recent circle activity, member updates             | navigate                      | yes         | no                                  | 10             | 2880        | 7 days         | tenant  |
| 115 | `circle_cohost_invite`       | `Co-host invite: {eventTitle}`  | "{chefName} invited you to co-host"    | people + star     | card         | 65          | deadline | `/circles`, `/events`, `/dashboard`       | 30            | Preview: event details, your role, accept/decline           | quick_action (accept/decline) | no          | yes (view details, accept, decline) | -1             | 0           | RSVP deadline  | tenant  |
| 116 | `circle_shared_event`        | `Shared event: {eventTitle}`    | "{chefName} shared with your circle"   | people + calendar | pill         | 35          | linear   | `/circles`, `/events`                     | 15            | Preview: event details, shared ingredients/tasks            | navigate                      | yes         | no                                  | 5              | 2880        | Event date     | tenant  |
| 117 | `network_collab_opportunity` | `Collab: {chefName}`            | "{description}"                        | handshake         | card         | 40          | linear   | `/community`, `/circles`                  | 20            | Preview: chef profile, collaboration details, your fit      | navigate                      | yes         | yes (connect, view profile)         | 5              | 10080       | 14 days        | tenant  |
| 118 | `network_referral_received`  | `Referral from {chefName}`      | "{clientName} referred to you"         | person + arrow    | card         | 70          | step     | `/inquiries`, `/community`, `/dashboard`  | 30            | Preview: referral details, client info, referrer context    | navigate                      | no          | yes (view inquiry, thank referrer)  | -1             | 0           | Until acted on | tenant  |
| 119 | `network_vendor_update`      | `Vendor: {vendorName}`          | "{updateType}"                         | store + refresh   | pill         | 25          | linear   | `/culinary/vendors`, `/culinary/sourcing` | 10            | Preview: vendor update details, impact on your supply chain | navigate                      | yes         | no                                  | 5              | 4320        | 7 days         | tenant  |
| 120 | `platform_announcement`      | `ChefFlow: {title}`             | "{summary}"                            | megaphone         | story        | 20          | linear   | `/dashboard`, `/community/roadmap`        | 10            | Preview: full announcement text                             | navigate                      | yes         | no                                  | 5              | 10080       | 14 days        | system  |
| 121 | `network_contact_share`      | `Contact shared: {contactName}` | "{fromChef} shared a contact with you" | person + share    | pill         | 40          | linear   | `/community`, `/clients`                  | 15            | Preview: contact details, context from sharing chef         | navigate                      | yes         | yes (accept, pass)                  | 5              | 2880        | 7 days         | tenant  |

### CULINARY INTELLIGENCE

| #   | Type                                | Label Template                | Sublabel                                              | Icon               | Presentation | baseUrgency | decayFn  | pageAffinity                                           | affinityBoost | hoverAction                                                        | clickAction | dismissable | expandable                 | maxImpressions | cooldownMin | expiresAt        | privacy |
| --- | ----------------------------------- | ----------------------------- | ----------------------------------------------------- | ------------------ | ------------ | ----------- | -------- | ------------------------------------------------------ | ------------- | ------------------------------------------------------------------ | ----------- | ----------- | -------------------------- | -------------- | ----------- | ---------------- | ------- |
| 122 | `culinary_technique_trend`          | `Trending: {technique}`       | "Up {percent}% in your cuisine category"              | flame + trend      | pill         | 20          | none     | `/culinary`, `/culinary/recipes`                       | 10            | Preview: technique description, popularity data, recipe ideas      | navigate    | yes         | no                         | 5              | 20160       | Quarterly        | system  |
| 123 | `culinary_ingredient_lifecycle`     | `{ingredient}: {stage}`       | "{lifecycleDescription}"                              | leaf + cycle       | card         | 35          | deadline | `/culinary/ingredients`, `/culinary/seasonal-calendar` | 15            | Preview: lifecycle stage, quality indicators, recommended actions  | navigate    | yes         | no                         | 5              | 10080       | Stage transition | system  |
| 124 | `culinary_food_safety_window`       | `Safety: {item}`              | "Expires {expiryDate} - {daysLeft}d left"             | shield + clock     | alert        | 75          | deadline | `/culinary/ingredients`, `/culinary/prep`              | 30            | Preview: food safety timeline, storage requirements                | navigate    | no          | no                         | -1             | 0           | Expiry date      | tenant  |
| 125 | `culinary_seasonal_menu_suggestion` | `Season shift: update menus?` | "{currentSeason} starting - {count} menus to review"  | leaf + menu        | card         | 40          | deadline | `/culinary/menus`, `/culinary/seasonal-calendar`       | 20            | Preview: menus with wrong season, seasonal ingredient availability | navigate    | yes         | yes (view menus to update) | 3              | 20160       | Season midpoint  | system  |
| 126 | `culinary_recipe_inspiration`       | `Try: {recipeSuggestion}`     | "Based on your available ingredients"                 | lightbulb + recipe | pill         | 15          | none     | `/culinary/recipes`, `/culinary/ingredients`           | 10            | Preview: suggested recipe, matching ingredients you have           | navigate    | yes         | no                         | 5              | 10080       | Recurring        | system  |
| 127 | `culinary_dish_rotation`            | `Rotate: {dishName}`          | "{status} for {duration} - bring back?"               | refresh + plate    | pill         | 20          | none     | `/culinary/dish-index`, `/culinary/menus`              | 10            | Preview: dish history, last served, customer feedback              | navigate    | yes         | no                         | 5              | 20160       | Recurring        | tenant  |
| 128 | `culinary_waste_alert`              | `Waste alert: {category}`     | "{amount} wasted this period - {percent}% above norm" | trash + warning    | metric       | 40          | none     | `/culinary/ingredients`, `/analytics`                  | 15            | Preview: waste breakdown, reduction suggestions                    | navigate    | yes         | no                         | 5              | 10080       | Period end       | tenant  |

### INVENTORY & KITCHEN

| #   | Type                          | Label Template                | Sublabel                                   | Icon              | Presentation | baseUrgency | decayFn  | pageAffinity                          | affinityBoost | hoverAction                                                                        | clickAction                         | dismissable | expandable                    | maxImpressions | cooldownMin | expiresAt           | privacy |
| --- | ----------------------------- | ----------------------------- | ------------------------------------------ | ----------------- | ------------ | ----------- | -------- | ------------------------------------- | ------------- | ---------------------------------------------------------------------------------- | ----------------------------------- | ----------- | ----------------------------- | -------------- | ----------- | ------------------- | ------- |
| 129 | `inventory_low_stock`         | `Low stock: {ingredientName}` | "{currentQty} {unit} left - reorder?"      | box + warning     | alert        | 65          | inverse  | `/inventory`, `/culinary/ingredients` | 25            | Preview: current stock, usage rate, reorder suggestion, upcoming events needing it | quick_action (add to shopping list) | no          | yes (add to list, view usage) | -1             | 0           | Until restocked     | tenant  |
| 130 | `inventory_expiring`          | `Expiring: {ingredientName}`  | "Use by {expiryDate} - {daysLeft}d"        | box + clock       | alert        | 75          | deadline | `/inventory`, `/culinary/prep`        | 30            | Preview: expiry date, quantity, recipe suggestions to use it up                    | navigate                            | no          | yes (view recipes, mark used) | -1             | 0           | Expiry date         | tenant  |
| 131 | `inventory_audit_due`         | `Inventory audit due`         | "Last audit: {lastAuditDate} ({type})"     | clipboard + check | pill         | 40          | inverse  | `/inventory`, `/ops`                  | 15            | Preview: audit type options, last audit results                                    | navigate                            | yes         | no                            | 5              | 10080       | Recurring           | tenant  |
| 132 | `inventory_delivery_incoming` | `Delivery: {vendorName}`      | "{itemCount} items arriving {arrivalDate}" | truck + inbox     | card         | 55          | deadline | `/inventory`, `/culinary/vendors`     | 20            | Preview: delivery manifest, expected items, receiving checklist                    | navigate                            | no          | yes (view manifest, confirm)  | -1             | 0           | Delivery date       | tenant  |
| 133 | `inventory_waste_log`         | `Log waste: {eventTitle}`     | "Post-event waste not logged"              | trash + pencil    | pill         | 35          | inverse  | `/inventory`, `/events`               | 15            | Preview: event details, waste categories, quick-log form                           | navigate                            | yes         | yes (quick log)               | 10             | 2880        | 7 days post-event   | tenant  |
| 134 | `kitchen_item_condition`      | `Equipment: {itemName}`       | "Condition: {condition} - replace?"        | wrench + warning  | pill         | 30          | none     | `/kitchen`, `/culinary/my-kitchen`    | 10            | Preview: item details, condition history, replacement options                      | navigate                            | yes         | no                            | 5              | 20160       | Recurring quarterly | tenant  |
| 135 | `kitchen_storage_capacity`    | `Storage {percent}% full`     | "{locationType} approaching capacity"      | box + gauge       | metric       | 45          | none     | `/inventory`, `/kitchen`              | 15            | Preview: storage breakdown by location, cleanup suggestions                        | navigate                            | yes         | no                            | 5              | 10080       | Weekly check        | tenant  |
| 136 | `inventory_order_pending`     | `Order pending: {vendorName}` | "{itemCount} items ordered {timeAgo}"      | cart + clock      | pill         | 40          | inverse  | `/inventory`, `/culinary/vendors`     | 15            | Preview: order details, expected delivery, tracking                                | navigate                            | yes         | no                            | 10             | 1440        | Until delivered     | tenant  |

### COMMERCE & POS

| #   | Type                          | Label Template               | Sublabel                                 | Icon                 | Presentation | baseUrgency | decayFn  | pageAffinity                                 | affinityBoost | hoverAction                                                 | clickAction | dismissable | expandable                       | maxImpressions | cooldownMin | expiresAt       | privacy |
| --- | ----------------------------- | ---------------------------- | ---------------------------------------- | -------------------- | ------------ | ----------- | -------- | -------------------------------------------- | ------------- | ----------------------------------------------------------- | ----------- | ----------- | -------------------------------- | -------------- | ----------- | --------------- | ------- |
| 137 | `commerce_order_received`     | `New order: #{orderNumber}`  | "${amount} - {channel}"                  | cart + dot           | alert        | 80          | step     | `/commerce/orders`, `/dashboard`             | 35            | Preview: order items, customer, fulfillment time            | navigate    | no          | yes (accept, view, print)        | -1             | 0           | Until fulfilled | tenant  |
| 138 | `commerce_order_preparing`    | `Preparing: #{orderNumber}`  | "{itemCount} items - ready by {time}"    | flame + clock        | pill         | 60          | deadline | `/commerce/orders`, `/queue`                 | 25            | Preview: order items, time remaining, kitchen status        | navigate    | no          | yes (mark ready)                 | -1             | 0           | Ready time      | shared  |
| 139 | `commerce_register_open`      | `Register: {sessionStatus}`  | "Opened {timeAgo} - ${salesTotal} today" | register             | pill         | 25          | none     | `/commerce/register`, `/commerce`            | 10            | Preview: session stats, transaction count, cash summary     | navigate    | yes         | no                               | 5              | 1440        | Session close   | shared  |
| 140 | `commerce_reconciliation_gap` | `Reconciliation needed`      | "${discrepancy} discrepancy in {period}" | calculator + warning | alert        | 65          | inverse  | `/commerce/reconciliation`, `/analytics`     | 25            | Preview: expected vs actual, transaction list, flag details | navigate    | no          | yes (view transactions, resolve) | -1             | 0           | Until resolved  | tenant  |
| 141 | `commerce_settlement_pending` | `Settlement: ${amount}`      | "{provider} - settles {settleDate}"      | bank + clock         | pill         | 30          | deadline | `/commerce/settlements`, `/finance`          | 10            | Preview: settlement details, transaction breakdown          | navigate    | yes         | no                               | 5              | 1440        | Settlement date | tenant  |
| 142 | `commerce_storefront_update`  | `Storefront: {updateNeeded}` | "{count} products need attention"        | store + pencil       | pill         | 35          | none     | `/commerce/storefront`, `/commerce/products` | 15            | Preview: products needing update, out-of-stock items        | navigate    | yes         | yes (view products)              | 7              | 4320        | Recurring       | tenant  |
| 143 | `commerce_daily_sales`        | `Today: ${salesTotal}`       | "{transactionCount} transactions"        | dollar + chart       | metric       | 20          | none     | `/commerce`, `/dashboard`                    | 10            | Preview: sales breakdown, hourly chart, top items           | navigate    | yes         | no                               | 3              | 1440        | End of day      | tenant  |

### MARKETING & SOCIAL MEDIA

| #   | Type                        | Label Template                 | Sublabel                                        | Icon               | Presentation | baseUrgency | decayFn  | pageAffinity                         | affinityBoost | hoverAction                                                | clickAction                 | dismissable | expandable                      | maxImpressions | cooldownMin | expiresAt          | privacy |
| --- | --------------------------- | ------------------------------ | ----------------------------------------------- | ------------------ | ------------ | ----------- | -------- | ------------------------------------ | ------------- | ---------------------------------------------------------- | --------------------------- | ----------- | ------------------------------- | -------------- | ----------- | ------------------ | ------- |
| 144 | `social_post_due`           | `Post due: {platform}`         | "{pillar} content - scheduled {date}"           | camera + clock     | pill         | 45          | deadline | `/social`, `/content`, `/marketing`  | 20            | Preview: post draft, platform, scheduled time, edit option | navigate                    | yes         | yes (edit, publish, reschedule) | 10             | 720         | Scheduled time     | tenant  |
| 145 | `social_post_idea`          | `Content idea: {pillar}`       | "{description}"                                 | lightbulb + camera | pill         | 15          | none     | `/social`, `/content`                | 10            | Preview: idea details, create draft from idea              | navigate                    | yes         | no                              | 5              | 10080       | Recurring          | tenant  |
| 146 | `social_engagement_spike`   | `{platform}: engagement up`    | "+{percent}% this week"                         | trending + heart   | metric       | 20          | none     | `/social`, `/analytics/marketing`    | 10            | Preview: engagement stats, top-performing posts            | navigate                    | yes         | no                              | 3              | 10080       | Weekly             | tenant  |
| 147 | `marketing_campaign_active` | `Campaign: {campaignName}`     | "{status} - {metric}"                           | megaphone + pulse  | pill         | 35          | deadline | `/marketing`, `/analytics/marketing` | 15            | Preview: campaign performance, spend, conversions          | navigate                    | yes         | no                              | 7              | 2880        | Campaign end       | tenant  |
| 148 | `marketing_review_request`  | `Ask for review: {clientName}` | "Event completed {daysAgo}d ago"                | star + send        | pill         | 40          | linear   | `/reviews`, `/events`, `/clients`    | 15            | Preview: event details, review request template            | quick_action (send request) | yes         | yes (send, customize)           | 5              | 4320        | 14 days post-event | tenant  |
| 149 | `portfolio_update_needed`   | `Update portfolio`             | "{count} recent events with no photos uploaded" | image + plus       | pill         | 25          | inverse  | `/portfolio`, `/content/vault`       | 10            | Preview: events missing photos, upload prompt              | navigate                    | yes         | no                              | 5              | 20160       | Recurring          | tenant  |
| 150 | `reputation_score_change`   | `Reputation: {score}`          | "{direction} {delta} this month"                | shield + trend     | metric       | 25          | none     | `/reputation`, `/analytics`          | 10            | Preview: reputation breakdown, review sources, trend       | navigate                    | yes         | no                              | 3              | 10080       | Monthly            | tenant  |

### EXPENSES & FINANCE

| #   | Type                         | Label Template              | Sublabel                                          | Icon                  | Presentation | baseUrgency | decayFn  | pageAffinity                        | affinityBoost | hoverAction                                                               | clickAction                | dismissable | expandable                       | maxImpressions | cooldownMin | expiresAt         | privacy |
| --- | ---------------------------- | --------------------------- | ------------------------------------------------- | --------------------- | ------------ | ----------- | -------- | ----------------------------------- | ------------- | ------------------------------------------------------------------------- | -------------------------- | ----------- | -------------------------------- | -------------- | ----------- | ----------------- | ------- |
| 151 | `expense_receipt_scan`       | `Scan receipts`             | "{count} events with no receipts"                 | receipt + camera      | pill         | 40          | inverse  | `/receipts`, `/expenses`, `/events` | 15            | Preview: events missing receipts, scan prompt                             | navigate                   | yes         | yes (scan now)                   | 7              | 4320        | Recurring         | tenant  |
| 152 | `expense_mileage_log`        | `Log mileage: {eventTitle}` | "{locationName} - track drive?"                   | car + pencil          | pill         | 35          | linear   | `/expenses`, `/travel`, `/events`   | 15            | Preview: event location, estimated distance, log form                     | quick_action (log mileage) | yes         | no                               | 5              | 2880        | 7 days post-event | tenant  |
| 153 | `finance_profit_margin`      | `Margin: {percent}%`        | "{eventTitle} - ${revenue} rev, ${expenses} cost" | chart + dollar        | metric       | 30          | none     | `/finance`, `/analytics`, `/events` | 15            | Preview: profit breakdown, comparison to average                          | navigate                   | yes         | no                               | 5              | 4320        | Per-event         | tenant  |
| 154 | `finance_year_end`           | `Year-end prep`             | "{year} tax documents due soon"                   | calculator + calendar | card         | 55          | deadline | `/finance`, `/analytics/reports`    | 25            | Preview: checklist (receipts, expenses, revenue, mileage), export options | navigate                   | yes         | yes (export all, view checklist) | 5              | 10080       | Tax deadline      | tenant  |
| 155 | `expense_category_overspend` | `Overspending: {category}`  | "${amount} this month - {percent}% above budget"  | dollar + warning      | metric       | 40          | none     | `/expenses`, `/analytics`           | 15            | Preview: spending breakdown, budget comparison, trend                     | navigate                   | yes         | no                               | 5              | 10080       | Monthly           | tenant  |

### LEADS & PROSPECTING

| #   | Type                      | Label Template              | Sublabel                                      | Icon               | Presentation | baseUrgency | decayFn | pageAffinity                                   | affinityBoost | hoverAction                                                           | clickAction               | dismissable | expandable                    | maxImpressions | cooldownMin | expiresAt                   | privacy |
| --- | ------------------------- | --------------------------- | --------------------------------------------- | ------------------ | ------------ | ----------- | ------- | ---------------------------------------------- | ------------- | --------------------------------------------------------------------- | ------------------------- | ----------- | ----------------------------- | -------------- | ----------- | --------------------------- | ------- |
| 156 | `lead_new_guest`          | `New lead: {guestName}`     | "{source} - interested in {serviceType}"      | person + spark     | card         | 70          | step    | `/leads`, `/guest-leads`, `/dashboard`         | 30            | Preview: lead details, source, interest, follow-up suggestion         | navigate                  | no          | yes (contact, create inquiry) | -1             | 0           | Until converted or declined | tenant  |
| 157 | `lead_warm`               | `Warm lead: {guestName}`    | "Engaged {engagementCount}x - ready to book?" | person + flame     | pill         | 55          | inverse | `/leads`, `/prospecting`                       | 20            | Preview: engagement history, booking probability, outreach suggestion | quick_action (send offer) | yes         | yes (contact, view history)   | 10             | 2880        | 30 days                     | tenant  |
| 158 | `lead_cold_reactivation`  | `Re-engage: {guestName}`    | "Dormant {months}mo - seasonal opportunity?"  | person + snowflake | pill         | 25          | none    | `/leads`, `/prospecting`                       | 10            | Preview: last contact, seasonal hook, template message                | navigate                  | yes         | no                            | 3              | 20160       | Recurring quarterly         | tenant  |
| 159 | `pipeline_stage_change`   | `Pipeline: {clientName}`    | "Moved to {stage}"                            | funnel + arrow     | badge        | 30          | linear  | `/pipeline`, `/analytics/pipeline`             | 10            | Preview: pipeline history, next action suggestion                     | navigate                  | yes         | no                            | 5              | 1440        | 3 days                      | tenant  |
| 160 | `prospecting_opportunity` | `Opportunity: {area}`       | "{description} - outreach suggested"          | target + person    | card         | 35          | none    | `/prospecting`, `/marketing`                   | 15            | Preview: market opportunity details, suggested approach               | navigate                  | yes         | no                            | 3              | 20160       | Quarterly                   | system  |
| 161 | `wix_submission`          | `Wix form: {submitterName}` | "{formType} - {timeAgo}"                      | inbox + globe      | alert        | 75          | step    | `/wix-submissions`, `/inquiries`, `/dashboard` | 30            | Preview: form data, contact info, convert to inquiry                  | navigate                  | no          | yes (convert, reply)          | -1             | 0           | Until processed             | tenant  |

### GUEST MANAGEMENT

| #   | Type                      | Label Template                      | Sublabel                                         | Icon              | Presentation | baseUrgency | decayFn  | pageAffinity                            | affinityBoost | hoverAction                                                          | clickAction                   | dismissable | expandable                        | maxImpressions | cooldownMin | expiresAt  | privacy |
| --- | ------------------------- | ----------------------------------- | ------------------------------------------------ | ----------------- | ------------ | ----------- | -------- | --------------------------------------- | ------------- | -------------------------------------------------------------------- | ----------------------------- | ----------- | --------------------------------- | -------------- | ----------- | ---------- | ------- |
| 162 | `guest_rsvp_pending`      | `RSVPs pending: {eventTitle}`       | "{pendingCount}/{totalCount} guests unconfirmed" | people + clock    | card         | 60          | deadline | `/guests`, `/events`                    | 25            | Preview: guest list, pending names, send reminder option             | quick_action (send reminders) | no          | yes (view list, send reminders)   | -1             | 0           | Event date | tenant  |
| 163 | `guest_dietary_conflict`  | `Dietary alert: {eventTitle}`       | "{guestName} has {allergy} - menu conflict"      | leaf + warning    | alert        | 80          | deadline | `/guests`, `/events`, `/culinary/menus` | 35            | Preview: guest dietary needs vs menu items, substitution suggestions | navigate                      | no          | yes (view conflicts, adjust menu) | -1             | 0           | Event date | tenant  |
| 164 | `guest_headcount_change`  | `Guest count changed: {eventTitle}` | "{oldCount} -> {newCount} guests"                | people + refresh  | pill         | 55          | deadline | `/guests`, `/events`                    | 20            | Preview: impact on portions, shopping list, pricing                  | navigate                      | no          | yes (recalculate, adjust)         | 5              | 720         | Event date | tenant  |
| 165 | `guest_waitlist_notify`   | `Waitlist: {guestName}`             | "Spot opened for {eventTitle}"                   | people + bell     | pill         | 50          | deadline | `/waitlist`, `/events`                  | 20            | Preview: waitlist position, event details, notify option             | quick_action (notify guest)   | yes         | yes (notify, skip)                | 5              | 720         | Event date | tenant  |
| 166 | `guest_survey_response`   | `Survey response: {eventTitle}`     | "{guestName} responded - {rating}/5"             | clipboard + check | pill         | 30          | linear   | `/surveys`, `/events`, `/analytics`     | 10            | Preview: survey answers, rating, feedback highlights                 | navigate                      | yes         | no                                | 5              | 2880        | 7 days     | tenant  |
| 167 | `guest_analytics_insight` | `Guest insight: {eventTitle}`       | "{insightType}: {summary}"                       | chart + people    | pill         | 20          | none     | `/guest-analytics`, `/analytics`        | 10            | Preview: guest demographics, preference patterns, repeat likelihood  | navigate                      | yes         | no                                | 5              | 10080       | Monthly    | tenant  |

### DOCUMENTS & PROPOSALS

| #   | Type                | Label Template                 | Sublabel                               | Icon           | Presentation | baseUrgency | decayFn  | pageAffinity            | affinityBoost | hoverAction                                   | clickAction | dismissable | expandable           | maxImpressions | cooldownMin | expiresAt     | privacy |
| --- | ------------------- | ------------------------------ | -------------------------------------- | -------------- | ------------ | ----------- | -------- | ----------------------- | ------------- | --------------------------------------------- | ----------- | ----------- | -------------------- | -------------- | ----------- | ------------- | ------- |
| 168 | `document_unsigned` | `Document pending: {title}`    | "{clientName} - sent {timeAgo}"        | file + clock   | pill         | 50          | inverse  | `/documents`, `/events` | 20            | Preview: document type, sent date, view count | navigate    | yes         | yes (resend, view)   | 15             | 1440        | 30 days       | tenant  |
| 169 | `proposal_draft`    | `Draft proposal: {clientName}` | "${amount} - {eventType}"              | file + pencil  | pill         | 45          | linear   | `/proposals`, `/events` | 15            | Preview: proposal summary, completion status  | navigate    | yes         | yes (edit, finalize) | 10             | 2880        | 21 days stale | tenant  |
| 170 | `proposal_viewed`   | `{clientName} viewed proposal` | "Viewed {timeAgo} - {pageCount} pages" | file + eye     | pill         | 50          | inverse  | `/proposals`, `/events` | 20            | Preview: view analytics, engagement heat map  | navigate    | yes         | yes (follow up)      | 10             | 720         | 14 days       | tenant  |
| 171 | `document_expiring` | `Document expires: {title}`    | "Valid until {expiryDate}"             | file + warning | alert        | 60          | deadline | `/documents`            | 20            | Preview: document details, renewal option     | navigate    | yes         | yes (renew, archive) | 5              | 1440        | Expiry date   | tenant  |

### OPERATIONS & TASKS

| #   | Type                       | Label Template             | Sublabel                                   | Icon                 | Presentation | baseUrgency | decayFn  | pageAffinity                      | affinityBoost | hoverAction                                                 | clickAction             | dismissable | expandable                         | maxImpressions | cooldownMin | expiresAt                    | privacy |
| --- | -------------------------- | -------------------------- | ------------------------------------------ | -------------------- | ------------ | ----------- | -------- | --------------------------------- | ------------- | ----------------------------------------------------------- | ----------------------- | ----------- | ---------------------------------- | -------------- | ----------- | ---------------------------- | ------- |
| 172 | `task_overdue`             | `Overdue: {taskTitle}`     | "{priority} priority - due {dueDate}"      | check + warning      | alert        | 78          | none     | `/tasks`, `/dashboard`, `/ops`    | 30            | Preview: task details, assignee, mark complete option       | quick_action (complete) | no          | yes (complete, reassign, snooze)   | -1             | 0           | Until completed              | shared  |
| 173 | `task_due_today`           | `Due today: {taskTitle}`   | "{priority} - assigned to {assignee}"      | check + clock        | pill         | 65          | deadline | `/tasks`, `/dashboard`            | 25            | Preview: task details, quick complete                       | quick_action (complete) | no          | yes (complete, defer)              | -1             | 0           | End of day                   | shared  |
| 174 | `ops_checklist_incomplete` | `Checklist: {eventTitle}`  | "{completedCount}/{totalCount} items done" | clipboard + progress | progress     | 55          | deadline | `/ops`, `/events`                 | 20            | Preview: checklist items, check off inline                  | navigate                | no          | yes (view/check items)             | -1             | 0           | Event date                   | shared  |
| 175 | `production_queue`         | `Queue: {itemCount} items` | "Next: {nextItem} due {dueTime}"           | list + clock         | pill         | 50          | deadline | `/queue`, `/production`, `/ops`   | 20            | Preview: queue items with times, priority order             | navigate                | no          | yes (view queue)                   | -1             | 0           | Queue clear                  | shared  |
| 176 | `ops_eighty_six`           | `86'd: {itemName}`         | "Out of stock during service"              | x + plate            | alert        | 85          | none     | `/ops`, `/production`, `/events`  | 35            | Preview: what's 86'd, affected orders, substitution options | navigate                | no          | yes (update menu, notify staff)    | -1             | 0           | Until restocked or shift end | shared  |
| 177 | `ops_call_sheet`           | `Call sheet: {eventTitle}` | "Review for {eventDate}"                   | phone + clipboard    | card         | 60          | deadline | `/culinary/call-sheet`, `/events` | 25            | Preview: key contacts, timeline, critical notes             | navigate                | no          | yes (view, edit, share with staff) | -1             | 0           | Event date                   | shared  |

### TRAVEL & LOGISTICS

| #   | Type                        | Label Template               | Sublabel                                               | Icon               | Presentation | baseUrgency | decayFn  | pageAffinity                         | affinityBoost | hoverAction                                              | clickAction | dismissable | expandable       | maxImpressions | cooldownMin | expiresAt      | privacy |
| --- | --------------------------- | ---------------------------- | ------------------------------------------------------ | ------------------ | ------------ | ----------- | -------- | ------------------------------------ | ------------- | -------------------------------------------------------- | ----------- | ----------- | ---------------- | -------------- | ----------- | -------------- | ------- |
| 178 | `travel_departure_reminder` | `Leave for: {eventTitle}`    | "Depart by {departTime} - {duration} drive"            | car + clock        | countdown    | 90          | deadline | `/travel`, `/calendar`, `/dashboard` | 40            | Preview: route, traffic, weather at destination          | navigate    | no          | no               | -1             | 0           | Departure time | tenant  |
| 179 | `travel_load_vehicle`       | `Load vehicle: {eventTitle}` | "{equipmentCount} items + {groceryCount} grocery bags" | truck + list       | card         | 70          | deadline | `/travel`, `/events`                 | 30            | Preview: packing checklist, equipment list               | navigate    | no          | yes (checklist)  | -1             | 0           | Departure time | tenant  |
| 180 | `travel_multi_stop`         | `{stopCount} stops today`    | "{stop1} then {stop2}..."                              | route + calendar   | card         | 60          | deadline | `/travel`, `/calendar`               | 25            | Preview: optimized route, stop details, total time       | navigate    | no          | yes (view route) | -1             | 0           | End of day     | tenant  |
| 181 | `location_service_area`     | `Event outside service area` | "{eventTitle} - {distance}mi from base"                | location + warning | pill         | 40          | deadline | `/locations`, `/events`              | 15            | Preview: distance, travel fee suggestion, accept/decline | navigate    | yes         | no               | 5              | 2880        | Event date     | tenant  |

### LOYALTY & RETENTION PROGRAMS

| #   | Type                          | Label Template                  | Sublabel                                       | Icon           | Presentation | baseUrgency | decayFn  | pageAffinity                                   | affinityBoost | hoverAction                                               | clickAction                  | dismissable | expandable                                | maxImpressions | cooldownMin | expiresAt       | privacy |
| --- | ----------------------------- | ------------------------------- | ---------------------------------------------- | -------------- | ------------ | ----------- | -------- | ---------------------------------------------- | ------------- | --------------------------------------------------------- | ---------------------------- | ----------- | ----------------------------------------- | -------------- | ----------- | --------------- | ------- |
| 182 | `loyalty_tier_upgrade`        | `{clientName} -> {tier}`        | "Earned upgrade to {tierName}"                 | crown + up     | badge        | 35          | linear   | `/loyalty`, `/clients`                         | 15            | Preview: client loyalty history, new perks unlocked       | navigate                     | yes         | no                                        | 3              | 4320        | 7 days          | tenant  |
| 183 | `loyalty_reward_earned`       | `{clientName} earned reward`    | "{rewardType} - {description}"                 | gift + check   | badge        | 30          | linear   | `/loyalty/rewards`, `/clients`                 | 10            | Preview: reward details, redemption options               | navigate                     | yes         | no                                        | 3              | 4320        | 7 days          | tenant  |
| 184 | `loyalty_points_expiring`     | `Points expiring: {clientName}` | "{points} pts expire {expiryDate}"             | star + clock   | pill         | 45          | deadline | `/loyalty/points`, `/clients`                  | 15            | Preview: expiring points, notify client option            | quick_action (notify client) | yes         | yes (notify, extend)                      | 5              | 2880        | Expiry date     | tenant  |
| 185 | `loyalty_referral_received`   | `Referral: {referrerName}`      | "Referred {newClientName}"                     | person + arrow | card         | 55          | step     | `/loyalty/referrals`, `/clients`, `/dashboard` | 20            | Preview: referral details, reward status, new client info | navigate                     | no          | yes (contact new client, reward referrer) | -1             | 0           | Until processed | tenant  |
| 186 | `loyalty_gift_card_purchased` | `Gift card: ${amount}`          | "Purchased by {buyerName} for {recipientName}" | gift + dollar  | badge        | 25          | linear   | `/clients/gift-cards`, `/loyalty`              | 10            | Preview: gift card details, balance, recipient            | navigate                     | yes         | no                                        | 3              | 4320        | 3 days          | tenant  |

### CANNABIS OPERATIONS

| #   | Type                        | Label Template                 | Sublabel                                                | Icon              | Presentation | baseUrgency | decayFn  | pageAffinity                                   | affinityBoost | hoverAction                                                      | clickAction                   | dismissable | expandable              | maxImpressions | cooldownMin | expiresAt    | privacy |
| --- | --------------------------- | ------------------------------ | ------------------------------------------------------- | ----------------- | ------------ | ----------- | -------- | ---------------------------------------------- | ------------- | ---------------------------------------------------------------- | ----------------------------- | ----------- | ----------------------- | -------------- | ----------- | ------------ | ------- |
| 187 | `cannabis_compliance_check` | `Compliance: {eventTitle}`     | "{checklistStatus} - review required"                   | shield + leaf     | alert        | 80          | deadline | `/cannabis/compliance`, `/cannabis/events`     | 35            | Preview: compliance checklist, missing items, legal requirements | navigate                      | no          | yes (view checklist)    | -1             | 0           | Event date   | tenant  |
| 188 | `cannabis_agreement_needed` | `Agreement: {clientName}`      | "Cannabis waiver not signed"                            | file + leaf       | alert        | 75          | deadline | `/cannabis/agreement`, `/events`               | 30            | Preview: waiver status, send option                              | quick_action (send waiver)    | no          | yes (send, view)        | -1             | 0           | Event date   | tenant  |
| 189 | `cannabis_batch_tracking`   | `Batch: {batchId}`             | "{strainName} - {status}"                               | leaf + tag        | pill         | 40          | none     | `/cannabis/batches`, `/cannabis/ledger`        | 15            | Preview: batch details, lab results, inventory                   | navigate                      | yes         | no                      | 10             | 2880        | Batch expiry | tenant  |
| 190 | `cannabis_dosage_plan`      | `Dosage plan: {eventTitle}`    | "{guestCount} guests - {experience} levels"             | leaf + calculator | card         | 65          | deadline | `/cannabis/control-packet`, `/cannabis/events` | 25            | Preview: per-guest dosage plan, safety notes, experience levels  | navigate                      | no          | yes (view plan, adjust) | -1             | 0           | Event date   | tenant  |
| 191 | `cannabis_rsvp_pending`     | `Cannabis RSVPs: {eventTitle}` | "{pendingCount} guests haven't confirmed participation" | leaf + people     | pill         | 50          | deadline | `/cannabis/rsvps`, `/events`                   | 20            | Preview: guest participation status, send reminder               | quick_action (send reminders) | no          | yes (view, remind)      | -1             | 0           | Event date   | tenant  |

### REMY AI & AUTOMATION

| #   | Type                     | Label Template                | Sublabel                             | Icon                | Presentation | baseUrgency | decayFn | pageAffinity                        | affinityBoost | hoverAction                                                                      | clickAction                    | dismissable | expandable                       | maxImpressions | cooldownMin | expiresAt            | privacy |
| --- | ------------------------ | ----------------------------- | ------------------------------------ | ------------------- | ------------ | ----------- | ------- | ----------------------------------- | ------------- | -------------------------------------------------------------------------------- | ------------------------------ | ----------- | -------------------------------- | -------------- | ----------- | -------------------- | ------- |
| 192 | `remy_insight`           | `Remy: {insightTitle}`        | "{insightType} - {summary}"          | sparkle + brain     | card         | 35          | linear  | `/remy`, `/dashboard`, `/insights`  | 15            | Preview: AI-generated insight, evidence, suggested action                        | navigate                       | yes         | yes (act on it, dismiss, snooze) | 5              | 4320        | 7 days               | tenant  |
| 193 | `remy_draft_ready`       | `Remy drafted: {messageType}` | "For {clientName} - review and send" | sparkle + mail      | pill         | 45          | linear  | `/remy`, `/chat`, `/events`         | 20            | Preview: drafted message, edit option, send button                               | quick_action (review and send) | yes         | yes (edit, send, discard)        | 10             | 1440        | 3 days               | tenant  |
| 194 | `remy_anomaly_detected`  | `Anomaly: {description}`      | "Remy flagged unusual {anomalyType}" | sparkle + warning   | alert        | 60          | linear  | `/remy`, `/dashboard`, `/analytics` | 25            | Preview: anomaly details, historical comparison, recommended action              | navigate                       | yes         | yes (investigate, dismiss)       | 5              | 2880        | 7 days               | tenant  |
| 195 | `autopilot_action_taken` | `Autopilot: {actionType}`     | "{description} - review?"            | robot + check       | pill         | 25          | linear  | `/autopilot`, `/dashboard`          | 10            | Preview: automated action details, undo option                                   | navigate                       | yes         | yes (review, undo)               | 5              | 2880        | 3 days               | tenant  |
| 196 | `remy_client_intent`     | `Intent: {clientName}`        | "Remy detected: {intentType}"        | sparkle + magnifier | pill         | 50          | linear  | `/remy`, `/inquiries`, `/chat`      | 20            | Preview: detected intent from conversation, confidence level, suggested response | navigate                       | yes         | yes (respond, view context)      | 7              | 1440        | Until acted on       | tenant  |
| 197 | `cil_signal`             | `Signal: {signalType}`        | "{summary}"                          | radar + pulse       | pill         | 30          | none    | `/insights`, `/dashboard`           | 10            | Preview: CIL signal details, trend data, actionable suggestion                   | navigate                       | yes         | no                               | 5              | 4320        | Signal refresh cycle | tenant  |

### NOTIFICATIONS & REMINDERS

| #   | Type                 | Label Template          | Sublabel                                                                | Icon                 | Presentation | baseUrgency | decayFn            | pageAffinity                        | affinityBoost | hoverAction                                               | clickAction   | dismissable | expandable                      | maxImpressions | cooldownMin | expiresAt       | privacy |
| --- | -------------------- | ----------------------- | ----------------------------------------------------------------------- | -------------------- | ------------ | ----------- | ------------------ | ----------------------------------- | ------------- | --------------------------------------------------------- | ------------- | ----------- | ------------------------------- | -------------- | ----------- | --------------- | ------- |
| 198 | `reminder_custom`    | `Reminder: {title}`     | "Set for {triggerTime}"                                                 | bell + clock         | pill         | 60          | deadline           | `/reminders`, `/dashboard`          | 20            | Preview: reminder context, snooze option                  | navigate      | yes         | yes (snooze, complete, dismiss) | -1             | 0           | Trigger time    | tenant  |
| 199 | `reminder_recurring` | `Recurring: {title}`    | "{frequency} - next {nextDate}"                                         | bell + refresh       | pill         | 40          | deadline           | `/reminders`, `/dashboard`          | 15            | Preview: recurrence pattern, next occurrence, skip option | navigate      | yes         | yes (complete, skip, edit)      | -1             | 0           | Next occurrence | tenant  |
| 200 | `notification_batch` | `{count} notifications` | "{topCategory}: {topSummary} +{moreCount} more"                         | bell + stack         | badge        | 35          | linear             | `/notifications`, `/dashboard`      | 15            | Preview: notification list, grouped by category           | expand_inline | yes         | yes (list all)                  | -1             | 0           | Until all read  | tenant  |
| 201 | `briefing_morning`   | `Morning briefing`      | "{eventCount} events, {taskCount} tasks, {messageCount} messages today" | sun + clipboard      | story        | 55          | deadline (morning) | `/briefing`, `/dashboard`, `/daily` | 25            | Preview: today's full agenda, priorities, weather         | navigate      | yes         | yes (expand sections)           | 1              | 1440        | Noon            | tenant  |
| 202 | `briefing_weekly`    | `Week ahead`            | "{weekLabel}: {eventCount} events, ${pipelineValue} pipeline"           | calendar + clipboard | story        | 35          | deadline (Monday)  | `/briefing`, `/dashboard`           | 15            | Preview: week summary, key events, goals check-in         | navigate      | yes         | yes (expand days)               | 1              | 10080       | Mid-week        | tenant  |

### ONBOARDING

| #   | Type                    | Label Template                         | Sublabel                                                     | Icon               | Presentation | baseUrgency | decayFn | pageAffinity                      | affinityBoost | hoverAction                                                 | clickAction | dismissable | expandable             | maxImpressions | cooldownMin | expiresAt                  | privacy |
| --- | ----------------------- | -------------------------------------- | ------------------------------------------------------------ | ------------------ | ------------ | ----------- | ------- | --------------------------------- | ------------- | ----------------------------------------------------------- | ----------- | ----------- | ---------------------- | -------------- | ----------- | -------------------------- | ------- |
| 203 | `onboard_welcome`       | `Welcome to ChefFlow`                  | "Let's set up your business - {completedCount}/{totalSteps}" | rocket             | story        | 70          | none    | `/dashboard`                      | 30            | Preview: progress bar, next step highlighted                | navigate    | no          | yes (all steps)        | -1             | 0           | Until all steps done       | tenant  |
| 204 | `onboard_profile_setup` | `Step 1: Complete your profile`        | "Add name, bio, photo, cuisines"                             | person + pencil    | card         | 65          | none    | `/settings/profile`, `/dashboard` | 25            | Preview: profile fields to fill, impact on visibility       | navigate    | no          | yes (fill form inline) | -1             | 0           | Until completed            | tenant  |
| 205 | `onboard_first_menu`    | `Step 2: Create your first menu`       | "Show clients what you offer"                                | menu + plus        | card         | 60          | none    | `/culinary/menus`, `/dashboard`   | 25            | Preview: menu creation wizard preview                       | navigate    | no          | no                     | -1             | 0           | Until first menu created   | tenant  |
| 206 | `onboard_first_recipe`  | `Step 3: Document a recipe`            | "Your culinary IP, preserved"                                | book + plus        | card         | 55          | none    | `/culinary/recipes`, `/dashboard` | 25            | Preview: recipe form preview, capture options               | navigate    | no          | no                     | -1             | 0           | Until first recipe created | tenant  |
| 207 | `onboard_availability`  | `Step 4: Set your availability`        | "Let clients know when you're free"                          | calendar + pencil  | card         | 55          | none    | `/availability`, `/dashboard`     | 25            | Preview: availability calendar, quick setup                 | navigate    | no          | no                     | -1             | 0           | Until availability set     | tenant  |
| 208 | `onboard_pricing`       | `Step 5: Set your pricing`             | "Per-person or flat rate"                                    | dollar + pencil    | card         | 50          | none    | `/settings`, `/dashboard`         | 20            | Preview: pricing model options, area benchmarks             | navigate    | no          | no                     | -1             | 0           | Until pricing set          | tenant  |
| 209 | `onboard_first_client`  | `Step 6: Add your first client`        | "Import or create manually"                                  | person + plus      | card         | 50          | none    | `/clients/new`, `/dashboard`      | 20            | Preview: client creation form, import options               | navigate    | no          | no                     | -1             | 0           | Until first client added   | tenant  |
| 210 | `onboard_service_area`  | `Step 7: Define service area`          | "Where do you operate?"                                      | location + pencil  | card         | 45          | none    | `/settings`, `/dashboard`         | 20            | Preview: map with radius picker                             | navigate    | no          | no                     | -1             | 0           | Until area set             | tenant  |
| 211 | `onboard_payment_setup` | `Step 8: Payment preferences`          | "How do you accept payment?"                                 | dollar + settings  | card         | 45          | none    | `/settings`, `/dashboard`         | 20            | Preview: payment method options                             | navigate    | no          | no                     | -1             | 0           | Until payment configured   | tenant  |
| 212 | `onboard_first_event`   | `Step 9: Create your first event`      | "Track a past or upcoming event"                             | calendar + plus    | card         | 45          | none    | `/events/new`, `/dashboard`       | 20            | Preview: event creation wizard                              | navigate    | no          | no                     | -1             | 0           | Until first event          | tenant  |
| 213 | `onboard_progress`      | `Setup: {completedCount}/{totalSteps}` | "{nextStep} is next"                                         | progress + rocket  | progress     | 40          | none    | `/dashboard`                      | 20            | Preview: progress bar, completed vs remaining, gamification | navigate    | no          | yes (all steps)        | -1             | 0           | Until 100%                 | tenant  |
| 214 | `onboard_config_engine` | `Personalize ChefFlow`                 | "5 questions to tailor your workspace"                       | settings + sparkle | card         | 70          | none    | `/dashboard`                      | 30            | Preview: configuration questionnaire preview                | navigate    | no          | no                     | -1             | 0           | Until config completed     | tenant  |

### CLIENT-AS-DINER (toggle)

| #   | Type                        | Label Template          | Sublabel                       | Icon            | Presentation | baseUrgency | decayFn               | pageAffinity                   | affinityBoost | hoverAction                                     | clickAction   | dismissable | expandable         | maxImpressions | cooldownMin | expiresAt  | privacy |
| --- | --------------------------- | ----------------------- | ------------------------------ | --------------- | ------------ | ----------- | --------------------- | ------------------------------ | ------------- | ----------------------------------------------- | ------------- | ----------- | ------------------ | -------------- | ----------- | ---------- | ------- |
| 215 | `diner_cuisine_browse`      | `{cuisineName}`         | "Find a chef near you"         | cuisine emoji   | pill         | 25          | none                  | `/eat`, `/chefs`               | 10            | Preview: chef count, sample profiles            | toggle_filter | yes         | yes (sub-cuisines) | -1             | 60          | Never      | tenant  |
| 216 | `diner_occasion_browse`     | `{occasionName}`        | "Plan your next event"         | confetti        | pill         | 25          | none                  | `/eat`                         | 10            | Preview: occasion templates, chef suggestions   | toggle_filter | yes         | no                 | -1             | 60          | Never      | tenant  |
| 217 | `diner_find_tonight`        | `Find dinner tonight`   | "Available chefs near you"     | search + clock  | card         | 40          | deadline (end of day) | `/eat`, `/chefs`, `/dashboard` | 25            | Preview: tonight-available chefs, quick booking | navigate      | yes         | no                 | 5              | 1440        | End of day | tenant  |
| 218 | `diner_saved_chef`          | `Saved: {chefName}`     | "New menu available"           | bookmark + chef | pill         | 30          | linear                | `/eat`, `/chefs`               | 15            | Preview: chef profile, new offerings            | navigate      | yes         | no                 | 5              | 4320        | 14 days    | tenant  |
| 219 | `diner_seasonal_pick`       | `{seasonalDish}`        | "Available this season"        | leaf + plate    | pill         | 30          | deadline              | `/eat`                         | 15            | Preview: seasonal dish details, available chefs | navigate      | yes         | no                 | 5              | 4320        | Season end | tenant  |
| 220 | `diner_personal_preference` | `For you: {suggestion}` | "Based on your dining history" | sparkle + plate | pill         | 25          | none                  | `/eat`, `/chefs`               | 10            | Preview: why suggested, chef options            | navigate      | yes         | no                 | 5              | 2880        | Recurring  | tenant  |

### SYSTEM & PLATFORM

| #   | Type                          | Label Template                  | Sublabel                        | Icon                | Presentation | baseUrgency | decayFn  | pageAffinity                           | affinityBoost | hoverAction                                         | clickAction             | dismissable | expandable                  | maxImpressions | cooldownMin | expiresAt         | privacy |
| --- | ----------------------------- | ------------------------------- | ------------------------------- | ------------------- | ------------ | ----------- | -------- | -------------------------------------- | ------------- | --------------------------------------------------- | ----------------------- | ----------- | --------------------------- | -------------- | ----------- | ----------------- | ------- |
| 221 | `system_new_feature`          | `New: {featureName}`            | "{description}"                 | sparkle             | story        | 25          | linear   | `/dashboard`                           | 10            | Preview: feature description, try-it link           | navigate                | yes         | no                          | 3              | 20160       | 14 days           | system  |
| 222 | `system_maintenance`          | `Scheduled maintenance`         | "{date} - {duration} estimated" | wrench              | alert        | 50          | deadline | `/dashboard`                           | 20            | Preview: maintenance window, what's affected        | navigate                | yes         | no                          | 5              | 1440        | Maintenance end   | system  |
| 223 | `system_subscription_renewal` | `Subscription renews {date}`    | "{plan} plan - ${amount}/mo"    | credit-card + clock | pill         | 40          | deadline | `/settings/billing`, `/dashboard`      | 20            | Preview: plan details, usage stats, upgrade options | navigate                | yes         | no                          | 5              | 10080       | Renewal date      | tenant  |
| 224 | `system_export_ready`         | `Export ready`                  | "{exportType} - download now"   | download            | pill         | 35          | linear   | `/analytics/reports`, `/dashboard`     | 15            | Preview: export details, download button            | quick_action (download) | yes         | no                          | 3              | 1440        | 7 days            | tenant  |
| 225 | `system_integration_error`    | `Integration issue: {provider}` | "{errorDescription}"            | plug + warning      | alert        | 70          | none     | `/settings/integrations`, `/dashboard` | 30            | Preview: error details, reconnect option            | navigate                | no          | yes (reconnect, view error) | -1             | 0           | Until resolved    | tenant  |
| 226 | `system_backup_reminder`      | `Back up your data`             | "Last backup: {lastBackupDate}" | shield + download   | pill         | 25          | inverse  | `/settings`, `/dashboard`              | 10            | Preview: backup options, last backup date           | quick_action (backup)   | yes         | no                          | 3              | 43200       | Recurring monthly | tenant  |

---

## Detailed Item Specifications

### Scoring Formula (extends existing chef-rail-priority.ts)

Each chef rail item is scored using a weighted multi-factor formula:

```
score = (
  urgency * 0.22 +
  moneyImpact * 0.16 +
  eventRisk * 0.20 +
  relationshipValue * 0.12 +
  confidence * 0.10 +
  freshness * 0.08 +
  actionability * 0.12 +
  expiresSoonBoost -
  agePenalty
) * categoryWeight * pageAffinityMultiplier
```

**New scoring dimensions for expanded catalog:**

| Dimension           | Weight             | Description                                                             |
| ------------------- | ------------------ | ----------------------------------------------------------------------- |
| `urgency`           | 0.22               | Time-sensitivity. Inquiries aging, events approaching, payments overdue |
| `moneyImpact`       | 0.16               | Revenue at stake. Quote value, unpaid amounts, food cost impact         |
| `eventRisk`         | 0.20               | Risk of event failure. Missing prep, unsigned contracts, weather        |
| `relationshipValue` | 0.12               | Client importance. VIP status, repeat history, referral potential       |
| `confidence`        | 0.10               | Data quality. How sure are we this signal is real                       |
| `freshness`         | 0.08               | Recency. New signals score higher                                       |
| `actionability`     | 0.12               | Can the chef act on this NOW? Higher if one-click resolution            |
| `expiresSoonBoost`  | +8 flat            | Items expiring within 48h get a flat boost                              |
| `agePenalty`        | -1.5/day (max -18) | Old items fade unless urgency overrides                                 |

### Category Weight Defaults

| Category            | Weight | Rationale                                 |
| ------------------- | ------ | ----------------------------------------- |
| `inquiry_ops`       | 1.15   | New business is highest priority          |
| `quote_ops`         | 1.10   | Active sales pipeline                     |
| `event_ops`         | 1.20   | Active events are non-negotiable          |
| `event_prep`        | 1.15   | Prep failure = event failure              |
| `contract_ops`      | 1.05   | Legal protection matters                  |
| `communication`     | 1.10   | Responsiveness drives bookings            |
| `payment`           | 1.05   | Money collection                          |
| `calendar`          | 0.90   | Important but less urgent                 |
| `staffing`          | 1.00   | Neutral                                   |
| `business_health`   | 0.75   | Intelligence, not urgent                  |
| `client_mgmt`       | 0.85   | Relationship maintenance                  |
| `profile`           | 0.65   | Background improvement                    |
| `recipe_menu`       | 0.75   | Documentation is important but not urgent |
| `pie_market`        | 0.70   | Market intelligence                       |
| `completion`        | 0.60   | Progressive improvement                   |
| `social_network`    | 0.55   | Nice to have                              |
| `culinary_intel`    | 0.50   | Background intelligence                   |
| `inventory_kitchen` | 0.95   | Stock-outs can sink events                |
| `commerce_pos`      | 1.00   | Active sales need attention               |
| `marketing_social`  | 0.55   | Growth channel, not urgent                |
| `expenses_finance`  | 0.80   | Money tracking matters                    |
| `leads_prospecting` | 1.05   | Pipeline growth                           |
| `guest_mgmt`        | 0.95   | Guest experience is event success         |
| `documents`         | 0.70   | Background legal/admin                    |
| `operations_tasks`  | 1.10   | Operational execution                     |
| `travel_logistics`  | 1.05   | Missed departure = missed event           |
| `loyalty_retention` | 0.60   | Long-term relationship building           |
| `cannabis_ops`      | 1.15   | Compliance is non-negotiable              |
| `remy_ai`           | 0.65   | AI suggestions, chef decides              |
| `notifications`     | 0.75   | Meta-items, lower weight                  |
| `onboarding`        | 1.00   | Critical for new users only               |
| `diner_discovery`   | 0.40   | Optional toggle                           |
| `system`            | 0.80   | Platform operations                       |

### Urgency Decay Functions

| Function   | Behavior                                                                                                | Used By                                             |
| ---------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `deadline` | Linear decay from baseUrgency to 0 at expiry. Items get more urgent as deadline approaches, then vanish | Events, quotes with expiry, seasonal items          |
| `linear`   | Loses ~5 urgency points per day from baseUrgency                                                        | Notifications, completed events, badges             |
| `step`     | Jumps at defined thresholds (e.g., 12h: +5, 24h: +15, 48h: +25)                                         | Inquiry aging, message response times               |
| `inverse`  | GAINS urgency over time (starts low, grows)                                                             | Stale profiles, unreplied messages, dormant clients |
| `none`     | Static urgency, never changes                                                                           | Metrics, benchmarks, recurring intelligence         |

---

## Interaction Matrix

Items interact with each other. When multiple items relate to the same entity, they collapse or prioritize:

| When                                                               | Then                                                          |
| ------------------------------------------------------------------ | ------------------------------------------------------------- |
| `inquiry_new` + `comm_unread_message` for same client              | Merge into single alert with both actions                     |
| `event_today` + `prep_*` for same event                            | Prep items nest INSIDE event_today as expandable sub-items    |
| `quote_expiring_soon` + `contract_unsigned_warning` for same event | Show both but link them visually                              |
| `payment_overdue` + `event_upcoming_*` for same event              | Payment gets +20 urgency boost                                |
| `recipe_undocumented` + `event_post_event` for same event          | Recipe nudge appears as sub-item of post-event wrap-up        |
| `completion_recursive` + individual completion items               | Recursive replaces individual items for same chain            |
| `onboard_*` items                                                  | Show max 2 at a time, next step + progress bar                |
| `diner_*` items                                                    | Only shown if chef has "Show dining discovery" toggle ON      |
| `pie_*` items for same ingredient                                  | Collapse into single card with tabs                           |
| `calendar_empty_week` + `inquiry_new`                              | Empty week gets urgency boost when inquiries exist            |
| `staff_no_show_risk` + `event_upcoming_*`                          | Staff risk nests inside event item                            |
| `biz_dormant_client` + `client_repeat_ready`                       | Show whichever has higher score, suppress other               |
| `inventory_low_stock` + `prep_shopping_list` for same ingredient   | Merge into shopping list with low-stock badge                 |
| `inventory_expiring` + `culinary_food_safety_window` for same item | Show food safety (higher urgency), suppress inventory         |
| `commerce_order_received` + `production_queue`                     | Order nests inside queue as priority item                     |
| `travel_departure_reminder` + `event_today`                        | Travel nests inside event_today as first sub-item             |
| `guest_dietary_conflict` + `event_upcoming_*`                      | Dietary conflict nests inside event as alert sub-item         |
| `cannabis_compliance_check` + `event_upcoming_*`                   | Compliance nests inside event for cannabis events             |
| `remy_draft_ready` + `comm_*` for same client                      | Remy draft replaces generic reply prompt                      |
| `task_overdue` + `ops_checklist_incomplete` for same event         | Show checklist (broader), task appears as sub-item            |
| `lead_new_guest` + `wix_submission` for same person                | Merge into single lead item with source noted                 |
| `loyalty_referral_received` + `network_referral_received`          | Show network referral (richer context), suppress loyalty dupe |
| `expense_receipt_scan` + `expense_unlogged` for same event         | Show unlogged (broader), receipt scan as sub-action           |
| `briefing_morning` + all today items                               | Morning briefing collapses all today items into one story     |
| `marketing_review_request` + `event_post_event`                    | Review request nests inside post-event wrap-up                |
| `guest_rsvp_pending` + `event_upcoming_*`                          | RSVP nests inside event as sub-item                           |
| `proposal_viewed` + `quote_sent` for same client                   | Show most recent action, suppress older                       |

### Deduplication Rules

1. Same entity + same category = keep highest-scoring item only
2. Same client + multiple lifecycle stages = show most recent stage only
3. Onboarding items: sequential, show max 2 (current + next)
4. PIE items: max 5 at any time (highest impact)
5. Completion items: max 3 at any time (most actionable)
6. Diner discovery: max 3 at any time (background)
7. Remy AI items: max 3 at any time (AI should not dominate)
8. Marketing/social items: max 2 at any time (background growth)
9. Cannabis items: no limit (compliance is non-negotiable)
10. Inventory items: max 4 at any time (operational)
11. Commerce orders: no limit (active service demands attention)
12. Guest management: max 3 at any time per event
13. Loyalty items: max 2 at any time (background)
14. Briefing items: max 1 at any time (collapses others)

---

## Data Source Map

| Source                                                     | Item Types                                          | Update Frequency            |
| ---------------------------------------------------------- | --------------------------------------------------- | --------------------------- |
| `inquiries` table (inquiry_status enum)                    | inquiry\_\*                                         | Real-time (webhook/poll)    |
| `quotes` table (quote_status enum)                         | quote\_\*                                           | Real-time                   |
| `events` table (event_status enum)                         | event*\*, prep*\*                                   | Real-time + daily scan      |
| `contracts` table (contract_status enum)                   | contract\_\*                                        | Real-time                   |
| `conversations` / `messages` tables                        | comm\_\*                                            | Real-time                   |
| `ledger_entries` / `payments` tables                       | payment\_\*                                         | Real-time                   |
| `chef_calendar_entries` table                              | calendar\_\*                                        | Daily scan                  |
| `staff_assignments` table                                  | staff\_\*                                           | Real-time                   |
| Analytics aggregation queries                              | biz\_\*                                             | Hourly/daily                |
| `clients` table (client_status enum)                       | client\_\*                                          | Daily scan                  |
| `chef_profiles` / `users` tables                           | profile\_\*                                         | On-demand                   |
| `recipes` / `menus` tables                                 | recipe*\*, menu*\*                                  | Daily scan                  |
| PIE bridge (port 7700, 1.1M prices)                        | pie\_\*                                             | Nightly sync + alerts       |
| OpenClaw synthesizers                                      | pie_seasonal, pie_demand                            | Nightly                     |
| Completion contract engine                                 | completion\_\*                                      | On-demand (computed)        |
| `circles` / chef network tables                            | social*\*, circle*\*                                | Real-time                   |
| CIL signals (per-tenant SQLite)                            | culinary\_\*, biz intelligence                      | Hourly scanner              |
| Ingredient lifecycle system                                | culinary_ingredient_lifecycle, culinary_food_safety | Daily + threshold alerts    |
| Onboarding state (config engine)                           | onboard\_\*                                         | On-demand                   |
| Discovery rail system                                      | diner\_\*                                           | Same as public rail         |
| `inventory_items` / `inventory_transactions` tables        | inventory*\*, kitchen*\*                            | Real-time + daily scan      |
| `commerce_*` tables (orders, register, sales, settlements) | commerce\_\*                                        | Real-time                   |
| `social_posts` / `social_assets` tables                    | social*\*, marketing*\*                             | Daily scan                  |
| `expenses` table (expense_category enum)                   | expense*\*, finance*\*                              | Real-time + monthly         |
| `guest_leads` / lead tracking tables                       | lead*\*, prospecting*_, wix\__                      | Real-time                   |
| `guests` / `guest_reservations` / `rsvps` tables           | guest\_\*                                           | Real-time                   |
| `documents` table                                          | document*\*, proposal*\*                            | Real-time                   |
| `tasks` table (task_status, task_priority enums)           | task*\*, ops*\*                                     | Real-time                   |
| `chef_calendar_entries` / route calculation                | travel*\*, location*\*                              | Daily + event-triggered     |
| `loyalty_*` tables (tier, transaction, reward)             | loyalty\_\*                                         | Real-time                   |
| `cannabis_*` tables (batches, compliance, dosage)          | cannabis\_\*                                        | Real-time + event-triggered |
| CIL signals + Remy intent detection                        | remy*\*, cil*_, autopilot\__                        | Hourly scanner              |
| `reminders` / notification system                          | reminder*\*, notification*_, briefing\__            | Real-time + scheduled       |
| System/platform                                            | system\_\*                                          | Event-driven                |

---

## Toggle & Settings Reference

Chefs can customize their rail through settings:

| Setting               | Default            | Effect                                                     |
| --------------------- | ------------------ | ---------------------------------------------------------- |
| `enabledCategories`   | All ON             | Toggle entire categories on/off                            |
| `categoryWeights`     | See defaults above | Adjust relative importance                                 |
| `showDinerDiscovery`  | OFF                | Toggle client-as-diner items                               |
| `quietHours`          | None               | Suppress non-critical alerts during set hours              |
| `maxRailItems`        | 16                 | Max visible items at once (expanded for 226 types)         |
| `onboardingDismissed` | false              | Hide all onboarding (permanent)                            |
| `pieAlerts`           | ON                 | Toggle pricing intelligence                                |
| `completionNudges`    | ON                 | Toggle completion system items                             |
| `networkSignals`      | ON                 | Toggle social/community items                              |
| `weatherAlerts`       | ON                 | Toggle event weather warnings                              |
| `inventoryAlerts`     | ON                 | Toggle stock/expiry alerts                                 |
| `commerceAlerts`      | ON                 | Toggle POS/order notifications (off if no commerce module) |
| `cannabisModule`      | OFF                | Toggle cannabis operations (unlocked separately)           |
| `remyInsights`        | ON                 | Toggle AI-generated suggestions                            |
| `morningBriefing`     | ON                 | Toggle daily morning summary                               |
| `weeklyBriefing`      | ON                 | Toggle weekly summary                                      |
| `socialReminders`     | ON                 | Toggle social media content nudges                         |
| `loyaltyProgram`      | OFF                | Toggle loyalty/retention items (off if program not active) |
| `guestManagement`     | ON                 | Toggle guest RSVP/dietary items                            |
| `travelAlerts`        | ON                 | Toggle departure/logistics reminders                       |
| `leadTracking`        | ON                 | Toggle prospecting and lead items                          |
| `expenseReminders`    | ON                 | Toggle receipt/mileage/expense nudges                      |

### Rail Sections (visual grouping)

When rendered, items are grouped into visual sections:

| Section           | Items                             | Position             |
| ----------------- | --------------------------------- | -------------------- |
| **NOW**           | alert items (urgency 80+)         | Left (first visible) |
| **ACTION**        | pill/card items (urgency 50-79)   | Center-left          |
| **OPPORTUNITIES** | card/metric items (urgency 30-49) | Center               |
| **INTELLIGENCE**  | pill/story items (urgency 10-29)  | Center-right         |
| **DISCOVER**      | diner\_\* items (toggle)          | Right (last)         |

---

## Item Count Summary

See [Updated Item Count Summary](#updated-item-count-summary) below for the final count of **253 item types** across **49 categories**.

---

## Implementation Notes

### Extends Existing System

- `ChefRailCandidate` interface already has `urgency`, `moneyImpact`, `eventRisk`, `relationshipValue`, `confidence`, `freshness`, `actionability` fields
- `scoreChefRailCandidate()` in `chef-rail-priority.ts` already implements weighted scoring
- `ChefRailLifecycleState` already handles: candidate, eligible, shown, acted_on, snoozed, dismissed, resolved, converted, expired, suppressed
- `ChefRailAuditEvent` already tracks: shown, clicked, dismissed, snoozed, resolved, promoted, converted

### New Infrastructure Needed

1. **Category expansion**: Extend `ChefRailCategory` union from 5 to 49
2. **Item type registry**: New `ChefRailItemType` union with all 253 types
3. **Data source adapters**: One adapter per data source that produces `ChefRailCandidate` instances (~30 adapters)
4. **Interaction engine**: Handles merging, nesting, deduplication, and collapse rules (28 interaction rules)
5. **Settings persistence**: Store per-tenant rail preferences (10+ toggles)
6. **Decay engine**: Implement all 5 urgency decay functions (deadline, linear, step, inverse, none)
7. **Page affinity resolver**: Detect current route from 692 chef routes and apply boosts
8. **Nesting engine**: Sub-items (prep inside events, dietary inside guests, travel inside events)
9. **Cannabis compliance gate**: Cannabis items bypass dedup limits when compliance is at risk
10. **Remy integration**: AI-generated items flow through confidence threshold before appearing
11. **Briefing collapsor**: Morning/weekly briefing items aggregate and replace individual items

### Privacy Contract

- All `tenant` items are scoped to `tenantId` and never leak across accounts
- All `shared` items respect staff access control
- All `system` items contain no PII (aggregated, anonymized)
- PIE data from OpenClaw bridge is anonymized market data
- Diner discovery items use same privacy model as public rail

---

## Href Reference (Complete)

Every item type maps to a destination route when clicked. Templates use `{id}`, `{tenantId}`, `{slug}` placeholders.

### Inquiry Lifecycle

| Type                      | href Template                             | Deep Link Target                       |
| ------------------------- | ----------------------------------------- | -------------------------------------- |
| `inquiry_new`             | `/inquiries/{id}`                         | Inquiry detail with reply form focused |
| `inquiry_aging_12h`       | `/inquiries/{id}`                         | Same, with urgency banner              |
| `inquiry_aging_24h`       | `/inquiries/{id}`                         | Same, with critical banner             |
| `inquiry_aging_48h`       | `/inquiries/{id}#reply`                   | Reply form auto-focused                |
| `inquiry_awaiting_client` | `/inquiries/{id}`                         | Conversation thread                    |
| `inquiry_follow_up_due`   | `/inquiries/{id}#follow-up`               | Follow-up compose                      |
| `inquiry_lost`            | `/inquiries/{id}`                         | Read-only with "lost" label            |
| `inquiry_channel_alert`   | `/inquiries?channel={channel}&status=new` | Filtered list                          |
| `inquiry_volume_spike`    | `/analytics/funnel?period=week`           | Funnel analytics                       |

### Quote Lifecycle

| Type                  | href Template              | Deep Link Target                |
| --------------------- | -------------------------- | ------------------------------- |
| `quote_draft`         | `/quotes/{id}`             | Quote editor                    |
| `quote_ready_to_send` | `/quotes/{id}#send`        | Send confirmation modal         |
| `quote_sent`          | `/quotes/{id}`             | Quote detail with status        |
| `quote_expiring_soon` | `/quotes/{id}#extend`      | Extend/resend modal             |
| `quote_expired`       | `/quotes/{id}`             | Expired state with rebid option |
| `quote_accepted`      | `/events/new?quoteId={id}` | Event creation from quote       |
| `quote_rejected`      | `/quotes/{id}`             | Rejection detail                |
| `quote_follow_up`     | `/quotes/{id}#follow-up`   | Follow-up compose               |

### Event Lifecycle

| Type                 | href Template               | Deep Link Target      |
| -------------------- | --------------------------- | --------------------- |
| `event_today`        | `/events/{id}`              | Full event dashboard  |
| `event_tomorrow`     | `/events/{id}`              | Event with prep focus |
| `event_upcoming_3d`  | `/events/{id}#prep`         | Prep section          |
| `event_upcoming_7d`  | `/events/{id}`              | Event overview        |
| `event_in_progress`  | `/events/{id}#live`         | Live ops view         |
| `event_post_event`   | `/events/{id}#wrap-up`      | Post-event checklist  |
| `event_draft`        | `/events/{id}/edit`         | Edit mode             |
| `event_risk_weather` | `/events/{id}#weather`      | Weather section       |
| `event_cancelled`    | `/events/cancelled?id={id}` | Cancelled detail      |

### Event Prep

| Type                      | href Template                                      | Deep Link Target        |
| ------------------------- | -------------------------------------------------- | ----------------------- |
| `prep_shopping_list`      | `/culinary/prep/shopping?eventId={id}`             | Shopping list for event |
| `prep_timeline`           | `/culinary/prep/timeline?eventId={id}`             | Prep timeline           |
| `prep_mise_en_place`      | `/events/{id}#mise`                                | Mise checklist          |
| `prep_equipment_check`    | `/events/equipment-check?eventId={id}`             | Equipment checklist     |
| `prep_grocery_run`        | `/culinary/prep/shopping?eventId={id}&urgent=true` | Urgent shopping mode    |
| `prep_specialty_sourcing` | `/culinary/sourcing?ingredient={ingredientId}`     | Sourcing page           |

### Contract Lifecycle

| Type                        | href Template               | Deep Link Target       |
| --------------------------- | --------------------------- | ---------------------- |
| `contract_draft`            | `/contracts/{id}`           | Contract editor        |
| `contract_ready_to_send`    | `/contracts/{id}#send`      | Send modal             |
| `contract_sent`             | `/contracts/{id}`           | Contract with tracking |
| `contract_viewed`           | `/contracts/{id}#analytics` | View analytics         |
| `contract_unsigned_warning` | `/contracts/{id}#resend`    | Resend prompt          |
| `contract_signed`           | `/contracts/{id}`           | Signed confirmation    |

### Communication

| Type                   | href Template                      | Deep Link Target      |
| ---------------------- | ---------------------------------- | --------------------- |
| `comm_unread_message`  | `/chat/{conversationId}`           | Conversation thread   |
| `comm_unreplied_12h`   | `/chat/{conversationId}#reply`     | Reply focused         |
| `comm_unreplied_24h`   | `/chat/{conversationId}#reply`     | Reply focused, urgent |
| `comm_client_update`   | `/events/{eventId}#changes`        | Change log            |
| `comm_email_pending`   | `/chat/{conversationId}#draft`     | Draft editor          |
| `comm_follow_up_timer` | `/chat/{conversationId}#follow-up` | Follow-up compose     |

### Payment & Money

| Type                     | href Template                               | Deep Link Target                |
| ------------------------ | ------------------------------------------- | ------------------------------- |
| `payment_received`       | `/payments/{id}`                            | Payment detail                  |
| `payment_pending`        | `/events/{eventId}#payments`                | Event payment section           |
| `payment_overdue`        | `/events/{eventId}#payments`                | Payment section, overdue banner |
| `payment_partial`        | `/events/{eventId}#payments`                | Payment breakdown               |
| `expense_unlogged`       | `/events/{eventId}#expenses`                | Expense logging form            |
| `payment_tip_received`   | `/payments/{id}`                            | Tip detail                      |
| `tax_quarterly_reminder` | `/analytics/reports?period=Q{quarter}`      | Quarterly report                |
| `revenue_milestone`      | `/analytics?metric=revenue&period={period}` | Revenue dashboard               |

### Calendar & Scheduling

| Type                        | href Template                     | Deep Link Target        |
| --------------------------- | --------------------------------- | ----------------------- |
| `calendar_empty_week`       | `/calendar/week?date={weekStart}` | Week view               |
| `calendar_overbooking`      | `/calendar/day?date={date}`       | Day view with conflicts |
| `calendar_availability_gap` | `/availability`                   | Availability editor     |
| `calendar_travel_time`      | `/calendar/travel?eventId={id}`   | Travel planning         |
| `calendar_block_conflict`   | `/calendar/day?date={date}`       | Day view with conflict  |
| `calendar_target_booking`   | `/analytics/goals`                | Booking goals           |

### Staff & Delegation

| Type                           | href Template             | Deep Link Target        |
| ------------------------------ | ------------------------- | ----------------------- |
| `staff_task_assigned`          | `/tasks/{id}`             | Task detail             |
| `staff_task_completed`         | `/tasks/{id}`             | Completed task          |
| `staff_delegation_opportunity` | `/events/{eventId}#staff` | Staff assignment        |
| `staff_no_show_risk`           | `/events/{eventId}#staff` | Staff section, warning  |
| `staff_schedule_gap`           | `/events/{eventId}#staff` | Staff assignment needed |

### Business Health

| Type                         | href Template                  | Deep Link Target     |
| ---------------------------- | ------------------------------ | -------------------- |
| `biz_revenue_trend`          | `/analytics?metric=revenue`    | Revenue dashboard    |
| `biz_booking_conversion`     | `/analytics/funnel`            | Funnel analysis      |
| `biz_client_retention`       | `/clients/insights/retention`  | Retention dashboard  |
| `biz_dormant_client`         | `/clients/{id}`                | Client profile       |
| `biz_review_new`             | `/reviews/{id}`                | Review detail        |
| `biz_review_response_needed` | `/reviews/{id}#respond`        | Response editor      |
| `biz_avg_rating_change`      | `/analytics?metric=rating`     | Rating trend         |
| `biz_food_cost_alert`        | `/culinary/costing/food-cost`  | Food cost dashboard  |
| `biz_pipeline_value`         | `/analytics/pipeline`          | Pipeline dashboard   |
| `biz_search_appearances`     | `/analytics?metric=visibility` | Visibility analytics |

### Client Management

| Type                       | href Template                             | Deep Link Target                |
| -------------------------- | ----------------------------------------- | ------------------------------- |
| `client_repeat_ready`      | `/clients/{id}`                           | Client profile with booking CTA |
| `client_vip_attention`     | `/clients/{id}`                           | VIP-badged profile              |
| `client_birthday_upcoming` | `/clients/{id}#milestones`                | Milestones section              |
| `client_anniversary`       | `/clients/{id}#milestones`                | Anniversary detail              |
| `client_at_risk`           | `/clients/insights/at-risk?clientId={id}` | At-risk analysis                |
| `client_dietary_update`    | `/clients/{id}/preferences`               | Preferences editor              |
| `client_preferences_gap`   | `/clients/{id}/preferences`               | Incomplete fields highlighted   |

### Profile & Presence

| Type                         | href Template                  | Deep Link Target    |
| ---------------------------- | ------------------------------ | ------------------- |
| `profile_completeness`       | `/settings/profile`            | Profile editor      |
| `profile_photo_needed`       | `/settings/profile#photos`     | Photo upload        |
| `profile_bio_incomplete`     | `/settings/profile#bio`        | Bio editor          |
| `profile_cuisine_coverage`   | `/settings/profile#cuisines`   | Cuisine picker      |
| `profile_availability_stale` | `/availability`                | Availability editor |
| `profile_visibility_signal`  | `/analytics?metric=visibility` | Visibility stats    |
| `profile_service_gap`        | `/settings/profile#services`   | Service type editor |

### Recipe & Menu

| Type                         | href Template                                | Deep Link Target       |
| ---------------------------- | -------------------------------------------- | ---------------------- |
| `recipe_undocumented`        | `/culinary/recipes/new?dishName={dishName}`  | Pre-filled recipe form |
| `recipe_capture_nudge`       | `/capture?eventId={eventId}&dish={dishName}` | Quick capture          |
| `recipe_missing_photo`       | `/culinary/recipes/{id}#photos`              | Photo upload           |
| `recipe_missing_yield`       | `/culinary/recipes/{id}#yield`               | Yield editor           |
| `recipe_missing_timing`      | `/culinary/recipes/{id}#timing`              | Timing editor          |
| `menu_no_prices`             | `/culinary/menus/{id}#pricing`               | Menu pricing           |
| `menu_seasonal_stale`        | `/culinary/menus/{id}#season`                | Season picker          |
| `menu_no_descriptions`       | `/culinary/menus/{id}#descriptions`          | Description editor     |
| `menu_completeness`          | `/culinary/menus/{id}`                       | Menu overview          |
| `recipe_documentation_score` | `/culinary/recipes?sort=undocumented`        | Sorted by gaps         |

### Pricing & Market (PIE)

| Type                      | href Template                                                  | Deep Link Target       |
| ------------------------- | -------------------------------------------------------------- | ---------------------- |
| `pie_price_drop`          | `/culinary/price-catalog?ingredient={slug}&alert=drop`         | Price chart            |
| `pie_price_spike`         | `/culinary/price-catalog?ingredient={slug}&alert=spike`        | Price chart + impact   |
| `pie_peak_window`         | `/culinary/seasonal-calendar?ingredient={slug}`                | Seasonal calendar      |
| `pie_seasonal_suggestion` | `/culinary/ingredients/seasonal-availability?highlight={slug}` | Seasonal view          |
| `pie_food_cost_impact`    | `/culinary/costing/food-cost?ingredient={slug}`                | Cost impact drill-down |
| `pie_market_gap`          | `/analytics/demand?gap={serviceType}`                          | Demand gap analysis    |
| `pie_competitive_signal`  | `/analytics/benchmarks?view=new-chefs`                         | Competitive view       |
| `pie_demand_trend`        | `/analytics/demand?cuisine={cuisine}`                          | Demand trend chart     |
| `pie_pricing_benchmark`   | `/analytics/benchmarks?metric=per-head`                        | Pricing comparison     |
| `pie_yield_factor_alert`  | `/culinary/ingredients/{id}#yield`                             | Yield factor detail    |

### Completion Nudges

| Type                        | href Template                       | Deep Link Target         |
| --------------------------- | ----------------------------------- | ------------------------ |
| `completion_event`          | `/events/{id}#completion`           | Completion tree          |
| `completion_menu`           | `/culinary/menus/{id}#completion`   | Menu completion          |
| `completion_recipe`         | `/culinary/recipes/{id}#completion` | Recipe completion        |
| `completion_recursive`      | `{deepestBlockerHref}`              | Deepest blocker in chain |
| `completion_client_profile` | `/clients/{id}#completion`          | Client completion        |
| `completion_overall`        | `/dashboard#readiness`              | Business readiness       |

### Social & Network

| Type                         | href Template                           | Deep Link Target |
| ---------------------------- | --------------------------------------- | ---------------- |
| `circle_activity`            | `/circles/{id}`                         | Circle detail    |
| `circle_cohost_invite`       | `/circles/{id}#invite`                  | Invite response  |
| `circle_shared_event`        | `/events/{eventId}`                     | Shared event     |
| `network_collab_opportunity` | `/community/directory/{chefSlug}`       | Chef profile     |
| `network_referral_received`  | `/inquiries/{inquiryId}`                | Referred inquiry |
| `network_vendor_update`      | `/culinary/vendors/{id}`                | Vendor detail    |
| `platform_announcement`      | `/community/roadmap#{announcementSlug}` | Announcement     |
| `network_contact_share`      | `/community/messaging/{shareId}`        | Share detail     |

### Culinary Intelligence

| Type                                | href Template                                  | Deep Link Target |
| ----------------------------------- | ---------------------------------------------- | ---------------- |
| `culinary_technique_trend`          | `/culinary/tips?technique={slug}`              | Technique tips   |
| `culinary_ingredient_lifecycle`     | `/culinary/ingredients/{id}#lifecycle`         | Lifecycle view   |
| `culinary_food_safety_window`       | `/culinary/ingredients/{id}#safety`            | Safety timeline  |
| `culinary_seasonal_menu_suggestion` | `/culinary/menus?filter=needs-seasonal-update` | Filtered menus   |
| `culinary_recipe_inspiration`       | `/culinary/recipes/new?suggestion={slug}`      | Pre-filled form  |
| `culinary_dish_rotation`            | `/culinary/dish-index/{id}`                    | Dish detail      |
| `culinary_waste_alert`              | `/inventory?view=waste&period={period}`        | Waste analysis   |

### Inventory & Kitchen

| Type                          | href Template                              | Deep Link Target |
| ----------------------------- | ------------------------------------------ | ---------------- |
| `inventory_low_stock`         | `/inventory?filter=low-stock&item={id}`    | Low stock view   |
| `inventory_expiring`          | `/inventory?filter=expiring&item={id}`     | Expiry view      |
| `inventory_audit_due`         | `/inventory?view=audit`                    | Audit wizard     |
| `inventory_delivery_incoming` | `/inventory?view=deliveries&delivery={id}` | Delivery detail  |
| `inventory_waste_log`         | `/inventory?view=waste&eventId={id}`       | Waste log form   |
| `kitchen_item_condition`      | `/kitchen?item={id}`                       | Equipment detail |
| `kitchen_storage_capacity`    | `/inventory?view=storage`                  | Storage overview |
| `inventory_order_pending`     | `/inventory?view=orders&order={id}`        | Order tracking   |

### Commerce & POS

| Type                          | href Template                   | Deep Link Target  |
| ----------------------------- | ------------------------------- | ----------------- |
| `commerce_order_received`     | `/commerce/orders/{id}`         | Order detail      |
| `commerce_order_preparing`    | `/commerce/orders/{id}#kitchen` | Kitchen view      |
| `commerce_register_open`      | `/commerce/register`            | Register          |
| `commerce_reconciliation_gap` | `/commerce/reconciliation/{id}` | Reconciliation    |
| `commerce_settlement_pending` | `/commerce/settlements/{id}`    | Settlement detail |
| `commerce_storefront_update`  | `/commerce/storefront`          | Storefront editor |
| `commerce_daily_sales`        | `/commerce/reports?date=today`  | Daily report      |

### Marketing & Social Media

| Type                        | href Template                              | Deep Link Target     |
| --------------------------- | ------------------------------------------ | -------------------- |
| `social_post_due`           | `/social?post={id}`                        | Post editor          |
| `social_post_idea`          | `/social?view=ideas&idea={id}`             | Idea detail          |
| `social_engagement_spike`   | `/analytics/marketing?platform={platform}` | Platform analytics   |
| `marketing_campaign_active` | `/marketing/{campaignId}`                  | Campaign dashboard   |
| `marketing_review_request`  | `/reviews?action=request&clientId={id}`    | Review request       |
| `portfolio_update_needed`   | `/portfolio`                               | Portfolio editor     |
| `reputation_score_change`   | `/reputation`                              | Reputation dashboard |

### Expenses & Finance

| Type                         | href Template                                  | Deep Link Target    |
| ---------------------------- | ---------------------------------------------- | ------------------- |
| `expense_receipt_scan`       | `/receipts?action=scan`                        | Scanner             |
| `expense_mileage_log`        | `/expenses/new?type=mileage&eventId={id}`      | Mileage form        |
| `finance_profit_margin`      | `/finance?eventId={id}`                        | Event P&L           |
| `finance_year_end`           | `/analytics/reports?period=year&action=export` | Year-end export     |
| `expense_category_overspend` | `/expenses?category={category}&period=month`   | Category drill-down |

### Leads & Prospecting

| Type                      | href Template                   | Deep Link Target   |
| ------------------------- | ------------------------------- | ------------------ |
| `lead_new_guest`          | `/guest-leads/{id}`             | Lead detail        |
| `lead_warm`               | `/leads/{id}`                   | Warm lead with CTA |
| `lead_cold_reactivation`  | `/leads/{id}?action=reactivate` | Reactivation flow  |
| `pipeline_stage_change`   | `/pipeline?clientId={id}`       | Pipeline card      |
| `prospecting_opportunity` | `/prospecting?opportunity={id}` | Opportunity detail |
| `wix_submission`          | `/wix-submissions/{id}`         | Submission detail  |

### Guest Management

| Type                      | href Template                               | Deep Link Target  |
| ------------------------- | ------------------------------------------- | ----------------- |
| `guest_rsvp_pending`      | `/guests?eventId={id}&filter=pending`       | Pending RSVPs     |
| `guest_dietary_conflict`  | `/guests?eventId={id}&alert=dietary`        | Dietary conflicts |
| `guest_headcount_change`  | `/events/{id}#guests`                       | Guest section     |
| `guest_waitlist_notify`   | `/waitlist?eventId={id}&guest={guestId}`    | Waitlist entry    |
| `guest_survey_response`   | `/surveys/{surveyId}?response={responseId}` | Response detail   |
| `guest_analytics_insight` | `/guest-analytics?eventId={id}`             | Guest analytics   |

### Documents & Proposals

| Type                | href Template               | Deep Link Target |
| ------------------- | --------------------------- | ---------------- |
| `document_unsigned` | `/documents/{id}`           | Document detail  |
| `proposal_draft`    | `/proposals/{id}`           | Proposal editor  |
| `proposal_viewed`   | `/proposals/{id}#analytics` | View analytics   |
| `document_expiring` | `/documents/{id}#renew`     | Renewal prompt   |

### Operations & Tasks

| Type                       | href Template                       | Deep Link Target |
| -------------------------- | ----------------------------------- | ---------------- |
| `task_overdue`             | `/tasks/{id}`                       | Task detail      |
| `task_due_today`           | `/tasks/{id}`                       | Task detail      |
| `ops_checklist_incomplete` | `/ops?eventId={id}`                 | Event checklist  |
| `production_queue`         | `/queue`                            | Production queue |
| `ops_eighty_six`           | `/ops?action=86&item={itemName}`    | 86 management    |
| `ops_call_sheet`           | `/culinary/call-sheet?eventId={id}` | Call sheet       |

### Travel & Logistics

| Type                        | href Template                  | Deep Link Target |
| --------------------------- | ------------------------------ | ---------------- |
| `travel_departure_reminder` | `/travel?eventId={id}`         | Route/departure  |
| `travel_load_vehicle`       | `/travel?eventId={id}#packing` | Packing list     |
| `travel_multi_stop`         | `/travel?date={date}`          | Multi-stop route |
| `location_service_area`     | `/locations?eventId={id}`      | Service area map |

### Loyalty & Retention

| Type                          | href Template                                   | Deep Link Target |
| ----------------------------- | ----------------------------------------------- | ---------------- |
| `loyalty_tier_upgrade`        | `/loyalty?clientId={id}`                        | Tier detail      |
| `loyalty_reward_earned`       | `/loyalty/rewards?clientId={id}`                | Reward detail    |
| `loyalty_points_expiring`     | `/loyalty/points?clientId={id}&filter=expiring` | Expiring points  |
| `loyalty_referral_received`   | `/loyalty/referrals/{id}`                       | Referral detail  |
| `loyalty_gift_card_purchased` | `/clients/gift-cards/{id}`                      | Gift card detail |

### Cannabis Operations

| Type                        | href Template                                         | Deep Link Target     |
| --------------------------- | ----------------------------------------------------- | -------------------- |
| `cannabis_compliance_check` | `/cannabis/compliance?eventId={id}`                   | Compliance checklist |
| `cannabis_agreement_needed` | `/cannabis/agreement?clientId={id}&eventId={eventId}` | Waiver send          |
| `cannabis_batch_tracking`   | `/cannabis/batches/{id}`                              | Batch detail         |
| `cannabis_dosage_plan`      | `/cannabis/control-packet?eventId={id}`               | Dosage plan          |
| `cannabis_rsvp_pending`     | `/cannabis/rsvps?eventId={id}`                        | Cannabis RSVPs       |

### Remy AI & Automation

| Type                     | href Template                 | Deep Link Target |
| ------------------------ | ----------------------------- | ---------------- |
| `remy_insight`           | `/insights/{id}`              | Insight detail   |
| `remy_draft_ready`       | `/remy?draft={id}`            | Draft review     |
| `remy_anomaly_detected`  | `/insights/{id}?type=anomaly` | Anomaly detail   |
| `autopilot_action_taken` | `/autopilot?action={id}`      | Action log       |
| `remy_client_intent`     | `/remy?intent={id}`           | Intent analysis  |
| `cil_signal`             | `/insights?signal={id}`       | Signal detail    |

### Notifications & Reminders

| Type                 | href Template                            | Deep Link Target    |
| -------------------- | ---------------------------------------- | ------------------- |
| `reminder_custom`    | `/reminders/{id}`                        | Reminder detail     |
| `reminder_recurring` | `/reminders/{id}`                        | Recurring detail    |
| `notification_batch` | `/notifications`                         | Notification center |
| `briefing_morning`   | `/briefing?date=today`                   | Morning briefing    |
| `briefing_weekly`    | `/briefing?period=week&date={weekStart}` | Weekly briefing     |

### Onboarding

| Type                    | href Template             | Deep Link Target     |
| ----------------------- | ------------------------- | -------------------- |
| `onboard_welcome`       | `/onboarding`             | Welcome wizard       |
| `onboard_profile_setup` | `/settings/profile`       | Profile editor       |
| `onboard_first_menu`    | `/culinary/menus/new`     | Menu creation        |
| `onboard_first_recipe`  | `/culinary/recipes/new`   | Recipe creation      |
| `onboard_availability`  | `/availability`           | Availability setup   |
| `onboard_pricing`       | `/settings#pricing`       | Pricing setup        |
| `onboard_first_client`  | `/clients/new`            | Client creation      |
| `onboard_service_area`  | `/settings#service-area`  | Area setup           |
| `onboard_payment_setup` | `/settings#payment`       | Payment setup        |
| `onboard_first_event`   | `/events/new`             | Event creation       |
| `onboard_progress`      | `/onboarding#progress`    | Progress tracker     |
| `onboard_config_engine` | `/onboarding#personalize` | Config questionnaire |

### Client-as-Diner

| Type                        | href Template                    | Deep Link Target   |
| --------------------------- | -------------------------------- | ------------------ |
| `diner_cuisine_browse`      | `/eat?cuisine={cuisineSlug}`     | Eat filtered       |
| `diner_occasion_browse`     | `/eat?occasion={occasionSlug}`   | Eat filtered       |
| `diner_find_tonight`        | `/eat?date=today&available=true` | Tonight's options  |
| `diner_saved_chef`          | `/chef/{chefSlug}`               | Saved chef profile |
| `diner_seasonal_pick`       | `/eat?seasonal=true`             | Seasonal picks     |
| `diner_personal_preference` | `/eat?personalized=true`         | Personalized feed  |

### System & Platform

| Type                          | href Template                       | Deep Link Target   |
| ----------------------------- | ----------------------------------- | ------------------ |
| `system_new_feature`          | `/features/{featureSlug}`           | Feature page       |
| `system_maintenance`          | `/help#status`                      | Status page        |
| `system_subscription_renewal` | `/settings/billing`                 | Billing            |
| `system_export_ready`         | `/analytics/reports#downloads`      | Downloads          |
| `system_integration_error`    | `/settings/integrations/{provider}` | Integration detail |
| `system_backup_reminder`      | `/settings#backup`                  | Backup tools       |

---

## Missing Route Coverage (Addendum)

Routes identified in `app/(chef)/` not yet covered by the 226 items above. These produce additional rail items:

### AFTER ACTION REVIEW

| #   | Type                    | Label Template              | Sublabel                               | Icon                  | Presentation | baseUrgency | decayFn | pageAffinity      | affinityBoost | hoverAction                                             | clickAction | href                    | dismissable | expandable         | maxImpressions | cooldownMin | expiresAt          | privacy |
| --- | ----------------------- | --------------------------- | -------------------------------------- | --------------------- | ------------ | ----------- | ------- | ----------------- | ------------- | ------------------------------------------------------- | ----------- | ----------------------- | ----------- | ------------------ | -------------- | ----------- | ------------------ | ------- |
| 227 | `aar_pending`           | `Review: {eventTitle}`      | "Event completed {timeAgo} - reflect?" | clipboard + reflect   | card         | 45          | linear  | `/aar`, `/events` | 20            | Preview: event summary, what went well, what to improve | navigate    | `/aar/new?eventId={id}` | yes         | yes (start review) | 5              | 4320        | 14 days post-event | tenant  |
| 228 | `aar_insight_available` | `AAR insight: {eventTitle}` | "{insightCount} learnings captured"    | lightbulb + clipboard | pill         | 20          | linear  | `/aar`, `/events` | 10            | Preview: key learnings, action items                    | navigate    | `/aar/{id}`             | yes         | no                 | 3              | 10080       | 30 days            | tenant  |

### PULSE / HEARTBEAT

| #   | Type            | Label Template          | Sublabel                                     | Icon            | Presentation | baseUrgency | decayFn | pageAffinity           | affinityBoost | hoverAction                                                    | clickAction | href                      | dismissable | expandable              | maxImpressions | cooldownMin | expiresAt  | privacy |
| --- | --------------- | ----------------------- | -------------------------------------------- | --------------- | ------------ | ----------- | ------- | ---------------------- | ------------- | -------------------------------------------------------------- | ----------- | ------------------------- | ----------- | ----------------------- | -------------- | ----------- | ---------- | ------- |
| 229 | `pulse_daily`   | `Daily pulse`           | "{score}/100 - {topSignal}"                  | heart + gauge   | metric       | 30          | none    | `/pulse`, `/dashboard` | 15            | Preview: health score breakdown, trend, anomalies              | navigate    | `/pulse?date=today`       | yes         | yes (expand dimensions) | 1              | 1440        | End of day | tenant  |
| 230 | `pulse_anomaly` | `Pulse alert: {metric}` | "{metric} is {direction} {delta}% vs normal" | heart + warning | alert        | 55          | linear  | `/pulse`, `/dashboard` | 20            | Preview: anomaly chart, historical comparison, root cause hint | navigate    | `/pulse?alert={metricId}` | yes         | no                      | 5              | 2880        | 7 days     | tenant  |

### CAPTURE (Quick Recipe/Photo Capture)

| #   | Type               | Label Template          | Sublabel                                       | Icon          | Presentation | baseUrgency | decayFn | pageAffinity                               | affinityBoost | hoverAction                                         | clickAction | href                    | dismissable | expandable             | maxImpressions | cooldownMin | expiresAt          | privacy |
| --- | ------------------ | ----------------------- | ---------------------------------------------- | ------------- | ------------ | ----------- | ------- | ------------------------------------------ | ------------- | --------------------------------------------------- | ----------- | ----------------------- | ----------- | ---------------------- | -------------- | ----------- | ------------------ | ------- |
| 231 | `capture_reminder` | `Capture: {eventTitle}` | "You made {dishCount} dishes - document them?" | camera + book | card         | 40          | linear  | `/capture`, `/events`, `/culinary/recipes` | 20            | Preview: dishes from event, one-tap capture buttons | navigate    | `/capture?eventId={id}` | yes         | yes (capture per dish) | 5              | 2880        | 14 days post-event | tenant  |

### NUTRITION

| #   | Type                            | Label Template             | Sublabel                                          | Icon             | Presentation | baseUrgency | decayFn | pageAffinity                      | affinityBoost | hoverAction                                                   | clickAction | href                                 | dismissable | expandable | maxImpressions | cooldownMin | expiresAt      | privacy |
| --- | ------------------------------- | -------------------------- | ------------------------------------------------- | ---------------- | ------------ | ----------- | ------- | --------------------------------- | ------------- | ------------------------------------------------------------- | ----------- | ------------------------------------ | ----------- | ---------- | -------------- | ----------- | -------------- | ------- |
| 232 | `nutrition_menu_gap`            | `Nutrition: {menuName}`    | "{undeclaredCount} dishes missing nutrition data" | heart + leaf     | pill         | 20          | none    | `/nutrition`, `/culinary/menus`   | 10            | Preview: dishes without nutrition info, auto-calculate option | navigate    | `/nutrition?menuId={id}`             | yes         | no         | 5              | 20160       | Recurring      | tenant  |
| 233 | `nutrition_allergen_undeclared` | `Allergen gap: {dishName}` | "No allergen declarations"                        | shield + warning | pill         | 35          | none    | `/nutrition`, `/culinary/recipes` | 15            | Preview: recipe ingredients, potential allergens detected     | navigate    | `/nutrition?recipeId={id}#allergens` | yes         | no         | 5              | 10080       | Until declared | tenant  |

### RATE CARD

| #   | Type                     | Label Template       | Sublabel                                          | Icon                   | Presentation | baseUrgency | decayFn | pageAffinity                          | affinityBoost | hoverAction                                                 | clickAction | href                 | dismissable | expandable | maxImpressions | cooldownMin | expiresAt           | privacy |
| --- | ------------------------ | -------------------- | ------------------------------------------------- | ---------------------- | ------------ | ----------- | ------- | ------------------------------------- | ------------- | ----------------------------------------------------------- | ----------- | -------------------- | ----------- | ---------- | -------------- | ----------- | ------------------- | ------- |
| 234 | `rate_card_stale`        | `Update rate card`   | "Last updated {days}d ago"                        | dollar + refresh       | pill         | 30          | inverse | `/rate-card`, `/settings`             | 10            | Preview: current rates, market comparison, update prompt    | navigate    | `/rate-card`         | yes         | no         | 5              | 20160       | Recurring quarterly | tenant  |
| 235 | `rate_card_below_market` | `Rates below market` | "Your {serviceType} is {percent}% below area avg" | dollar + trending-down | metric       | 35          | none    | `/rate-card`, `/analytics/benchmarks` | 15            | Preview: your rate vs market distribution, raise suggestion | navigate    | `/rate-card#compare` | yes         | no         | 3              | 20160       | Quarterly           | system  |

### STATIONS (Kitchen Stations)

| #   | Type                        | Label Template              | Sublabel                           | Icon             | Presentation | baseUrgency | decayFn  | pageAffinity                       | affinityBoost | hoverAction                                                   | clickAction | href                    | dismissable | expandable                 | maxImpressions | cooldownMin | expiresAt     | privacy |
| --- | --------------------------- | --------------------------- | ---------------------------------- | ---------------- | ------------ | ----------- | -------- | ---------------------------------- | ------------- | ------------------------------------------------------------- | ----------- | ----------------------- | ----------- | -------------------------- | -------------- | ----------- | ------------- | ------- |
| 236 | `station_bottleneck`        | `Bottleneck: {stationName}` | "{queueDepth} items backed up"     | flame + warning  | alert        | 70          | none     | `/stations`, `/production`, `/ops` | 30            | Preview: station queue, estimated clear time, reassign option | navigate    | `/stations/{id}`        | no          | yes (view queue, reassign) | -1             | 0           | Until cleared | shared  |
| 237 | `station_assignment_needed` | `Assign: {stationName}`     | "No one assigned for {eventTitle}" | person + station | pill         | 55          | deadline | `/stations`, `/staff`, `/events`   | 20            | Preview: station requirements, available staff                | navigate    | `/stations/{id}#assign` | no          | yes (assign staff)         | -1             | 0           | Event date    | shared  |

### PARTNERS

| #   | Type                   | Label Template           | Sublabel                                 | Icon                 | Presentation | baseUrgency | decayFn  | pageAffinity              | affinityBoost | hoverAction                                                  | clickAction | href                               | dismissable | expandable           | maxImpressions | cooldownMin | expiresAt  | privacy |
| --- | ---------------------- | ------------------------ | ---------------------------------------- | -------------------- | ------------ | ----------- | -------- | ------------------------- | ------------- | ------------------------------------------------------------ | ----------- | ---------------------------------- | ----------- | -------------------- | -------------- | ----------- | ---------- | ------- |
| 238 | `partner_opportunity`  | `Partner: {partnerName}` | "{partnerType} - {description}"          | handshake + plus     | card         | 35          | linear   | `/partners`, `/community` | 15            | Preview: partner details, collaboration potential            | navigate    | `/partners/{id}`                   | yes         | no                   | 3              | 10080       | 30 days    | tenant  |
| 239 | `partner_event_collab` | `Co-host: {partnerName}` | "{eventTitle} - venue/host coordination" | handshake + calendar | pill         | 50          | deadline | `/partners`, `/events`    | 20            | Preview: event details, partner role, coordination checklist | navigate    | `/partners/{id}?eventId={eventId}` | no          | yes (view checklist) | -1             | 0           | Event date | tenant  |

### CHARITY

| #   | Type                | Label Template           | Sublabel                                      | Icon          | Presentation | baseUrgency | decayFn | pageAffinity                | affinityBoost | hoverAction                                      | clickAction | href                          | dismissable | expandable | maxImpressions | cooldownMin | expiresAt          | privacy |
| --- | ------------------- | ------------------------ | --------------------------------------------- | ------------- | ------------ | ----------- | ------- | --------------------------- | ------------- | ------------------------------------------------ | ----------- | ----------------------------- | ----------- | ---------- | -------------- | ----------- | ------------------ | ------- |
| 240 | `charity_hours_log` | `Log charity hours`      | "{eventTitle} - pro bono work not logged"     | heart + clock | pill         | 25          | inverse | `/charity/hours`, `/events` | 10            | Preview: event details, hours input form         | navigate    | `/charity/hours?eventId={id}` | yes         | no         | 5              | 4320        | 30 days post-event | tenant  |
| 241 | `charity_milestone` | `Charity: {totalHours}h` | "You've donated {totalHours} hours this year" | heart + star  | badge        | 10          | none    | `/charity`, `/dashboard`    | 5             | Preview: charity summary, tax deduction reminder | navigate    | `/charity`                    | yes         | no         | 2              | 43200       | Annual             | tenant  |

### QUICK LOG

| #   | Type                | Label Template       | Sublabel                              | Icon           | Presentation | baseUrgency | decayFn | pageAffinity                         | affinityBoost | hoverAction                                                   | clickAction        | href                      | dismissable | expandable | maxImpressions | cooldownMin | expiresAt         | privacy |
| --- | ------------------- | -------------------- | ------------------------------------- | -------------- | ------------ | ----------- | ------- | ------------------------------------ | ------------- | ------------------------------------------------------------- | ------------------ | ------------------------- | ----------- | ---------- | -------------- | ----------- | ----------------- | ------- |
| 242 | `quick_log_expense` | `Quick log: expense` | "Recent event - log a purchase?"      | receipt + plus | pill         | 30          | linear  | `/quick-log`, `/expenses`, `/events` | 15            | Preview: quick expense form, recent events, common categories | quick_action (log) | `/quick-log?type=expense` | yes         | yes (form) | 5              | 1440        | 3 days post-event | tenant  |
| 243 | `quick_log_note`    | `Quick log: note`    | "Capture a thought before you forget" | pencil + plus  | pill         | 15          | none    | `/quick-log`, `/culinary/chefnotes`  | 5             | Preview: quick note form                                      | quick_action (log) | `/quick-log?type=note`    | yes         | no         | 3              | 2880        | Recurring         | tenant  |

### MEAL PREP (Recurring/Batch)

| #   | Type                 | Label Template            | Sublabel                               | Icon             | Presentation | baseUrgency | decayFn  | pageAffinity                         | affinityBoost | hoverAction                                      | clickAction | href                                | dismissable | expandable                     | maxImpressions | cooldownMin | expiresAt       | privacy |
| --- | -------------------- | ------------------------- | -------------------------------------- | ---------------- | ------------ | ----------- | -------- | ------------------------------------ | ------------- | ------------------------------------------------ | ----------- | ----------------------------------- | ----------- | ------------------------------ | -------------- | ----------- | --------------- | ------- |
| 244 | `meal_prep_due`      | `Meal prep: {clientName}` | "{mealCount} meals due {dueDate}"      | utensils + clock | card         | 65          | deadline | `/meal-prep`, `/calendar`, `/events` | 25            | Preview: meal plan, shopping list, prep timeline | navigate    | `/meal-prep?clientId={id}`          | no          | yes (view plan, shopping list) | -1             | 0           | Due date        | tenant  |
| 245 | `meal_prep_delivery` | `Deliver: {clientName}`   | "{mealCount} meals ready for drop-off" | truck + utensils | alert        | 75          | deadline | `/meal-prep`, `/travel`              | 30            | Preview: delivery details, route, client contact | navigate    | `/meal-prep?clientId={id}#delivery` | no          | no                             | -1             | 0           | Delivery window | tenant  |

### CONSULTING

| #   | Type                          | Label Template          | Sublabel                           | Icon                 | Presentation | baseUrgency | decayFn  | pageAffinity               | affinityBoost | hoverAction                                          | clickAction | href               | dismissable | expandable                    | maxImpressions | cooldownMin | expiresAt    | privacy |
| --- | ----------------------------- | ----------------------- | ---------------------------------- | -------------------- | ------------ | ----------- | -------- | -------------------------- | ------------- | ---------------------------------------------------- | ----------- | ------------------ | ----------- | ----------------------------- | -------------- | ----------- | ------------ | ------- |
| 246 | `consulting_session_upcoming` | `Consult: {clientName}` | "{sessionType} - {date} at {time}" | briefcase + calendar | card         | 60          | deadline | `/consulting`, `/calendar` | 25            | Preview: session details, prep notes, client history | navigate    | `/consulting/{id}` | no          | yes (view prep, client notes) | -1             | 0           | Session time | tenant  |

### IMPORT

| #   | Type            | Label Template                  | Sublabel                           | Icon             | Presentation | baseUrgency | decayFn | pageAffinity            | affinityBoost | hoverAction                                      | clickAction | href                     | dismissable | expandable               | maxImpressions | cooldownMin | expiresAt      | privacy |
| --- | --------------- | ------------------------------- | ---------------------------------- | ---------------- | ------------ | ----------- | ------- | ----------------------- | ------------- | ------------------------------------------------ | ----------- | ------------------------ | ----------- | ------------------------ | -------------- | ----------- | -------------- | ------- |
| 247 | `import_ready`  | `Import complete: {importType}` | "{count} records ready for review" | upload + check   | pill         | 40          | linear  | `/import`, `/dashboard` | 15            | Preview: import summary, review queue, conflicts | navigate    | `/import/{jobId}`        | yes         | yes (review records)     | 5              | 2880        | 7 days         | tenant  |
| 248 | `import_failed` | `Import failed: {importType}`   | "{errorDescription}"               | upload + warning | alert        | 55          | none    | `/import`, `/dashboard` | 20            | Preview: error details, retry option             | navigate    | `/import/{jobId}#errors` | no          | yes (view errors, retry) | -1             | 0           | Until resolved | tenant  |

### INBOX (Unified)

| #   | Type                 | Label Template   | Sublabel                         | Icon          | Presentation | baseUrgency | decayFn | pageAffinity           | affinityBoost | hoverAction                                         | clickAction | href                   | dismissable | expandable              | maxImpressions | cooldownMin | expiresAt      | privacy |
| --- | -------------------- | ---------------- | -------------------------------- | ------------- | ------------ | ----------- | ------- | ---------------------- | ------------- | --------------------------------------------------- | ----------- | ---------------------- | ----------- | ----------------------- | -------------- | ----------- | -------------- | ------- |
| 249 | `inbox_unread_count` | `{count} unread` | "Across {channelCount} channels" | inbox + badge | badge        | 50          | step    | `/inbox`, `/dashboard` | 25            | Preview: unread by channel, priority messages first | navigate    | `/inbox?filter=unread` | no          | yes (channel breakdown) | -1             | 0           | Until all read | tenant  |

### SAFETY

| #   | Type                            | Label Template                 | Sublabel                                               | Icon           | Presentation | baseUrgency | decayFn  | pageAffinity                    | affinityBoost | hoverAction                                           | clickAction | href                             | dismissable | expandable        | maxImpressions | cooldownMin | expiresAt   | privacy |
| --- | ------------------------------- | ------------------------------ | ------------------------------------------------------ | -------------- | ------------ | ----------- | -------- | ------------------------------- | ------------- | ----------------------------------------------------- | ----------- | -------------------------------- | ----------- | ----------------- | -------------- | ----------- | ----------- | ------- |
| 250 | `safety_certification_expiring` | `Cert expiring: {certName}`    | "Expires {expiryDate}"                                 | shield + clock | alert        | 70          | deadline | `/safety`, `/settings`          | 30            | Preview: certification details, renewal steps         | navigate    | `/safety?cert={id}`              | no          | no                | -1             | 0           | Expiry date | tenant  |
| 251 | `safety_allergen_protocol`      | `Allergen check: {eventTitle}` | "{allergenCount} allergens across {guestCount} guests" | shield + leaf  | card         | 65          | deadline | `/safety`, `/events`, `/guests` | 25            | Preview: per-guest allergen matrix, menu safety check | navigate    | `/safety?eventId={id}#allergens` | no          | yes (view matrix) | -1             | 0           | Event date  | tenant  |

### TEAM

| #   | Type                         | Label Template                | Sublabel                       | Icon             | Presentation | baseUrgency | decayFn  | pageAffinity                    | affinityBoost | hoverAction                                                      | clickAction | href                            | dismissable | expandable        | maxImpressions | cooldownMin | expiresAt  | privacy |
| --- | ---------------------------- | ----------------------------- | ------------------------------ | ---------------- | ------------ | ----------- | -------- | ------------------------------- | ------------- | ---------------------------------------------------------------- | ----------- | ------------------------------- | ----------- | ----------------- | -------------- | ----------- | ---------- | ------- |
| 252 | `team_member_added`          | `New team: {memberName}`      | "Joined as {role}"             | people + plus    | badge        | 20          | linear   | `/team`, `/staff`               | 10            | Preview: new member details, permissions, assignment suggestions | navigate    | `/team/{memberId}`              | yes         | no                | 2              | 4320        | 3 days     | shared  |
| 253 | `team_availability_conflict` | `Team conflict: {memberName}` | "Unavailable for {eventTitle}" | people + warning | pill         | 55          | deadline | `/team`, `/events`, `/calendar` | 20            | Preview: conflict details, backup options                        | navigate    | `/team/{memberId}#availability` | no          | yes (find backup) | -1             | 0           | Event date | shared  |

---

## Scoring Scenarios (Real-World Examples)

### Scenario 1: Tuesday Morning, Chef Has Event Thursday

Rail state for a chef with a Thursday dinner event for 8 guests:

| Position | Item                                            | Score | Why                                                             |
| -------- | ----------------------------------------------- | ----- | --------------------------------------------------------------- |
| 1        | `event_upcoming_3d` "Thursday: Johnson Dinner"  | 94    | baseUrgency 75 + deadline boost + event_ops weight 1.20         |
| 2        | `prep_shopping_list` "Shopping: Johnson Dinner" | 88    | baseUrgency 78 + deadline + event_prep weight 1.15              |
| 3        | `contract_unsigned_warning` "Unsigned: Johnson" | 85    | baseUrgency 88 + deadline + contract_ops 1.05                   |
| 4        | `inquiry_aging_24h` "Sarah waiting 24h"         | 82    | baseUrgency 95 + step boost + inquiry_ops 1.15, different event |
| 5        | `prep_equipment_check` "Equipment: Johnson"     | 76    | baseUrgency 65 + deadline + nests inside #1                     |
| 6        | `pie_price_drop` "Price drop: Salmon"           | 42    | baseUrgency 45 + affects Johnson menu + pie_market 0.70         |
| 7        | `recipe_undocumented` "Document: Risotto"       | 34    | baseUrgency 45 + no deadline + recipe_menu 0.75                 |
| 8        | `profile_completeness` "Profile: 72%"           | 23    | baseUrgency 35 + no urgency + profile 0.65                      |

### Scenario 2: Saturday Night, Chef at Event

Rail during live service:

| Position | Item                                       | Score | Why                                             |
| -------- | ------------------------------------------ | ----- | ----------------------------------------------- |
| 1        | `event_in_progress` "LIVE: Miller Wedding" | 100   | Maximum urgency, event_ops 1.20                 |
| 2        | `ops_eighty_six` "86'd: Sea Bass"          | 98    | baseUrgency 85 + live service + operations 1.10 |
| 3        | `station_bottleneck` "Bottleneck: Grill"   | 92    | baseUrgency 70 + live event affinity            |
| 4        | `commerce_order_received` "New order: #47" | 88    | Active POS during service                       |
| 5        | `guest_dietary_conflict` (nested in #1)    | n/a   | Nested sub-item                                 |

### Scenario 3: New Chef, First Week

Rail for a chef who just signed up:

| Position | Item                                           | Score | Why                                       |
| -------- | ---------------------------------------------- | ----- | ----------------------------------------- |
| 1        | `onboard_config_engine` "Personalize ChefFlow" | 70    | Config engine unlocks tailored experience |
| 2        | `onboard_welcome` "Welcome to ChefFlow"        | 68    | Progress tracker                          |
| 3        | `onboard_profile_setup` "Step 1: Profile"      | 65    | First step, highest onboarding urgency    |
| 4        | `platform_announcement` "Welcome features"     | 25    | Editorial content for new users           |

| (no operational items, no history, no data to drive other categories)

### Scenario 4: Monday Morning, Weekly Review

Rail on Monday after weekend events:

| Position | Item                                                | Score | Why                                     |
| -------- | --------------------------------------------------- | ----- | --------------------------------------- |
| 1        | `briefing_weekly` "Week ahead"                      | 52    | Monday morning trigger                  |
| 2        | `event_post_event` "Wrap up: Sat Wedding"           | 65    | Completed 2 days ago, expenses unlogged |
| 3        | `expense_unlogged` (nested in #2)                   | n/a   | Nested sub-item                         |
| 4        | `aar_pending` "Review: Sat Wedding"                 | 45    | Post-event reflection                   |
| 5        | `inquiry_new` "New inquiry: Chen"                   | 95    | Weekend inquiry, 36h old, step boost    |
| 6        | `biz_revenue_trend` "Revenue: $8,200"               | 30    | Weekly metric                           |
| 7        | `calendar_empty_week` "Open: Next week"             | 40    | No bookings next week                   |
| 8        | `marketing_review_request` "Ask for review: Miller" | 40    | Wedding was great, strike while hot     |

---

## Updated Item Count Summary

| Category                  | Count   |
| ------------------------- | ------- |
| Inquiry Lifecycle         | 9       |
| Quote Lifecycle           | 8       |
| Event Lifecycle           | 9       |
| Event Prep                | 6       |
| Contract Lifecycle        | 6       |
| Communication             | 6       |
| Payment & Money           | 8       |
| Calendar & Scheduling     | 6       |
| Staff & Delegation        | 5       |
| Business Health           | 10      |
| Client Management         | 7       |
| Profile & Presence        | 7       |
| Recipe & Menu             | 10      |
| Pricing & Market (PIE)    | 10      |
| Completion Nudges         | 6       |
| Social & Network          | 8       |
| Culinary Intelligence     | 7       |
| Inventory & Kitchen       | 8       |
| Commerce & POS            | 7       |
| Marketing & Social Media  | 7       |
| Expenses & Finance        | 5       |
| Leads & Prospecting       | 6       |
| Guest Management          | 6       |
| Documents & Proposals     | 4       |
| Operations & Tasks        | 6       |
| Travel & Logistics        | 4       |
| Loyalty & Retention       | 5       |
| Cannabis Operations       | 5       |
| Remy AI & Automation      | 6       |
| Notifications & Reminders | 5       |
| Onboarding                | 12      |
| Client-as-Diner           | 6       |
| System & Platform         | 6       |
| After Action Review       | 2       |
| Pulse / Heartbeat         | 2       |
| Capture                   | 1       |
| Nutrition                 | 2       |
| Rate Card                 | 2       |
| Stations                  | 2       |
| Partners                  | 2       |
| Charity                   | 2       |
| Quick Log                 | 2       |
| Meal Prep                 | 2       |
| Consulting                | 1       |
| Import                    | 2       |
| Inbox                     | 1       |
| Safety                    | 2       |
| Team                      | 2       |
| **TOTAL**                 | **253** |
