# Craft Evolution Lab Foundation Domain Contract

Date: 2026-05-21

Queue item: `BQ-20260520T183100Z-chef-life-craft-evolution-lab-foundation`

Source preserved: `docs/specs/chef-life-expansion-swarm-spec-pack.md` remains the swarm prompt source of truth. This document is the fired foundation contract for later Craft Evolution Lab slices.

## Goal

Define the smallest compatible Craft Evolution Lab contract without creating a duplicate recipe, menu, dish index, notes, client feedback, public profile, discovery, media, or Remy memory system. The contract composes current ChefFlow culinary data into a private culinary R&D and cuisine identity model that later slices can implement.

## Fire-Time Inspection

Inspected existing culinary craft, dish, note, feedback, profile, and discovery files:

- `docs/specs/chef-life-expansion-swarm-spec-pack.md`: Program 8 source thesis, domain model, swarm prompt, lifecycle states, and acceptance criteria.
- `docs/specs/chef-capacity-twin-foundation-domain-contract.md`, `docs/specs/chef-life-strategy-map-foundation-domain-contract.md`, and `docs/specs/client-household-operating-memory-foundation-domain-contract.md`: nearest foundation contract patterns.
- `lib/intelligence/chef-capacity-twin-contract.ts`, `lib/intelligence/chef-life-strategy-map-contract.ts`, and `lib/intelligence/client-household-operating-memory-contract.ts`: typed contract style and helper-function precedent.
- `app/(chef)/culinary/*`, `components/culinary/*`, and `app/(chef)/culinary/dish-index/*`: existing chef culinary surfaces, dish catalog, recipes, menu assembly, pricing, prep, and kitchen workflows.
- `lib/menus/dish-index-actions.ts`: chef-only dish index actions using `requireChef()` and tenant-scoped `dish_index`, `dish_appearances`, and `dish_feedback` reads/writes.
- `database/migrations/20260327000004_dish_index.sql`: existing tenant-owned `dish_index`, `dish_appearances`, `dish_variations`, `dish_feedback`, and RLS policies.
- `database/migrations/20260401000155_notes_dish_sources_pipeline.sql`: existing `workflow_notes`, note-menu links, canonical dish components, dish-note lineage, and source-mode additions.
- `lib/menus/dish-source-actions.ts` and `lib/menus/canonical-dish-menu-core.ts`: canonical dish to menu reference/copy pipeline.
- `lib/intelligence/dish-quality-tracker.ts`: server-action backed dish quality trends from `guest_feedback`, scoped by tenant id.
- `lib/culinary/taste-memory-types.ts` and `lib/culinary/taste-memory-actions.ts`: existing taste preference, flavor affinity, style-pattern, ingredient-frequency, and cuisine tendency lane.
- `lib/ui/signature-workflow-types.ts`, `lib/ui/signature-workflow-actions.ts`, and `database/migrations/20260517200179_signature_workflows.sql`: existing operational workflow model named "signature workflows"; this is not a signature dish system.
- `lib/discovery/culinary-profile-snapshot.ts`, `lib/discovery/culinary-profile-outcomes.ts`, profile/discovery modules, and public profile settings: existing profile-safe output patterns and public visibility boundary.
- `lib/auth/get-user.ts` and `lib/auth/route-policy.ts`: required auth and route classification patterns for future routes/actions.

## No-Duplicate-System Decision

Do not add persistence, routes, APIs, server actions, or migrations in this foundation slice. The initial Craft Evolution Lab must treat existing systems as source inputs:

- `dish_index`, `dish_appearances`, `dish_variations`, `dish_feedback`, and `dish_index_summary`: canonical dish memory, serving history, signature flags, variations, client reactions, and quality signals.
- `recipes`, `recipe_ingredients`, `menus`, `dishes`, `components`, and canonical dish source links: recipe and menu execution truth.
- `workflow_notes`, `workflow_note_menu_links`, and `dish_index_note_links`: private craft notes, idea capture, and dish lineage.
- `guest_feedback`, review/testimonial modules, and post-event feedback: client and guest reaction evidence.
- `chef_taste_preferences`, flavor affinities, cooking style patterns, and ingredient frequency: cuisine identity and style signals.
- Public profile, discovery, showcase, media, and sharing contracts: only approved public/profile-safe craft proof.
- Remy/CIL context: suggestion and synthesis inputs only, never automatic publication or trusted craft memory without chef review.

Later slices may add dedicated Craft Evolution Lab tables only if existing storage cannot represent experiment state, technique goals, inspiration sources, evidence refs, public proof review, or profile-safe output. Any new persistence must be additive, tenant-owned, RLS-protected, source-ref backed, and must not replace recipes, menus, dish index, notes, feedback, profile, discovery, media, or Remy memory.

## Typed Contract

The reusable TypeScript contract lives at `lib/intelligence/craft-evolution-lab-contract.ts`.

It defines:

- `CraftEvolutionLabProgramArchitecture`: the umbrella program contract for `BQ-20260520T183000Z-chef-life-craft-evolution-lab-program`, preserving Program 8 as source, linking the extracted build family, and carrying domain, data ownership, role/privacy, security, integration, proof, finish-check, and mobile expectations into narrower slices.
- `CraftEvolutionLabBuildWave`: the swarm-ready build path from Program 8, split into serially mergeable waves for Domain/Data/Security, Capture/Memory, Surfaces, Public/Client Integration, and Verification.
- `CraftEvolutionLabSliceReadiness`: a deterministic readiness check that blocks fired slices which do not carry source spec, product domain, data ownership, user roles, security/privacy, integration points, and proof expectations.
- `CraftEvolutionLabContract`: tenant-owned private aggregate for notes, experiments, signature candidates, technique goals, inspiration, tastings, reactions, proof candidates, and cuisine identity signals.
- `CraftNoteContract`: private or chef-internal craft note with links to dish, event, client, or menu source context.
- `DishExperimentContract`: R&D hypothesis, state, linked technique goals, inspiration sources, tasting results, client reactions, private notes, and source refs.
- `SignatureCandidateContract`: candidate dish identity, confidence, proof refs, and public-readiness gate.
- `TechniqueGoalContract`: chef growth target for technique families such as sauce, fermentation, pastry, butchery, plating, regional cuisine, and service.
- `InspirationSourceContract`: source-backed inspiration from markets, travel, restaurants, client requests, media, books, mentors, seasons, ingredients, memory, or classes.
- `TastingResultContract`: bench, staff meal, event, class, pop-up, or private tasting result with defects and next iteration.
- `ClientReactionContract`: client/event/dish reaction evidence with public-copy consent separated from private notes.
- `PublicProofCandidateContract`: public proof review object for photos, testimonials, menu stories, class topics, reviews, videos, portfolio entries, and discovery badges.
- `CuisineIdentitySignal`: cuisine, technique, ingredient, season, service-style, or point-of-view signal.
- `ProfileSafeCraftOutput`: filtered output for public profile or website surfaces.

States and helper functions:

- `CraftEvolutionState`: `idea`, `draft`, `test`, `tested`, `served`, `refined`, `signature`, `retired`, `archived`, `unknown`.
- `CraftVisibilityLevel`: `private_only`, `chef_internal`, `client_safe`, `public_profile`, `website_only`, `requires_evidence`, `never_publish`.
- `PublicProofState`: `candidate`, `needs_evidence`, `approved`, `published`, `rejected`, `archived`.
- `deriveMostAdvancedCraftState()`: combines lifecycle states.
- `isPrivateCraftVisibility()` and `isPublicCraftVisibility()`: role/output boundary helpers.
- `canPublishCraftProofCandidate()`: requires public/profile visibility, approved or published state, evidence refs, and public copy.
- `buildProfileSafeCraftOutput()`: redacts non-public proof, private signature candidates, and private cuisine identity signals.
- `getCraftEvolutionLabProgramArchitecture()`: exposes the umbrella architecture and child queue links for coordination.
- `getCraftEvolutionLabSwarmBuildPath()`: exposes the five-wave build path with auth, tenant-scope, proof, runtime, and mobile gates.
- `evaluateCraftEvolutionLabSliceReadiness()`: verifies that a fired slice carries every required program contract key before implementation is treated as ready.

## Program Architecture And Swarm Build Path

The umbrella program item coordinates the extracted Craft Evolution Lab build family:

- Parent: `BQ-20260520T183000Z-chef-life-craft-evolution-lab-program`.
- Foundation slice: `BQ-20260520T183100Z-chef-life-craft-evolution-lab-foundation`.
- Surface slice: `BQ-20260520T183100Z-chef-life-craft-evolution-lab-surface`.
- Decision integration slice: `BQ-20260520T183100Z-chef-life-craft-evolution-lab-decision-integration`.
- Proof/security slice: `BQ-20260520T183100Z-chef-life-craft-evolution-lab-proof-security`.

Every narrower slice must carry:

- Source spec: `docs/specs/chef-life-expansion-swarm-spec-pack.md`, Program 8.
- Product domain: Culinary Craft / R&D / Signature Dishes.
- Data ownership: chef-owned tenant memory scoped from `user.entityId` or `user.tenantId`.
- User roles: chef private owner, client scoped safe-copy recipient, public approved proof viewer, no default staff/vendor/partner access, admin diagnostics only.
- Security/privacy: chef server actions start with `requireChef()` or a justified multi-role `requireAuth()`; tenant-data queries scope through `user.entityId` or `user.tenantId`; public/profile output uses `ProfileSafeCraftOutput`; raw private memory never publishes.
- Integration points: dish index, recipes, menus, workflow notes, feedback, taste memory, public profile, discovery, media, and Remy.
- Proof expectations: acceptance evidence, wiring proof, runtime proof or explicit no-runtime-impact statement, verification output, mobile proof at 390px and 430px for UI slices, and build-queue finish-check.

The build path is:

1. Domain/Data/Security: preserve source, define model and ownership, prove no duplicate system, encode auth and tenant rules.
2. Capture/Memory: add quick capture, experiment lifecycle, source refs, and media/proof refs only after source ownership is settled.
3. Surfaces: add chef-only Craft Lab route, dish timeline, signature board, technique panels, and mobile-safe loading/empty/error states.
4. Public/Client Integration: emit only safe DTOs for profile, discovery, client-safe stories, and Remy non-chef contexts.
5. Verification: test visibility filtering, tenant isolation, public leakage, route/action gates, mobile widths, runtime behavior at `http://localhost:3100`, wiring audit, proof pack, and finish-check.

## Ownership Boundaries

- Owning deterministic contract: `lib/intelligence`.
- Existing dish catalog ownership stays in `lib/menus/dish-index-actions.ts`, `app/(chef)/culinary/dish-index/*`, and `dish_index`.
- Existing recipe and menu ownership stays in recipe/menu modules, menu editor components, and canonical dish source actions.
- Existing note ownership stays in `workflow_notes`, note-menu links, and dish-note lineage.
- Existing client and guest feedback ownership stays in feedback, review, testimonial, event, and dish quality modules.
- Existing public identity ownership stays in profile, discovery, showcase, public profile, and media modules.
- Existing Remy/CIL ownership stays in Remy and CIL modules. They may summarize or suggest craft facts, but they do not publish or trust facts automatically.
- `lib/ui/signature-workflow-*` remains an operational workflow system and must not become a signature dish board.

The Craft Evolution Lab is a synthesis and visibility layer. It may read from existing systems, but it must not become a second recipe database, menu editor, dish catalog, note system, feedback system, public profile editor, media library, or Remy memory store.

## Visibility And Privacy Rules

- Default visibility is `private_only`.
- Private craft facts include unfinished dish ideas, failed tests, private inspiration notes, client-specific reactions, rejected proof, chef self-critique, pricing/operational concerns, and any source that could identify a client without consent.
- `chef_internal` may appear only on authenticated chef routes and chef-mode Remy context.
- `client_safe` may include only approved menu-story language for a scoped client context. It must not expose private R&D notes, other-client reactions, or unapproved proof.
- `requires_evidence` is not public. It marks a candidate that needs proof before profile or website use.
- `public_profile` and `website_only` require explicit approval, evidence refs, public copy, and asset/source rights.
- `never_publish` must never be emitted to public profile, website, discovery, client, staff, or partner surfaces.
- Public profile and discovery must consume only `ProfileSafeCraftOutput` or equivalent safe DTOs.

## Role Boundaries

- Chef: can read and manage private craft notes, experiments, signature candidates, technique goals, inspiration, tastings, reactions, proof review, and public-safe outputs.
- Client: can receive only `client_safe` menu-story or proof copy for their scoped context, never raw craft memory or other-client reactions.
- Public anonymous user: can see only approved `public_profile` or `website_only` proof and cuisine identity signals.
- Staff/vendor/partner: no default Craft Evolution Lab access. Any future access must be explicitly scoped to event execution and must not include private R&D notes.
- Admin: no routine access to raw tenant craft memory. Admin diagnostics must be `requireAdmin()` gated and should inspect system health, not private craft content.
- Developer/build agents: can edit this contract and later implementation only through fired queue/growth work.

## Route, API, Server Action, And DB Contract

This foundation slice adds no route, API, server action, migration, or DB query.

All future chef-side Craft Evolution Lab server actions must:

- Start with `requireChef()` for chef-only reads/writes, or `requireAuth()` only when the action is explicitly multi-role.
- Derive ownership from `user.entityId` or `user.tenantId!`, never request body fields or route params alone.
- Scope every tenant-data query with `.eq('tenant_id', user.tenantId!)`, `.eq('chef_id', user.entityId ?? user.tenantId!)`, or the equivalent table-specific tenant check.
- Verify linked `dish_id`, `recipe_id`, `menu_id`, `event_id`, `client_id`, `note_id`, `feedback_id`, `media_asset_id`, and `proof_candidate_id` belong to the same tenant before reading, writing, promoting, publishing, or linking.
- Treat route params such as `params.dishId`, `params.eventId`, or `params.proofId` as selectors only after tenant ownership is proven.
- Revalidate only affected chef routes such as `/culinary`, `/culinary/dish-index`, `/culinary/dish-index/[id]`, `/culinary/recipes`, `/settings/my-profile`, `/settings/public-profile`, and future Craft Lab routes.

All future public/profile APIs must:

- Avoid raw private craft reads.
- Return only explicit safe DTOs such as `ProfileSafeCraftOutput`.
- Require approved proof state, public/profile visibility, evidence refs, public copy, and asset rights before publication.
- Avoid exposing tenant ids, client ids, private notes, rejected experiments, unapproved client reactions, Remy private summaries, or source refs that disclose private tenant data.

When future routes are added, register them in `lib/auth/route-policy.ts` under the correct chef, client, staff, partner, admin, or public bucket.

## Integration Points

- Dish experiments: compose `workflow_notes`, `dish_index`, `dish_index_note_links`, recipes, menu dishes, canonical components, and event appearances before adding new experiment persistence.
- Signature candidates: use existing `dish_index.is_signature`, rotation status, appearances, feedback, photos, and proof candidates as inputs. Do not overload operational `signature_workflows`.
- Technique goals: derive evidence from recipes, components, menu history, taste memory, culinary profile patterns, and manually confirmed technique goals.
- Inspiration sources: capture private sources from workflow notes, manual chef input, market/season/client request context, and media refs with attribution and privacy.
- Tasting results: use dish feedback, guest feedback, post-event notes, staff meal notes, and private tastings as evidence with state and source refs.
- Client reactions: keep raw reactions private unless explicitly approved and consented. Public testimonials/reviews remain governed by existing review/testimonial/public-profile systems.
- Public proof candidates: map approved photos, testimonials, menu stories, class topics, reviews, videos, and portfolio entries into proof candidates with evidence requirements.
- Profile-safe outputs: feed only approved `ProfileSafeCraftOutput` into public profile, discovery, website/showcase, classes/products, and client-safe menu stories.
- Remy: chef mode may summarize private craft evolution with source refs and redaction counts. Client/public mode may only use safe DTOs.

## State Rules

- `idea`: untested concept, private by default.
- `draft`: shaped note or dish concept, not yet cooked or served.
- `test`: planned or active R&D test.
- `tested`: cooked or tasted outside a full client service.
- `served`: appeared in an event/menu/client context.
- `refined`: changed after testing, serving, or feedback.
- `signature`: approved as a signature candidate or dish.
- `retired`: no longer active for service or public identity.
- `archived`: retained for history but not active.
- `unknown`: state cannot be inferred from available sources.

Only `signature` plus approved public readiness can feed a public signature dish output. `retired`, `archived`, `requires_evidence`, and `never_publish` must not be published.

## Likely Files For Later Slices

- Contract and deterministic filtering: `lib/intelligence/craft-evolution-lab-contract.ts`, future `lib/intelligence/craft-evolution-lab.ts`.
- Chef Craft Lab route: future `app/(chef)/culinary/craft-lab/*` or another registered chef-protected route.
- Dish catalog inputs: `lib/menus/dish-index-actions.ts`, `app/(chef)/culinary/dish-index/*`, `components/menus/*`.
- Recipe/menu inputs: recipe actions, menu actions, `lib/menus/dish-source-actions.ts`, `lib/menus/canonical-dish-menu-core.ts`.
- Note lineage inputs: `workflow_notes`, `dish_index_note_links`, future note action wrappers.
- Feedback inputs: `lib/intelligence/dish-quality-tracker.ts`, feedback/review/testimonial actions, event post-service modules.
- Cuisine identity inputs: `lib/culinary/taste-memory-actions.ts`, `lib/discovery/culinary-profile-snapshot.ts`, public profile/profile settings modules.
- Media/proof inputs: existing media, showcase, review, testimonial, public profile, and discovery modules.
- Security registration: `lib/auth/get-user.ts`, `lib/auth/route-policy.ts`, route/API files added by later slices.

## Fire-Time Checklist For Later Build Slices

- Re-read this contract, the queue item, and Program 8 in `docs/specs/chef-life-expansion-swarm-spec-pack.md`.
- Run `git status --short` and preserve unrelated dirty work.
- Confirm whether existing dish index, recipes, menus, workflow notes, feedback, taste memory, profile, discovery, showcase, media, Remy, or CIL modules already satisfy the requested data need.
- If adding persistence, add `tenant_id` or `chef_id`, RLS, tenant/status/visibility indexes, source refs, evidence refs, approval fields, and explicit privacy comments.
- Confirm every server action starts with `requireChef()` or a justified `requireAuth()`.
- Confirm every tenant query uses `user.entityId` or `user.tenantId!` for `.eq('tenant_id', ...)` or `.eq('chef_id', ...)`.
- Confirm linked route params and foreign keys are always paired with tenant ownership checks.
- Confirm every new page route is classified in `lib/auth/route-policy.ts`.
- Confirm public/profile/client outputs use only safe DTOs and never raw private craft memory.
- Add tests for visibility filtering, proof publication gates, tenant isolation, route param tampering, source ownership, public profile leakage, client-safe redaction, and private Remy summary boundaries when behavior is implemented.

## Acceptance Mapping

- Domain objects: defined in `lib/intelligence/craft-evolution-lab-contract.ts`.
- States: craft lifecycle states, public proof states, visibility states, public-readiness states, and technique goal states are explicit.
- Ownership: this document assigns deterministic synthesis to `lib/intelligence` while preserving dish index, recipes, menus, notes, feedback, profile, discovery, media, and Remy ownership.
- Visibility: private-only, chef-internal, client-safe, public-profile, website-only, requires-evidence, and never-publish boundaries are explicit.
- Likely files: listed above for later slices.
- Role boundaries: chef/client/public/staff-vendor-partner/admin/developer boundaries are explicit.
- Fire-time inspection checklist: included above.
- No duplicate system: existing storage and source modules remain authoritative for the foundation slice.
