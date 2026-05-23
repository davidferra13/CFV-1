# Intensify Log: Chef Showcase Public Identity Studio

## Deep-Pass Run 2026-05-20

STATUS: fresh
DEPTH: normal-local

NOTE:

- The `/deep-pass` skill normally calls for spawned intensify agents. This run was completed locally because current Codex tool rules require explicit user authorization for parallel/background agents.
- Zone inferred from conversation: `chef-showcase-public-identity-studio`.
- Primary artifact deepened: `docs/specs/chef-showcase-public-identity-studio.md`.

SURFACED:

- The initial spec had the right product ambition but needed hard state contracts: showcase status, asset visibility, proof status, follow lifecycle, and public fallback behavior.
- The public profile should render from a deterministic `PublicChefShowcase` read model rather than ad hoc public queries against raw tenant tables.
- Follow must be a durable, consented growth primitive with source attribution, unsubscribe, and analytics. A saved-heart interaction is not enough.
- Service packages must be separated from operational service config, while staying validated against it so package cards do not overpromise services, price, or availability.
- Media/proof governance is the most important safety surface: every photo, testimonial, proof item, press claim, and work-history item needs visibility, rights, consent, and source status.
- Analytics should be action-oriented: profile views, package clicks, follow starts, verified follows, inquiry starts/submits, review-link opens, shares, and conversion by source.
- The work needs wave ownership boundaries because public profile, media, reputation, follow, inquiry, analytics, and route policy all intersect.

LENSES_USED:

- Take a Chef: private chef discovery and booking must present chef profile, menu/service expectations, guest count, price expectation, and inquiry path together.
- HoneyBook: service offerings should connect to proposal, contract, invoice, and next-step state instead of sitting as static cards.
- Tock: booking intent needs timing, capacity, deposit/commitment expectation, and state clarity.
- Airbnb: hospitality marketplace trust depends on real visuals, reviews, person/place context, clear expectations, policies, and confidence.
- Stripe: package and booking state must be authoritative and server-backed, not only client-side success state.
- Google SRE: public lead and booking surfaces need observable success/failure states and runtime proof.
- ChefFlow Native: existing profile, services, portfolio, reviews, discovery, Dinner Circles, and queue items should converge rather than be rebuilt.

EXPERT_VALIDATION:

- Canonical Showcase workspace: endorsed. Existing settings fragmentation is the biggest UX/product risk.
- Public read model: endorsed. It is the cleanest way to enforce privacy and simplify `/chef/[slug]`.
- Work history: endorsed with caveat. Useful only if visibility/proof rules block private-client leakage.
- Service packages: endorsed with caveat. Must be buyer-readable but constrained by actual service config.
- Media vault/governance: endorsed. Must reuse existing event/portfolio upload paths and avoid duplicate storage logic.
- Follow system: endorsed. Must include persistence, consent, source attribution, duplicate prevention, and unsubscribe from V1.
- Analytics taxonomy: endorsed. Must avoid PII and focus on decisions the chef can act on.
- Arbitrary website builder: rejected.
- External auto-importers in V1: rejected.
- Public follower counts by default: rejected.
- AI-authored public claims without chef approval: rejected.

EXPERT_ADDITIONS:

- Add a public fallback contract so unpublished or incomplete Showcase does not break the existing chef profile baseline.
- Add "published with draft" state so chefs can safely edit without changing live public output.
- Add package validation against service config to prevent contradictory claims.
- Add action surface requirements for recovery: restore last published version, unpublish section, remove asset everywhere, revoke proof display, resend verification, repair package handoff.
- Add wave merge rules because public route integration should not happen before the public read model is locked.

REJECTED:

- Build a full website builder: scope explosion and not required for chef trust.
- Build social auto-posting as part of Showcase: adjacent but separate from public identity.
- Import all external profiles first: unstable, permission-heavy, and unnecessary for first value.
- Show public follower count automatically: can harm low-volume or privacy-sensitive chefs.
- Let Remy publish copy directly: Remy can draft privately; chef approval remains canonical.

ACTED ON:

- Added deep-pass validation section to `docs/specs/chef-showcase-public-identity-studio.md`.
- Added canonical state model, public read model, permissions matrix, validation rules, analytics taxonomy, failure modes, action surface requirements, wave ownership plan, and dispatch-ready prompts.

SKIPPED:

- Spawning parallel intensify agents: skipped due current Codex tool rule requiring explicit user request for agents.
- Browsing current competitor pages: skipped because this pass uses cached source cards and focuses on internal build readiness, not current market feature parity.
- Queue creation: skipped because the user asked for spec/deep-pass, not "queue it now."

CROSS_REFS:

- `docs/intensify/discovery.md`: public profile should receive source state from discovery routes.
- `docs/intensify/client-portal.md`: clients/guests approving proof must connect to portal identity and consent.
- `docs/intensify/social-media-feeds.md`: social posting is downstream of governed media/proof, not part of this V1.
- `docs/intensify/navigation.md`: Showcase should be first-class in chef navigation and command palette.
- `docs/intensify/rail.md`: profile readiness, broken public links, proof approvals, and package gaps can become rail items later.

NEXT TRIGGER:

- Run deep-pass again after any of these land: public read model, Showcase Studio shell, media upload completeness, Dinner Circle follow growth, unified review command center, or public profile route rewrite.

BUILD_PROMPTS:

### Wave 1 (Parallel)

#### Agent: public-showcase-read-model

- **Model:** opus
- **Zone:** chef-showcase-public-identity-studio
- **Task:** Create the public-safe `PublicChefShowcase` read model and tests. It must assemble identity, packages, portfolio, work history, media, proof, links, follow config, inquiry config, and SEO from existing/current tables plus new showcase tables where present. It must filter by public visibility and consent before returning data.
- **Read first:** `docs/specs/chef-showcase-public-identity-studio.md`, `lib/profile/actions.ts`, `app/(public)/chef/[slug]/page.tsx`, `lib/profile/portfolio-actions.ts`, `lib/reviews/public-actions.ts`, `lib/chef/service-config-actions.ts`, `lib/auth/route-policy.ts`.
- **Expert backing:** Airbnb and Google SRE lenses endorsed deterministic public data and runtime-proofable output; ChefFlow native lens requires convergence with existing public profile code.
- **Done when:** Public read model has focused tests for hidden private media, unpublished packages, revoked proof, no reviews, no slug, and published showcase. Type check passes for touched files.
- **Caveats:** Do not expose private tenant data from public routes. Do not rewrite existing public profile rendering in this lane.

#### Agent: showcase-studio-shell

- **Model:** opus
- **Zone:** chef-showcase-public-identity-studio
- **Task:** Build the protected Showcase Studio shell and overview route. It should reuse existing profile, public profile, portfolio, services, and review data enough to show completeness and next actions without implementing every editor yet.
- **Read first:** `docs/specs/chef-showcase-public-identity-studio.md`, `app/(chef)/settings/my-profile/page.tsx`, `app/(chef)/settings/public-profile/page.tsx`, `app/(chef)/portfolio/page.tsx`, `app/(chef)/settings/my-services/page.tsx`, `components/navigation/chef-nav-config.ts`.
- **Expert backing:** HoneyBook and ChefFlow native lenses endorsed a single operational workspace instead of scattered settings.
- **Done when:** `/showcase` or the selected protected route loads for chef users, route policy is correct, overview cards render real existing data where available, and unauthenticated/client users cannot access it.
- **Caveats:** Keep it dense and operational. Do not create a marketing landing page.

### Wave 2 (After Wave 1 Verified)

#### Agent: showcase-work-history

- **Model:** opus
- **Zone:** chef-showcase-public-identity-studio
- **Task:** Add work history persistence, chef editor UI, and public-safe rendering contract. Support entry type, title, organization, dates, description, proof URL, media ref, display order, and visibility.
- **Read first:** `docs/specs/chef-showcase-public-identity-studio.md`, existing migration patterns, `lib/profile/portfolio-actions.ts`, `components/portfolio/highlight-editor.tsx`.
- **Expert backing:** Airbnb and Take a Chef lenses endorsed credible chef context; ChefFlow native lens added privacy and proof constraints.
- **Done when:** Chef can create/edit/reorder/hide work entries, public read model only returns public entries, and tests cover private entries and invalid date ranges.
- **Caveats:** Do not expose private client names by default.

#### Agent: showcase-service-packages

- **Model:** opus
- **Zone:** chef-showcase-public-identity-studio
- **Task:** Add public service package persistence, chef editor UI, package cards, and inquiry prefill. Packages must remain consistent with service config and must not overpromise price or booking availability.
- **Read first:** `docs/specs/chef-showcase-public-identity-studio.md`, `app/(chef)/settings/my-services/page.tsx`, `lib/chef/service-config-actions.ts`, `components/proposals/package-picker.tsx`, `components/public/public-inquiry-form.tsx`, `app/(public)/chef/[slug]/inquire/page.tsx`.
- **Expert backing:** HoneyBook, Tock, Stripe, and Take a Chef lenses endorsed service clarity tied to inquiry/booking state.
- **Done when:** Chef can publish at least two packages, public profile shows public packages, package CTA starts inquiry with package context, and validation blocks impossible guest ranges/prices.
- **Caveats:** Price labels must be honest: starting, minimum, or inquire.

#### Agent: showcase-media-governance

- **Model:** opus
- **Zone:** chef-showcase-public-identity-studio
- **Task:** Add showcase media asset metadata and visibility controls while reusing existing upload/photo systems. Support rights, consent, alt text, captions, source refs, visibility, and public-approved filtering.
- **Read first:** `docs/specs/chef-showcase-public-identity-studio.md`, `app/(chef)/portfolio/page.tsx`, `components/portfolio/portfolio-gallery.tsx`, `lib/events/photo-actions.ts`, `lib/portfolio/permission-check.ts`, blocked media upload queue items listed in the spec.
- **Expert backing:** Airbnb lens endorsed visual credibility; Google SRE lens endorsed explicit failure and visibility state.
- **Done when:** Chef can classify existing portfolio/event assets for public showcase, public read model hides unapproved media, and tests cover revoked/public/private states.
- **Caveats:** Do not duplicate storage/upload implementations if existing actions can be reused.

### Wave 3 (After Wave 2 Verified)

#### Agent: showcase-follow-system

- **Model:** opus
- **Zone:** chef-showcase-public-identity-studio
- **Task:** Build durable follow state for public visitors, clients, and guests with consent preferences, source attribution, duplicate prevention, unsubscribe, and protected follower dashboard.
- **Read first:** `docs/specs/chef-showcase-public-identity-studio.md`, `components/discovery/save-chef-button.tsx`, `lib/discovery/saved-chefs.ts`, `app/(public)/eat/_components/shortlist-button.tsx`, Dinner Circle growth queue item if available.
- **Expert backing:** Take a Chef and ChefFlow native lenses endorsed follow as a growth bridge from public discovery and Dinner Circles.
- **Done when:** Public profile Follow flow writes one durable follower record, repeated follow is idempotent, unsubscribe works, source attribution is stored, and chef can see aggregate/source data without public identity leakage.
- **Caveats:** Do not treat follow as only a local saved state.

#### Agent: showcase-proof-and-analytics

- **Model:** opus
- **Zone:** chef-showcase-public-identity-studio
- **Task:** Add public proof selection and analytics event tracking according to the spec. Connect review/testimonial/press/proof controls to public profile display and capture conversion events for views, follows, package clicks, inquiries, review links, social links, shares, and portfolio interactions.
- **Read first:** `docs/specs/chef-showcase-public-identity-studio.md`, `components/public/review-showcase.tsx`, `lib/reviews/public-actions.ts`, `app/(chef)/reputation/page.tsx`, `app/(chef)/reputation/studio/page.tsx`.
- **Expert backing:** Airbnb, HoneyBook, and Google SRE lenses endorsed proof plus measurable conversion.
- **Done when:** Public proof display uses only approved proof, analytics writes and aggregates are tested, and chef analytics answer source, package, follow, inquiry, and proof performance questions.
- **Caveats:** Analytics metadata must avoid raw PII unless explicitly submitted and protected.

### Wave 4 (After Wave 3 Verified)

#### Agent: showcase-public-profile-integration

- **Model:** opus
- **Zone:** chef-showcase-public-identity-studio
- **Task:** Integrate the `PublicChefShowcase` read model into `/chef/[slug]` and update public components for packages, work history, proof, portfolio, links, follow, and mobile sticky CTA.
- **Read first:** `docs/specs/chef-showcase-public-identity-studio.md`, `app/(public)/chef/[slug]/page.tsx`, `components/public/*`, `components/profile/portfolio-gallery.tsx`, `components/portfolio/portfolio-showcase.tsx`.
- **Expert backing:** Take a Chef, Airbnb, and Tock lenses endorsed a profile that combines person, proof, packages, expectations, and action.
- **Done when:** Public profile renders published showcase sections, hides unsafe/private data, works at desktop and 390px/430px mobile, and browser console/network/server logs are clean.
- **Caveats:** Do not make `/chef/[slug]` a giant client component. Keep first viewport focused on chef, trust, Book/Inquire, and Follow.

#### Agent: showcase-finish-gate-proof-pack

- **Model:** opus
- **Zone:** chef-showcase-public-identity-studio
- **Task:** Verify the full fired Showcase build in the running app at `http://localhost:3100`, run focused tests/typecheck, inspect console/network/server logs, run wiring-audit, and generate the proof pack.
- **Read first:** `docs/specs/chef-showcase-public-identity-studio.md`, `.agents/build-queue` fired item files, `scripts/wiring-audit-results.json` if present.
- **Expert backing:** Google SRE and ChefFlow finish-gate rules require runtime proof, not just changed files.
- **Done when:** Acceptance criteria are proven with screenshots, runtime proof, test output, route-policy/auth evidence, public/private leak checks, mobile proof, and `build-queue.mjs finish-check` passes.
- **Caveats:** Do not move queue items to done unless the running app proves the work.

### Dispatch Notes

- Total agents: 9
- Suggested waves: 4
- Estimated tier cost: 9 opus-style lanes because the work crosses public routes, auth, privacy, data modeling, and UI.
- Verification after all waves: focused tests for public read model, service package validation, media/proof visibility, follow idempotency, analytics event writes, route policy, plus runtime proof at `http://localhost:3100`.
