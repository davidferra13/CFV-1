# Build: Terms of Service (v2.0)

**Date:** March 21, 2026
**Branch:** feature/scheduling-improvements

---

## What Changed

Expanded ChefFlow's Terms of Service from a 16-section skeleton to a comprehensive 22-section legal document covering all material aspects of the platform, informed by analysis of 20+ major platforms and 7+ private chef platforms.

---

## Why It Changed

ChefFlow is a live production platform handling real money, real client PII, and real food safety situations. The original ToS (v1.0, 16 sections) was a minimal skeleton that lacked:

- **Chef-specific and client-specific terms** (each role has distinct obligations)
- **Accurate payment terms** (the original incorrectly said no platform fee beyond subscription; ChefFlow does take a Platform Fee via Stripe Connect)
- **Liability cap at 12 months** (was 3 months — industry standard is 12)
- **Food safety and allergen liability** (critical omission for a food platform)
- **AI features disclosure** (EU AI Act and emerging US requirements)
- **GDPR / CCPA / PIPEDA** compliance sections
- **Third-party services table** (Stripe, Supabase, Google, Ollama, etc.)
- **Dispute resolution tiers** (chargeback handling, service disputes, platform disputes)
- **Gift card terms** (Stripe Checkout gift card flow exists; had no ToS coverage)
- **Loyalty program terms** (`client_loyalty_points` table exists; had no ToS coverage)
- **Independent contractor language** (critical for tax and labor law compliance)
- **Force majeure, assignment, severability** (standard legal boilerplate)

---

## Research Basis

This ToS was compiled from analysis of:

**Major platforms:** Airbnb, Stripe, Upwork, TaskRabbit, Fiverr, Etsy, Thumbtack, PayPal, Amazon, Google, DoorDash, OpenTable, Shopify, Square

**Private chef platforms:** CHEFIN, ChefMaison, Take a Chef, Table at Home, BookMyChef, INTUEAT, Gathar, Yhangry

**Key patterns adopted:**

- **Airbnb:** 12-month liability cap model (fairest for marketplace-adjacent platform)
- **Stripe:** Payment agent appointment, platform fee waterfall disclosure
- **TaskRabbit:** Independent contractor language, no-employment disclaimer
- **Fiverr:** Client data confidentiality requirements for chefs
- **CHEFIN:** Chef obligations clause structure
- **Etsy:** Class action waiver, arbitration flow

---

## Files Created / Modified

| File                                  | Action       | Description                                                                                      |
| ------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------ |
| `app/(public)/terms/page.tsx`         | **Modified** | Expanded from 16 → 22 sections with comprehensive content, styled consistently with privacy page |
| `docs/terms-of-service-draft.md`      | **Created**  | Full legal draft with attorney review annotations — source of truth before attorney review       |
| `components/legal/tos-acceptance.tsx` | **Created**  | Reusable checkbox component for ToS acceptance at signup / client portal first login             |

---

## Architecture Notes

**Why two files (page.tsx + draft.md)?**

- `page.tsx` is the live rendered page — clean, user-facing
- `docs/terms-of-service-draft.md` is the attorney-review copy with `[ATTORNEY REVIEW]` annotations, rationale, and full legal language notes. It lets legal counsel review without touching the codebase.

**Why does `/terms` need no middleware changes?**

- `middleware.ts` already lists `/terms` in `skipAuthPaths` — it was correctly set up.
- No routing changes needed.

**TosAcceptance component usage:**

```tsx
import { TosAcceptance } from '@/components/legal/tos-acceptance'

// In a signup form:
const [tosAccepted, setTosAccepted] = useState(false)

<TosAcceptance
  accepted={tosAccepted}
  onAcceptedChange={setTosAccepted}
/>

<Button disabled={!tosAccepted} onClick={handleSubmit}>
  Create Account
</Button>
```

---

## What the ToS Covers (22 Sections)

| §   | Section                  | Key Purpose                                                          |
| --- | ------------------------ | -------------------------------------------------------------------- |
| 1   | Acceptance               | How agreement is formed                                              |
| 2   | Definitions              | Chef, Client, Event, Quote, Platform Fee, etc.                       |
| 3   | Eligibility              | 18+, one account, global                                             |
| 4   | Platform Description     | What ChefFlow IS and IS NOT (liability anchor)                       |
| 5   | Chef-Specific Terms      | Independent contractor, obligations, Stripe, IP, prohibited conduct  |
| 6   | Client-Specific Terms    | Relationship, obligations, payments, chargebacks, prohibited conduct |
| 7   | Payments, Fees & Refunds | Payment waterfall, Platform Fee, gift cards, refunds                 |
| 8   | Cancellation Policy      | Chef-set policies, force majeure                                     |
| 9   | Dispute Resolution       | Chargebacks, service disputes, platform disputes, arbitration        |
| 10  | Intellectual Property    | ChefFlow IP, Chef content, Client content, feedback                  |
| 11  | Warranty Disclaimer      | AS-IS, all caps (legally required)                                   |
| 12  | Limitation of Liability  | 12-month cap, excluded damages, carve-outs                           |
| 13  | Indemnification          | Chef indemnifies for food safety; Client for false claims            |
| 14  | Account Termination      | Immediate vs. cure period, appeal, data retention                    |
| 15  | Privacy & Data           | GDPR, CCPA, PIPEDA, AI data handling                                 |
| 16  | Third-Party Services     | Stripe, Supabase, Vercel, Google, Ollama, etc.                       |
| 17  | AI Features              | Local-only private AI, no autonomous decisions, opt-out              |
| 18  | Acceptable Use           | Role-differentiated prohibited conduct                               |
| 19  | Loyalty Program          | Points, no cash value, expiry                                        |
| 20  | Changes to Terms         | 30 days notice for material changes                                  |
| 21  | General Provisions       | Entire agreement, severability, force majeure, assignment            |
| 22  | Contact                  | support, legal, privacy, security                                    |

---

## Critical Corrections from v1.0

| Issue                           | v1.0                                                             | v2.0                                                           |
| ------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| Platform Fee disclosure         | "no additional transaction fees beyond subscription" (incorrect) | Platform Fee disclosed; current rate in account settings       |
| Liability cap                   | 3 months                                                         | 12 months (Airbnb standard)                                    |
| Notice for changes              | 15 days                                                          | 30 days for material changes                                   |
| AI features                     | Not mentioned                                                    | Full §17 disclosure                                            |
| GDPR/CCPA/PIPEDA                | Not mentioned                                                    | Full §15 coverage                                              |
| Chef/Client role-specific terms | Generic single user type                                         | §5 (Chef) + §6 (Client)                                        |
| Food safety liability           | Not mentioned                                                    | §5.2, §13 (Chef indemnification)                               |
| Gift cards                      | Not mentioned                                                    | §7.4                                                           |
| Loyalty points                  | Not mentioned                                                    | §19                                                            |
| Third-party services            | Only Stripe mentioned                                            | §16 table of all 9 integrations                                |
| Dispute tiers                   | Generic "terminate for violations"                               | Three-tier: chargebacks / service disputes / platform disputes |

---

## What Still Needs Attorney Review

Before publishing as the binding legal document:

1. **Legal entity name** — ToS must name the actual registered legal entity
2. **State of incorporation** — governs arbitration venue and law
3. **Platform Fee percentage** — must be a specific disclosed number, not "disclosed in settings" (some jurisdictions require it in the ToS itself)
4. **JAMS vs. AAA arbitration** — confirm preferred arbitration body and rules
5. **Liability cap adequacy** — 12-month cap is industry standard, but attorney should confirm for the operating jurisdiction
6. **Insurance requirement** — recommend vs. require liability insurance; the distinction has significant legal implications
7. **GDPR DPA** — if serving EU users at scale, a formal Data Processing Agreement is required
8. **CCPA/CPRA compliance** — confirm California language meets current CPRA (2023) requirements

---

## How to Connect TosAcceptance to Signup

The component is ready to drop into any signup form. Current forms that should add it:

- `app/auth/signin/page.tsx` — add to the signup tab
- `app/auth/role-selection/page.tsx` — add before role confirmation
- Client portal first-login flow — add to the invitation acceptance page

These wiring changes are a follow-up task, not included in this build.
