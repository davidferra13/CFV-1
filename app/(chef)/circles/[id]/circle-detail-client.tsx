'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { OpenSlotForm } from '@/components/hub/open-slot-form'
import { PrivateMessagesTab } from '@/components/hub/private-messages-tab'
import type { CircleDetail } from '@/lib/hub/circle-detail-actions'
import { CircleSourcingBoard } from '@/components/circles/circle-sourcing-board'
import { CircleBroadcastDialog } from '@/components/circles/circle-broadcast-dialog'
import { CircleEngagementCard } from '@/components/circles/circle-engagement-card'
import { CirclePreferredDishes } from '@/components/circles/circle-preferred-dishes'
import {
  ChefCircleEventLinker,
  ChefCircleMemberControls,
  ChefCircleSettingsPanel,
} from '@/components/circles/chef-command-center'
import { IngredientAvailabilityBoard } from '@/components/hub/ingredient-availability-board'
import { RemyCircleToggle } from '@/components/hub/remy-circle-toggle'
import { RemyCircleDrawer } from '@/components/hub/remy-circle-drawer'
import {
  addClientToCircle,
  removeCircleMember,
  getClientsNotInCircle,
} from '@/lib/hub/circle-detail-actions'
import { CircleStatsBar } from '@/components/circles/circle-stats-bar'
import { ChangeHistoryDrawer } from '@/components/dinner-circles/change-history-drawer'

type Tab =
  | 'overview'
  | 'members'
  | 'events'
  | 'sourcing'
  | 'ingredients'
  | 'messages'
  | 'private'
  | 'controls'
  | 'history'

export function CircleDetailClient({ circle }: { circle: CircleDetail }) {
  const [tab, setTab] = useState<Tab>('overview')
  const [showSlotForm, setShowSlotForm] = useState(false)
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [showRemyDrawer, setShowRemyDrawer] = useState(false)
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false)

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'members', label: 'Members', count: circle.members.length },
    { key: 'events', label: 'Events', count: circle.events.length },
    { key: 'sourcing', label: 'Sourcing' },
    { key: 'ingredients', label: 'Ingredients' },
    { key: 'messages', label: 'Messages', count: circle.message_count },
    { key: 'private', label: 'Private' },
    { key: 'controls', label: 'Controls' },
    { key: 'history', label: 'History' },
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
          <button
            type="button"
            onClick={() => setShowRemyDrawer(true)}
            className="rounded-lg bg-amber-900/30 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-900/50"
            title="Ask Remy about this circle"
          >
            🐀 Remy
          </button>
          <button
            type="button"
            onClick={() => setShowBroadcast(true)}
            className="rounded-lg bg-stone-700 px-3 py-1.5 text-xs font-medium text-stone-300 hover:bg-stone-600"
          >
            Broadcast
          </button>
          <button
            type="button"
            onClick={() => setShowSlotForm(!showSlotForm)}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
          >
            Open Slot
          </button>
          <Link
            href={`/hub/g/${circle.group_token}`}
            target="_blank"
            className="rounded-lg bg-stone-700 px-3 py-1.5 text-xs font-medium text-stone-300 hover:bg-stone-600"
          >
            Public View
          </Link>
        </div>
      </div>

      {showSlotForm && (
        <OpenSlotForm circleId={circle.id} menus={[]} onClose={() => setShowSlotForm(false)} />
      )}

      <CircleBroadcastDialog
        circleId={circle.id}
        circleName={circle.name}
        open={showBroadcast}
        onClose={() => setShowBroadcast(false)}
      />

      {/* Remy toggle + drawer */}
      {circle.chef_profile_token && (
        <RemyCircleToggle
          groupId={circle.id}
          profileToken={circle.chef_profile_token}
          initialValue={circle.chef_show_remy}
        />
      )}
      <RemyCircleDrawer
        groupId={circle.id}
        isOpen={showRemyDrawer}
        onClose={() => setShowRemyDrawer(false)}
      />

      {/* Circle Intelligence Stats */}
      <CircleStatsBar circleId={circle.id} />

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
      {tab === 'sourcing' && <CircleSourcingBoard circleId={circle.id} />}
      {tab === 'ingredients' && (
        <IngredientAvailabilityBoard groupId={circle.id} eventId={circle.events[0]?.event_id} />
      )}
      {tab === 'messages' && <MessagesTab circle={circle} />}
      {tab === 'private' && <PrivateMessagesTabWrapper circle={circle} />}
      {tab === 'controls' && <ControlsTab circle={circle} />}
      {tab === 'history' && (
        <div className="py-4">
          <button
            type="button"
            onClick={() => setShowHistoryDrawer(true)}
            className="rounded-lg bg-stone-700 px-4 py-2 text-sm font-medium text-stone-300 hover:bg-stone-600"
          >
            Open change history
          </button>
        </div>
      )}

      <ChangeHistoryDrawer
        circleId={circle.id}
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
      />
    </div>
  )
}

// ─── OVERVIEW TAB ──────────────────────────────────────────

function PrivateMessagesTabWrapper({ circle }: { circle: CircleDetail }) {
  const [chefProfile, setChefProfile] = useState<{
    profileToken: string
    profileId: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      try {
        const { getChefHubProfileForCircle } = await import('@/lib/hub/private-message-actions')
        const profile = await getChefHubProfileForCircle(circle.id)
        if (!cancelled) setChefProfile(profile)
      } catch {
        if (!cancelled) setChefProfile(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [circle.id])

  if (loading) {
    return <div className="py-8 text-center text-sm text-stone-500">Loading...</div>
  }

  if (!chefProfile) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-900 p-8 text-center text-sm text-stone-400">
        Private messaging needs a chef hub profile for this circle.
      </div>
    )
  }

  return (
    <PrivateMessagesTab
      groupId={circle.id}
      chefProfileToken={chefProfile.profileToken}
      chefProfileId={chefProfile.profileId}
    />
  )
}

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

      {/* Engagement metrics */}
      <div className="col-span-full">
        <CircleEngagementCard circleId={circle.id} />
      </div>

      {/* Preferred dishes / event history */}
      <div className="col-span-full">
        <CirclePreferredDishes circleId={circle.id} events={circle.events} />
      </div>

      {/* RSVP Summary */}
      {(() => {
        const going = circle.members.filter((m) => m.rsvp_status === 'going').length
        const maybe = circle.members.filter((m) => m.rsvp_status === 'maybe').length
        const notGoing = circle.members.filter((m) => m.rsvp_status === 'not_going').length
        if (going === 0 && maybe === 0 && notGoing === 0) return null
        return (
          <div className="col-span-full rounded-xl border border-stone-700 bg-stone-800/50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-stone-200">RSVP Summary</h3>
            <div className="flex gap-4 text-sm">
              <span className="text-emerald-400">{going} going</span>
              <span className="text-amber-400">{maybe} maybe</span>
              <span className="text-stone-400">{notGoing} can&apos;t make it</span>
            </div>
          </div>
        )
      })()}

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
  const router = useRouter()

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

      <ChefCircleMemberControls circle={circle} onMembersChange={() => router.refresh()} />
    </div>
  )
}

function MemberRow({ member, circleId }: { member: CircleDetail['members'][0]; circleId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const canRemove = member.role !== 'owner' && member.role !== 'chef'

  const handleRemove = () => {
    if (!canRemove) return
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
          <RsvpBadge status={member.rsvp_status} />
        </div>
        {member.email && <p className="truncate text-xs text-stone-500">{member.email}</p>}
      </div>
      {canRemove && (
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
  return <ChefCircleEventLinker circle={circle} />
}

// ─── MESSAGES TAB ──────────────────────────────────────────

function ControlsTab({ circle }: { circle: CircleDetail }) {
  return <ChefCircleSettingsPanel circle={circle} />
}

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

const rsvpStyles: Record<string, { bg: string; label: string }> = {
  going: { bg: 'bg-emerald-500/20 text-emerald-300', label: 'Going' },
  maybe: { bg: 'bg-amber-500/20 text-amber-300', label: 'Maybe' },
  not_going: { bg: 'bg-stone-600/50 text-stone-400', label: "Can't make it" },
}

function RsvpBadge({ status }: { status: string | null }) {
  if (!status || status === 'no_response') return null
  const style = rsvpStyles[status]
  if (!style) return null
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.bg}`}>
      {style.label}
    </span>
  )
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
