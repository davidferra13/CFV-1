# Everything a Chef Never Needs to Leave ChefFlow For

> **Purpose:** The inverse of `chef-exit-points-analysis.md`. Every workflow a chef completes
> entirely inside ChefFlow, from start to finish, no external tool required.
>
> **Date:** 2026-05-25

---

## Category 1: SELLING & BOOKING (Full Funnel, Zero External Tools)

| #   | What They Do Entirely In-App                                                                |
| --- | ------------------------------------------------------------------------------------------- |
| 1   | Receive inquiry (email auto-synced, or manual paste, or public booking page)                |
| 2   | Parse inquiry details (AI Smart Fill from pasted text, auto-extracts date/guests/budget)    |
| 3   | Research client history before responding (events, spend, preferences, dietary, all in-app) |
| 4   | Draft response to inquiry (AI generates, chef edits, sends via Gmail integration)           |
| 5   | Generate quote with pricing (AI suggestions, historical comparisons, per-guest breakdown)   |
| 6   | Send proposal with add-on options (template builder, selectable upgrades, running total)    |
| 7   | Track inquiry through pipeline (kanban: Needs Response -> Follow-Up -> Active -> Closed)    |
| 8   | Convert accepted quote to event (one click, all data carries forward)                       |
| 9   | Handle scheduling conflicts (calendar shows conflicts, waitlist management, gap detection)  |
| 10  | Send contract for signing (template-based + AI generator, delivered via event portal)       |
| 11  | Collect deposit (Stripe payment intent, tracks partial payments)                            |
| 12  | Manage payment plans (installment schedules with due dates)                                 |
| 13  | Handle booking changes (reschedule, guest count changes, scope drift change orders)         |
| 14  | Decline/cancel with reason tracking (FSM state, cancellation reason dialog)                 |
| 15  | Prospecting (admin): lead scrub, pipeline kanban, call queue, geographic clusters, scripts  |

---

## Category 2: MENU PLANNING & DESIGN (Complete Creative Workflow)

| #   | What They Do Entirely In-App                                                                 |
| --- | -------------------------------------------------------------------------------------------- |
| 16  | Build menu from scratch (wizard: metadata -> course builder -> breakdown)                    |
| 17  | Assemble menu from recipe library (drag from Templates, Past Menus, Recipes)                 |
| 18  | Duplicate and modify past menus (deep copy with auto-scale to new guest count)               |
| 19  | Scale menu to different guest count (widget: rescale, real-time cost update)                 |
| 20  | Check allergens against guest list (deterministic FDA Big 9 cross-check, auto on mount)      |
| 21  | Run deeper AI allergen analysis (risk matrix with severity/likelihood)                       |
| 22  | View cost per dish, per guest, total food cost % (live sidebar in editor)                    |
| 23  | Get seasonal warnings (intelligence panel: "butternut squash out of season in July")         |
| 24  | Check client taste profile while building menu (CP-Engine: hard vetoes, dislikes, ambiguity) |
| 25  | See menu history for this client (avoid repeats, honor favorites)                            |
| 26  | Set budget compliance targets and see violations (auto-compare cost vs quoted price)         |
| 27  | Add dietary toggles per dish (vegan, GF, nut-free, etc.)                                     |
| 28  | Add chef notes per dish (prep notes, plating, timing)                                        |
| 29  | Attach photos per dish                                                                       |
| 30  | Toggle menu as showcase/template for future reuse                                            |
| 31  | Tasting menu hub (dedicated builder)                                                         |
| 32  | Menu engineering analytics (profitability + popularity matrix, menu psychology)              |
| 33  | Bulk import menus (file upload or pasted text)                                               |
| 34  | Menu Intelligence (11 toggleable sections in editor context dock)                            |

---

## Category 3: RECIPE MANAGEMENT (Full IP Capture)

| #   | What They Do Entirely In-App                                                            |
| --- | --------------------------------------------------------------------------------------- |
| 35  | Capture recipe via Smart Import (paste text -> AI structures into fields)               |
| 36  | Capture recipe via Brain Dump (name + freeform text -> Ollama parses -> review -> save) |
| 37  | Sprint-capture multiple recipes in queue (paste -> parse -> save -> next, rapid fire)   |
| 38  | Manually enter recipe with structured ingredients (rows with qty, unit, yield %)        |
| 39  | Scale recipe by guest count (scaling calculator)                                        |
| 40  | View nutrition per serving (USDA data, macros, ingredient-level breakdown)              |
| 41  | View cost per recipe (ingredient costs from PIE, live total)                            |
| 42  | Track production history (dates cooked, shelf life, color-coded freshness)              |
| 43  | Track recipe stats (times cooked, would-use-again %, timing accuracy)                   |
| 44  | Manage recipe photo gallery                                                             |
| 45  | Organize into categories and collections                                                |
| 46  | Manage component library (sauces, stocks, garnishes, ferments, shared elements)         |
| 47  | Tag techniques, methods, difficulty, equipment                                          |
| 48  | Import from photos (batch photo-to-recipe via Gemini vision)                            |

---

## Category 4: INGREDIENT & PRICING (PIE Handles It)

| #   | What They Do Entirely In-App                                                          |
| --- | ------------------------------------------------------------------------------------- |
| 49  | Look up any ingredient price (15-tier resolution: 27+ sources, 15K+ items)            |
| 50  | Compare prices across stores (cross-store averaging, store scorecard)                 |
| 51  | Set personal price overrides (chef manual pin per ingredient)                         |
| 52  | View price history over time (line charts, source attribution)                        |
| 53  | Get price alerts (ingredients 30%+ above average)                                     |
| 54  | Set price watch list (target prices, alerts on drops)                                 |
| 55  | Browse full market catalog (search, filters by category/store/tier/stock)             |
| 56  | See seasonal availability (4 seasons + year-round flags)                              |
| 57  | Cost forecast (linear interpolation from historical data)                             |
| 58  | Anomaly detection (flags unusual price spikes)                                        |
| 59  | Auto-match ingredients to canonical names (pg_trgm, 5,435 names, alias-aware)         |
| 60  | Review and approve ingredient matches (batch confirm UI)                              |
| 61  | Receipt-to-price bridge (scan receipt -> auto-update ingredient prices)               |
| 62  | Food cost % targets by operation type (14 types, dynamic thresholds)                  |
| 63  | Weekly price briefing on dashboard                                                    |
| 64  | "On Sale This Week" page (current sale items from OpenClaw by category/store)         |
| 65  | Margin analysis per menu/event (actual vs target, alerts)                             |
| 66  | Price cascade (change an ingredient price -> preview impact across all recipes/menus) |

---

## Category 5: CLIENT MANAGEMENT (30-Panel CRM)

| #   | What They Do Entirely In-App                                                             |
| --- | ---------------------------------------------------------------------------------------- |
| 67  | Create client profile (quick add or full 8-section form)                                 |
| 68  | Track all client demographics (occupation, birthday, anniversary, formality, Instagram)  |
| 69  | Record dietary restrictions, allergies with severity, dislikes, favorites                |
| 70  | Track household members (each with own allergies/restrictions/preferences)               |
| 71  | Manage pet info (relevant for in-home cooking)                                           |
| 72  | Store kitchen profile (size, equipment, oven/burner/counter details)                     |
| 73  | Store security info (gate code, WiFi, parking, house rules)                              |
| 74  | Record service defaults (style, guest count, preferred days, budget, cleanup, leftovers) |
| 75  | View complete event history (table: all events, dates, statuses, revenue)                |
| 76  | View financial relationship (total spent, avg event value, LTV trajectory)               |
| 77  | Track loyalty status (tier, points, rewards earned/redeemed)                             |
| 78  | Write categorized notes (General, Dietary, Preference, Logistics, Relationship)          |
| 79  | Set milestone reminders (birthday, anniversary, 10th dinner)                             |
| 80  | View unified communication history (all threads, sentiment analysis)                     |
| 81  | Compose and send email/SMS directly from client profile                                  |
| 82  | Get AI client preference analysis (patterns, insights)                                   |
| 83  | Record internal assessment (referral potential, red flags, payment behavior, tipping)    |
| 84  | Track relationship timeline (unified activity feed)                                      |
| 85  | Link related clients (relationship type, shared households)                              |
| 86  | Segment clients (custom filter groups)                                                   |
| 87  | Detect duplicates                                                                        |
| 88  | Export all clients to CSV                                                                |
| 89  | Invite clients to portal (email invitation system)                                       |
| 90  | View client portal activity in real-time (presence monitoring, SSE)                      |
| 91  | Follow-through route (next-best-action with urgency/tier/signals)                        |
| 92  | Dormancy warnings + re-engagement prompts                                                |
| 93  | Profile completeness meter (what's missing)                                              |
| 94  | Issue gift cards/vouchers (create, track, redemption history)                            |
| 95  | Manage NDA coverage per client                                                           |

---

## Category 6: COMMUNICATION (In-App Email + Messaging)

| #   | What They Do Entirely In-App                                                             |
| --- | ---------------------------------------------------------------------------------------- |
| 96  | Receive emails (Gmail sync into unified inbox)                                           |
| 97  | Triage inbox (4 tabs: Unassigned, Action Required, Snoozed, Done)                        |
| 98  | Filter by turn (My Turn, Their Turn, No Action)                                          |
| 99  | Link messages to inquiries/events (AI-suggested or manual)                               |
| 100 | Star, snooze, resolve, reopen threads                                                    |
| 101 | Compose and send email replies (directly from inbox, via Gmail API)                      |
| 102 | AI-draft responses for inquiries (generate -> edit -> approve -> send)                   |
| 103 | Log messages from other channels (manual entry with source tag)                          |
| 104 | View full communication history per client (threaded, across all channels)               |
| 105 | Scan Gmail history (import past conversations to build context)                          |
| 106 | Set up response templates with variables ({{client_name}}, {{event_date}}, etc.)         |
| 107 | Configure auto-responses (trigger-based, business hours aware)                           |
| 108 | Set business hours + outside-hours message                                               |
| 109 | Compose direct outreach from client detail (email/SMS + track history)                   |
| 110 | Build and send email campaigns (audience, channel, schedule, stats, revenue attribution) |
| 111 | Create drip sequences (multi-step, timed, auto-enroll triggers)                          |
| 112 | Birthday auto-enrollment campaigns                                                       |

---

## Category 7: FINANCE & MONEY (Complete Financial Management)

| #   | What They Do Entirely In-App                                             |
| --- | ------------------------------------------------------------------------ |
| 113 | Generate invoices (from event data, line items, auto-calculate)          |
| 114 | Send invoices (PDF, printable, client portal access)                     |
| 115 | Track payment status (Stripe: pending, paid, overdue, refunded)          |
| 116 | Record manual payments (cash, check, Venmo/Zelle receipt logging)        |
| 117 | Process refunds (via Stripe for cancelled events)                        |
| 118 | Manage payment plans (installment schedule with due dates)               |
| 119 | Split billing across multiple payers                                     |
| 120 | Track all expenses by category (7 categories + receipt photos)           |
| 121 | Quick expense entry (floating button, Ctrl+Shift+E hotkey)               |
| 122 | Receipt OCR (upload -> auto-extract -> approve -> expense)               |
| 123 | Mileage logging (per event, for tax deduction)                           |
| 124 | Tip tracking (per event)                                                 |
| 125 | View immutable ledger (append-only, computed balances, CSV export)       |
| 126 | Run financial reports (9 types: Revenue, P&L, Tax Summary, YTD, etc.)    |
| 127 | Tax center (quarterly estimates, depreciation, home office, retirement)  |
| 128 | CPA-ready tax export (verified working, CSV + "Email to Myself")         |
| 129 | Sales tax management (state + local rates, filing frequency, remittance) |
| 130 | 1099-NEC contractor tracking                                             |
| 131 | 30-day cash flow forecast                                                |
| 132 | Revenue forecast with trend lines                                        |
| 133 | Break-even calculator                                                    |
| 134 | Revenue goals with progress tracking                                     |
| 135 | Budget tracker per event                                                 |
| 136 | Profit summary per event                                                 |
| 137 | Dispute tracking                                                         |
| 138 | Recurring invoices                                                       |
| 139 | Retainer management (agreement, billing timeline, linked events)         |
| 140 | Bank feed panel + manual transaction form                                |

---

## Category 8: EVENT OPERATIONS (Day-Of Execution)

| #   | What They Do Entirely In-App                                                        |
| --- | ----------------------------------------------------------------------------------- |
| 141 | Build day-of-production (DOP) schedule (phases, timing, notes)                      |
| 142 | Mobile DOP view (optimized for phone in kitchen)                                    |
| 143 | Build packing checklist (5 sections, tap-to-check)                                  |
| 144 | Manage travel plan (legs with stops)                                                |
| 145 | Kitchen Display System (fire -> plating -> served, per dish)                        |
| 146 | Time tracking (5 activity types, start/stop + manual, per event)                    |
| 147 | Temperature logging (food safety temps per item)                                    |
| 148 | Track shopping substitutions (what was swapped and why)                             |
| 149 | Track menu modifications (changes made day-of)                                      |
| 150 | Manage contingency plans (backup options if something goes wrong)                   |
| 151 | Service simulation (8-phase walkthrough of the full event)                          |
| 152 | Pre-service checklist (auto-generated: safety/dietary, prep, venue, staff, service) |
| 153 | Staff assignment and briefing (AI-generated briefing per staffer)                   |
| 154 | Staff clock in/out with elapsed time                                                |
| 155 | Task assignment to staff (2-tap quick assign)                                       |
| 156 | Live activity board (30s refresh, active/idle/offline status)                       |
| 157 | Station clipboard (par, on hand, need to make, waste, shelf life)                   |
| 158 | 86 toggle (mark items out of stock)                                                 |
| 159 | Unified order sheet (all "need to order" across stations)                           |
| 160 | Waste logging with reason badges                                                    |
| 161 | Operations log (append-only, permanent audit trail)                                 |
| 162 | Daily Ops Command Center (morning overview, quick actions, alerts)                  |
| 163 | Print any operational doc (8+ printable PDFs per event)                             |
| 164 | Photo gallery per event (capture moments, tag dishes)                               |

---

## Category 9: POST-EVENT (Closeout & Growth)

| #   | What They Do Entirely In-App                                              |
| --- | ------------------------------------------------------------------------- |
| 165 | Run close-out wizard (5 steps: tip, receipts, mileage, reflection, close) |
| 166 | File After Action Review (AAR) with calm/prep ratings + recipe feedback   |
| 167 | AI-generate AAR from event data                                           |
| 168 | Record recipe capture prompt ("what should I document from tonight?")     |
| 169 | Log carry-forward inventory (what's left over, what to use next)          |
| 170 | Log unused ingredients                                                    |
| 171 | Run post-dinner debrief (4 sections with photo upload)                    |
| 172 | Send client satisfaction survey                                           |
| 173 | AI-draft review request for client                                        |
| 174 | AI-generate social media captions from event                              |
| 175 | Send guest follow-up (post-event outreach panel)                          |
| 176 | Update client profitability metrics (auto-calculated)                     |
| 177 | View event recap (financial + operational summary)                        |
| 178 | View status history timeline (full FSM transition log)                    |

---

## Category 10: SCHEDULING & CALENDAR (Complete Time Management)

| #   | What They Do Entirely In-App                                                           |
| --- | -------------------------------------------------------------------------------------- |
| 179 | View month/week/day/year calendar (all events, prep blocks, calls, personal)           |
| 180 | Drag-and-drop reschedule events                                                        |
| 181 | Create calendar entries (3 types: Personal, Business, Intentions)                      |
| 182 | Set availability rules (hard blocks, event limits per day, buffer time between events) |
| 183 | Detect scheduling conflicts (auto-alert on overlap)                                    |
| 184 | Detect scheduling gaps (banner alerts for empty stretches)                             |
| 185 | Week view with prep block visualization                                                |
| 186 | Year view (52-week heatmap of utilization)                                             |
| 187 | Manage waitlist (add waiting entries, mark contacted, expire)                          |
| 188 | Share calendar via token (generate shareable URL)                                      |
| 189 | Sync with Google Calendar (bidirectional)                                              |
| 190 | Sync via iCal feed (read-only export for any calendar app)                             |
| 191 | Production calendar (monthly, color-coded by status)                                   |
| 192 | Auto-schedule suggestions (AI: "you have a gap Tuesday, here's a waitlist match")      |
| 193 | Seasonal palette sidebar (visual seasonal cue on calendar views)                       |

---

## Category 11: INVENTORY & PROCUREMENT (Full Supply Chain)

| #   | What They Do Entirely In-App                                             |
| --- | ------------------------------------------------------------------------ |
| 194 | Track par levels per item (set and monitor)                              |
| 195 | Enter inventory counts                                                   |
| 196 | Manage storage locations (create, transfer between)                      |
| 197 | Pantry view (what's on hand, low stock alerts, expiring items)           |
| 198 | Expiry tracking with configurable alerts                                 |
| 199 | Batch tracking (FIFO consumption, mark expired)                          |
| 200 | Generate purchase orders (manual or auto from event needs)               |
| 201 | Submit, receive, cancel POs                                              |
| 202 | Auto-reorder (preview, generate POs when below par)                      |
| 203 | Track vendor invoices                                                    |
| 204 | Vendor price comparison per ingredient                                   |
| 205 | Demand forecasting (14-day ahead based on upcoming events)               |
| 206 | Shortage alerts per event ("you'll be short 2lb butter for Saturday")    |
| 207 | Variance reporting (theoretical vs actual food cost per event)           |
| 208 | Event deduction (deduct inventory used at an event, with reverse option) |
| 209 | Staff meal logging with cost tracking                                    |
| 210 | Inventory audits (create, count, finalize, variance report)              |
| 211 | Transaction history (all movements in/out)                               |
| 212 | Depletion alerts with notifications                                      |
| 213 | Waste tracking with 6-month trend dashboard                              |
| 214 | Theoretical vs actual cost variance analysis                             |

---

## Category 12: STAFF MANAGEMENT (Full Team Ops)

| #   | What They Do Entirely In-App                                                      |
| --- | --------------------------------------------------------------------------------- |
| 215 | Maintain staff directory (profiles, roles, rates, contact)                        |
| 216 | Schedule staff (7-column week grid, assign to shifts)                             |
| 217 | Track availability (staff x 7-day grid, toggle Available/Unavailable/Unknown)     |
| 218 | Clock in/out with real-time elapsed time                                          |
| 219 | Performance tracking (on-time rate, cancellations, avg rating, events)            |
| 220 | Labor cost analysis (monthly breakdown, dual-axis charts)                         |
| 221 | Live activity board (auto-refresh, active/idle/offline)                           |
| 222 | Task board (daily, by date, by person, priority badges, kanban)                   |
| 223 | Task templates (opening/closing/prep/cleaning/custom)                             |
| 224 | One-click "Generate Today's Tasks"                                                |
| 225 | Quick-assign (2-tap task delegation)                                              |
| 226 | Task carry-forward (overdue auto-appears on today's board)                        |
| 227 | Staff portal with limited access (dashboard, tasks, clipboard, recipes, schedule) |
| 228 | Onboarding checklist per staff member                                             |
| 229 | Staff portal credential management                                                |
| 230 | AI staff briefing per event                                                       |
| 231 | 1099 contractor management                                                        |

---

## Category 13: AI ASSISTANCE (Local, Private, Always Available)

| #   | What They Do Entirely In-App                                          |
| --- | --------------------------------------------------------------------- |
| 232 | Chat with Remy (local AI, streaming, cancel, TTS, voice input)        |
| 233 | Get inquiry response drafts                                           |
| 234 | Get allergen analysis                                                 |
| 235 | Get nutritional summaries                                             |
| 236 | Get pricing intelligence                                              |
| 237 | Get staff briefings                                                   |
| 238 | Get prep timelines                                                    |
| 239 | Get service simulations                                               |
| 240 | Get AAR generation                                                    |
| 241 | Get review request drafts                                             |
| 242 | Get social media captions                                             |
| 243 | Get business insights from 25 intelligence engines                    |
| 244 | Get contract generation                                               |
| 245 | Get recipe parsing (text -> structured)                               |
| 246 | Get menu intelligence (11 context sections)                           |
| 247 | Brain dump intake (paste anything -> Remy sorts into categories)      |
| 248 | Bulk client import via transcript parsing                             |
| 249 | Search all past AI conversations                                      |
| 250 | Bookmark/export AI messages                                           |
| 251 | Save prompt templates for reuse                                       |
| 252 | All data stays local (IndexedDB + local Ollama, never leaves machine) |
| 253 | CIL pattern recognition (hourly scanner, 7 signal sources)            |

---

## Category 14: ANALYTICS & INTELLIGENCE (25 Engines, Zero AI Dependency)

| #   | What They Do Entirely In-App                         |
| --- | ---------------------------------------------------- |
| 254 | Revenue trend analysis                               |
| 255 | Booking pattern detection                            |
| 256 | Client concentration risk (Herfindahl index)         |
| 257 | Service mix analysis                                 |
| 258 | Inquiry conversion funnel                            |
| 259 | Expense breakdown                                    |
| 260 | Payment velocity tracking                            |
| 261 | Repeat client rate                                   |
| 262 | Quote win rate                                       |
| 263 | Dietary trend detection                              |
| 264 | Prep time estimation                                 |
| 265 | Communication cadence scoring                        |
| 266 | Event profitability ranking                          |
| 267 | Quote confidence scoring                             |
| 268 | Untapped market identification                       |
| 269 | Geographic hotspot mapping                           |
| 270 | Revenue per guest trending                           |
| 271 | Seasonal menu correlation                            |
| 272 | Client lifetime journey visualization                |
| 273 | Churn prevention alerts                              |
| 274 | Capacity ceiling detection                           |
| 275 | Price elasticity modeling                            |
| 276 | Referral chain mapping                               |
| 277 | Business Health score (0-100 composite)              |
| 278 | Custom report builder                                |
| 279 | Pipeline forecast (expected + best case revenue)     |
| 280 | Demand heatmap + holiday YoY comparison              |
| 281 | Daily automated report (13 categories, emailed 7 AM) |

---

## Category 15: MARKETING & GROWTH (In-App, No External Platforms)

| #   | What They Do Entirely In-App                                      |
| --- | ----------------------------------------------------------------- |
| 282 | Build email campaigns (audience, template, schedule, send)        |
| 283 | Track campaign performance (opens, clicks, revenue attribution)   |
| 284 | Create drip sequences (multi-step automated outreach)             |
| 285 | Push dinner campaigns (market available dates)                    |
| 286 | Content calendar planning (monthly scheduler)                     |
| 287 | Social post creation with AI assist (draft + schedule)            |
| 288 | Media vault (store photos/videos for reuse)                       |
| 289 | Template sharing in community                                     |
| 290 | Loyalty program (tiers, points, rewards, monthly raffle)          |
| 291 | Gift cards and vouchers                                           |
| 292 | Public booking page (shareable link, no external platform needed) |
| 293 | Embed widget (vanilla JS for personal website, no-code)           |
| 294 | Kiosk mode (tablet-based inquiry capture at events)               |
| 295 | QR codes for client portal + guest lead capture                   |
| 296 | Public chef profile with reviews (SEO-ready, JSON-LD)             |
| 297 | Guest lead capture + analytics (repeat guests, co-attendance)     |
| 298 | Brand mention monitoring (source, sentiment, reach)               |

---

## Category 16: COMMUNITY & NETWORKING (Chef-to-Chef, In-App)

| #   | What They Do Entirely In-App                                         |
| --- | -------------------------------------------------------------------- |
| 299 | Community feed (posts, 6 reaction types, threaded comments, stories) |
| 300 | Topic channels (join/leave, scoped discussions)                      |
| 301 | Discover trending chefs and hashtags                                 |
| 302 | Connect with other chefs (search, follow, friend, direct message)    |
| 303 | View other chef profiles                                             |
| 304 | Share templates (menus, recipes, messages, quotes)                   |
| 305 | Collaboration spaces                                                 |
| 306 | Chef Opportunity Network (referrals, knowledge sharing)              |
| 307 | Network notifications (12 types)                                     |
| 308 | Save/bookmark posts                                                  |

---

## Category 17: COMPLIANCE & SAFETY (Full Coverage)

| #   | What They Do Entirely In-App                                              |
| --- | ------------------------------------------------------------------------- |
| 309 | HACCP plan (auto-generated by archetype, guided review, notes)            |
| 310 | GDPR management (data export, privacy controls)                           |
| 311 | Incident reporting (12-field form) + resolution tracking                  |
| 312 | Food safety temperature logging                                           |
| 313 | Allergen tracking at every level (ingredient, recipe, menu, event, guest) |
| 314 | NDA management per client                                                 |
| 315 | Emergency contacts                                                        |
| 316 | Backup chef contacts (priority ordered)                                   |
| 317 | Business continuity planning                                              |
| 318 | Crisis response protocols                                                 |
| 319 | Protection hub (insurance tracking, certifications, portfolio removal)    |
| 320 | Contract templates with AI generation                                     |

---

## Category 18: ONBOARDING & IMPORT (Zero Cold Start)

| #   | What They Do Entirely In-App                                                          |
| --- | ------------------------------------------------------------------------------------- |
| 321 | Guided setup wizard (profile, clients, recipes, staff, loyalty)                       |
| 322 | Archetype selector (Private Chef, Caterer, Meal Prep, Restaurant, Food Truck, Bakery) |
| 323 | Brain Dump import (paste anything -> AI sorts)                                        |
| 324 | CSV/Spreadsheet import                                                                |
| 325 | Past event import                                                                     |
| 326 | Take a Chef profile import                                                            |
| 327 | Inquiry import (CSV + freeform AI)                                                    |
| 328 | Client import (bulk)                                                                  |
| 329 | Recipe import (text + photos)                                                         |
| 330 | Receipt import                                                                        |
| 331 | Document import                                                                       |
| 332 | File upload                                                                           |
| 333 | Gmail history scan (import years of client communication)                             |
| 334 | Demo data manager (seed sample data to explore features)                              |

---

## Category 19: GUEST EXPERIENCE (Full Event Portal)

| #   | What They Do Entirely In-App                                               |
| --- | -------------------------------------------------------------------------- |
| 335 | Share event portal via QR code or link                                     |
| 336 | Guests RSVP through portal                                                 |
| 337 | Guests submit dietary info through portal                                  |
| 338 | Send day-before / day-of reminders to guests                               |
| 339 | Share documents with guests (recipe cards, wine pairings, thank-you notes) |
| 340 | Collect post-event feedback                                                |
| 341 | Guest Excitement Wall (moderated messages)                                 |
| 342 | Post-event guest outreach                                                  |
| 343 | Reconcile attendance vs RSVP                                               |
| 344 | Photo consent management                                                   |
| 345 | Guest lead capture (for future marketing)                                  |

---

## Category 20: DAILY OPERATIONS (Morning to Night)

| #   | What They Do Entirely In-App                                                          |
| --- | ------------------------------------------------------------------------------------- |
| 346 | Morning briefing (alerts, yesterday recap, today timeline, prep timers, tasks, staff) |
| 347 | AI-generated daily plan (4 swim lanes, checkboxes, time estimates)                    |
| 348 | Shift handoff notes (opening/mid/closing)                                             |
| 349 | Pre-service checklist (auto-generated per event)                                      |
| 350 | Prep timers with countdowns                                                           |
| 351 | Task carry-forward (yesterday's unfinished work surfaces today)                       |
| 352 | Quick links to today's critical actions                                               |
| 353 | Alert badges (overdue tasks, unanswered inquiries, stale follow-ups)                  |

---

## THE SCORE

| Metric                     | Count                                                            |
| -------------------------- | ---------------------------------------------------------------- |
| **Total in-app workflows** | **353**                                                          |
| **Total exit scenarios**   | **95**                                                           |
| **Ratio**                  | **79% of a chef's mapped digital workflows are inside ChefFlow** |

---

## What This Means

A chef using ChefFlow fully only leaves for:

1. **Physical world** (actual cooking, actual shopping, actual driving)
2. **Platform ecosystems they don't own** (Instagram, Amazon, vendor portals)
3. **Government portals** (licenses, permits, health dept)
4. **Communication channels clients chose** (SMS, WhatsApp, phone calls)
5. **Creative research** (YouTube techniques, food blogs, cookbooks)

Everything else: selling, planning, managing, tracking, communicating (email), analyzing, growing, hiring, complying, closing out, getting paid, and even networking with other chefs... happens without ever leaving ChefFlow.

---

## The Remaining Gap (What Would Push This Back Above 85%)

| Fix                                         | Exits Eliminated                            |
| ------------------------------------------- | ------------------------------------------- |
| PIE reliability to 95%+ coverage            | Exits 1-3, 6-7 (menu costing on store apps) |
| Inquiry consolidation (Thumbtack/Bark sync) | Exit 29 (responding on 3rd-party platforms) |
| In-app food safety reference                | Exit 23 (Googling safe temps)               |
| Venue profile storage                       | Exit 57 (researching venue kitchens)        |
| Weather widget on event detail              | Exit 58 (checking weather apps)             |
| Substitution engine                         | Exit 24 (Googling ingredient swaps)         |

Six improvements would remove or bridge the highest-frequency chef exits and push the mapped chef journey back above 85%.
