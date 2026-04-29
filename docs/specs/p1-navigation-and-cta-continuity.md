# Spec: Navigation And CTA Continuity

> **Status:** built
> **Priority:** P1 (next up)
> **Depends on:** `p1-search-intent-landing-architecture.md` (ready), `p1-buyer-education-and-pre-decision-guidance.md` (ready), `p0-public-booking-routing-and-source-truth.md` (ready), `p1-operational-reassurance-and-what-happens-next.md` (ready)
> **Estimated complexity:** medium (7-9 files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event         | Date                 | Agent/Session | Commit |
| ------------- | -------------------- | ------------- | ------ |
| Created       | 2026-04-03 18:10 EDT | Codex         |        |
| Status: ready | 2026-04-03 18:10 EDT | Codex         |        |
| Status: built | 2026-04-29 11:32 EDT | Worker A      |        |
| Type check    | 2026-04-29 11:32 EDT | Worker A      | `npx tsc --noEmit --skipLibCheck --pretty false` exited 0 |

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

- **Core goal:** make the public consumer journey legible and continuous across header, footer, homepage, chef-directory surfaces, and public chef profiles without pretending the site is only one audience.
- **Key constraints:** do not rebuild information architecture from scratch; do not hide operator entry points completely; do not override lane-truth decisions already defined in the booking-routing and reassurance specs; do not widen this into alternate-entry promotion, proof freshness, or operator-page redesign.
- **Motivation:** the research shows ChefFlow already has the routes it needs, but the global chrome and CTA labels still mix buyer booking, discovery, and operator SaaS signals in a way that weakens trust and makes intent harder to follow.
- **Success from the developer's perspective:** a builder can land one clear public CTA hierarchy, one canonical consumer action label, and one explicit role for `/discover` without breaking existing routes or duplicating previous website specs.

---

## What This Does (Plain English)

This spec gives ChefFlow one clear public CTA hierarchy.

After this is built:

- global public chrome uses one canonical consumer booking CTA label
- the homepage, `/chefs`, and public chef profiles reinforce the same consumer path instead of inventing new top-level actions
- `/discover` is treated as a supporting food-directory route, not as a competing primary booking lane
- operator entry remains available, but it stops occupying the strongest CTA position on buyer-facing surfaces

This is not a full navigation redesign. It is a continuity pass that makes the current public route system easier to decode.

---

## Why It Matters

The competitor memo already identifies navigation and CTA continuity as the next buyer-path gap after acquisition architecture, buyer education, and reassurance. It says Take a Chef keeps the consumer journey legible with a persistent, easy-to-decode primary action, while ChefFlow currently mixes consumer booking, food discovery, operator software adoption, and partner signup in the same public navigation and footer (`docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:755`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:765`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:774`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:785`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:790`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:803`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:815`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:816`).

The current repo confirms the mismatch:

- the homepage hero already behaves like a strong consumer booking surface, with `Book a Private Chef` as the first action and browse-chef as the secondary path (`app/(public)/page.tsx:361`, `app/(public)/page.tsx:367`, `app/(public)/page.tsx:376`)
- the header still mixes buyer routes with `/for-operators` and uses `Get Started` as the strongest top-right CTA, which reads like software onboarding rather than client booking (`components/navigation/public-header.tsx:11`, `components/navigation/public-header.tsx:15`, `components/navigation/public-header.tsx:78`, `components/navigation/public-header.tsx:84`)
- the footer brand copy is operator-first, even though the public consumer routes are already real and valuable (`components/navigation/public-footer.tsx:54`, `components/navigation/public-footer.tsx:55`, `components/navigation/public-footer.tsx:56`, `components/navigation/public-footer.tsx:57`)
- the public chef profile CTA area still mixes inquiry, gift cards, website links, client-account signup, and partner signup in one cluster (`app/(public)/chef/[slug]/page.tsx:595`, `app/(public)/chef/[slug]/page.tsx:605`, `app/(public)/chef/[slug]/page.tsx:619`, `app/(public)/chef/[slug]/page.tsx:636`, `app/(public)/chef/[slug]/page.tsx:660`, `app/(public)/chef/[slug]/page.tsx:670`)
- `/discover` is a legacy redirect in this branch via `app/(public)/discover/[[...path]]/page.tsx`; the live food-directory surface is `/nearby`, so this slice treats `/nearby` as the supporting food-directory lane while preserving `/discover` as route-role metadata.

This spec fixes that continuity gap without inventing new routes or rewriting the public stack.

---

## Files to Create

| File                                     | Purpose                                                                                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/public/public-navigation-config.ts` | Shared public CTA labels, route-role metadata, and audience hierarchy so header, footer, homepage, and directory surfaces stop drifting |

---

## Files to Modify

| File                                                                                      | What to Change                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/navigation/public-header.tsx`                                                 | Replace generic top-right `Get Started` with the canonical public consumer CTA, keep operator entry visible but lower-emphasis, and align desktop/mobile labels with the shared config |
| `components/navigation/public-footer.tsx`                                                 | Reorder footer hierarchy around the consumer journey first, clarify `/discover` as the food-directory lane, and keep operator links in a visibly separate section                      |
| `app/(public)/page.tsx`                                                                   | Align the homepage hero CTA label with the shared public CTA config and reduce visual competition from the operator CTA block below the consumer story                                 |
| `app/(public)/chefs/_components/chef-hero.tsx`                                            | Add page-level continuity CTAs so `/chefs` supports the same consumer path instead of acting like a disconnected listing index                                                         |
| `app/(public)/chefs/page.tsx`                                                             | Update zero-result and supporting CTAs so the primary fallback is still the consumer booking lane, not only contact or filter reset                                                    |
| `app/(public)/discover/page.tsx`                                                          | Not present in this branch; `/discover` redirects to `/nearby` through the existing catch-all fallback, so no file was created to avoid a route conflict                                |
| `app/(public)/chef/[slug]/page.tsx`                                                       | Keep inquiry as the primary action on chef-specific pages, but remove or demote buyer-irrelevant links from the primary CTA cluster                                                    |
| `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md` | Mark navigation and CTA continuity as spec-backed and update builder sequencing                                                                                                        |

---

## Database Changes

None.

---

## Data Model

This spec adds no schema. It creates one shared TypeScript config for public CTA continuity.

Use a shape such as:

```ts
type PublicRouteRole =
  | 'consumer_booking'
  | 'consumer_browse'
  | 'consumer_directory'
  | 'consumer_support'
  | 'operator_software'

type PublicCta = {
  label: string
  href: string
}

export const PUBLIC_PRIMARY_CONSUMER_CTA: PublicCta = {
  label: 'Book a Chef',
  href: '/book',
}

export const PUBLIC_SECONDARY_CONSUMER_CTA: PublicCta = {
  label: 'Browse Chefs',
  href: '/chefs',
}

export const PUBLIC_ROUTE_ROLE: Record<string, PublicRouteRole> = {
  '/book': 'consumer_booking',
  '/chefs': 'consumer_browse',
  '/discover': 'consumer_directory',
  '/contact': 'consumer_support',
  '/trust': 'consumer_support',
  '/for-operators': 'operator_software',
}
```

Key rules:

1. **One canonical consumer CTA label.** Generic public booking CTAs should use one shared label, `Book a Chef`, instead of mixing `Book a Private Chef`, `Get Started`, and other variants across top-level surfaces.
2. **Context-specific chef actions can stay specific.** On chef profile and chef-specific booking surfaces, `Start inquiry` can remain the primary action because the user has already chosen a chef.
3. **`/discover` is supporting, not primary.** When exposed in global navigation or hero support copy, it should read as the food directory lane and not compete with the private-chef booking path.
4. **Operator entry stays visible but not dominant.** `/for-operators` remains reachable, but it must not occupy the strongest accent CTA on buyer-facing public chrome.
5. **Do not add dead links.** Only surface buyer-guide links such as `/how-it-works` if the route from `p1-buyer-education-and-pre-decision-guidance.md` exists in the working branch.
6. **Do not flatten per-chef routing truth.** A chef profile that prefers direct website routing or gift-card purchase must still respect its own route logic; this spec only cleans up hierarchy and continuity around that logic.

---

## Server Actions

No new server actions.

This is a public-surface continuity pass only.

---

## UI / Component Spec

### Global Public Hierarchy

The public site should expose this audience order:

1. book a chef
2. browse chefs
3. supporting food directory and trust/support routes
4. operator software entry

That order should be visible in both the header and footer.

### Header

Desktop and mobile header rules:

1. keep `Sign In` available
2. keep the main consumer routes visible
3. use the accent button for `Book a Chef`, not `Get Started`
4. keep `/for-operators` as a text navigation item, not as the strongest button
5. label `/discover` as `Food Directory` if it stays in top-level nav, so it reads as a supporting browse route rather than a vague competing verb

### Footer

Footer rules:

1. first column or first link group should reinforce the consumer booking path
2. consumer links should group `Book a Chef`, `Browse Chefs`, `Food Directory`, `Trust Center`, and `Contact`
3. operator links should stay separate and clearly marked
4. brand copy should stop reading as operator-only product framing on a buyer-facing public footer

### Homepage

Homepage rules:

1. hero primary CTA should use the same shared booking label
2. browse remains the secondary path
3. the operator block below the consumer story should remain below the fold and visually secondary to the buyer path
4. avoid a second accent CTA on the same screen depth that competes with the consumer booking path

### `/chefs`

Directory rules:

1. keep directory cards contextual and route-specific
2. add or align page-level CTA continuity so the directory still points users toward the canonical booking lane when they need help choosing
3. zero-result states should offer `Book a Chef` before generic support contact

### `/discover`

Directory-of-food rules:

1. keep the hero honest as a broader food directory
2. add a lightweight handoff for users whose real intent is private-chef booking
3. do not restyle `/discover` as if it were the main chef-booking route

### Public Chef Profile

Profile CTA rules:

1. `Start inquiry` remains the primary action when inquiries are accepted
2. gift cards and external website links can stay secondary or tertiary where truthful
3. remove or demote `Client account` and `Partner signup` from the buyer-facing CTA cluster
4. if a secondary utility link remains, it should support the current consumer journey, not distract into operator or partner acquisition

---

## Edge Cases and Error Handling

| Scenario                                                                                                      | Correct Behavior                                                               |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Builder keeps `Get Started` as the dominant public header CTA                                                 | Replace it with the canonical consumer booking CTA                             |
| Builder deletes `/for-operators` from public navigation entirely                                              | Stop. This spec demotes operator entry on buyer surfaces; it does not erase it |
| Builder changes every chef-profile CTA to `Book a Chef`                                                       | Stop. Chef-specific surfaces can keep contextual actions like `Start inquiry`  |
| `/discover` is renamed or styled like the main booking route                                                  | Keep it honest as the food-directory lane and add only a light handoff         |
| Builder adds `/how-it-works` into header/footer before that route exists in the branch                        | Hold the link until the dependent buyer-guide route is landed                  |
| Builder leaves partner signup or client-account signup inside the main buyer CTA cluster on public chef pages | Remove or demote them; they are not primary buyer actions                      |

---

## Verification Steps

1. Confirm the strongest public header CTA now routes to `/book` and no longer says `Get Started`.
2. Confirm desktop and mobile header labels match the shared public navigation config.
3. Confirm the footer groups consumer routes ahead of operator routes.
4. Confirm the homepage hero primary CTA uses the shared consumer booking label.
5. Confirm the homepage operator CTA block no longer visually competes with the hero consumer path.
6. Confirm `/chefs` has a clear page-level handoff into the booking lane and that zero-result states prioritize `Book a Chef`.
7. Confirm `/discover` still reads as a broader food directory but now offers a light handoff for chef-booking intent.
8. Confirm public chef profiles keep `Start inquiry` primary while buyer-irrelevant links are removed or visibly demoted.
9. Confirm no public consumer surface now treats `/for-operators` as the strongest accent CTA.
10. Confirm the website cross-reference treats this lane as spec-backed and updates the remaining unspecced order.

---

## Out of Scope

- Full information-architecture rewrite
- Alternate entry-point promotion strategy for gift cards, trust, FAQ, and contact
- Site-level proof freshness expansion
- Operator landing-page redesign
- Public AI messaging rewrite
- Booking-lane truth, provenance, or reassurance logic already covered by earlier specs

---

## Notes for Builder Agent

- This is a continuity spec, not a route-creation spec.
- Build on the booking-routing and reassurance specs instead of replacing them.
- Keep the distinction between page-level CTA hierarchy and per-card or per-chef contextual actions.
- If a public route has no good consumer CTA today, prefer `Book a Chef` as the generic help path unless the user is already inside a chef-specific flow.
- If you discover a public route whose purpose is still ambiguous after reading the existing specs, stop and surface that ambiguity instead of improvising a third public journey.

---

## Spec Validation

### 1. What exists today that this touches?

- The header already exposes buyer and operator routes together and uses `Get Started` as the strongest top-right CTA (`components/navigation/public-header.tsx:11`, `components/navigation/public-header.tsx:12`, `components/navigation/public-header.tsx:15`, `components/navigation/public-header.tsx:78`, `components/navigation/public-header.tsx:84`).
- The footer already exposes buyer, operator, and resource routes, but its brand copy is operator-first (`components/navigation/public-footer.tsx:19`, `components/navigation/public-footer.tsx:20`, `components/navigation/public-footer.tsx:27`, `components/navigation/public-footer.tsx:32`, `components/navigation/public-footer.tsx:54`, `components/navigation/public-footer.tsx:55`, `components/navigation/public-footer.tsx:56`, `components/navigation/public-footer.tsx:57`).
- The homepage hero already gives a strong consumer booking path, while the lower operator CTA block introduces a second competing accent CTA (`app/(public)/page.tsx:361`, `app/(public)/page.tsx:367`, `app/(public)/page.tsx:372`, `app/(public)/page.tsx:520`, `app/(public)/page.tsx:524`, `app/(public)/page.tsx:541`, `app/(public)/page.tsx:544`).
- `/chefs` already has a consumer-first hero and real directory flow, but no strong page-level bridge back to the canonical booking lane (`app/(public)/chefs/_components/chef-hero.tsx:11`, `app/(public)/chefs/_components/chef-hero.tsx:16`, `app/(public)/chefs/_components/chef-hero.tsx:20`, `app/(public)/chefs/page.tsx:547`, `app/(public)/chefs/page.tsx:560`, `app/(public)/chefs/page.tsx:567`).
- `/discover` is currently a legacy redirect to `/nearby`; `/nearby` already has a private-chef handoff and should stay the visible food-directory lane.
- Public chef profiles already have a live CTA cluster, but it mixes buyer and non-buyer actions too tightly (`app/(public)/chef/[slug]/page.tsx:595`, `app/(public)/chef/[slug]/page.tsx:599`, `app/(public)/chef/[slug]/page.tsx:609`, `app/(public)/chef/[slug]/page.tsx:623`, `app/(public)/chef/[slug]/page.tsx:639`, `app/(public)/chef/[slug]/page.tsx:660`, `app/(public)/chef/[slug]/page.tsx:670`).

### 2. What exactly changes?

- Add one shared public navigation config for canonical public CTA labels and route roles.
- Make `Book a Chef` the dominant generic consumer CTA across global public chrome.
- Reframe `/discover` as a supporting food-directory lane instead of a competing primary booking route.
- Demote operator acquisition and buyer-irrelevant links on buyer-facing public surfaces without removing them entirely.
- Update the website cross-reference so navigation continuity is no longer research-only.

### 3. What assumptions are you making?

- **Verified:** the competitor memo explicitly identifies navigation and CTA continuity as the next public conversion issue and says the site should keep one consistent consumer CTA label across header, homepage, directory, profile pages, and footer (`docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:755`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:765`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:803`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:805`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:809`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:814`).
- **Verified:** the memo also says operator and partner entry paths should be demoted or visually separated on buyer-facing pages and `/discover` should be clarified so it does not compete with the chef-booking journey (`docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:815`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:816`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:817`).
- **Verified:** the booking-routing and reassurance specs already define route truth and public booking lane behavior, so this continuity pass should not re-open those decisions (`docs/specs/p0-public-booking-routing-and-source-truth.md:40`, `docs/specs/p0-public-booking-routing-and-source-truth.md:64`, `docs/specs/p1-operational-reassurance-and-what-happens-next.md:43`, `docs/specs/p1-operational-reassurance-and-what-happens-next.md:176`).
- **Unverified but fenced:** the exact final header exposure for `/how-it-works` depends on whether the buyer-guide route lands first in the branch, so this spec allows that link only when the dependent route exists.

### 4. Where will this most likely break?

1. A builder may keep `Get Started` as the public accent CTA and only change labels elsewhere.
2. A builder may overcorrect and hide operator entry entirely.
3. A builder may treat per-chef CTA clusters and generic global CTAs as if they should use the same label.
4. A builder may let `/discover` continue competing with the chef-booking path because its role is not made explicit.
5. A builder may leave client-account or partner-signup links inside the main buyer CTA area on chef profiles.

### 5. What is underspecified?

- Exact visual treatment can follow the current public design language, as long as the hierarchy, route roles, and label rules stay intact.
- Whether the supporting secondary CTA on `/chefs` points to `/how-it-works` or `/trust` can follow branch reality, but only if the linked route already exists.

### 6. What dependencies or prerequisites exist?

- Preserve route-truth and lane distinctions from `p0-public-booking-routing-and-source-truth.md`.
- Preserve reassurance language boundaries from `p1-operational-reassurance-and-what-happens-next.md`.
- Prefer the buyer-guide route family from `p1-buyer-education-and-pre-decision-guidance.md` when deeper education links are surfaced.
- Do not override segmented landing work already defined in `p1-search-intent-landing-architecture.md`.

### 7. What existing logic could this conflict with?

- Existing public header/footer marketing logic, if a builder updates only one surface and leaves the others inconsistent.
- Chef-profile routing preferences, if a builder mistakes this continuity pass for permission to override per-chef CTA logic.
- Broader public expansion work, if a builder uses this spec to redesign `/discover` instead of clarifying its supporting role.

### 8. What is the end-to-end data flow?

1. Visitor lands on a public consumer surface.
2. Global chrome makes the booking path and browse path immediately legible.
3. If the visitor is on a generic surface, the strongest CTA routes to `/book`.
4. If the visitor is on a chef-specific surface, the primary CTA remains contextual to that chef.
5. Supporting routes such as `/discover`, `/trust`, and `/contact` remain visible without overtaking the main consumer booking path.

### 9. What is the correct implementation order?

1. Land the shared `lib/public/public-navigation-config.ts` file.
2. Update desktop and mobile header hierarchy.
3. Update footer grouping and brand copy hierarchy.
4. Align homepage hero CTA label and reduce operator CTA competition.
5. Align `/chefs` hero and zero-result states.
6. Clarify `/discover` with a supporting handoff into the booking lane.
7. Clean up the public chef profile CTA cluster.
8. Update the website cross-reference.

### 10. What are the exact success criteria?

- Public header and mobile menu use one canonical consumer booking CTA label.
- Public footer now reflects the same consumer-first hierarchy as the homepage.
- Homepage, `/chefs`, and `/discover` reinforce the same booking-versus-browse story.
- Public chef profiles no longer mix partner or client-account links into the primary buyer CTA cluster.
- Operator entry remains visible but is not the dominant accent CTA on buyer-facing public chrome.
- The website cross-reference marks this lane as spec-backed and moves the remaining website gaps down correctly.

### 11. What are the non-negotiable constraints?

- No full IA rewrite.
- No operator-path removal.
- No route-truth rewrite.
- No fake or dead links.
- No collapsing chef-specific CTA logic into generic booking labels.

### 12. What should NOT be touched?

- Booking provenance or source-truth write paths.
- Public reassurance copy rules beyond what is needed for CTA continuity.
- Gift-card promotion strategy beyond current truthful visibility.
- Site-level proof expansion.
- Operator-only route architecture.

### 13. Is this the simplest complete version?

Yes. It converts the next unspecced public-conversion gap into a narrow implementation slice using the current route system and existing website specs.

### 14. If implemented exactly as written, what would still be wrong?

- Alternate entry-point visibility would still need its own follow-on spec.
- Site-level proof freshness would still remain blocked on real approved evidence.
- Public AI copy guardrails would still remain a policy constraint rather than a dedicated runtime slice.

---

## Final Check

This spec is production-ready for builder handoff. It turns the next research-backed website gap into a narrow continuity slice, keeps the consumer journey clearer across the current public system, and avoids reopening route-truth or larger IA debates.
