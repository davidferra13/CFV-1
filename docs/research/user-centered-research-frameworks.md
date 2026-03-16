# User-Centered Research Frameworks for ChefFlow

Research compiled: 2026-03-15

Actionable frameworks for conducting user research with private chefs on a B2B SaaS platform.

---

## 1. User Interview Guide

### Framework: Jobs-to-Be-Done (JTBD) + Contextual Inquiry

The best interview framework for ChefFlow combines JTBD (understanding what "job" chefs hire the tool to do) with contextual inquiry (understanding the real environment they work in: kitchens, cars, client homes).

### Interview Structure (45-60 minutes)

**Opening (5 min)** - Build rapport, explain there are no wrong answers, get consent to record.

**Block A: Daily Workflow (10 min)**

1. "Walk me through yesterday from when you woke up to when you were done working."
2. "What's the first thing you check on your phone in the morning related to work?"
3. "When you have 5 minutes between tasks, what admin work do you try to squeeze in?"
4. "What does 'inbox zero' look like for your business? When do you feel caught up?"
5. "How do you decide which client or event gets your attention first?"

**Block B: Pain Points with Current Tools (10 min)**

6. "What tools do you use right now to run your business? Walk me through each one."
7. "When was the last time you lost track of something important (a client detail, a payment, a dietary restriction)? What happened?"
8. "What's the most tedious task you do every week that you wish would just disappear?"
9. "Have you ever missed money because admin fell through the cracks? What happened?"
10. "If you could wave a magic wand and fix one thing about how you manage your business, what would it be?"

**Block C: Feature Discovery & Navigation (10 min)**

11. "When you open [current tool/ChefFlow], where do you go first? Why?"
12. "Have you ever known a feature existed but couldn't find it? What did you do?"
13. "Do you ever feel overwhelmed by how many options or screens there are? When?"
14. "If a new feature appeared tomorrow, how would you want to learn about it? (tooltip, email, video, someone showing you)"
15. "What features do you use every day vs. once a month vs. never?"

**Block D: Mobile vs. Desktop (5 min)**

16. "What percentage of your work-related app usage is on your phone vs. computer?"
17. "When you're at a client's home or at the market, what do you need to look up or do on your phone?"
18. "Is there anything you ONLY do on your computer because the phone version doesn't work well enough?"
19. "Do you use your phone one-handed while cooking or carrying groceries? Does that affect what you can do in apps?"

**Block E: Definition of "Done" (5 min)**

20. "When do you feel like your workday is actually over? What has to be true?"
21. "What's the difference between a good day and a bad day in your business?"
22. "If everything was handled perfectly, how many hours a week would you actually spend on admin?"

**Closing (5 min)** - "Anything I didn't ask about that frustrates you?" and "Who else should I talk to?"

### Interview Tips for Chefs Specifically

- **Schedule around service times.** Best windows: 9-11 AM (before prep) or after 8 PM (after service). Never during 2-6 PM.
- **Phone interviews work better.** Chefs are mobile-first and often driving between clients. Video calls feel like an obligation; phone calls feel like a conversation.
- **Expect multi-tasking.** They may be prepping, driving, or shopping during the call. That's fine; it's their real context.
- **Ask for screen shares cautiously.** Many chefs are self-conscious about their "messy" tool setup. Offer it but don't push.
- **Compensation:** $50-100 gift card or a free month of Pro. Chefs value their time intensely because cooking IS their income-generating activity; admin time is unpaid.

---

## 2. Usability Testing Protocol

### A. Task-Based Testing (Moderated, 30-45 min per session)

**Setup:**

- Use the real app (beta or production), not prototypes
- Record screen + audio (with consent)
- Moderator + 1 note-taker
- 5-8 participants per round (Nielsen: 5 users find ~85% of usability issues)

**Core Task Set for ChefFlow:**

| #   | Task                                                                                                         | What It Tests                        | Success Criteria                                                 |
| --- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------ | ---------------------------------------------------------------- |
| T1  | "You just got an email from a new client asking about a dinner party for 8 on April 15. Create the inquiry." | Inquiry creation flow                | Inquiry created with date, guest count, client info within 3 min |
| T2  | "Find that client's dietary restrictions and add that one guest is allergic to shellfish."                   | Client detail navigation, data entry | Allergy added, correct client, within 2 min                      |
| T3  | "Create a quote for that event: $150/person, 8 guests."                                                      | Quote creation, pricing              | Quote created with correct total ($1,200) within 3 min           |
| T4  | "Check your total revenue for last month."                                                                   | Dashboard/financial navigation       | Correct screen found within 30 sec                               |
| T5  | "Find all events happening next week."                                                                       | Calendar/event list navigation       | Correct view within 20 sec                                       |
| T6  | "A client just paid $600. Record that payment."                                                              | Payment recording flow               | Payment logged to correct event within 2 min                     |
| T7  | "You need to add a new recipe for Pan-Seared Salmon. Start that process."                                    | Recipe creation entry point          | Recipe form opened within 30 sec                                 |
| T8  | "Send a follow-up message to the client from task 1."                                                        | Communication/messaging              | Message sent within 2 min                                        |

**Metrics to capture per task:**

- Time to completion
- Number of clicks/taps
- Number of errors or wrong paths
- Whether they completed it at all (pass/fail)
- Self-reported difficulty (1-5 after each task)

### B. Think-Aloud Protocol

**Use concurrent think-aloud** (talk while doing), not retrospective. Chefs are action-oriented; asking them to replay their thinking afterwards loses nuance.

**Moderator script:**

> "I'm going to give you some tasks to do in ChefFlow. As you work through them, please say out loud everything you're thinking. Tell me what you're looking at, what you're trying to do, what confuses you, what you expect to happen. There are no wrong answers. I'm testing the software, not you."

**Prompts when they go silent (wait 10 seconds first):**

- "What are you thinking right now?"
- "What are you looking for?"
- "What did you expect to happen there?"
- "Is that what you thought would be here?"

**Do NOT say:**

- "Try clicking on X" (leading)
- "That button is actually over there" (helping)
- "Most people do it this way" (biasing)

### C. First-Click Testing

**Key insight:** When users get their first click right, they have an 87% chance of completing the task. When wrong, only 46%.

**How to run it for ChefFlow:**

1. Show a screenshot of the dashboard (or any key page)
2. Give a task: "Where would you click to see your upcoming events?"
3. Record where they click FIRST
4. Repeat for 8-10 tasks across different pages

**Priority screens to test:**

- Dashboard (main hub, most first-clicks happen here)
- Navigation sidebar (do labels match mental models?)
- Event detail page (can they find quote, payment, client info?)
- Settings page (can they find what they need to configure?)

**Tools:** Lyssna, Maze, Optimal Workshop, or simply screen-record and mark clicks manually.

### D. Card Sorting (for Information Architecture)

**When to use:** Before reorganizing navigation, adding new sections, or when users consistently can't find features.

**Open card sort (discovery):**

1. Write each ChefFlow feature on a card (40-60 cards): "Create Quote," "View Calendar," "Record Payment," "Add Recipe," "Client Dietary Notes," "Revenue Report," etc.
2. Ask 15-20 chefs to group them into categories that make sense to THEM
3. Label each group
4. Analyze: what groups emerge? Do they match your current nav structure?

**Closed card sort (validation):**

1. Show your existing nav categories (Dashboard, Events, Clients, Menus, Finance, Settings, etc.)
2. Ask chefs to place each feature card into the category where they'd look for it
3. Measure agreement: if <60% put a feature in the same category, the label or grouping is wrong

**Tools:** Optimal Sort, UXtweak, or physical index cards in person.

### E. Tree Testing (Navigation Validation)

**When to use:** After card sorting reveals a proposed structure, or to validate the current nav.

**How to run it:**

1. Export your navigation tree (no visual design, just the hierarchy):
   ```
   Dashboard
   Events
     > All Events
     > Calendar
     > Create Event
   Clients
     > Client List
     > Add Client
   Menus & Recipes
     > Menus
     > Recipes
     > Ingredients
   Finance
     > Revenue
     > Expenses
     > Payments
   ...
   ```
2. Give tasks: "Where would you find your total revenue for March?"
3. Users click through the tree to find the answer
4. Measure: directness (did they go straight there?), success rate, time

**Tool:** Treejack (Optimal Workshop).

**Sample size:** 50+ participants for statistical confidence (tree tests are unmoderated and fast, so larger samples are feasible).

---

## 3. Survey Design

### A. System Usability Scale (SUS)

The SUS is a 10-item standardized questionnaire. Use it as-is (do not modify the questions; the scoring depends on the exact wording).

**The 10 SUS Statements** (1 = Strongly Disagree, 5 = Strongly Agree):

1. I think that I would like to use ChefFlow frequently.
2. I found ChefFlow unnecessarily complex.
3. I thought ChefFlow was easy to use.
4. I think that I would need the support of a technical person to be able to use ChefFlow.
5. I found the various functions in ChefFlow were well integrated.
6. I thought there was too much inconsistency in ChefFlow.
7. I would imagine that most people would learn to use ChefFlow very quickly.
8. I found ChefFlow very cumbersome to use.
9. I felt very confident using ChefFlow.
10. I needed to learn a lot of things before I could get going with ChefFlow.

**Scoring:**

- Odd-numbered items (positive): score = response - 1
- Even-numbered items (negative): score = 5 - response
- Sum all 10 adjusted scores, multiply by 2.5
- Result: 0-100 scale

**Benchmarks:**

- Below 50: Unacceptable (urgent redesign needed)
- 50-67: Marginal (significant friction)
- 68: Industry average
- 68-80: Good (usable, room for improvement)
- 80-90: Excellent
- 90+: Best imaginable

**Sample size:** Minimum 12-15 responses. Target 20-30 for confidence. Run quarterly after major releases.

**When to deploy:** After a user has used ChefFlow for at least 2 weeks (not on day 1; they need enough exposure to judge).

### B. Feature Importance vs. Satisfaction Matrix

This combines two questions per feature to create a 2x2 prioritization grid.

**For each feature, ask TWO questions:**

1. "How important is [feature] to running your business?" (1-5: Not important to Critical)
2. "How satisfied are you with how [feature] works in ChefFlow?" (1-5: Very dissatisfied to Very satisfied)

**Feature list for ChefFlow:**

| Feature                         | Importance (1-5) | Satisfaction (1-5) |
| ------------------------------- | :--------------: | :----------------: |
| Creating and managing inquiries |                  |                    |
| Building quotes/proposals       |                  |                    |
| Event calendar and scheduling   |                  |                    |
| Client contact management       |                  |                    |
| Dietary restriction tracking    |                  |                    |
| Recipe management               |                  |                    |
| Menu planning and creation      |                  |                    |
| Payment tracking and invoicing  |                  |                    |
| Revenue and expense reporting   |                  |                    |
| Email integration               |                  |                    |
| Mobile access                   |                  |                    |
| AI assistant (Remy)             |                  |                    |
| Document management (contracts) |                  |                    |
| Staff management                |                  |                    |
| Grocery list generation         |                  |                    |
| Food costing                    |                  |                    |

**Plot on a 2x2 matrix:**

```
HIGH IMPORTANCE
        |
  FIX   |  MAINTAIN
  THESE  |  THESE
  FIRST  |  (doing well)
--------|--------
  LOW    |  OVER-
  PRIORITY| INVESTED
        |  (reduce effort?)
        |
LOW IMPORTANCE
   LOW SAT     HIGH SAT
```

- **Top-left (High importance, low satisfaction):** Critical gaps. Fix immediately.
- **Top-right (High importance, high satisfaction):** Strengths. Maintain and protect.
- **Bottom-left (Low importance, low satisfaction):** Ignore or deprioritize.
- **Bottom-right (Low importance, high satisfaction):** Possible over-investment.

### C. Net Promoter Score (NPS)

**Core question:** "On a scale of 0-10, how likely are you to recommend ChefFlow to a fellow private chef?"

**Follow-up questions (vary by score):**

For Detractors (0-6):

- "What's the main reason for your score?"
- "What would need to change for you to give a higher score?"

For Passives (7-8):

- "What's one thing that would make ChefFlow a must-have for you?"

For Promoters (9-10):

- "What do you value most about ChefFlow?"
- "Have you actually recommended it to anyone? What did you tell them?"

**NPS = % Promoters - % Detractors**

**Benchmarks for B2B SaaS:**

- Below 0: Alarm (more detractors than promoters)
- 0-30: Needs work
- 30-50: Good
- 50-70: Excellent
- 70+: World-class

**When to send:**

- After onboarding (30 days in)
- Quarterly for ongoing users
- After major feature releases
- NOT after a support ticket (biases results)

**B2B-specific tip:** In small markets like private chefs, every response matters more. Aim for 60%+ response rate. Keep the survey to 3-5 questions max. Send via the channel they already use (in-app or email, not a separate survey tool).

### D. Task Frequency Analysis

**Question format:** "How often do you do each of these tasks in ChefFlow?"

| Task                    | Daily | Weekly | Monthly | Rarely | Never |
| ----------------------- | :---: | :----: | :-----: | :----: | :---: |
| Check dashboard         |       |        |         |        |       |
| Respond to inquiries    |       |        |         |        |       |
| Create/send quotes      |       |        |         |        |       |
| Update event details    |       |        |         |        |       |
| Check calendar          |       |        |         |        |       |
| Record payments         |       |        |         |        |       |
| View revenue reports    |       |        |         |        |       |
| Add/edit recipes        |       |        |         |        |       |
| Create menus            |       |        |         |        |       |
| Use AI assistant (Remy) |       |        |         |        |       |
| Manage client info      |       |        |         |        |       |
| Generate grocery lists  |       |        |         |        |       |
| Track expenses          |       |        |         |        |       |
| Create contracts        |       |        |         |        |       |

**Why this matters:** Features used daily need to be fast, accessible, and mobile-friendly. Features used monthly can be deeper in the navigation. Features marked "Never" by most users are either undiscoverable or unnecessary.

---

## 4. Private Chef Persona Research

### What We Know About Private Chef Workflows

**The Core Cycle:**

```
Inquiry -> Quote -> Acceptance -> Menu Planning -> Grocery Shopping -> Prep -> Cook -> Invoice -> Payment -> Follow-up
```

This cycle runs concurrently for multiple clients at different stages. A chef on any given day might be:

- Responding to 2-3 new inquiries
- Sending a quote for next week's dinner party
- Finalizing a menu for this weekend
- Shopping for tomorrow's cook
- Prepping for tonight's event
- Invoicing for last week's event
- Chasing a payment from 2 weeks ago

**Key Persona Characteristics:**

| Attribute                  | Reality                                                                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Primary device             | Phone (60-80% of business admin done on mobile)                                                                                  |
| When they do admin         | Morning before prep, driving between clients, late evening after service                                                         |
| Biggest time sink          | Quoting, invoicing, and chasing payments                                                                                         |
| Biggest fear               | Missing a dietary restriction (liability), losing a client inquiry (lost revenue)                                                |
| Tool stack before ChefFlow | Google Docs + Excel + WhatsApp + QuickBooks + email + notes app (5-7 tools)                                                      |
| Tech comfort               | Moderate. Comfortable with apps but impatient with complex UIs. If it takes more than 2 taps, they'll use a text message instead |
| Decision maker             | They ARE the decision maker (solo operator or very small team)                                                                   |
| Budget sensitivity         | High. Every dollar spent on tools is a dollar not earned cooking                                                                 |
| Seasonal patterns          | Heavy: holidays, wedding season (May-Oct), corporate Q4. Light: January, August                                                  |
| Working hours              | Irregular. Could be 6 AM prep, noon shopping, 4 PM setup, 10 PM cleanup                                                          |

**Pain Points Ranked by Severity (from industry research):**

1. **Time on admin vs. cooking.** Chefs report spending more time on invoices, proposals, grocery lists, and backend work than actually cooking. This is the #1 frustration.

2. **Tool fragmentation.** Managing menus, tracking clients, scheduling, chasing payments, and managing staff across 5+ separate apps. Every context switch costs time and increases error risk.

3. **Payment collection.** Chasing late payments is emotionally draining and financially stressful. Chefs are uncomfortable being the "bill collector" for their own clients.

4. **Information scattered.** Not knowing at a glance: Is the grocery list done? Was the invoice sent? Did they pay? Do I have the allergy info? Having to check 3 different places for 3 different answers.

5. **Client communication overhead.** Responding to the same questions repeatedly (pricing, availability, menu options). Every inquiry requires a custom response that takes 15-30 minutes.

6. **Scaling difficulty.** Going from 2 clients/week to 8 clients/week breaks every manual process. What worked with a notebook doesn't work with a full calendar.

**Mobile Usage Patterns (Critical for ChefFlow):**

- **At the market:** Need to check grocery lists, client preferences, allergy info. Must work one-handed.
- **Driving between clients:** Voice-to-text for quick replies, checking next event details at a red light.
- **At client's home:** Checking menu details, confirming guest count, reviewing special requests. Often while hands are busy.
- **Late at night:** Catching up on inquiries, sending quotes, reviewing tomorrow's schedule. On the couch, phone only.
- **Desktop usage:** Only for complex tasks: building detailed menus, writing long proposals, reviewing financial reports, recipe entry.

**Implication for ChefFlow:** The mobile experience isn't secondary; it's primary. Every core action (check schedule, respond to inquiry, view client details, record payment) must be completable in under 3 taps on a phone screen. Desktop is for power-user workflows.

### Persona Segments

**Segment 1: Solo Starter (1-3 events/week)**

- Just launched their private chef business
- Still learning the admin side
- Needs simple, guided workflows
- Price-sensitive (Free tier target)
- "I just want to cook and get paid"

**Segment 2: Established Operator (4-8 events/week)**

- Has a steady client base
- Drowning in admin as they scale
- Willing to pay for time savings
- Needs automation, templates, recurring events
- "I need to stop doing the same admin work for every event"

**Segment 3: Premium/Team Chef (8+ events/week, has staff)**

- Runs a small team or has assistants
- Needs delegation, staff management, multi-event coordination
- Values professionalism (contracts, branded proposals)
- Highest willingness to pay
- "I need to run this like a real business"

---

## 5. Research Execution Plan

### Phase 1: Discovery (Weeks 1-2)

- Conduct 8-12 user interviews using the guide above
- Focus on JTBD: what job are chefs hiring ChefFlow to do?
- Record, transcribe, code for themes

### Phase 2: Architecture Validation (Weeks 3-4)

- Run open card sort with 15-20 chefs (unmoderated, online)
- Run tree test on current navigation with 30-50 chefs
- Run first-click tests on 4-5 key screens

### Phase 3: Usability Testing (Weeks 5-6)

- 5-8 moderated think-aloud sessions
- Use the 8-task protocol above
- Focus on mobile (at least 50% of sessions on phone)

### Phase 4: Quantitative Baseline (Week 7)

- Deploy SUS survey to all active users
- Deploy feature importance/satisfaction matrix
- Deploy NPS
- Deploy task frequency analysis
- Combine into single survey (aim for <10 min completion)

### Phase 5: Synthesis (Week 8)

- Triangulate qualitative findings (interviews + usability) with quantitative (surveys)
- Update personas with real data
- Prioritize backlog based on importance/satisfaction gaps
- Present findings to guide next quarter's roadmap

---

## Tools Summary

| Method              | Recommended Tool                        | Cost                | Sample Size      |
| ------------------- | --------------------------------------- | ------------------- | ---------------- |
| User interviews     | Zoom/phone + Otter.ai for transcription | Free-$16/mo         | 8-12             |
| Card sorting        | Optimal Sort                            | Free tier available | 15-20            |
| Tree testing        | Treejack (Optimal Workshop)             | From $99/mo         | 30-50            |
| First-click testing | Lyssna or Maze                          | Free tier available | 20-30            |
| Usability testing   | Real app + screen recording (Loom)      | Free                | 5-8              |
| SUS survey          | Google Forms or Typeform                | Free                | 12-30            |
| NPS survey          | In-app (build it) or Typeform           | Free                | All active users |
| Feature matrix      | Google Forms                            | Free                | All active users |

---

## Sources

- [50 Interview Questions For B2B SaaS Customer Research - John Cutler](https://medium.com/@johnpcutler/50-interview-questions-for-b2b-saas-customer-research-ecdc093c5127)
- [User Research: How to Facilitate B2B SaaS User Interviews - Scenic West](https://www.scenicwest.co/blog/user-research-how-to-facilitate-b2b-saas-user-interviews)
- [User Interviews for your B2B SaaS - Corey Quinn](https://medium.com/@coreyquinn/user-interviews-for-your-b2b-saas-88c5f23ef320)
- [Think Aloud Protocol - Maze](https://maze.co/collections/user-research/think-aloud-protocol/)
- [Thinking Aloud Method for Usability Testing - Looppanel](https://www.looppanel.com/blog/usability-testing-strategy)
- [Think-Aloud Protocol Guide - Lyssna](https://www.lyssna.com/guides/think-aloud-protocol/)
- [First Click Testing - User Interviews](https://www.userinterviews.com/ux-research-field-guide-chapter/first-click-testing)
- [First Click Testing Guide - Lyssna](https://www.lyssna.com/guides/first-click-testing/)
- [Card Sorting vs. Tree Testing - Nielsen Norman Group](https://www.nngroup.com/articles/card-sorting-tree-testing-differences/)
- [Card Sorting: Uncover Users' Mental Models - NN/G](https://www.nngroup.com/articles/card-sorting-definition/)
- [Tree Testing - Nielsen Norman Group](https://www.nngroup.com/articles/tree-testing/)
- [System Usability Scale (SUS) Practical Guide - UXtweak](https://blog.uxtweak.com/system-usability-scale/)
- [SUS Complete Scoring & Interpretation Guide - CleverX](https://cleverx.com/blog/system-usability-scale-sus-complete-scoring-walkthrough)
- [Measuring Usability with SUS - MeasuringU](https://measuringu.com/sus/)
- [Beyond the NPS: Measuring Perceived Usability - NN/G](https://www.nngroup.com/articles/measuring-perceived-usability/)
- [Kano Model - B2B International](https://www.b2binternational.com/publications/kano-classification-model/)
- [Kano Model: Prioritize Features - Product Leadership](https://www.productleadership.com/blog/kano-model-product-management/)
- [NPS Survey Questions - June.so](https://www.june.so/blog/net-promoter-score-questions)
- [NPS in B2B: Implementation Guide - SurveySensum](https://www.surveysensum.com/customer-experience/net-promoter-score-b2b)
- [NPS Survey Best Practices - Chameleon](https://www.chameleon.io/blog/nps-survey-best-practices-to-improve-engagement-guide-infographic)
- [NPS Survey Best Practices - UserPilot](https://userpilot.com/blog/nps-survey-best-practices-saas/)
- [Personal Chef Software: Centralized Workflow - Traqly](https://blog.gotraqly.com/personal-chef-software-why-chefs-need-a-centralized-workflow-in-2025/)
- [A Day in the Life of a Personal Chef - Goodwin Recruiting](https://www.goodwinrecruiting.com/a-day-in-the-life-of-a-personal-chef)
- [A Day in the Life of a Personal Chef - Honest to Goodness](https://honesttogoodness.com/2021/10/27/a-day-in-the-life-of-a-personal-chef)
- [Jobs to Be Done in B2B Research - Adience](https://www.adience.com/blog/how-to/how-to-use-the-jobs-to-be-done-framework-in-b2b-research/)
- [JTBD Interview Framework - Lyssna](https://www.lyssna.com/blog/jtbd-interviews/)
- [Using JTBD in B2B - Firmhouse](https://www.firmhouse.com/blog/using-jobs-to-be-done-in-a-b2b-context-fe5dbe14d40e)
- [JTBD in UX Research - User Interviews](https://www.userinterviews.com/ux-research-field-guide-chapter/jobs-to-be-done-jtbd-framework)
