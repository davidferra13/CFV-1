# Sophie Kaplan: Dinner Circle Control Surface

> **Persona:** Hyper-engaged host, theme-driven, 20-guest dinners, high-control, high-detail.
> **Core problem:** The system cannot contain or structure this level of control and input.
> **Solution:** 3 new components + 1 new tab in Dinner Circles. Zero migrations. Read-only aggregation of existing data.

---

## Architecture Decision: Why No Migrations

Everything Sophie needs already exists in the database. The gap is **display and aggregation**, not storage.

| Data Sophie Wants          | Already Stored In                                      |
| -------------------------- | ------------------------------------------------------ |
| Who joined the circle      | `hub_group_members`                                    |
| Who submitted dietary info | `hub_guest_profiles.known_allergies` + `known_dietary` |
| Who voted on menu          | `hub_poll_votes`                                       |
| Who confirmed attendance   | `hub_meal_attendance`                                  |
| Locked menu decisions      | `hub_polls.locked_option_id`                           |
| Photos/assets              | `hub_media`                                            |
| Member roles/status        | `hub_group_members.role`                               |

**What's missing is a single screen that rolls all of this up.** That's what we build.

---

## What To Build (3 Components + 1 Tab)

### Component 1: Guest Completion Tracker

**File:** `components/hub/guest-completion-tracker.tsx`
**Action file:** `lib/hub/completion-tracker-actions.ts`

A panel showing per-guest completion status across all required actions. Visible to owner/admin/chef only.

**Data shape (returned by server action):**

```ts
type GuestCompletionRow = {
  profileId: string
  displayName: string
  avatarUrl: string | null
  joinedAt: string
  dietary: 'complete' | 'empty' | 'partial'
  rsvp: 'confirmed' | 'maybe' | 'declined' | 'pending'
  menuVoted: boolean
  lastActive: string | null
}

type CompletionSummary = {
  total: number
  dietaryComplete: number
  rsvpConfirmed: number
  menuVoted: number
  guests: GuestCompletionRow[]
}
```

**Server action (`lib/hub/completion-tracker-actions.ts`):**

```ts
'use server'

export async function getGuestCompletionStatus(
  groupId: string,
  groupToken: string,
  eventId?: string | null
): Promise<CompletionSummary>
```

Implementation:

1. Query `hub_group_members` JOIN `hub_guest_profiles` for the group
2. For dietary: check if `known_allergies` or `known_dietary` is non-empty (or if they explicitly confirmed "none" via the dietary dashboard)
3. For RSVP: check `hub_meal_attendance` for the linked event's meal entries, or `event_guests.rsvp_status` if the event uses RSVP
4. For menu voted: check `hub_poll_votes` for any vote by this profile in polls scoped to the event
5. For lastActive: use `hub_group_members.last_read_at`

**UI:**

```
Guest Readiness          14/20 complete
[==============------] 70%

Name           Dietary   RSVP        Menu Vote   Last Active
------------------------------------------------------------
Alice M.       [check]   Attending   [check]     2h ago
Bob R.         [check]   Attending   [check]     1d ago
Carol S.       [warn]    Maybe       [x]         3d ago
David T.       [x]       Pending     [x]         Never
...

[x] = missing    [check] = done    [warn] = partial
```

- Progress bar at top with fraction and percentage
- Sortable by completion status (incomplete first)
- Color coding: green (done), amber (partial), red (missing/pending)
- "Nudge" button per row that opens chat with @mention (stretch goal, not required for v1)

---

### Component 2: Host Dashboard Tab

**File:** `components/hub/host-dashboard-tab.tsx`

A new tab in hub-group-view.tsx visible ONLY to owner/admin. Single source of truth for the event.

**Sections (top to bottom):**

1. **Event Header** - Event date, guest count, circle name
2. **Guest Completion Tracker** (Component 1, embedded)
3. **Menu Status** - Which courses are locked vs still voting. Shows locked dish name per course. If no polls exist yet, shows "Menu not published"
4. **Dietary Rollup** (existing `DietaryDashboard` component, re-used)
5. **Photo Count** - "{N} photos shared" with link to Photos tab
6. **Quick Links** - Buttons: "Go to Chat", "Go to Events", "Invite Guests"

**Tab registration in hub-group-view.tsx:**

Add `'dashboard'` to the Tab union type. Add it as the FIRST tab in the `baseTabs` array, but ONLY when `isOwnerOrAdmin` is true:

```ts
const baseTabs = [
  // Dashboard tab: owner/admin only, always first
  ...(isOwnerOrAdmin ? [{ id: 'dashboard' as Tab, label: 'Dashboard', emoji: '📊' }] : []),
  { id: 'chat', label: 'Chat', emoji: '💬' },
  // ... rest unchanged
]
```

**Props needed:** All props already available in `HubGroupViewProps` - members, media, householdSummary, linkedEventId, groupEvents. The completion tracker fetches its own data via server action.

**Default tab for owners:** When `isOwnerOrAdmin` is true, default to `'dashboard'` instead of `'chat'`:

```ts
const [activeTab, setActiveTab] = useState<Tab>(
  isOwnerOrAdmin ? 'dashboard' : ((group as any).default_tab as Tab) || 'chat'
)
```

Wait - `isOwnerOrAdmin` depends on `currentMember` which is set in a `useEffect`. So the default tab logic needs adjustment. Set default to `'chat'` initially, then in the useEffect where `currentMember` is resolved, if the member is owner/admin AND the tab is still `'chat'`, switch to `'dashboard'`.

---

### Component 3: Chef Decision Brief

**File:** `components/hub/chef-decision-brief.tsx`
**Action file:** `lib/hub/chef-decision-brief-actions.ts`

A read-only, printable summary panel that converts raw circle activity into structured decisions for the chef. This is the "noise filter" - the chef sees clean, finalized info instead of 200 chat messages.

**Where it appears:** On the chef's event detail page (`app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx`), in a new collapsible section titled "Circle Brief".

**Data shape:**

```ts
type ChefDecisionBrief = {
  eventId: string
  circleId: string | null
  circleName: string | null
  guestCount: number
  confirmedCount: number
  dietarySummary: {
    allergies: string[] // deduplicated across all guests
    restrictions: string[] // deduplicated
    guestsWithRestrictions: number
    guestsNoData: number
  }
  menuDecisions: {
    courseName: string
    courseNumber: number
    lockedDish: string | null // null = not yet decided
    voteCount: number
    topChoice: string | null // leading vote if not locked
  }[]
  lastCircleActivity: string | null
}
```

**Server action:**

```ts
'use server'

export async function getChefDecisionBrief(
  eventId: string,
  tenantId: string
): Promise<ChefDecisionBrief | null>
```

Implementation:

1. Find the hub_group linked to this event via `hub_group_events`
2. Count members, count confirmed attendance
3. Aggregate dietary from `hub_guest_profiles` for all circle members
4. Read poll state via `getDinnerCircleMenuPollingState` (existing action) and extract locked/leading dishes
5. Get last message timestamp from the circle

**UI:**

```
Circle Brief: "Sophie's Spring Dinner"
18 guests confirmed (20 invited)

DIETARY ALERTS
  Allergies: Shellfish (2), Dairy (3), Peanuts (1)
  Restrictions: Vegetarian (4), Gluten-free (2)
  2 guests have not submitted dietary info

MENU DECISIONS
  Course 1: Appetizer    -> Burrata Salad [LOCKED]
  Course 2: Main         -> Voting (Lamb leads, 12 votes)
  Course 3: Dessert      -> Not published yet

Last circle activity: 2 hours ago
```

- Collapsible, starts expanded
- No edit controls - read only
- Print-friendly (no dark backgrounds in print media query)

---

## Wiring Summary

### Files to CREATE (new):

| File                                          | Purpose                           |
| --------------------------------------------- | --------------------------------- |
| `components/hub/guest-completion-tracker.tsx` | Per-guest completion grid         |
| `lib/hub/completion-tracker-actions.ts`       | Server action for completion data |
| `components/hub/host-dashboard-tab.tsx`       | Owner/admin dashboard tab         |
| `components/hub/chef-decision-brief.tsx`      | Chef-facing decision summary      |
| `lib/hub/chef-decision-brief-actions.ts`      | Server action for chef brief data |

### Files to MODIFY (minimal, surgical):

| File                                                               | Change                                                                                                                                       |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(public)/hub/g/[groupToken]/hub-group-view.tsx`               | Add 'dashboard' to Tab union, add tab to baseTabs (owner/admin only), add tab content render, add useEffect to switch default tab for owners |
| `app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx` | Import and render `ChefDecisionBrief` in a new collapsible section                                                                           |

### Files to NOT TOUCH:

- No migrations
- No changes to `database/` anything
- No changes to `types/database.ts`
- No changes to existing hub components (dietary-dashboard, menu-board, etc.)
- No changes to auth, billing, or financial code

---

## Codex Safety Constraints

Each agent task:

- Touches at most 3 files
- Creates new files rather than heavily modifying existing ones
- Uses existing server actions and types where possible
- Has explicit "DO NOT" lists
- Has no database migrations
- Cannot break existing functionality (all changes are additive)

---

## Acceptance Criteria

### Component 1: Guest Completion Tracker

- [ ] Shows all circle members with dietary/RSVP/vote status
- [ ] Progress bar with fraction and percentage
- [ ] Incomplete guests sorted first
- [ ] Color-coded status indicators
- [ ] Only visible to owner/admin/chef

### Component 2: Host Dashboard Tab

- [ ] New "Dashboard" tab appears for owner/admin only
- [ ] Dashboard is default tab for owner/admin
- [ ] Contains: completion tracker, menu status, dietary rollup, photo count, quick links
- [ ] Regular members see no change (no dashboard tab, default to chat)

### Component 3: Chef Decision Brief

- [ ] Appears on chef event detail page when event has a linked circle
- [ ] Shows: guest count, dietary summary, menu decisions (locked/voting/unpublished)
- [ ] Read-only, no edit controls
- [ ] Returns null gracefully when no circle is linked

---

## What This Does NOT Solve (Future Work)

These are real gaps from the Sophie profile that require migrations or complex wiring. Flag for a future spec:

1. **Per-guest plate assignment** - After voting, assign specific dishes to specific guests. Needs new `hub_guest_menu_assignments` table.
2. **Real-time pricing in hub** - Show cost impact as courses change. Needs pricing data piped into the public hub (currently chef-only).
3. **Theme/asset organization** - Tie photos to specific courses or decisions. Needs `course_number` column on `hub_media`.
4. **Structured guest nudging** - Auto-remind guests who haven't completed actions. Needs notification queue integration.
