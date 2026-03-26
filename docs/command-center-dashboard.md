# Command Center Dashboard

## What Changed

The dashboard's 8-item shortcut strip was replaced with a full **Command Center** showing all 20 major feature areas in the app, each with live data counts and quick-access links.

## Why

An audit of the chef portal found 355+ functional pages backed by 810 server actions, but the dashboard only surfaced 8 shortcuts. Features like Commerce, Inventory, Vendors, Contracts, Goals, Marketing, Staff, Loyalty, Safety, and Reviews were invisible from the landing page. The app felt empty despite being feature-complete.

## How It Works

### Server Component: `CommandCenterSection`

- Located at `app/(chef)/dashboard/_sections/command-center-data.tsx`
- Fetches 15 live counts in parallel using `Promise.all()` for speed
- Each count query is wrapped in `safeCount()` which returns 0 on failure (non-blocking)
- Runs inside a `<Suspense>` boundary with a skeleton loader

### Client Component: `CommandCenter`

- Located at `components/dashboard/command-center.tsx`
- Renders a responsive grid (2 cols mobile, 3 cols tablet, 4 cols desktop)
- Each feature card shows: icon, label, description, live count, and hover-revealed quick links
- Collapsible: users can toggle between full grid and compact tag strip
- 20 feature areas organized by workflow: Core > Kitchen > Supply Chain > Growth > Support

### Feature Areas Surfaced

Events, Inquiries, Clients, Quotes, Culinary, Finance, Operations, Staff, Inventory, Vendors, Commerce, Contracts, Marketing, Leads, Analytics, Goals, Loyalty, Safety, Reviews, Remy AI

### Data Sources

All counts come from the database via the compat shim, tenant-scoped:

- `events` (tenant_id) - active events
- `inquiries` (tenant_id) - open inquiries
- `clients` (tenant_id) - total clients
- `recipes` (tenant_id) - total recipes
- `quotes` (tenant_id) - pending quotes
- `expenses` (tenant_id) - this month
- `staff_members` (chef_id) - active staff
- `chef_todos` (chef_id) - open tasks
- `vendors` (chef_id) - total vendors
- `event_contracts` (chef_id) - signed contracts
- `chef_goals` (tenant_id) - active goals
- `marketing_campaigns` (chef_id) - total campaigns

### Design Choices

- Cards use the existing stone/brand color system with per-feature accent colors
- Quick links appear on hover to keep the default view clean
- Collapse mode provides a compact tag strip for users who prefer minimal UI
- Skeleton loader matches the grid layout exactly
- All wrapped in `WidgetErrorBoundary` so a failure here never crashes the dashboard
