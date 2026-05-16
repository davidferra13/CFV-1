# Spec: Support Network Map

> **Status:** draft
> **Priority:** P2
> **Depends on:** `docs/specs/chef-operating-loop-external-memory.md`
> **Estimated complexity:** large (9+ files)

## Developer Notes

### Raw Signal

The research says human life runs on support networks: family, friends, partners, children, businesses, communities, tools, records, and future relationships. Data is transferred context that helps another person or system act with less friction. A successful person usually has better-aligned support: better information, relationships, timing, tools, feedback, trust, and access.

### Developer Intent

- **Core goal:** Show the chef the support structure around a client, event, or business workflow.
- **Key constraints:** Do not create social-network fluff. This must be operational: who matters, why they matter, what context they carry, and what action depends on them.
- **Success from the developer's perspective:** ChefFlow can answer "who is connected to this work, what do they affect, and what should I remember before I act?"

## What This Does

Adds a support-network map for operational relationships: client household members, referrals, partners, staff, vendors, planners, venues, future leads, and internal contacts connected to events and business workflows.

## Existing Grounding

- Client profile service already includes household and relationship labels.
- Client referral modules exist.
- Client touchpoints, relationship snapshots, and interaction signals exist.
- Vendor, partner, staff, and event assignment domains already exist in the repo.

## Files To Create

| File                                                  | Purpose                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------- |
| `lib/support-network/types.ts`                        | Shared graph node, edge, role, privacy, and confidence types. |
| `lib/support-network/client-network.ts`               | Client-centered collector.                                    |
| `lib/support-network/event-network.ts`                | Event-centered collector.                                     |
| `components/support-network/support-network-map.tsx`  | Dense graph/list hybrid UI.                                   |
| `components/support-network/support-contact-card.tsx` | Contact/context card.                                         |
| `app/(chef)/clients/[id]/support/page.tsx`            | Client support network route.                                 |

## Files To Modify

| File                                     | What To Change                                                       |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `app/(chef)/clients/[id]/page.tsx`       | Add support-network entry point or summary panel.                    |
| `app/(chef)/clients/clients-hub-nav.tsx` | Add support network nav only if route is built.                      |
| `lib/clients/client-profile-service.ts`  | Reuse household/referral/profile data without duplicating models.    |
| `lib/clients/referral-actions.ts`        | Provide graph edge inputs where useful.                              |
| `lib/auth/route-policy.ts`               | Register client support route if not covered by dynamic chef routes. |

## Database Changes

None for V1 if the map is derived from existing household, referral, vendor, staff, partner, and event relationships.

Potential later table only if users need manual graph links:

```sql
CREATE TABLE support_network_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  subject_type text NOT NULL,
  subject_id uuid NOT NULL,
  related_type text NOT NULL,
  related_id uuid NOT NULL,
  relationship_label text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

## UI Spec

- Default to a scannable relationship list grouped by role, not a decorative graph.
- Optional compact visual map can appear above the list.
- Nodes show: name, role, relationship, last interaction, next relevant action, privacy level.
- Edges show why the connection exists: household, referral, event staff, vendor, planner, venue, partner, source channel.

## Acceptance Criteria

- Client support route shows at least household, referrals, related events, and touchpoint context when data exists.
- Empty state explains what connections will appear once recorded.
- Relationship labels are operational, not vague.
- Sensitive household/client data stays chef-tenant scoped.
- No duplicate source-of-truth for client profile or referral data.

## Edge Cases

| Scenario                                   | Correct Behavior                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| Same person appears as client and referral | Dedup with multiple relationship badges.                                 |
| Household data missing                     | Show other support edges; do not block route.                            |
| Staff/shared user views future variant     | Hide private client notes by role.                                       |
| Conflicting labels                         | Show both with source if supported, or prefer user-entered profile data. |

## Verification Steps

1. Use a client with referral or household data.
2. Open `/clients/[id]/support`.
3. Verify grouped support roles and source routes.
4. Verify missing data empty states.
5. Review auth and tenant scoping.
6. Capture screenshot proof.

## Out Of Scope

- Public social graph.
- Automated identity merge.
- Cross-tenant relationship discovery.
- Staff-facing version.

## Queue-Ready Draft

- **Raw request / source:** Research on human support structures, relationships, data, and social infrastructure.
- **Goal:** Build an operational support network map for client and event context.
- **Scope:** Client-centered V1 route, derived graph, summary panel.
- **Acceptance criteria:** Shows household/referral/event/touchpoint relationships with privacy-safe context.
- **Risks:** Creating duplicate relationship models; overcomplicating UI.
- **Verification:** route screenshot, tenant scope review, collector tests.
