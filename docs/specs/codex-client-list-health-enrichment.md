# Codex Build Spec: Client List Health Enrichment

> **Scope:** Add health tier badges and "last event" column to the client list table.
> **Risk:** LOW. Pure UI + data threading. No new tables, no migrations, no server actions.
> **Files to modify:** exactly 2 files. Do NOT create new files.

---

## Problem

The client list table at `/clients` shows: Name, Email, Phone, Total Events, Total Spent, Created, Actions. A relationship-driven chef cannot scan client health at a glance. Health scores, tiers, and recency data already exist in the system but are not surfaced in the list view.

## Goal

Add two columns to the client list table:

1. **Health** - a colored badge showing the client's health tier (Champion/Loyal/At Risk/Dormant/New)
2. **Last Event** - how many days since the client's last event (e.g., "12d ago", "3mo ago", "Never")

Remove the **Phone** column to keep the table from getting too wide (7 columns is the max).

---

## File 1: `app/(chef)/clients/page.tsx`

### What to change

The `ClientsListContent` async component (line 165-184) currently fetches clients only. It needs to ALSO fetch health scores in parallel, then merge them before passing to `ClientsTable`.

### Exact instructions

1. Add this import at the top of the file (after the existing imports):

```typescript
import { getClientHealthScores } from '@/lib/clients/health-score'
```

2. Replace the `ClientsListContent` function (lines 165-185) with:

```typescript
async function ClientsListContent() {
  const [clientsResult, healthResult] = await Promise.all([
    safeFetch(() => getClientsWithStats()),
    safeFetch(() => getClientHealthScores()),
  ])

  if (clientsResult.error) {
    return <ErrorState title="Could not load clients" description={clientsResult.error} />
  }

  const clients = clientsResult.data

  if (clients.length === 0) {
    return (
      <EmptyState
        illustration={<NoClientsIllustration />}
        title="No clients yet"
        description="Invite your first client to start tracking their preferences, events, and loyalty rewards."
        action={{ label: 'Send Invitation', href: '#invite' }}
      />
    )
  }

  // Merge health scores into client data
  const healthMap = new Map<string, { tier: string; score: number }>()
  if (healthResult.data) {
    for (const hs of healthResult.data.scores) {
      healthMap.set(hs.clientId, { tier: hs.tier, score: hs.score })
    }
  }

  const clientsWithHealth = clients.map((client: any) => ({
    ...client,
    healthTier: healthMap.get(client.id)?.tier ?? 'new',
    healthScore: healthMap.get(client.id)?.score ?? 0,
  }))

  return <ClientsTable clients={clientsWithHealth} />
}
```

### DO NOT

- Do NOT change any other component on this page (hub tiles, RebookingBar, invitations)
- Do NOT add any new Suspense boundaries
- Do NOT change the `ClientsPage` main export function
- If `getClientHealthScores` fails, the table still renders (health just shows 'new' for everyone)

---

## File 2: `app/(chef)/clients/clients-table.tsx`

### What to change

Update the type, add Health and Last Event columns, remove Phone column.

### Exact instructions

1. **Update the type** (line 21-24). Replace:

```typescript
type ClientWithStats = Tables<'clients'> & {
  totalEvents: number
  totalSpentCents: number
}
```

With:

```typescript
type ClientWithStats = Tables<'clients'> & {
  totalEvents: number
  totalSpentCents: number
  lastEventDate?: string | null
  healthTier?: string
  healthScore?: number
}
```

2. **Add import** for health score utils. Add after the existing imports:

```typescript
import { TIER_LABELS, TIER_COLORS } from '@/lib/clients/health-score-utils'
import type { ClientHealthTier } from '@/lib/clients/health-score'
```

3. **Add 'health' to sortBy state**. Change line 32:

From: `const [sortBy, setSortBy] = useState<'name' | 'created' | 'spent'>('created')`
To: `const [sortBy, setSortBy] = useState<'name' | 'created' | 'spent' | 'health'>('created')`

4. **Add health sort case** in the sort switch (inside the `useMemo`, after the 'spent' case):

```typescript
case 'health':
  aValue = a.healthScore ?? 0
  bValue = b.healthScore ?? 0
  break
```

5. **Update the SortIcon function type**:

From: `function SortIcon({ field }: { field: 'name' | 'created' | 'spent' })`
To: `function SortIcon({ field }: { field: 'name' | 'created' | 'spent' | 'health' })`

6. **Update toggleSort function type**:

From: `function toggleSort(field: 'name' | 'created' | 'spent')`
To: `function toggleSort(field: 'name' | 'created' | 'spent' | 'health')`

7. **Replace the TableHeader** (lines 101-134). The new header should be:

```tsx
<TableHeader>
  <TableRow>
    <TableHead>
      <button onClick={() => toggleSort('name')} className="flex items-center hover:text-stone-900">
        Name
        <SortIcon field="name" />
      </button>
    </TableHead>
    <TableHead>Email</TableHead>
    <TableHead>
      <button
        onClick={() => toggleSort('health')}
        className="flex items-center hover:text-stone-900"
      >
        Health
        <SortIcon field="health" />
      </button>
    </TableHead>
    <TableHead className="text-right">Total Events</TableHead>
    <TableHead className="text-right">
      <button
        onClick={() => toggleSort('spent')}
        className="flex items-center hover:text-stone-900 ml-auto"
      >
        Total Spent
        <SortIcon field="spent" />
      </button>
    </TableHead>
    <TableHead>Last Event</TableHead>
    <TableHead>
      <button
        onClick={() => toggleSort('created')}
        className="flex items-center hover:text-stone-900"
      >
        Created
        <SortIcon field="created" />
      </button>
    </TableHead>
    <TableHead className="text-right w-24">Actions</TableHead>
  </TableRow>
</TableHeader>
```

Note: Phone column is REMOVED. Health and Last Event columns are ADDED.

8. **Update the `ClientTableRow` component** (lines 158-225). Replace the entire component:

```tsx
const ClientTableRow = memo(function ClientTableRow({ client }: { client: ClientWithStats }) {
  const healthTier = (client.healthTier ?? 'new') as ClientHealthTier
  const tierLabel = TIER_LABELS[healthTier] ?? 'New'
  const tierColor = TIER_COLORS[healthTier] ?? 'bg-brand-100 text-brand-800'

  // Compute "last event" display
  let lastEventDisplay = 'Never'
  if (client.lastEventDate) {
    const days = Math.floor(
      (Date.now() - new Date(client.lastEventDate).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (days === 0) lastEventDisplay = 'Today'
    else if (days === 1) lastEventDisplay = '1d ago'
    else if (days < 30) lastEventDisplay = `${days}d ago`
    else if (days < 365) lastEventDisplay = `${Math.floor(days / 30)}mo ago`
    else lastEventDisplay = `${Math.floor(days / 365)}y ago`
  }

  return (
    <TableRow
      className="cursor-pointer group"
      onClick={() => (window.location.href = `/clients/${client.id}`)}
    >
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {(client as any).avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(client as any).avatar_url}
              alt=""
              className="h-8 w-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-stone-800 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-stone-500">
              {client.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <span>
            {client.full_name}
            {isDemoClient(client) && (
              <Badge variant="info" className="ml-2 text-xxs px-1.5 py-0">
                Sample
              </Badge>
            )}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-stone-600">{client.email}</TableCell>
      <TableCell>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tierColor}`}
        >
          {tierLabel}
        </span>
      </TableCell>
      <TableCell className="text-right">{client.totalEvents}</TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(client.totalSpentCents)}
      </TableCell>
      <TableCell className="text-stone-600 text-sm">{lastEventDisplay}</TableCell>
      <TableCell className="text-stone-600">{format(new Date(client.created_at), 'PP')}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/events/new?client_id=${client.id}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
            title="Create event"
          >
            <CalendarPlus className="h-4 w-4" />
          </Link>
          <Link
            href={`/clients/${client.id}#communication`}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
            title="Send message"
          >
            <MessageCircle className="h-4 w-4" />
          </Link>
          <Link
            href={`/clients/${client.id}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
            title="View profile"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </TableCell>
    </TableRow>
  )
})
```

9. **Update the colSpan** in the empty state row (line 139). Change `colSpan={7}` to `colSpan={8}`.

---

## Verification

After making changes:

1. `npx tsc --noEmit --skipLibCheck` must pass
2. Navigate to `/clients` - table should show Health badge and Last Event columns
3. Phone column should be gone
4. Sorting by Health should work (champions first when desc)
5. If a client has no events, Last Event shows "Never" and Health shows "New"

---

## DO NOT (critical guardrails)

- Do NOT create any new files
- Do NOT modify any other files besides the two listed
- Do NOT add any new server actions or API routes
- Do NOT modify the database schema
- Do NOT change any imports that are not listed above
- Do NOT add em dashes anywhere (use commas, semicolons, or separate sentences)
- Do NOT use `outline` or `default` as Button variants (they do not exist)
- Do NOT remove or change any existing functionality besides removing the Phone column
- Do NOT add error boundaries, loading states, or Suspense wrappers beyond what exists
