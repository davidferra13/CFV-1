# Spec: Alternate Entry Points And Support Visibility

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** `p1-navigation-and-cta-continuity.md` (ready), `p1-operational-reassurance-and-what-happens-next.md` (ready), `p1-buyer-education-and-pre-decision-guidance.md` (ready)
> **Estimated complexity:** medium (7-9 files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event            | Date                 | Agent/Session         | Commit  |
| ---------------- | -------------------- | --------------------- | ------- |
| Created          | 2026-04-03 18:35 EDT | Codex                 |         |
| Status: ready    | 2026-04-03 18:35 EDT | Codex                 |         |
| Status: verified | 2026-04-12           | Builder (Claude Code) | pending |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A builder reading a spec without this section is building blind._

### Raw Signal

- Proceed with the most intelligent decisions on my behalf, in the correct order.
- Before taking action, fully understand the current system, constraints, and context.
- Plan briefly, then execute in a dependency-aware sequence, ensuring all prerequisites exist before advancing.
- Continuously verify your work, confirm alignment with the system, and prevent regressions.
- Bring everything to a clear, structured, and complete state so the builder agent has full context and can execute cleanly, in order.
- We need to synthesize all research into a cross-reference document so the work can guide implementation or modification of the current website build and improve performance and user experience.

### Developer Intent

- **Core goal:** expose the real non-primary public entry points that already exist, especially support, trust, contact, and gift-card routes, so buyers can choose a lighter next step without leaving the site feeling unreachable.
- **Key constraints:** do not clutter the main booking path; do not invent live chat, phone support, guaranteed replacement, or a global gift marketplace that does not exist; do not promote operator FAQ as buyer help; do not duplicate the navigation or reassurance specs.
- **Motivation:** the research says the site already has more legitimate public surface area than it signals. The missing work is not invention but better route-aware visibility and cleaner connective tissue between those routes.
- **Success from the developer's perspective:** a builder can add truthful secondary-entry clusters and support handoffs on the public site without weakening the main booking lane or implying service operations the product does not actually provide.

---

## What This Does (Plain English)

This spec makes ChefFlow feel more reachable and complete before a buyer submits a live event inquiry.

After this is built:

- booking and inquiry pages expose a small, truthful set of alternate next steps
- trust and contact pages feel connected to the consumer journey instead of acting like isolated software-support pages
- gift-card routes become a deliberate secondary consumer path where they already exist
- buyers who are not ready to book immediately can still move forward without falling into a dead end

This is not a support-operations rewrite. It is a visibility and routing pass across public secondary entry points.

---

## Why It Matters

The competitor memo explicitly calls this out as a real public-site gap. Take a Chef visibly exposes adjacent consumer paths such as gift, contact, FAQ, and support-oriented footer routes, which makes the service feel complete and reachable. ChefFlow already has real contact, trust, and chef gift-card surfaces, but they are quieter than the main booking path and are not well-connected back into the public journey (`docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:886`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:891`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:896`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:903`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:905`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:909`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:923`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:925`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:926`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:929`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:931`).

The repo confirms the opportunity:

- public chef profiles already expose a live gift-card route (`app/(public)/chef/[slug]/page.tsx:608`, `app/(public)/chef/[slug]/page.tsx:619`)
- chef inquiry fallback already exposes `Contact ChefFlow` when public inquiry is unavailable (`app/(public)/chef/[slug]/inquire/page.tsx:441`, `app/(public)/chef/[slug]/inquire/page.tsx:449`, `app/(public)/chef/[slug]/inquire/page.tsx:452`)
- the Trust Center already exposes support and security contacts, but its bottom CTA is still operator-signup oriented (`app/(public)/trust/page.tsx:38`, `app/(public)/trust/page.tsx:40`, `app/(public)/trust/page.tsx:41`, `app/(public)/trust/page.tsx:147`, `app/(public)/trust/page.tsx:150`, `app/(public)/trust/page.tsx:156`, `app/(public)/trust/page.tsx:159`, `app/(public)/trust/page.tsx:166`, `app/(public)/trust/page.tsx:175`)
- the Contact page already has support hours and email visibility, but it is not yet wired as a deliberate buyer fallback inside the booking journey (`app/(public)/contact/page.tsx:82`, `app/(public)/contact/page.tsx:90`, `app/(public)/contact/page.tsx:92`, `app/(public)/contact/_components/contact-form.tsx:203`, `app/(public)/contact/_components/contact-form.tsx:207`, `app/(public)/contact/_components/contact-form.tsx:219`, `app/(public)/contact/_components/contact-form.tsx:255`)
- chef gift-card purchase and success routes already exist as real public paths (`app/(public)/chef/[slug]/gift-cards/page.tsx:19`, `app/(public)/chef/[slug]/gift-cards/page.tsx:39`, `app/(public)/chef/[slug]/gift-cards/success/page.tsx:36`, `app/(public)/chef/[slug]/gift-cards/success/page.tsx:72`, `app/(public)/chef/[slug]/gift-cards/success/page.tsx:81`)

This spec turns those existing routes into a coherent secondary-entry system.

---

## Files to Create

| File                                                   | Purpose                                                                                                                       |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `lib/public/public-secondary-entry-config.ts`          | Shared config for route-aware secondary public entry links such as trust, contact, buyer-guide, and gift-card follow-ups      |
| `components/public/public-secondary-entry-cluster.tsx` | Lightweight shared component for rendering truthful alternate next-step links without turning pages into cluttered link farms |

---

## Files to Modify

| File                                                                                      | What to Change                                                                                                                              |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(public)/book/page.tsx`                                                              | Add a compact secondary-entry cluster for buyers who need trust, contact, or process guidance before submitting                             |
| `app/(public)/chef/[slug]/inquire/page.tsx`                                               | Extend the existing fallback/support handling with a deliberate alternate-entry cluster instead of only one isolated contact link           |
| `components/public/public-inquiry-form.tsx`                                               | Add route-aware trust/contact guidance around the form without weakening the primary inquiry action                                         |
| `app/(public)/chef/[slug]/page.tsx`                                                       | Keep gift cards as a real secondary consumer path and clean up supporting trust/contact handoffs around the main CTA area                   |
| `app/(public)/trust/page.tsx`                                                             | Replace the bottom operator-signup-only CTA with a mixed consumer-support handoff that routes back into booking, contact, or buyer guidance |
| `app/(public)/contact/page.tsx`                                                           | Add explicit consumer next-step cards so contact is a reachable support path, not a dead-end form                                           |
| `app/(public)/chef/[slug]/gift-cards/page.tsx`                                            | Add lightweight trust/support and booking-context links so the gift route feels like part of the service system                             |
| `app/(public)/chef/[slug]/gift-cards/success/page.tsx`                                    | Add clear next-step links back into booking, profile, or support after purchase                                                             |
| `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md` | Mark alternate entry points and support visibility as spec-backed and collapse the remaining unspecced website queue                        |

---

## Database Changes

None.

---

## Data Model

This spec adds no schema. It adds a shared front-end config for secondary public routes.

Use a shape such as:

```ts
type SecondaryEntryLink = {
  label: string
  href: string
  description: string
}

type SecondaryEntrySurface =
  | 'open_booking'
  | 'single_chef_inquiry'
  | 'chef_profile'
  | 'trust'
  | 'contact'
  | 'gift_cards'
  | 'gift_cards_success'

export const PUBLIC_SECONDARY_ENTRY_CONFIG: Record<SecondaryEntrySurface, SecondaryEntryLink[]> = {
  open_booking: [],
  single_chef_inquiry: [],
  chef_profile: [],
  trust: [],
  contact: [],
  gift_cards: [],
  gift_cards_success: [],
}
```

Key rules:

1. **Keep the main path primary.** The booking or inquiry action stays visually dominant; secondary-entry links stay compact.
2. **Use only real routes.** Valid secondary links are things like `/trust`, `/contact`, `/book`, `/chefs`, and already-existing chef gift-card pages.
3. **No fictional support surfaces.** Do not add live chat, phone support, concierge language, or guaranteed human intervention unless those systems actually exist.
4. **Do not promote operator FAQ as buyer help.** Prefer the buyer-guide route from `p1-buyer-education-and-pre-decision-guidance.md` once it exists in the branch; otherwise use trust/contact/book routes.
5. **Gift visibility stays truthful.** Do not invent a global gift marketplace. Use the existing chef-specific gift route where it already exists.

---

## Server Actions

No new server actions.

This is a public routing-and-visibility slice only.

---

## UI / Component Spec

### Shared Secondary Entry Cluster

Use a shared compact component that can render 2-4 links with short descriptions.

The cluster should be visually secondary to the main CTA and suited for:

1. trust questions
2. contact and support
3. learning how the process works
4. gift purchase where already available

### `/book`

Open-booking support cluster should answer:

1. want to understand trust or support first
2. not ready to submit yet
3. need a general contact path

Preferred link set:

- `/trust`
- `/contact`
- `/how-it-works` only if the buyer-guide route is already available in the branch

### `/chef/[slug]/inquire`

Single-chef inquiry support cluster should answer:

1. what if I have a trust or process question before submitting
2. what if this chef is unavailable
3. what if I want a lighter or alternate action

Preferred link set:

- `/contact`
- `/trust`
- back to profile

If the chef-profile gift route remains visible on the profile, do not duplicate it aggressively on the inquiry page unless it clearly fits the local layout.

### Public Chef Profile

Profile rules:

1. keep `Start inquiry` primary
2. keep gift cards secondary if they remain truthful on that profile
3. add a small trust/contact utility row or micro-handoff near the CTA area, not a full support panel
4. do not surface partner signup or client account as buyer-oriented alternate entries

### Trust Page

Trust page rules:

1. preserve the trust sections and policy links
2. replace the bottom operator-signup-only CTA with a mixed consumer-support action set
3. at minimum, offer paths into booking and contact
4. optionally offer buyer-guide routing if that route exists

### Contact Page

Contact page rules:

1. preserve the support form and support-hours block
2. add a small next-step section below or beside the form so visitors can jump back into booking or browsing if contact was only a reassurance check
3. do not turn the page into a generic sales page

### Gift-Card Routes

Gift-card rules:

1. keep the purchase form primary on the gift-card page
2. add small trust/contact support links so the route feels supported
3. on gift-card success, offer a return path to the chef profile and a soft path back into booking or support if needed

---

## Edge Cases and Error Handling

| Scenario                                                                     | Correct Behavior                                              |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Builder adds phone numbers, live chat, or concierge claims not present today | Remove them. This spec only surfaces real support routes      |
| Builder turns secondary-entry links into equal-weight primary buttons        | Demote them. The main booking or inquiry action stays primary |
| Builder promotes the operator FAQ as buyer help                              | Use buyer-guide, trust, or contact routes instead             |
| Builder invents a global gift page                                           | Stop. Use chef-specific gift-card routes only                 |
| Trust page still ends in operator signup only                                | Replace with mixed consumer-support next steps                |
| Contact page remains a dead end with no next-step handoff                    | Add the compact next-step section described here              |

---

## Verification Steps

1. Confirm `/book` exposes a compact trust/contact/process cluster without overtaking the main booking CTA.
2. Confirm `/chef/[slug]/inquire` has a deliberate support fallback and not just one isolated contact link.
3. Confirm public chef profiles keep gift cards secondary and expose trust/contact utility without crowding the main CTA.
4. Confirm the Trust Center now routes buyers back into booking or contact instead of only toward operator signup.
5. Confirm the Contact page now includes clear consumer next steps after or alongside the form.
6. Confirm chef gift-card pages and gift-card success pages expose small support/continuity links.
7. Confirm no surface promises phone support, live chat, concierge replacement, or other unverified service operations.
8. Confirm the website cross-reference now marks this lane as spec-backed and leaves only the proof-freshness lane unspecced.

---

## Out of Scope

- Support-SLA changes
- Live chat, phone support, or concierge operations
- Global gift-card marketplace route
- Site-level proof freshness
- Header/footer continuity work already covered by `p1-navigation-and-cta-continuity.md`
- Booking reassurance or route-truth work already covered by earlier specs

---

## Notes for Builder Agent

- This slice should make the site feel more reachable, not more cluttered.
- Reuse the shared continuity hierarchy from `p1-navigation-and-cta-continuity.md`.
- Keep the strongest public action intact on every surface.
- If the buyer-guide route family is not yet in the branch, do not create dead links just to satisfy this spec.
- If you find a route that would benefit from a support link but does not have an honest target, surface that gap instead of inventing a fake help channel.

---

## Spec Validation

### 1. What exists today that this touches?

- Public chef profiles already expose a live gift-card entry path (`app/(public)/chef/[slug]/page.tsx:608`, `app/(public)/chef/[slug]/page.tsx:619`).
- The chef inquiry fallback already exposes `Contact ChefFlow`, but only as a narrow failure-state action (`app/(public)/chef/[slug]/inquire/page.tsx:441`, `app/(public)/chef/[slug]/inquire/page.tsx:449`, `app/(public)/chef/[slug]/inquire/page.tsx:452`).
- The Trust Center already exposes support contacts and support response expectations, but its final CTA still points into operator signup (`app/(public)/trust/page.tsx:38`, `app/(public)/trust/page.tsx:40`, `app/(public)/trust/page.tsx:41`, `app/(public)/trust/page.tsx:147`, `app/(public)/trust/page.tsx:150`, `app/(public)/trust/page.tsx:156`, `app/(public)/trust/page.tsx:166`, `app/(public)/trust/page.tsx:175`).
- The Contact page already exposes support email, status, and business-hours context through the form and info card (`app/(public)/contact/page.tsx:82`, `app/(public)/contact/page.tsx:90`, `app/(public)/contact/page.tsx:92`, `app/(public)/contact/_components/contact-form.tsx:203`, `app/(public)/contact/_components/contact-form.tsx:207`, `app/(public)/contact/_components/contact-form.tsx:219`, `app/(public)/contact/_components/contact-form.tsx:255`).
- Chef gift-card purchase and success pages are already live public routes (`app/(public)/chef/[slug]/gift-cards/page.tsx:19`, `app/(public)/chef/[slug]/gift-cards/page.tsx:39`, `app/(public)/chef/[slug]/gift-cards/page.tsx:43`, `app/(public)/chef/[slug]/gift-cards/success/page.tsx:36`, `app/(public)/chef/[slug]/gift-cards/success/page.tsx:72`, `app/(public)/chef/[slug]/gift-cards/success/page.tsx:81`).

### 2. What exactly changes?

- Add one shared secondary-entry config and component.
- Surface compact trust/contact/process links on booking and inquiry pages.
- Make trust and contact pages route buyers back into the consumer journey.
- Treat chef gift-card pages as a deliberate secondary path instead of an isolated route.
- Update the website cross-reference so alternate entry points are no longer research-only.

### 3. What assumptions are you making?

- **Verified:** the competitor memo explicitly recommends more deliberate promotion of gift cards, clearer support/contact visibility near booking and inquiry surfaces, and stronger connection between trust, contact, FAQ, and booking pages (`docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:923`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:925`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:926`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:927`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:928`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:929`).
- **Verified:** the memo also says this should not clutter the main booking path (`docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:931`).
- **Verified:** the route-level continuity and reassurance layers are already spec-backed, so this slice should build on them instead of recreating them (`docs/specs/p1-navigation-and-cta-continuity.md:41`, `docs/specs/p1-operational-reassurance-and-what-happens-next.md:43`).
- **Unverified but fenced:** whether a buyer-guide route is already present in the branch depends on implementation order, so this spec permits that link only when it exists.

### 4. Where will this most likely break?

1. A builder may clutter booking and inquiry pages by making secondary links as strong as the primary CTA.
2. A builder may invent support channels that are not actually public.
3. A builder may promote the operator FAQ instead of a buyer-appropriate support or guide route.
4. A builder may treat gift cards like a global platform feature instead of a chef-specific public path.
5. A builder may forget to rewire the trust-page bottom CTA away from operator signup.

### 5. What is underspecified?

- Exact visual treatment can follow the current public design language as long as the secondary-entry hierarchy stays intact.
- The exact buyer-guide link target can remain conditional on whether that route has been built in the working branch.

### 6. What dependencies or prerequisites exist?

- Navigation continuity should land first so the site-wide hierarchy is already stable.
- Reassurance and route-truth specs should remain the source of truth for booking-path copy.
- Buyer-guide routes can be used as secondary help only when they exist in the branch.

### 7. What existing logic could this conflict with?

- Public CTA hierarchy from `p1-navigation-and-cta-continuity.md`, if a builder promotes secondary links too aggressively.
- Booking reassurance copy, if a builder uses these secondary links to avoid clarifying the main booking path itself.
- Chef-profile CTA cleanup, if a builder adds back buyer-irrelevant links under the label of alternate entry points.

### 8. What is the end-to-end data flow?

1. Visitor lands on a public booking, inquiry, trust, contact, or gift-card route.
2. Primary CTA remains the main task on that page.
3. Secondary-entry cluster gives the visitor a lighter truthful option when they are not ready for the main action.
4. Those routes connect back into booking, browsing, trust, contact, or buyer guidance without creating a dead end.

### 9. What is the correct implementation order?

1. Land the shared secondary-entry config and component.
2. Add the compact clusters to `/book` and the direct-chef inquiry surfaces.
3. Clean up the public chef profile CTA area around gift cards and support utilities.
4. Rework the trust-page bottom CTA.
5. Add consumer next-step routing on the Contact page.
6. Add continuity links on gift-card purchase and success pages.
7. Update the website cross-reference.

### 10. What are the exact success criteria?

- Buyers can find trust, contact, and lightweight help without abandoning the main public journey.
- Trust and Contact pages feel connected to the consumer booking system instead of isolated operator-support pages.
- Gift-card routes are visible and contextual where they already exist.
- No page now implies support channels or service guarantees that do not exist.
- The website cross-reference now treats this lane as spec-backed and leaves only site-level proof freshness blocked on evidence.

### 11. What are the non-negotiable constraints?

- No fake support surfaces.
- No global gift marketplace invention.
- No cluttering the main booking path.
- No operator FAQ as buyer fallback.
- No overlap with the navigation or reassurance specs.

### 12. What should NOT be touched?

- Header/footer continuity rules beyond what already exists in the navigation spec.
- Booking-lane truth, provenance, or reassurance copy logic.
- Support-policy or SLA commitments.
- Site-level proof layers.
- Operator onboarding or signup architecture.

### 13. Is this the simplest complete version?

Yes. It takes the real secondary public routes that already exist and turns them into a coherent public support-entry layer without widening into service operations or broader IA work.

### 14. If implemented exactly as written, what would still be wrong?

- Site-level proof freshness would still remain blocked on real approved evidence.
- Public AI copy would still remain a guardrail topic rather than a dedicated website implementation lane.
- Broader consumer expansion would still remain a separate strategic path.

---

## Final Check

This spec is production-ready for builder handoff. It converts the next research-backed website gap into a narrow, truthful public-support and alternate-entry slice while preserving the main booking path as the site's primary action.
