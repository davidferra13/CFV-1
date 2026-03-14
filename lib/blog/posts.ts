// Blog post registry — static content, no database needed
// Each post is a simple object. Content is rendered from markdown strings.
// This keeps the blog fast, free, and fully static (ISR-compatible).

export type BlogPost = {
  slug: string
  title: string
  description: string
  publishedAt: string // ISO date string
  updatedAt?: string
  author: string
  tags: string[]
  readingTime: string // e.g. "5 min read"
  content: string // Markdown content
}

// Posts are ordered newest-first
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'how-to-price-a-private-dinner-party',
    title: 'How to Price a Private Dinner Party (Without Undercharging)',
    description:
      "A practical guide for private chefs on pricing dinner parties — covering food cost, labor, overhead, and the confidence to charge what you're worth.",
    publishedAt: '2026-02-27',
    author: 'ChefFlow Team',
    tags: ['pricing', 'business', 'getting started'],
    readingTime: '7 min read',
    content: `
## The Problem Every Private Chef Faces

You get the inquiry: "How much for a dinner party for 8?" And suddenly you're staring at a blank text message, trying to figure out a number that doesn't scare them away but also doesn't leave you working for $12 an hour after expenses.

This is the single most common question in the private chef world, and most chefs get it wrong — not because they're bad at cooking, but because nobody taught them the business side.

Here's a framework that works.

## Step 1: Know Your Food Cost Target

A healthy food cost for a private dinner is **25–35% of your per-person price**. That means if you're charging $150/person, you should be spending $37–$52 on ingredients per plate.

If your food cost is above 40%, you're either undercharging or over-buying. If it's below 20%, you might be cutting corners that clients will notice.

**Quick formula:**
\`\`\`
Per-person price = (ingredient cost per person) ÷ 0.30
\`\`\`

Example: $45 in groceries per plate ÷ 0.30 = **$150/person minimum**

## Step 2: Don't Forget Your Time

Most chefs only think about the dinner itself. But your real time investment is much bigger:

- **Menu planning & client calls**: 1–2 hours
- **Shopping**: 1–3 hours
- **Prep**: 3–6 hours (depending on complexity)
- **Cooking & service**: 3–5 hours
- **Cleanup**: 1–2 hours
- **Travel**: Variable

For a typical 8-person dinner, you're looking at **10–18 hours of total work**. If you charge $1,200 total and spent $400 on groceries, that's $800 for potentially 15 hours of labor — about $53/hour before taxes and overhead.

Is that enough? Only you can answer that, but now you can see the real number instead of guessing.

## Step 3: Factor In Your Overhead

Things that eat into your profit that you might be ignoring:

- **Vehicle costs** (gas, wear, insurance)
- **Equipment** (knives, pans, portable gear, uniforms)
- **Insurance** (liability, food handler's cert)
- **Software and tools** (scheduling, invoicing, bookkeeping)
- **Marketing** (website, photos, business cards)
- **Taxes** (self-employment tax is ~15% on top of income tax)

A good rule of thumb: add **20–30%** on top of your labor rate to cover overhead.

## Step 4: Package It Simply

Clients don't want an itemized invoice that looks like a tax return. They want a clean number. Here are three formats that work:

1. **Per-person pricing**: "$150/person, 8-person minimum" — simple, easy to compare
2. **Flat event fee**: "$1,800 for a 4-course dinner for 8" — feels premium, less per-person math
3. **Tiered packages**: Bronze/Silver/Gold or Simple/Signature/Showstopper — lets clients self-select

Whichever format you use, make sure **groceries are included** in the price. Sending a separate grocery receipt feels unprofessional and invites scrutiny.

## Step 5: Charge a Deposit

Always require a **50% deposit** to book. This does three things:

1. Confirms the client is serious
2. Covers your grocery costs upfront
3. Protects you from last-minute cancellations

The remaining 50% is due the day of the event or within 48 hours after.

## The Confidence Factor

The biggest pricing mistake isn't math — it's confidence. New chefs consistently undercharge because they're afraid of losing the client. But here's the truth:

- Clients who can afford a private chef can afford to pay fairly
- Undercharging attracts price-sensitive clients who are harder to work with
- Your experience, creativity, and personal service have real value
- Raising your prices by 20% rarely loses you clients — it usually attracts better ones

## A Real Example

Let's price an 8-person, 4-course dinner:

| Line Item | Amount |
|-----------|--------|
| Groceries (8 × $45) | $360 |
| Labor (14 hours × $65) | $910 |
| Overhead (25%) | $228 |
| **Total** | **$1,498** |
| **Per person** | **$187** |

Round to $1,500 or $185/person. Clean, fair, profitable.

## Tools That Help

Tracking your actual costs on every event is the only way to know if your pricing works. After 5–10 events with real data, you'll see exactly where your margins are and where to adjust.

[ChefFlow](/) tracks food costs, labor, expenses, and profit per event automatically — so you always know your real numbers. Start a free trial and see your margins on the very first event.

---

*Have a pricing question? [Contact us](/contact) — we're happy to help.*

**Related reading:** [How to Start a Private Chef Business](/blog/how-to-start-a-private-chef-business) | [Private Chef Contract Guide](/blog/private-chef-contract-template-guide)
`,
  },
  {
    slug: 'private-chef-client-management-guide',
    title: '5 Client Management Mistakes Private Chefs Make (and How to Fix Them)',
    description:
      'Common client management pitfalls that cost private chefs repeat business — from slow response times to sloppy follow-ups.',
    publishedAt: '2026-02-27',
    author: 'ChefFlow Team',
    tags: ['client management', 'business', 'tips'],
    readingTime: '5 min read',
    content: `
## Why Client Management Matters More Than Your Food

Here's a hard truth: a chef with great client management and good food will outperform a chef with incredible food and terrible client management. Every time.

Your clients are hiring an *experience*, not just a meal. And that experience starts with the first inquiry and doesn't end until well after the last plate is cleared.

Here are the five mistakes that cost private chefs the most repeat business.

## Mistake 1: Slow Response Times

The average inquiry goes to 2–3 chefs. The first one to respond with a thoughtful, professional reply wins **60–70% of the time** — regardless of price.

If someone inquires at 2 PM and doesn't hear back until the next morning, they've already booked someone else.

**Fix:** Respond within 2 hours during business hours. Even a quick "Thanks for reaching out! I'd love to cook for you. Let me put together some options and I'll have a proposal to you by tomorrow" beats silence.

## Mistake 2: No Follow-Up After the Event

The event goes great. Compliments flow. You pack up, drive home, and... move on to the next one. Meanwhile, the client is glowing about you to their friends — but in two weeks, they've forgotten your name.

**Fix:** Send a thank-you message within 24 hours. One week later, check in. Include a referral incentive: "If you know anyone planning a dinner party, I'd love to be their chef — and I'll take 10% off your next event as thanks."

## Mistake 3: Messy Communication

Texts mixed with emails mixed with Instagram DMs mixed with phone calls. The client can't find the menu you sent. You can't remember what dietary restriction they mentioned. Someone's allergic to shellfish and you almost forgot.

**Fix:** Use one system for everything. Keep all client communication, dietary notes, event details, and menus in one place. When a client asks "Can you send me that menu again?" — you should be able to find it in 5 seconds.

## Mistake 4: No Written Agreement

A handshake deal works until it doesn't. "I thought it was $100/person, not $150" is a conversation you never want to have with a knife roll on your back.

**Fix:** Send a written proposal with your price, what's included, the date/time, cancellation policy, and deposit terms. Have the client confirm in writing (even a "Looks great, let's do it!" email counts).

## Mistake 5: Treating Every Client the Same

A couple celebrating their anniversary has different expectations than a corporate team dinner. A family with young kids needs a different approach than a group of foodies. One-size-fits-all service is mediocre service.

**Fix:** During your intake, ask about the occasion, the vibe they want, any must-haves or deal-breakers. Then tailor the experience — even small touches like a personalized menu card or a note about why you chose each course.

## The Compound Effect

Each of these mistakes costs you maybe one or two repeat bookings. But compounded over a year, that's potentially **tens of thousands of dollars** in lost revenue from clients who would have come back.

Professional client management isn't extra work — it's the foundation of a sustainable private chef business.

---

*[ChefFlow](/) handles client management, event tracking, proposals, and follow-ups in one system — so nothing falls through the cracks. [Start free](/auth/signup).*

**Related reading:** [How to Price a Private Dinner Party](/blog/how-to-price-a-private-dinner-party) | [Private Chef Contract Guide](/blog/private-chef-contract-template-guide)
`,
  },
  {
    slug: 'how-to-start-a-private-chef-business',
    title: 'How to Start a Private Chef Business in 2026 (Step-by-Step Guide)',
    description:
      'Everything you need to launch a private chef business — from licensing and insurance to finding your first clients and setting your rates.',
    publishedAt: '2026-02-27',
    author: 'ChefFlow Team',
    tags: ['getting started', 'business', 'guide'],
    readingTime: '9 min read',
    content: `
## You're a Great Cook. Now What?

You've cooked professionally — maybe in a restaurant, maybe catering, maybe you've been the friend everyone begs to host dinner. You're ready to go out on your own. But going from "I love to cook" to "I run a private chef business" has a lot of steps between them.

Here's everything you need to do, in order.

## Step 1: Get Legal

Before you cook a single meal for pay, handle the business basics:

- **Business license** — Register as an LLC or sole proprietorship in your state/city. An LLC protects your personal assets. Cost: $50–$500 depending on your state.
- **Food handler's certification** — Required in most states. Usually a 2–4 hour online course. Cost: $10–$30.
- **Liability insurance** — Protects you if someone gets sick, you damage property, or an injury happens. A basic policy for a personal chef runs $300–$800/year.
- **ServSafe or equivalent** — Not always legally required, but clients feel better knowing you have it. And you should have it. Cost: $150–$200.

Some states and cities have specific cottage food laws or personal chef regulations. Check your local health department's website or call them directly — they're usually helpful.

## Step 2: Define Your Niche

"I cook everything" is not a brand. The most successful private chefs specialize:

- **Weekly meal prep** for busy families
- **Intimate dinner parties** (4–12 guests)
- **Large-scale private events** (20–100+ guests)
- **Specialty diets** (keto, paleo, vegan, allergy-friendly)
- **Cuisine-specific** (Italian, Japanese, farm-to-table, BBQ)
- **Corporate events** and team dinners
- **Vacation/rental chef** (Airbnb, beach houses, ski lodges)

Pick one or two niches to start. You can expand later, but a focused message converts better than a generic one.

## Step 3: Set Your Pricing

This is where most new chefs struggle. Here's a framework:

- **Research your local market** — What do other private chefs in your area charge? Check their websites, ask around, look at platforms like Take a Chef or Hire a Chef.
- **Calculate your costs** — Ingredients, travel, time (including prep and shopping), overhead, and taxes.
- **Set a per-person or flat-event rate** — Most private chefs charge $75–$250+ per person depending on the market, complexity, and experience.
- **Start slightly below market, then raise** — Get 5–10 events under your belt, collect testimonials, then increase your rates.

Don't forget: you're also paying self-employment taxes (~15%), buying equipment, marketing, and maintaining your vehicle. Your hourly rate needs to be higher than you think.

## Step 4: Build Your Online Presence

In 2026, if you don't exist online, you don't exist. At minimum:

- **Google Business Profile** — Free, shows up in local search, lets clients leave reviews. This is the single highest-ROI thing you can do for free.
- **Instagram** — Food is visual. Post regularly. Stories of prep, finished plates, happy clients (with permission).
- **A simple website** — Your name, what you do, your service area, a few photos, and a contact form. That's it to start.

You don't need a professional photographer on day one. A clean, well-lit phone photo of a beautiful plate beats a stock photo every time.

## Step 5: Find Your First Clients

The first 5 clients are the hardest. Here's what works:

1. **Your network** — Tell everyone you know. Post on personal social media. Send a simple email to friends and family: "I'm launching a private chef business. If you know anyone planning a dinner party or wanting weekly meal prep, I'd love to be their chef."
2. **Local community groups** — Facebook groups, Nextdoor, local Reddit. Offer an introductory rate for your first few events.
3. **Partner with event venues and planners** — Leave cards, offer a referral fee, cook a complimentary tasting.
4. **List on platforms** — Take a Chef, Hire a Chef, Thumbtack, and similar platforms can bring leads. They take a cut, but for new chefs, the exposure is worth it.
5. **Host a pop-up** — Cook a dinner for 12 at a friend's house. Charge cost-only or a reduced rate. Treat it as a portfolio builder.

## Step 6: Systematize Early

The difference between a chef who burns out in year one and one who builds a thriving business? Systems.

From event number one, track:

- **Client info** — Name, contact, dietary restrictions, preferences, past events
- **Finances** — Income per event, food costs, expenses, profit margins
- **Menus** — What you cooked, what worked, what to improve
- **Follow-ups** — Thank-you messages, rebooking reminders, referral asks

You can start with spreadsheets, but you'll outgrow them fast. Purpose-built tools like [ChefFlow](/) handle all of this in one place — clients, events, menus, invoicing, payments, and follow-ups — so you can focus on cooking instead of admin.

## Step 7: Collect Testimonials Religiously

After every event, ask for a testimonial. A simple text: "Hey [Name], I had a great time cooking for your group last night! If you have a moment, would you mind leaving a quick review on Google? It really helps my business."

Most happy clients will say yes. But you have to ask — they won't think of it on their own.

Five strong Google reviews will do more for your business than $1,000 in ads.

## The Bottom Line

Starting a private chef business is more accessible than ever. The barriers are low, the demand is growing (the private chef market grew 25%+ post-2020), and the lifestyle is exactly what many chefs dream of — creative freedom, direct client relationships, and no corporate hierarchy.

But it's still a *business*. Treat it like one from day one, and you'll be years ahead of chefs who just "wing it."

---

*Ready to run your private chef business like a pro? [Start your free ChefFlow trial](/auth/signup) — events, clients, menus, and payments in one calm workspace.*

**Related reading:** [How to Price a Private Dinner Party](/blog/how-to-price-a-private-dinner-party) | [Client Management Mistakes to Avoid](/blog/private-chef-client-management-guide) | [Build a Meal Prep Business](/blog/meal-prep-business-guide-private-chef)
`,
  },
  {
    slug: 'private-chef-contract-template-guide',
    title: 'Private Chef Contract: What to Include (With Free Template Guide)',
    description:
      'A complete guide to private chef contracts and service agreements — what clauses to include, how to handle cancellations, and why written agreements protect your business.',
    publishedAt: '2026-02-27',
    author: 'ChefFlow Team',
    tags: ['contracts', 'legal', 'business'],
    readingTime: '6 min read',
    content: `
## Why Every Private Chef Needs a Contract

You wouldn't renovate someone's house on a handshake. You shouldn't cook for them on one either.

A service agreement (or "contract" — same thing, less scary) protects both you and your client. It sets clear expectations, prevents misunderstandings, and gives you recourse if something goes wrong.

Yet most private chefs don't use one until they get burned. Don't be that chef.

## What to Include

Here are the essential clauses every private chef contract should have:

### 1. Scope of Services

Be specific about what you're providing:

- Number of courses
- Number of guests
- Dietary accommodations agreed upon
- Whether groceries are included in the price
- What equipment you bring vs. what the client provides
- Setup and cleanup expectations

Vague scope = scope creep. "Can you also make appetizers for the cocktail hour?" is a different conversation when the scope is written down.

### 2. Pricing and Payment Terms

Spell out:

- **Total price** (or per-person rate × expected headcount)
- **Deposit amount and due date** — typically 50% to book
- **Balance due date** — day of event or within 48 hours
- **Accepted payment methods** — Venmo, Zelle, credit card, check
- **Late payment policy** — "Balances unpaid after 7 days incur a 5% late fee"

### 3. Cancellation Policy

This is the clause you'll be most grateful for:

- **30+ days out**: Full refund minus a small admin fee ($50–$100)
- **14–30 days**: 50% of deposit retained
- **Under 14 days**: Deposit non-refundable
- **Under 48 hours**: Full amount due (you've already shopped and prepped)

Adjust the windows for your business, but have *something* in writing. Without it, a last-minute cancellation means you've spent money on groceries, blocked the date, and have nothing to show for it.

### 4. Guest Count Changes

- Final headcount due X days before the event (typically 5–7 days)
- Increases after that date may incur a surcharge
- Decreases below the minimum (if you have one) don't reduce the price

### 5. Allergies and Dietary Restrictions

- Client must disclose all dietary restrictions and allergies in writing before the event
- Chef will accommodate disclosed restrictions but cannot be held liable for undisclosed allergies
- This isn't about avoiding responsibility — it's about making sure you have the information you need to keep people safe

### 6. Liability and Insurance

- State that you carry liability insurance (and you should — see our getting started guide)
- Note that you are an independent contractor, not an employee
- Include a hold-harmless clause for reasonable risks

### 7. Kitchen Requirements

If you're cooking in the client's home:

- Kitchen must be clean and accessible by [time]
- Running water, working stove/oven, adequate counter space
- Any special equipment needs discussed in advance

This prevents showing up to a kitchen with one working burner and no counter space.

### 8. Photos and Testimonials

- "Chef may photograph food and service setup for portfolio and social media use"
- "Client may request that no photos be taken" (respect privacy — especially for high-profile clients)

Get this permission upfront so you don't have an awkward moment mid-service.

## How to Present It

You don't need a lawyer (though it doesn't hurt for the initial draft). Here's how to keep it professional without feeling corporate:

1. **Send it as part of your proposal** — "Here's the menu, the price, and the details. If everything looks good, just confirm via email and we're booked!"
2. **Keep it conversational** — Write it in plain English, not legalese
3. **Digital signature optional** — An email reply saying "Confirmed!" or "Looks great, let's do it" is legally sufficient in most cases
4. **One page is fine** — This isn't a Fortune 500 merger. A clean one-pager covers everything

## A Simple Template Structure

\`\`\`
EVENT DETAILS
Date: [Date]
Time: [Start] – [End]
Location: [Address]
Guests: [Number]
Menu: [Attached / described]

PRICING
Total: $[Amount] (includes groceries, labor, and cleanup)
Deposit: $[Amount] due by [Date]
Balance: $[Amount] due [day of / within 48 hours]

TERMS
- Cancellation: [Your policy]
- Final headcount due [X] days before
- Allergies/restrictions must be disclosed in writing
- Chef carries liability insurance
- Chef may photograph food for portfolio use

Confirmation: Reply "Confirmed" to book this date.
\`\`\`

## Tools That Help

Managing proposals, tracking deposits, and following up on balances across dozens of clients gets messy fast — especially if you're juggling text messages, email, and spreadsheets.

[ChefFlow](/) lets you build proposals, track event status, manage payments, and store client dietary notes in one system. Your proposals look professional, your payment tracking is automatic, and nothing falls through the cracks.

---

*Want to level up your client communication? [Try ChefFlow free](/auth/signup) — professional proposals, payment tracking, and client management for private chefs.*

**Related reading:** [How to Price a Private Dinner Party](/blog/how-to-price-a-private-dinner-party) | [How to Start a Private Chef Business](/blog/how-to-start-a-private-chef-business)
`,
  },
  {
    slug: 'meal-prep-business-guide-private-chef',
    title: 'How to Build a Profitable Weekly Meal Prep Business as a Private Chef',
    description:
      'A step-by-step guide to launching and scaling a weekly meal prep service — pricing, client acquisition, logistics, and scaling from 5 to 50 clients.',
    publishedAt: '2026-02-27',
    author: 'ChefFlow Team',
    tags: ['meal prep', 'business', 'scaling'],
    readingTime: '8 min read',
    content: `
## Why Meal Prep Is the Private Chef's Best-Kept Secret

Dinner parties are glamorous. Meal prep is profitable.

While a dinner party might bring in $1,500 on a Saturday night, a roster of 15 weekly meal prep clients generates **$3,000–$6,000+ per week** — predictably, repeatedly, with far less stress.

Meal prep is recurring revenue. It's the subscription model of private cooking. And in 2026, demand has never been higher: busy families, health-conscious professionals, and aging parents who need nutritious meals but can't or don't want to cook.

Here's how to build it.

## Step 1: Design Your Service Model

There are three common formats:

### Option A: Cook in the Client's Home
- You go to their kitchen, cook 4–6 meals, portion, label, and store
- Time per client: 3–5 hours including shopping
- Price range: $250–$500/session + groceries
- Best for: High-end clients who want a personal touch

### Option B: Cook in Your Kitchen, Deliver
- Batch cook for multiple clients, package, and deliver
- Time per client: Much less (batching = efficiency)
- Price range: $150–$300/week (meals included)
- Best for: Scaling to 20+ clients
- **Note:** May require a commercial kitchen or cottage food permit depending on your state

### Option C: Hybrid
- Cook in-home for premium clients, batch-and-deliver for others
- Lets you serve different price points
- Most private chefs end up here

Pick your model based on your local regulations, kitchen situation, and target client.

## Step 2: Set Your Pricing

Weekly meal prep pricing needs to cover:

- **Food cost** per client (typically $40–$80/week for 10–12 meals)
- **Labor** (cooking, shopping, portioning, labeling, delivery)
- **Packaging** (containers, labels, bags — $3–$5/client/week)
- **Delivery** (gas, time, vehicle wear)

### Sample Pricing

| Model | Per Week | What's Included |
|-------|----------|-----------------|
| In-home cooking | $350–$500 | 10–12 meals, groceries included, cooked in client's kitchen |
| Delivered meals | $180–$300 | 10–12 meals, groceries included, delivered to door |
| Meals only (no groceries) | $120–$200 | Labor + packaging only, client provides grocery budget separately |

Start by calculating: if you spend 3 hours per in-home client and want to earn $75/hour for your time, that's $225 in labor alone. Add groceries ($60), packaging ($5), and travel ($15) = **$305 minimum per session**.

## Step 3: Find Your First 5 Clients

Meal prep clients come from different channels than dinner party clients:

1. **Local Facebook groups** — "Busy moms" groups, fitness communities, neighborhood groups. Post a simple offer: "Local private chef offering weekly meal prep — customized to your family's tastes and dietary needs. DM for details."
2. **Gyms and CrossFit boxes** — Partner with local gyms. Offer a free meal prep week as a raffle prize. Put up a flyer. Fitness-focused people are your ideal clients.
3. **Pediatrician and OB offices** — New parents are exhausted and desperate for help with meals. Ask to leave cards.
4. **Corporate wellness programs** — Companies invest in employee wellness. Pitch "weekly chef-prepared meals delivered to the office" as a team perk.
5. **Word of mouth** — Your dinner party clients likely also need weeknight meals. Ask them.

## Step 4: Systematize Your Week

The key to profitable meal prep is ruthless time efficiency. Here's a sample weekly flow:

- **Sunday:** Plan all menus for the week. Send clients their upcoming menu for approval.
- **Monday:** Shop for all clients in one trip. Batch your grocery list.
- **Tuesday–Thursday:** Cook days. Group clients by area to minimize driving.
- **Friday:** Delivery day (if you batch cook). Admin, invoicing, client check-ins.
- **Saturday:** Off. Or dinner parties if you want the extra income.

### Batch Cooking Is Your Superpower

If 8 clients all need a protein, a grain, and two vegetables — you're not cooking 8 separate meals. You're cooking 4 proteins, 3 grains, and 5 vegetables in bulk, then mixing and matching per client.

A 4-hour batch cook session can produce meals for 5–8 clients. That's the leverage that makes meal prep profitable.

## Step 5: Scale to 20+ Clients

Once you've proven the model with 5–10 clients, scaling looks like:

- **Raise your prices** — If you're fully booked, you're underpriced. Increase by 10–15%.
- **Hire a prep cook** — Pay $15–$20/hour for someone to do washing, chopping, and portioning. Your time should be spent on cooking, client relationships, and business development.
- **Invest in a commercial kitchen** — Shared commercial kitchens rent for $15–$30/hour. This lets you scale without being in clients' homes 40 hours a week.
- **Standardize your containers and labels** — Professional packaging makes your service feel premium. Branded labels cost $0.10 each and make a huge impression.
- **Automate billing** — Chasing payments from 20+ clients weekly is a full-time job if you do it manually.

## Common Mistakes to Avoid

- **Too much menu variety** — You're not a restaurant. 4–6 meal options per week is plenty. Changing the menu weekly keeps it interesting without overwhelming your prep.
- **Free tastings that never convert** — A free trial should be a single meal, not a full week. Make it easy for them to say yes, but don't give away the farm.
- **Not tracking food waste** — If you're throwing away 20% of what you buy, your profit margins are 20% lower than you think.
- **Skipping the contract** — Even weekly clients need a simple service agreement. What happens if they cancel mid-week? What's the notice period? Get it in writing.

## The Numbers at Scale

Let's say you reach 20 weekly meal prep clients:

| Metric | Amount |
|--------|--------|
| Revenue per client | $275/week |
| Weekly revenue | $5,500 |
| Monthly revenue | $22,000 |
| Grocery costs (30%) | $6,600 |
| Packaging + delivery | $1,200 |
| Gross profit | $14,200/month |

Even after taxes, insurance, and overhead, that's a strong income — and it's **predictable**. No feast-or-famine months. No hoping for inquiries. Just steady, recurring revenue from clients who need you every single week.

## Track Everything

The difference between a profitable meal prep business and a breakeven one is **knowing your numbers**. Track food cost per client, time per session, waste percentage, and profit per client.

[ChefFlow](/) tracks all of this automatically — clients, recurring events, food costs, payments, and profit margins per event. You see exactly which clients are profitable and where to optimize.

---

*Ready to build your meal prep business? [Start your free ChefFlow trial](/auth/signup) — manage clients, track costs, and grow your recurring revenue.*

**Related reading:** [How to Price a Private Dinner Party](/blog/how-to-price-a-private-dinner-party) | [How to Start a Private Chef Business](/blog/how-to-start-a-private-chef-business) | [Private Chef Contract Guide](/blog/private-chef-contract-template-guide)
`,
  },
]

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug)
}

export function getAllBlogSlugs(): string[] {
  return BLOG_POSTS.map((post) => post.slug)
}
