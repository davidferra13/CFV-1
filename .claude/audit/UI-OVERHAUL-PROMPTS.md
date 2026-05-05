# ChefFlow UI Overhaul: Engineered Prompts

> **Context:** Full visual audit completed 2026-05-04. Screenshots in `.claude/audit/`.
> Product is structurally excellent (798 pages, clean routing, good domain separation).
> Visual layer is generic AI-dashboard aesthetic. These prompts fix that.
>
> **Rules for every prompt:**
>
> - 21st Magic MCP is installed. Use it to source components when beneficial.
> - Dark theme stays. We're improving it, not replacing it.
> - Brand colors (warm saffron/amber) stay. CSS vars in `app/globals.css`.
> - No new dependencies without justification. Tailwind + existing `components/ui/` primitives.
> - Every `Agent` call MUST include `model: "haiku"` or `model: "opus"`.
> - Never delete existing functionality. Visual upgrades only.
> - `npx tsc --noEmit --skipLibCheck` must pass after changes.
> - Screenshot before/after with Playwright to verify.

---

## PROMPT 1: Design System Foundation

```
TASK: Upgrade ChefFlow's design system foundation. This is a VISUAL-ONLY upgrade. No functionality changes.

CONTEXT: ChefFlow is a private chef operations platform. Dark theme with warm saffron/amber brand colors. Currently every surface looks like the same dark rectangle. We need visual hierarchy, texture, and breathing room.

The design system lives in:
- `app/globals.css` (1,742 lines, CSS custom properties, surface layers, glass effects)
- `tailwind.config.ts` (color scales, font sizes, animations)
- `components/ui/card.tsx` (the most-used component; every page is a grid of these)
- `components/ui/button.tsx`
- `components/ui/badge.tsx`
- `components/ui/stat-card.tsx`
- `components/ui/empty-state.tsx`
- `components/ui/page-header.tsx`
- `components/ui/section-divider.tsx`

21st Magic MCP is available. Use it to research modern card variants, glass effects, and visual hierarchy patterns.

CHANGES NEEDED:

1. **Card variants** - `components/ui/card.tsx` needs 3-4 visual variants, not one:
   - `default` - current subtle card
   - `elevated` - slight lift, stronger shadow, hover scale
   - `glass` - frosted glass effect (globals.css already has glass tokens but they're unused)
   - `highlight` - brand-colored border/glow for attention items
   Add a `variant` prop. Keep backward compatible (default = current look).

2. **Typography hierarchy in globals.css** - Add utility classes:
   - `.text-display` - large, bold, for page heroes (2rem+)
   - `.text-headline` - section headers (1.25rem, semibold)
   - `.text-label` - small caps or uppercase tracking for card labels
   - `.text-metric` - large numbers for stats (tabular-nums, bold)

3. **Spacing rhythm** - Add to tailwind.config.ts:
   - `section` spacing token (3rem) for between-section gaps
   - `card-grid` gap token (1.25rem) for card grids
   Consistent gaps prevent the "packed tight" feel.

4. **Surface depth** - globals.css already defines surface-0 through surface-4 but cards don't vary.
   Update card variants to use different surface levels so nested content has visual depth.

5. **Transition polish** - Add to globals.css:
   - Default transition on all interactive card elements (150ms ease)
   - Hover states: subtle scale (1.01), shadow lift, border brighten

CONSTRAINTS:
- Touch ONLY the files listed above. No page-level changes.
- Every card currently using `<Card>` must look identical after (default variant).
- TypeScript must pass: `npx tsc --noEmit --skipLibCheck`
- Test by running `npx next build --no-lint` at the end.
```

---

## PROMPT 2: Dashboard Transformation

```
TASK: Redesign the chef dashboard from "developer debug panel" to "chef's morning briefing." VISUAL OVERHAUL, preserve all data/functionality.

CONTEXT: The dashboard is the most-seen page in ChefFlow. Currently it's an endless vertical scroll of identically-styled dark cards with red/yellow/orange alert badges fighting for attention. A chef opening this should feel informed and in control, not overwhelmed.

Screenshot: `.claude/audit/screenshot-dashboard.png` (review it first)

KEY FILES:
- `app/(chef)/dashboard/page.tsx` - main page (read it first)
- `app/(chef)/dashboard/_sections/` - 29 section components (list them all first)
- `app/(chef)/dashboard/_sections/hero-metrics.tsx` - top metrics strip
- `app/(chef)/dashboard/_sections/alerts-section.tsx` - alerts/action items
- `app/(chef)/dashboard/_sections/schedule-section.tsx` - upcoming schedule
- `app/(chef)/dashboard/_sections/business-section.tsx` - business metrics
- `app/(chef)/dashboard/_sections/intelligence-section.tsx` - AI insights
- `app/(chef)/dashboard/_sections/smart-suggestions.tsx` - suggestions
- `components/ui/card.tsx` - card component (may have variants from Prompt 1)
- `components/ui/stat-card.tsx` - metric display

DESIGN DIRECTION:
1. **Hero zone** (top 400px) - This is the "glance zone." Chef sees this without scrolling.
   - Greeting with time-of-day awareness ("Good morning, Chef" / "Evening wrap-up")
   - 3-4 key metrics in large, well-spaced stat cards (today's events, outstanding balance, prep items due, unread messages)
   - Next event countdown if one exists today
   - Use glass card variant or elevated cards to differentiate from body

2. **Priority actions** - Below hero, max 3 urgent items. NOT a long scrolling list.
   - Red = needs action NOW (unpaid invoice overdue, event tomorrow with no menu)
   - Amber = needs attention this week
   - If more than 3, show "View all X action items" link
   - Use highlight card variant with left border color coding

3. **Content sections** - Organize remaining content into collapsible sections:
   - "This Week" (schedule, prep timeline)
   - "Business" (revenue, pipeline, client insights)
   - "Intelligence" (AI suggestions, trends)
   - Each section has a clear header, can be collapsed
   - Sections use subtle visual separators, not just stacked cards

4. **Reduce card count** - Combine related small cards into composite widgets.
   Dashboard currently has 29 section files. Many should merge or become sub-widgets.

5. **Breathing room** - Generous padding between sections. Use section spacing tokens.

CONSTRAINTS:
- All existing data must remain accessible (collapse, not remove)
- Server components stay server components. Client components stay client.
- Don't break the WidgetErrorBoundary pattern already in use.
- `npx tsc --noEmit --skipLibCheck` must pass.
- Screenshot the result with Playwright when done.
```

---

## PROMPT 3: Events Page Polish

```
TASK: Visual upgrade for the Events page. Make it feel like a professional event management tool, not a database table.

Screenshot: `.claude/audit/screenshot-events.png` (review it first)

KEY FILES:
- `app/(chef)/events/page.tsx` - main events page
- `app/(chef)/events/board/page.tsx` - kanban board view (if exists)
- `components/events/` - all event-related components (list directory first)
- `components/ui/card.tsx` - card variants
- `components/ui/badge.tsx` - status badges
- `components/ui/responsive-table.tsx` - data table

CHANGES:
1. **Pipeline cards** (top row: New Event, Calendar, Kanban, Inquiries, Quotes, etc.)
   - Give each card a distinctive icon + subtle color accent (not all identical)
   - Add hover state with elevation change
   - Reduce from 8 equal cards to categorized groups: "Create" | "Views" | "Pipeline"

2. **Event status badges** - Make statuses visually unmistakable:
   - Draft = stone/gray, dashed border
   - Proposed = amber, subtle glow
   - Confirmed = green, solid
   - Completed = brand color, checkmark
   - Cancelled = red, strikethrough style
   Currently they're tiny dots. Make them proper pill badges with icons.

3. **Event table rows** - Add visual weight to key columns:
   - Event name should be semibold, primary text color
   - Date should use a compact calendar-icon format
   - Status badge prominent
   - "Next step" column gets action-button styling
   - Alternating row subtle background difference

4. **Empty state** - If no events in a category, show appetizing empty state, not blank.

CONSTRAINTS:
- Keep all existing filtering/sorting functionality
- Server/client component boundaries unchanged
- TypeScript must pass
- Screenshot with Playwright when done
```

---

## PROMPT 4: Clients Page Upgrade

```
TASK: Visual upgrade for the Clients page. Transform from "database admin" to "relationship manager."

Screenshot: `.claude/audit/screenshot-clients.png` (review it first)

KEY FILES:
- `app/(chef)/clients/page.tsx`
- `components/clients/` - all client components (list directory first)
- `components/ui/avatar.tsx`
- `components/ui/card.tsx`
- `components/ui/responsive-table.tsx`

CHANGES:
1. **Insight cards** (top row: Client Insights, Loyalty, Follow-Ups, Dietary, Recurring, Partners)
   - Each gets a unique accent color and meaningful icon
   - Show the key metric number prominently (not hidden in description)
   - Glass or elevated card variant for visual lift

2. **Client invitation form** - Currently floating awkwardly mid-page.
   - Move into a slide-out panel or modal triggered by "+ Add Client" button
   - Or collapse it into an expandable section with clean toggle

3. **Client table**
   - Add avatar/initials circle before client name
   - VIP/segment tags as colored badges
   - Revenue column with spark visual (not just $0.00)
   - Last contact date with relative time ("2 days ago" not "2026-05-02")
   - Row hover shows quick-action buttons (email, view, edit)

4. **Search/filter bar** - Make it more prominent, add filter chips for segments (VIP, Active, Inactive)

CONSTRAINTS:
- Don't break existing client data loading patterns
- TypeScript must pass
- Screenshot with Playwright when done
```

---

## PROMPT 5: Public Homepage Redesign

```
TASK: Redesign the public homepage to feel like a premium food brand, not a SaaS landing page.

Screenshot: `.claude/audit/screenshot-homepage-loggedout.png` (review it first)

KEY FILES:
- `app/(public)/layout.tsx` - public layout
- `app/(public)/page.tsx` - homepage (or find the actual route)
- `components/public/` - public components (list directory first)
- `components/navigation/public-header.tsx`
- `components/navigation/public-footer.tsx`

21st Magic MCP is available. Use it to source hero section patterns, testimonial layouts, and feature showcases.

CHANGES:
1. **Hero section**
   - Replace generic blurred food background with a gradient or abstract culinary pattern
   - "Find a private chef near you" headline needs more visual impact
   - Search bar should feel premium (larger, glass effect, subtle animation on focus)
   - Add social proof below search ("Trusted by X chefs" or similar)

2. **Value proposition section** ("Run private chef, catering...")
   - Currently text-heavy left column + tiny screenshot right column
   - Make the product screenshot MUCH larger and more prominent
   - Break value props into icon+text cards with clear visual scanning

3. **Footer**
   - Currently massive and dense. Simplify to 3-4 columns max.
   - Remove redundant links
   - Add newsletter signup or CTA
   - Breathing room between sections

4. **Overall feel**
   - Typography: Use display font weight for headlines
   - Color: Warmer, more appetizing palette (lean into saffron/amber for warmth)
   - Spacing: Much more generous whitespace between sections
   - Remove "DEVELOPMENT" badge from public view

CONSTRAINTS:
- Keep SEO metadata intact
- Keep all functional links
- Public pages must work without authentication
- TypeScript must pass
- Screenshot with Playwright when done
```

---

## PROMPT 6: Culinary Hub + Ingredient Pages

```
TASK: Visual upgrade for the Culinary Hub and public Ingredients page.

Screenshots: `.claude/audit/screenshot-culinary.png` and `.claude/audit/screenshot-ingredients.png` (review both first)

KEY FILES:
- `app/(chef)/culinary/page.tsx` (or find "Culinary Hub" page)
- `app/(public)/ingredients/page.tsx` (public ingredient guide)
- `components/culinary/` - culinary components
- `components/ui/food-placeholder-image.tsx` - food placeholder images

CULINARY HUB CHANGES:
1. **Feature cards** (Recipe Book, Menus, Ingredients, Food Costing, Prep, Vendors, Import)
   - Each card gets a culinary-themed gradient or illustration (not just emoji icons)
   - Show preview data: "18 recipes" should be visible ON the card, not in separate stat row
   - Cards should have distinct hover states
   - Consider 2-column layout (larger feature cards) instead of 3x2 grid of small ones

2. **Stats strip** (18 Recipes, 5 Menus, 20004 Ingredients, 2 Vendors)
   - Integrate into cards or make into a proper metrics bar with visual flair
   - "20,004" needs comma formatting
   - Use animated counters for delight

3. **Loading skeleton** at bottom - Fix the visible skeleton bars. Should be hidden or properly styled.

INGREDIENTS PAGE CHANGES:
1. **This is the most brand-damaging page.** A food platform showing ingredients as tiny text-only cards.
   - Add `food-placeholder-image` or category illustrations to each card
   - Increase card size significantly
   - Show category, season, and key attributes visually
   - Group by category with section headers, not one flat grid
   - Add a "featured ingredients" hero section at top

2. **Search + filter** - Category chips exist but are tiny. Make them proper toggle buttons.

3. **Overall feel** - This page should make someone hungry, not feel like they're browsing a spreadsheet.

CONSTRAINTS:
- Ingredient data comes from server. Don't change data fetching.
- TypeScript must pass
- Screenshot with Playwright when done
```

---

## PROMPT 7: Navigation + Sidebar Polish

```
TASK: Polish the chef portal navigation (sidebar + top bar) for better visual hierarchy and reduced clutter.

KEY FILES:
- `components/navigation/chef-nav.tsx` - main sidebar
- `components/navigation/chef-nav-config.ts` - nav item configuration
- `components/navigation/chef-mobile-nav.tsx` - mobile nav
- `components/navigation/action-bar.tsx` - action bar
- `components/navigation/all-features-collapse.tsx` - features directory
- `components/navigation/breadcrumb-bar.tsx` - breadcrumbs
- `components/navigation/public-header.tsx` - public nav
- `app/(chef)/layout.tsx` - chef layout wrapping nav

CHANGES:
1. **Sidebar**
   - Add section grouping with subtle headers (CORE, CULINARY, BUSINESS, etc.)
   - Active item should have clear highlight (brand-colored left border + background)
   - Collapsed sub-items should have indentation visual cue
   - Add subtle hover transitions
   - Consider collapsible sidebar (icon-only mode) for more content space

2. **Top bar**
   - Breadcrumb trail should be more readable (larger, better separator)
   - Search shortcut hint ("Cmd+K") should be a styled badge
   - Notification bell + other icons need consistent sizing

3. **System status indicators**
   - "Server AI - 4ms" badge style (currently green pill in top left)
   - Environment badge ("DEVELOPMENT") - style appropriately or hide in prod

CONSTRAINTS:
- Navigation config structure unchanged
- Keyboard shortcuts unchanged
- Mobile nav must remain functional
- TypeScript must pass
```

---

## PROMPT 8: Shared Component Polish (Batch)

```
TASK: Polish these shared UI components that appear on every page. Small changes, big cumulative impact.

FILES TO UPGRADE (read each first):
- `components/ui/button.tsx` - Add subtle hover/active transitions, ensure consistent sizing
- `components/ui/badge.tsx` - Add more color variants, ensure contrast ratios meet WCAG
- `components/ui/empty-state.tsx` - Make empty states warmer (illustration or icon, not just text)
- `components/ui/error-state.tsx` - Make errors clear but not alarming (not just red everything)
- `components/ui/loading-state.tsx` - Loading should feel branded (use brand colors in spinner/skeleton)
- `components/ui/skeleton.tsx` - Skeleton shimmer should use brand-warm tones, not cold gray
- `components/ui/stat-card.tsx` - Stats need visual weight (large number, small label, optional trend arrow)
- `components/ui/page-header.tsx` - Page headers need more presence (larger title, description styling)
- `components/ui/dropdown-menu.tsx` - Menu items need better hover states, icons, spacing
- `components/ui/input.tsx` - Inputs need focus ring upgrade (brand color, smooth transition)
- `components/ui/alert.tsx` - Alert variants (info, warning, error, success) need distinct styling
- `components/ui/cookie-consent.tsx` - Currently ugly banner. Make it a subtle, elegant toast.

APPROACH:
- Read each file
- Make targeted CSS/className improvements
- No structural changes, no prop API changes
- Focus on: transitions, hover states, color usage, spacing, border radius consistency

CONSTRAINTS:
- Backward compatible. No prop changes.
- TypeScript must pass
- Run `npx tsc --noEmit --skipLibCheck` at the end
```

---

## Execution Order

| Order | Prompt                   | Why First                                       |
| ----- | ------------------------ | ----------------------------------------------- |
| 1     | Design System Foundation | Everything else builds on these tokens/variants |
| 2     | Shared Component Polish  | Ripple effect across all pages                  |
| 3     | Dashboard                | Most-seen page, biggest impact                  |
| 4     | Navigation               | Seen on every page                              |
| 5     | Events                   | Core workflow page                              |
| 6     | Clients                  | Core workflow page                              |
| 7     | Culinary + Ingredients   | Important but less daily use                    |
| 8     | Public Homepage          | External-facing, high brand impact              |

**Run prompts 1-2 FIRST (sequentially, same context if possible).**
**Then 3-8 can run in PARALLEL across separate context windows.**

---

## After All Prompts Complete

```
TASK: Post-overhaul verification. Run full build and visual regression check.

1. `npx tsc --noEmit --skipLibCheck` - must pass
2. `npx next build --no-lint` - must pass
3. Take fresh Playwright screenshots of all 7 pages (same as `.claude/audit/screenshot-*.png`)
   Save to `.claude/audit/after-*.png`
4. Compare before/after visually
5. Run `npm run test:experiential` if it exists
6. Report any regressions
```
