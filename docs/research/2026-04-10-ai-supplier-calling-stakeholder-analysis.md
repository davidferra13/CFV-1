# Research: AI Supplier Calling - Stakeholder Analysis

> **Date:** 2026-04-10
> **Question:** How does each stakeholder group handle AI-powered supplier calling and ingredient sourcing, and what does that tell us about how to build this feature properly?
> **Status:** complete

## Origin Context

The developer is a private chef building ChefFlow. He has already built a basic Twilio TwiML system for outbound vendor calls: a script that announces "this is ChefFlow" and asks the vendor to press 1 for yes or 2 for no. He wants to know if this is the right approach, whether vendors will hang up, whether the legal exposure is real, and how to evolve the system from a keypress IVR to a full conversational AI agent. The goal is to understand this from every stakeholder angle before building further. A prior session produced a platform-level research report (`docs/research/ai-conversational-calling-platforms-2026-04-10.md`) on Retell AI, Bland.ai, and voice cloning; this report covers the human and regulatory dimensions that the platform report did not.

---

## Summary

The current TwiML keypress system solves a real problem but in the form vendors find least comfortable: a robotic script with no human warmth and no established context. The single biggest trust signal for vendor calls is an existing relationship, not the technology used. Vendors in specialty food (butchers, farms, fishmongers) are phone-first businesses that handle availability questions by voice every day, but they respond to calls from known buyers on known numbers, not anonymous robots. The legal exposure for B2B calls to business landlines is manageable with a single compliant disclosure line added to the opening script; the riskier surface is vendor cell phones, which carry higher TCPA liability. Existing B2B food ordering platforms (Choco, BlueCart, Notch) handle structured repeat ordering well but have an explicit gap: they do not solve real-time availability queries for specialty items outside their supplier networks, which is exactly the use case ChefFlow's calling feature addresses.

---

## Group 1: Chefs / Operators

### How private chefs currently source specialty ingredients

Private chefs source ingredients in layers, not from a single supplier. The typical stack:

1. **Preferred specialty distributors** (example: Chefs' Warehouse, Baldor, local specialty produce distributors) for items with a history of reliable supply. Orders placed via phone, rep text, or distributor portal, 1-3 days before the event.
2. **Local farms and fishmongers** for market-price and seasonal items. These relationships are built over time and often require a phone call the morning of the event to confirm that day's catch, cut, or harvest.
3. **Specialty retailers** (ethnic grocery stores, co-ops, high-end grocery) as a fallback for hard-to-source items.
4. **Farmers markets** for direct-from-producer sourcing, planned the week before around the market schedule.

The sourcing timeline for a private chef event:

- 1 week out: Menu finalized with client, order placed with primary distributors for shelf-stable and predictable items.
- 2-3 days out: Specialty items ordered from known vendors. Items like dry-aged beef, specific fish varieties, or rare truffles need booking in advance.
- Day before or morning of: Phone calls to local vendors to confirm availability and get that day's market price on volatile items (fish, specialty produce, game). This is when the friction is highest.
- Day of event: Chef arrives 1.5 hours early with ingredients in hand.

### Where the friction is

The day-before/morning-of phase is where chefs lose time. Specialty items have volatile availability (weather, catch size, seasonal crop). A chef preparing a 12-course tasting menu may need to call 3-5 vendors to find a specific variety of mushroom, a particular cut of fish, or a heritage breed product. Each call is:

- Navigating a business phone system (often the vendor's main line)
- Being put on hold while someone physically checks the walk-in
- Getting an informal price quote that needs to be noted manually
- Sometimes getting a callback rather than an immediate answer

Industry sources indicate restaurant buyers are "constantly in contact with their suppliers, with phone calls, meetings, and deliveries - there are probably weeks where they talk to their vendors more than they talk to their spouse." ([Restaurant Supplier Guide, GetOrderly](https://getorderly.com/blog/ultimate-restaurant-suppliers-guide)). For private chefs working independently without a purchasing team, this contact burden falls entirely on the chef.

### Current workarounds

- **Text/WhatsApp** with known reps: common for chefs who have established personal contacts at vendors. A quick text gets a response faster than a phone call.
- **Rep relationships**: the best distributors assign a dedicated sales rep who can field texts and quick questions outside business hours.
- **Over-ordering**: buying more than needed to avoid running out, which increases food cost.
- **Menu substitution**: if a specialty item can't be sourced, the chef adapts the menu, which undermines the bespoke experience that justifies private chef fees.

### What would make chefs trust AI to do this on their behalf

Based on industry patterns and the developer's own experience as a working chef:

1. **The call sounds professional and represents them accurately.** The AI needs to state the chef's name and business name, not just "ChefFlow." A vendor who has a relationship with Chef David Ferragamo will engage if the call says "I'm calling on behalf of Chef David." They will hang up if it says "this is an automated system calling about an ingredient."
2. **The AI gets useful data, not just yes/no.** A keypress IVR that captures "yes, we have it" without capturing the price or unit is only half the value. Chefs need the price to make a sourcing decision.
3. **They can see what happened.** A call log showing which vendors were called, what they said, and what the extracted price was builds trust in the system. Visibility is everything.
4. **The AI doesn't damage relationships.** Chefs have spent years building vendor trust. An AI call that sounds robotic, aggressive, or confusing poisons that relationship. The system must sound like an extension of the chef, not a spam operation.

### Key sources

- [Push Operations: Ultimate Guide to Sourcing High-Quality Ingredients](https://www.pushoperations.com/blog/the-ultimate-guide-to-sourcing-high-quality-ingredients-for-your-restaurant)
- [Chefs' Warehouse](https://www.chefswarehouse.com/)
- [Chef Shelley: Step by Step Walkthrough of a Cook Day](https://www.chefshelley.co/042024-2/)
- [Sienna Charles: Private Chef Sourcing for Ultra-Exclusive Clients](https://siennacharles.com/luxury-lifestyle-concierge/private-chef-hire)

---

## Group 2: Vendors / Suppliers

### How specialty food vendors handle availability inquiries

Specialty food vendors (butchers, local farms, fishmongers, specialty produce distributors) are fundamentally phone-first businesses. Their ordering infrastructure is typically:

- A main business phone line (often shared across functions)
- One or two staff who answer phone orders
- A physical walk-in or storage area where someone has to check availability manually
- A whiteboard or printed sheet tracking that day's inventory and pricing

Unlike large broadline distributors (Sysco, US Foods) that have EDI systems and real-time inventory, small specialty vendors update their "system" daily by hand. Price changes happen every morning based on overnight market reports, yield from that day's catch/harvest, and standing customer commitments.

### Attitudes toward automated calls

This is the highest-risk unknown in the feature. Direct research on specialty food vendors receiving AI calls is sparse (no dedicated studies found). However, data from broader small business research is available:

- **22% of people hang up immediately when AI identifies itself on a call** ([Answering Service Care: AI Call Report](https://answeringservicecare.com/insights/robots-reveal-yourself-the-ai-call-report/))
- **28% demand to be transferred to a human** when they learn it's AI
- **37% lose trust** when a company fails to disclose AI use
- **62% of small business owners** fear revenue loss if customers abandon calls after AI is revealed

For vendors (not consumers), the dynamic is different. A vendor receiving a call from a known buyer's system will likely engage if the call is: short, purposeful, and asks a question they can answer in under 30 seconds. What vendors resist:

- Long scripts that don't get to the point
- Calls that require them to do something unusual (press digits they don't understand)
- Calls from numbers they don't recognize with no context about who the buyer is
- Multiple calls in a short period about the same thing (perceived as harassing)

### What makes vendors engage vs. hang up

**They engage when:**

- The call immediately states who the buyer is (Chef [Name] who is "a client of yours" or "who orders from you regularly")
- The ask is simple and answerable in under 30 seconds ("Do you have X? What's the price?")
- The call sounds professional, not robotic
- The call respects their time and wraps up cleanly

**They hang up when:**

- The opening sounds like a spam or telemarketing call
- They can't identify the buyer
- The script is confusing or asks them to navigate an unfamiliar keypress menu
- They've received multiple automated calls in a week

### Information vendors need to give a useful answer

When a vendor hears "Do you have X available?", the useful answer requires:

1. **Clarifying the specific item** - "halibut" is ambiguous (fillet, whole, specific size?)
2. **Quantity context** - the answer may differ for 2 portions vs. 20 portions
3. **Timing** - available today vs. this week vs. needs to be ordered

A keypress IVR can capture "yes/no" but not these qualifiers. A conversational agent can ask follow-up questions ("Great - what's the price per pound? And is that available for pickup today?").

### Pricing inquiries over the phone

Food vendors give prices informally:

- "It's around $14 a pound today"
- "Market price - let me check, probably $8.50 a pound"
- "Depends on the quantity - for a couple portions it's about $16"
- "Call back in an hour, we're still sorting the morning delivery"

The current keypress system captures none of this. A conversational AI agent needs a downstream extraction step to parse these informal price statements into structured data.

### What makes a call feel legitimate vs. suspicious

The key legitimacy signals for a vendor receiving a call:

1. Caller ID shows a recognized number (the chef's actual business number, not a random VOIP number)
2. The call mentions the chef by name immediately
3. The call has a clear, specific purpose that matches the business relationship
4. The AI discloses itself upfront (vendors are less likely to feel deceived and more likely to engage)
5. The call ends quickly once the question is answered (no upselling, no runaround)

---

## Group 3: Business Owners / Food Service Companies

### Existing B2B platforms for supplier communication

Three major platforms dominate food service digital ordering:

**Choco** ([choco.com](https://choco.com/us))

- Primarily an ordering and communication platform connecting restaurants with distributors
- 2024 addition: Choco AI transcribes voicemails, emails, and texts to log orders
- Does NOT offer real-time availability checks or price queries
- Strong on repeat ordering workflows; weak on one-off specialty sourcing
- Pricing: $20-25 per customer per month for suppliers

**BlueCart** ([bluecart.com](https://www.bluecart.com))

- B2B marketplace linking 119,000 restaurants to food suppliers
- Strong on invoice management, predictive ordering, and catalog management
- Known limitations: interface navigation issues, slow order processing, inadequate inventory management per user reviews
- Key gap: real-time availability depends on supplier keeping their catalog updated, which many small specialty vendors do not
- Platform gap: many specialty vendors are not on BlueCart, requiring continued use of traditional ordering

**Notch** ([notch.financial](https://www.notch.financial))

- Evolved from Chefhero, now primarily a B2B payments and invoice management platform
- Products: Invoice Manager, Order Manager, AP Manager, AR Manager
- Not a sourcing or availability platform; focuses on the payment side of B2B food transactions

### The gap that voice calling fills

All three platforms share the same structural limitation: **they require the vendor to onboard and maintain their catalog.** A specialty butcher with 3 employees does not update their BlueCart catalog daily. A fishmonger doesn't post that day's catch to Choco. A family farm doesn't maintain a real-time inventory API.

The phone is the only real-time availability channel for specialty vendors who are not on any of these platforms. That is the gap the AI calling feature fills: direct, real-time inquiry for specialty items that no digital ordering platform covers.

The broader food service market (restaurants, catering groups) uses digital platforms for broadline ordering (Sysco, US Foods) where catalogs are maintained, and falls back to phone calls for specialty items. This pattern confirms that the ChefFlow AI calling feature is targeting the exact gap that existing platforms leave.

### Key sources

- [Choco: From Restaurant App to AI Partner for Distributors](https://choco.com/us/stories/suppliers/from-restaurant-app-to-ai-partner-for-distributors-the-evolution-of-choco)
- [BlueCart Blog: Choco vs BlueCart](https://www.bluecart.com/blog/choco)
- [BlueCart: New B2B Marketplace](https://www.digitalcommerce360.com/2024/09/05/bluecart-b2b-marketplace-distributors-restaurants/)
- [Notch: B2B Payments Platform](https://www.notch.financial/press-releases/b2b-payments-platform-for-foodservice)

---

## Group 4: Operations / Procurement

### How food service procurement teams get real-time pricing

Enterprise food service procurement uses a tiered approach:

**Tier 1: Contracted pricing** - Major commodities (flour, oil, proteins) purchased under negotiated contracts with price locks for 30-90 days. No real-time calls needed; pricing is known in advance.

**Tier 2: Market-price items** - Seafood, seasonal produce, specialty cuts. These are called "market price" on menus precisely because the price changes daily. Procurement managers or executive chefs check market pricing daily for these items, either via:

- A call to their assigned distributor rep
- A daily email price sheet from the distributor
- An online portal (for distributors who maintain one)

**Tier 3: Specialty sourcing** - One-off items not available through regular distributors. This is entirely phone-based. No digital system covers it.

For private chefs operating independently, all three tiers collapse into one person: the chef handles their own procurement. The average restaurant works with about 700 distinct products ([Supy: Restaurant Procurement Guide](https://supy.io/blog/restaurant-procurement-complete-guide)); a private chef's sourcing list is smaller but more specialized.

### Data needed per call

When a procurement agent calls a vendor to check availability and price, the structured data they need:

| Data point            | Example                                 | Notes                     |
| --------------------- | --------------------------------------- | ------------------------- |
| Availability (Y/N)    | "Yes, we have it"                       | Required                  |
| Price per unit        | "$14 per pound"                         | Required                  |
| Unit type             | "per pound", "per case", "each"         | Required                  |
| Units per case        | "12 per case, about 2 lbs each"         | When price is per-case    |
| Availability window   | "Today only", "All week"                | Important for planning    |
| Minimum order         | "5 pound minimum"                       | Required for small orders |
| Lead time             | "Need 24 hours notice", "In stock now"  | Required                  |
| Hold option           | "Can hold until 3pm for pickup"         | Valuable for planning     |
| Substitute suggestion | "No halibut, but we have turbot at $12" | Valuable fallback         |

The current keypress IVR captures only availability (Y/N). It captures none of the 8 other data points. A conversational AI agent can capture all of them.

### How they log and act on that data

Manual procurement workflows:

- Handwritten notes during the call
- Text file or spreadsheet updated post-call
- Sometimes nothing written - the chef holds it in working memory until the order is placed

This is why structured extraction from call transcripts is valuable. The conversational AI call produces a transcript; a post-call LLM extraction pass converts "it's around 14 bucks a pound, we've got maybe 10 pounds on hand and can hold some if you let us know by noon" into: `{ price_per_unit: 14.00, unit: "lb", quantity_available: 10, hold_deadline: "12:00pm", notes: "10 lbs on hand" }`.

### Key sources

- [Supy: Restaurant Procurement Top Tips](https://supy.io/blog/restaurant-procurement-top-tips-to-run-it-efficiently)
- [Simfoni: Food & Beverage Procurement Guide 2025](https://simfoni.com/food-beverage-procurement/)
- [Channel Fish: How Seafood Market Price Works](https://channelfish.com/blog/how-market-pricing-works/)
- [GetOrderly: The Only Food Supplier Pricing Software](https://getorderly.com/features/food-supplier-pricing)

---

## Group 5: Regulatory / Legal / Compliance

### FCC ruling on AI-generated voice calls (February 2024)

On February 8, 2024, the FCC issued a Declaratory Ruling: AI-generated voices fall within the meaning of "artificial or prerecorded voice" under the Telephone Consumer Protection Act (TCPA). This is the controlling federal rule.

**What this means in practice:**

- Any call using AI-generated voice - including the current ChefFlow TwiML + Amazon Polly system - is legally an "artificial voice" call under TCPA
- The FCC's rule applies regardless of whether the call is B2B or B2C
- Consent and disclosure requirements apply

**The current ChefFlow TwiML script is non-compliant** on one specific count: it does not include the FCC-mandated AI disclosure. The script says "This is an automated call from ChefFlow" - which identifies it as automated, but does not explicitly state it uses AI-generated voice. As of the August 2024 proposed rules (formally effective January 27, 2025), the opening must include explicit AI disclosure.

Source: [FCC-24-17 Declaratory Ruling](https://docs.fcc.gov/public/attachments/FCC-24-17A1.pdf), [Wilson Sonsini Analysis](https://www.wsgr.com/en/insights/fcc-rules-ai-generated-voices-are-artificial-under-the-tcpa.html)

### TCPA compliance for outbound B2B calls

TCPA has different treatment for B2B vs B2C calls, but the AI voice rule applies to both.

**Business landlines:**

- Business landlines are exempt from the National Do Not Call Registry
- B2B calls to business landlines are lower TCPA risk than consumer calls
- No prior express consent required for calls to a business's published landline number for a legitimate business purpose

**Business cell phones:**

- The Ninth Circuit created a presumption in 2024 that mixed-use phones (even if advertised as business numbers) are treated as residential
- Calling a vendor's cell phone without prior consent carries the same TCPA exposure as calling a consumer
- This is significant because many small specialty vendors use a personal cell phone as their business number

**The vendor cell phone problem:** A fishmonger whose "business number" is his personal iPhone is legally treated as a consumer number under the Ninth Circuit presumption. Calling him with an AI voice without consent is a potential TCPA violation: $500-$1,500 per call, no cap on aggregate liability.

**Mitigation:** An established business relationship (the vendor is already in the chef's contact list and has received human calls before) reduces but does not eliminate this risk.

Source: [DNC.com: B2B Exemptions](https://www.dnc.com/faq/are-b2b-calls-exempt-tcpa-regulations), [Ninth Circuit ruling on mixed-use phones](https://mslawgroup.com/ninth-circuits-do-not-call-decision-effects-b2b-callers/), [Intelemark B2B TCPA Guide](https://www.intelemark.com/blog/b2b-telemarketing-understanding-tcpa-compliance-and-best-practices/)

### January 27, 2025 - One-to-One Consent Rule

The FCC's January 2025 rule requires written, single-seller consent for outbound AI calls. For B2B supplier calls, this translates to: if you are calling a vendor's cell phone using an AI voice, you need documented consent from that specific vendor to receive AI calls from your specific business - not a blanket consent shared across multiple sellers.

For ChefFlow's use case (calling vendors that the chef has an established relationship with, from a phone number the vendor recognizes), the path to compliance is:

1. Only call business landlines for cold vendor calls (no prior relationship)
2. For cell phone calls to known vendors: document their implicit consent as part of the onboarding flow when a chef adds a vendor to their ChefFlow vendor list

Source: [TCPA One-to-One Consent Rule Analysis](https://www.americascreditunions.org/blogs/compliance/tcpa-one-one-consent-rule-effective-january-2025), [Kixie: AI-Powered Robocalls 2025 Guide](https://www.kixie.com/sales-blog/ai-powered-robocalls-in-2025-a-guide-to-the-new-rules/)

### State-by-state recording consent (two-party consent states)

Recording consent is separate from calling consent. Two-party/all-party consent states require ALL parties to be notified and consent before recording begins.

**11 two-party consent states as of 2024:**
California, Connecticut, Delaware, Florida, Illinois, Maryland, Massachusetts, Montana, Nevada, New Hampshire, Pennsylvania, and Washington.

**Relevance to ChefFlow's chef base:** The developer is based in Massachusetts (Haverhill, MA). Massachusetts is a two-party consent state. Any call recorded by the system must include an explicit recording notification before any substantive conversation begins.

**Safest approach (nationwide):** Treat every call as a two-party consent call. The opening script should include: "This call may be recorded." If the vendor continues the conversation after this notice, that constitutes implied consent in most jurisdictions. This is the language already present in the prior session's recommended script.

**California note:** California Penal Code 632 is the most aggressive state recording law. A major restaurant chain settled for $3.2 million after failing to obtain proper consent for AI call recordings across California and Illinois locations. California imposes $500 per undisclosed AI interaction and up to $5,000 civil penalty per violation. ([Hostie.ai: AI Compliance Checklist 2025](https://hostie.ai/resources/ai-compliance-checklist-2025-federal-state-call-recording-laws-restaurants))

Source: [Justia 50-State Survey on Recording Laws](https://www.justia.com/50-state-surveys/recording-phone-calls-and-conversations/), [Rev.com: Phone Call Recording Laws](https://www.rev.com/blog/phone-call-recording-laws-state), [Hostie.ai: State-by-State Compliance 2025](https://hostie.ai/resources/state-by-state-call-recording-compliance-ai-virtual-hosts-2025)

### Do-not-call obligations for B2B calls

**National DNC Registry:** Business landlines are exempt. Calling a business's published landline to conduct a business inquiry (checking ingredient availability) is not a DNC violation.

**Internal DNC list (mandatory):** Any business using outbound calling must maintain an internal do-not-call list. If a vendor says "don't call us again" or "remove us from your list," that request must be honored immediately and permanently. Failing to do so is a per-call TCPA violation.

**The supplier_calls table** in the existing database (`20260410000002_supplier_calls.sql`) should include a `do_not_call` flag. The prior platform research report recommended adding this flag. This is a compliance requirement, not optional.

### Compliant opening disclosure - current gap analysis

The current TwiML script opening:

> "Hello. This is an automated call from ChefFlow on behalf of a professional chef. We have a quick question about your inventory..."

Issues with the current script:

1. **Missing AI disclosure** - says "automated call" but not "AI-generated voice" (FCC-required as of January 2025)
2. **Missing recording consent** - does not say "this call may be recorded" (required for MA and 10 other states)
3. **Missing opt-out offer** - TCPA requires an opt-out mechanism within 2 seconds of the message; the keypress menu serves as a partial workaround but doesn't include "press 9 to be removed"
4. **Missing chef identity** - says "a professional chef" not the chef's name; vendors need to identify the buyer to engage

Compliant replacement opening:

> "Hi, this is an AI voice assistant calling on behalf of Chef [Name] at [Business Name]. This call uses AI-generated voice and may be recorded. I'm calling to check on the availability and price of [ingredient]. If you'd prefer not to receive these calls, press 9. Otherwise, press 1 if you have [ingredient] in stock, or press 2 if you don't."

This single paragraph covers: AI disclosure, recording consent, caller identity, purpose, and opt-out.

---

## Group 6: Technical / System

### State of the art for conversational AI calling (2025-2026)

The prior platform research report (`docs/research/ai-conversational-calling-platforms-2026-04-10.md`) covers this group in full. Key additions and updates from this research pass:

**Retell AI (recommended platform):**

- Current pricing: $0.07-$0.08/min for voice engine + $0.006-$0.06/min for LLM + $0.005/min for knowledge base
- All-in realistic cost: $0.13-$0.25/min for a full conversational call
- IVR navigation: native DTMF press-digit node, can navigate multi-level IVR menus automatically
- Voicemail detection: runs for first 3 minutes of call, adds under 30ms latency, can choose hang-up or leave-message
- Hold detection: Voice Activity Detection (VAD) filters hold music and ambient noise, agents don't respond to hold music prematurely
- IVR + voicemail detection confirmed by Retell changelog and docs: [Retell: Handle Voicemail and IVR](https://docs.retellai.com/build/handle-voicemail)

**Real-world conversation quality benchmarks:**

- Revmo AI: 82% call completion rate
- Slang.ai: 63% call completion rate
- Loman.ai: 60% call completion rate

Slang.ai handles restaurant reservations with an 8.2/10 naturalness score from callers. Loman.ai handles restaurant order calls end-to-end.

No vendor-facing AI calling system for food supply availability exists in the literature. This is a confirmed green-field use case.

**Bland.ai comparison:** Optimized for high-volume cold outbound (sales dialing). Voice sounds more "bot-like" with longer pauses. Users switching from Bland to Retell report 17% higher conversion and callers staying on longer. Not recommended for this use case.

### How best systems handle edge cases

| Edge case                         | What Retell AI does                                      | What current TwiML does                 |
| --------------------------------- | -------------------------------------------------------- | --------------------------------------- |
| Voicemail                         | Detects within first 3 min, can leave message or hang up | No voicemail detection - leaves silence |
| IVR menu                          | Navigates DTMF digit presses automatically               | No IVR navigation - hangs up            |
| Hold music                        | VAD ignores hold music, agent waits silently             | Unknown behavior                        |
| Transfer to another department    | Warm transfer detection with human-presence check        | No transfer handling                    |
| Hostile response ("stop calling") | Requires custom intent recognition                       | No hostile response handling            |
| Vendor asks who the caller is     | LLM answers from context window                          | Script can't deviate                    |
| Price in unexpected format        | LLM understands natural language                         | Keypress can't capture price at all     |

### Full conversation decision tree for a supplier availability call

```
CALL PLACED
  |
  +-- VOICEMAIL DETECTED (silence + beep, or explicit voicemail greeting)
  |     Retell: leave short message or hang up based on config
  |     Message: "Hi, this is an AI assistant calling on behalf of Chef [Name]
  |               about availability for [item]. We'll try again or you can
  |               reach [business number]. Thank you."
  |     Log: result = "voicemail"
  |
  +-- IVR MENU DETECTED (automated system)
  |     Retell: listens for digit prompts, presses appropriate digit
  |     Examples: "Press 2 for produce department", "Press 1 for sales"
  |     Then waits for human pickup on the selected line
  |
  +-- HOLD MUSIC / "PLEASE HOLD"
  |     Retell VAD: ignores hold music, waits silently
  |     Timeout at 3 minutes: leave message or hang up
  |     Log: result = "on-hold-timeout" if exceeded
  |
  +-- TRANSFER TO DIFFERENT DEPARTMENT
  |     Warm transfer: detect human presence on new line
  |     Re-introduce: "Hi, I was just transferred over - I'm an AI assistant
  |                    calling on behalf of Chef [Name] about availability..."
  |
  +-- HUMAN ANSWERS
        |
        FIRST WORDS (mandatory, no exceptions):
        "Hi, this is an AI assistant calling on behalf of Chef [Name] at [Business].
         This call uses AI-generated voice and may be recorded. Quick question:
         do you have [item] in stock today?"
        |
        +-- "WHO IS THIS?" / "WHAT IS THIS?"
        |     "I'm an AI assistant calling for Chef [Name] - they're a client
        |      of yours. Just checking on availability and pricing for [item]."
        |
        +-- "STOP CALLING / REMOVE US"
        |     "Understood - I'll note that right away and remove you from our
        |      contact list. Sorry for the disruption, have a good day."
        |     End call. Log: do_not_call = true. Flag vendor in DB.
        |
        +-- "YES, WE HAVE IT"
        |     "Great - what's your current price per [unit]?"
        |     +-- Price stated: confirm ("So [price] per [unit] - did I get that right?")
        |     +-- "Let me check": wait up to 60 seconds
        |     +-- "Depends on quantity": "We'd need [quantity] - what would that run?"
        |     +-- "Market price, call back": log result + schedule retry
        |     After price confirmed:
        |     "Is that available for pickup today, or do you need advance notice?"
        |     Then: "Perfect - that's all I needed. Thank you so much."
        |     End call. Log: result = "success", price extracted
        |
        +-- "NO / WE'RE OUT"
        |     "Do you know when you'd have it back in, or could you suggest
        |      an alternative we might try?"
        |     Note response. "Thank you - I'll let Chef [Name] know."
        |     End call. Log: result = "unavailable"
        |
        +-- NO ANSWER / BUSY / FAILED
              Log: result = status code. Retry per policy.
```

### Voice cloning: ElevenLabs Professional Clone - realistic assessment

The prior report covers voice cloning in detail. Additional findings from this research pass:

- Professional Voice Clone requires 30 minutes minimum audio, 1-3 hours optimal
- Audio requirements: no background noise, consistent tone, no room reverb
- Training time: 3-4 weeks
- Cost: requires paid plan ($22/mo Creator tier minimum)
- Quality: "nearly indistinguishable from the original voice" per ElevenLabs documentation ([ElevenLabs: Professional Voice Cloning](https://elevenlabs.io/docs/eleven-creative/voices/voice-cloning/professional-voice-cloning))

**Critical legal point:** ElevenLabs Professional Voice Clone of the chef's own voice is legal for outbound calls they authorize. The FCC ruling bans voice cloning that impersonates others or deceives recipients. A chef calling their own vendors using their own voice clone is legally distinct from impersonation.

**Practical recommendation:** The quality gap between a high-quality non-cloned ElevenLabs voice and a professional voice clone is small. For a vendor-facing call that lasts 30-90 seconds, a natural-sounding ElevenLabs stock voice is likely sufficient and avoids the 3-4 week training wait.

---

## Key Implications for ChefFlow

**1. Fix the current TwiML script's compliance gap immediately (one-line fix).**
The existing script at `app/api/calling/twiml/route.ts` is missing the FCC-mandated AI disclosure, recording consent notice, chef name/business identity, and opt-out mechanism. These are not optional. The developer is in Massachusetts, a two-party consent state. A compliant replacement opening is in Group 5 above. This is a 15-minute fix, not a spec.

**2. Add a do-not-call flag to the vendor record and honor it immediately.**
Any vendor who says "stop calling" must be flagged in the database and excluded from all future calls. The `supplier_calls` table needs a `do_not_call` boolean on the vendor record itself (not just the call log). This is a TCPA compliance requirement.

**3. The keypress system is the wrong interface for the job it's trying to do.**
The keypress IVR captures availability (yes/no) but vendors don't just say yes or no - they say "yes at $14 a pound" or "we should have some by Thursday." The value is in the price and availability window, not just the binary. The conversational upgrade (Retell AI + ElevenLabs) is the right path for a feature that needs to be trusted by chefs.

**4. Caller identity is the single biggest trust variable.**
Vendors engage when they know who is calling. The AI must say "Chef [Name] at [Business]" in the first sentence, not "ChefFlow" or "a professional chef." The chef's name is the relationship hook. The platform name is meaningless to a vendor who doesn't use ChefFlow.

**5. Vendor cell phones are the TCPA liability surface - landlines are safe.**
The design assumption that "we're calling a vendor, so it's B2B and we're fine" breaks down when the vendor's number is a personal cell phone (common for small specialty operations). Landlines: safe. Cell phones without prior consent: TCPA exposure at $500-$1,500 per call. The vendor onboarding flow in ChefFlow should tag the number type and, for cell phones, document an implicit consent step when the chef adds the vendor.

**6. The gap in existing B2B platforms is real and confirmed.**
Choco, BlueCart, and Notch all require vendor onboarding and catalog maintenance. None of them solve real-time availability for specialty vendors who are not on any platform. The AI calling feature is filling a gap that is not covered by any current B2B solution. This is a genuine, defensible product differentiator.

**7. Post-call extraction is as important as the call itself.**
The call produces a transcript. The transcript contains the price, availability window, minimum order, and any notes. An LLM extraction pass after the call converts "yeah, we've got about ten pounds of halibut left, it's going for fourteen-fifty a pound today, hold it till noon if you want" into structured records. Without this extraction step, the call creates data that lives only as text and can't drive UI updates or price catalog entries.

**8. Voicemail handling is not optional - it's the most common outcome.**
Specialty vendors are often on the floor, away from the phone, or between deliveries. A call that reaches voicemail and plays silence wastes a call slot and irritates the vendor when they check their voicemail. The current TwiML system has no voicemail detection. Retell AI handles this natively. Until the conversational upgrade is built, a simple TwiML voicemail fallback message should be added.

**9. Build toward conversational, don't over-engineer the current IVR.**
The current keypress system is a functioning proof-of-concept. The right next step is not adding more keypress options to the IVR - it's moving to Retell AI for full conversational capability. Extending the keypress IVR with more digit options creates complexity that all gets thrown away when the upgrade happens.

**10. Consent documentation for vendor records should start now.**
As the feature grows and calls vendor cell phones, the consent chain needs to be documentable. The practical implementation: when a chef adds a vendor to ChefFlow and enables AI calling for that vendor, show a brief explanation ("AI may call this vendor on your behalf") with a confirmation step. Store the timestamp and chef confirmation. This creates the documented consent record that protects against TCPA claims.

---

## Gaps and Unknowns

1. **Real vendor hang-up rates for this specific use case** - No study exists on how specialty food vendors (butchers, farms, fishmongers) respond to AI availability inquiry calls specifically. The 22%/28% hang-up data is from general consumer/small business research, not food supply vendors.

2. **The "established relationship" consent question** - Legal consensus on whether an existing chef-vendor relationship (the chef has called the vendor before, is a known customer) constitutes implied consent for an AI call on the chef's behalf is not settled. The safe answer is to treat it as if consent is needed. A TCPA attorney review before scaling to thousands of vendor calls is warranted.

3. **Vendor number type distribution** - What percentage of specialty food vendors use a personal cell phone as their business number vs. a dedicated landline? This affects TCPA exposure assessment. A simple manual audit of the vendor numbers already in ChefFlow would answer this.

4. **Hold detection reliability in practice** - Retell AI claims hold detection via VAD, but real-world reliability with diverse hold music (silence, beeps, music) from small food business phone systems has not been independently benchmarked.

5. **Price extraction accuracy** - No off-the-shelf solution for extracting food pricing from informal speech exists. The LLM extraction prompt that converts "around fourteen-fifty a pound" to `{ price: 14.50, unit: "lb" }` needs to be designed and tested against real transcript samples before the feature ships.

6. **State of the January 2025 FCC rules as actually enforced** - The one-to-one consent rule faced legal challenges as of early 2025. Whether it has been enforced or challenged affects the compliance priority. This requires checking current enforcement status with legal counsel before scaling.

---

### References

- [FCC February 2024 Declaratory Ruling - FCC-24-17](https://docs.fcc.gov/public/attachments/FCC-24-17A1.pdf)
- [FCC July 2024 Fact Sheet on AI Implications for Robocall Rules](https://docs.fcc.gov/public/attachments/DOC-404036A1.pdf)
- [Wilson Sonsini: FCC Rules AI Voices Are Artificial Under TCPA](https://www.wsgr.com/en/insights/fcc-rules-ai-generated-voices-are-artificial-under-the-tcpa.html)
- [Mayer Brown: FCC Declares Intent to Regulate AI Calls](https://www.mayerbrown.com/en/insights/publications/2024/02/fcc-declares-authority-and-intent-to-regulate-ai-generated-calls-under-the-tcpa)
- [Justia: 50-State Survey on Recording Laws](https://www.justia.com/50-state-surveys/recording-phone-calls-and-conversations/)
- [Hostie.ai: AI Compliance Checklist 2025](https://hostie.ai/resources/ai-compliance-checklist-2025-federal-state-call-recording-laws-restaurants)
- [DNC.com: B2B TCPA Exemptions](https://www.dnc.com/faq/are-b2b-calls-exempt-tcpa-regulations)
- [Ninth Circuit B2B Mixed-Use Phone Decision](https://mslawgroup.com/ninth-circuits-do-not-call-decision-effects-b2b-callers/)
- [Retell AI: IVR and Voicemail Documentation](https://docs.retellai.com/build/handle-voicemail)
- [Retell AI: Pricing](https://www.retellai.com/pricing)
- [ElevenLabs: Professional Voice Cloning](https://elevenlabs.io/docs/eleven-creative/voices/voice-cloning/professional-voice-cloning)
- [Answering Service Care: Robots Reveal Yourself - The AI Call Report](https://answeringservicecare.com/insights/robots-reveal-yourself-the-ai-call-report/)
- [Choco: Restaurant Platform](https://choco.com/us)
- [BlueCart: New B2B Marketplace](https://www.digitalcommerce360.com/2024/09/05/bluecart-b2b-marketplace-distributors-restaurants/)
- [Notch: B2B Payments Platform](https://www.notch.financial/press-releases/b2b-payments-platform-for-foodservice)
- [Push Operations: Guide to Sourcing High-Quality Ingredients](https://www.pushoperations.com/blog/the-ultimate-guide-to-sourcing-high-quality-ingredients-for-your-restaurant)
- [Channel Fish: How Seafood Market Price Works](https://channelfish.com/blog/how-market-pricing-works/)
- [Supy: Restaurant Procurement Complete Guide](https://supy.io/blog/restaurant-procurement-complete-guide)
- [Kixie: AI-Powered Robocalls 2025 Guide](https://www.kixie.com/sales-blog/ai-powered-robocalls-in-2025-a-guide-to-the-new-rules/)
- [Henson Legal: AI Voice Agent Compliance](https://www.henson-legal.com/ai-voice-compliance)
