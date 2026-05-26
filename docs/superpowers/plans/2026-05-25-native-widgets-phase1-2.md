# Native Widgets Phase 1+2: Widget Data API + Quick Capture Page

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the server-side widget data API (4 endpoints + auth token system) and a lightweight Quick Capture page that native iOS/Android widgets will consume in Phases 3-4.

**Architecture:** Widget tokens follow the existing device token pattern (`lib/devices/token.ts`): generate random token, store SHA-256 hash in `widget_tokens` table, validate by hashing the bearer token and looking up the hash. A `withWidgetAuth` middleware wraps each endpoint. The Quick Capture page is a minimal `app/(chef)/capture/page.tsx` that deep-links from widget buttons.

**Tech Stack:** Next.js API routes, Supabase (postgres.js), Zod validation, existing server actions (`getWeekSchedule`, `getUniversalRail`, `getFeedItems`, `logExternalCommunication`)

**Spec:** `docs/superpowers/specs/2026-05-25-native-widgets-design.md`

---

## File Structure

```
database/migrations/20260527000001_widget_tokens.sql   # New table
lib/widgets/token.ts                                    # Token generate/validate/revoke
lib/widgets/middleware.ts                               # withWidgetAuth wrapper
lib/widgets/types.ts                                    # Shared response types
app/api/widgets/token/route.ts                          # POST: issue token, DELETE: revoke
app/api/widgets/calendar/route.ts                       # GET: upcoming events
app/api/widgets/rail/route.ts                           # GET: universal rail items
app/api/widgets/feed/route.ts                           # GET: feed entries
app/api/widgets/capture/route.ts                        # POST: quick capture
app/(chef)/capture/page.tsx                             # Quick capture UI page
lib/widgets/capture-actions.ts                          # Server actions for capture page
tests/unit/widgets/token.test.ts                        # Token utility tests
tests/unit/widgets/middleware.test.ts                    # Middleware tests
tests/unit/widgets/calendar-endpoint.test.ts            # Calendar API tests
tests/unit/widgets/rail-endpoint.test.ts                # Rail API tests
tests/unit/widgets/feed-endpoint.test.ts                # Feed API tests
tests/unit/widgets/capture-endpoint.test.ts             # Capture API tests
```

---

### Task 1: Widget Tokens Migration

**Files:**

- Create: `database/migrations/20260527000001_widget_tokens.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Widget API tokens for native mobile widgets (iOS WidgetKit / Android AppWidgetProvider).
-- Widgets run outside the Capacitor WebView so they cannot share the session cookie.
-- On app login, a scoped token is generated and stored in the device keychain.
-- Widgets include it as Authorization: Bearer <token> when calling /api/widgets/*.

CREATE TABLE IF NOT EXISTS widget_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  device_label TEXT NOT NULL DEFAULT 'unknown',
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read:calendar','read:rail','read:feed','write:capture'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '90 days'),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_widget_tokens_chef ON widget_tokens(chef_id);
CREATE INDEX idx_widget_tokens_hash ON widget_tokens(token_hash);

ALTER TABLE widget_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY widget_tokens_chef_policy ON widget_tokens
  FOR ALL
  USING (chef_id = auth.uid())
  WITH CHECK (chef_id = auth.uid());
```

- [ ] **Step 2: Verify migration filename is strictly higher than existing**

Run: `ls database/migrations/*.sql | Sort-Object | Select-Object -Last 3`
Expected: `20260527000001` is higher than `20260526000010`

- [ ] **Step 3: Commit**

```bash
git add database/migrations/20260527000001_widget_tokens.sql
git commit -m "feat(widgets): add widget_tokens migration for native widget auth"
```

---

### Task 2: Widget Token Utilities

**Files:**

- Create: `lib/widgets/token.ts`
- Create: `tests/unit/widgets/token.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/widgets/token.test.ts
import { describe, it, expect } from 'vitest'
import { generateWidgetToken, hashWidgetToken, isTokenExpired } from '@/lib/widgets/token'

describe('generateWidgetToken', () => {
  it('returns a 64-char hex string', () => {
    const token = generateWidgetToken()
    expect(token).toMatch(/^[a-f0-9]{64}$/)
  })

  it('generates unique tokens', () => {
    const a = generateWidgetToken()
    const b = generateWidgetToken()
    expect(a).not.toBe(b)
  })
})

describe('hashWidgetToken', () => {
  it('returns a deterministic SHA-256 hex hash', () => {
    const token = 'abc123'
    const hash1 = hashWidgetToken(token)
    const hash2 = hashWidgetToken(token)
    expect(hash1).toBe(hash2)
    expect(hash1).toMatch(/^[a-f0-9]{64}$/)
  })

  it('produces different hashes for different tokens', () => {
    expect(hashWidgetToken('aaa')).not.toBe(hashWidgetToken('bbb'))
  })
})

describe('isTokenExpired', () => {
  it('returns false for future expiry', () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    expect(isTokenExpired(future)).toBe(false)
  })

  it('returns true for past expiry', () => {
    const past = new Date(Date.now() - 86400000).toISOString()
    expect(isTokenExpired(past)).toBe(true)
  })

  it('returns true for null (treat missing as expired)', () => {
    expect(isTokenExpired(null)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/widgets/token.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Write the implementation**

```ts
// lib/widgets/token.ts
import { createHash, randomBytes } from 'crypto'
import { createServerClient } from '@/lib/db/server'

export function generateWidgetToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashWidgetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true
  return new Date(expiresAt).getTime() <= Date.now()
}

export interface WidgetTokenRecord {
  id: string
  chefId: string
  tenantId: string
  scopes: string[]
}

export async function validateWidgetToken(bearerToken: string): Promise<WidgetTokenRecord | null> {
  if (!bearerToken) return null

  const tokenHash = hashWidgetToken(bearerToken)
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('widget_tokens')
    .select('id, chef_id, scopes, expires_at, revoked_at')
    .eq('token_hash', tokenHash)
    .single()

  if (error || !data) return null
  if (data.revoked_at) return null
  if (isTokenExpired(data.expires_at)) return null

  // Verify chef still exists
  const { data: chef } = await db.from('chefs').select('id').eq('id', data.chef_id).single()

  if (!chef) return null

  // Touch last_used_at (fire-and-forget)
  db.from('widget_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {})
    .catch(() => {})

  return {
    id: data.id,
    chefId: data.chef_id,
    tenantId: data.chef_id,
    scopes: data.scopes ?? [],
  }
}

export async function createWidgetToken(
  chefId: string,
  deviceLabel: string
): Promise<{ token: string; id: string }> {
  const rawToken = generateWidgetToken()
  const tokenHash = hashWidgetToken(rawToken)
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('widget_tokens')
    .insert({
      chef_id: chefId,
      token_hash: tokenHash,
      device_label: deviceLabel,
      scopes: ['read:calendar', 'read:rail', 'read:feed', 'write:capture'],
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create widget token: ${error.message}`)

  return { token: rawToken, id: data.id }
}

export async function revokeWidgetToken(tokenId: string, chefId: string): Promise<boolean> {
  const db: any = createServerClient({ admin: true })

  const { error } = await db
    .from('widget_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', tokenId)
    .eq('chef_id', chefId)

  return !error
}

export async function refreshWidgetTokenExpiry(tokenId: string, chefId: string): Promise<boolean> {
  const db: any = createServerClient({ admin: true })

  const { error } = await db
    .from('widget_tokens')
    .update({
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      last_used_at: new Date().toISOString(),
    })
    .eq('id', tokenId)
    .eq('chef_id', chefId)
    .is('revoked_at', null)

  return !error
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/widgets/token.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/widgets/token.ts tests/unit/widgets/token.test.ts
git commit -m "feat(widgets): add widget token generation, hashing, and validation"
```

---

### Task 3: Widget Auth Middleware

**Files:**

- Create: `lib/widgets/middleware.ts`
- Create: `lib/widgets/types.ts`
- Create: `tests/unit/widgets/middleware.test.ts`

- [ ] **Step 1: Write shared types**

```ts
// lib/widgets/types.ts

export interface WidgetCalendarEvent {
  id: string
  title: string
  date: string
  guestCount: number
  status: string
  deepLink: string
}

export interface WidgetCalendarResponse {
  events: WidgetCalendarEvent[]
  updatedAt: string
}

export interface WidgetRailItem {
  id: string
  label: string
  priority: 'urgent' | 'high' | 'normal'
  category: string
  deepLink: string
}

export interface WidgetRailResponse {
  items: WidgetRailItem[]
  updatedAt: string
}

export interface WidgetFeedEntry {
  id: string
  source: string
  summary: string
  timestamp: string
  deepLink: string
}

export interface WidgetFeedResponse {
  entries: WidgetFeedEntry[]
  updatedAt: string
}

export interface WidgetCaptureRequest {
  channel: 'text' | 'photo' | 'voice'
  content: string
  eventId?: string | null
}

export interface WidgetCaptureResponse {
  success: boolean
  id?: string
  error?: string
}

export interface WidgetAuthContext {
  tokenId: string
  chefId: string
  tenantId: string
  scopes: string[]
}
```

- [ ] **Step 2: Write the middleware failing test**

```ts
// tests/unit/widgets/middleware.test.ts
import { describe, it, expect } from 'vitest'
import { extractBearerToken, hasScope } from '@/lib/widgets/middleware'

describe('extractBearerToken', () => {
  it('extracts token from valid Authorization header', () => {
    const headers = new Headers({ Authorization: 'Bearer abc123' })
    expect(extractBearerToken(headers)).toBe('abc123')
  })

  it('returns null for missing header', () => {
    expect(extractBearerToken(new Headers())).toBeNull()
  })

  it('returns null for non-Bearer scheme', () => {
    const headers = new Headers({ Authorization: 'Basic abc123' })
    expect(extractBearerToken(headers)).toBeNull()
  })

  it('returns null for empty bearer value', () => {
    const headers = new Headers({ Authorization: 'Bearer ' })
    expect(extractBearerToken(headers)).toBeNull()
  })
})

describe('hasScope', () => {
  it('returns true when scope is present', () => {
    expect(hasScope(['read:calendar', 'read:rail'], 'read:calendar')).toBe(true)
  })

  it('returns false when scope is missing', () => {
    expect(hasScope(['read:calendar'], 'write:capture')).toBe(false)
  })

  it('returns false for empty scopes', () => {
    expect(hasScope([], 'read:calendar')).toBe(false)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/unit/widgets/middleware.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 4: Write the middleware**

```ts
// lib/widgets/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateWidgetToken } from './token'
import type { WidgetAuthContext } from './types'

export function extractBearerToken(headers: Headers): string | null {
  const auth = headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7).trim()
  return token || null
}

export function hasScope(scopes: string[], required: string): boolean {
  return scopes.includes(required)
}

type WidgetHandler = (req: NextRequest, ctx: WidgetAuthContext) => Promise<NextResponse>

export function withWidgetAuth(handler: WidgetHandler, requiredScope: string) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const token = extractBearerToken(req.headers)
    if (!token) {
      return NextResponse.json({ error: 'Widget token required' }, { status: 401 })
    }

    const record = await validateWidgetToken(token)
    if (!record) {
      return NextResponse.json({ error: 'Invalid or expired widget token' }, { status: 401 })
    }

    if (!hasScope(record.scopes, requiredScope)) {
      return NextResponse.json(
        { error: `Missing required scope: ${requiredScope}` },
        { status: 403 }
      )
    }

    const ctx: WidgetAuthContext = {
      tokenId: record.id,
      chefId: record.chefId,
      tenantId: record.tenantId,
      scopes: record.scopes,
    }

    return handler(req, ctx)
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/widgets/middleware.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/widgets/types.ts lib/widgets/middleware.ts tests/unit/widgets/middleware.test.ts
git commit -m "feat(widgets): add widget auth middleware with scope checking"
```

---

### Task 4: Token Issuance Endpoint

**Files:**

- Create: `app/api/widgets/token/route.ts`

This endpoint is called by the Capacitor app on login to issue a widget token, and on logout to revoke it. It uses session auth (not widget token auth) since the user is inside the app.

- [ ] **Step 1: Write the endpoint**

```ts
// app/api/widgets/token/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { createWidgetToken, revokeWidgetToken, refreshWidgetTokenExpiry } from '@/lib/widgets/token'
import { z } from 'zod'

const CreateBody = z.object({
  deviceLabel: z.string().max(100).default('mobile'),
})

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'chef' || !user.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const parsed = CreateBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const result = await createWidgetToken(user.entityId, parsed.data.deviceLabel)

  return NextResponse.json({
    token: result.token,
    tokenId: result.id,
  })
}

const DeleteBody = z.object({
  tokenId: z.string().uuid(),
})

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'chef' || !user.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Missing tokenId' }, { status: 400 })
  }

  const parsed = DeleteBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid tokenId' }, { status: 400 })
  }

  await revokeWidgetToken(parsed.data.tokenId, user.entityId)
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'chef' || !user.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Missing tokenId' }, { status: 400 })
  }

  const parsed = DeleteBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid tokenId' }, { status: 400 })
  }

  await refreshWidgetTokenExpiry(parsed.data.tokenId, user.entityId)
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/widgets/token/route.ts
git commit -m "feat(widgets): add token issuance/revoke/refresh endpoint"
```

---

### Task 5: Calendar Widget Endpoint

**Files:**

- Create: `app/api/widgets/calendar/route.ts`
- Create: `tests/unit/widgets/calendar-endpoint.test.ts`

- [ ] **Step 1: Write the failing test**

The calendar endpoint transforms `WeekSchedule` data into a compact widget payload. Test the transformation logic in isolation.

```ts
// tests/unit/widgets/calendar-endpoint.test.ts
import { describe, it, expect } from 'vitest'
import { transformEventsForWidget } from '@/app/api/widgets/calendar/route'
import type { WeekDay } from '@/lib/scheduling/types'

const mockDays: WeekDay[] = [
  {
    date: '2026-05-26',
    dayOfWeek: 'Tuesday',
    dayType: 'event_day',
    events: [
      {
        id: 'evt_1',
        occasion: 'Birthday Dinner',
        clientName: 'Johnson',
        serveTime: '18:00',
        guestCount: 8,
        status: 'confirmed',
        prepStatus: 'ready',
      },
    ],
  },
  {
    date: '2026-05-27',
    dayOfWeek: 'Wednesday',
    dayType: 'off_day',
    events: [],
  },
  {
    date: '2026-05-28',
    dayOfWeek: 'Thursday',
    dayType: 'event_day',
    events: [
      {
        id: 'evt_2',
        occasion: null,
        clientName: 'Smith',
        serveTime: '19:30',
        guestCount: 4,
        status: 'pending',
        prepStatus: 'not_started',
      },
    ],
  },
]

describe('transformEventsForWidget', () => {
  it('flattens WeekDay events into widget format', () => {
    const result = transformEventsForWidget(mockDays, 5)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      id: 'evt_1',
      title: 'Birthday Dinner (Johnson)',
      date: '2026-05-26T18:00:00',
      guestCount: 8,
      status: 'confirmed',
      deepLink: '/events/evt_1',
    })
  })

  it('uses client name as title when occasion is null', () => {
    const result = transformEventsForWidget(mockDays, 5)
    expect(result[1].title).toBe('Smith')
  })

  it('respects limit parameter', () => {
    const result = transformEventsForWidget(mockDays, 1)
    expect(result).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/widgets/calendar-endpoint.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Write the endpoint**

```ts
// app/api/widgets/calendar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withWidgetAuth } from '@/lib/widgets/middleware'
import type {
  WidgetAuthContext,
  WidgetCalendarEvent,
  WidgetCalendarResponse,
} from '@/lib/widgets/types'
import type { WeekDay } from '@/lib/scheduling/types'
import { getWeekSchedule } from '@/lib/scheduling/actions'

export function transformEventsForWidget(days: WeekDay[], limit: number): WidgetCalendarEvent[] {
  const events: WidgetCalendarEvent[] = []

  for (const day of days) {
    for (const evt of day.events) {
      if (events.length >= limit) break

      const title = evt.occasion ? `${evt.occasion} (${evt.clientName})` : evt.clientName

      events.push({
        id: evt.id,
        title,
        date: `${day.date}T${evt.serveTime}:00`,
        guestCount: evt.guestCount,
        status: evt.status,
        deepLink: `/events/${evt.id}`,
      })
    }
    if (events.length >= limit) break
  }

  return events
}

export const GET = withWidgetAuth(async (req: NextRequest, ctx: WidgetAuthContext) => {
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '5', 10) || 5, 10)

  const schedule = await getWeekSchedule(0)
  const nextWeek = await getWeekSchedule(1)

  const allDays = [...schedule.days, ...nextWeek.days].filter(
    (d) => new Date(d.date) >= new Date(new Date().toDateString())
  )

  const events = transformEventsForWidget(allDays, limit)

  const response: WidgetCalendarResponse = {
    events,
    updatedAt: new Date().toISOString(),
  }

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'private, max-age=1800' },
  })
}, 'read:calendar')
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/widgets/calendar-endpoint.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/widgets/calendar/route.ts tests/unit/widgets/calendar-endpoint.test.ts
git commit -m "feat(widgets): add calendar widget endpoint with transform logic"
```

---

### Task 6: Universal Rail Widget Endpoint

**Files:**

- Create: `app/api/widgets/rail/route.ts`
- Create: `tests/unit/widgets/rail-endpoint.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/widgets/rail-endpoint.test.ts
import { describe, it, expect } from 'vitest'
import { transformRailForWidget } from '@/app/api/widgets/rail/route'
import type { UniversalRailItem } from '@/lib/discovery/universal-rail-types'

const mockItems: Partial<UniversalRailItem>[] = [
  {
    definitionId: 'rail_1',
    label: 'Confirm menu for Saturday',
    category: 'event_prep',
    href: '/events/evt_1/menu',
    score: 95,
    baseUrgency: 9,
  },
  {
    definitionId: 'rail_2',
    label: 'Follow up with Smith',
    category: 'follow_up',
    href: '/clients/cl_2',
    score: 60,
    baseUrgency: 5,
  },
  {
    definitionId: 'rail_3',
    label: 'Review invoice',
    category: 'admin',
    href: '/billing/inv_3',
    score: 30,
    baseUrgency: 3,
  },
]

describe('transformRailForWidget', () => {
  it('maps rail items to widget format with priority classification', () => {
    const result = transformRailForWidget(mockItems as UniversalRailItem[], 5)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({
      id: 'rail_1',
      label: 'Confirm menu for Saturday',
      priority: 'urgent',
      category: 'event_prep',
      deepLink: '/events/evt_1/menu',
    })
  })

  it('classifies priority based on baseUrgency', () => {
    const result = transformRailForWidget(mockItems as UniversalRailItem[], 5)
    expect(result[0].priority).toBe('urgent')
    expect(result[1].priority).toBe('high')
    expect(result[2].priority).toBe('normal')
  })

  it('respects limit', () => {
    const result = transformRailForWidget(mockItems as UniversalRailItem[], 2)
    expect(result).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/widgets/rail-endpoint.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Write the endpoint**

```ts
// app/api/widgets/rail/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withWidgetAuth } from '@/lib/widgets/middleware'
import type { WidgetAuthContext, WidgetRailItem, WidgetRailResponse } from '@/lib/widgets/types'
import type { UniversalRailItem } from '@/lib/discovery/universal-rail-types'
import { getUniversalRail } from '@/lib/discovery/universal-rail-actions'

function classifyPriority(baseUrgency: number): 'urgent' | 'high' | 'normal' {
  if (baseUrgency >= 8) return 'urgent'
  if (baseUrgency >= 5) return 'high'
  return 'normal'
}

export function transformRailForWidget(
  items: UniversalRailItem[],
  limit: number
): WidgetRailItem[] {
  return items.slice(0, limit).map((item) => ({
    id: item.definitionId,
    label: item.label,
    priority: classifyPriority(item.baseUrgency),
    category: item.category,
    deepLink: item.href,
  }))
}

export const GET = withWidgetAuth(async (req: NextRequest, ctx: WidgetAuthContext) => {
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '5', 10) || 5, 10)

  const result = await getUniversalRail('chef', 'widget', ctx.chefId, ctx.tenantId)
  const items = transformRailForWidget(result.items, limit)

  const response: WidgetRailResponse = {
    items,
    updatedAt: new Date().toISOString(),
  }

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'private, max-age=900' },
  })
}, 'read:rail')
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/widgets/rail-endpoint.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/widgets/rail/route.ts tests/unit/widgets/rail-endpoint.test.ts
git commit -m "feat(widgets): add universal rail widget endpoint"
```

---

### Task 7: Feed Widget Endpoint

**Files:**

- Create: `app/api/widgets/feed/route.ts`
- Create: `tests/unit/widgets/feed-endpoint.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/widgets/feed-endpoint.test.ts
import { describe, it, expect } from 'vitest'
import { transformFeedForWidget } from '@/app/api/widgets/feed/route'
import type { ComposedFeedEntry } from '@/lib/feed/source-registry'

const mockEntries: ComposedFeedEntry[] = [
  {
    id: 'feed_1',
    source: 'rail',
    score: 90,
    timestamp: Date.now() - 3600000,
    label: 'New inquiry from Sarah M.',
    sublabel: 'June 14 dinner for 12',
    href: '/inquiries/inq_1',
    category: 'inquiry',
    presentation: 'card',
    expandable: false,
    originalData: {},
  },
  {
    id: 'feed_2',
    source: 'notification',
    score: 70,
    timestamp: Date.now() - 7200000,
    label: 'Payment received: $450',
    href: '/billing/pay_2',
    category: 'payment',
    presentation: 'pill',
    expandable: false,
    originalData: {},
  },
]

describe('transformFeedForWidget', () => {
  it('maps feed entries to widget format', () => {
    const result = transformFeedForWidget(mockEntries, 5)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('feed_1')
    expect(result[0].source).toBe('inquiry')
    expect(result[0].summary).toBe('New inquiry from Sarah M.')
    expect(result[0].deepLink).toBe('/inquiries/inq_1')
  })

  it('uses category as source instead of adapter source', () => {
    const result = transformFeedForWidget(mockEntries, 5)
    expect(result[0].source).toBe('inquiry')
    expect(result[1].source).toBe('payment')
  })

  it('formats timestamp as ISO string', () => {
    const result = transformFeedForWidget(mockEntries, 5)
    expect(new Date(result[0].timestamp).getTime()).toBeGreaterThan(0)
  })

  it('respects limit', () => {
    const result = transformFeedForWidget(mockEntries, 1)
    expect(result).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/widgets/feed-endpoint.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Write the endpoint**

```ts
// app/api/widgets/feed/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withWidgetAuth } from '@/lib/widgets/middleware'
import type { WidgetAuthContext, WidgetFeedEntry, WidgetFeedResponse } from '@/lib/widgets/types'
import type { ComposedFeedEntry } from '@/lib/feed/source-registry'
import { assembleRailForPage } from '@/lib/discovery/universal-rail-assembly'
import { getFeedItems } from '@/lib/lifecycle/dashboard-feed-actions'

export function transformFeedForWidget(
  entries: ComposedFeedEntry[],
  limit: number
): WidgetFeedEntry[] {
  return entries.slice(0, limit).map((entry) => ({
    id: entry.id,
    source: entry.category,
    summary: entry.label,
    timestamp: new Date(entry.timestamp).toISOString(),
    deepLink: entry.href ?? '/dashboard',
  }))
}

export const GET = withWidgetAuth(async (req: NextRequest, ctx: WidgetAuthContext) => {
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '5', 10) || 5, 10)

  const result = await assembleRailForPage('chef', 'widget-feed', ctx.chefId, ctx.tenantId)

  const composed: ComposedFeedEntry[] = result.items.map((item: any) => ({
    id: item.definitionId,
    source: 'rail',
    score: item.score,
    timestamp: item.lastSeenAt ? new Date(item.lastSeenAt).getTime() : Date.now(),
    label: item.label,
    sublabel: item.sublabel,
    href: item.href,
    category: item.category,
    presentation: 'card' as const,
    expandable: item.expandable ?? false,
    originalData: item,
  }))

  const entries = transformFeedForWidget(composed, limit)

  const response: WidgetFeedResponse = {
    entries,
    updatedAt: new Date().toISOString(),
  }

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'private, max-age=900' },
  })
}, 'read:feed')
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/widgets/feed-endpoint.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/widgets/feed/route.ts tests/unit/widgets/feed-endpoint.test.ts
git commit -m "feat(widgets): add feed widget endpoint"
```

---

### Task 8: Capture Widget Endpoint

**Files:**

- Create: `app/api/widgets/capture/route.ts`
- Create: `tests/unit/widgets/capture-endpoint.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/widgets/capture-endpoint.test.ts
import { describe, it, expect } from 'vitest'
import { transformCaptureInput } from '@/app/api/widgets/capture/route'

describe('transformCaptureInput', () => {
  it('maps text capture to QuickCaptureInput', () => {
    const result = transformCaptureInput({
      channel: 'text',
      content: 'Truffle risotto idea',
      eventId: null,
    })
    expect(result).toEqual({
      channel: 'other',
      direction: 'inbound',
      keyInfo: 'Truffle risotto idea',
      linkedEventId: null,
      tags: ['general'],
      followUpNeeded: false,
    })
  })

  it('maps photo capture', () => {
    const result = transformCaptureInput({
      channel: 'photo',
      content: 'Photo of market haul',
      eventId: 'evt_1',
    })
    expect(result.linkedEventId).toBe('evt_1')
    expect(result.keyInfo).toBe('[Photo] Photo of market haul')
  })

  it('maps voice capture', () => {
    const result = transformCaptureInput({
      channel: 'voice',
      content: 'Client wants gluten free',
      eventId: null,
    })
    expect(result.keyInfo).toBe('[Voice] Client wants gluten free')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/widgets/capture-endpoint.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Write the endpoint**

```ts
// app/api/widgets/capture/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withWidgetAuth } from '@/lib/widgets/middleware'
import type {
  WidgetAuthContext,
  WidgetCaptureRequest,
  WidgetCaptureResponse,
} from '@/lib/widgets/types'
import { z } from 'zod'
import { logExternalCommunication } from '@/lib/communication/quick-capture-actions'
import type { QuickCaptureInput } from '@/lib/communication/quick-capture-actions'

const CaptureBody = z.object({
  channel: z.enum(['text', 'photo', 'voice']),
  content: z.string().min(1).max(2000),
  eventId: z.string().nullable().optional().default(null),
})

export function transformCaptureInput(input: WidgetCaptureRequest): QuickCaptureInput {
  const prefix =
    input.channel === 'photo' ? '[Photo] ' : input.channel === 'voice' ? '[Voice] ' : ''

  return {
    channel: 'other',
    direction: 'inbound',
    keyInfo: `${prefix}${input.content}`,
    linkedEventId: input.eventId ?? null,
    tags: ['general'],
    followUpNeeded: false,
  }
}

export const POST = withWidgetAuth(async (req: NextRequest, ctx: WidgetAuthContext) => {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' } satisfies WidgetCaptureResponse, {
      status: 400,
    })
  }

  const parsed = CaptureBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Invalid input',
      } satisfies WidgetCaptureResponse,
      { status: 400 }
    )
  }

  const captureInput = transformCaptureInput(parsed.data)
  const result = await logExternalCommunication(captureInput)

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error ?? 'Capture failed' } satisfies WidgetCaptureResponse,
      { status: 500 }
    )
  }

  const response: WidgetCaptureResponse = {
    success: true,
    id: result.communicationEventId,
  }

  return NextResponse.json(response, { status: 201 })
}, 'write:capture')
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/widgets/capture-endpoint.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/widgets/capture/route.ts tests/unit/widgets/capture-endpoint.test.ts
git commit -m "feat(widgets): add capture widget endpoint for text/photo/voice"
```

---

### Task 9: Quick Capture Page (Phase 2)

**Files:**

- Create: `app/(chef)/capture/page.tsx`
- Create: `lib/widgets/capture-actions.ts`

This is the full-page capture UI that widget buttons deep-link into. Minimal chrome, speed-optimized.

- [ ] **Step 1: Write the capture server actions**

```ts
// lib/widgets/capture-actions.ts
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { logExternalCommunication } from '@/lib/communication/quick-capture-actions'
import type { QuickCaptureInput } from '@/lib/communication/quick-capture-actions'

export async function getRecentEventsForCapture(): Promise<{ id: string; label: string }[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('events')
    .select('id, occasion, client:clients(first_name, last_name)')
    .eq('chef_id', user.tenantId)
    .gte('event_date', new Date().toISOString().split('T')[0])
    .order('event_date', { ascending: true })
    .limit(10)

  if (error || !data) return []

  return data.map((evt: any) => ({
    id: evt.id,
    label: evt.occasion
      ? `${evt.occasion} (${evt.client?.first_name ?? 'Unknown'})`
      : `${evt.client?.first_name ?? 'Unknown'} ${evt.client?.last_name ?? ''}`.trim(),
  }))
}

export async function submitCapture(input: {
  mode: 'text' | 'photo' | 'voice'
  content: string
  eventId?: string | null
}): Promise<{ success: boolean; error?: string }> {
  await requireChef()

  const prefix = input.mode === 'photo' ? '[Photo] ' : input.mode === 'voice' ? '[Voice] ' : ''

  const captureInput: QuickCaptureInput = {
    channel: 'other',
    direction: 'inbound',
    keyInfo: `${prefix}${input.content}`,
    linkedEventId: input.eventId ?? null,
    tags: ['general'],
    followUpNeeded: false,
  }

  const result = await logExternalCommunication(captureInput)
  return { success: result.success, error: result.error }
}
```

- [ ] **Step 2: Write the capture page**

```tsx
// app/(chef)/capture/page.tsx
'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getRecentEventsForCapture, submitCapture } from '@/lib/widgets/capture-actions'
import { Loader2, Mic, Camera, Type, Check, ArrowLeft } from 'lucide-react'

type CaptureMode = 'text' | 'photo' | 'voice'

export default function CapturePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialMode = (searchParams.get('mode') as CaptureMode) || 'text'

  const [mode, setMode] = useState<CaptureMode>(initialMode)
  const [content, setContent] = useState('')
  const [eventId, setEventId] = useState<string | null>(null)
  const [events, setEvents] = useState<{ id: string; label: string }[]>([])
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    getRecentEventsForCapture()
      .then(setEvents)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (mode === 'text' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [mode])

  function handleSubmit() {
    if (!content.trim()) return
    setError(null)

    startTransition(async () => {
      try {
        const result = await submitCapture({
          mode,
          content: content.trim(),
          eventId,
        })
        if (result.success) {
          setSubmitted(true)
          setTimeout(() => {
            router.back()
          }, 1500)
        } else {
          setError(result.error ?? 'Capture failed')
        }
      } catch (e) {
        setError('Something went wrong')
      }
    })
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm-50">
        <div className="text-center">
          <Check className="mx-auto h-12 w-12 text-green-500" />
          <p className="mt-3 text-lg font-medium text-warm-900">Captured!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <header className="flex items-center gap-3 border-b border-warm-200 px-4 py-3">
        <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-warm-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-warm-900">Quick Capture</h1>
      </header>

      <div className="flex gap-2 px-4 pt-4">
        {(['text', 'photo', 'voice'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mode === m ? 'bg-brand-500 text-white' : 'bg-warm-100 text-warm-700 hover:bg-warm-200'
            }`}
          >
            {m === 'text' && <Type className="h-4 w-4" />}
            {m === 'photo' && <Camera className="h-4 w-4" />}
            {m === 'voice' && <Mic className="h-4 w-4" />}
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 pt-4">
        <textarea
          ref={inputRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            mode === 'text'
              ? 'Type your note, idea, or observation...'
              : mode === 'photo'
                ? 'Describe what you captured...'
                : 'Transcribed text will appear here...'
          }
          className="h-40 w-full resize-none rounded-lg border border-warm-200 bg-white p-3 text-warm-900 placeholder:text-warm-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />

        {events.length > 0 && (
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-warm-700">
              Link to event (optional)
            </label>
            <select
              value={eventId ?? ''}
              onChange={(e) => setEventId(e.target.value || null)}
              className="w-full rounded-lg border border-warm-200 bg-white px-3 py-2 text-sm text-warm-900"
            >
              <option value="">No event</option>
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="border-t border-warm-200 px-4 py-4">
        <button
          onClick={handleSubmit}
          disabled={isPending || !content.trim()}
          className="w-full rounded-lg bg-brand-500 px-4 py-3 font-medium text-white transition-colors hover:bg-brand-600 disabled:bg-warm-300 disabled:text-warm-500"
        >
          {isPending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Save Capture'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify the page renders**

Run the dev server if not running, navigate to `http://localhost:3100/capture?mode=text`, verify:

- Mode tabs work (text/photo/voice)
- Text input auto-focuses in text mode
- Event selector loads upcoming events
- Submit works and shows success state

- [ ] **Step 4: Commit**

```bash
git add lib/widgets/capture-actions.ts app/(chef)/capture/page.tsx
git commit -m "feat(widgets): add quick capture page with text/photo/voice modes"
```

---

### Task 10: Integration Test

**Files:**

- No new files; verify all endpoints work together.

- [ ] **Step 1: Run all widget tests**

Run: `npx vitest run tests/unit/widgets/`
Expected: All tests pass (16+ tests across 5 files)

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: No errors in widget files

- [ ] **Step 3: Verify build**

Run: `npx next build --no-lint`
Expected: Build succeeds, all widget API routes and capture page compiled

- [ ] **Step 4: Manual API test (optional, requires running migration)**

After running the migration:

```bash
# Issue a token (must be logged in as chef in browser)
curl -X POST http://localhost:3100/api/widgets/token \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"deviceLabel": "test"}'

# Use token to hit calendar endpoint
curl http://localhost:3100/api/widgets/calendar \
  -H "Authorization: Bearer <token>"

# Use token to capture
curl -X POST http://localhost:3100/api/widgets/capture \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"channel": "text", "content": "Test capture from widget"}'
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(widgets): complete Phase 1+2 - widget data API and quick capture page"
```

---

## Summary

| Task | What                                                                | Files                     |
| ---- | ------------------------------------------------------------------- | ------------------------- |
| 1    | Migration: `widget_tokens` table                                    | 1 SQL                     |
| 2    | Token utilities (generate, hash, validate, create, revoke, refresh) | 1 TS + 1 test             |
| 3    | Widget auth middleware + shared types                               | 2 TS + 1 test             |
| 4    | Token issuance endpoint (session-authed)                            | 1 route                   |
| 5    | Calendar widget endpoint                                            | 1 route + 1 test          |
| 6    | Rail widget endpoint                                                | 1 route + 1 test          |
| 7    | Feed widget endpoint                                                | 1 route + 1 test          |
| 8    | Capture widget endpoint                                             | 1 route + 1 test          |
| 9    | Quick Capture page + server actions                                 | 1 page + 1 actions        |
| 10   | Integration verification                                            | Tests + typecheck + build |

**Total:** 14 new files, 0 modified files, ~1 migration

**Next:** Phase 3 plan (iOS WidgetKit via Capacitor plugin) after this is built and verified.
