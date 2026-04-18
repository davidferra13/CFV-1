# Spec: System Surface and Role Classification Foundation

> **Status:** verified
> **Priority:** P0
> **Depends on:** none
> **Estimated complexity:** medium
> **Built by:** Opus 4.6 (builder gate session 2026-04-17)

## Timeline

| Event         | Date                 | Agent/Session           | Commit     |
| ------------- | -------------------- | ----------------------- | ---------- |
| Created       | 2026-04-02 13:45 EDT | Codex (planner)         | `0faaab45` |
| Status: ready | 2026-04-02 13:45 EDT | Codex (planner)         | `0faaab45` |
| Refined       | 2026-04-02 14:01 EDT | Codex (planner)         | `7ce07bd0` |
| Research pass | 2026-04-02 14:27 EDT | Codex (planner)         | `3ebd8d57` |
| Gap closure   | 2026-04-17           | Opus 4.6 (builder gate) | dirty      |
| Verified      | 2026-04-17           | Opus 4.6 (builder gate) | dirty      |

---

## Developer Notes

### Raw Signal

Another agent is already doing the full forensic feature inventory. Do not redo that work. This work has a different job: take everything that exists, whether already discovered or still being discovered, and define the correct system structure around it.

ChefFlow is one system, not multiple apps. It is a unified operating system with multiple surfaces serving different roles. Do not fragment it. Define the complete and correct model of all system surfaces, all user roles, how features map across both, where each feature should live, and where the current system is misaligned.

The required surfaces are public, chef, client, admin, and partner. Each surface needs a purpose, what belongs there, and what must not be there. The required roles are chef, staff, client, partner, and admin. Each role needs access boundaries, forbidden visibility, and differentiation from similar roles. Staff is not a chef fork. It is a restricted operational role. Partner is not a chef. It is an external relationship role.

Build the mapping model so every feature can be placed with a canonical surface, allowed roles, and an exposure level. The inventory agent should be able to plug every feature into this structure and immediately know where it belongs, who should see it, and whether it is misplaced. This means defining the system classifier, not just writing a descriptive essay.

The classifier must explicitly determine surface from route structure, component usage, and data ownership. It must determine roles from auth logic and behavior. It must detect misplaced features, duplicated logic across surfaces, and features that should be split. It must assume likely current problems such as admin tools leaking into chef experience, missing partner structure, role confusion, and fragmented exposure.

The target shape is ChefFlow OS with Public Surface, Chef Portal, Client Portal, Partner Surface, and Admin / Mission Control. Chef and Staff both live under the chef portal, but they are not the same role. The deliverables are `docs/system-architecture.md`, `docs/feature-classification-rules.md`, and `types/system.ts`.

Beyond the initial structural ask, there is a broader concern that the product has grown beyond its default setup and may now be inconsistent or structurally dishonest. The architecture needs to leave room for checking whether terminology is coherent, whether relationships and dependencies are clearly established, whether hidden or silent failures exist, whether the current organization is still correct for the system's scale, and whether the most valuable next step is polish, debugging, consolidation, or expansion.

The structure work must also be grounded in reality, not just source code. Do thorough, accurate research using multiple methods and sources on how developers currently handle this class of system and how chefs currently handle the operating workflow ChefFlow is trying to unify. Cross-check the findings, identify real workflows, where they break, and what is missing, then use those insights to improve the planning work directly.

The planning process itself matters. Read the code thoroughly, not just a few files. Log the session. Produce a plain-English current-state checkpoint before the spec. Capture the developer's words permanently in the spec. Answer every planner-gate validation question with file paths and line numbers. Tell the next builder what they would get wrong if they guessed. Do not anchor this work around excluded hosting-vendor assumptions that are not part of the product direction.

### Developer Intent

- **Core goal:** create the canonical architecture and classification foundation that the separate inventory effort will plug into, so ChefFlow can be understood and governed as one coherent operating system.
- **Key constraints:** do not redo inventory work; do not split ChefFlow into fake separate apps; do not collapse staff into chef or partner into chef; do not let route folders alone decide ownership; preserve developer reasoning permanently inside the spec.
- **Motivation:** the product has grown into multiple overlapping shells, token flows, roles, and naming systems. Without a hard structural model, builders will keep classifying by convenience, folder name, or existing leakage instead of by correct ownership and trust boundary.
- **Research requirement:** validate the architecture against real current developer and chef workflows, not just internal assumptions. The model should reflect how multi-surface systems are actually separated and how chefs actually move work from intake through execution and close-out.
- **Success from the developer's perspective:** every incoming feature can be mapped to `currentSurface`, `correctSurface`, `roles`, and `exposure`; misplacements become obvious; the inventory agent has a stable classifier; and the builder has enough reasoning to implement the docs and shared types without inventing policy.

---

## What This Does (Plain English)

This spec creates ChefFlow's canonical surface and role model. It tells the next builder to produce three permanent repo artifacts: one architecture document, one feature-classification rules document, and one shared TypeScript type file. Together, those outputs define what ChefFlow is, who it serves, how features should be placed, and how to detect structural drift when the separate inventory lands.

---

## Why It Matters

ChefFlow already has multiple route groups, shells, token-based entry points, and role-specific behaviors, but the governing model is implicit and inconsistent. Without a canonical classifier, the inventory will become a list instead of a system, and future builders will keep reinforcing the current leakage instead of correcting it. The risk gets worse if the classifier is derived only from code shape. Real developer and chef workflows show that delivery paths, actor ownership, and trust boundaries routinely diverge.

---

## Files to Create

| File                                   | Purpose                                                                                                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `docs/system-architecture.md`          | Canonical explanation of ChefFlow's surfaces, roles, boundaries, target architecture, and current structural misalignment           |
| `docs/feature-classification-rules.md` | Deterministic rules for mapping any feature to a surface, role set, and exposure level, plus misplacement and duplication detection |
| `types/system.ts`                      | Shared TypeScript unions and interfaces for `Surface`, `Role`, `Exposure`, and `FeaturePlacement`                                   |

---

## Files to Modify

None.

This is intentionally a documentation-and-types foundation. It must not rewrite runtime auth, layouts, middleware, or navigation in the same build.

---

## Database Changes

None.

---

## Data Model

The builder must create the following shared type contract in `types/system.ts`:

```ts
export type Surface = 'public' | 'chef' | 'client' | 'admin' | 'partner'

export type Role = 'chef' | 'staff' | 'client' | 'partner' | 'admin'

export type Exposure = 'visible' | 'hidden' | 'gated' | 'internal'

export type FeaturePlacement = {
  featureId: string
  currentSurface?: Surface
  correctSurface: Surface
  roles: Role[]
  exposure: Exposure
  notes?: string
}
```

Semantics the builder must preserve in the docs and types:

- `currentSurface` means the current canonical surface where the feature is effectively being delivered today, not the raw route-group name.
- `correctSurface` means the architectural owner. This is the field used to detect misplacement.
- `roles` means the allowed actor set, not every role that can indirectly observe some side effect.
- `exposure` describes how reachable the feature should be in its owning surface:
  - `visible`: normal navigation
  - `hidden`: implemented but intentionally tucked away
  - `gated`: user-facing but invite, token, claim, or module gated
  - `internal`: platform/internal only

Critical modeling rule:

- Staff is a role, not a surface.
- There may be staff-specific delivery paths such as `/staff-dashboard` and tokenized staff briefings, but their correct surface remains `chef`.
- Public token delivery does not automatically make `correctSurface = 'public'`.

---

## Source Set and Evidence

The builder must ground the docs in these verified source files:

- `docs/app-complete-audit.md:63-69,532-564,567-610` for existing staff, client, and pipeline surface breadth.
- `docs/specs/comprehensive-domain-inventory-phase-1.md:21-28,78-80,106-116` for the companion inventory scope and the explicit "list first, classify later" boundary.
- `docs/research/how-food-operators-deal-with-what-we-solve.md:9-18,22-29,44-95,97-167,169-225` for the seven-stage operator lifecycle, progressive intake reality, and where operator workflows break today.
- `docs/research/directory-operator-and-developer-workflows-2026-04-02.md:9-18,72-129,131-172` for cross-checked developer/operator patterns around central source of truth, delegated management, and outward delivery.
- `docs/research/developer-and-chef-workflow-research-for-surface-classification-2026-04-02.md:7-29,33-77,79-137,139-186,188-221` for the cross-checked research synthesis that ties current code structure to current developer and chef workflow reality.
- `middleware.ts:20-27,63-140` for current redirect and surface-gating behavior.
- `lib/auth/route-policy.ts:98-107,131-141,162-229` for protected and public route families including admin, partner-report, and staff portal paths.
- `lib/auth/get-user.ts:15-33,78-113,173-258,267-272` for role resolution and the difference between chef/client and partner/staff handling.
- `lib/auth/admin.ts:1-18,39-57` for separate persisted admin access.
- `lib/auth/request-auth-context.ts:21-27,44-90` for the current middleware auth context only supporting chef/client.
- `app/(public)/layout.tsx:1-30`, `app/(chef)/layout.tsx:67-171`, `app/(client)/layout.tsx:25-49`, `app/(staff)/layout.tsx:20-42`, `app/(partner)/partner/layout.tsx:13-41`, `app/(admin)/layout.tsx:1-47` for the live shells.
- `components/navigation/nav-config.tsx:3,193-202,229-320,1593-1634,1923-1935` and `components/navigation/chef-nav.tsx:15-16` for admin leakage and terminology drift in shared navigation.
- `app/client/[token]/page.tsx:1-31`, `app/(public)/partner-report/[token]/page.tsx:1-45`, `app/(public)/staff-portal/[id]/page.tsx:15-75`, `app/(public)/proposal/[token]/page.tsx:37-58`, `app/intake/[token]/page.tsx:1-68`, `app/(chef)/settings/client-preview/page.tsx:1-27,103-120`, and `app/(partner)/partner/dashboard/page.tsx:1-5,49-80` for public-delivered but non-public-owned experiences.
- `lib/client-portal/actions.ts:3-16,88-121,146-220`, `lib/staff/staff-event-portal-actions.ts:1-4,75-158,246-257`, and `lib/partners/portal-actions.ts:3-7,79-118,118-176,207-220` for role behavior and data exposure constraints.
- `database/migrations/20260215000001_layer_1_foundation.sql:157-172` plus `lib/db/schema/schema.ts:469-485,2033-2060,17430-17495,22300-22318,22482-22625` for role and entity storage.

---

## Research-Backed Workflow Constraints

The builder must preserve these workflow realities in the output documents:

- One named business workflow can span multiple surfaces. Discovery, drafting, approval, execution, and reporting are often owned by different actors.
- Public should generally own discovery and minimal first-contact intake, not the full long-lived client or partner relationship.
- Chef should own drafting, planning, costing, execution, and internal management, even when previews or temporary links exist elsewhere.
- Client should own review, approval, payment, and ongoing customer visibility, even when access starts through email or token links.
- Staff should remain a constrained role inside chef operations. Separate staff routes and briefings are delivery lanes, not proof of a sixth canonical surface.
- Partner should remain a scoped external-collaboration surface and must not inherit chef CRM, staff operations, or internal mission-control powers.
- Admin should be treated as a true internal control plane. Current admin-in-chef-shell leakage is an implementation smell, not a classification rule.
- Invite or token delivery changes exposure and sometimes `currentSurface`. It does not automatically change `correctSurface`.

These constraints are supported by both current repo evidence and the research synthesis in `docs/research/developer-and-chef-workflow-research-for-surface-classification-2026-04-02.md`.

---

## Document Requirements

The builder must make the outputs immediately usable by the inventory agent and future builders. The documents are not free-form. They must include the structure below.

### `docs/system-architecture.md`

It must include:

1. A clear opening statement that ChefFlow is one system, not a collection of separate apps.
2. The target shape:
   - Public Surface
   - Chef Portal
   - Client Portal
   - Partner Surface
   - Admin / Mission Control
3. A section for each canonical surface with:
   - purpose
   - what belongs there
   - what must not be there
4. A section for each role with:
   - what the role can access
   - what the role should never see
   - how it differs from adjacent roles
5. A section explicitly calling out current misalignment risks already visible in code:
   - admin using chef shell
   - admin discoverability inside shared chef navigation
   - public token routes that actually belong to client, partner, or chef-owned staff flows
   - auth-context mismatch where middleware context only carries chef/client
   - terminology drift such as Finance vs Money vs Financials and My Profile vs Network Profile
6. A "boundary rules" section explaining that route structure is evidence, not truth.
7. A "lifecycle ownership" section that maps discovery, intake, proposal, booking, planning, execution, and close-out across the correct surfaces and explains that one business workflow can span multiple surfaces.

### `docs/feature-classification-rules.md`

It must include:

1. The exact type contract above.
2. A precedence-ordered classifier for deciding `correctSurface`.
3. Rules for deciding `currentSurface` without blindly copying raw route groups.
4. Rules for determining `roles` from auth and behavior.
5. Rules for determining `exposure`.
6. Rules for detecting:
   - misplaced features
   - duplicated logic across surfaces
   - features that should be split into separate placements
7. A worked-examples section that includes at least:
   - authenticated chef page
   - authenticated client page
   - authenticated partner page
   - staff portal page
   - public client token page
   - public staff briefing link
   - public partner report
   - chef-side client preview page
   - admin tool currently rendered through chef shell
8. A companion-workflow section explaining how the inventory agent should apply the classifier when features arrive.
9. A lifecycle-splitting section explaining how one named workflow such as inquiry -> quote -> booking may require multiple `FeaturePlacement` records across public, chef, client, partner, or admin.

### `types/system.ts`

It must export the unions and interface exactly as above, with `Exposure` separated out as its own type.

Current-repo gap to correct:

- The existing draft file at `types/system.ts` is close, but not fully aligned. It currently exports `FeatureExposure` instead of `Exposure` and includes extra classifier helper types/constants. The builder must normalize the file to the canonical contract required by this spec instead of treating the current draft shape as authoritative.

---

## Server Actions

None.

This spec introduces no runtime server actions and must not mutate existing auth or feature behavior in the same build.

---

## UI / Component Spec

### Page Layout

No user-facing page or component behavior changes are part of this spec. This is a documentation and shared-type deliverable only.

### States

- **Loading:** No runtime loading-state changes.
- **Empty:** Not applicable to product UI. The documents themselves must not omit any required surface, role, or classifier section.
- **Error:** Do not publish vague or speculative rules. If a rule cannot be supported by the verified code, mark it as an explicit uncertainty instead of pretending it is settled.
- **Populated:** The docs explain the system structure completely enough that the inventory agent can assign surface, roles, and exposure for any feature without re-deriving policy.

### Interactions

The only interactions in scope are builder interactions with repo files:

- write the two docs and one shared type file
- preserve the Developer Notes in this spec
- keep the classifier deterministic and precedence-based
- avoid adding runtime code changes "while here"

---

## Edge Cases and Error Handling

| Scenario                                                               | Correct Behavior                                                                                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public route delivers a client experience via token                    | Record `currentSurface: 'public'`, `correctSurface: 'client'`, roles `['client']`, exposure `gated`                                               |
| Public route delivers a staff event briefing via token                 | Record `currentSurface: 'public'`, `correctSurface: 'chef'`, roles `['staff']`, exposure `gated`                                                  |
| Public route delivers a partner contribution report                    | Record `currentSurface: 'public'`, `correctSurface: 'partner'`, roles `['partner']`, exposure `gated`                                             |
| Chef preview page renders client or public content for internal review | Keep `correctSurface: 'chef'` because the actor and ownership are chef-side                                                                       |
| Admin page currently rendered inside chef shell                        | Mark as `currentSurface: 'chef'` if the shared chef shell meaningfully owns delivery today, but `correctSurface: 'admin'`; call it a misplacement |
| Staff-authenticated page has its own route family                      | Keep `correctSurface: 'chef'` and roles `['staff']`; do not invent a sixth canonical surface                                                      |
| Feature mixes chef-management and partner self-service behavior        | Split into two placements instead of collapsing them into one "partners" feature                                                                  |
| A route is public but writes or reveals tenant-internal data           | Treat it as a misalignment unless the delivery is explicitly token-gated and intentionally externalized                                           |

---

## Verification Steps

1. Open `docs/system-architecture.md` and verify it contains all five surfaces and all five roles with purpose, belongs, must-not, access, forbidden visibility, and differentiation sections.
2. Verify `docs/system-architecture.md` explicitly states that ChefFlow is one system and includes a current-misalignment section calling out admin leakage, public-token ownership drift, and terminology drift.
3. Open `docs/feature-classification-rules.md` and verify it defines rules for:
   - surface from route structure, component usage, and data ownership
   - roles from auth logic and feature behavior
   - exposure
   - misplaced features
   - duplicated logic
   - split-required features
4. Verify `docs/feature-classification-rules.md` includes worked examples for client token, staff portal token, partner report token, chef preview, partner self-service, and admin-inside-chef-shell.
5. Open `types/system.ts` and verify it exports `Surface`, `Role`, `Exposure`, and `FeaturePlacement`.
6. Run `npx tsc --noEmit --skipLibCheck` and confirm the new type file does not introduce type errors.
7. Compare the finished docs against this spec's Developer Notes and confirm the reasoning, not just the outputs, was preserved.

---

## Out of Scope

- Rebuilding layouts, nav, or middleware to enforce the new structure
- Changing route groups or renaming routes
- Expanding request auth context to carry staff, partner, or admin
- Splitting admin into a new runtime shell
- Performing the domain inventory itself
- Renaming UI copy across the product
- Reworking deployment or hosting strategy

---

## Notes for Builder Agent

- Queue placement: this spec is `ready`, `P0`, and `Depends on: none`, so it is eligible for immediate builder claim once a builder is operating inside a clean, buildable execution context.
- Builder scope is narrow: align only `docs/system-architecture.md`, `docs/feature-classification-rules.md`, and `types/system.ts` to this spec's canonical contract. Do not expand into runtime enforcement, route moves, or auth refactors in the same pass.
- Do not classify by route alone. Public token delivery and chef preview pages prove that route family is only one signal.
- Use the workflow research, not just the route tree. Real comparable systems separate internal control planes, tenant workspaces, and constrained external portals even when invites, tokens, or alternate login paths are involved.
- Reflect progressive intake. Public discovery and first-contact inquiry are not the same thing as the long-lived client relationship or client workspace.
- Split lifecycle features by actor boundary when necessary. Quote drafting, client approval, staff execution, and partner reporting are related, but they are not one placement.
- Do not treat current leakage as architecture. The point is to name the correct owner even when the current shell is wrong.
- Do not invent a sixth canonical surface for staff. Staff is a restricted role inside chef operations.
- Do not collapse chef-side partner management and partner self-service into one placement. They are related, but not the same feature owner.
- Preserve the developer's reasoning. The builder must understand why this system must remain one OS with multiple surfaces instead of drifting into multiple pseudo-products.

---

## Planner Validation (Planner Gate Evidence)

### 1. What exists today that this touches?

- The app already has distinct public, chef, client, staff, partner, and admin delivery shells: `app/(public)/layout.tsx:1-30`, `app/(chef)/layout.tsx:67-171`, `app/(client)/layout.tsx:25-49`, `app/(staff)/layout.tsx:20-42`, `app/(partner)/partner/layout.tsx:13-41`, `app/(admin)/layout.tsx:1-47`.
- Middleware already redirects and protects by role, but only explicitly gates chef, client, and staff route families: `middleware.ts:20-27,63-140`.
- Route policy already knows about staff, public tokenized flows, and admin paths: `lib/auth/route-policy.ts:98-107,131-141,162-229`.
- Role logic is already split between base portal auth, partner/staff role resolution, and persisted platform admin access: `lib/auth/get-user.ts:15-33,78-113,173-258,267-272`; `lib/auth/admin.ts:1-18,39-57`.
- Middleware request context currently only carries chef/client roles: `lib/auth/request-auth-context.ts:21-27,44-90`.
- Shared navigation already mixes chef and admin discoverability and contains naming drift: `components/navigation/nav-config.tsx:3,193-202,229-320,1593-1634,1923-1935`.
- Public token routes already deliver client, staff, partner, and proposal experiences: `app/client/[token]/page.tsx:1-31`; `app/(public)/staff-portal/[id]/page.tsx:15-75`; `app/(public)/partner-report/[token]/page.tsx:1-45`; `app/(public)/proposal/[token]/page.tsx:37-58`; `app/intake/[token]/page.tsx:1-68`.
- Chef preview and partner self-service already show why actor/ownership beats route group alone: `app/(chef)/settings/client-preview/page.tsx:1-27,103-120`; `app/(partner)/partner/dashboard/page.tsx:1-5,49-80`.
- The underlying data model already stores the relevant roles and entity records: `database/migrations/20260215000001_layer_1_foundation.sql:157-172`; `lib/db/schema/schema.ts:469-485,2033-2060,17430-17495,22300-22318,22482-22625`.
- The companion inventory spec is already explicitly scoped to listing, not classification: `docs/specs/comprehensive-domain-inventory-phase-1.md:21-28,78-80,106-116`.

### 2. What exactly changes?

- Add `docs/system-architecture.md` with the canonical surface and role model, target architecture, boundaries, and current misalignment notes.
- Add `docs/feature-classification-rules.md` with deterministic placement, role, and exposure rules plus misplacement/duplication/split detection.
- Add `types/system.ts` exporting `Surface`, `Role`, `Exposure`, and `FeaturePlacement`.
- No routes, layouts, middleware, auth helpers, database schema, or server actions change in this spec.

### 3. What assumptions are you making?

- **Verified:** ChefFlow is already implemented as multiple delivery shells over one shared domain model, not separate isolated products. Evidence: the layout files and shared auth/data tables cited in question 1.
- **Verified:** Staff and partner are distinct roles with distinct auth paths today and must not be collapsed into chef. Evidence: `lib/auth/get-user.ts:173-258`; `lib/db/schema/schema.ts:2033-2060,17430-17495`.
- **Verified:** Admin is a separate persisted access system and not just another chef permission bit. Evidence: `lib/auth/admin.ts:1-18,39-57`; `lib/db/schema/schema.ts:22300-22318`.
- **Verified:** Public token routes can represent client, partner, or chef-owned staff experiences, so route family is not sufficient to determine ownership. Evidence: `app/client/[token]/page.tsx:1-31`; `app/(public)/staff-portal/[id]/page.tsx:15-75`; `app/(public)/partner-report/[token]/page.tsx:1-45`; `lib/client-portal/actions.ts:146-220`; `lib/staff/staff-event-portal-actions.ts:1-4,246-257`; `lib/partners/portal-actions.ts:79-118`.
- **Verified:** Real operator workflow is progressive and actor-shifting, which means discovery/intake, internal planning, client approval/payment, and staff execution should not be collapsed into one surface just because they belong to one business lifecycle. Evidence: `docs/research/how-food-operators-deal-with-what-we-solve.md:22-29,44-95,97-167,169-225`; `docs/research/developer-and-chef-workflow-research-for-surface-classification-2026-04-02.md:79-186`.
- **Verified:** Current comparable developer systems separate portal-only external access, employee/internal access, and internal control authority. That supports the spec's admin/client/partner separation and the rule that delivery path does not equal ownership. Evidence: `docs/research/developer-and-chef-workflow-research-for-surface-classification-2026-04-02.md:33-77,188-221`.
- **Unverified but non-blocking:** The exact long-term enforcement mechanism for making runtime code obey this classifier is not part of the current request. This spec intentionally stops at docs and types. That is supported by the requested output files and by the companion inventory spec being classification-adjacent rather than build execution: `docs/specs/comprehensive-domain-inventory-phase-1.md:44-60`.

### 4. Where will this most likely break?

- **Route-based false positives:** A builder may classify token pages as public-owned because the URL lives under a public route. The token routes and their backing actions prove that would be wrong: `app/client/[token]/page.tsx:1-31`; `app/(public)/staff-portal/[id]/page.tsx:15-75`; `lib/client-portal/actions.ts:146-220`; `lib/staff/staff-event-portal-actions.ts:1-4,246-257`.
- **Admin/chef conflation:** A builder may read the current admin layout and nav leakage as proof that admin belongs to chef. The code shows the opposite: admin has separate persisted access but currently reuses chef shell/presentation: `lib/auth/admin.ts:1-18,39-57`; `app/(admin)/layout.tsx:1-47`; `components/navigation/nav-config.tsx:229-320`.
- **Staff-as-surface drift:** Because the repo has `/staff-*` routes and a staff layout, a builder may invent a sixth canonical surface. The developer's required canonical surface set excludes that, and the role/auth model supports staff as a restricted operator role instead: `app/(staff)/layout.tsx:1-42`; `lib/auth/get-user.ts:218-258`.

### 5. What is underspecified?

- Without this spec, `currentSurface` versus `correctSurface` is underspecified. This spec resolves that explicitly by making `currentSurface` about present delivery and `correctSurface` about architectural owner.
- Without this spec, staff could be modeled either as a separate surface or as a chef sub-role. This spec resolves it: staff is a role only, not a canonical surface.
- Without this spec, builders could treat "partner features" as one blob. This spec requires separating chef-side partner management from partner self-service.
- Without this spec, a builder could preserve the existing draft `types/system.ts` shape even though it does not exactly match the required export contract. This spec resolves that by making the canonical type names and interface explicit.
- The only intentionally flexible area is the exact prose style of the two documents. The structure, required sections, and examples are not flexible.

### 6. What dependencies or prerequisites exist?

- There is no schema or migration prerequisite. The required data already exists in `user_roles`, `clients`, `staff_members`, `referral_partners`, and `platform_admins`: `database/migrations/20260215000001_layer_1_foundation.sql:157-172`; `lib/db/schema/schema.ts:469-485,2033-2060,17430-17495,22300-22318,22482-22625`.
- The companion inventory spec is a prerequisite in the workflow sense, not the implementation sense. This classifier is designed to receive inventory output when it arrives, but it does not need the inventory to finish first: `docs/specs/comprehensive-domain-inventory-phase-1.md:21-28,78-80,106-116`.
- The builder must use the planner template and preserve Developer Notes permanently, per the repo planning rules: `CLAUDE.md:484-551`; `docs/specs/_TEMPLATE.md:27-45`.

### 7. What existing logic could this conflict with?

- Shared navigation currently exposes admin within chef-facing structures and includes conflicting labels: `components/navigation/nav-config.tsx:193-202,229-320,1593-1634`; `components/navigation/chef-nav.tsx:15-16`.
- Middleware and request auth context currently model only part of the role system, so the docs must not overclaim current runtime enforcement: `middleware.ts:131-140`; `lib/auth/request-auth-context.ts:21-27,71-90`.
- Partner self-service uses admin DB reads after `requirePartner()`, which could be misread as admin ownership instead of partner ownership: `lib/partners/portal-actions.ts:3-7,79-118`.
- Staff token flows use public delivery plus chef-generated tokens, which could be misread as public ownership instead of chef-owned staff execution: `lib/staff/staff-event-portal-actions.ts:1-4,75-158,246-257`.

### 8. What is the end-to-end data flow?

- Inventory agent inspects a feature and records evidence from route family, shell/layout, auth guard, component usage, and data tables.
- The classifier applies precedence rules:
  1. cross-tenant or mission-control behavior -> admin
  2. staff execution inside a tenant -> chef + `roles: ['staff']`
  3. client self-service -> client
  4. partner self-service -> partner
  5. tenant operator workflows -> chef
  6. true anonymous discovery/intake/public artifacts -> public
- The classifier separately assigns `currentSurface` based on how the feature is currently delivered, then compares it with `correctSurface` to detect misplacement.
- The classifier assigns `roles` from auth and behavior, then `exposure` from navigation, gating, token use, or internal-only status.
- The output becomes a `FeaturePlacement` record in the inventory system.

The evidence inputs for that flow are verified in the files above, especially `middleware.ts:63-140`, `lib/auth/get-user.ts:78-258`, `lib/auth/admin.ts:39-57`, `components/navigation/nav-config.tsx:229-320`, and the token/page/action files listed in question 1.

### 9. What is the correct implementation order?

1. Create `docs/system-architecture.md` first so the canonical surfaces, roles, and boundaries are defined before rules reference them.
2. Create `docs/feature-classification-rules.md` second, using the architecture doc as the vocabulary source.
3. Create `types/system.ts` third so the types exactly match the written policy.
4. Re-read this spec's Developer Notes and Planner Validation before marking the work complete to ensure the reasoning and builder warnings survived.
5. Run type check last to confirm the shared type file is valid.

### 10. What are the exact success criteria?

- `docs/system-architecture.md` defines exactly five canonical surfaces: public, chef, client, admin, partner.
- `docs/system-architecture.md` defines exactly five roles: chef, staff, client, partner, admin.
- The architecture doc explicitly states that staff is a role inside chef operations and that partner is an external relationship role, not a chef variant.
- The architecture doc explicitly states that ChefFlow is one system, not multiple apps.
- `docs/feature-classification-rules.md` includes deterministic rules for surface, roles, and exposure plus misplacement, duplication, and split detection.
- The classification-rules doc includes worked examples for token-based client, staff, and partner flows plus chef preview and admin leakage.
- `types/system.ts` exports `Surface`, `Role`, `Exposure`, and `FeaturePlacement` with the required unions and interface shape.
- `types/system.ts` does not leave the older `FeatureExposure` name as the canonical exposure type.
- `npx tsc --noEmit --skipLibCheck` passes after adding the type file.

### 11. What are the non-negotiable constraints?

- Do not fragment ChefFlow into multiple pseudo-apps in the docs.
- Do not add a canonical `staff` surface.
- Do not treat current implementation leakage as normative architecture.
- Do not remove or alter auth boundaries in runtime code in this build.
- Do not let route path alone decide ownership.
- Do not compress away the developer's reasoning from the spec.

These constraints are grounded in the developer signal preserved above and in the verified current runtime boundaries: `app/(admin)/layout.tsx:1-47`; `app/(staff)/layout.tsx:1-42`; `lib/auth/get-user.ts:173-258`; `app/client/[token]/page.tsx:1-31`; `app/(chef)/settings/client-preview/page.tsx:1-27,103-120`.

### 12. What should NOT be touched?

- `middleware.ts`
- `lib/auth/*`
- `components/navigation/*`
- any `app/(*)/layout.tsx` runtime shell files
- any database migration or schema file
- `docs/specs/comprehensive-domain-inventory-phase-1.md`

Those files are evidence sources for this planning work, not implementation targets for this spec.

### 13. Is this the simplest complete version?

Yes.

The requested outputs are two docs and one shared type file. Adding runtime enforcement, shell rewrites, route moves, or auth refactors would expand this from a classification foundation into a structural refactor. The smallest complete version is to define the canon first, then let later work enforce it.

### 14. If implemented exactly as written, what would still be wrong?

- The runtime product would still have the same leakage it has today. Admin would still render through chef shell, middleware would still not explicitly gate admin route paths, and request auth context would still only carry chef/client roles: `app/(admin)/layout.tsx:1-47`; `middleware.ts:131-140`; `lib/auth/request-auth-context.ts:21-27,71-90`.
- Terminology drift in the live UI would still exist because this spec only documents it; it does not rename runtime copy: `components/navigation/nav-config.tsx:193-202,290,1593-1634,1932`.
- The inventory would still need to do the actual feature-by-feature placement work. This spec gives it the classifier, not the completed inventory: `docs/specs/comprehensive-domain-inventory-phase-1.md:21-28,76-81`.
- If a builder only glanced at the current draft artifacts instead of reading this spec carefully, they could wrongly conclude that the extra helper exports in `types/system.ts` are part of the required canonical contract. This spec allows those helpers only if the canonical exports still match exactly.

## Final Check

**Is this spec production-ready, or am I proceeding with uncertainty?**

This spec is production-ready for its scoped purpose: defining the canonical surface/role/classification foundation and the exact output files required to encode it.

**If uncertain: where specifically, and what would resolve it?**

There is one non-blocking uncertainty: the inventory may uncover fringe legacy routes or edge-case hybrid flows not explicitly named in this spec. That does not block readiness because the classifier is rule-based and precedence-driven rather than route-list-driven. If such a fringe case appears, the correct follow-up is to add another worked example to `docs/feature-classification-rules.md`, not to redesign the model.
