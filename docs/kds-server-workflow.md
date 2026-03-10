# Multi-Station KDS and Server Workflow Integration

## What Changed

Two restaurant-archetype features added: a multi-station Kitchen Display System (KDS) and a Server Workflow Integration connecting front-of-house (FOH) to back-of-house (BOH).

## Feature 1: Multi-Station KDS

### Database

- `kds_tickets` table: stores tickets per station with items (JSONB), status FSM (new > in_progress > ready > served | voided), priority levels (normal/rush/vip), course numbers, allergy alerts, timing timestamps
- `next_kds_ticket_number()` function: generates sequential ticket numbers per chef per day
- `products.station_id` column added: routes products to specific kitchen stations for automatic ticket splitting
- RLS: chef_id tenant isolation

### Server Actions (`lib/commerce/kds-actions.ts`)

- `getStationTickets(stationId)`: active tickets for one station, sorted by priority then age
- `getAllStationTickets()`: all stations with their tickets (expeditor view)
- `createTicketFromSale(input)`: parses sale items, routes to stations by product.station_id, creates per-station tickets
- `createTicket(input)`: direct ticket creation
- `bumpTicket(ticketId)`: advances status one step (new > in_progress > ready > served)
- `fireTicket`, `markTicketReady`, `markTicketServed`: named status transitions
- `voidTicket(ticketId, reason?)`: cancels ticket
- `fireAllForCourse(courseNumber)`: fires all pending tickets for a given course number
- `getKDSStats()`: avg ticket time, throughput, backlog per station

### UI Components

- `components/commerce/kds-station-view.tsx`: full-screen single-station view with ticket cards, color-coded by status, allergy banners, BUMP buttons, 10s auto-refresh
- `components/commerce/kds-expeditor-view.tsx`: all stations side by side with stats bar, "Fire All" for coursed meals
- `app/(chef)/commerce/kds/page.tsx` + `kds-page-client.tsx`: station selector tabs, fullscreen toggle, touch-friendly layout

## Feature 2: Server Workflow Integration (FOH-BOH)

### Server Actions (`lib/commerce/server-workflow-actions.ts`)

- `getServerTableView()`: all tables with open check details and per-course status dots
- `fireCoursesForTable(checkId, courseNumber)`: fires all pending tickets for a specific course on a check
- `addItemToCheck(input)`: adds product to check and auto-creates KDS ticket routed to the right station
- `removeItemFromCheck(checkId, ticketId)`: voids ticket and removes from check
- `getCheckCourseStatus(checkId)`: full course overview (pending/fired/ready/served)
- `requestCheckSplit(checkId, splitType)`: marks check for even or by-item split
- `closeServerCheck(input)`: closes check, marks remaining tickets served, records payment method and tip

### UI Components

- `components/commerce/server-table-panel.tsx`: shows tables grouped by zone, guest info, course status dots (gray=pending, yellow=fired, green=ready, blue=served), fire/split/close buttons, 15s auto-refresh
- Integrated into the existing Table Service page with a link to the KDS

### Navigation

- Added "Kitchen Display" to commerce nav config (uses Kanban icon)

## Integration Flow

1. Server opens a check on a table (existing Table Service)
2. Server adds items to the check (creates KDS tickets automatically routed to correct stations)
3. Station cooks see only their tickets (station view) or expo sees all stations (expeditor view)
4. Server fires courses when table is ready for next course
5. Kitchen bumps tickets through statuses: new > in_progress > ready
6. Server sees course status dots update in real time
7. When food is picked up, tickets marked served
8. Server closes check with payment method and tip

## Files Created/Modified

### Created

- `supabase/migrations/20260331000011_kds_tickets.sql`
- `lib/commerce/kds-actions.ts`
- `lib/commerce/server-workflow-actions.ts`
- `components/commerce/kds-station-view.tsx`
- `components/commerce/kds-expeditor-view.tsx`
- `components/commerce/server-table-panel.tsx`
- `app/(chef)/commerce/kds/page.tsx`
- `app/(chef)/commerce/kds/kds-page-client.tsx`

### Modified

- `lib/commerce/constants.ts` (added KDS status/priority types and transition map)
- `components/navigation/nav-config.tsx` (added KDS nav item)
- `app/(chef)/commerce/table-service/page.tsx` (added ServerTablePanel integration)
