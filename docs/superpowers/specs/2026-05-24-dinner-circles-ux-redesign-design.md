# Dinner Circles UX Redesign - Design Spec

**Date:** 2026-05-24
**Status:** Approved
**Surfaces:** Chef command center (`/circles/[id]`), client hub (`/my-hub/g/[groupToken]`), dashboard widget

---

## 1. Design Approach: Adaptive Hybrid

One circle, one data model, three presentation layers. Role-aware and device-aware rendering.

| Context               | Layout                                                      |
| --------------------- | ----------------------------------------------------------- |
| Chef Desktop          | Discord-style 3-column (rail + sidebar + content)           |
| Chef Mobile           | Stories rail + FAB + bottom sheet channel picker            |
| Consumer (any device) | Instagram-style stories rail + unified feed + 4 bottom tabs |

Routes remain unchanged:

- Chef: `/circles/[id]`
- Consumer: `/my-hub/g/[groupToken]`

Firewall is enforced at the data-fetch layer, not UI hiding. Consumer routes never query PIE tables, intelligence panels, or chef-internal data.

---

## 2. Role System (8 Roles, 4 Tiers)

| Tier      | Roles                      | Identity                                  |
| --------- | -------------------------- | ----------------------------------------- |
| Chef      | `chef`                     | ChefFlow user. Sees everything.           |
| Hosts     | `owner`, `host`, `co_host` | Client organizer, farm/venue partner      |
| Operators | `assistant`, `planner`     | Delegated help (sous chef, event planner) |
| Consumers | `member`, `guest`          | Invited diners                            |

Role groups from codebase:

- `EVERYONE` = all 8 roles
- `PARTICIPANTS` = all 8 roles
- `HOST_OPERATORS` = chef, owner, host, co_host, assistant, planner
- `HOSTS` = chef, owner, host, co_host

---

## 3. Visual Identity System

### 3.1 Avatar Ring (Permanent Role Indicator)

| Role         | Ring Style                                     |
| ------------ | ---------------------------------------------- |
| Chef         | Conic gold/red gradient, Instagram-story width |
| Host/Owner   | Linear gold gradient                           |
| Co-host      | Linear silver gradient                         |
| Operator     | Linear teal gradient                           |
| Member/Guest | No ring (subtle border only)                   |

Instagram's conic-gradient story ring pattern used for unread activity (purple/pink/orange). Role ring replaced by unread ring when circle has new activity.

### 3.2 Status Badge (Temporary State, Bottom-Right Corner)

| Badge     | Color                 | Meaning                   |
| --------- | --------------------- | ------------------------- |
| Checkmark | Green (#16a34a)       | Confirmed RSVP            |
| X         | Red (#dc2626)         | Declined this event       |
| Clock     | Amber (#d97706)       | Pending RSVP              |
| Fork      | Purple (#7c3aed)      | Has dietary restriction   |
| Star      | Gold-to-pink gradient | VIP / celebration honoree |
| +1        | Blue (#0095f6)        | Bringing plus-one(s)      |

Badge sizes scale with avatar: 14px on 32px avatars, 16px on 44px, 22px on 64px.

### 3.3 Avatar Backgrounds

Photo-like gradient fills per user (warm, cool, earth, rose, slate, sand, wine, ocean). Deterministic based on profile ID hash. No gimmicky CSS patterns.

### 3.4 Circle Icons (Stories Rail)

- Date badge overlay on active circles (e.g., "JUN 14")
- Dormant circles: 30% opacity + grayscale
- Unread circles: Instagram conic-gradient ring

---

## 4. Visibility Matrix

### 4.1 Actions (30 total)

| Action Group                                                                                                                | Chef | Host/Co-host | Operator | Consumer |
| --------------------------------------------------------------------------------------------------------------------------- | ---- | ------------ | -------- | -------- |
| **Share** (post, photo, link, question, Q&A)                                                                                | All  | All          | All      | All      |
| **Plan** (RSVP, dietary, accommodation, bring-list, vote, attendee cards, seating, celebration, menu reveal, report change) | All  | All          | All      | All      |
| **Plan** (set theme)                                                                                                        | Yes  | Yes          | Yes      | No       |
| **Host** (weather, live status, visual intake, collaborators, broadcast)                                                    | Yes  | Yes          | Yes      | No       |
| **Host** (invite member, growth actions)                                                                                    | Yes  | Yes          | No       | No       |
| **Reference** (itinerary, event packet, memory album, guide, print, digest, mute, privacy)                                  | All  | All          | All      | All      |

### 4.2 Workspace Modules (15 total)

| Module              | Chef                                      | Host/Co-host                   | Operator         | Consumer                                                     |
| ------------------- | ----------------------------------------- | ------------------------------ | ---------------- | ------------------------------------------------------------ |
| Arrival guide       | Full (12 sections)                        | Full                           | Full             | 9 sections (elevator/loading hidden, sensitive fields gated) |
| Attendee profiles   | Full + chef notes + history               | Full (no chef notes)           | Service-relevant | Own profile + public names                                   |
| Seating plan        | Full + conflict/keep-apart                | Full + keep-apart              | Layout only      | Own seat                                                     |
| Concierge Q&A       | Full + review queue                       | Full + review queue            | Browse           | Browse + ask                                                 |
| Celebration board   | Full + execution timing                   | Full                           | Full             | Participate (no surprise reveals)                            |
| Menu reveal         | Full + recipes + cost + margin + sourcing | Full (no cost/margin/sourcing) | Dishes + dietary | Dishes + dietary + stories                                   |
| Itinerary           | Full + prep/fire order                    | Run-of-show + host items       | Run-of-show      | Guest timeline only                                          |
| Weather/backup      | Full                                      | Full                           | View             | No                                                           |
| Live status         | Full + production stress                  | Status + timing                | Status           | No                                                           |
| Digest controls     | Full                                      | Full                           | Full             | Full                                                         |
| Event packet        | Full                                      | Filtered (no private/payments) | Filtered         | Guest packet only                                            |
| Collaborator access | Full + tenant                             | Manage                         | Own access       | No                                                           |
| Memory album        | Full + private feedback                   | Full + public                  | Photos           | Photos + view                                                |
| Growth engine       | Full                                      | Growth CTAs                    | No               | No                                                           |
| Visual intake       | Full                                      | Venue photos                   | Assigned         | No                                                           |

### 4.3 Chef-Only Data (Never Visible to Anyone Else)

- PIE pricing, ingredient costs, margins, supplier/sourcing names
- Revenue, refunds, payout, fees (`DinnerCircleSnapshot.money.*`)
- Chef notes about guests, guest preference history
- Remy/CIL intelligence panels, seasonal alerts, occasion detection
- Add-on prompt eligibility scores
- Production stress, fire order, prep timeline
- Substitution cost deltas, price tolerance tracking
- Series stats (retention, revenue, spend per event)
- `chef_only_risk` notifications
- `moderation_audit` logs

### 4.4 Consumer Never Sees

- Any financial data (PIE, costs, margins, revenue, fees)
- Supplier/sourcing info
- Chef notes about them or anyone
- AI/Remy engine output
- Kitchen ops (fire order, prep, production stress)
- Other guests' dietary details (own only)
- Other guests' accommodations (own only)
- Seating conflict/keep-apart notes
- Weather backup, live production status
- Action log, approval gates, collaborator management
- Growth engine, corporate config
- Change window status labels
- Recurring series stats

### 4.5 Accommodation Visibility

Controlled per-note via `visibility` field:

- `chef_only`: Chef only
- `host_only`: Hosts only
- `host_and_chef`: Hosts + chef
- `attendee_visible`: All circle members

Consumer always sees own accommodations only.

### 4.6 Notification Topics

| Topic            | Chef | Host/Co-host | Operator | Consumer | Default |
| ---------------- | ---- | ------------ | -------- | -------- | ------- |
| Major updates    | Yes  | Yes          | Yes      | Yes      | ON      |
| Dietary/allergy  | Yes  | Yes          | Yes      | Yes      | ON      |
| Menu/occasion    | Yes  | Yes          | Yes      | Yes      | ON      |
| Logistics        | Yes  | Yes          | Yes      | Yes      | ON      |
| Add-ons/payments | Yes  | Yes          | Yes      | Hidden   | OFF     |
| Chef-only risk   | Yes  | Hidden       | Hidden   | Hidden   | ON      |

All user-controllable per circle, per channel, per notification type. Full granular control. Consumer never sees `addons_payments` or `chef_only_risk` topics (absent from settings UI, not just off).

---

## 5. Chef Command Center (Desktop)

3-column layout:

### 5.1 Rail (72px)

Vertical circle strip. Same circles as stories rail but vertical. Active circle highlighted. Unread gradient ring. Click to switch.

### 5.2 Sidebar (240px)

Discord-style collapsible categories:

**Overview**

- `# dashboard`
- `# rsvp-center`

**Planning**

- `# menu`
- `# bring-list`
- `# theme`
- `# seating`
- `# polls`

**Guests**

- `# dietary`
- `# accommodations`
- `# arrival`

**Communicate**

- `# feed`
- `# broadcasts`
- `# chat`

**Host Ops**

- `# live-status`
- `# action-log`
- `# collaborators`
- `# growth`

Member list at bottom with compact avatar stack.

### 5.3 Content Pane

Active channel/module renders here. Full width minus sidebar.

### 5.4 Intelligence Panel

Collapsible right drawer. Contains Remy suggestions, seasonal alerts, PIE data, occasion detection. Opens on demand, does not eat space by default.

### 5.5 Action Drawer

FAB bottom-right. Opens 30-action drawer grouped by share/plan/host/reference.

---

## 6. Consumer Onboarding Flow

Triggered when client opens shared circle link (`/my-hub/g/[groupToken]`) for the first time.

### Step 1: Welcome (Airbnb-style)

Shows before asking for anything:

- Circle avatar + name
- Date, time, location (city level)
- Host name + chef name
- Who's coming (avatar stack with names)
- Menu preview (if published)
- Theme/vibe quote
- "Join This Circle" CTA
- "Already a member? Sign in" link

### Step 2: Quick Profile (3 fields)

- Name
- Email (for updates)
- Phone (optional)

### Step 3: RSVP

- Yes / Maybe / Can't make it
- Plus-ones: Just me / +1 / +2

### Step 4: Dietary (if RSVP = yes/maybe)

- Checkboxes: No restrictions, Vegetarian, Vegan, Gluten-free, Nut allergy, Dairy-free, Other
- Free text: "Anything else Chef [name] should know?"

### Step 5: Land in Circle

Drops into Instagram-style feed view. Stories rail at top (their circles). Recent activity in feed. Bottom tabs: Feed / Menu / Details / Me.

### Post-Onboarding

- Accommodation prompt surfaces as gentle card in feed: "Help us make your experience perfect. Any accessibility or comfort needs?"
- Not forced during onboarding; available early.

### Returning Visits

Cookie/token remembers them. Direct landing in feed. No re-onboarding.

### Approval Gate (if host enables)

After Step 2, shows: "Your request has been sent to [Host Name]. You'll get a notification when approved." Host gets notification to approve/reject.

---

## 7. Mobile Experience

### 7.1 Consumer Mobile

```
Header: Circle name + search
Stories rail: horizontal, scrollable
Content: active tab view
Bottom tabs: Feed | Menu | Details | Me
```

- No sidebar, no channels. Tabs are the organizer.
- Polls, bring list, theme appear as cards IN the feed when active.
- Swipe between circles via stories rail.

### 7.2 Chef Mobile

```
Header: hamburger + circle name + search
Stories rail: horizontal, scrollable
Content: active channel view
FAB: floating action button (opens 30-action drawer)
Bottom tabs: Home | Channels | Members
```

- Hamburger opens channel picker as bottom sheet
- FAB opens action drawer
- Swipe-up on FAB for quick intelligence panel
- Full member list with rings + badges + status

### 7.3 Mobile Gestures

- Swipe right on feed item: quick reply
- Long press avatar: member profile card
- Pull down: refresh feed
- Swipe left on stories circle: archive/mute
- Tap + hold stories circle: peek at summary

### 7.4 Bottom Sheet Pattern

Channel picker, action drawer, member list, and deeper content use iOS/Android bottom sheet (slides up from bottom, draggable handle, dimmed background).

---

## 8. Circle Navigation

### 8.1 Stories Rail + Unified Feed

Instagram-inspired dual navigation:

- **Top:** Horizontal circle avatars. Tap to enter. Unread = gradient ring. Auto-sorted by activity.
- **Below:** Unified feed mixing activity from all circles. Each card tagged with circle name. Passive browsing.

### 8.2 Circle Lifecycle

1. **Always alive**: Circles never die. Permanent relationship container.
2. **Auto-hibernate**: Dims after inactivity (30% opacity, grayscale, sinks to end of rail).
3. **Seasonal intelligence**: AI surfaces circles as relevant season approaches (e.g., "Johnsons always book Thanksgiving").
4. **Chef override**: Manual pin, archive, pause. Chef always has final say.
5. **Instant revival**: Any activity (message, booking, poll) snaps circle back to full active state.

### 8.3 Scale Behavior

| Member count | Display                                  |
| ------------ | ---------------------------------------- |
| 1-8          | All avatars visible with rings + badges  |
| 9-15         | First 6 shown, "+N more" overflow        |
| 16+          | Top 4 (host, co-hosts, chef), "+N" count |

---

## 9. Notification System

Full granular user control. Every circle, every channel, every notification type has its own toggle. Chef and consumer each control their own preferences.

No forced notifications except critical safety (dietary allergy alerts when `chefRelevant: true`).

---

## 10. Technical Architecture

```
Circle Data Layer (shared)
├── circle_members (role, can_post, status)
├── dinner_circle_action_log
├── dinner_circle_bring_items
├── dinner_circle_polls / poll_votes
├── dinner_circle_broadcasts
├── dinner_circle_theme_boards
└── hub_groups / hub_group_members

Chef View Layer (/circles/[id])
├── Full data access (all tables)
├── Intelligence panel (Remy, CIL, PIE)
├── 3-column desktop layout
├── FAB + bottom sheet mobile layout
└── All 30 actions + 15 modules

Consumer View Layer (/my-hub/g/[groupToken])
├── Firewalled data access (social only)
├── No intelligence, no financial, no chef notes
├── Instagram feed + 4 tabs
└── Response-only actions (RSVP, vote, dietary)
```

Firewall enforced at server action / query level. Consumer routes never import PIE resolvers, intelligence panels, or chef-note queries.

---

## 11. Mockups

Browser mockups created during brainstorm:

1. `living-rail-and-menu-journey.html` - Original 4-screen mockup (living rail, sidebar, menu journey, collaborative feed)
2. `avatar-rings-and-badges.html` - Instagram-style avatar system with role rings, status badges, stories rail, unified feed, circle detail panel, desktop split view
3. `mobile-experience.html` - Three phone frames: consumer onboarding, consumer in-circle feed, chef mobile with bottom sheet channel picker

---

## 12. Implementation Scope

This spec covers the UI/UX layer. Backend infrastructure (action types, workspace modules, circle tables, polls, broadcasts, bring lists, theme boards, accommodations, arrival guides, co-hosting, recovery) already exists in `lib/dinner-circles/`.

Implementation work:

- New component architecture for adaptive hybrid rendering
- Role-aware data fetching with firewall enforcement
- Instagram-style stories rail component
- Unified activity feed component
- Avatar ring + badge component system
- Consumer onboarding flow
- Chef 3-column desktop layout
- Mobile bottom sheet and gesture handling
- Notification granular control UI
- Circle lifecycle engine (auto-hibernate, seasonal intelligence)
