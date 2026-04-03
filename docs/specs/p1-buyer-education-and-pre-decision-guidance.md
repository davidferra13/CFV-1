# Spec: Buyer Education And Pre-Decision Guidance

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** `featured-chef-public-proof-and-booking.md` (verified), `smart-input-autocomplete.md` (verified), `p1-search-intent-landing-architecture.md` (ready)
> **Estimated complexity:** medium (7-9 files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event         | Date             | Agent/Session | Commit |
| ------------- | ---------------- | ------------- | ------ |
| Created       | 2026-04-03 16:05 | Codex         |        |
| Status: ready | 2026-04-03 16:05 | Codex         |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A builder reading a spec without this section is building blind._

### Raw Signal

- We need to synthesize all research into a cross-reference document so we can effectively leverage our findings alongside the existing specification documents.
- Is there anything else we can synthesize to improve our system?
- Proceed with the most intelligent decisions on my behalf, in the correct order.
- Before taking action, fully understand the current system, constraints, and context.
- Plan briefly, then execute in a dependency-aware sequence, ensuring all prerequisites exist before advancing.
- Bring everything to a clear, structured, and complete state so the builder agent has full context and can execute cleanly, in order.

### Developer Intent

- **Core goal:** convert buyer-facing educational research into a narrow implementation slice so the public website helps uncertain visitors understand the category and booking path before they are ready to submit an inquiry.
- **Key constraints:** do not rewrite the operator-facing FAQ, comparison library, or navigation system into something else; do not turn ChefFlow into a generic content farm or blog; keep the work grounded in current public product truth.
- **Motivation:** current FAQ and comparison surfaces are still mostly written for operators, while the research says buyers need category education, process explanation, and pre-decision guidance to convert without marketplace hand-holding.
- **Success from the developer's perspective:** a builder can add a buyer-facing education layer, route it cleanly into `/book` and `/chefs`, and clarify audience handoffs from existing FAQ/compare/trust surfaces without guessing route shape, content model, or where this slice stops.

---

## What This Does (Plain English)

This spec adds a public buyer-education layer under a new `how-it-works` route family. It gives ChefFlow a small set of decision-stage guides that explain how private-chef booking works, what pricing usually covers, how service formats differ, and what happens after inquiry. It also adds light handoffs from homepage, `/book`, `/faq`, `/compare`, and `/trust` so buyers can learn without being pushed into operator-oriented pages or generic signup flows.

---

## Why It Matters

The current public FAQ and compare hub are still framed primarily around private-chef operators and software evaluation (`app/(public)/faq/page.tsx:43`, `app/(public)/faq/page.tsx:49`, `app/(public)/faq/page.tsx:89`, `app/(public)/compare/page.tsx:11`, `app/(public)/compare/page.tsx:13`, `app/(public)/compare/page.tsx:60`). The trust page is credible, but it is also written more as platform-operating baseline than buyer decision education (`app/(public)/trust/page.tsx:49`, `app/(public)/trust/page.tsx:55`, `app/(public)/trust/page.tsx:159`).

The research is explicit that ChefFlow's next website gap is buyer education, not more operator content. The competitive memo recommends client-facing pages explaining how private-chef booking works, what is included, how private dinner differs from catering or meal prep, what pricing usually covers, and what happens after inquiry (`docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:685`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:728`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:729`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:730`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:731`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:734`).

This spec intentionally stays narrower than the later operational-reassurance and navigation/CTA continuity lanes. It creates the buyer-education surface first, without turning a content architecture fix into a full public-site rewrite.

---

## Files to Create

| File                                                          | Purpose                                                                                |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `app/(public)/how-it-works/page.tsx`                          | Buyer-education hub for pre-decision guidance and guide discovery                      |
| `app/(public)/how-it-works/[slug]/page.tsx`                   | Static buyer-guide route that renders curated educational pages from a typed allowlist |
| `app/(public)/how-it-works/_components/buyer-guide-shell.tsx` | Shared shell for hub and guide pages so the content system stays consistent            |
| `lib/marketing/buyer-education-guides.ts`                     | Typed guide definitions, metadata, CTA rules, related-guide links, and allowlist order |

---

## Files to Modify

| File                                                                                      | What to Change                                                                                                                                                 |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(public)/page.tsx`                                                                   | Add one buyer-education handoff block or guide-link cluster near the existing "How it works" area without rewriting the homepage architecture                  |
| `app/(public)/book/page.tsx`                                                              | Add a small pre-decision guide handoff so buyers can answer "how this works" and "what pricing includes" questions without abandoning the booking path         |
| `app/(public)/faq/page.tsx`                                                               | Keep the page operator-facing but add a clear audience split and send buyers to the new guide hub instead of forcing buyer questions into operator FAQ content |
| `app/(public)/compare/page.tsx`                                                           | Keep the compare hub operator-facing but add an explicit buyer redirect into the education hub                                                                 |
| `app/(public)/trust/page.tsx`                                                             | Add a light handoff from platform-trust language into the buyer-facing process guides for operational questions                                                |
| `app/sitemap.ts`                                                                          | Include the new hub plus enabled buyer guides in the sitemap                                                                                                   |
| `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md` | Mark buyer education as spec-backed and update builder sequencing                                                                                              |

---

## Database Changes

None.

---

## Data Model

This spec adds no schema. It introduces a typed guide-definition model in code.

Use a shape such as:

```ts
type BuyerEducationGuide = {
  slug:
    | 'private-chef-booking'
    | 'pricing-and-what-is-included'
    | 'private-dinner-vs-catering-vs-meal-prep'
    | 'what-happens-after-you-inquire'
  title: string
  description: string
  heroEyebrow: string
  heroTitle: string
  heroSubtitle: string
  intro: string
  sections: Array<{
    title: string
    body: string[]
  }>
  faq: Array<{
    question: string
    answer: string
  }>
  primaryCtaLabel: string
  primaryCtaHref: string
  secondaryCtaLabel?: string
  secondaryCtaHref?: string
  relatedGuideSlugs: string[]
  enabled: boolean
}
```

Key rules:

1. **Curated allowlist only.** Do not build a CMS or generic article system in this slice.
2. **Buyer audience only.** These guides explain the category and process to clients. They are not operator-acquisition pages and not software comparison pages.
3. **Current-product truth only.** If a guide discusses timing, pricing, payment, cancellation, contact sharing, or follow-up, it must stay within what the current website and product can honestly support.
4. **Action path required.** Every guide must route the visitor to `/book`, `/chefs`, or another buyer guide. Never end a buyer guide with a generic operator-signup CTA as the only next step.
5. **Unique content is mandatory.** Each guide needs unique metadata, hero copy, body sections, FAQ, and related links. No shallow duplicated shells.

---

## Server Actions

No new write actions.

Use server-side read helpers only, for example:

| Helper                              | Auth | Input              | Output                  | Side Effects |
| ----------------------------------- | ---- | ------------------ | ----------------------- | ------------ | ---- |
| `getBuyerEducationGuide(slug)`      | none | `{ slug: string }` | `BuyerEducationGuide    | null`        | None |
| `listEnabledBuyerEducationGuides()` | none | none               | `BuyerEducationGuide[]` | None         |

Implementation rule:

- The guides should be backed by a typed allowlist in `lib/marketing/buyer-education-guides.ts`, not database content or free-form MDX in this slice.

---

## UI / Component Spec

### Hub Page Layout

The hub page should answer one top-level question:

`How does private-chef booking with ChefFlow work, and what should I expect before I inquire?`

Use this structure:

1. **Hero**
   - buyer-facing title and subtitle
   - short reassurance that browsing and learning do not commit the visitor
   - primary CTA to `/book`
   - secondary CTA to `/chefs`

2. **Guide grid**
   - one card per enabled guide
   - each card explains the user question it answers
   - card CTA goes to the guide page, not directly to operator signup

3. **When to book vs when to keep learning**
   - short decision support block
   - helps a buyer know whether to browse chefs, submit an inquiry, or read another guide

4. **Related trust/support handoff**
   - lightweight links to `/trust` and `/contact`
   - keep this small so the hub does not become the reassurance architecture spec early

### Guide Page Layout

Use one shared `BuyerGuideShell` with:

1. **Hero**
   - page-specific title, subtitle, and eyebrow
   - primary CTA to `/book`
   - secondary CTA to `/chefs` or a closely related guide

2. **Decision section stack**
   - 3-5 concise sections
   - must answer the page's specific question instead of generic filler

3. **Reality check or fit block**
   - simple "this is usually a fit when..." guidance
   - helps prevent category confusion without requiring another inquiry step

4. **FAQ**
   - buyer-facing and page-specific
   - should not duplicate the operator FAQ verbatim

5. **Related guide links**
   - keep visitors inside the buyer-education lattice or send them into `/book` or `/chefs`

### Initial Guide Set

Ship these four guides in the first pass:

1. `private-chef-booking`
2. `pricing-and-what-is-included`
3. `private-dinner-vs-catering-vs-meal-prep`
4. `what-happens-after-you-inquire`

These match the strongest research-backed buyer questions and are enough to validate the route family without turning it into a large content program.

### States

- **Loading:** standard server-rendered page load
- **Missing or disabled guide:** `notFound()`
- **Hub with no enabled guides:** do not ship this state; the allowlist must guarantee at least the four first-pass guides before rollout
- **Populated:** unique guide copy, CTA path, FAQ, and related links all render without unsupported claims

### Interactions

- Buyer-guide primary CTA goes to `/book`
- Buyer-guide secondary CTA goes to `/chefs` or a related guide
- Homepage, `/book`, `/faq`, `/compare`, and `/trust` should only add lightweight text or card handoffs into the guide system
- Operator-focused routes must label the audience split clearly rather than silently mixing buyer and operator education

---

## Edge Cases and Error Handling

| Scenario                                                                                     | Correct Behavior                                                                    |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Builder turns the guide system into a generic article CMS                                    | Stop. This slice is a small typed allowlist, not a blog platform                    |
| Guide copy starts promising cancellation/refund/replacement behavior not already established | Remove or rewrite the claim; that belongs to the later operational-reassurance spec |
| FAQ page gets rewritten into a mixed audience catch-all                                      | Keep the operator FAQ intact and add a buyer redirect instead                       |
| Compare hub starts pretending to be buyer booking education                                  | Keep compare operator-facing and explicitly route buyers elsewhere                  |
| Hub or guides end with only a generic signup CTA                                             | Replace with `/book`, `/chefs`, or a guide-to-guide handoff                         |
| Builder adds header/footer-wide navigation changes                                           | Leave that for the navigation and CTA continuity spec                               |
| Guide content duplicates trust center or terms language line-for-line                        | Summarize in buyer language and link outward instead of cloning policy text         |

---

## Verification Steps

1. Create the `how-it-works` hub plus the four first-pass guides.
2. Confirm each guide has:
   - unique metadata
   - unique hero copy
   - guide-specific body sections
   - FAQ
   - buyer CTA to `/book`
3. Confirm `/faq` clearly states it is for operator/product questions and routes buyers into the guide hub.
4. Confirm `/compare` clearly states it is for operators comparing tools and routes buyers into the guide hub.
5. Confirm `/book` includes at least one lightweight guide handoff without weakening the existing booking CTA.
6. Confirm homepage links into the guide hub from the existing public education area instead of adding a brand-new top-level system.
7. Confirm `app/sitemap.ts` includes the hub and enabled guide pages only.
8. Confirm missing or disabled guide slugs return `notFound()`.
9. Confirm no header/footer-wide navigation rewrite happened as part of this slice.

---

## Out of Scope

- Full navigation and CTA continuity redesign
- Operational reassurance and buyer-protection architecture
- Site-wide proof freshness expansion
- Broad `/eat` or larger consumer-first discovery expansion
- Rewriting public chef profiles or inquiry pages beyond lightweight guide handoffs
- Building a CMS, blog, MDX pipeline, or free-form article system
- Changing booking write paths or inquiry submission behavior

---

## Notes for Builder Agent

- Treat this as the buyer-facing counterpart to the operator-oriented FAQ and compare library, not a replacement for them.
- The goal is to let an unsure buyer learn quickly and then move into `/book` or `/chefs` with more confidence.
- Keep the guide set intentionally small. Four good guides are enough for the first pass.
- If a content claim requires broader buyer-protection or change-management detail, stop at a short summary and wait for the operational-reassurance spec rather than guessing.
- Do not let this slice drift into a general header/footer rewrite or a big marketing-content expansion.

---

## Spec Validation

### 1. What exists today that this touches?

- Homepage already has a consumer booking path and a public "How it works" content area, so this spec should extend that existing education surface instead of inventing a separate marketing product (`app/(public)/page.tsx:367`, `app/(public)/page.tsx:399`, `app/(public)/page.tsx:504`).
- `/book` already frames the path as direct, free to submit, and no obligation (`app/(public)/book/page.tsx:7`, `app/(public)/book/page.tsx:9`, `app/(public)/book/page.tsx:33`, `app/(public)/book/page.tsx:75`).
- `/faq` is currently operator-facing in both metadata and hero copy (`app/(public)/faq/page.tsx:43`, `app/(public)/faq/page.tsx:49`, `app/(public)/faq/page.tsx:89`).
- `/compare` is currently operator-facing in both metadata and hero copy (`app/(public)/compare/page.tsx:11`, `app/(public)/compare/page.tsx:13`, `app/(public)/compare/page.tsx:57`, `app/(public)/compare/page.tsx:60`).
- `/trust` already provides platform trust and support contact, but not a buyer-education layer (`app/(public)/trust/page.tsx:49`, `app/(public)/trust/page.tsx:55`, `app/(public)/trust/page.tsx:147`, `app/(public)/trust/page.tsx:150`, `app/(public)/trust/page.tsx:159`).
- The sitemap currently indexes `/compare`, `/faq`, `/trust`, `/contact`, `/for-operators`, and `/book`, but not any buyer-education route family (`app/sitemap.ts:10`, `app/sitemap.ts:24`, `app/sitemap.ts:30`, `app/sitemap.ts:36`, `app/sitemap.ts:42`, `app/sitemap.ts:48`, `app/sitemap.ts:54`, `app/sitemap.ts:128`).

### 2. What exactly changes?

- Add a buyer-facing `how-it-works` hub and four first-pass guide pages backed by a typed allowlist.
- Add light buyer-guide handoffs from homepage, `/book`, `/faq`, `/compare`, and `/trust`.
- Add sitemap support for the guide hub and enabled guide pages.
- Update the website cross-reference so buyer education is no longer treated as research-only.

### 3. What assumptions are you making?

- **Verified:** buyer education is explicitly called out in the competitive memo as a next website opportunity, including specific recommended guide topics (`docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:685`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:728`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:729`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:730`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:731`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:734`).
- **Verified:** current public FAQ and compare surfaces are not the right place to answer those buyer questions because they are operator-focused (`app/(public)/faq/page.tsx:49`, `app/(public)/faq/page.tsx:89`, `app/(public)/compare/page.tsx:13`, `app/(public)/compare/page.tsx:60`).
- **Verified:** current public booking surfaces already provide truthful direct-booking language, so guides should route into those surfaces instead of inventing new CTA targets (`app/(public)/book/page.tsx:9`, `app/(public)/book/page.tsx:33`, `app/(public)/book/page.tsx:75`).
- **Unverified but fenced:** the exact future reassurance language around cancellation, payment timing, and replacements still needs its own narrower spec, so this spec deliberately stays above that detail line.

### 4. Where will this most likely break?

1. A builder may over-scope into a generic content hub or blog.
2. A builder may mix buyer education with operator acquisition again instead of making the audience split explicit.
3. A builder may start promising more operational protection than the current product truth supports.
4. A builder may widen the slice into a navigation overhaul because the new guides are public pages.

### 5. What is underspecified?

- The exact body copy for each guide is intentionally flexible, but the guide set, route family, CTA rules, and audience constraints above remove the risky ambiguity.
- The precise visual treatment of the guide cards can follow existing public design language; no novel design system work is required here.

### 6. What dependencies or prerequisites exist?

- Reuse the current homepage, `/book`, `/faq`, `/compare`, and `/trust` surfaces instead of inventing new top-level systems.
- Preserve the direct-booking and public-proof baseline from the verified website specs.
- Treat `p1-search-intent-landing-architecture.md` as the earlier acquisition-architecture slice; this guide system complements it rather than replacing it.

### 7. What existing logic could this conflict with?

- Existing operator framing on `/faq` and `/compare`, if a builder tries to erase it rather than redirect buyers cleanly.
- Any future navigation and CTA continuity work, if a builder rewrites header/footer structure prematurely.
- Later operational-reassurance work, if a builder over-answers payment/cancellation/change-management questions now.

### 8. What is the end-to-end data flow?

1. Buyer lands on homepage, `/book`, `/faq`, `/compare`, `/trust`, or a direct `how-it-works` URL.
2. The hub or guide definition resolves from the typed allowlist.
3. The visitor reads buyer-facing category/process guidance.
4. The visitor then moves to `/book`, `/chefs`, `/trust`, `/contact`, or another related guide.

### 9. What is the correct implementation order?

1. Create the typed guide-definition file.
2. Build the shared buyer-guide shell.
3. Create the `how-it-works` hub.
4. Create the dynamic guide route and first-pass guides.
5. Add lightweight handoffs from homepage, `/book`, `/faq`, `/compare`, and `/trust`.
6. Add sitemap support.
7. Update the website cross-reference.

### 10. What are the exact success criteria?

- `how-it-works` exists as a buyer-facing hub.
- The four first-pass guides exist and are unique.
- `/faq` and `/compare` keep their operator purpose but visibly redirect buyers into the guide system.
- `/book` and homepage now offer buyer education without weakening the main booking path.
- The sitemap includes the hub and enabled guides.
- The website cross-reference now treats buyer education as spec-backed.

### 11. What are the non-negotiable constraints?

- No CMS or generic content-farm expansion.
- No unsupported buyer-protection claims.
- No header/footer-wide navigation rewrite.
- No replacement of the current `/book` or `/chefs` flows.
- No operator-signup CTA as the primary destination from buyer guides.

### 12. What should NOT be touched?

- Booking write paths and inquiry submission logic.
- The broader navigation and CTA continuity lane beyond minimal local handoffs.
- The later operational-reassurance lane beyond brief buyer-language summaries.
- The larger consumer-first discovery expansion.

### 13. Is this the simplest complete version?

Yes. It converts a real research-backed website gap into a narrow, builder-ready slice without reopening broader public-site architecture or product-trust work.

### 14. If implemented exactly as written, what would still be wrong?

- Operational reassurance and buyer-protection architecture would still remain a separate follow-up spec.
- Public navigation and CTA continuity would still remain a separate follow-up spec.
- Site-level proof freshness would still remain blocked on more approved evidence.

---

## Final Check

This spec is production-ready for a builder handoff. The remaining uncertainty is mostly about how much operational detail to expose, and that is intentionally fenced into the later reassurance lane. The current slice stays safe because it teaches buyers without overclaiming protections or rewriting the site architecture.
