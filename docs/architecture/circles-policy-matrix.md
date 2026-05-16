# Circles Policy Matrix

> **Status:** draft implementation contract
> **Created:** 2026-05-15
> **Related queue item:** `BQ-20260515T173051Z-circle-access-policy-and-type-taxonomy`
> **Purpose:** Specify the type, ownership, creation, access, and linked-object visibility rules that should be encoded in Circle policy modules and tests.

## Non-Negotiable Rule

Circle access has two layers:

1. **Circle workspace access:** Can the actor see/post/invite/manage inside the Circle?
2. **Linked-object access:** Can the actor see details from the linked Event, Inquiry, Client, Quote, Ledger, Staff assignment, Vendor order, Partner referral, or other canonical record?

Membership in a Circle does not automatically grant full linked-object access.

Source-of-truth boundary contract: `docs/architecture/circles-source-of-truth-boundaries.md`.

## Canonical Types And Compatibility Mapping

V1 should add a compatibility layer before changing database shape.

| Stored `hub_groups.group_type` | Canonical Circle type | Product label    | Ownership mode                    | Default visibility    | Default linked object              | Notes                                                   |
| ------------------------------ | --------------------- | ---------------- | --------------------------------- | --------------------- | ---------------------------------- | ------------------------------------------------------- |
| `circle`                       | `dinner`              | Dinner Circle    | `linked_object`                   | `private` or `secret` | Inquiry or Event                   | Current chef-client/guest operational Circle.           |
| `dinner_club`                  | `client`              | Client Circle    | `linked_object` or `tenant`       | `private`             | Client or Household                | Long-running relationship Circle for recurring clients. |
| `crew`                         | `crew`                | Crew Circle      | `linked_object`                   | `private` or `secret` | Event or Staff Assignment          | Live value inserted directly today; must be typed.      |
| `community`                    | `community`           | Community Circle | `platform`, `tenant`, or `shared` | `public` or `private` | Community thread                   | Public discovery only when public/active.               |
| `planning`                     | `planning`            | Planning Circle  | `personal`, `shared`, or `tenant` | `private`             | Event Stub or Inquiry              | Can become Dinner Circle later.                         |
| `bridge`                       | `bridge`              | Bridge Circle    | `shared`                          | `private` or `secret` | Collaboration / referral / handoff | Cross-context workspace.                                |
| future `vendor`                | `vendor`              | Vendor Circle    | `linked_object`                   | `private`             | Vendor relationship/order          | Do not add until vendor policy exists.                  |
| future `partner`               | `partner`             | Partner Circle   | `linked_object`                   | `private`             | Partner relationship/referral      | Do not add until partner policy exists.                 |

Implementation target:

- `lib/hub/circle-types.ts` owns canonical types, stored-type compatibility, labels, and default behavior.
- `lib/hub/types.ts` should consume or mirror that taxonomy instead of hard-coding a narrower union.
- `lib/hub/group-actions.ts` should validate new user-created Circles through policy. Existing direct inserts should be migrated to helpers over time.

## Ownership Modes

| Ownership mode  | Meaning                                            | Valid for                                       | Transfer allowed?                             |
| --------------- | -------------------------------------------------- | ----------------------------------------------- | --------------------------------------------- |
| `personal`      | One profile owns the Circle.                       | planning, solo/future personal Circles          | Yes, to a qualified member.                   |
| `tenant`        | One chef/business tenant owns the Circle.          | dinner, client, crew, vendor, partner, planning | Yes, only through tenant/admin flow.          |
| `shared`        | Multiple owners/admins manage the Circle.          | bridge, community, planning                     | Yes, manager-mediated.                        |
| `linked_object` | Access/ownership inherits from a canonical object. | dinner, crew, client, vendor, partner           | Changes when linked object ownership changes. |
| `platform`      | Platform/admin policy owns moderation/governance.  | community, admin/moderation Circles             | Admin only.                                   |

Implementation target:

- `lib/hub/circle-ownership.ts` should define ownership modes and helper predicates.
- Ownership transfer must not demote protected roles (`owner`, `chef`) without explicit manager/admin authority.

## Member Roles

Current role contract:

- `owner`
- `admin`
- `chef`
- `host`
- `member`
- `viewer`
- `delegate`

Default permissions:

| Role       | Can see | Can post | Can invite | Can pin | Can manage members                     | Can see chef-only linked object                  |
| ---------- | ------- | -------- | ---------- | ------- | -------------------------------------- | ------------------------------------------------ |
| `owner`    | yes     | yes      | yes        | yes     | yes                                    | if tenant/chef-authorized                        |
| `admin`    | yes     | yes      | yes        | yes     | yes, except protected admin/chef rules | yes, admin context only                          |
| `chef`     | yes     | yes      | yes        | yes     | yes                                    | yes, if tenant/linked-object authorized          |
| `host`     | yes     | yes      | yes        | yes     | limited to member/viewer/delegate      | no by default                                    |
| `member`   | yes     | yes      | no         | no      | no                                     | no                                               |
| `viewer`   | yes     | no       | no         | no      | no                                     | no                                               |
| `delegate` | yes     | yes      | no         | no      | no                                     | no, unless delegated linked-object policy allows |

These are defaults. Stored `can_post`, `can_invite`, and `can_pin` remain the concrete per-member permissions.

## Actor Contexts

Policy should evaluate both Circle role and active app context.

| Actor context | Identity source                          | Baseline access                                       |
| ------------- | ---------------------------------------- | ----------------------------------------------------- |
| `chef`        | `requireChef()` tenant user              | Tenant-owned Circle command/control.                  |
| `client`      | `requireClient()` client user            | Client-owned or explicitly shared Circle context.     |
| `guest`       | `group_token` + optional `profile_token` | Token/member-limited access only.                     |
| `staff`       | `requireStaff()` or staff token/session  | Assigned event/Crew Circle scope only.                |
| `vendor`      | vendor auth/session                      | Vendor Circle scope only.                             |
| `partner`     | partner auth/session                     | Partner/referral Circle scope only.                   |
| `admin`       | `requireAdmin()`                         | Runtime-gated platform/admin access.                  |
| `public`      | unauthenticated                          | Public/open/community view only, or token guest view. |
| `system`      | internal job/action                      | Only validated linked-object/system context.          |

## Creation Matrix

| Creator | Dinner                                        | Client                               | Crew                          | Planning                | Bridge                       | Community                    | Vendor                     | Partner                    |
| ------- | --------------------------------------------- | ------------------------------------ | ----------------------------- | ----------------------- | ---------------------------- | ---------------------------- | -------------------------- | -------------------------- |
| Chef    | yes, tenant-scoped                            | yes, tenant-scoped                   | yes, via event/staff flow     | yes                     | yes, with collaborator proof | yes, tenant/community policy | later                      | later                      |
| Client  | request/create only inside owned relationship | yes, if product-approved             | no                            | maybe, client-safe      | no                           | no                           | no                         | no                         |
| Guest   | no by default                                 | no                                   | no                            | no                      | no                           | no                           | no                         | no                         |
| Staff   | no                                            | no                                   | yes, if assigned/permissioned | no                      | no                           | no                           | no                         | no                         |
| Vendor  | no                                            | no                                   | no                            | no                      | no                           | no                           | later, relationship-scoped | no                         |
| Partner | no                                            | no                                   | no                            | no                      | later, relationship-scoped   | no                           | no                         | later, relationship-scoped |
| Admin   | yes                                           | yes                                  | yes                           | yes                     | yes                          | yes                          | yes                        | yes                        |
| System  | yes, from validated lifecycle                 | yes, from recurring/client lifecycle | yes, from staff assignment    | yes, from approved flow | yes, from approved flow      | yes, from approved flow      | later                      | later                      |

V1 implementation recommendation:

1. Chef/system creation first.
2. Staff creation only through staff assignment/Crew Circle helper.
3. Client/guest/vendor/partner creation should remain request/defer until route and linked-object policies are explicit.

## Linked Object Visibility Matrix

| Linked object     | Chef               | Client/host                        | Guest/member                        | Staff                          | Vendor                    | Partner                  | Public                  |
| ----------------- | ------------------ | ---------------------------------- | ----------------------------------- | ------------------------------ | ------------------------- | ------------------------ | ----------------------- |
| Inquiry           | full tenant-scoped | client-safe only if their inquiry  | no unless shared                    | no                             | no                        | no                       | no                      |
| Event             | full tenant-scoped | client-safe event facts            | guest-safe event facts              | assigned ops facts             | no unless vendor-linked   | no unless partner-linked | public facts only       |
| Menu              | full tenant-scoped | approved/shared menu               | guest-safe shared menu              | assigned ops/prep-safe menu    | no unless sourcing-linked | no                       | public/shared menu only |
| Quote             | full tenant-scoped | client quote if owner              | no                                  | no                             | no                        | no                       | no                      |
| Ledger/payment    | full tenant-scoped | client invoice/payment portal only | no                                  | no                             | no                        | no                       | no                      |
| Client profile    | full tenant-scoped | own profile                        | no private CRM                      | no unless assigned and minimal | no                        | no                       | no                      |
| Household/dietary | full tenant-scoped | own household                      | only volunteered/guest-safe summary | assigned safety-needed subset  | no                        | no                       | no                      |
| Staff assignment  | full tenant-scoped | no                                 | no                                  | own assignment/team-safe       | no                        | no                       | no                      |
| Vendor order      | full tenant-scoped | no                                 | no                                  | maybe pickup-safe              | own order only            | no                       | no                      |
| Partner referral  | full tenant-scoped | no                                 | no                                  | no                             | no                        | own referral scope       | no                      |

## Public Token Policy

`group_token` is a bearer credential for Circle view access. It must be treated as guest-level access, not authenticated account access.

Rules:

- Public token views can show Circle-safe context only.
- Public token views can never show chef-only notes, lead score, internal risk, quote internals, ledger/payment state, private household detail, or unrelated tenant data.
- Profile tokens must be verified against membership before write actions.
- Public discovery must never include private/secret Circles.
- Public discovery must require public/open/active intent, not merely `tenant_id IS NULL`.

## Default Tabs / Capabilities By Type

| Circle type | Default tabs/capabilities                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Dinner      | Status, Chat, Menu, RSVP/dietary, Members, Photos, Notes, Plan, Search. Chef sees Dashboard/Ingredients/Settings where allowed. |
| Client      | Relationship memory, Chat, Events, Preferences, Household, Follow-ups, Notes.                                                   |
| Crew        | Chat, Members, Prep handoffs, Notes, Schedule, Photos/proof. No guest social affordances by default.                            |
| Planning    | Brief, Chat, Members, Notes, Availability, candidate Events.                                                                    |
| Bridge      | Chat, Members, Shared objects, Decisions, Notes.                                                                                |
| Community   | Feed/chat, Members, Events/open tables, Photos, public profile/discovery cards where public.                                    |
| Vendor      | Order/sourcing status, Messages, Files/proof, Delivery/pickup handoffs.                                                         |
| Partner     | Referral status, Messages, Shared event/client-safe context, Follow-ups.                                                        |

## Test Contract

Foundation tests should cover:

- Stored type -> canonical type mapping for every current `group_type`.
- `crew` is accepted by taxonomy and policy even if older create schema rejected it.
- Unknown stored type maps to blocked/unknown behavior, not permissive access.
- Private Circle denies non-members.
- Public Circle allows public read only when visibility and discovery policy allow it.
- Token view does not imply profile write permission.
- Profile-token writes require membership.
- Host cannot manage protected `owner` or `chef` members.
- Circle membership does not reveal chef-only linked object.
- Client-safe linked object is visible to members only when Circle visibility/token policy allows.
- Vendor/partner future types are blocked until explicitly enabled.
- Admin context requires runtime admin guard in routes/actions, not just policy boolean.

## Implementation Sequence

1. Add taxonomy helpers with no behavior change.
2. Add tests for current mappings and existing access behavior.
3. Extend `HubGroup.group_type` typing to include live values through the taxonomy helper.
4. Move ad hoc compatibility strings out of `circle-access-policy.ts`.
5. Update creation helpers to validate against policy for new Circles.
6. Only then add new UI creation flows.
