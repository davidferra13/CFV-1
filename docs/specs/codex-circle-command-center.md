# Circle Command Center - Build Spec

> **Codex safety level: MEDIUM.** All work is additive (new files). One small edit to an existing component (href change). No schema changes. No migrations. No touching existing backend logic.

---

## Problem

The `/circles` page lists all circles, but clicking one opens the PUBLIC hub page (`/hub/g/${token}`) in a new tab. There is no chef-side management view. The chef cannot:

- See members mapped to their client records
- See all events linked to a circle with current status
- See communication gaps within a circle (who needs a response)
- Add existing clients to a circle
- Link/unlink events from a circle

## What Already Exists (DO NOT REBUILD)

| What                       | Where                              | Notes                                                           |
| -------------------------- | ---------------------------------- | --------------------------------------------------------------- |
| `hub_groups` table         | `lib/db/schema/schema.ts:14931`    | Circle entity. `event_id` is nullable (standalone circles work) |
| `hub_group_members` table  | `lib/db/schema/schema.ts:14078`    | Members with roles (owner/admin/chef/member/viewer)             |
| `hub_group_events` table   | `lib/db/schema/schema.ts:13886`    | Junction table for multi-event linking                          |
| `hub_messages` table       | `lib/db/schema/schema.ts:14021`    | Messages with types and sources                                 |
| `hub_guest_profiles` table | schema                             | Has `client_id` column for client bridging                      |
| `getChefCircles()`         | `lib/hub/chef-circle-actions.ts`   | Lists all circles for current chef                              |
| `createHubGroup()`         | `lib/hub/group-actions.ts`         | Creates a circle (event_id optional)                            |
| `createDinnerClub()`       | `lib/hub/chef-circle-actions.ts`   | Creates a dinner club circle                                    |
| `archiveCircle()`          | `lib/hub/chef-circle-actions.ts`   | Soft-deletes a circle                                           |
| Circle list UI             | `components/hub/circles-inbox.tsx` | Renders circle rows with unread counts                          |
| Circle types               | `lib/hub/types.ts`                 | `HubGroup`, `HubGroupMember`, `HubGroupEvent`                   |

**DO NOT** modify any of these files except the one edit specified in Section 5.

---

## Section 1: Backend - New File

**Create file:** `lib/hub/circle-detail-actions.ts`

This file contains server actions for the circle detail page. Follow the same patterns as `lib/hub/chef-circle-actions.ts`.

```ts
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ---------------------------------------------------------------------------
// Circle Detail Actions
// Server actions for the chef-side circle command center (/circles/[id]).
// ---------------------------------------------------------------------------

export interface CircleMemberDetail {
  profile_id: string
  display_name: string
  avatar_url: string | null
  email: string | null
  client_id: string | null
  client_name: string | null
  role: string
  joined_at: string
  last_read_at: string | null
}

export interface CircleEventLink {
  event_id: string
  event_title: string
  event_date: string | null
  event_status: string
  guest_count: number | null
  linked_at: string
}

export interface CircleMessage {
  id: string
  author_name: string
  author_avatar: string | null
  message_type: string
  body: string | null
  created_at: string
  is_pinned: boolean
}

export interface CircleDetail {
  id: string
  name: string
  description: string | null
  emoji: string | null
  group_type: string
  group_token: string
  visibility: string
  is_active: boolean
  message_count: number
  last_message_at: string | null
  created_at: string
  members: CircleMemberDetail[]
  events: CircleEventLink[]
  recent_messages: CircleMessage[]
}

/**
 * Get full circle detail for the chef-side command center.
 * Auth-gated: only the owning chef can view.
 */
export async function getCircleDetail(circleId: string): Promise<CircleDetail | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  // 1. Get the circle, verify tenant ownership
  const { data: circle } = await db
    .from('hub_groups')
    .select('*')
    .eq('id', circleId)
    .eq('tenant_id', tenantId)
    .single()

  if (!circle) return null

  // 2. Get members with profile + client data
  const { data: memberships } = await db
    .from('hub_group_members')
    .select('profile_id, role, joined_at, last_read_at')
    .eq('group_id', circleId)
    .order('joined_at', { ascending: true })

  const profileIds = (memberships ?? []).map((m: any) => m.profile_id)

  let profileMap: Record<string, any> = {}
  if (profileIds.length > 0) {
    const { data: profiles } = await db
      .from('hub_guest_profiles')
      .select('id, display_name, avatar_url, email, client_id')
      .in('id', profileIds)

    for (const p of profiles ?? []) {
      profileMap[p.id] = p
    }
  }

  // Get client names for profiles that have client_id
  const clientIds = Object.values(profileMap)
    .map((p: any) => p.client_id)
    .filter(Boolean)

  let clientNameMap: Record<string, string> = {}
  if (clientIds.length > 0) {
    const { data: clients } = await db.from('clients').select('id, full_name').in('id', clientIds)

    for (const c of clients ?? []) {
      clientNameMap[c.id] = c.full_name
    }
  }

  const members: CircleMemberDetail[] = (memberships ?? []).map((m: any) => {
    const profile = profileMap[m.profile_id] ?? {}
    return {
      profile_id: m.profile_id,
      display_name: profile.display_name ?? 'Unknown',
      avatar_url: profile.avatar_url ?? null,
      email: profile.email ?? null,
      client_id: profile.client_id ?? null,
      client_name: profile.client_id ? (clientNameMap[profile.client_id] ?? null) : null,
      role: m.role,
      joined_at: m.joined_at,
      last_read_at: m.last_read_at,
    }
  })

  // 3. Get linked events with status
  const { data: eventLinks } = await db
    .from('hub_group_events')
    .select('event_id, linked_at')
    .eq('group_id', circleId)
    .order('linked_at', { ascending: false })

  const eventIds = (eventLinks ?? []).map((e: any) => e.event_id)

  let eventMap: Record<string, any> = {}
  if (eventIds.length > 0) {
    const { data: events } = await db
      .from('events')
      .select('id, title, event_date, status, guest_count')
      .in('id', eventIds)

    for (const e of events ?? []) {
      eventMap[e.id] = e
    }
  }

  const events: CircleEventLink[] = (eventLinks ?? []).map((link: any) => {
    const event = eventMap[link.event_id] ?? {}
    return {
      event_id: link.event_id,
      event_title: event.title ?? 'Unknown Event',
      event_date: event.event_date ?? null,
      event_status: event.status ?? 'unknown',
      guest_count: event.guest_count ?? null,
      linked_at: link.linked_at,
    }
  })

  // 4. Get recent messages (last 20)
  const { data: messages } = await db
    .from('hub_messages')
    .select('id, author_profile_id, message_type, body, created_at, is_pinned')
    .eq('group_id', circleId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(20)

  const msgAuthorIds = (messages ?? []).map((m: any) => m.author_profile_id)
  let msgAuthorMap: Record<string, any> = {}
  if (msgAuthorIds.length > 0) {
    const { data: msgProfiles } = await db
      .from('hub_guest_profiles')
      .select('id, display_name, avatar_url')
      .in('id', msgAuthorIds)

    for (const p of msgProfiles ?? []) {
      msgAuthorMap[p.id] = p
    }
  }

  const recent_messages: CircleMessage[] = (messages ?? []).reverse().map((m: any) => {
    const author = msgAuthorMap[m.author_profile_id] ?? {}
    return {
      id: m.id,
      author_name: author.display_name ?? 'Unknown',
      author_avatar: author.avatar_url ?? null,
      message_type: m.message_type,
      body: m.body,
      created_at: m.created_at,
      is_pinned: m.is_pinned ?? false,
    }
  })

  return {
    id: circle.id,
    name: circle.name,
    description: circle.description,
    emoji: circle.emoji,
    group_type: circle.group_type ?? 'circle',
    group_token: circle.group_token,
    visibility: circle.visibility ?? 'public',
    is_active: circle.is_active,
    message_count: circle.message_count ?? 0,
    last_message_at: circle.last_message_at,
    created_at: circle.created_at,
    members,
    events,
    recent_messages,
  }
}

/**
 * Add an existing client to a circle.
 * Creates a hub_guest_profile for the client if one doesn't exist,
 * then adds them as a member.
 */
export async function addClientToCircle(
  circleId: string,
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  // Verify circle belongs to this chef
  const { data: circle } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', circleId)
    .eq('tenant_id', tenantId)
    .single()

  if (!circle) return { success: false, error: 'Circle not found' }

  // Verify client belongs to this chef
  const { data: client } = await db
    .from('clients')
    .select('id, full_name, email')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!client) return { success: false, error: 'Client not found' }

  // Find or create hub_guest_profile for this client
  let profileId: string

  const { data: existingProfile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  if (existingProfile) {
    profileId = existingProfile.id
  } else {
    const { data: newProfile, error: profileError } = await db
      .from('hub_guest_profiles')
      .insert({
        display_name: client.full_name || 'Guest',
        email: client.email,
        client_id: clientId,
      })
      .select('id')
      .single()

    if (profileError || !newProfile) {
      return { success: false, error: 'Failed to create profile' }
    }
    profileId = newProfile.id
  }

  // Check if already a member
  const { data: existingMember } = await db
    .from('hub_group_members')
    .select('id')
    .eq('group_id', circleId)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (existingMember) {
    return { success: false, error: 'Client is already a member of this circle' }
  }

  // Add as member
  const { error: memberError } = await db.from('hub_group_members').insert({
    group_id: circleId,
    profile_id: profileId,
    role: 'member',
    can_post: true,
    can_invite: false,
    can_pin: false,
  })

  if (memberError) {
    return { success: false, error: 'Failed to add member' }
  }

  revalidatePath(`/circles/${circleId}`)
  revalidatePath('/circles')
  return { success: true }
}

/**
 * Remove a member from a circle.
 */
export async function removeCircleMember(
  circleId: string,
  profileId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  // Verify circle belongs to this chef
  const { data: circle } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', circleId)
    .eq('tenant_id', tenantId)
    .single()

  if (!circle) return { success: false, error: 'Circle not found' }

  const { error } = await db
    .from('hub_group_members')
    .delete()
    .eq('group_id', circleId)
    .eq('profile_id', profileId)

  if (error) return { success: false, error: 'Failed to remove member' }

  revalidatePath(`/circles/${circleId}`)
  revalidatePath('/circles')
  return { success: true }
}

/**
 * Link an existing event to a circle.
 */
export async function linkEventToCircle(
  circleId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  // Verify circle belongs to this chef
  const { data: circle } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', circleId)
    .eq('tenant_id', tenantId)
    .single()

  if (!circle) return { success: false, error: 'Circle not found' }

  // Verify event belongs to this chef
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) return { success: false, error: 'Event not found' }

  // Check if already linked
  const { data: existing } = await db
    .from('hub_group_events')
    .select('id')
    .eq('group_id', circleId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing) return { success: false, error: 'Event is already linked to this circle' }

  const { error } = await db.from('hub_group_events').insert({
    group_id: circleId,
    event_id: eventId,
  })

  if (error) return { success: false, error: 'Failed to link event' }

  revalidatePath(`/circles/${circleId}`)
  return { success: true }
}

/**
 * Unlink an event from a circle.
 */
export async function unlinkEventFromCircle(
  circleId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  const { data: circle } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', circleId)
    .eq('tenant_id', tenantId)
    .single()

  if (!circle) return { success: false, error: 'Circle not found' }

  const { error } = await db
    .from('hub_group_events')
    .delete()
    .eq('group_id', circleId)
    .eq('event_id', eventId)

  if (error) return { success: false, error: 'Failed to unlink event' }

  revalidatePath(`/circles/${circleId}`)
  return { success: true }
}

/**
 * Get the chef's clients for the "add member" picker.
 * Returns clients NOT already in the specified circle.
 */
export async function getClientsNotInCircle(
  circleId: string
): Promise<Array<{ id: string; full_name: string; email: string | null }>> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  // Get all chef's clients
  const { data: allClients } = await db
    .from('clients')
    .select('id, full_name, email')
    .eq('tenant_id', tenantId)
    .order('full_name', { ascending: true })

  if (!allClients?.length) return []

  // Get client_ids already in circle (via hub_guest_profiles -> hub_group_members)
  const { data: members } = await db
    .from('hub_group_members')
    .select('profile_id')
    .eq('group_id', circleId)

  const memberProfileIds = (members ?? []).map((m: any) => m.profile_id)

  let existingClientIds = new Set<string>()
  if (memberProfileIds.length > 0) {
    const { data: profiles } = await db
      .from('hub_guest_profiles')
      .select('client_id')
      .in('id', memberProfileIds)
      .not('client_id', 'is', null)

    for (const p of profiles ?? []) {
      if (p.client_id) existingClientIds.add(p.client_id)
    }
  }

  return allClients.filter((c: any) => !existingClientIds.has(c.id))
}
```

**IMPORTANT for Codex:** Copy this code exactly. Do not modify the imports, do not add extra features, do not change the query patterns. The `.from().select().eq()` pattern is the project's database compatibility layer (NOT Supabase). It works via `lib/db/compat.ts`.

---

## Section 2: Frontend - Circle Detail Page

### File 1: `app/(chef)/circles/[id]/page.tsx`

Server component that loads circle detail data.

```tsx
import { notFound } from 'next/navigation'
import { getCircleDetail } from '@/lib/hub/circle-detail-actions'
import { CircleDetailClient } from './circle-detail-client'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const circle = await getCircleDetail(id)
  return { title: circle?.name ?? 'Circle' }
}

export default async function CircleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const circle = await getCircleDetail(id)

  if (!circle) notFound()

  return <CircleDetailClient circle={circle} />
}
```

### File 2: `app/(chef)/circles/[id]/circle-detail-client.tsx`

Client component with tabbed view. Follow the visual style of `app/(chef)/clients/[id]/page.tsx` (dark stone theme, rounded cards, stone-700 borders).

```tsx
'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { CircleDetail } from '@/lib/hub/circle-detail-actions'
import {
  addClientToCircle,
  removeCircleMember,
  linkEventToCircle,
  unlinkEventFromCircle,
  getClientsNotInCircle,
} from '@/lib/hub/circle-detail-actions'

type Tab = 'overview' | 'members' | 'events' | 'messages'

export function CircleDetailClient({ circle }: { circle: CircleDetail }) {
  const [tab, setTab] = useState<Tab>('overview')
  const router = useRouter()

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'members', label: 'Members', count: circle.members.length },
    { key: 'events', label: 'Events', count: circle.events.length },
    { key: 'messages', label: 'Messages', count: circle.message_count },
  ]

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-700 text-2xl">
            {circle.emoji || '💬'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-100">{circle.name}</h1>
            {circle.description && (
              <p className="mt-0.5 text-sm text-stone-400">{circle.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-stone-700 px-3 py-1 text-xs text-stone-300">
            {circle.group_type}
          </span>
          <Link
            href={`/hub/g/${circle.group_token}`}
            target="_blank"
            className="rounded-lg bg-stone-700 px-3 py-1.5 text-xs font-medium text-stone-300 hover:bg-stone-600"
          >
            Public View
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-stone-800/50 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-stone-700 text-stone-100' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1 text-xs text-stone-500">({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && <OverviewTab circle={circle} />}
      {tab === 'members' && <MembersTab circle={circle} />}
      {tab === 'events' && <EventsTab circle={circle} />}
      {tab === 'messages' && <MessagesTab circle={circle} />}
    </div>
  )
}

// ─── OVERVIEW TAB ──────────────────────────────────────────

function OverviewTab({ circle }: { circle: CircleDetail }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-4">
        <div className="text-2xl font-bold text-stone-100">{circle.members.length}</div>
        <div className="text-xs text-stone-400">Members</div>
      </div>
      <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-4">
        <div className="text-2xl font-bold text-stone-100">{circle.events.length}</div>
        <div className="text-xs text-stone-400">Linked Events</div>
      </div>
      <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-4">
        <div className="text-2xl font-bold text-stone-100">{circle.message_count}</div>
        <div className="text-xs text-stone-400">Messages</div>
      </div>

      {/* Recent activity */}
      {circle.recent_messages.length > 0 && (
        <div className="col-span-full rounded-xl border border-stone-700 bg-stone-800/50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-stone-200">Recent Activity</h3>
          <div className="space-y-2">
            {circle.recent_messages.slice(-5).map((msg) => (
              <div key={msg.id} className="flex items-start gap-2 text-sm">
                <span className="font-medium text-stone-300">{msg.author_name}</span>
                <span className="flex-1 truncate text-stone-400">
                  {msg.body || `[${msg.message_type}]`}
                </span>
                <span className="flex-shrink-0 text-xs text-stone-500">
                  {new Date(msg.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming events */}
      {circle.events.length > 0 && (
        <div className="col-span-full rounded-xl border border-stone-700 bg-stone-800/50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-stone-200">Linked Events</h3>
          <div className="space-y-2">
            {circle.events.slice(0, 5).map((evt) => (
              <Link
                key={evt.event_id}
                href={`/events/${evt.event_id}`}
                className="flex items-center justify-between rounded-lg bg-stone-700/30 px-3 py-2 hover:bg-stone-700/50"
              >
                <span className="text-sm text-stone-200">{evt.event_title}</span>
                <div className="flex items-center gap-2">
                  {evt.event_date && (
                    <span className="text-xs text-stone-400">
                      {new Date(evt.event_date + 'T00:00:00').toLocaleDateString()}
                    </span>
                  )}
                  <StatusBadge status={evt.event_status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MEMBERS TAB ───────────────────────────────────────────

function MembersTab({ circle }: { circle: CircleDetail }) {
  const [showAddForm, setShowAddForm] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-200">Members ({circle.members.length})</h3>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
        >
          + Add Client
        </button>
      </div>

      {showAddForm && <AddClientForm circleId={circle.id} onDone={() => setShowAddForm(false)} />}

      <div className="space-y-2">
        {circle.members.map((member) => (
          <MemberRow key={member.profile_id} member={member} circleId={circle.id} />
        ))}
        {circle.members.length === 0 && (
          <div className="py-8 text-center text-sm text-stone-500">
            No members yet. Add clients from your client list.
          </div>
        )}
      </div>
    </div>
  )
}

function MemberRow({ member, circleId }: { member: CircleDetail['members'][0]; circleId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleRemove = () => {
    if (member.role === 'owner') return
    startTransition(async () => {
      try {
        const result = await removeCircleMember(circleId, member.profile_id)
        if (!result.success) {
          toast.error(result.error ?? 'Failed to remove member')
        } else {
          toast.success(`Removed ${member.display_name}`)
          router.refresh()
        }
      } catch {
        toast.error('Failed to remove member')
      }
    })
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-700/50 bg-stone-800/30 p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-600 text-xs font-bold text-stone-200">
        {member.display_name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {member.client_id ? (
            <Link
              href={`/clients/${member.client_id}`}
              className="text-sm font-medium text-stone-200 hover:text-brand-400"
            >
              {member.client_name || member.display_name}
            </Link>
          ) : (
            <span className="text-sm font-medium text-stone-200">{member.display_name}</span>
          )}
          <span className="rounded-full bg-stone-700 px-2 py-0.5 text-xs text-stone-400">
            {member.role}
          </span>
        </div>
        {member.email && <p className="truncate text-xs text-stone-500">{member.email}</p>}
      </div>
      {member.role !== 'owner' && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={isPending}
          className="text-xs text-stone-500 hover:text-red-400 disabled:opacity-50"
        >
          Remove
        </button>
      )}
    </div>
  )
}

function AddClientForm({ circleId, onDone }: { circleId: string; onDone: () => void }) {
  const [clients, setClients] = useState<
    Array<{ id: string; full_name: string; email: string | null }>
  >([])
  const [loaded, setLoaded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Load available clients on mount
  if (!loaded) {
    setLoaded(true)
    getClientsNotInCircle(circleId).then(setClients)
  }

  const handleAdd = (clientId: string) => {
    startTransition(async () => {
      try {
        const result = await addClientToCircle(circleId, clientId)
        if (!result.success) {
          toast.error(result.error ?? 'Failed to add client')
        } else {
          toast.success('Client added to circle')
          router.refresh()
          onDone()
        }
      } catch {
        toast.error('Failed to add client')
      }
    })
  }

  if (!loaded) {
    return <div className="py-4 text-center text-sm text-stone-500">Loading clients...</div>
  }

  return (
    <div className="rounded-xl border border-stone-600 bg-stone-800 p-4">
      <h4 className="mb-2 text-sm font-medium text-stone-200">Select a client to add</h4>
      {clients.length === 0 ? (
        <p className="text-sm text-stone-500">All clients are already in this circle.</p>
      ) : (
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {clients.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => handleAdd(client.id)}
              disabled={isPending}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-stone-300 hover:bg-stone-700 disabled:opacity-50"
            >
              <span className="font-medium">{client.full_name}</span>
              {client.email && <span className="text-xs text-stone-500">{client.email}</span>}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={onDone}
        className="mt-2 text-xs text-stone-500 hover:text-stone-300"
      >
        Cancel
      </button>
    </div>
  )
}

// ─── EVENTS TAB ────────────────────────────────────────────

function EventsTab({ circle }: { circle: CircleDetail }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-200">
          Linked Events ({circle.events.length})
        </h3>
      </div>

      <div className="space-y-2">
        {circle.events.map((evt) => (
          <Link
            key={evt.event_id}
            href={`/events/${evt.event_id}`}
            className="flex items-center justify-between rounded-xl border border-stone-700/50 bg-stone-800/30 p-4 transition-colors hover:bg-stone-800/60"
          >
            <div>
              <div className="text-sm font-medium text-stone-200">{evt.event_title}</div>
              {evt.event_date && (
                <div className="mt-0.5 text-xs text-stone-400">
                  {new Date(evt.event_date + 'T00:00:00').toLocaleDateString()}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {evt.guest_count && (
                <span className="text-xs text-stone-500">{evt.guest_count} guests</span>
              )}
              <StatusBadge status={evt.event_status} />
            </div>
          </Link>
        ))}
        {circle.events.length === 0 && (
          <div className="py-8 text-center text-sm text-stone-500">
            No events linked to this circle yet.
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MESSAGES TAB ──────────────────────────────────────────

function MessagesTab({ circle }: { circle: CircleDetail }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-200">Messages ({circle.message_count})</h3>
        <Link
          href={`/hub/g/${circle.group_token}`}
          target="_blank"
          className="rounded-lg bg-stone-700 px-3 py-1.5 text-xs font-medium text-stone-300 hover:bg-stone-600"
        >
          Open Full Chat
        </Link>
      </div>

      <div className="space-y-3">
        {circle.recent_messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-xl border bg-stone-800/30 p-3 ${
              msg.is_pinned ? 'border-brand-500/30' : 'border-stone-700/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-stone-200">{msg.author_name}</span>
              <span className="text-xs text-stone-500">
                {new Date(msg.created_at).toLocaleString()}
              </span>
              {msg.is_pinned && (
                <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-xs text-brand-300">
                  Pinned
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-stone-300">
              {msg.body || `[${msg.message_type} message]`}
            </p>
          </div>
        ))}
        {circle.recent_messages.length === 0 && (
          <div className="py-8 text-center text-sm text-stone-500">No messages yet.</div>
        )}
      </div>
    </div>
  )
}

// ─── SHARED COMPONENTS ─────────────────────────────────────

const statusColors: Record<string, string> = {
  draft: 'bg-stone-600 text-stone-300',
  proposed: 'bg-blue-500/20 text-blue-300',
  accepted: 'bg-emerald-500/20 text-emerald-300',
  paid: 'bg-green-500/20 text-green-300',
  confirmed: 'bg-green-600/20 text-green-200',
  in_progress: 'bg-amber-500/20 text-amber-300',
  completed: 'bg-stone-600 text-stone-400',
  cancelled: 'bg-red-500/20 text-red-300',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        statusColors[status] ?? 'bg-stone-600 text-stone-300'
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  )
}
```

---

## Section 3: Small Edit - Circle Link Fix

**File to edit:** `components/hub/circles-inbox.tsx`

**Line ~134-136.** Change the Link `href` from the public hub page to the chef-side detail page:

**BEFORE:**

```tsx
      <Link
        href={`/hub/g/${circle.group_token}`}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1"
      >
```

**AFTER:**

```tsx
      <Link
        href={`/circles/${circle.id}`}
        className="min-w-0 flex-1"
      >
```

Remove `target="_blank"` and `rel="noopener noreferrer"` since this is now an internal navigation.

---

## Section 4: Loading State

**Create file:** `app/(chef)/circles/[id]/loading.tsx`

```tsx
export default function CircleDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="h-12 w-64 animate-pulse rounded-lg bg-stone-800" />
      <div className="h-10 animate-pulse rounded-lg bg-stone-800/50" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-stone-800/50" />
        ))}
      </div>
    </div>
  )
}
```

---

## DO NOT TOUCH

- `lib/hub/chef-circle-actions.ts` (except: this spec does NOT edit it)
- `lib/hub/group-actions.ts`
- `lib/hub/community-circle-actions.ts`
- `lib/dinner-circles/` (event-scoped circle layer, separate system)
- `lib/db/schema/schema.ts` (no schema changes)
- `database/migrations/` (no migrations)
- `app/(public)/hub/` (public hub pages)
- Any existing components in `components/hub/` except the one edit in Section 3

## Verification

After building, verify:

1. `npx tsc --noEmit --skipLibCheck` passes
2. `/circles` page still loads (existing functionality preserved)
3. Clicking a circle row navigates to `/circles/[id]` (not the public hub)
4. `/circles/[id]` page loads with tabs, members, events, messages
5. "Add Client" flow works (creates hub_guest_profile if needed, adds member)
6. "Remove" button works on non-owner members
7. Event links navigate to `/events/[id]`
8. "Public View" button opens `/hub/g/[token]` in new tab
