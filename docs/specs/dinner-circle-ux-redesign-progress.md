# Dinner Circle UX Redesign: Brainstorm Progress

**Status:** IN PROGRESS (brainstorming phase)
**Date started:** 2026-05-23
**Mockups:** `.superpowers/brainstorm/365504-1779588452/content/`

## Design Decisions (Locked)

### Structure: Discord + One UI Fusion

- Discord 3-column layout: circle rail / channel sidebar / content pane
- Samsung One UI styling: bold colors, rounded cards, vibrant accents, gradient stats
- Discord grays (#1e1f22, #2b2d31, #313338) as base palette
- One UI gradient cards for stats and hero sections

### Navigation: B+C Hybrid

- Desktop: Icon sidebar (circle rail) + channel sidebar + content pane
- Mobile: Hamburger for circle switching, channel list as stack nav, tap for full content

### Channel Organization: Hybrid of All Four Models

- Lifecycle-aware categories shift with event progression
- Chef-thinking grouping as base (People, The Meal, The Event, Conversation, Memories, Chef Only)
- Customizable channels (add/remove/rename/reorder per circle)
- Auto-expanding (features auto-create channels when activated)

### Consumer Polish (Not Techy)

- Warm human labels: "Who's Coming", "What to Bring", "Getting There", "Group Decisions"
- No # symbols, emoji icons only
- Guided actions with contextual CTAs ("Nudge", "Let Remy Handle", "Update Menu")
- Readiness ring with visual progress
- "Needs Your Attention" section with one-click resolve
- Timeline showing past/present/future

### Client View: Two Modes

- Default: Simplified card-based experience (mobile-first, no login needed)
- Toggle: "Switch to Full View" for power-user clients who want channel layout
- Token-based access, sanitized data (no chef-only info leaks)

### Channel Categories (6 groups, 23+ channels)

1. **People** (5): Who's Coming, Dietary Needs, Access Needs, Seating, Attendee Profiles
2. **The Meal** (4): Menu, Menu Vote, Shopping & Sourcing, What to Bring
3. **The Event** (5): Getting There, Theme & Vibe, Group Decisions, Itinerary, Weather Plan
4. **Conversation** (3): Chat, Announcements, Celebration Wall
5. **Memories** (2): Photos, Past Dinners
6. **Chef Only** (4): Notes, Money, Client Intel, Change Log

### Home Dashboard Sections

- Hero header with circle name, date, location
- Readiness ring (SVG progress toward dinner night)
- Countdown stat cards (days, confirmed, courses, revenue)
- "Needs Your Attention" with guided actions
- Dinner timeline (inquiry to post-event)
- "At a Glance" summary cards
- "What Remy Did Today" activity log
- Recent activity feed

### Remy Integration

- Appears as BOT user (Discord-style badge)
- Posts system events as messages in chat
- Activity logged on Home dashboard
- Can auto-handle tasks ("Let Remy Handle" button)

## Screens Designed (10)

1. Home Dashboard
2. Who's Coming (full guest management)
3. Menu (courses, dietary matrix, PIE pricing)
4. What to Bring (collaborative claim list)
5. Group Decisions (polls with chef review gates)
6. Getting There (12-section arrival guide)
7. Chat (Discord-style + Remy bot)
8. Client Simplified View (card-based, mobile-first)
9. Theme & Vibe (visual board + contributions)
10. Chef-Only: Money (private pricing + PIE)

## Still Needed (User Feedback 2026-05-23)

### Dynamic Rail (NOT stagnant)

- Circle rail must be alive: activity indicators, pulse animations, unread states
- Show which circles have activity, which need attention
- Status indicators beyond just badges

### Collapsible Menus

- Sidebar categories should collapse/expand
- Remember state per user
- Progressive disclosure of channels

### Collaborative Feeds

- Chef + consumers post together in a shared feed
- Not just chat: structured posts (updates, photos, questions, decisions)
- Mixed media timeline

### Menu Journey Widget

- Running widget showing full menu evolution
- Stages visible: rough draft, suggestions, polling results, comments
- Integrates: allergies, theme influence, occasion, seasonality
- Shows: exclusive items, secret items, birthday items
- How the menu got to where it is (decision trail)

### Additional Menu Intelligence

- Seasonal ingredient highlighting
- Occasion-specific suggestions
- Secret/surprise course options (hidden from guests until reveal)
- Birthday/celebration special items
- Exclusivity indicators
- Comment threads per course
- Suggestion engine integration
