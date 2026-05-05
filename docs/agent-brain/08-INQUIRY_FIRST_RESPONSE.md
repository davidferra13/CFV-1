# First Response Scenario Engine

> This document defines every possible inquiry scenario and the response skeleton for each.
> The AI selects the matching scenario, then generates a draft that follows the skeleton structure
> while sounding natural and matching the chef's voice.

---

## Scenario Classification

Every inquiry is classified by two axes:

### Axis 1: Client History Level

| Level          | Code             | Definition                                                   |
| -------------- | ---------------- | ------------------------------------------------------------ |
| Brand new      | `new`            | No record in system. Never worked together.                  |
| Referred       | `referred`       | Someone vouched for you. You haven't cooked for THIS person. |
| One-timer      | `one_time`       | Cooked together once, 3+ months ago.                         |
| Occasional     | `occasional`     | 2-5 events together over time.                               |
| Regular        | `regular`        | Monthly+ or 6+ total events. You know everything.            |
| Context switch | `context_switch` | Known client, but new venue/group/occasion type.             |

### Axis 2: Inquiry Source

| Source    | Code        | Definition                                         |
| --------- | ----------- | -------------------------------------------------- |
| Direct    | `direct`    | They texted/emailed/DMed you personally.           |
| Platform  | `platform`  | Booking site, Thumbtack, Google, etc. Competitive. |
| Referral  | `referral`  | "My friend [X] recommended you."                   |
| Rebook    | `rebook`    | Repeat client reaching out again. Not shopping.    |
| Middleman | `middleman` | Event planner, assistant, corporate booker.        |

### The 9 Canonical Scenarios

| #   | Name                      | History       | Source        | Code                |
| --- | ------------------------- | ------------- | ------------- | ------------------- |
| 1   | New Direct                | new           | direct        | `new_direct`        |
| 2   | New Platform              | new           | platform      | `new_platform`      |
| 3   | Fresh Referral            | new           | referral      | `fresh_referral`    |
| 4   | Friend-of-Client Referral | referred      | referral      | `friend_referral`   |
| 5   | One-Timer Rebooking       | one_time      | rebook        | `one_time_rebook`   |
| 6   | Occasional Same-Context   | occasional    | rebook        | `occasional_rebook` |
| 7   | Regular Client            | regular       | rebook        | `regular_rebook`    |
| 8   | Known Client New Context  | any returning | direct/rebook | `context_switch`    |
| 9   | Middleman/Corporate       | any           | middleman     | `middleman`         |

---

## Response Skeletons

Each skeleton defines the STRUCTURE. The AI fills in the voice.
Skeletons use `{variables}` that the system resolves from data.

---

### Scenario 1: New Direct (`new_direct`)

**What you know:** Nothing except their message.
**What you need:** Everything.
**Tone:** Warm, professional, educate gently without lecturing.

**Skeleton:**

```
[Acknowledge their message / confirm availability or interest]
[Brief: what you handle - cooking, plating, service, cleanup, equipment, plateware]
[Brief: what they handle - table setting, silverware, beverages]
[How it works: custom menu based on their group, quote before commitment]
[Ask the 4 universals: count, dietary, food direction, occasion]
[Next step: once you know that, you'll put together menu ideas]
[Sign-off]
```

**Key rules:**

- Don't list your services like a brochure. Weave it into a sentence.
- Don't ask for address yet.
- Don't mention price numbers yet (just that it's per-person and depends on menu).
- DO confirm you're available/interested before anything else.

---

### Scenario 2: New Platform (`new_platform`)

**What you know:** Whatever the platform form collected (often date, count, some preferences).
**What you need:** Fill gaps from platform data + are they serious or shopping?
**Tone:** Responsive, slightly more polished (they may be comparing you to others).

**Skeleton:**

```
[Acknowledge: reference their platform message / what they submitted]
[Confirm availability for their date]
[Brief: what's included (same as Scenario 1 but shorter - they're reading multiple chefs)]
[Ask ONLY what the platform didn't already capture from the 4 universals]
[Differentiate: one line about what makes you different (custom menus, personal service)]
[Next step: menu ideas once you know the group]
[Sign-off]
```

**Key rules:**

- Speed matters. Platform leads go cold fast.
- Don't repeat info they already submitted (check inquiry data).
- One subtle differentiator is OK. Don't hard-sell.
- Shorter than Scenario 1 (they're reading 5 chefs).

---

### Scenario 3: Fresh Referral (`fresh_referral`)

**What you know:** Who sent them, maybe a vague description of what they want.
**What you need:** Everything about THIS person and THIS dinner.
**Tone:** Grateful for the connection, warm, personal.

**Skeleton:**

```
[Acknowledge the referral: "Glad [referrer] connected us" or similar]
[If referrer shared context, acknowledge it: "They mentioned you're looking for X"]
[Brief: what you handle (same as Scenario 1)]
[Ask the 4 universals]
[Next step]
[Sign-off]
```

**Key rules:**

- ALWAYS acknowledge who referred them (builds trust chain).
- Don't assume they want what the referrer had.
- Still need all the same info as a new client.
- Slightly warmer tone (they're pre-sold, not shopping).

---

### Scenario 4: Friend-of-Client Referral (`friend_referral`)

**What you know:** You cooked for their friend. You know your OWN history with the referrer.
**What you need:** Everything about THIS person (different household, different dietary, different kitchen).
**Tone:** Same as Scenario 3, but can reference shared context.

**Skeleton:**

```
[Acknowledge: "Love cooking for [referrer's name/group]. Glad they sent you my way."]
[If referrer shared context: "They mentioned [X] - sounds great."]
[Ask the 4 universals]
[Note: their kitchen/group is different, so still need the basics]
[Next step]
[Sign-off]
```

**Key rules:**

- Can be slightly more casual (social proof already established).
- Never say "I'll make the same thing I made for your friend" unless they ask.
- Still need ALL discovery info for this new person/group.

---

### Scenario 5: One-Timer Rebooking (`one_time_rebook`)

**What you know:** Their kitchen, their last menu, how the event went, how they paid.
**What you need:** What changed? Same group? Same vibe? Or totally different?
**Tone:** Familiar but not presumptuous. Warm recognition.

**Skeleton:**

```
[Acknowledge: glad to hear from them again / confirm date]
[Reference last time naturally: "Had a great time cooking for you last [month/season]"]
[Key question: "Same kind of thing or want to switch it up?"]
[Ask what changed: guest count, dietary updates, cuisine direction]
[Skip: what you bring, how pricing works (they know)]
[Next step: menu ideas once you know the vibe]
[Sign-off]
```

**Key rules:**

- SKIP the "what I handle" explanation entirely.
- DO reference last event (shows you remember, builds relationship).
- The main question is: same or different?
- If same location, don't ask for address again.

---

### Scenario 6: Occasional Same-Context (`occasional_rebook`)

**What you know:** A lot. Preferences, dietary, location, what works for them.
**What you need:** Just the essentials for THIS booking. Mostly confirmation.
**Tone:** Easy, casual, almost shorthand.

**Skeleton:**

```
[Confirm date / express enthusiasm briefly]
[One question: "Same setup or anything different this time?"]
[If needed: "How many?" / "Any new dietary stuff?"]
[Next step: I'll get a menu together]
[Sign-off]
```

**Key rules:**

- VERY short. These people don't need hand-holding.
- One compound question covers it: "Same setup or different?"
- Trust that they'll tell you if something changed.
- No process explanation, no logistics overview.

---

### Scenario 7: Regular Client (`regular_rebook`)

**What you know:** Everything. Kitchen, preferences, dietary, how they like it served.
**What you need:** Basically just date + count + "anything different?"
**Tone:** Transactional warmth. Like confirming plans with a friend.

**Skeleton:**

```
[Confirm date]
[Maybe: "How many this time?" if count varies]
[Maybe: "Want me to do something new or go with the hits?"]
[Sign-off]
```

**Key rules:**

- Shortest possible message. 2-4 sentences.
- Don't ask what you already know.
- Can suggest based on history: "Want to do that lamb thing again or something new?"
- Almost zero process. Just logistics.

---

### Scenario 8: Known Client, New Context (`context_switch`)

**What you know:** The person, their preferences, your history. NOT this venue/group/occasion.
**What you need:** Everything about the NEW context - new location, new group's dietary, new occasion.
**Tone:** Familiar with them, but curious about the new situation.

**Skeleton:**

```
[Acknowledge: familiar tone, glad to cook for them again]
[Acknowledge the new context: "Different crowd this time?" or "New spot?"]
[Ask context-specific questions:
  - New location? (need address/kitchen info)
  - New group? (need dietary for THESE guests, not their usual)
  - Different occasion? (affects menu direction)
  - Different scale? (affects logistics)]
[Skip: what you bring, how pricing works, your process]
[Next step]
[Sign-off]
```

**Key rules:**

- Treat the NEW context as new discovery, but maintain familiar tone.
- They know you and trust you. Don't re-sell.
- The key shift: "I know YOU, but I don't know THIS situation yet."
- If cooking at a new venue: need kitchen info, parking, equipment assessment.

---

### Scenario 9: Middleman/Corporate (`middleman`)

**What you know:** Varies. Often get a brief or RFP-style description.
**What you need:** Confirm the brief, fill gaps, establish decision-maker chain.
**Tone:** Professional, structured, efficient. These are business people booking a service.

**Skeleton:**

```
[Acknowledge: confirm receipt of their brief/request]
[Confirm availability for date]
[Confirm understanding of scope: "So I'm clear: [X] guests, [date], [type of event]"]
[Ask gaps: what's missing from their brief]
[Critical: "Who makes the food decisions? (dietary, menu approval)"]
[Critical: "Who's the onsite contact day-of?"]
[Next step: proposal/quote with menu options]
[Sign-off: slightly more formal]
```

**Key rules:**

- More structured than personal clients. They expect it.
- Always confirm scope in writing (protects both parties).
- Identify the decision-maker early (planner may not have menu authority).
- Onsite contact is critical (who do you call when you arrive?).
- Can quote in first response if scope is clear enough.

---

## Scenario Detection Logic

The system classifies using:

1. **Client history:** Query event count + journey stage from `client-lifetime-journey.ts`
2. **Inquiry source:** `inquiry.channel` + `inquiry.referral_source`
3. **Message analysis:** Does the message reference a past event? A mutual contact? A platform listing?

### Decision Tree

```
IF client_id is null OR event_count == 0:
  IF referral_source is set OR message mentions a name/referral:
    IF referrer is a known client: -> friend_referral
    ELSE: -> fresh_referral
  ELIF channel is platform (thumbtack, cozymeal, bark, etc.): -> new_platform
  ELIF channel is middleman-like (event_planner, corporate): -> middleman
  ELSE: -> new_direct

ELIF event_count == 1: -> one_time_rebook

ELIF event_count >= 2 AND event_count <= 5:
  IF new_venue OR new_group_signal: -> context_switch
  ELSE: -> occasional_rebook

ELIF event_count > 5 OR journey_stage in (loyal, champion):
  IF new_venue OR new_group_signal: -> context_switch
  ELSE: -> regular_rebook
```

### Context Switch Detection

A "new context" signal exists when:

- Message mentions a different location than client's usual
- Message mentions "work event," "my mom's birthday," "a different group"
- Guest count is significantly different from their typical (e.g., usually 4, now 20)
- Occasion type is different from their history

---

## What the AI Gets

For each draft generation, the AI receives:

1. **Scenario code** (e.g., `occasional_rebook`)
2. **Skeleton structure** (the template above)
3. **Known data** (what's already in the system - last menu, dietary, location)
4. **Missing data** (what still needs asking)
5. **Client history summary** (last event date, what was served, how it went)
6. **Channel** (determines tone/length from brand voice rules)

The AI's job: fill the skeleton with natural language that matches the chef's voice, using known data to personalize and asking only for missing data.
