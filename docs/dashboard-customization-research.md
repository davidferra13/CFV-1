# Dashboard Customization Research: World-Class Implementations

> Research conducted 2026-03-08. Covers 14 platforms plus general UX best practices.

---

## What ChefFlow Already Has (Baseline)

Before listing gaps, here is what the "My Dashboard" tab currently supports:

- **Widget picker modal** with search, category filtering, and multi-select
- **8 widget categories**: Today, Actions, Prep, Money, Clients, Analytics, Collaboration, System
- **Drag-and-drop reordering** in edit mode (HTML5 drag)
- **Move up/down buttons** as a non-drag alternative
- **Remove widget** in edit mode
- **Personal notes** widget with auto-save debounce
- **Edit/Customize mode** toggle (enter edit, cancel, save)
- **Empty state** with clear CTA ("Add Widgets")
- **4-column responsive grid** (4 desktop, 2 tablet, 1 mobile)
- **Priority banner** showing next urgent action
- **Shortcut strip** for quick navigation
- **5 curated tabs** (My Dashboard, Schedule, Alerts, Business, Intelligence)

This is a solid foundation. Most small SaaS platforms do not even have a widget picker. The gaps below represent the jump from "good" to "world-class."

---

## Platform-by-Platform Research

### 1. Notion

- **Approach**: Page-as-dashboard. Users build dashboards from blocks (text, databases, embeds, toggles, callouts). No predefined "dashboard" concept; everything is composable.
- **Customization**: Infinite flexibility. Drag blocks anywhere. Resize database views. Embed third-party widgets (Indify, WidgetBox) via `/embed`.
- **Templates**: Notion Gallery has 1000+ community dashboard templates. Users can duplicate and customize.
- **Empty state**: New workspace shows a welcome page with guided setup tasks.
- **Mobile**: Full block editor on mobile, though less comfortable for complex layouts.
- **Unique feature**: "Template buttons" that stamp pre-built content blocks. Linked databases showing the same data in different views on one page.

**Steal-worthy**: The concept of "template dashboards" that users can one-click apply as a starting point, then customize from there.

### 2. Monday.com

- **Widgets**: 50+ widget types. Charts (bar, line, pie, donut), numbers, battery (progress), timeline, workload, Gantt, list view, table, map, embedded apps.
- **Customization**: Drag-and-drop. Up to 30 widgets per dashboard (excluding text widgets). Column reordering within widgets via drag.
- **"My Work" view**: Personal view showing items assigned to you, split by board. Users requested more customization (filtering, exclusions) which Monday has been adding.
- **Resize**: Column-level resize within widgets.
- **Templates**: Dashboard templates tied to workspace templates.
- **Mobile**: Responsive card layout. Limited widget editing on mobile.
- **Unique**: Widget drill-down (click into data to see underlying items). Cross-board dashboards pulling data from multiple boards.

**Steal-worthy**: Cross-entity widgets that pull data from multiple sources into one card. Widget drill-down for context without leaving the dashboard.

### 3. HubSpot

- **Widget library**: Reports from HubSpot Library, custom reports, images, text/notes.
- **Customization**: Drag to reposition. Resize via bottom-right corner handle. Add content button with report picker.
- **Templates**: Pre-built dashboard templates for Sales, Marketing, Service, etc. Users can clone and customize.
- **Access control**: Private (owner only), everyone (view/edit), specific users/teams (Enterprise).
- **Real-time**: Hover to refresh individual reports. Dashboards auto-refresh on load.
- **Unique**: "Set as default" dashboard (your landing page). Notes/images alongside data reports for context. Dashboard-level filters that apply across all widgets.

**Steal-worthy**: "Set as default dashboard" so it loads on login. Image/text blocks as first-class widgets for context alongside data. Dashboard-level filters.

### 4. Shopify

- **Metrics**: Sales trending, traffic sources, top products, marketing performance, average order value, channel comparison, repeat customer rates.
- **Customization**: Limited native customization. Choose which analytics display on homepage. Rearrange elements. Filter by date range, location, product category.
- **Multi-channel**: Unified view across all sales channels (online, POS, social, marketplace).
- **Real-time**: Data stays up-to-date continuously for strategic decisions.
- **Templates**: No native dashboard templates; third-party tools (Polar Analytics, AgencyAnalytics) fill the gap.
- **Mobile**: Fully responsive. Mobile dashboard app with home screen widget for gross/net sales and transactions.

**Steal-worthy**: Home screen widget (iOS/Android) showing key metric at a glance without opening the app. Multi-channel unified view. Native date range comparison ("this week vs. last week").

### 5. Stripe

- **Layout**: Clean, minimal. Home page shows business performance charts + notification surface (disputes, verifications).
- **Customization**: "Your overview" section with Add/Remove widgets. Select/deselect specific metrics.
- **Sidebar**: Organized by function (Balances, Transactions, Customers, Products, Payments).
- **Real-time**: Live transaction feed. Tooltips for quick context.
- **Unique**: Progressive disclosure showing "6 of 25 failed payments" as a teaser. Embedded dashboard components for white-labeling.
- **Mobile**: Responsive views drove sharp growth in mobile visits after implementation.

**Steal-worthy**: Progressive disclosure ("3 of 12 upcoming events" with View All). Clean notification surface integrated into the dashboard. Widget add/remove without entering a separate "edit mode."

### 6. Linear

- **"My Issues"**: Four tabs: assigned to you, created by you, subscribed, recent activity. List or Board layout toggle.
- **Dashboards** (Enterprise): Charts, tables, single metric blocks. Two-tier filtering (dashboard-level global filters + insight-level individual filters).
- **Customization**: Custom views with advanced AND/OR filters. Pin views to sidebar.
- **Drill-down**: Click any chart slice or metric to see underlying issues directly in dashboard.
- **Unique**: Move dashboards between teams/workspace/personal. Ownership transfer. Private team data excluded by default from workspace dashboards.

**Steal-worthy**: Click-to-drill-down on any metric to see the underlying data. Two-tier filtering (global + per-widget). View/dashboard ownership and transfer.

### 7. Asana

- **Home widgets**: My Priorities, Projects, People, Private Notepad, Tasks I've Assigned, My Goals. 6 widget types.
- **Customization**: Full drag-and-drop. Resize widgets. Choose background styles. Add/remove widgets.
- **"My Tasks"**: Separate from Home. List/Board/Week views. Custom sections (Today/Upcoming/Later + custom). Rules-based auto-sorting.
- **Mobile**: iOS/Android widgets for task counts on home screen.
- **Onboarding**: Signup data used to personalize initial dashboard layout.

**Steal-worthy**: Background/theme customization for personal feel. Personalized initial layout based on onboarding answers (chef archetype). "My Goals" widget for personal KPI tracking. Week view for task planning.

### 8. Salesforce Lightning

- **Dashboard Builder**: Full drag-and-drop. Add widgets via "+ Widget" button. Add filters via "+ Filter."
- **Widget types**: Rich text, images, report-driven data visualizations (chart, table, metric, gauge).
- **Resize**: Click widget, drag corners and sides.
- **Grid**: Responsive multi-column layout.
- **Filters**: Dashboard-level filters that cascade to all widgets.
- **Unique**: Widget = one report visualized in different chart types. Switch visualization without changing underlying data.

**Steal-worthy**: Change widget visualization type without changing data source (e.g., view revenue as bar chart, line chart, or number). Dashboard-level cascading filters.

### 9. Databox

- **Widget types**: 20+ visualizations (line, bar, pie, radial, funnel, progress bar, gauge).
- **Templates**: 200+ professionally designed templates for different industries and use cases. Public templates + account-level private templates.
- **Customization**: Drag-and-drop. Resize blocks. Change visualization type. Add goals per metric. 18 background colors. Chart theme colors. Logo customization.
- **Branding**: Background color, logo, chart color themes all customizable.
- **Real-time**: Auto-refresh with configurable intervals.

**Steal-worthy**: 200+ templates organized by industry/use case. Goals attached to metrics (target line on charts). Chart color themes matching brand.

### 10. Geckoboard

- **Widget types**: Text, numbers, graphs, maps. Custom widgets (user provides data feed) or integration widgets (pull from 90+ services).
- **Customization**: Drag-and-drop. Full color/logo control. Widget grouping to show relationships between metrics.
- **Goals**: Set targets for metrics with visual alerts when thresholds crossed.
- **Alerts**: Visual indicators when metrics change significantly.
- **Refresh**: Integrations refresh every few minutes. Custom widgets have user-configurable refresh timing.

**Steal-worthy**: Widget grouping (visually cluster related metrics). Goal/target lines with visual alerts. Configurable refresh intervals.

### 11. Klipfolio

- **Widget types**: 30+ chart types (pie, bar, line, gauge, pictograph, map, funnel). Components: table, chart, gauge, value pair, layout grid, image.
- **Customization**: Deep styling (axis labels, legends, series colors, fonts, number formatting, dynamic color rules). Dashboard background, widget header/border/background colors. Hex/RGB color picker.
- **Templates**: Pre-populated templates for popular services. Fully customizable after applying.
- **Advanced**: HTML template component with JavaScript and inline CSS for custom visualizations.
- **Layout**: Configurable columns, rows, padding, animation.

**Steal-worthy**: Dynamic color rules (turn metric red when below threshold, green when above). Deep per-widget styling options. Number formatting options.

### 12. Toast POS (Restaurant Industry)

- **Dashboard metrics**: Net sales, gratuity, tips, total guests, table turn time, service type breakdown, payment method breakdown, items sold, tips by server, sales by server.
- **Customization**: Customize and prioritize metrics by role (CEO vs. GM vs. server). Drill-down into categories.
- **Real-time**: Real-time sales, labor, and inventory tracking from any device.
- **Mobile**: Full mobile access. Designed for "scannable overview on any device."
- **Unique**: Role-based dashboard priority (different defaults for owner vs. floor manager). POS-integrated real-time data.

**Steal-worthy**: Role-based default layouts (different starting dashboards for different chef archetypes). "Scannable on any device" as a design principle. Real-time metric streaming.

### 13. Square Dashboard

- **Metrics**: Gross sales, net sales, transactions, average sale. 10 different report types.
- **Customization**: Add/remove widgets. Pin AI-generated data visualizations. Customize data timeframe. Custom reports by time/location/product.
- **Widget**: Home screen widget showing key sales data without opening the app.
- **AI**: Square AI generates insight visualizations that can be pinned as dashboard widgets.
- **Real-time**: Fresh insights in real-time.

**Steal-worthy**: AI-generated insight cards that can be pinned to dashboard. Home screen widget for key metrics. Pin any generated visualization.

### 14. QuickBooks

- **Metrics**: Cash flow, revenue trends, P&L statements, KPIs.
- **Customization**: Drag-and-drop. Resize via green corner circles. Hide widgets (trash can button). Click "Customize your dashboard" button.
- **KPI widgets**: Added in 2025 update. Visual KPI cards on homepage.
- **Layout**: Rearrange and resize to focus on what matters.
- **Unique**: "Customize your dashboard" as a prominent button, not hidden in settings.

**Steal-worthy**: Prominent "Customize" button always visible (not buried in a menu). KPI widgets with trend visualization.

---

## Cross-Platform Patterns (What the Best All Share)

### 1. Widget Resize (Not Just Reorder)

**Who does it**: Asana, HubSpot, Salesforce, QuickBooks, Databox, Klipfolio.
**ChefFlow gap**: Widgets have fixed sizes (sm/md/lg defined in metadata). Users cannot resize.
**Recommendation**: Allow widgets to span 1x1, 1x2, 2x1, or 2x2 grid cells. Use drag handles on corners/edges.

### 2. Dashboard Templates / Presets

**Who does it**: Notion (community), Databox (200+), Klipfolio, HubSpot, Monday.com.
**ChefFlow gap**: No templates. Empty state says "add widgets" with no suggested starting point.
**Recommendation**: Offer 3-4 preset layouts based on chef archetype:
  - **Event-Heavy Chef**: Today's prep, upcoming events, outstanding quotes, client messages
  - **Revenue-Focused Chef**: P&L summary, monthly revenue trend, unpaid invoices, lead pipeline
  - **New Chef**: Getting started checklist, first event wizard, sample data tour
  - **High-Volume Catering**: Calendar view, staff schedule, inventory alerts, event timeline

### 3. "Set as Default" / Landing Page

**Who does it**: HubSpot, Stripe.
**ChefFlow gap**: Dashboard always opens to "My Dashboard" tab. No choice.
**Recommendation**: Let users pick which tab opens on login (My Dashboard, Schedule, Alerts, etc.) via settings.

### 4. Dashboard-Level Filters

**Who does it**: Linear, Salesforce, HubSpot, Geckoboard.
**ChefFlow gap**: No filters that apply across all widgets simultaneously.
**Recommendation**: Add a date range filter at the top that propagates to all time-aware widgets. Optional: location/event type filters.

### 5. Click-to-Drill-Down

**Who does it**: Linear, Monday.com, Toast.
**ChefFlow gap**: Widgets link to full pages but don't show inline detail.
**Recommendation**: Clicking a metric in a widget should expand it or show a detail panel without full page navigation. E.g., clicking "3 upcoming events" shows the event list inline.

### 6. Widget Goals / Targets

**Who does it**: Geckoboard, Databox, Klipfolio.
**ChefFlow gap**: Metrics shown without context of what "good" looks like.
**Recommendation**: Let chefs set targets per metric (e.g., "goal: $10k monthly revenue"). Show progress bars or target lines. Visual alert when a metric crosses a threshold.

### 7. AI-Generated Insight Widgets

**Who does it**: Square (AI-generated visualizations pinned to dashboard).
**ChefFlow gap**: Remy exists but doesn't generate dashboard-level insight cards.
**Recommendation**: Remy could surface "Weekly Insight" cards that get pinned to the dashboard: "Your average event price is up 12% this month" or "3 clients haven't booked in 90 days."

### 8. Widget Grouping / Sections

**Who does it**: Geckoboard, Notion, Salesforce.
**ChefFlow gap**: Widgets are a flat list. No visual grouping.
**Recommendation**: Allow users to create named sections/groups (e.g., "Morning Checks", "Revenue Watch") with collapsible headers.

### 9. Background / Theme Customization

**Who does it**: Asana (background styles), Databox (18 bg colors + chart themes), Klipfolio (full color control).
**ChefFlow gap**: Fixed dark theme. No personalization.
**Recommendation**: Offer 3-5 subtle background patterns or accent color choices. Small touch, high delight factor.

### 10. Home Screen Widget (Mobile)

**Who does it**: Shopify, Square, Asana.
**ChefFlow gap**: PWA-only. No home screen widget.
**Recommendation**: Future consideration. Not urgent, but high-value for chefs checking metrics while shopping or prepping. Could use PWA web app manifest shortcuts as a lightweight alternative.

---

## Empty State Best Practices (From Research)

The best empty states combine two parts instruction with one part delight:

1. **Visual**: Large, friendly icon or illustration (not just text)
2. **Headline**: Clear value proposition ("See everything that matters at a glance")
3. **Description**: One sentence explaining what the dashboard will do once configured
4. **Primary CTA**: "Choose a Template" (not "Add Widgets" as first option)
5. **Secondary CTA**: "Start from Scratch" (for power users)
6. **Sample data preview**: Show what a populated dashboard looks like (screenshot or blurred preview)

**ChefFlow's current empty state** has the icon + headline + description + CTA. Adding a template picker as the primary CTA and a sample preview would elevate it significantly.

---

## Real-Time Data Update Patterns

| Pattern | Latency | Best For |
|---------|---------|----------|
| WebSocket | 1-10ms | Live transaction feeds, chat, alerts |
| Server-Sent Events (SSE) | 50-100ms | Dashboard metric updates, notifications |
| Polling | 200-5000ms | Non-critical data, broad compatibility |
| On-demand refresh | User-initiated | Heavy queries, report generation |

**Recommendation for ChefFlow**: Use Supabase Realtime (already available) for critical alerts (new inquiry, payment received). Use on-demand refresh + stale-while-revalidate for metric widgets. Avoid polling for cost reasons.

---

## Mobile Dashboard UX Patterns

1. **Card-based stacking**: Widgets stack vertically on mobile. One column, full width.
2. **Expandable sections**: Collapsed by default, tap to expand. Reduces scroll fatigue.
3. **Gesture controls**: Swipe between dashboard tabs. Long-press to enter edit mode.
4. **Priority reordering**: Most important widgets first on mobile (may differ from desktop order).
5. **Orientation hints**: For chart-heavy widgets, suggest landscape mode.

**ChefFlow already handles** the card stacking (1 col mobile, 2 col tablet, 4 col desktop). Adding collapsible sections and swipe-between-tabs would improve the mobile experience.

---

## Top 10 Actionable Recommendations (Priority Order)

### Tier 1: High Impact, Moderate Effort

1. **Dashboard Templates / Presets** - Offer 3-4 archetype-based starting layouts. This is the single biggest gap. Every major platform has templates. An empty widget picker is intimidating; a one-click template is welcoming.

2. **Widget Resize** - Let users choose widget size (1x1 small, 2x1 wide, 1x2 tall, 2x2 large). Use a simple size toggle in edit mode rather than freeform resize.

3. **Dashboard-Level Date Filter** - A single date range picker at the top of "My Dashboard" that propagates to all time-aware widgets. Every serious dashboard tool has this.

4. **Remy Insight Cards** - Weekly AI-generated insight cards that appear on the dashboard. "Your busiest day this month was Saturday" or "You have 2 quotes expiring this week." Pin-worthy, timely, actionable.

### Tier 2: Medium Impact, Lower Effort

5. **Click-to-Expand Detail** - Clicking a widget metric shows a mini detail panel (slide-over or expandable card) instead of navigating away. Keep the user in context.

6. **Widget Sections/Groups** - Let users organize widgets into named collapsible groups. Adds structure to a flat grid.

7. **Metric Goals/Targets** - Simple target setting per financial metric. "Revenue goal: $8,000/month." Show a progress bar or indicator.

8. **Improved Empty State** - Add template picker as primary CTA. Show a preview/screenshot of what a populated dashboard looks like.

### Tier 3: Polish and Delight

9. **Subtle Background/Accent Choices** - 3-5 subtle dashboard themes (default dark, warm, cool, minimal). Low effort, high personalization feel.

10. **Default Tab Preference** - Let users choose which tab loads on dashboard open (My Dashboard, Schedule, etc.) in settings.

---

## Features We Should NOT Copy

- **Freeform drag-and-drop positioning** (Notion style): Too complex for a mobile-first chef platform. Grid-based with size choices is better.
- **100+ visualization types** (Klipfolio/Databox): Overkill. ChefFlow is not a BI tool. Our widgets show pre-defined business metrics, not arbitrary datasets.
- **Dashboard sharing/permissions** (HubSpot Enterprise, Salesforce): Single-tenant chef platform. No need for multi-user dashboard sharing yet.
- **Custom CSS/HTML widgets** (Klipfolio): Maintenance nightmare. Not our user profile.
- **Voice commands** (emerging trend): Interesting for future, but premature for current scope.

---

## Summary

ChefFlow's "My Dashboard" already has the core mechanics (widget picker, drag reorder, edit mode, categories, notes). The biggest gaps compared to world-class implementations are:

1. **No templates** - Users start from zero. Best platforms give you a populated starting point.
2. **No widget resize** - Fixed sizes limit personalization.
3. **No dashboard-level filters** - Can't scope all widgets to a date range at once.
4. **No AI insight cards** - We have Remy but don't surface insights on the dashboard.
5. **No drill-down** - Clicking widgets navigates away instead of showing detail in-context.

Closing these five gaps would put ChefFlow's dashboard experience ahead of most vertical SaaS tools and on par with horizontal leaders like HubSpot and Monday.com.
