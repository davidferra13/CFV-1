# ChefFlow — Master Launch Blueprint

> **Version:** 1.0 | **Created:** 2026-02-26 | **Status:** Active
>
> This is the single source of truth for ChefFlow's journey from working product to 100+ paying subscribers. Every phase, every task, every milestone — all in one place.
>
> **Methodology:** Built from studying the launch playbooks of Shopify, Stripe, Slack, Calendly, Basecamp, HubSpot, Mailchimp, Square, Notion, Canva, Toast, and Zenchef — plus a full audit of ChefFlow's current state.

---

## The One-Sentence Mission

**ChefFlow is the operating system for private chefs** — from first inquiry to final payment, with AI that respects your clients' privacy and a platform that gives back to end hunger.

---

## Current State (Feb 2026)

### What's Already Built (and working)

| Area                        | Status  | Notes                                                                                       |
| --------------------------- | ------- | ------------------------------------------------------------------------------------------- |
| Full app (265+ pages)       | READY   | Events, clients, quotes, payments, menus, recipes, calendar, documents                      |
| Self-serve signup           | READY   | Chef signs up, gets 14-day trial, enters onboarding wizard                                  |
| Onboarding wizard           | READY   | 5 steps: Profile, Branding, Public URL, Stripe Connect, Done                                |
| Landing page                | READY   | Hero, features, workflow, Remy demo, CTA with "14-day free trial"                           |
| Pricing page                | READY   | $29/mo single plan, feature list, FAQ                                                       |
| Stripe billing architecture | READY   | Tier resolution, modules, checkout, webhooks — all coded. Env vars empty (config task only) |
| Email system                | READY   | 40+ transactional email templates via Resend. Full lifecycle coverage                       |
| Legal pages                 | READY   | Terms of Service + Privacy Policy — thorough, jurisdiction-aware                            |
| Public pages                | READY   | 15+ public routes: chef directory, profiles, inquiry forms, gift cards, instant booking     |
| Embeddable widget           | READY   | Vanilla JS widget for chef websites — inline + popup modes                                  |
| Error monitoring (Sentry)   | PARTIAL | Installed + configured. DSN may need to be set in production env                            |
| Remy AI concierge           | READY   | Local-only (Ollama), privacy-first. Needs cloud option for other users                      |
| 8-state event FSM           | READY   | draft, proposed, accepted, paid, confirmed, in_progress, completed, cancelled               |
| Ledger-first financials     | READY   | Immutable, append-only, computed balances                                                   |
| Multi-tenant architecture   | READY   | Tenant-scoped everything, session-derived tenant IDs                                        |

### What's Missing (must build before launch)

| Area                          | Status  | Blocker?                                                |
| ----------------------------- | ------- | ------------------------------------------------------- |
| Stripe env vars in prod       | MISSING | **YES** — 4 env vars to fill, zero code needed          |
| Sentry DSN in prod            | MISSING | **YES** — invisible errors without it                   |
| Cloud AI for Remy             | MISSING | **YES** — other chefs can't use Ollama on your PC       |
| Welcome email                 | MISSING | Soft — standard SaaS expectation                        |
| Help center / docs            | MISSING | Soft — will reduce support load                         |
| Product analytics             | MISSING | Soft — blind on conversion metrics without it           |
| ChefFlow Gives Back (charity) | MISSING | **Core brand feature** — must ship before public launch |

---

## ChefFlow Gives Back — Charity Program

> _"Chefs feeding people who need it most."_

This is not an afterthought — it's a founding principle baked into ChefFlow's identity from day one.

### How It Works

1. **ChefFlow donates 1% of platform revenue** (subscription fees collected) quarterly to food-related charities
2. **Each chef picks their charity** from a curated dropdown during onboarding (or anytime in settings)
3. **ChefFlow splits its quarterly donation** proportionally based on how many chefs selected each charity
4. **Transparency dashboard** — every chef sees where the money went (public page on the site too)
5. **Chefs can suggest new charities** — submission form, reviewed and added quarterly

### Curated Charity List (Starting)

| Charity                   | Focus                    | Why                                                                |
| ------------------------- | ------------------------ | ------------------------------------------------------------------ |
| **World Food Programme**  | Global hunger relief     | Largest humanitarian org fighting hunger — feeds 150M+ people/year |
| **Feeding America**       | US food banks & pantries | Network of 200+ food banks, 60,000+ food pantries                  |
| **charity: water**        | Clean water access       | 100% of donations fund water projects. Radical transparency        |
| **No Kid Hungry**         | Child hunger in the US   | School breakfast programs, summer meals                            |
| **World Central Kitchen** | Disaster food relief     | Chef Jose Andres — feeds people in crisis zones worldwide          |
| **Action Against Hunger** | Global malnutrition      | Nutrition, clean water, food security in 50+ countries             |
| **Local Food Pantry**     | Chef's local community   | Chef enters their local food bank — hyperlocal impact              |

> **World Central Kitchen** is the one founded by **Chef Jose Andres**. Perfect fit for a chef platform.

### Implementation (Phase 2 task)

- **Settings page:** Dropdown to pick charity + "Suggest a charity" form
- **Onboarding wizard:** Optional step — "Choose where ChefFlow gives back on your behalf"
- **Public page:** `/giving` — shows total donated, breakdown by charity, updated quarterly
- **Badge/widget:** "This chef gives back through ChefFlow" — chefs can display on their profile
- **No chef money is taken** — this comes from ChefFlow's platform revenue (subscription fees), not from the chef's earnings

### Why This Matters (Brand)

- **Shopify** has a sustainability fund. **Stripe** has Stripe Climate. **Salesforce** has the 1-1-1 model (1% equity, 1% product, 1% time). **Patagonia** donates 1% of sales.
- The 1% model is proven, sustainable, and signals that ChefFlow is built by people who care — not just another tech company extracting money from an industry.
- **Private chefs are food people.** Hunger is personal to them. This resonates deeply with the target market.
- **Marketing angle:** "Every subscription helps feed someone." This is the kind of thing that gets press coverage, social shares, and loyalty.

---

## PHASE 1 — Eat Your Own Cooking

**Duration:** 4-6 weeks | **Goal:** Use ChefFlow for your own chef business until it's bulletproof

### What Shopify, Basecamp, and Mailchimp Did

Shopify was built for Tobi Lutke's own snowboard shop. Basecamp was built for 37signals' own design agency. Mailchimp was a side project Ben Chestnut ran alongside his agency for **seven years** before going full-time. The pattern is universal: **the founder is the first user.**

### Tasks

| #   | Task                              | Details                                                                                             |
| --- | --------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1.1 | **Run your business on ChefFlow** | Every client, inquiry, event, quote, payment — all through the app. No spreadsheets, no other tools |
| 1.2 | **Log every friction point**      | Keep a running list of what's confusing, slow, broken, or missing. This is your roadmap             |
| 1.3 | **Test the full lifecycle**       | Walk through every path: public inquiry, quote, acceptance, payment, event, completion, review      |
| 1.4 | **Test the embeddable widget**    | Put it on a personal website or test page. Does it work? Does it look good?                         |
| 1.5 | **Test emails**                   | Trigger every email template. Read them as a client would. Are they clear? Professional?            |
| 1.6 | **Test mobile**                   | Use the PWA on your phone for a week. Note everything that doesn't work well                        |
| 1.7 | **Fix what you find**             | Don't just log it — fix it. This is the polish phase                                                |

### Exit Criteria

- You've managed at least 3 real events end-to-end through ChefFlow
- No critical bugs remain in the core workflow
- Mobile experience is functional
- You'd be comfortable showing this to another chef

---

## PHASE 2 — Plug the Gaps

**Duration:** 4-8 weeks | **Goal:** Everything a paying user needs is in place

### Hard Blockers (must complete)

| #   | Task                           | Details                                                                                                                                      | Status      |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 2.1 | **Stripe production env vars** | Set `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SUBSCRIPTION_PRICE_ID`                       | Config only |
| 2.2 | **Sentry DSN in production**   | Set `NEXT_PUBLIC_SENTRY_DSN` so errors are visible                                                                                           | Config only |
| 2.3 | **Cloud AI for Remy**          | Move Remy from Ollama to a cloud LLM API (Anthropic or OpenAI) for multi-tenant use. Keep privacy architecture. Local Ollama stays as option | Code change |
| 2.4 | **ChefFlow Gives Back — MVP**  | Charity dropdown in settings + onboarding step + `/giving` public page + quarterly donation tracking                                         | New feature |

### Soft Gaps (should complete before launch)

| #    | Task                                    | Details                                                                                                                                   |
| ---- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 2.5  | **Welcome email**                       | Create `welcome.tsx` template + `sendWelcomeEmail()` — triggered on signup                                                                |
| 2.6  | **Help center / Getting Started guide** | At minimum: `/help` page with Stripe Connect setup guide, FAQ, "How do I..." answers                                                      |
| 2.7  | **Product analytics**                   | Add Plausible (privacy-friendly, $9/mo) or PostHog (free self-hosted). Track: signups, trial starts, onboarding completion, trial-to-paid |
| 2.8  | **Separate beta database**              | Beta currently shares the dev Supabase. Create a separate project for beta before opening to other users                                  |
| 2.9  | **Error handling polish**               | Ensure all error boundaries show helpful messages, not stack traces                                                                       |
| 2.10 | **Performance audit**                   | Run Lighthouse, fix anything below 80. First impressions matter                                                                           |

### Exit Criteria

- A brand new chef can sign up, complete onboarding, connect Stripe, and create their first event — with zero help from you
- Stripe payments work end-to-end (subscription charge, invoice, portal)
- Remy works without Ollama for cloud users
- ChefFlow Gives Back page is live
- Time from signup to first quote sent < 15 minutes

---

## PHASE 3 — Private Beta (10 Chefs)

**Duration:** 4-8 weeks | **Goal:** 10 real chefs using ChefFlow, finding every issue you missed

### What Stripe and Notion Did

Stripe's co-founders did the "Collison installation" — when someone showed interest, they'd say "give me your laptop" and set them up on the spot. Zero friction between "interested" and "using." Notion's CEO personally did 200 screenshare demos with early users. **High-touch, low-scale.**

### Tasks

| #   | Task                             | Details                                                                                                                                  |
| --- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | **Find 10 private chefs**        | Personal network first. Then: Facebook groups, Reddit r/personalchefs, USPCA, local culinary networks, Instagram DMs to chefs you follow |
| 3.2 | **Offer free access**            | No charge during beta. "You get ChefFlow Pro free. I get your honest feedback"                                                           |
| 3.3 | **Do the Collison installation** | Video call with each chef. Walk them through signup, onboarding, first event. Watch their face. Note every moment of confusion           |
| 3.4 | **Set up a feedback channel**    | Group chat (WhatsApp, Discord, or Slack) with all beta chefs. Check it daily                                                             |
| 3.5 | **Weekly check-ins**             | 15-minute call with each beta chef. "What's working? What's frustrating? What's missing?"                                                |
| 3.6 | **Track activation metrics**     | Did they complete onboarding? Create a client? Send a quote? Process a payment? Where do they drop off?                                  |
| 3.7 | **Fix what they find — fast**    | Beta chefs are doing you a huge favor. Fixing their issues within 24-48 hours builds trust and loyalty                                   |
| 3.8 | **Ask for testimonials**         | After 2+ weeks of active use, ask: "Would you recommend ChefFlow to another chef? Can I quote you?"                                      |

### Key Metrics to Track

| Metric                   | Target     | Why                                                          |
| ------------------------ | ---------- | ------------------------------------------------------------ |
| Activation rate          | 80%+       | % of signups that complete onboarding and create first event |
| Time to value            | < 15 min   | Time from signup to first quote sent                         |
| Weekly active usage      | 7/10 chefs | Are they actually using it week over week?                   |
| NPS (Net Promoter Score) | 40+        | "How likely are you to recommend ChefFlow?" (0-10)           |
| Feature requests         | Logged     | Don't build yet — just listen and log                        |

### Exit Criteria

- 10 chefs have used ChefFlow for 2+ weeks
- At least 7/10 are actively using it weekly
- No critical bugs remain
- You have 3+ testimonials
- You have a clear list of the top 5 feature requests
- You've fixed the top friction points they identified

---

## PHASE 4 — Public Launch

**Duration:** 2-4 weeks of prep, then launch day | **Goal:** ChefFlow is publicly available and generating revenue

### What Calendly, Mailchimp, and Canva Did

Calendly grew entirely through its viral loop — every scheduling link marketed the product. Mailchimp added a free tier and grew from 85,000 to 450,000 users in one year because every free email had "Sent with Mailchimp." Canva spent $0 on marketing until 2016, growing through social sharing. **The product markets itself when it's good enough.**

### Pre-Launch (2-4 weeks before)

| #   | Task                            | Details                                                                                                      |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 4.1 | **Landing page upgrade**        | Add testimonials from beta chefs. Add "ChefFlow Gives Back" section. Social proof is everything              |
| 4.2 | **Launch video**                | 60-90 second demo. You (a real chef) showing how ChefFlow runs your business. Authentic > polished           |
| 4.3 | **Blog — 3 foundational posts** | (1) "Why I Built ChefFlow" (2) "How to Run a Private Chef Business" — SEO magnet (3) "ChefFlow Gives Back"   |
| 4.4 | **Social media presence**       | Create accounts on Instagram, LinkedIn, Twitter/X. Post the launch video + blog posts                        |
| 4.5 | **Product Hunt prep**           | Create maker profile, draft the PH listing, prepare screenshots, line up beta chefs to comment on launch day |
| 4.6 | **Email beta chefs**            | "We're launching publicly on [date]. Would you share with one chef friend?"                                  |

### Launch Day

| #    | Task                      | Details                                                                                         |
| ---- | ------------------------- | ----------------------------------------------------------------------------------------------- |
| 4.7  | **Product Hunt launch**   | Post at midnight PT (PH convention). Have beta chefs comment and upvote. Reply to every comment |
| 4.8  | **Social media push**     | Post on all channels. Ask beta chefs to share                                                   |
| 4.9  | **Chef community posts**  | Share in Facebook groups, Reddit, forums — but with value, not spam. "I built this for us"      |
| 4.10 | **Hacker News "Show HN"** | Technical audience, but startup-friendly. Good for credibility and backlinks                    |
| 4.11 | **Press outreach**        | Email food industry publications, private chef newsletters. The charity angle is newsworthy     |
| 4.12 | **Monitor everything**    | Watch Sentry, analytics, signups, feedback channels. Be ready to hotfix                         |

### Viral Loop — Built Into the Product

ChefFlow already has viral mechanics:

| Mechanic                   | How it markets ChefFlow                                                             |
| -------------------------- | ----------------------------------------------------------------------------------- |
| **Embeddable widget**      | Every chef's website shows a ChefFlow-powered inquiry form — visitors see the brand |
| **Client emails**          | Quotes, invoices, reminders sent to clients — "Powered by ChefFlow" footer          |
| **Public chef profiles**   | `/chef/[slug]` — every profile is a marketing page for ChefFlow                     |
| **Gift cards**             | `/chef/[slug]/gift-cards` — buyers see ChefFlow                                     |
| **Shared event recaps**    | `/share/[token]` — guests see ChefFlow                                              |
| **"This chef gives back"** | Charity badge on chef profiles — feel-good social sharing                           |

### Pricing at Launch

| Tier      | Price            | What's included                                                                                           |
| --------- | ---------------- | --------------------------------------------------------------------------------------------------------- |
| **Free**  | $0               | Core ops: inquiries, events, clients, quotes, payments, basic calendar, basic finance, recipes, documents |
| **Pro**   | $29/mo           | Everything: advanced analytics, pipeline, protection module, premium features, priority support           |
| **Trial** | 14 days Pro free | Every signup starts with full Pro access, no credit card required                                         |

> **Benchmarks:** 2-5% freemium-to-paid conversion is healthy. 18% free-trial-to-paid is average. At $29/mo, you need 4 paying chefs to cover all infrastructure costs ($50/mo).

### Exit Criteria

- Product Hunt launch completed
- 50+ signups in first week
- First paying customer (non-beta)
- No launch-day critical bugs
- Analytics tracking confirmed working

---

## PHASE 5 — Growth (First 100 Paying Subscribers)

**Duration:** 6-12 months | **Goal:** 100 paying chefs, $2,900/mo MRR, sustainable growth engine

### The Vertical SaaS Advantage

ChefFlow is a **vertical SaaS** — built for one specific industry. This is your superpower:

- **50% lower marketing costs** than horizontal SaaS (everyone knows everyone in a niche)
- **Word of mouth is nuclear** — one chef tells five chef friends
- **Toast** built a $30B+ business serving just restaurants. **Zenchef** got 2,500 restaurant customers by literally opening the Yellow Pages and cold-calling A to Z
- **Private chefs are an underserved market** — no dominant platform exists for them

### Growth Channels (in order of priority)

| #   | Channel                    | Tactic                                                                                                               | Cost         |
| --- | -------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------ |
| 5.1 | **Word of mouth**          | Delight your users. They'll do the marketing for you. Every company in our research grew primarily through WOM       | $0           |
| 5.2 | **Content / SEO**          | Blog posts: "How to price a private dinner," "Managing client allergies," "Private chef tax tips." You're the expert | $0           |
| 5.3 | **Chef communities**       | USPCA, APCA, Facebook groups, Reddit, Instagram. Be helpful first, promote second                                    | $0           |
| 5.4 | **ChefFlow Gives Back PR** | "Chef platform donates to World Central Kitchen" — this gets press. Local news, food blogs, tech blogs               | $0           |
| 5.5 | **Referral program**       | "Refer a chef, get a free month." Both sides get value                                                               | Low          |
| 5.6 | **YouTube**                | Short videos: "Day in the life using ChefFlow," tutorials, feature walkthroughs                                      | $0           |
| 5.7 | **Partnerships**           | Culinary schools, chef staffing agencies, food suppliers. They recommend ChefFlow to their network                   | $0           |
| 5.8 | **Google Ads**             | Target: "private chef software," "personal chef business tools," "chef booking platform"                             | $200-500/mo  |
| 5.9 | **Trade shows**            | USPCA conference, food industry events. Set up a booth or give a talk                                                | $500-2000/ea |

### Key Metrics

| Metric                              | Target       | How to track              |
| ----------------------------------- | ------------ | ------------------------- |
| **MRR** (Monthly Recurring Revenue) | $2,900       | Stripe dashboard          |
| **Monthly growth rate**             | 10-20%       | Signup tracking           |
| **Churn rate**                      | < 5% monthly | Stripe + analytics        |
| **Trial-to-paid conversion**        | 15%+         | Analytics funnel          |
| **Activation rate**                 | 80%+         | Onboarding tracking       |
| **CAC** (Customer Acquisition Cost) | < $50        | Ad spend / new customers  |
| **LTV** (Lifetime Value)            | > $300       | $29 x avg months retained |
| **LTV:CAC ratio**                   | > 3:1        | LTV / CAC                 |
| **NPS**                             | 50+          | Quarterly survey          |

### Revenue Milestones

| Milestone            | Subscribers | MRR        | What it means                         |
| -------------------- | ----------- | ---------- | ------------------------------------- |
| **Break-even**       | 4           | $116/mo    | Covers all infrastructure costs       |
| **Ramen profitable** | 20          | $580/mo    | Covers infra + some personal expenses |
| **Supplemental**     | 50          | $1,450/mo  | Supplemental income territory         |
| **Real business**    | 100         | $2,900/mo  | $34,800/year ARR. You have a company  |
| **Growth stage**     | 250         | $7,250/mo  | $87,000/year ARR. Hire help           |
| **Scale**            | 1,000       | $29,000/mo | $348,000/year ARR. This is serious    |

---

## PHASE 6 — Scale & Expand

**Duration:** Year 2+ | **Goal:** Dominant platform for private chefs, expand offerings

### When You Have 100+ Users

| #   | Task                              | Details                                                                         |
| --- | --------------------------------- | ------------------------------------------------------------------------------- |
| 6.1 | **Hire support**                  | Part-time support person to handle help requests                                |
| 6.2 | **Build what users ask for**      | By now you have hundreds of feature requests. Build the top 5                   |
| 6.3 | **Enterprise / Team tier**        | Chef teams, agencies, multi-chef operations — higher price point                |
| 6.4 | **Marketplace**                   | Menu templates, recipe packs, business templates — chefs sell to chefs          |
| 6.5 | **API / Integrations**            | QuickBooks, Google Calendar, Uber Eats, DoorDash — whatever chefs use alongside |
| 6.6 | **Mobile app**                    | Native iOS/Android app (PWA is fine until this point)                           |
| 6.7 | **International**                 | Multi-currency, multi-language, international payment support                   |
| 6.8 | **ChefFlow Gives Back expansion** | Annual giving report. Chef-organized community events. Matching campaigns       |

### When to Raise Prices

- **At 100 users:** Test $39/mo for new signups (grandfather existing at $29)
- **At 250 users:** Consider $49/mo — by now you've proven the value
- **At 500 users:** Premium/Enterprise tier at $79-99/mo for agencies and teams
- **Never surprise existing users** — grandfather early adopters. They believed in you first

---

## The Master Timeline

```
Month 1-2:    PHASE 1 — Eat your own cooking
Month 2-4:    PHASE 2 — Plug the gaps (Stripe, Cloud AI, Charity, Help center)
Month 4-6:    PHASE 3 — Private beta (10 chefs)
Month 6-7:    PHASE 4 — Public launch
Month 7-18:   PHASE 5 — Grow to 100 subscribers
Month 18+:    PHASE 6 — Scale & expand
```

**Conservative goal:** 100 paying subscribers by month 18 (end of Year 1 from launch)

**Aggressive goal:** 100 paying subscribers by month 12

---

## What Makes ChefFlow Different (Competitive Moat)

| Differentiator              | Why it matters                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| **Built by a chef**         | You understand the pain. Tech founders building chef tools don't                              |
| **Privacy-first AI**        | Client data never leaves the platform. In an era of AI data concerns, this is a selling point |
| **ChefFlow Gives Back**     | 1% to end hunger. Chefs choose the charity. No competitor does this                           |
| **Full lifecycle**          | Inquiry, quote, payment, event, completion, review. Not just booking, not just payments       |
| **Embeddable widget**       | Chefs don't need a separate website. Plug the widget into any existing site                   |
| **Ledger-first financials** | Real accounting, not spreadsheet math. Immutable records                                      |

---

## Mistakes to Avoid (Learned from the Best)

1. **Don't scale before product-market fit.** 70% of startups fail from premature scaling. Phase 3 (beta) is where you validate PMF. Don't skip it.

2. **Don't build features nobody asked for.** 80% of SaaS features are rarely used. After launch, only build what users request.

3. **Don't price too low.** $29/mo is already very affordable. Don't go lower. People who won't pay $29 won't pay $9 either — they were never going to pay.

4. **Don't spend on ads before the product sells itself.** Canva spent $0 on marketing until 2016. If chefs aren't telling other chefs about ChefFlow, fix the product before buying ads.

5. **Don't confuse early adopters with PMF.** Early adopters use anything new. The test is whether the second wave of users (who didn't seek you out) stays.

6. **Don't ignore churn.** A chef who cancels is more valuable than a chef who signs up — because they can tell you why they left.

7. **Don't do everything yourself forever.** At 50 users, hire support. At 100, hire a marketer. Your job evolves from builder to leader.

---

## Sources

This blueprint was built from studying:

- **Shopify** — Snowboard shop to $200B e-commerce platform
- **Stripe** — 7 beta users to global payments infrastructure
- **Slack** — Failed game studio chat tool to workplace standard
- **Calendly** — Accidentally free to 70% viral growth
- **Basecamp** — Design agency to SaaS pioneer
- **HubSpot** — Free Website Grader to inbound marketing empire
- **Mailchimp** — Side project for 7 years to $12B exit to Intuit
- **Square** — Free card reader to $30B payments company
- **Notion** — Nearly died to 200 personal demos to category leader
- **Canva** — 100+ investor rejections to $40B design platform
- **Toast** — Restaurant vertical SaaS to $30B+ company
- **Zenchef** — Yellow Pages cold calls to 2,500 restaurant customers

---

_This document is a living plan. Update it as phases complete, priorities shift, and new information emerges._
