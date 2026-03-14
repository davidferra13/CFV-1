# Raspberry Pi AI — Master Responsibility List

> **153 total AI responsibilities** across the entire ChefFlow platform.
> Organized into 3 layers. Each item marked BUILT or NOT BUILT.
>
> **Privacy model:** All items run on the Raspberry Pi via Ollama (local network only).
> Client data never leaves your home network. No cloud AI fallbacks for sensitive data.

---

## Quick Stats

| Layer              | Total   | Built  | Not Built |
| ------------------ | ------- | ------ | --------- |
| Layer 1: Scheduled | 43      | 2      | 41        |
| Layer 2: On-Demand | 74      | 40     | 34        |
| Layer 3: Reactive  | 36      | 1      | 35        |
| **TOTAL**          | **153** | **43** | **110**   |

---

## LAYER 1: SCHEDULED (Automatic, Timer-Based)

These run on a schedule with zero user interaction. The Pi wakes up, does the work, goes back to sleep.

### Admin / Platform Health

| #   | Job                                                                                                                                                                             | Schedule           | Status    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------- |
| 1   | **AI Quality Simulation** — test Ollama outputs against scenarios, grade quality, write reports                                                                                 | Every 6 hours      | BUILT     |
| 2   | **Platform Anomaly Detection** — scan for zombie events (>30 days non-terminal), orphaned clients, failed crons, data integrity issues                                          | Daily (overnight)  | NOT BUILT |
| 3   | **Platform Growth Forecast** — predict chef signups, client growth, GMV trajectory from historical trends                                                                       | Weekly (Sunday)    | NOT BUILT |
| 4   | **Cron Health Prediction** — analyze cron heartbeat patterns, predict failures before they happen                                                                               | Every 6 hours      | NOT BUILT |
| 5   | **Admin Activity Audit** — scan audit log for unusual admin patterns (bulk deletions, off-hours access)                                                                         | Daily (overnight)  | NOT BUILT |
| 6   | **Payment Anomaly Detection** — flag suspicious transactions, mismatched ledger entries, failed Stripe transfers across all tenants                                             | Daily (overnight)  | NOT BUILT |
| 7   | **Chef Health Scoring** — score each chef's platform engagement (login frequency, feature adoption, event volume) to identify at-risk or underperforming chefs who need support | Weekly             | NOT BUILT |
| 8   | **User Behavior Analytics** — analyze click patterns, page dwell time, feature usage heatmaps, navigation paths to identify UX friction                                         | Weekly             | NOT BUILT |
| 9   | **Traffic Pattern Analysis** — analyze API route hit frequency, response times, error rates, peak usage hours                                                                   | Daily              | NOT BUILT |
| 10  | **Platform Announcement Drafting** — generate suggested announcements based on platform health metrics, upcoming maintenance, new features                                      | Weekly (Monday AM) | NOT BUILT |

### Chef / Business Intelligence

| #   | Job                                                                                                                                                                      | Schedule                  | Status    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- | --------- |
| 11  | **Ollama Model Warmup** — send a small test prompt on server startup to load model into memory                                                                           | On startup (once)         | BUILT     |
| 12  | **Auto Lead Scoring** — score all new/unscored inquiries that are >1 hour old                                                                                            | Every 2 hours             | NOT BUILT |
| 13  | **Weekly Business Insights** — pre-generate business health narrative (revenue trends, conversion rates, seasonality) and cache for instant dashboard loading            | Weekly (Sunday 6 PM)      | NOT BUILT |
| 14  | **Client Sentiment Monitoring** — scan top 50 clients by LTV, flag declining sentiment trends                                                                            | Nightly                   | NOT BUILT |
| 15  | **Client Churn Prediction** — analyze dormancy patterns, spending decline, communication gaps to predict who's about to leave                                            | Weekly                    | NOT BUILT |
| 16  | **Client Preference Refresh** — rebuild preference profiles (cuisine, service style, day-of-week, budget) for clients who had events in the past 7 days                  | Weekly                    | NOT BUILT |
| 17  | **Revenue Goal Progress Narrative** — generate a plain-English summary of where the chef stands vs their revenue goal, with specific suggestions                         | Weekly (Friday PM)        | NOT BUILT |
| 18  | **Demand Forecast Refresh** — regenerate monthly demand predictions incorporating latest inquiry data                                                                    | Monthly (1st of month)    | NOT BUILT |
| 19  | **Quote Win/Loss Analysis** — analyze accepted vs rejected quotes to identify pricing patterns, deal-breakers, winning strategies                                        | Weekly                    | NOT BUILT |
| 20  | **Menu Engineering Report** — identify star dishes (high profit + high popularity) vs dogs (low both), recommend menu changes                                            | Monthly                   | NOT BUILT |
| 21  | **Cost Trend Alert** — detect ingredient cost inflation trends, suggest alternatives or price adjustments                                                                | Weekly                    | NOT BUILT |
| 22  | **Pipeline Bottleneck Report** — identify which stage (inquiry > quote > accepted > paid) is leaking the most leads and why                                              | Weekly                    | NOT BUILT |
| 23  | **Burnout Risk Assessment** — analyze events/week, rest days, journal entries, satisfaction to proactively warn about burnout                                            | Weekly                    | NOT BUILT |
| 24  | **Certification Expiry Warnings** — scan all certifications (ServSafe, food handler, LLC, insurance) and generate reminder emails 30/14/7 days before expiry             | Daily                     | NOT BUILT |
| 25  | **Insurance Adequacy Check** — compare current insurance coverage against booking volume, event sizes, and risk profile                                                  | Monthly                   | NOT BUILT |
| 26  | **Referral Source ROI** — analyze which referral sources produce the highest-LTV clients                                                                                 | Monthly                   | NOT BUILT |
| 27  | **Year-Over-Year Comparison** — generate automated YoY comparison narrative (this month vs same month last year)                                                         | Monthly                   | NOT BUILT |
| 28  | **Daily Briefing Pre-Generation** — pre-build the chef's daily briefing (today's events, open tasks, outstanding payments, follow-ups due) so it loads instantly at 6 AM | Daily (5:30 AM)           | NOT BUILT |
| 29  | **Vendor Price Comparison** — compare ingredient prices across saved vendors, flag when a vendor's prices have increased significantly                                   | Weekly                    | NOT BUILT |
| 30  | **Food Cost % Alert** — flag when rolling 30-day food cost % exceeds target (e.g., >35%)                                                                                 | Weekly                    | NOT BUILT |
| 31  | **Seasonal Menu Suggestions** — suggest recipes based on what's in season, local availability, and past menu performance                                                 | Monthly (start of season) | NOT BUILT |

### Marketing & Social

| #   | Job                                                                                                                                                              | Schedule                           | Status    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | --------- |
| 32  | **Social Post Performance Analysis** — analyze engagement across platforms, recommend optimal posting times and content types                                    | Weekly                             | NOT BUILT |
| 33  | **Campaign Performance Summary** — generate narrative report on email/SMS campaign open rates, click rates, conversions                                          | Weekly                             | NOT BUILT |
| 34  | **Hashtag Trend Analysis** — identify trending food/chef hashtags relevant to the chef's niche                                                                   | Weekly                             | NOT BUILT |
| 35  | **Review Sentiment Analysis** — analyze new reviews from Google/Yelp sync, flag negative ones requiring response                                                 | Daily                              | NOT BUILT |
| 36  | **Follow-Up Sequence Optimization** — analyze which follow-up sequences convert best, suggest improvements                                                       | Monthly                            | NOT BUILT |
| 37  | **A/B Test Auto-Resolution** — check running A/B tests, auto-select winners when statistical significance is reached                                             | Daily                              | NOT BUILT |
| 38  | **Holiday Campaign Pre-Generation** — draft holiday-specific campaigns 30 days before major holidays (Thanksgiving, Christmas, NYE, Valentine's, July 4th, etc.) | Monthly (checks upcoming holidays) | NOT BUILT |

### Staff & Operations

| #   | Job                                                                                                                       | Schedule | Status    |
| --- | ------------------------------------------------------------------------------------------------------------------------- | -------- | --------- |
| 39  | **Staff Performance Summary** — analyze clock-in/out patterns, event assignments, performance notes for each staff member | Monthly  | NOT BUILT |
| 40  | **Labor Cost Trend** — track labor cost as % of revenue, flag when trending up                                            | Weekly   | NOT BUILT |
| 41  | **Equipment Depreciation Alert** — flag equipment nearing end of useful life or overdue for maintenance                   | Monthly  | NOT BUILT |

### Safety & Compliance

| #   | Job                                                                                          | Schedule | Status    |
| --- | -------------------------------------------------------------------------------------------- | -------- | --------- |
| 42  | **Food Recall Monitoring** — scan FDA recall data for ingredients the chef commonly uses     | Daily    | NOT BUILT |
| 43  | **Incident Pattern Analysis** — analyze incident reports to identify recurring safety issues | Monthly  | NOT BUILT |

---

## LAYER 2: ON-DEMAND (User-Triggered)

These fire ONLY when someone clicks a button, opens a page, or asks Remy a question. The Pi does the work and returns the result.

### Parsing & Import (Chef triggers)

| #   | Feature                                                                                         | Status |
| --- | ----------------------------------------------------------------------------------------------- | ------ |
| 44  | **Parse Inquiry from Text** — extract date, budget, occasion, guest count from pasted email/DM  | BUILT  |
| 45  | **Parse Recipe from Text** — extract name, ingredients, method, allergens from natural language | BUILT  |
| 46  | **Brain Dump Parser** — structure messy chef notes into event data                              | BUILT  |
| 47  | **Parse Client from Text** — extract contact info, preferences, dietary needs                   | BUILT  |
| 48  | **Bulk Client Import** — batch parse multiple client records from CSV/paste                     | BUILT  |

### Lead & Financial Intelligence (Chef triggers)

| #   | Feature                                                                                           | Status    |
| --- | ------------------------------------------------------------------------------------------------- | --------- |
| 49  | **Lead Scoring** — score inquiry 0-100 for conversion likelihood                                  | BUILT     |
| 50  | **Pricing Intelligence** — recommend price band based on comparable past events                   | BUILT     |
| 51  | **Business Insights** — generate narrative analysis of YTD financials, actionable recommendations | BUILT     |
| 52  | **Tax Deduction Identifier** — suggest deductible categories for receipts/expenses                | BUILT     |
| 53  | **Equipment Depreciation Explainer** — explain depreciation schedules in plain English            | BUILT     |
| 54  | **Break-Even Analysis Narrative** — explain break-even point with context                         | NOT BUILT |

### Client & Relationship (Chef triggers)

| #   | Feature                                                                                                                      | Status    |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | --------- |
| 55  | **Client Sentiment Analysis** — analyze 20 recent messages for trend (improving/declining)                                   | BUILT     |
| 56  | **Client Preference Profile** — synthesize event history + messages into comprehensive profile                               | BUILT     |
| 57  | **Client Portal Triage** — classify incoming portal messages by urgency                                                      | BUILT     |
| 58  | **Client Lifetime Value Narrative** — explain LTV prediction in plain English with factors                                   | NOT BUILT |
| 59  | **Client Re-Engagement Draft** — generate personalized re-engagement email for dormant clients                               | NOT BUILT |
| 60  | **Client Anniversary/Milestone Recognition** — draft personalized milestone messages (100th event, 5-year anniversary, etc.) | NOT BUILT |

### Food Safety & Operations (Chef triggers)

| #   | Feature                                                                                           | Status    |
| --- | ------------------------------------------------------------------------------------------------- | --------- |
| 61  | **Allergen Risk Matrix** — scan menu vs guest allergies, create dish-guest risk grid              | BUILT     |
| 62  | **Temperature Log Anomaly Detection** — flag FDA violations in temp logs                          | BUILT     |
| 63  | **Carry-Forward Match** — match leftover ingredients to future event menus                        | BUILT     |
| 64  | **Contingency Plan Generator** — generate 4-6 contingency plans for an event (Gemini, not Ollama) | BUILT     |
| 65  | **Prep Timeline Generator** — create step-by-step prep timeline for an event                      | BUILT     |
| 66  | **Service Timeline Generator** — create front-of-house service flow                               | BUILT     |
| 67  | **Packing List Intelligence** — suggest packing list based on menu, venue, and past events        | NOT BUILT |
| 68  | **Cross-Contamination Risk Analysis** — analyze kitchen workflow for cross-contamination risks    | NOT BUILT |
| 69  | **Food Safety Incident Draft** — generate incident report narrative from structured data          | NOT BUILT |

### Communication Drafting (Chef triggers)

| #   | Feature                                                                                 | Status    |
| --- | --------------------------------------------------------------------------------------- | --------- |
| 70  | **Follow-Up Draft** — generate personalized follow-up email referencing last event      | BUILT     |
| 71  | **Contract Generator** — draft event contract from event details                        | BUILT     |
| 72  | **Staff Briefing** — generate pre-event briefing document for staff                     | BUILT     |
| 73  | **Campaign Outreach** — personalize campaign messages per recipient                     | BUILT     |
| 74  | **Social Captions** — generate platform-specific captions in 3 tones (Gemini)           | BUILT     |
| 75  | **Review Request Draft** — draft post-event review request email                        | BUILT     |
| 76  | **Gratuity Framing** — suggest how to frame gratuity/tip context                        | BUILT     |
| 77  | **Chef Bio Generator** — auto-generate chef biography from profile data                 | BUILT     |
| 78  | **Thank-You Note Draft** — draft personalized post-event thank you                      | NOT BUILT |
| 79  | **Referral Request Draft** — draft referral ask for happy clients                       | NOT BUILT |
| 80  | **Testimonial Request Draft** — draft request for a testimonial from a satisfied client | NOT BUILT |
| 81  | **Quote Cover Letter** — draft personalized cover note for a quote/proposal             | NOT BUILT |
| 82  | **Decline Response Draft** — draft professional response when declining an inquiry      | NOT BUILT |
| 83  | **Cancellation Response Draft** — draft empathetic response when client cancels         | NOT BUILT |
| 84  | **Payment Reminder Draft** — draft friendly payment reminder with context               | NOT BUILT |

### Expense & Receipt (Chef triggers)

| #   | Feature                                                                             | Status    |
| --- | ----------------------------------------------------------------------------------- | --------- |
| 85  | **Expense Auto-Categorizer** — suggest category for expense description             | BUILT     |
| 86  | **Receipt Parser** — OCR and extract vendor, amount, date, items from receipt photo | BUILT     |
| 87  | **Mileage Trip Categorizer** — categorize mileage trips for tax deduction           | NOT BUILT |

### Culinary Intelligence (Chef triggers)

| #   | Feature                                                                              | Status    |
| --- | ------------------------------------------------------------------------------------ | --------- |
| 88  | **Recipe Scaling** — scale recipe with non-linear adjustments (Gemini)               | BUILT     |
| 89  | **Menu Nutritional Analysis** — compute nutrition for full menu                      | BUILT     |
| 90  | **Menu Suggestions** — recommend dishes based on event type, season, preferences     | BUILT     |
| 91  | **Vendor Comparison** — compare vendor quotes for ingredients                        | BUILT     |
| 92  | **Recipe Cost Optimization** — suggest ingredient substitutions to lower food cost   | NOT BUILT |
| 93  | **Seasonal Ingredient Suggestion** — suggest what's in season for a given event date | NOT BUILT |
| 94  | **Wine/Beverage Pairing** — suggest pairings based on menu                           | NOT BUILT |
| 95  | **Portion Calculator Narrative** — explain portion sizing rationale for guest count  | NOT BUILT |

### Analytics On-Demand (Chef triggers)

| #   | Feature                                                                                                       | Status    |
| --- | ------------------------------------------------------------------------------------------------------------- | --------- |
| 96  | **Testimonial Selection** — auto-select best testimonials for portfolio                                       | BUILT     |
| 97  | **Privacy Audit** — scan data for PII compliance                                                              | BUILT     |
| 98  | **Permit Checklist** — generate compliance checklist for event type/location                                  | BUILT     |
| 99  | **After-Action Review Generator** — draft post-event AAR with lessons learned                                 | BUILT     |
| 100 | **Competitor Analysis** — analyze imported competitor data for positioning insights                           | NOT BUILT |
| 101 | **Pricing Recommendation Engine** — suggest price for new event based on all historical data + market factors | NOT BUILT |

### Remy Chatbot (Chef triggers via conversation)

| #   | Feature                                                                                                     | Status    |
| --- | ----------------------------------------------------------------------------------------------------------- | --------- |
| 102 | **Remy Question Answering** — answer chef questions using business context                                  | BUILT     |
| 103 | **Remy Command Execution** — parse and execute multi-step commands (22+ task types)                         | BUILT     |
| 104 | **Remy Intent Classification** — classify message as question/command/mixed                                 | BUILT     |
| 105 | **Remy Context Loading** — fetch business context for personalized responses                                | BUILT     |
| 106 | **Remy Artifact Persistence** — save/pin/delete AI-generated content                                        | BUILT     |
| 107 | **Remy Proactive Suggestions** — Remy notices patterns and proactively suggests actions without being asked | NOT BUILT |
| 108 | **Remy Learning from Chef Edits** — track when chef modifies AI drafts to improve future outputs            | NOT BUILT |

### Admin On-Demand (Admin triggers)

| #   | Feature                                                                                                            | Status    |
| --- | ------------------------------------------------------------------------------------------------------------------ | --------- |
| 109 | **Platform Health Narrative** — generate plain-English summary of platform health metrics                          | NOT BUILT |
| 110 | **Chef Onboarding Recommendations** — suggest which features a new chef should enable first based on their profile | NOT BUILT |
| 111 | **Broadcast Email Draft** — draft platform-wide announcement email                                                 | NOT BUILT |
| 112 | **Reconciliation Mismatch Explanation** — explain why a payment doesn't match the ledger                           | NOT BUILT |
| 113 | **Feature Adoption Report** — narrative report on which features chefs use most/least                              | NOT BUILT |

### Client On-Demand (Client triggers)

| #   | Feature                                                                                                | Status    |
| --- | ------------------------------------------------------------------------------------------------------ | --------- |
| 114 | **Smart Inquiry Form** — help client articulate their event needs with guided AI prompts               | NOT BUILT |
| 115 | **Menu Explanation** — explain dishes, ingredients, allergen info in plain language for guests         | NOT BUILT |
| 116 | **Event Recap Summary** — generate a beautiful recap of the event for the client                       | NOT BUILT |
| 117 | **Dietary Accommodation Checker** — client enters dietary needs, AI confirms which menu items are safe | NOT BUILT |

---

## LAYER 3: REACTIVE (Auto-Fires on System Events)

These trigger automatically when something happens in the system — no timer, no click. An event occurs, and the AI responds.

### Message & Communication Events

| #   | Trigger Event                          | AI Action                                                                                                                       | Status          |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 118 | **Client message received**            | Extract insights (allergies, dates, budget, preferences) from message; auto-escalate high-confidence allergies to client record | BUILT           |
| 119 | **Negative review synced**             | Analyze sentiment, draft suggested response, alert chef                                                                         | NOT BUILT       |
| 120 | **Client email received (Gmail sync)** | Extract event-relevant data, update client preferences                                                                          | PARTIALLY BUILT |
| 121 | **Brand mention detected**             | Classify sentiment (positive/neutral/negative), alert if negative                                                               | NOT BUILT       |

### Inquiry & Lead Events

| #   | Trigger Event               | AI Action                                                                         | Status    |
| --- | --------------------------- | --------------------------------------------------------------------------------- | --------- |
| 122 | **New inquiry created**     | Auto-score lead (hot/warm/cold), notify chef with score                           | NOT BUILT |
| 123 | **Inquiry stale >48 hours** | Draft follow-up email, suggest to chef                                            | NOT BUILT |
| 124 | **Quote viewed by client**  | Analyze viewing pattern (time spent, pages viewed), predict acceptance likelihood | NOT BUILT |
| 125 | **Quote rejected**          | Analyze rejection, suggest what to change for next time                           | NOT BUILT |

### Event Lifecycle Events

| #   | Trigger Event               | AI Action                                                                        | Status    |
| --- | --------------------------- | -------------------------------------------------------------------------------- | --------- |
| 126 | **Event confirmed**         | Auto-generate staff briefing, prep timeline, packing list                        | NOT BUILT |
| 127 | **Event completed**         | Draft thank-you email, review request, generate AAR skeleton                     | NOT BUILT |
| 128 | **Event cancelled**         | Analyze cancellation reason, draft empathetic response, update client risk score | NOT BUILT |
| 129 | **Menu approved by client** | Run allergen risk matrix automatically, alert chef of any conflicts              | NOT BUILT |
| 130 | **Guest list updated**      | Re-run allergen risk if dietary restrictions changed                             | NOT BUILT |
| 131 | **Scope drift detected**    | Alert chef with summary of what changed and cost impact                          | NOT BUILT |

### Financial Events

| #   | Trigger Event                  | AI Action                                                         | Status    |
| --- | ------------------------------ | ----------------------------------------------------------------- | --------- |
| 132 | **Payment received**           | Update financial summary, check if fully paid, draft confirmation | NOT BUILT |
| 133 | **Payment overdue >7 days**    | Draft friendly reminder, escalate after 14 days                   | NOT BUILT |
| 134 | **Invoice sent**               | Predict payment timing based on client history                    | NOT BUILT |
| 135 | **Chargeback/dispute filed**   | Alert chef, draft dispute response with evidence summary          | NOT BUILT |
| 136 | **Revenue goal milestone hit** | Celebrate with chef (notification), suggest next target           | NOT BUILT |

### Client Relationship Events

| #   | Trigger Event                                                            | AI Action                                                        | Status    |
| --- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- | --------- |
| 137 | **Client goes dormant (90+ days no activity)**                           | Draft re-engagement email, suggest to chef                       | NOT BUILT |
| 138 | **Client birthday approaching**                                          | Draft birthday message, suggest gift card or special offer       | NOT BUILT |
| 139 | **Client milestone reached** (5th event, $10K spent, 1-year anniversary) | Draft recognition message, suggest loyalty reward                | NOT BUILT |
| 140 | **New client created**                                                   | Build initial preference profile from available data, score lead | NOT BUILT |
| 141 | **Client complaint detected** (negative sentiment in message)            | Alert chef immediately, draft empathetic response                | NOT BUILT |

### Staff Events

| #   | Trigger Event                                | AI Action                                            | Status    |
| --- | -------------------------------------------- | ---------------------------------------------------- | --------- |
| 142 | **Staff assigned to event**                  | Generate personalized briefing for that staff member | NOT BUILT |
| 143 | **Staff no-show detected** (clock-in missed) | Alert chef, suggest backup staff, update contingency | NOT BUILT |
| 144 | **Staff clock-out late**                     | Flag potential overtime, update labor cost estimate  | NOT BUILT |

### Safety Events

| #   | Trigger Event                               | AI Action                                                                 | Status    |
| --- | ------------------------------------------- | ------------------------------------------------------------------------- | --------- |
| 145 | **Temperature log entry out of range**      | Immediate alert with corrective action suggestion                         | NOT BUILT |
| 146 | **Safety incident reported**                | Draft incident report, suggest follow-up actions, check if patterns exist | NOT BUILT |
| 147 | **Food recall matching chef's ingredients** | Immediate alert with affected events and substitution suggestions         | NOT BUILT |

### Social & Marketing Events

| #   | Trigger Event                     | AI Action                                                         | Status    |
| --- | --------------------------------- | ----------------------------------------------------------------- | --------- |
| 148 | **Social post published**         | Track engagement, predict performance based on similar past posts | NOT BUILT |
| 149 | **Campaign email opened**         | Score lead engagement, suggest follow-up timing                   | NOT BUILT |
| 150 | **A/B test reaches significance** | Auto-select winner, notify chef, suggest broader rollout          | NOT BUILT |

### System Events

| #   | Trigger Event                | AI Action                                                     | Status    |
| --- | ---------------------------- | ------------------------------------------------------------- | --------- |
| 151 | **Ollama model updated**     | Run mini simulation to verify quality didn't degrade          | NOT BUILT |
| 152 | **Chef edits AI draft**      | Log the edit to learn preferences, improve future generations | NOT BUILT |
| 153 | **Integration sync failure** | Analyze error, suggest fix, retry with adjusted params        | NOT BUILT |

---

## Pi Capacity Notes

All 153 items run on a **Raspberry Pi 5 (8GB)** with `qwen3:8b` model via Ollama.

- **Scheduled jobs** total estimate: ~15-30 minutes of AI work per day (spread across overnight hours)
- **On-demand** requests: ~10-30 seconds each, queued one at a time
- **Reactive** triggers: fire-and-forget, non-blocking (main operation succeeds regardless)
- **Concurrency:** Ollama processes one request at a time; others queue. For a single chef, this is fine.
- **Upgrade path:** Mac Mini M4 (16GB) for 3-5 concurrent users, or Mac Mini M4 Pro (36GB) for 10+

## Related Docs

- [Raspberry Pi Setup](build-raspberry-pi-setup.md) — how the Pi was configured
- [Pi Setup Script](../scripts/pi-setup.sh) — one-shot SSH setup
- [Connect Script](../scripts/connect-pi.sh) — point ChefFlow at the Pi
- [Watchdog](../chefflow-watchdog.ps1) — health monitoring + auto-restart
