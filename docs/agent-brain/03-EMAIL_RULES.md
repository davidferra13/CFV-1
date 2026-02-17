# Email Rules — Firewall, Gatekeeper & Output Authority

This document is the **highest authority** for all client-facing email output. If it conflicts with any other document, this one wins.

---

## Final Output Authority

Before any client-facing response is finalized, the system must:

1. Confirm the current lifecycle state (from `02-LIFECYCLE.md`)
2. Confirm data completeness (from `05-DISCOVERY.md`)
3. Apply all rules below

If lifecycle state or data sufficiency is unclear — **default to Discovery**. Safety always overrides speed.

---

## Hard Strip Rules (Absolute)

The following must **never** appear in any client-facing email. If found in upstream AI output, strip before presenting to the chef for review.

### Internal System Artifacts
- "SERVICE BLUEPRINT", section headers, workflow labels
- Schema names, template names, system names ("ChefFlow", "queue", "FSM")
- Packing lists, ingredient lists, equipment lists, execution timelines
- Pricing tables, itemized breakdowns, formulas

### AI / Meta Content
- "AI:", "Assistant:", "System:", "Note:"
- Any explanation of how the response was generated
- Any reference to rules, documents, or policies being applied

### Placeholders & Debug
- "I don't know", "TBD", "[Insert ___]"
- Any missing-data indicators

### Legal Content (unless at Booking stage)
- Terms of service, booking agreements, legal clauses
- Numbered contract sections

---

## Pre-Draft Gatekeeper

Before any email draft is generated, determine the stage:

### Stage 1 Detection (Discovery)
Treat as Stage 1 if ANY of these are true:
- First contact from the client
- Client is asking about availability, process, or "how this works"
- Client has not explicitly asked for pricing
- Client has not confirmed both exact date AND full address
- Client is not yet booked

Stage 1 is a human conversation. It is not a transaction.

### Stage 2 Detection (Pricing / Follow-up)
Treat as Stage 2 only if:
- Client has confirmed date AND full address, OR
- Client explicitly asks about pricing or cost

### Hard-Stop Blocklist (All Stages)

If any of these appear, the draft is **invalid** — discard and rewrite:

**Forbidden phrases:**
- "Thanks for your inquiry"
- "To move forward"
- "I've noted for my review"
- "Take the next step"
- "Please provide the following"
- "I just need a few more details"
- "Based on your request"

**Forbidden tone:**
- Administrative language
- Corporate or platform voice
- Checklist or form language
- CRM or system phrasing

**If the email sounds like software wrote it, it fails.**

---

## Stage-Specific Content Rules

### Discovery Stage — What's Allowed

- Acknowledge the inquiry naturally
- Normalize first-time clients (one sentence)
- Confirm availability or clarify which date/night
- Calmly acknowledge allergies or preferences
- Ask only for: the exact date (if unclear), the full address
- High-level explanation of how private dinners work (one sentence max)

### Discovery Stage — What's Forbidden

- **Any pricing** — numbers, ranges, per-person, totals, "starting at"
- Deposits, payment language, retainers
- Booking or confirmation language
- Availability guarantees
- Menu planning beyond high-level style acknowledgment
- Course counts or menu structures
- Urgency, scarcity, or deadline framing
- Asking for number of courses, budget, start time, or full address (on first touch)
- Bullets, numbered lists, headers, sections

Discovery emails must never imply that work has begun.

### Pricing Stage — What's Allowed

- Per-person pricing or package options
- Clear explanation of what pricing includes
- High-level grocery reimbursement model explanation
- Conditional language ("If you'd like to move forward...")
- Pricing in paragraph form — human, not tabular

### Pricing Stage — What's Forbidden

- Payment links or demands
- Statements implying the event is booked or date is secured
- Urgency or pressure to commit
- Deposits may be described but not demanded

### Booking Stage — What's Allowed

- Final pricing confirmation
- Deposit requirements and payment instructions
- Date confirmation language
- Clear next execution steps
- Payment link in the same email (never deferred)

### Booking Stage — What's Forbidden

- New pricing options or surprise fees
- Assumptions beyond confirmed facts
- Internal artifacts or system language

---

## Rewrite-From-Scratch Mandate

The client email must be **written from scratch** every time. Upstream AI outputs may be used only as silent reference to extract facts. The final email must NOT copy, paste, summarize, reformat, compress, or concatenate from internal outputs.

---

## Output Format (Non-Negotiable)

Every client email contains only:
1. Subject line
2. Email body (2–4 short paragraphs)
3. Sign-off ("Best," or similar + "David")

Forbidden: bullets (unless mirroring a client's list), lists, headers, sections, meta commentary.

**Exception:** Status confirmation summaries (see below) may use bullets after the main message body, but only when conversation has progressed beyond initial inquiry.

---

## Status Confirmation Summaries

Include a brief bullet summary when:
- A menu is being confirmed
- A course count is selected
- The conversation has progressed beyond initial inquiry
- The client is nearing booking

**Structure:**
```
Where we're at:
• Date: Saturday, March 15th
• Location: Scottsdale
• Guests: 4
• Menu: Chef-driven, 4 courses
• Allergies: Shellfish

Still to confirm:
• Full address
• Start time
```

Rules:
- Max 5–7 bullets total
- No paragraphs inside bullets
- Do not include on first-touch responses
- "Nothing outstanding." if everything is confirmed

---

## Failure Behavior

If any rule above is violated:
1. Discard the entire draft
2. Rewrite from scratch
3. Make it shorter
4. Remove information

Do not edit around violations. Start over.

---

## Chef Approval Gate

**No client-facing email is ever sent without the chef's explicit review and approval.** This is absolute and has no exceptions. The system drafts — the chef sends.
