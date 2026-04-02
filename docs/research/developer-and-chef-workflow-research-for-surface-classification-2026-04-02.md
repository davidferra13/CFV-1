# Research: Developer and Chef Workflow Patterns for Surface Classification

> **Date:** 2026-04-02
> **Question:** How do developers and chefs currently handle the class of problem ChefFlow is solving, and what does that imply for the system-surface and role-classification work?
> **Status:** complete
> **Purpose:** Strengthen the system surface / role classification spec with workflow-backed evidence, not just code-backed structure

## Why This Research Exists

The active planning work defines ChefFlow as one operating system with multiple surfaces and roles. That structure should not be derived from route folders alone. It needs to reflect how comparable systems are built by developers today and how chefs actually move work from discovery to close-out in the real world.

This research answers two questions:

1. How do developers typically structure multi-surface, multi-role systems with internal, external, and invite-based access?
2. How do chefs and catering operators actually handle discovery, intake, proposal, booking, planning, execution, and close-out today?

The goal is to improve the classification spec in a way that reduces builder guesswork.

## Method

I used four angles and cross-checked them:

1. Current ChefFlow code and auth/layout/navigation/schema evidence
2. Existing ChefFlow research already in the repo
3. Official product and platform documentation for current multi-role system patterns
4. Community and operator workflow signals

This is not a market-positioning document. It is a workflow and structural evidence pass.

## Short Answer

The developer and chef evidence converges on the same conclusion:

- Developers solve this class of problem by separating surfaces according to actor, trust boundary, and control authority, not by URL shape alone.
- External users usually get constrained portal or collaborator access, while internal operators and internal admins stay on separate access paths.
- Invite and token links are delivery mechanics, not proof of product ownership.
- Chefs move work through a staged lifecycle, but each stage is not owned by the same actor.
- First contact is light and progressive. Ongoing approvals, payment, and relationship visibility are different work from internal planning and execution.

That means ChefFlow's classification model is directionally correct, but it must explicitly encode lifecycle splits and progressive ownership transitions.

## What Developers Do Today

### 1. They separate by actor and trust boundary, not just route tree

Across modern B2B and portal products, external users do not get the same entry path or authority as tenant operators or internal platform staff.

Auth0's current multi-organization architecture guidance emphasizes organization isolation and separate employee access patterns for organization instances. Atlassian's support model explicitly distinguishes portal-only customers from broader account holders, and limits portal-only users to the help-center surface rather than the full product root. In practice, this means developers routinely separate:

- public or invite entry
- tenant operator workspace
- constrained external portal
- internal control plane

This supports ChefFlow's canonical surface split across public, chef, client, partner, and admin.

### 2. They use constrained external roles instead of diluted internal roles

Atlassian recommends portal-only customer accounts for people who are truly external and should only use the customer help center, while broader accounts are for employees or collaborators who may need more product access later. That is the same design pattern ChefFlow needs:

- client is not chef-lite
- partner is not chef-lite
- staff is not chef-lite
- admin is not a hidden chef permission

When developers skip this separation, role leakage becomes normal and hard to unwind.

### 3. They keep internal mission control separate from operator product lanes

The repo already shows admin behavior leaking through chef presentation. External product patterns point the other direction: internal support, observability, overrides, and cross-tenant tools belong in a distinct control plane. Even when internal teams need to inspect tenant state, that does not make their tooling part of the tenant workspace.

This validates the spec's "Admin / Mission Control" model as a first-class surface, not a special menu section inside chef.

### 4. They treat invite links and alternate login paths as transport, not ownership

Auth0 explicitly calls out special login URLs for employee access to organization instances. Atlassian similarly distinguishes the help-center URL from the root site URL for portal-only customers. These systems prove an important classification rule:

- a special path or token can change delivery
- it does not automatically change architectural ownership

That matches ChefFlow's public token routes for client, partner, and staff experiences.

### 5. They split one business capability into actor-specific placements

In real products, "support," "billing," "approvals," or "project access" usually means multiple placements:

- internal team workspace
- external customer portal
- internal admin tooling

The business capability is one thing. The surface and role ownership are not. This is exactly the mistake the builder is most likely to make if the classifier only looks at route names or feature nouns.

### Developer Breakpoints

The recurring implementation failures are:

- treating URL location as ownership
- letting collaborator roles inherit owner permissions
- embedding mission-control tools inside tenant UX
- modeling "a workflow" as one feature even when multiple actors own different steps
- failing to distinguish delivery mechanism from canonical surface

## What Chefs Do Today

### 1. They work across one lifecycle, but not one surface

The repo's earlier operator research already mapped a stable seven-stage workflow:

1. discovery
2. intake
3. proposal
4. booking
5. planning
6. execution
7. close-out

That lifecycle is real, but ownership shifts as the job progresses. Discovery and first contact are external. Proposal drafting is chef-owned. Review, signatures, and payment are client-facing. Planning and execution are internal operations. Post-event reporting may branch into client, chef, or partner lanes.

This is the strongest real-world argument for splitting lifecycle features by actor instead of collapsing them into one surface.

### 2. First contact is light and progressive

HoneyBook's event planner catering questionnaire highlights dietary preferences, headcounts, and meal details as key onboarding inputs. The repo's earlier chef workflow research found that many operators only gather roughly 6 to 8 fields on first contact, then collect the rest in follow-up conversations.

That means ChefFlow should classify minimal inquiry and discovery intake as public, while treating later approvals, household/profile control, and repeat customer visibility as client-surface work. A long intake form is not proof that the whole workflow belongs in public.

### 3. Proposals and event orders are still document-heavy and revision-heavy

Tripleseat still gives operators free BEO templates in Word, Excel, and Google Docs, and describes BEOs as the event playbook and agreement between client and venue. Caterease markets proposals, contracts, invoices, payment tracking, customer approvals, packing lists, staffing, and mobile event detail review as one combined catering stack.

Cross-checking those sources with community operator discussion shows the same pattern:

- operators still rely on spreadsheets and shared documents
- proposal and approval loops are revision-heavy
- client-facing approval and chef-facing planning are related but not the same thing

That reinforces a key builder rule: quote drafting, costing, and internal planning belong to chef; review, signature, and payment belong to client.

### 4. Execution remains internal even when briefings are shared externally

Operator workflow research and community discussions both show that prep, staffing, equipment checks, service sequencing, and event execution are internal operational work. Staff may receive briefings, schedules, and event packets through temporary links or mobile views, but that does not make execution a standalone product surface.

This strongly supports the spec rule that staff remains a role inside chef operations, even when staff receives separate routes or token links.

### 5. Partners are scoped, not operational owners

The chef-side business still owns the event. Referral or venue partners contribute leads, locations, or relationship value. They do not own the internal execution stack. That means partner surface scope should stay narrow:

- attribution
- profile/location context
- scoped reporting
- claim/onboarding

It should not expand into chef CRM, full client records, or internal operational controls.

### Chef Breakpoints

The recurring real-world failures are:

- intake details scattered across text, email, notes, and docs
- allergies or special requests getting lost between intake and execution
- quote and menu revisions happening through static documents
- no durable handoff from client-facing approval into internal planning
- spreadsheets that work for the creator but break for everyone else

## Cross-Checked Implications for the Active Spec

### 1. `currentSurface` and `correctSurface` must stay separate

This is not just a codebase quirk. External product patterns and chef workflows both show that alternate delivery paths are common. Ownership and delivery should remain distinct fields.

### 2. Public should own discovery and minimal intake, not the whole relationship

Public can deliver:

- marketing
- discovery
- first-contact inquiry
- claim and invite entry
- token-gated external artifacts

Public should not be used as the canonical owner for long-lived client or partner work just because a token starts the interaction there.

### 3. Lifecycle features should often be split into multiple placements

Examples:

- inquiry intake: public
- quote drafting and menu costing: chef
- quote approval and payment: client
- event briefing for staff: chef with `roles: ['staff']`
- partner contribution report: partner

One business workflow can produce multiple classified features.

### 4. Staff should remain a role lane, not a sixth surface

Real operator workflow supports this. Staff executes inside the chef's operating model. Separate staff routes are a delivery choice, not proof of a standalone canonical surface.

### 5. Admin needs to stay a true internal control plane

The developer-side evidence supports a clean separation between tenant product and internal mission control. The current repo leakage should be treated as misalignment, not architecture.

### 6. Partner should stay narrow and explicit

External collaborator access is normal. Full internal access is not. Partner surface should stay deliberately scoped and should not absorb chef or admin responsibilities.

## Recommended Refinements to the Classification Spec

1. Add research-backed workflow constraints so the builder knows why one lifecycle is split across surfaces.
2. Require a lifecycle ownership section in the architecture doc, not just surface definitions.
3. Require the classifier doc to explain that one named workflow can produce multiple feature placements.
4. Make progressive intake explicit so builders do not over-classify early client contact as long-lived client workspace ownership.
5. Keep the admin/mission-control warning strong so builder output does not normalize current leakage.

## Sources

### Current ChefFlow repo evidence

- `docs/research/how-food-operators-deal-with-what-we-solve.md`
- `docs/research/directory-operator-and-developer-workflows-2026-04-02.md`
- `docs/specs/system-surface-role-classification-foundation.md`
- `middleware.ts`
- `lib/auth/get-user.ts`
- `lib/auth/route-policy.ts`
- `lib/auth/request-auth-context.ts`
- `app/(public)/layout.tsx`
- `app/(chef)/layout.tsx`
- `app/(client)/layout.tsx`
- `app/(staff)/layout.tsx`
- `app/(partner)/partner/layout.tsx`
- `app/(admin)/layout.tsx`

### External official and community sources

- Auth0, Multiple Organization Architecture: https://auth0.com/docs/media/articles/architecture-scenarios/planning/Multiple-Organization-Architecture-Multitenancy-Overview.pdf
- Atlassian Support, portal-only customer accounts: https://support.atlassian.com/user-management/docs/manage-jira-service-management-customer-accounts/
- HoneyBook, Event Planner Catering Questionnaire: https://www.honeybook.com/templates/t/event-planner-catering-questionnaire
- Tripleseat, Free Banquet Event Order template: https://tripleseat.com/free-beo/
- Caterease, catering/event management feature set: https://www.caterease.com/
- Reddit / r/Chefit, private chef advice: https://www.reddit.com/r/Chefit/comments/hvvjfx/private_chef_advice/
- Reddit / r/Chefit, kitchen master workbook discussion: https://www.reddit.com/r/Chefit/comments/1rtld4d/kitchen_master_workbook/
