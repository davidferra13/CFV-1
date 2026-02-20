# Chef Collaboration System

## What Changed

This implementation adds a full cross-chef collaboration layer to ChefFlow. Chefs can now invite connected network chefs to collaborate on events, assign them operational roles with fine-grained permissions, hand off events entirely, and share recipes with other chefs who can accept editable copies.

## Why It Was Needed

Private chefs frequently work with other chefs — co-hosting dinners, calling in colleagues when capacity is exceeded, handing events to trusted peers when a conflict arises, and sharing signature recipes with collaborators. The platform previously had no mechanism for any of this. The Chef Network system existed for discovery and lead-sharing but could not translate connections into actual event-level collaboration.

## Architecture Decisions

### Events retain their original `tenant_id`
Event ownership at the database level does not change even when another chef becomes the "primary" collaborator. This preserves RLS integrity, financial immutability (ledger entries remain scoped to the original tenant), and keeps the Stripe/payment linkage simple. Collaboration access is granted via the `event_collaborators` junction table, which the RLS system consults.

### Connection gate
Only chefs with an **accepted** `chef_connections` row can invite each other. This prevents unsolicited collaboration requests and keeps the feature within the trusted Chef Network. The search modal only surfaces connected chefs.

### Role-based permissions
Four roles, each with default permission sets:
- `primary` — full access, takes over operational leadership on handoff
- `co_host` — full access except closing/cancelling the event
- `sous_chef` — kitchen-only access (can assign staff, cannot touch menu or financials)
- `observer` — read-only (the role original owners take after handing off)

Permissions are stored as a JSONB object and can be overridden per-collaborator after invitation. Keys: `can_modify_menu`, `can_assign_staff`, `can_view_financials`, `can_communicate_with_client`, `can_close_event`.

### Recipe sharing creates editable copies
When a recipe share is accepted, the server performs a deep copy: the recipe record plus all `recipe_ingredients` are duplicated into the receiving chef's `tenant_id`. Ingredients are matched by name (case-insensitive) within the target namespace; new ingredients are created if no match exists. The original recipe is never modified. The `recipe_shares.created_recipe_id` field points to the copy for traceability.

## Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/20260304000007_business_opt_in.sql` | Adds `is_business` flag to `chef_preferences` |
| `supabase/migrations/20260304000008_chef_collaboration_system.sql` | Creates `event_collaborators`, `recipe_shares`, and expands `events` RLS |
| `lib/collaboration/types.ts` | Shared TypeScript types for roles, permissions, statuses |
| `lib/collaboration/actions.ts` | All collaboration server actions |
| `components/events/event-collaborators-panel.tsx` | Event detail UI panel (invite, manage, handoff) |

## Files Modified

| File | Change |
|------|--------|
| `app/(chef)/events/[id]/page.tsx` | Renders `EventCollaboratorsPanel`; shows collaborator role banner for non-owner visitors |
| `lib/events/actions.ts` | `getEventById` — removed explicit `tenant_id` filter; access now enforced entirely by RLS |
| `app/(chef)/recipes/[id]/recipe-detail-client.tsx` | Adds Share button and `RecipeShareModal` inline component |
| `app/(chef)/dashboard/page.tsx` | Adds "Collaboration Invitations", "Recipe Shares", and "Collaborating On" sections |

## Database Schema

### `event_collaborators`
```
id UUID PK
event_id → events(id) CASCADE
chef_id → chefs(id)        — the collaborating chef
invited_by_chef_id → chefs(id)
role TEXT CHECK IN ('primary','co_host','sous_chef','observer')
status TEXT CHECK IN ('pending','accepted','declined','removed')
permissions JSONB          — { can_modify_menu, can_assign_staff, can_view_financials, can_communicate_with_client, can_close_event }
note TEXT
responded_at TIMESTAMPTZ
created_at TIMESTAMPTZ
UNIQUE (event_id, chef_id)
```

### `recipe_shares`
```
id UUID PK
original_recipe_id → recipes(id) CASCADE
from_chef_id → chefs(id)
to_chef_id → chefs(id)
status TEXT CHECK IN ('pending','accepted','declined')
note TEXT
created_recipe_id → recipes(id)  — populated on accept
responded_at TIMESTAMPTZ
created_at TIMESTAMPTZ
UNIQUE (original_recipe_id, to_chef_id)
```

### RLS Additions
- `event_collaborators`: owner manages all rows; collaborating chef manages their own row
- `events`: new `collaborators_can_view_events` policy lets accepted collaborators SELECT events
- `recipe_shares`: each chef manages their own send/receive rows

### `chef_network_feature_preferences` Extensions
- `event_collaboration BOOLEAN DEFAULT TRUE` — opt-out flag to stop receiving event invitations
- `recipe_sharing BOOLEAN DEFAULT TRUE` — opt-out flag to stop receiving recipe share requests

## Server Action Reference (`lib/collaboration/actions.ts`)

### Event collaboration
| Function | Description |
|----------|-------------|
| `getEventCollaborators(eventId)` | List all collaborators on an event (owner or accepted collaborator can call) |
| `inviteChefToEvent(input)` | Invite a connected chef; validates connection and opt-in preference |
| `respondToEventInvitation(input)` | Accept or decline an incoming invitation |
| `updateCollaboratorRole(input)` | Change a collaborator's role and permissions (owner only) |
| `removeCollaborator(collaboratorId)` | Remove a collaborator (owner or self) |
| `handoffEvent(input)` | Promote new primary chef; original becomes observer |
| `getPendingCollaborationInvitations()` | Incoming pending invitations for the current chef |
| `getCollaboratingOnEvents()` | Events the current chef is an accepted collaborator on |
| `getConnectedChefsForCollaboration(search?)` | Search connected chefs for invite modal |

### Recipe sharing
| Function | Description |
|----------|-------------|
| `shareRecipe(input)` | Send a recipe share invitation to a connected chef |
| `respondToRecipeShare(input)` | Accept (creates deep copy) or decline a share |
| `getPendingRecipeShares()` | Incoming pending recipe shares |
| `getOutgoingRecipeShares(recipeId?)` | Shares sent by the current chef |

## UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `EventCollaboratorsPanel` | `components/events/event-collaborators-panel.tsx` | Owner's management UI: invite, role changes, handoff |
| `CollaborationInvitationCard` | same file | Invited chef's card: shows inviter, event name, role, Accept/Decline |
| `PendingRecipeShareCard` | same file | Recipe share recipient's card: shows sender, recipe name, Accept & Copy/Decline |

Both invitation cards are self-contained — they call `router.refresh()` internally after responding, so they work correctly whether rendered on the dashboard or any other page.

## UI Entry Points

- **Event detail page** (`/events/[id]`): "Chef Collaboration" card with invite, manage, and handoff controls. Shown for all non-cancelled events to the event owner.
- **Recipe detail page** (`/recipes/[id]`): "Share" button in the header opens `RecipeShareModal` inline. Outgoing shares are also listed.
- **Dashboard** (`/dashboard`): Three collaboration sections, each only visible when data exists:
  - **Collaboration Invitations** — pending event invitations addressed to the current chef, with Accept/Decline buttons
  - **Recipe Shares** — pending recipe share requests, with Accept & Copy/Decline buttons
  - **Collaborating On** — events the chef has accepted collaboration on, with role badge and link to event detail

## Handoff Flow

1. Event owner opens event detail → Chef Collaboration panel → "Hand Off Event"
2. Owner selects a currently-accepted collaborator as the new primary
3. Owner confirms ("I understand I will become an observer")
4. `handoffEvent()` is called:
   - New primary chef's collaborator row: role → `primary`, permissions → all-true
   - Owner's collaborator row (created if doesn't exist): role → `observer`, status → `accepted`, permissions → read-only (can_view_financials = true)
5. New primary sees event on their dashboard under "Collaborating On" with role badge "primary"
6. Original chef sees event with role badge "observer"

## Opt-Out Behaviour

- If a chef's `event_collaboration` network preference is `false`, `inviteChefToEvent` throws an error explaining they've opted out.
- If a chef's `recipe_sharing` network preference is `false`, `shareRecipe` throws similarly.
- These preferences are visible in network settings (future UI hook point).

## Email Notifications

Two transactional emails are now sent automatically — both are fire-and-forget (errors logged, never thrown):

| Trigger | Template | Recipient | Subject line |
| --- | --- | --- | --- |
| `inviteChefToEvent` | `collaboration-invite.tsx` | Invited chef | `{inviterName} invited you to collaborate on {occasion}` |
| `shareRecipe` | `recipe-share.tsx` | Receiving chef | `{sharerName} shared a recipe with you: {recipeName}` |

Both emails include a CTA button linking directly to `/dashboard` where the invitation card is waiting.
Both gracefully skip if `RESEND_API_KEY` is not configured (dev environments).

## Known Limitation: Collaborator Data Access

The RLS expansion on `events` (SELECT only) allows collaborating chefs to load the event record and the event detail page. However, most related data sections (expenses, financials, staff assignments, messages) are still fetched via tenant-scoped server actions and will appear empty for collaborating chefs. The collaborator role banner on the event detail page honestly states "some sections may be limited to the owner." Expanding full read access for collaborating chefs across all related tables is a future sprint.

## Refinements Applied (Post-Initial Implementation)

Three targeted fixes applied after initial release:

| Fix | File | Description |
| --- | ---- | ----------- |
| Event date on invitation card | `components/events/event-collaborators-panel.tsx` | The formatted event date (e.g. "Mar 15, 2026") is now displayed beside the event name in `CollaborationInvitationCard` so the invited chef can evaluate timing before accepting |
| Post-handoff dashboard dedup | `lib/collaboration/actions.ts` | `getCollaboratingOnEvents` now filters out events where `tenant_id === caller's id`. After a handoff, the original chef retains an observer row in `event_collaborators`, which previously caused their own event to appear twice on the dashboard (once in Events, once in Collaborating On). Now only appears in the main Events list. |
| Dashboard cache revalidation on send | `lib/collaboration/actions.ts` | `inviteChefToEvent` and `shareRecipe` now call `revalidatePath('/dashboard')` so the recipient chef's Next.js cache is cleared, ensuring pending items appear on their next dashboard visit without a manual refresh. |

## Verification

1. Connect two test chefs via the Chef Network
2. On Chef A's event → Collaboration panel → Invite Chef B as Co-Host
3. Chef B's dashboard shows the pending invitation (event name + date visible) on next visit
4. Chef B accepts → event appears in their "Collaborating On" dashboard section
5. Chef A opens the panel → sees Chef B with Co-Host badge, toggles role to Sous Chef
6. Chef A hands off to Chef B → Chef A's event no longer appears in their "Collaborating On" section (dedup fix); event still appears in their main Events list
7. Chef A opens a recipe → clicks Share → searches for Chef B → sends with note
8. Chef B receives recipe share → accepts → new recipe appears in their /recipes list with "Shared from another chef via ChefFlow." in notes
9. Both chefs' original recipes are unchanged
