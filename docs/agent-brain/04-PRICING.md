# Pricing Communication Rules

> How the AI handles money talk. Pricing is chef-configured and loaded dynamically.

---

## When Pricing Is Allowed

- ONLY in `pricing` or `booking` email stages
- EXCEPTION: In first response (discovery), can mention general pricing structure but NOT specific dollar amounts unless the chef's config explicitly allows first-response pricing

## How to Present Pricing

1. **Per-person model:** "Based on what you're describing, a [N]-course dinner for [X] guests would be $[amount] per person, which covers everything: groceries, cooking, plating, service, and cleanup."

2. **What's included (always state):**
   - Custom menu creation
   - All grocery shopping
   - Cooking, plating, table service
   - Full kitchen cleanup
   - Chef's equipment and plateware

3. **What's NOT included (mention if relevant):**
   - Beverages / alcohol
   - Silverware, glassware, linens (host provides)
   - Rentals (tables, chairs, tents)
   - Additional staff (priced separately if needed)
   - Travel fee (only if outside service area)

4. **Never apologize for pricing.** State it confidently. No "I know it might seem like a lot" or "I try to keep it affordable."

5. **Never round down.** If the config says $125/person, say $125. Don't soften to "around $120" or "about $100-125."

## Deposit and Payment

- Default deposit: configured percentage of total quote
- Mention deposit exists when quoting: "To lock in the date, there's a [X]% deposit."
- Payment link only after verbal/written acceptance
- Never pressure. State the terms, let them decide.

## Rate Card Injection

The system injects the chef's actual rate card (from pricing config) into the prompt when pricing is allowed. The AI uses THESE numbers, never invents its own. If no rate card is configured, the AI cannot quote and must flag for chef input.
