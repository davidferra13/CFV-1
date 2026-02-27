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

[ChefFlow](https://cheflowhq.com) tracks food costs, labor, expenses, and profit per event automatically — so you always know your real numbers. Start a free trial and see your margins on the very first event.

---

*Have a pricing question? [Contact us](https://cheflowhq.com/contact) — we're happy to help.*
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

*[ChefFlow](https://cheflowhq.com) handles client management, event tracking, proposals, and follow-ups in one system — so nothing falls through the cracks. [Start free](https://cheflowhq.com/auth/signup).*
`,
  },
]

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug)
}

export function getAllBlogSlugs(): string[] {
  return BLOG_POSTS.map((post) => post.slug)
}
