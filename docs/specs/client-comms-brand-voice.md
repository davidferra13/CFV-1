# Client Communications Brand Voice

> **Status:** SPEC-READY
> **Priority:** P1
> **Origin:** "Picky Client" persona stress test (2026-05-16)
> **Depends On:** None

---

## Problem Statement

Every automated email, portal message, and notification ChefFlow sends to clients represents the chef's brand. If they sound robotic, corporate, or templated, the picky client is gone. "Dear Valued Customer" is a death sentence.

There is no brand voice guide for client-facing automated communications. Each email template was written independently. Tone varies. Some are warm, some are transactional. A wealthy client who's paying thousands expects every touchpoint to feel personal and premium.

---

## Solution

### 1. Brand Voice Principles (for all client-facing comms)

| Principle                  | Do                                                     | Don't                                          |
| -------------------------- | ------------------------------------------------------ | ---------------------------------------------- |
| **Warm, not corporate**    | "Everything's set for Saturday"                        | "Your event has been confirmed"                |
| **Confident, not hedging** | "Your chef will arrive at 3pm"                         | "Your chef should be arriving around 3pm"      |
| **Brief, not verbose**     | 3-4 sentences max per email section                    | Walls of text with legal disclaimers           |
| **Personal, not generic**  | Use chef's first name, event occasion, specific dishes | "Your upcoming event", "your service provider" |
| **Human, not automated**   | Reads like a text from a professional friend           | Reads like a SaaS notification                 |
| **Action-oriented**        | "View your menu" (one clear CTA)                       | 5 buttons competing for attention              |

### 2. Template Audit and Rewrite

Audit all existing client-facing email templates in `lib/email/templates/`:

- `inquiry-received.tsx` -- client confirmation
- `inquiry-declined.tsx` -- decline notification
- `post-event-referral-ask.tsx` -- referral request
- `post-event-circle-thanks.tsx` -- circle thank-you
- Plus all new templates from the orchestration specs

Each template gets rewritten to match brand voice principles. Chef's name, occasion, and specific details injected via template variables.

### 3. Chef Tone Customization

Chefs aren't all the same. A formal private chef serving corporate events writes differently than a casual chef doing backyard BBQs.

- Three tone presets: **Polished** (formal/premium), **Friendly** (warm/casual), **Minimal** (brief/professional)
- Chef selects their tone in settings
- All automated messages render through the selected tone
- Chef can preview any template in their chosen tone before it goes live
- Custom overrides: chef can edit any individual template's copy

### 4. The Thank-You Before the Ask

Current flow (from Social Proof Loop spec): review request at 48h post-event.

New flow:

- **24h post-event:** Personal thank-you email. No ask. No CTA. Just gratitude. "Thank you for trusting [Chef] with your [occasion]. It was a pleasure."
- **72h post-event:** Review request. Warm, not transactional. "If you have a moment, [Chef] would love to hear how everything went."
- **7 days post-event (if no review):** One gentle reminder. Then stop.

The thank-you builds goodwill. The review request converts it. Never reverse this order.

### Files Likely Touched

- `lib/email/brand-voice.ts` (new, tone presets, variable injection, voice rules)
- `lib/email/templates/*.tsx` (audit and rewrite all client-facing templates)
- `lib/email/templates/personal-thank-you.tsx` (new, 24h post-event)
- `app/(chef)/settings/communication/page.tsx` (add tone selector + template preview)
- `lib/lifecycle/trigger-engine.ts` (sequence: thank-you at 24h, review at 72h)
- `lib/reviews/request-actions.ts` (update timing from 48h to 72h, add thank-you gate)

---

## Verification

- [ ] All client-facing email templates pass brand voice audit (warm, brief, personal)
- [ ] Chef can select tone preset (Polished/Friendly/Minimal)
- [ ] Template preview shows selected tone applied
- [ ] Thank-you email fires at 24h post-event with NO ask
- [ ] Review request fires at 72h post-event (after thank-you, not before)
- [ ] One reminder at 7 days, then silence
- [ ] Chef's first name and event occasion appear in every client email
- [ ] No email contains "Dear Valued Customer", "your service provider", or "do not reply"
