# Frontend Redesign V2 - March 2026

## What changed and why

### Dashboard: Widget Grid to Daily Briefing

**Before:** Flat 4-column grid of uniform widget cards. Every widget had equal visual weight (small card, colored left border, uppercase title). Nothing stood out.

**After:** Structured vertical flow with clear hierarchy:

- **Greeting header** uses display font at 3xl-4xl. The greeting changes by time of day ("Here's your day at a glance" / "Your afternoon overview" / "End-of-day summary"). Removed the word "Dashboard" as the title since the greeting IS the dashboard.
- **Hero metrics** are now bare (no card wrapper). Each metric uses the new `.metric-display` class (display font, clamp(1.75rem, 3vw, 2.5rem)). Hover shows a subtle bottom gradient accent. Numbers command attention first.
- **Section dividers** (`.section-label`) replace the uniform card grid. Sections are labeled "Today & This Week", "Alerts & Health", "Business" with a fading line after the label. Each section has its own grid container, so content is grouped logically.
- **Priority banner** has improved hover (translate-y + shadow instead of opacity change). The "Go" arrow nudges right on hover.

**Files:**

- `app/(chef)/dashboard/page.tsx` - layout restructure
- `app/(chef)/dashboard/_sections/hero-metrics-client.tsx` - unwrapped from cards
- `components/dashboard/shortcut-strip.tsx` - tighter spacing, subtler icons
- `components/dashboard/widget-cards/widget-card-shell.tsx` - lighter borders, smaller icon
- `components/dashboard/widget-cards/stat-card.tsx` - uses `.metric-display-sm` for values

### Typography

**New CSS classes added to `globals.css`:**

- `.metric-display` - large display numbers (clamp 1.75-2.5rem, display font, tight tracking)
- `.metric-display-sm` - medium display numbers (1.5rem, display font)
- `.section-label` - section dividers with fading line (uppercase, muted, 0.6875rem)
- `.flat-row` - list rows without card wrappers (border-bottom divider, hover highlight)
- `.animate-fade-slide-up` - page transition animation (was used but not defined)

### Card System

**Widget card shell** lightened:

- Border reduced from 4px to 3px left accent
- Removed outer box-shadow glow (was visually noisy at scale)
- Icon size reduced from base to sm, opacity lowered
- Title text made smaller (xxs vs xs), bolder, more muted
- Hover changed from card-lift + brightness to translate-y-[-2px] + shadow (more subtle)

**Base Card component:**

- Border opacity reduced from 60% to 40% (less boxy feel)
- Interactive hover border accent toned down slightly

### Landing Page

**Before:** Hero + emoji feature grid + CTA. Generic template look.

**After:**

- **Headline:** Uses fluid display font ("The operating system for private chefs.") with text-gradient
- **Sub-headline:** Two-line layout with line break on desktop for rhythm
- **Trust signals:** Replaced text row with metric-style stats (Free/forever, Self/hosted, Zero/commission, 100%/private) using display font for the stat value
- **Features section:** Replaced emoji icon cards with numbered grid. Each capability gets a numbered label (01-06) in brand orange, title, and one-line detail. Grid has shared border for visual cohesion. No individual card wrappers.
- **CTA section:** Larger padding, display font heading, bigger shadow on button
- All buttons upgraded to rounded-2xl for consistency

### Sidebar Navigation

- Header height reduced from h-16 to h-14 (more compact)
- Border colors lightened (stone-800/40 instead of stone-800/60)
- Removed heavy shadow from header
- Group labels: font-size reduced from text-base to text-sm, removed manual letter-spacing
- Group icons: 18px instead of 20px, stone-500 instead of stone-400
- Inactive labels: opacity-70 instead of opacity-50 (more readable)
- Child items border: 1px instead of 2px, 60% opacity (lighter hierarchy lines)
- Hover backgrounds: bg-stone-800/60 (softer, less jarring)

## Design principles applied

1. **Hierarchy through typography, not containers.** Display font + size creates hierarchy. Cards reserved for grouped interactive content.
2. **Less boxing, more breathing.** Removed card wrappers where content doesn't need a container. Increased spacing between sections.
3. **Personality through the display font.** DM Serif Display now shows up in hero metrics, landing page stats, and section headings. It's the brand's editorial voice.
4. **Subtle interactions.** Replaced brightness/opacity hover states with translate + shadow. Small arrow nudges on "Go" links. Bottom gradient accent on metric hover.
5. **Section grouping.** Dashboard content grouped into labeled sections instead of a flat grid. Easier to scan, clearer mental model.
