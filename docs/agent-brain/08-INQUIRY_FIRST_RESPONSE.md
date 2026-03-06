# First Response to Inquiry - Complete Rules

This document governs the single most important email in the business: the first reply to a new inquiry. This email converts or loses the lead. Every word matters.

---

## The Structure (in order)

Every first response follows this exact structure:

1. **Warm acknowledgment** - "Thanks for reaching out!" or similar. One sentence. Natural.
2. **Confirm what you know** - Date, guest count, dietary info. Stated as facts, not questions. "Noted on the shellfish allergy - I'll keep that out of every dish and prep surface."
3. **Show what's included** - Shopping, cooking, plating, serving, cleanup. One short paragraph. The client should immediately understand the full-service experience.
4. **Give your pricing** - Per-person rate from the chef's own rate card. No ranges, no "starting at," no hedging. A clear number. "For a 6-person dinner, my pricing starts at $85/person, which covers the full experience including groceries."
5. **Suggest menu direction** - Based on occasion, guest count, or season. "A 4-course meal is my sweet spot for groups your size." This starts the menu conversation.
6. **One simple question (max)** - Only if something genuinely unknown would change the approach. Usually: "What's the occasion?" No parenthetical examples. If the occasion is already known, skip this entirely.
7. **Next step** - Tell them what happens next. "I'll send over 2-3 menu options." Not "let me know" or "whenever you're ready." Action, not waiting.
8. **Sign-off** - Warm, short. First name. "Looking forward to it, Chef David"

---

## Anti-Patterns (things that FAIL)

### Never ask budget

The chef has their own pricing. They quote their own numbers. Asking budget makes the chef look like they don't know their own worth, and it creates inconsistent pricing. Budget only comes up if the CLIENT brings it up, usually because they're stressed about cost, several emails in.

### Never ask kitchen setup

If someone is reaching out about a dinner at their home, they have a kitchen. Asking "how's your kitchen setup?" is insulting and redundant. The only time to ask: something specific about the event makes the chef worried (extremely elaborate request, unusual venue like a boat or cabin). In 10 years of private chef work, this question has never been asked unprompted.

### Never re-ask provided information

If the client said "shellfish allergy," confirm it. Do not ask "Any other dietary needs?" The client gave you info. Acknowledge it. If there's more, they'll tell you.

### Never overload with questions

Every question adds friction and delays the process. The goal: client reads the email, sees the price, knows you heard them, and the menu conversation starts. If the client has to answer 3+ questions before anything productive happens, the response failed. A bad first response costs 2-3 extra email threads before anything useful happens.

### Never use parenthetical examples

"What's the occasion (birthday, anniversary, etc.)?" - they know what occasion means. Giving examples makes it feel like a generic template, not a personal response. Just ask: "What's the occasion?"

### Never create homework

The email should move the ball forward. Don't list things the client needs to do. Show them what YOU'RE doing and what comes next.

---

## What Changes Based on Available Data

### If occasion is known

Skip the occasion question entirely. Reference it warmly: "A birthday dinner for 6 sounds great."

### If dietary info is provided

Confirm it as a fact: "I have you noted for a shellfish allergy and vegetarian preference." Do not ask for more.

### If dietary info is NOT provided

Don't ask. The chef will handle it at menu proposal stage, or the client will mention it. Do not gatekeep with "do you have any allergies?"

### If date is vague

This is the one thing worth clarifying: "Are you looking at any particular date in March?"

### If guest count is a range

Accept it: "I'll plan for 6-8." Don't demand an exact number yet.

---

## Template Logic (for deterministic generation)

Inputs: `clientName`, `date`, `guestCount`, `dietaryRestrictions[]`, `occasion`, `chefServiceConfig`

```
PARAGRAPH 1: Acknowledgment
- "Hi {clientName},"
- "Thanks for reaching out!"
- If occasion known: "A {occasion} for {guestCount} on {date} sounds great."
- If occasion unknown: "A {guestCount}-person dinner on {date} sounds great."
- If dietary provided: "Noted on the {dietary} - I'll keep that out of every dish and prep surface."

PARAGRAPH 2: What's Included
- Pull from chef service config (what they offer)
- Default: "I handle everything: grocery shopping, cooking, plating, serving, and full cleanup. You don't lift a finger. I arrive about 2 hours before your preferred dinner time, and your kitchen will be cleaner than I found it when I leave."

PARAGRAPH 3: Pricing
- "For a {guestCount}-person dinner, my pricing starts at ${rate}/person, which covers the full experience including groceries."
- If chef has course suggestions: "A {courseCount}-course meal is my sweet spot for groups your size, but I can scale up or down."

PARAGRAPH 4: Next Step + Optional Question
- If occasion unknown: "What's the occasion? That helps me put together a menu that fits the vibe."
- Always: "Once I know that, I'll send over 2-3 menu options for you to pick from."
- If occasion known: "I'll send over 2-3 menu options that fit the vibe. We can go from there."

SIGN-OFF:
- "Looking forward to it,"
- "Chef {firstName}"
```

---

## The Test

After reading the first response, the client should know:

1. What the chef charges (per-person rate)
2. That the chef heard them (dietary, date, guest count confirmed)
3. What's included (full-service experience)
4. What happens next (menu options coming)

If the client can't answer all four from the email, it failed.
