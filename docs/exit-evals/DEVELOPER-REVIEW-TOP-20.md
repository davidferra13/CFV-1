# Exit Eval: Top 20 Developer Review

> **Instructions:** Answer each question in your own words. Short is fine. One sentence or a paragraph, whatever feels right. The AI already audited the codebase and classified everything. What's missing is YOUR operational knowledge, YOUR constraints, YOUR priorities. These answers will shape what gets built next.
>
> Delete the placeholder `[YOUR ANSWER]` and write your response.

---

## 1. Check current price of specific ingredient

**What AI found:** PIE has 13-tier price resolution, 27 data sources, 1.1M prices. It thinks this is the single highest-frequency exit (multiple times daily).

**Questions:**

**1a.** When you need to know what an ingredient costs right now, what do you actually do? (Open an app? Check a receipt? Just know from memory? Google it?)

`[YOUR ANSWER]`

**1b.** Which stores do you actually shop at regularly? (Names, not categories)

`[YOUR ANSWER]`

**1c.** Which ingredients change price often enough that stale data is dangerous? Which ones are stable enough that a 30-day-old price is fine?

`[YOUR ANSWER]`

**1d.** If ChefFlow showed you a price and it was wrong by 15%, would that be worse than showing nothing?

`[YOUR ANSWER]`

---

## 2. Cost out a menu using real retail prices

**What AI found:** Menu economics engine exists, calculates per-guest cost, food cost %, margin. Thinks this is the core business differentiator.

**Questions:**

**2a.** Walk me through how you cost a menu TODAY. At what point in the process? Before you finalize the menu, after, or both?

`[YOUR ANSWER]`

**2b.** Do you cost per-guest, flat per-event, or some other way? Does it change by event type?

`[YOUR ANSWER]`

**2c.** When you cost a menu, how precise do you need to be? Ballpark ($50-60/head) or exact ($54.37/head)?

`[YOUR ANSWER]`

**2d.** What's the single biggest pain point in costing today? Time? Accuracy? Forgetting items?

`[YOUR ANSWER]`

---

## 3. Respond to inquiry on third-party platform

**What AI found:** Gmail sync parses 12 platforms (Thumbtack, Bark, Take a Chef, etc.). Inquiry hub consolidates them. AI thinks response speed directly affects booking rate.

**Questions:**

**3a.** Which platforms do you actually get inquiries from right now? Rank by volume.

`[YOUR ANSWER]`

**3b.** How fast do you typically respond? How fast do you NEED to respond to win the booking?

`[YOUR ANSWER]`

**3c.** When an inquiry comes in and you're mid-prep, what happens? Do you stop and respond, respond later, have a template ready?

`[YOUR ANSWER]`

**3d.** What information do you need from ChefFlow to respond to an inquiry? (Past menus? Pricing? Calendar availability? All of it?)

`[YOUR ANSWER]`

---

## 4. Calculate food cost percentage against target

**What AI found:** Engine calculates food cost %. AI doesn't know your actual target ranges.

**Questions:**

**4a.** What food cost % do you target? Does it vary by event type? (e.g., dinner party vs corporate vs weekly meal prep)

`[YOUR ANSWER]`

**4b.** Do you include travel, labor, or equipment rental in your cost calculation, or is "food cost" literally just ingredients?

`[YOUR ANSWER]`

**4c.** When food cost % comes back too high, what do you do? Swap ingredients? Raise the price? Eat it?

`[YOUR ANSWER]`

---

## 5. Compare prices across multiple stores

**What AI found:** PIE can compare across stores. AI assumes chefs shop around.

**Questions:**

**5a.** Do you actually shop at multiple stores for one event, or do you pick one and go?

`[YOUR ANSWER]`

**5b.** When you DO compare, what drives the decision? Price alone? Quality? Distance? Having an account?

`[YOUR ANSWER]`

**5c.** Is there a dollar threshold where you'd drive to a second store? (e.g., save $50 on a $500 shop = worth it?)

`[YOUR ANSWER]`

---

## 6. Validate own pricing against market rates

**What AI found:** Market positioning data from Take a Chef scraping (200+ reviews, 10 years of rates). AI thinks this is checked every quote.

**Questions:**

**6a.** How do you decide what to charge? Is it formula-based (cost + margin), market-based (what others charge), or gut?

`[YOUR ANSWER]`

**6b.** Who are your actual competitors in the Haverhill/Boston market? How many are there?

`[YOUR ANSWER]`

**6c.** Do you charge per-person, per-event, per-hour, or some combination? Does it vary?

`[YOUR ANSWER]`

**6d.** When was the last time you changed your pricing? What triggered it?

`[YOUR ANSWER]`

---

## 7. Send payment request via Venmo/Zelle

**What AI found:** Stripe is integrated for invoicing. AI doesn't know if you actually use it or prefer Venmo/Zelle.

**Questions:**

**7a.** How do you collect payment today? What percentage is Stripe vs Venmo vs Zelle vs cash vs check?

`[YOUR ANSWER]`

**7b.** Do clients have a preference? Do YOU have a preference?

`[YOUR ANSWER]`

**7c.** Should ChefFlow try to handle payments, or just record that payment happened and how much?

`[YOUR ANSWER]`

---

## 8. Check if client payment cleared

**What AI found:** Stripe webhooks track payments. AI doesn't know your real collection pattern.

**Questions:**

**8a.** How do you currently know a payment came through? Check an app? Get a notification? Just trust it?

`[YOUR ANSWER]`

**8b.** How often do payments NOT come through? Is chasing payment a real problem or rare?

`[YOUR ANSWER]`

**8c.** Do you collect before, after, or split (deposit + final)?

`[YOUR ANSWER]`

---

## 9. Text/iMessage a client

**What AI found:** Twilio SMS integration exists. AI doesn't know if you want a business number or personal number.

**Questions:**

**9a.** Do you text clients from your personal number today? Is that a problem?

`[YOUR ANSWER]`

**9b.** Would you want a separate ChefFlow business number, or does that feel too impersonal for your client relationships?

`[YOUR ANSWER]`

**9c.** How important is message history? Do you ever scroll back through texts to find something a client said?

`[YOUR ANSWER]`

**9d.** iMessage vs SMS: do you care? Do your clients?

`[YOUR ANSWER]`

---

## 10. Set prep timing reminders and alarms

**What AI found:** DOP (day-of plan) system exists with timeline generation. AI doesn't know your actual prep rhythm.

**Questions:**

**10a.** Walk me through a typical event-day morning. When do you start prepping? How do you keep track of timing?

`[YOUR ANSWER]`

**10b.** Do you use phone alarms, oven timers, mental clock, or something else?

`[YOUR ANSWER]`

**10c.** If ChefFlow sent you push notifications ("start the reduction in 15 minutes"), would that be helpful or annoying?

`[YOUR ANSWER]`

---

## 11. Look up bulk/wholesale pricing

**What AI found:** Wholesale intelligence engine covers 6 distributors. AI doesn't know which ones you have accounts with.

**Questions:**

**11a.** Do you buy wholesale? Which distributors do you have accounts with?

`[YOUR ANSWER]`

**11b.** What's your typical order size that makes wholesale worth it vs just going to the store?

`[YOUR ANSWER]`

**11c.** Is the wholesale vs retail decision about price, or about quality/convenience/reliability?

`[YOUR ANSWER]`

---

## 12. Route planning for the day

**What AI found:** OSRM travel estimates exist. Mileage tracking built. AI doesn't know your actual daily pattern.

**Questions:**

**12a.** On a typical work day, how many stops do you make? (Home -> store -> venue -> home? More complex?)

`[YOUR ANSWER]`

**12b.** Do you plan your route, or is it automatic at this point?

`[YOUR ANSWER]`

**12c.** Would optimized routing actually save you time, or do you already know the best routes?

`[YOUR ANSWER]`

---

## 13. Check client dietary/allergy info before cooking

**What AI found:** Dinner Circle collects dietary data. Dietary hub exists. AI thinks this is safety-critical.

**Questions:**

**13a.** How do you currently find out about allergies and dietary restrictions? When in the process?

`[YOUR ANSWER]`

**13b.** Have you ever had a guest show up with an undisclosed allergy? What happened?

`[YOUR ANSWER]`

**13c.** Do you trust what clients report, or do you always confirm verbally?

`[YOUR ANSWER]`

**13d.** What's your worst-case allergy scenario and how do you guard against it today?

`[YOUR ANSWER]`

---

## 14. Coordinate with client's household staff

**What AI found:** Staff roster system exists but has no household-staff path. AI flagged this as the biggest delegation gap.

**Questions:**

**14a.** How common are household staff (housekeepers, property managers, assistants) in your client base?

`[YOUR ANSWER]`

**14b.** When they exist, how do you communicate with them? Through the client, directly, or both?

`[YOUR ANSWER]`

**14c.** What do you typically need from household staff? (Kitchen access, setup, cleanup, grocery receiving?)

`[YOUR ANSWER]`

---

## 15. Research venue's kitchen capabilities

**What AI found:** Venue profile system has 20+ fields. AI thinks clients can report kitchen details via Dinner Circle.

**Questions:**

**15a.** What kitchen details ACTUALLY matter when you're deciding what to bring? Top 5.

`[YOUR ANSWER]`

**15b.** Can clients reliably tell you their kitchen specs, or do they always get it wrong? ("Yes we have a big oven" = 24" apartment oven)

`[YOUR ANSWER]`

**15c.** Do you always do a walkthrough for new venues, or do you sometimes wing it?

`[YOUR ANSWER]`

---

## 16. Check specialty ingredient availability

**What AI found:** Vendor system and sourcing intelligence exist. AI doesn't know your specialty sourcing patterns.

**Questions:**

**16a.** Name 5 ingredients that are hard to find locally.

`[YOUR ANSWER]`

**16b.** When something is hard to find, what do you do? (Order online? Substitute? Call around? Drive further?)

`[YOUR ANSWER]`

**16c.** Do you keep a mental list of "where to get X" or is it a fresh search every time?

`[YOUR ANSWER]`

---

## 17. Coordinate with other vendors at multi-vendor events

**What AI found:** Vendor communication exists but is chef-to-vendor, not event-level coordination. AI doesn't know how multi-vendor events actually work.

**Questions:**

**17a.** How often do you work multi-vendor events? (Every week? Occasionally? Rarely?)

`[YOUR ANSWER]`

**17b.** Who coordinates? You, the client, an event planner, or nobody?

`[YOUR ANSWER]`

**17c.** What information do you need from other vendors? (Timeline? Space sharing? Power/water access?)

`[YOUR ANSWER]`

---

## 18. Look up whether ingredient is safe (guest-facing)

**What AI found:** Ingredient allergen data exists in the database. Not surfaced to guests. AI flagged liability question.

**Questions:**

**18a.** Should guests be able to see full ingredient lists for dishes, or is that your job to manage?

`[YOUR ANSWER]`

**18b.** Does showing "contains tree nuts" create liability if you miss something? How do restaurants handle this?

`[YOUR ANSWER]`

**18c.** Would you rather guests ask you directly about allergies, or self-serve the information?

`[YOUR ANSWER]`

---

## 19. Submit a vendor invoice

**What AI found:** Document intake pipeline exists but is chef-gated (you upload, not the vendor). AI asks if vendors would use a portal.

**Questions:**

**19a.** How do vendors send you invoices today? (Email PDF? Paper? Text a photo?)

`[YOUR ANSWER]`

**19b.** Would your vendors actually use a portal to submit invoices, or is that asking too much of a fish guy?

`[YOUR ANSWER]`

**19c.** How do you track vendor invoices now? (Shoebox? Folder? Email search? Nothing?)

`[YOUR ANSWER]`

---

## 20. Competitor pricing and offerings research

**What AI found:** Take a Chef scraping and market benchmark data exist. AI doesn't know your actual competitive landscape.

**Questions:**

**20a.** How often do you actually research what competitors charge?

`[YOUR ANSWER]`

**20b.** Where do you look? (Their websites? Thumbtack? Word of mouth? You don't?)

`[YOUR ANSWER]`

**20c.** Does knowing competitor pricing change your behavior, or do you price based on your own costs and value?

`[YOUR ANSWER]`

---

## Done?

When you've answered all 20, start a new Claude Code session and say:

> "Read `docs/exit-evals/DEVELOPER-REVIEW-TOP-20.md` and synthesize my answers into the exit-eval roadmap."

That session will merge your brain dumps with the AI's codebase audit across all 489 scenarios.
