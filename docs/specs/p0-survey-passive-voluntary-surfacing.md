# Spec: Survey Passive Voluntary Surfacing

> **Status:** implemented locally, deployment verification pending; current blocker is deployed host reachability
> **Priority:** P0 (blocking)
> **Depends on:** `docs/research/current-builder-start-handoff-2026-04-02.md`, `docs/specs/survey-wave-1-internal-launch-builder-handoff-2026-04-02.md`
> **Estimated complexity:** medium (3-8 files)
> **Builder note:** this spec is now implementation reference plus close-out context. The immediate next executable spec is `docs/specs/p0-survey-passive-voluntary-deploy-verification.md`.

## Timeline

| Event                                    | Date                 | Agent/Session      | Commit |
| ---------------------------------------- | -------------------- | ------------------ | ------ |
| Created                                  | 2026-04-02 20:00     | Planner + Strategy |        |
| Local implementation completed           | 2026-04-02 22:00     | Codex              |        |
| Deployment verification still open       | 2026-04-02 22:00     | Codex              |        |
| Deployed verification blocked externally | 2026-04-03 04:40 EDT | Codex              |        |

---

## Developer Notes

### Raw Signal

The developer wants survey access to be available without being forced. Public visitors should be able to discover the survey and take it voluntarily. The same idea should apply inside the chef portal and the client portal. The surveys should feel accessible and deliberate, not intrusive, manipulative, or blocking.

They also want the builder to execute in the correct order. That means passive surfacing should build on the existing public survey routes rather than inventing a second delivery path, and it should preserve the current anonymous response model and tracked-link strategy.

### Developer Intent

- **Core goal:** expose the two wave-1 surveys through owned product surfaces in a voluntary, non-intrusive way.
- **Key constraints:** do not require sign-in for public participation, do not make survey completion mandatory, do not confuse chef and client audiences, do not create a second survey subsystem, and do not break the current pre/post-beta banner flow.
- **Motivation:** the current internal survey path exists, but the collection strategy is incomplete until the surveys can be discovered naturally on public, chef, and client surfaces.
- **Success from the developer's perspective:** a public visitor can voluntarily discover the survey, chefs see the operator survey in context, clients see the client survey in context, and every owned-surface click carries clean attribution.

---

## What This Does (Plain English)

Adds non-intrusive survey entry points across the public site, chef portal, and client portal, all pointing back to the existing `/beta-survey/public/[slug]` routes. Authenticated portal users see the right survey for their role. Public visitors see a small optional callout with clear audience choices instead of a forced prompt. Anonymous public submissions set a browser-scoped completion marker so the same browser is not repeatedly prompted after a successful submission.

---

## Why It Matters

The surveys already exist, but the owned-surface collection strategy was incomplete until these passive entry points were mounted. This is the runtime slice that closes the active-plus-passive collection gap without introducing a second survey system or breaking the anonymous submission model.

---

## Current Implementation Status

Implemented locally in the current tree:

- `components/beta-survey/market-research-banner-wrapper.tsx`
- `components/beta-survey/public-market-research-entry.tsx`
- `lib/beta-survey/survey-presence.ts`
- `lib/beta-survey/survey-cache.ts`
- layout mounts in:
  - `app/(chef)/layout.tsx`
  - `app/(client)/layout.tsx`
  - `app/(public)/layout.tsx`
- browser-scoped completion suppression in:
  - `components/beta-survey/beta-survey-banner.tsx`
  - `components/beta-survey/beta-survey-form.tsx`
  - `lib/beta-survey/actions.ts`
- market-research portal banners now bypass onboarding-peripheral suppression so fresh client sessions still surface the survey entry
- market-research banner spacing is now channel-specific so the client shell does not inherit the chef shell's negative top offset

Still open:

- deployed-environment verification of the three owned surfaces
- deployed host reachability, with both `beta.cheflowhq.com` and `app.cheflowhq.com` returning Cloudflare `530` / `1033` on 2026-04-03 04:39 EDT
- confirmation that tracked params appear correctly in admin after real deployed submissions
- broader scale hardening, which belongs to `docs/specs/p1-survey-public-hardening-and-results-scale.md`

---

## Files Created

| File                                                        | Purpose                                                                         |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `components/beta-survey/market-research-banner-wrapper.tsx` | Auth-aware server wrapper for chef/client portal banners by survey type         |
| `components/beta-survey/public-market-research-entry.tsx`   | Public-site voluntary survey callout with operator/client choices               |
| `lib/beta-survey/survey-presence.ts`                        | Shared browser marker keys for dismiss/completion suppression                   |
| `lib/beta-survey/survey-cache.ts`                           | Cached active/public survey-definition reads to keep the public path build-safe |

---

## Files Modified

| File                                            | What Changed                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| `app/(chef)/layout.tsx`                         | Mounts the operator survey banner in the chef content shell                           |
| `app/(client)/layout.tsx`                       | Mounts the client survey banner in the client content shell                           |
| `app/(public)/layout.tsx`                       | Mounts the public-site voluntary survey entry near the footer                         |
| `components/beta-survey/beta-survey-banner.tsx` | Reuses dismiss behavior and now also suppresses banners after same-browser completion |
| `components/beta-survey/beta-survey-form.tsx`   | Marks completed surveys in browser storage after successful submit                    |
| `lib/beta-survey/actions.ts`                    | Sets browser-scoped completion cookies for anonymous/authenticated survey success     |

---

## Database Changes

None.

---

## Data Model

Reuse the existing market-research survey definitions and public route model:

- survey types:
  - `market_research_operator`
  - `market_research_client`
- survey slugs:
  - `food-operator-wave-1`
  - `private-chef-client-wave-1`

Owned-surface entry points append tracked params so downstream analysis can distinguish product-native traffic from outreach traffic.

Current tracked params in the local implementation:

- chef portal:
  - `source=owned_surface`
  - `channel=chef_portal`
  - `launch=in_app_banner`
  - `respondent_role=food_operator`
- client portal:
  - `source=owned_surface`
  - `channel=client_portal`
  - `launch=in_app_banner`
  - `respondent_role=consumer`
- public site:
  - `source=owned_surface`
  - `channel=public_site`
  - `launch=public_discover_card`
  - `respondent_role=food_operator` or `consumer`, depending on the chosen CTA

---

## Server Actions

No new server actions are required.

Reuse:

| Action                           | Auth            | Input        | Output                                                  | Side Effects                                     |
| -------------------------------- | --------------- | ------------ | ------------------------------------------------------- | ------------------------------------------------ |
| `getCachedActiveSurvey(type)`    | server-only     | `SurveyType` | `BetaSurveyDefinition \| null`                          | Tagged cached read for active survey definitions |
| `getMyBetaSurveyStatus(type)`    | `requireAuth()` | `SurveyType` | `{ hasSubmitted: boolean; surveySlug: string \| null }` | None                                             |
| `submitBetaSurveyAnonymous(...)` | public          | answers/meta | `{ success: boolean; error?: string }`                  | Sets browser completion marker on success        |

Implementation rules:

- do not reuse `getMyBetaSurveyStatus(...)` on unauthenticated public pages
- the public-site component uses `getCachedActiveSurvey(...)` and renders optional CTAs without auth assumptions
- authenticated portal banners use both:
  - server auth status where available
  - browser-scoped completion markers for anonymous public-share submissions

---

## UI / Component Spec

### Chef Portal

- Render a single operator-survey banner using the existing banner visual pattern.
- Show it only when:
  - an active `market_research_operator` survey exists
  - the current browser does not already have a completion marker for that survey slug
  - the current authenticated user has not submitted that survey type through the authenticated path
- Placement:
  - near the top of the chef content shell
  - not in the raw top-of-document stream where fixed mobile headers can obscure it

### Client Portal

- Same pattern as chef portal, but for `market_research_client`.
- Use the client-targeted tracked link parameters.

### Public Site

- Render a small voluntary callout near the bottom of the page shell, not a modal.
- If both surveys are active, show two clearly labeled choices:
  - `I run a food business`
  - `I may hire a chef or caterer`
- If only one survey is active, show only that CTA.
- If neither is active, render nothing.
- If the current browser already completed one of the surveys, suppress only that CTA.

### States

- **Loading:** not applicable; these are server-rendered checks.
- **Empty:** render nothing when the corresponding survey is inactive or already browser-completed.
- **Error:** fail open and render nothing rather than blocking the page.
- **Populated:** show the appropriate banner or public discover card.

### Interactions

- Portal banners keep the existing 24-hour local dismissal behavior from `BetaSurveyBannerClient`.
- Successful survey submit now writes a browser-scoped completion marker so the same browser does not keep seeing the same passive prompt.
- Public-site callout does not add separate dismissal state in V1.
- Clicking any CTA must navigate directly to the existing public survey route with the owned-surface tracking params intact.

---

## Edge Cases and Error Handling

| Scenario                                                   | Correct Behavior                                                                 |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Active survey exists for chef but not client               | Chef portal renders banner; client portal does not                               |
| Public site has only one active market-research survey     | Show only that one CTA                                                           |
| Survey lookup throws                                       | Fail open and render nothing                                                     |
| Authenticated user already submitted the relevant survey   | Do not render the portal banner                                                  |
| Same browser already completed via anonymous public route  | Suppress the relevant passive prompt using the completion marker                 |
| Public component accidentally mounted on survey page shell | Avoid self-looping by keeping it in `app/(public)/layout.tsx`, not survey routes |

---

## Verification Steps

1. Sign in as a chef who has not submitted the operator survey in the current browser.
2. Verify the operator survey banner appears in the chef portal and links to `/beta-survey/public/food-operator-wave-1` with `source=owned_surface&channel=chef_portal`.
3. Submit the operator survey from that same browser, revisit the chef portal, and verify the banner no longer appears.
4. Sign in as a client who has not submitted the client survey in the current browser.
5. Verify the client survey banner appears in the client portal and links to `/beta-survey/public/private-chef-client-wave-1` with `source=owned_surface&channel=client_portal`.
6. Visit the public site unauthenticated and verify the public discover card appears without blocking the page.
7. Click each public CTA and verify the correct survey route loads with `source=owned_surface&channel=public_site`.
8. Submit one of the public surveys and verify the same browser no longer sees that CTA on the public site.

---

## Local Verification Already Completed

- targeted eslint on the touched runtime files
  - passed
- `node --test --import tsx tests/unit/beta-survey-utils.test.ts`
  - passed
- fresh localhost browser verification
  - public discovery card renders both tracked CTAs
  - chef portal renders the operator survey banner
  - client portal renders the client survey banner after the onboarding-gate and spacing fixes

Not yet completed:

- deployed-environment UI verification
- deployed tracked submission verification in admin
- broader anonymous-intake hardening, which belongs to `docs/specs/p1-survey-public-hardening-and-results-scale.md`

Current repo-wide baseline status:

- `npm run typecheck:app`
  - passed
- `npm run build -- --no-lint`
  - passed
- `node --test --import tsx "tests/unit/beta-survey-utils.test.ts"`
  - passed

Implementation note:

- cached survey-definition reads are now part of the phase-2 implementation because uncached passive-entry lookups caused DB-client exhaustion during static generation

---

## Out of Scope

- distributed rate limiting
- abuse/anomaly logging
- admin pagination or large-result handling
- outreach sender-domain setup
- survey question wording or UX changes inside the form itself

---

## Notes for Builder Agent

- Do not mutate the existing `BetaSurveyBannerWrapper` into a multi-purpose public component. The separate market-research wrapper is the safer path and is already present locally.
- The public-site entry should stay intentionally modest. This is voluntary discovery, not a conversion gate.
- Preserve the canonical public route family: `/beta-survey/public/[slug]`.
- The current local tree already contains the implementation for this phase. The next builder should treat this spec as implementation reference and close-out context, not as a greenfield build.
- The next actual task is deployment verification through `docs/specs/p0-survey-passive-voluntary-deploy-verification.md`.
