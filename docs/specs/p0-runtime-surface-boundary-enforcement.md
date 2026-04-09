# Spec: Runtime Surface Boundary Enforcement

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** `system-surface-role-classification-foundation.md`
> **Estimated complexity:** large (9+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event         | Date                 | Agent/Session | Commit |
| ------------- | -------------------- | ------------- | ------ |
| Created       | 2026-04-09 19:45 EDT | Planner       |        |
| Status: ready | 2026-04-09 19:45 EDT | Planner       |        |

---

## Developer Notes

### Raw Signal

The developer is not asking for more complexity. They are asking for signal. The question is whether a top-tier engineering organization would actually choose this architecture, or whether the current system merely functions while falling short of that standard.

They explicitly want a real judgment about clarity, structure, intent, and end-to-end sense. If the system only works because people remember conventions, that should be called out. If the architecture is structurally weak, confusing, unsafe, or misleading, it should be fixed in the right order.

They also made the execution posture explicit earlier in this same thread: the system is no longer in a phase of discovery. It is in a phase of decision. The right move is the smallest set of changes that creates irreversible advantage without unnecessary churn. That means understanding the current system fully, sequencing work by dependency, and turning what is already known into something durable.

### Developer Intent

- **Core goal:** convert the existing architecture model from documentation and intuition into enforced runtime boundaries, starting with the surface where leakage is most obvious: admin versus chef.
- **Key constraints:** no rewrite; no fake microservice split; no route churn for its own sake; preserve valid multi-surface behavior such as admins still being able to operate inside chef context when they are explicitly on chef routes.
- **Motivation:** the current codebase has a real surface model on paper, but runtime shell ownership, navigation ownership, and route semantics still leak together in ways that a best-in-class team would not leave implicit.
- **Success from the developer's perspective:** a builder can implement a machine-readable runtime surface contract, give admin its own shell ownership, remove admin leakage from chef navigation, and leave behind tests that make future drift obvious.

---

## What This Does (Plain English)

This spec turns ChefFlow's documented surface model into something the runtime actually respects. After it is built, `/admin` will render through an admin-owned shell and admin-owned navigation instead of borrowing chef navigation, chef navigation will stop carrying admin control-plane entries as if they are part of normal tenant workflow, and the repo will have a machine-readable runtime surface contract plus tests so future builders can tell when a route, shell, or nav owner drifts out of bounds.

---

## Why It Matters

ChefFlow is already too large to govern by memory. The printable system schematic shows `699` page routes, `316` API handlers, and `16` layout shells, so architectural intent has to be encoded, not merely described. `docs/system-schematic-pack.md:13-19`

---

## Current-State Summary

The architecture docs are currently cleaner than the runtime. The canonical model says ChefFlow is one system with five surfaces, and it explicitly says routes and folders are implementation details rather than truth. `docs/system-architecture.md:9-15`, `docs/system-architecture.md:20-39` The classifier doc also says `app/(admin)` and `/admin/**` resolve to the admin surface, while `app/(chef)` resolves to chef. `docs/feature-classification-rules.md:59-77`

But the runtime does not fully honor that. The admin layout currently says it "uses chef portal shell" and directly imports `ChefSidebar`, `ChefMobileNav`, and `ChefMainContent`, then passes `tenantId={admin.id}` into the chef sidebar even though admin is not a chef tenant. `app/(admin)/layout.tsx:1-4`, `app/(admin)/layout.tsx:8-9`, `app/(admin)/layout.tsx:42-45` The chef navigation config also still owns admin control-plane routes: `/admin`, `/admin/pulse`, and `/admin/inquiries` are in `standaloneTop`, and there is a full `admin` nav group in the same chef-owned config file. `components/navigation/nav-config.tsx:133-140`, `components/navigation/nav-config.tsx:231-239`, `components/navigation/nav-config.tsx:245-259`

That mismatch is not cosmetic. The system-architecture doc says admin is an internal control plane and that normal tenant execution workflows do not belong there, while chef is the tenant operating workspace. `docs/system-architecture.md:71-98`, `docs/system-architecture.md:155-180` Yet the current runtime makes admin feel like a chef variant instead of its own surface. That is exactly the sort of structural drift that causes future builders to classify by convenience rather than ownership.

Other structural debt still exists, including request-trust ambiguity, admin-style DB access, and build gates that ignore lint and type failures. `middleware.ts:55-70`, `lib/api/v2/middleware.ts:18-27`, `lib/db/server.ts:1-8`, `lib/db/admin.ts:1-7`, `next.config.js:71-82` Those are real issues, but this spec intentionally focuses on one architectural slice: runtime surface boundary enforcement.

---

## Files to Create

| File                                          | Purpose                                                                                                               |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `lib/surfaces/runtime-surface-contract.ts`    | Machine-readable contract for runtime surface ownership: route families, portal markers, auth guards, and nav owners. |
| `components/navigation/admin-nav-config.ts`   | Admin-only navigation definition separated from chef navigation ownership.                                            |
| `components/navigation/admin-shell.tsx`       | Admin-owned sidebar, mobile nav, provider, and main content wrapper for `/admin` routes.                              |
| `tests/unit/runtime-surface-contract.test.ts` | Verifies layout markers, route roots, and surface ownership stay aligned with the runtime contract.                   |
| `tests/unit/admin-nav-boundary.test.ts`       | Verifies admin routes are owned by admin nav and no longer leak through chef nav config.                              |

---

## Files to Modify

| File                                   | What to Change                                                                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/(admin)/layout.tsx`               | Stop rendering admin pages through chef shell components; switch to the new admin-owned shell while preserving current auth gate and shared utilities. |
| `components/navigation/nav-config.tsx` | Remove admin route entries and the admin nav group from chef-owned navigation data so chef nav stops owning `/admin` paths.                            |
| `docs/system-architecture.md`          | Add a runtime-enforcement note that points to the machine-readable contract and calls out admin-shell ownership as an enforced rule, not a suggestion. |
| `docs/feature-classification-rules.md` | Add a runtime-enforcement note explaining that the classifier now has a code-level contract for surface, shell, and nav ownership.                     |

---

## Database Changes

None.

### New Tables

None.

### New Columns on Existing Tables

None.

### Migration Notes

- No migration belongs in this spec.
- This is a runtime-boundary and navigation-ownership slice only.

---

## Data Model

This spec introduces a runtime contract, not a database contract. The builder must create a small machine-readable surface map in `lib/surfaces/runtime-surface-contract.ts` that uses the existing `Surface` union from `types/system.ts`. `types/system.ts:1-20`

The contract must express, at minimum:

- canonical surface id
- route roots or route families owned by that surface
- required auth guard or access mode
- expected `data-cf-portal` marker
- owning navigation config
- allowed exception notes when a role can legally operate in another surface without changing ownership

Minimum semantics the contract must preserve:

- `/admin/**` is admin-owned at runtime, not chef-owned. `docs/feature-classification-rules.md:59-67`, `docs/system-architecture.md:155-180`
- `app/(admin)/layout.tsx` must render with admin shell ownership, even if some low-level presentational primitives are shared. `app/(admin)/layout.tsx:1-4`, `app/(admin)/layout.tsx:36-53`
- Chef route ownership stays chef-owned even when the current user also has persisted admin access. Admin access is an additional authority, not a reason to collapse surfaces. `app/(chef)/layout.tsx:69-76`, `app/(chef)/layout.tsx:94-107`, `docs/system-architecture.md:184-200`
- Staff continues to classify into the chef surface, not a sixth canonical surface. `docs/system-architecture.md:23-29`, `docs/system-architecture.md:37-39`, `docs/feature-classification-rules.md:35-37`, `docs/feature-classification-rules.md:61-66`
- Public, client, and partner surfaces keep their existing ownership semantics and portal markers. `app/(public)/layout.tsx:12-31`, `app/(client)/layout.tsx:21-59`, `app/(partner)/partner/layout.tsx:13-43`

---

## Server Actions

None.

This spec does not introduce new UI-facing server actions and must not widen into API or data-layer hardening work.

---

## UI / Component Spec

### Page Layout

`/admin` should continue to feel like part of ChefFlow, but it must stop pretending to be chef navigation. The admin shell should preserve the current dark portal styling, shared toasts, offline handling, presence beacon, analytics identify, page info button, and founder-only Remy behavior that already exists in the admin layout. `app/(admin)/layout.tsx:10-17`, `app/(admin)/layout.tsx:23-26`, `app/(admin)/layout.tsx:36-53`

Required changes:

- Admin sidebar and mobile nav are owned by admin components, not chef components.
- Admin navigation exposes admin routes only. It must not include chef daily-workflow items like inbox, events, clients, culinary, or finance as primary admin navigation.
- Chef navigation exposes chef routes only. It must not include `/admin`, `/admin/pulse`, `/admin/inquiries`, or the existing admin group.
- The admin shell must still identify itself with `data-cf-portal="admin"`.

Visual reuse is allowed, but semantic reuse is not. Shared layout primitives may be extracted if helpful, but `ChefSidebar`, `ChefMobileNav`, and `ChefMainContent` must not remain the direct owners of `/admin`.

### States

- **Loading:** No special loading UI is required beyond current server-rendered behavior.
- **Empty:** Not applicable for shell ownership itself. If admin nav has sections without items, omit them rather than showing blank buckets.
- **Error:** Unauthorized admin access still redirects to sign-in exactly as today. `app/(admin)/layout.tsx:28-34`
- **Populated:** `/admin` renders through admin-owned shell components, `/dashboard` still renders through chef shell, and the surface contract tests pass.

### Interactions

- Admin nav links route within `/admin/**`.
- Chef nav continues to work for chef routes, including for a user who also has admin privileges while they are inside the chef surface.
- Switching between `/dashboard` and `/admin` should visibly switch shell ownership.
- Hidden admin support pages may stay deep-linkable if they are intentionally internal, but they must still belong to the admin nav owner and admin runtime contract.

---

## Edge Cases and Error Handling

| Scenario                                                    | Correct Behavior                                                                                                           |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| An admin user visits `/dashboard`                           | Render the chef surface. Admin authority does not rewrite chef surface ownership.                                          |
| An admin user visits `/admin`                               | Render the admin surface through admin-owned shell components.                                                             |
| A non-admin chef signs in                                   | Chef nav shows no admin route entries.                                                                                     |
| A builder reuses chef visual primitives inside admin shell  | Allowed only if ownership and exports are admin-named and admin-config driven. Direct chef-shell ownership is not allowed. |
| Staff routes remain under their own route family            | Continue classifying as chef-owned in the runtime contract.                                                                |
| Public token routes continue to exist                       | Do not drag them into this spec. This slice is about shell and nav ownership, not token-route reclassification.            |
| Admin support page is intentionally hidden from primary nav | Keep it `internal` or deep-link only, but it must still belong to admin route ownership and admin shell.                   |

---

## Verification Steps

1. Run:
   `node --test --import tsx tests/unit/runtime-surface-contract.test.ts tests/unit/admin-nav-boundary.test.ts tests/unit/route-policy.chef-coverage.test.ts`
2. Sign in as a persisted admin account and open `/admin`. Verify the page renders with `data-cf-portal="admin"` and admin-only navigation, not chef daily-workflow navigation.
3. From the same account, open `/dashboard`. Verify the chef shell still renders there and normal chef navigation still works.
4. Sign in as a normal chef account and verify chef navigation contains no `/admin` entries.
5. Verify `/my-events`, `/partner/dashboard`, and `/staff-dashboard` still render through their existing client, partner, and staff shells unchanged.
6. Open `docs/system-architecture.md` and `docs/feature-classification-rules.md` and verify both reference the new runtime contract as the enforcement layer rather than leaving surface ownership purely descriptive.

---

## Out of Scope

- Request-header trust hardening or `/api/v2` tenant-boundary fixes. Those belong to `docs/specs/p0-request-trust-and-api-tenant-boundary-hardening.md`.
- Distributed rate limiting, durable abuse controls, or public write-flow transactions. `lib/api/rate-limit.ts:1-26`, `lib/rateLimit.ts:1-32`, `app/api/book/route.ts:44-87`, `app/api/book/route.ts:167-280`
- Restoring hard build gates for ESLint and TypeScript. `next.config.js:71-82`
- Replacing the broad admin DB client or rolling out least-privilege data access. `lib/db/server.ts:1-8`, `lib/db/admin.ts:1-7`
- Route renames, route moves, or public-site information architecture work.
- Reclassifying token routes beyond adding contract notes where needed.

---

## Notes for Builder Agent

- Do not build a second chef nav and call it admin. The goal is ownership separation, not duplicated drift.
- Start from the runtime contract, then wire layouts and nav configs to it. If you build the shell first without the contract, future drift will return immediately.
- Preserve legitimate dual-context behavior. An admin can still act inside chef context when they are on chef routes. The mistake today is shell ownership, not the existence of support/admin power.
- Keep staff mapped to chef in the contract. The repo already treats staff as a separate route family, but the canonical surface model is explicit that staff is a role inside chef operations. `docs/system-architecture.md:23-25`, `docs/system-architecture.md:37-39`, `docs/feature-classification-rules.md:35-37`, `docs/feature-classification-rules.md:61-66`
- Do not widen into API, RLS, or build-gate work "while here". Those are separate architectural debts and separate execution slices.
- If you need shared presentational primitives, extract them neutrally. Do not leave `ChefSidebar` as the runtime owner of `/admin`.

---

## Spec Validation

1. **What exists today that this touches?**  
   The repo already has a canonical architecture doc and classifier doc that define five surfaces and say route folders are not the final truth. `docs/system-architecture.md:9-15`, `docs/system-architecture.md:20-39`, `docs/feature-classification-rules.md:59-77` Runtime-wise, `/admin` already has its own layout file, but that layout explicitly imports chef shell components. `app/(admin)/layout.tsx:1-4`, `app/(admin)/layout.tsx:8-9`, `app/(admin)/layout.tsx:36-45` The chef navigation config still owns admin routes and the admin group. `components/navigation/nav-config.tsx:133-140`, `components/navigation/nav-config.tsx:231-239`, `components/navigation/nav-config.tsx:245-259`

2. **What exactly changes?**  
   This spec adds a machine-readable runtime surface contract, creates admin-owned nav and shell files, updates `app/(admin)/layout.tsx` to use them, removes admin route ownership from chef nav config, and updates the architecture docs so runtime enforcement is documented as code-backed rather than advisory. `app/(admin)/layout.tsx:36-45`, `components/navigation/nav-config.tsx:231-239`, `components/navigation/nav-config.tsx:245-259`, `docs/system-architecture.md:9-15`, `docs/feature-classification-rules.md:53-77`

3. **What assumptions are you making?**  
   Verified: the canonical model says admin is its own surface and chef is its own surface. `docs/system-architecture.md:71-98`, `docs/system-architecture.md:155-180` Verified: the classifier says `/admin/**` belongs to admin and `app/(chef)` belongs to chef. `docs/feature-classification-rules.md:59-67` Verified: the current runtime violates that by using chef shell components in the admin layout and by putting admin routes inside chef nav config. `app/(admin)/layout.tsx:1-4`, `app/(admin)/layout.tsx:42-45`, `components/navigation/nav-config.tsx:231-239`, `components/navigation/nav-config.tsx:245-259` Unverified: whether any internal users depend on the exact current placement and ordering of admin shortcuts inside the chef nav.

4. **Where will this most likely break?**  
   The most likely break is accidental removal of legitimate admin capability while an admin is operating inside chef routes, because `app/(chef)/layout.tsx` currently has explicit admin-aware behavior. `app/(chef)/layout.tsx:94-107`, `app/(chef)/layout.tsx:158-160`, `app/(chef)/layout.tsx:173-189` The second likely break is duplicated nav logic if the builder copies chef nav rather than separating ownership cleanly. `components/navigation/chef-nav.tsx:18-19`, `components/navigation/chef-nav.tsx:71-72`

5. **What is underspecified?**  
   The current runtime is underspecified about which admin-only conveniences should remain available inside the chef surface for admins. The code clearly supports some admin-aware chef behavior today, but it does not define which of that is intentional long-term surface overlap versus temporary leakage. `app/(chef)/layout.tsx:94-107`, `app/(chef)/layout.tsx:158-160` This spec keeps that overlap intentionally narrow: admin authority may remain inside chef routes, but admin route and nav ownership moves out of chef.

6. **What dependencies or prerequisites exist?**  
   The implementation depends on the existing architecture foundation docs and the existing `Surface` union in `types/system.ts`. `docs/system-architecture.md:9-15`, `docs/feature-classification-rules.md:53-77`, `types/system.ts:1-20` No DB migration or auth-model rewrite is required.

7. **What existing logic could this conflict with?**  
   It can conflict with the current admin layout, which directly reuses chef shell pieces. `app/(admin)/layout.tsx:8-9`, `app/(admin)/layout.tsx:42-45` It can also conflict with the current chef nav assumptions, because admin items are baked into the chef nav config and chef nav still filters them based on `isAdmin`. `components/navigation/nav-config.tsx:231-239`, `components/navigation/nav-config.tsx:245-259`, `components/navigation/chef-nav.tsx:664-673`, `components/navigation/chef-nav.tsx:682-716`

8. **What is the end-to-end data flow?**  
   For admin routes after this spec: request to `/admin/**` -> `requireAdmin()` in `app/(admin)/layout.tsx` -> admin-owned shell component -> admin nav config -> admin page content. `app/(admin)/layout.tsx:28-34`, `app/(admin)/layout.tsx:36-53` For chef routes: request to chef route -> `requireChef()` in `app/(chef)/layout.tsx` -> chef-owned shell -> chef nav config -> chef page content. `app/(chef)/layout.tsx:69-76`, `app/(chef)/layout.tsx:120-218` The runtime contract and tests sit above both flows and assert the ownership rules are still true.

9. **What is the correct implementation order?**  
   First create the runtime surface contract. Second create admin nav config and admin shell components from that contract. Third switch `app/(admin)/layout.tsx` to the new shell. Fourth remove admin ownership from chef nav config. Fifth add contract tests and update docs. This order matters because if the builder removes admin items from chef nav before the admin shell exists, `/admin` temporarily loses coherent navigation.

10. **What are the exact success criteria?**  
    `/admin` renders through admin-owned shell components, chef nav config contains no admin route entries, the runtime contract exists and is tested, docs reference the runtime contract as an enforcement layer, and admins can still use chef routes through the chef shell when they are actually on chef routes. `app/(admin)/layout.tsx:36-53`, `components/navigation/nav-config.tsx:231-239`, `components/navigation/nav-config.tsx:245-259`, `docs/system-architecture.md:9-15`, `docs/feature-classification-rules.md:53-77`, `app/(chef)/layout.tsx:69-76`

11. **What are the non-negotiable constraints?**  
    No DB changes. No route renames. No widening into trust-boundary, API-v2, rate-limit, or build-gate work. Preserve public, client, partner, and staff surface ownership. `app/(public)/layout.tsx:12-31`, `app/(client)/layout.tsx:21-59`, `app/(partner)/partner/layout.tsx:13-43`, `app/(staff)/layout.tsx:20-45`, `next.config.js:71-82`, `lib/api/v2/middleware.ts:18-27`

12. **What should NOT be touched?**  
    Do not touch request-header trust flow, API key middleware, notification recipient logic, loyalty logic, or public booking/inquiry flows. `middleware.ts:55-70`, `lib/api/v2/middleware.ts:18-27`, `app/api/v2/notifications/route.ts:47-69`, `app/api/book/route.ts:44-87`, `app/api/book/route.ts:167-280`

13. **Is this the simplest complete version?**  
    Yes. It does not attempt a platform rewrite. It takes the most visible runtime misalignment, turns the documented model into a code-backed contract, separates admin shell ownership, and removes admin leakage from chef nav without disturbing other surface flows. `docs/system-architecture.md:9-15`, `app/(admin)/layout.tsx:1-4`, `components/navigation/nav-config.tsx:231-239`

14. **If implemented exactly as written, what would still be wrong?**  
    The system would still have deeper structural debt: request trust is still a separate hardening slice, the admin DB client remains broad, rate limiting remains in-memory, and builds still ignore lint and type failures. `middleware.ts:55-70`, `lib/db/server.ts:1-8`, `lib/db/admin.ts:1-7`, `lib/api/rate-limit.ts:1-26`, `lib/rateLimit.ts:1-32`, `next.config.js:71-82`

### What A Builder Would Get Wrong Building This As Written

- They would treat this as a design-system restyle and leave `ChefSidebar` as the actual runtime owner of `/admin`. That would preserve the architectural smell even if the visuals looked different. `app/(admin)/layout.tsx:8-9`, `app/(admin)/layout.tsx:42-45`
- They would delete all admin-aware behavior from `app/(chef)/layout.tsx`, breaking legitimate admin support context inside chef routes. The spec removes admin surface leakage, not admin authority itself. `app/(chef)/layout.tsx:94-107`, `app/(chef)/layout.tsx:158-160`
- They would hide admin items visually inside chef nav instead of removing ownership from the chef nav config. Hidden leakage is still leakage. `components/navigation/nav-config.tsx:231-239`, `components/navigation/nav-config.tsx:245-259`
- They would classify staff as a sixth runtime surface because it has its own layout. The canonical model explicitly says staff is a role inside chef operations. `docs/system-architecture.md:23-25`, `docs/system-architecture.md:37-39`, `docs/feature-classification-rules.md:35-37`, `docs/feature-classification-rules.md:61-66`
- They would widen the slice into trust/API/build work because those problems are also real. That would make the build unfocused and increase regression risk. `middleware.ts:55-70`, `lib/api/v2/middleware.ts:18-27`, `next.config.js:71-82`

### Is Anything Assumed But Not Verified?

- Yes. The repo cannot prove which current admin shortcuts or ordering patterns are relied on by internal operators today.
- Yes. The repo cannot prove whether all current admin-aware behavior inside the chef shell is intentional long-term product design or a temporary founder convenience.
- Yes. This spec assumes the existing admin information architecture is good enough to separate ownership first. It does not independently verify that the current `/admin` IA is the optimal final taxonomy.

### Final Check

This spec is ready for builder execution. It is narrow, evidence-backed, and dependency-ordered. It converts the architecture docs from descriptive truth into runtime-enforced truth without pretending that the whole monolith needs to be rewritten.
