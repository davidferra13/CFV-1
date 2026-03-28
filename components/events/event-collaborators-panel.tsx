'use client'

// Event Collaborators Panel
// Shown on the chef event detail page for events the chef owns.
// Lets chef invite connected network chefs, manage roles/permissions, and hand off the event.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  inviteChefToEvent,
  respondToEventInvitation,
  respondToRecipeShare,
  updateCollaboratorRole,
  removeCollaborator,
  handoffEvent,
  getConnectedChefsForCollaboration,
} from '@/lib/collaboration/actions'
import type {
  CollaboratorRole,
  CollaboratorPermissions,
  EventCollaborator,
  CollaboratorChefProfile,
  RecipeShare,
} from '@/lib/collaboration/types'
import { ROLE_DEFAULTS } from '@/lib/collaboration/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { format } from 'date-fns'

// ─── Label maps ──────────────────────────────

const ROLE_LABELS: Record<CollaboratorRole, string> = {
  primary: 'Primary Chef',
  co_host: 'Co-Host',
  sous_chef: 'Sous Chef',
  observer: 'Observer',
}

const ROLE_BADGE_VARIANTS: Record<
  CollaboratorRole,
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  primary: 'success',
  co_host: 'info',
  sous_chef: 'default',
  observer: 'warning',
}

const STATUS_BADGE_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> =
  {
    pending: 'warning',
    accepted: 'success',
    declined: 'error',
    removed: 'default',
  }

const PERMISSION_LABELS: Record<keyof CollaboratorPermissions, string> = {
  can_modify_menu: 'Edit menu',
  can_assign_staff: 'Assign staff',
  can_view_financials: 'View financials',
  can_communicate_with_client: 'Message client',
  can_close_event: 'Close event',
}

// ─── Prop types ───────────────────────────────

type Props = {
  eventId: string
  isOwner: boolean
  collaborators: EventCollaborator[]
}

// ─── Component ───────────────────────────────

export function EventCollaboratorsPanel({ eventId, isOwner, collaborators }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [showHandoffForm, setShowHandoffForm] = useState(false)

  function refresh() {
    router.refresh()
  }

  const acceptedCollaborators = collaborators.filter((c) => c.status === 'accepted')
  const pendingCollaborators = collaborators.filter((c) => c.status === 'pending')

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Chef Collaboration</CardTitle>
        {isOwner && (
          <div className="flex items-center gap-2">
            {acceptedCollaborators.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowHandoffForm(true)
                  setShowInviteForm(false)
                  setError(null)
                }}
              >
                Hand Off Event
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowInviteForm(true)
                setShowHandoffForm(false)
                setError(null)
              }}
            >
              + Invite Chef
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        {/* Invite form */}
        {showInviteForm && isOwner && (
          <InviteChefForm
            eventId={eventId}
            onSuccess={() => {
              setShowInviteForm(false)
              refresh()
            }}
            onCancel={() => setShowInviteForm(false)}
            onError={setError}
          />
        )}

        {/* Handoff form */}
        {showHandoffForm && isOwner && (
          <HandoffForm
            eventId={eventId}
            acceptedCollaborators={acceptedCollaborators}
            onSuccess={() => {
              setShowHandoffForm(false)
              refresh()
            }}
            onCancel={() => setShowHandoffForm(false)}
            onError={setError}
          />
        )}

        {/* Collaborator list */}
        {collaborators.length === 0 ? (
          <p className="text-sm text-stone-500">
            No collaborators yet.{isOwner ? ' Invite a connected chef to co-host or assist.' : ''}
          </p>
        ) : (
          <div className="space-y-3">
            {[
              ...acceptedCollaborators,
              ...pendingCollaborators,
              ...collaborators.filter((c) => c.status === 'declined' || c.status === 'removed'),
            ].map((collab) => (
              <CollaboratorRow
                key={collab.id}
                collab={collab}
                isOwner={isOwner}
                onRemove={async () => {
                  setError(null)
                  startTransition(async () => {
                    try {
                      await removeCollaborator(collab.id)
                      refresh()
                    } catch (err: any) {
                      setError(err.message)
                    }
                  })
                }}
                onRoleChange={async (newRole: CollaboratorRole) => {
                  setError(null)
                  startTransition(async () => {
                    try {
                      await updateCollaboratorRole({ collaboratorId: collab.id, role: newRole })
                      refresh()
                    } catch (err: any) {
                      setError(err.message)
                    }
                  })
                }}
                isPending={isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Invite Form ──────────────────────────────

function InviteChefForm({
  eventId,
  onSuccess,
  onCancel,
  onError,
}: {
  eventId: string
  onSuccess: () => void
  onCancel: () => void
  onError: (msg: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<CollaboratorChefProfile[]>([])
  const [selectedChef, setSelectedChef] = useState<CollaboratorChefProfile | null>(null)
  const [role, setRole] = useState<CollaboratorRole>('co_host')
  const [note, setNote] = useState('')
  const [searching, setSearching] = useState(false)

  async function handleSearch() {
    if (!search.trim()) return
    setSearching(true)
    try {
      const results = await getConnectedChefsForCollaboration(search)
      setSearchResults(results as CollaboratorChefProfile[])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  async function handleInvite() {
    if (!selectedChef) return
    onError('')
    startTransition(async () => {
      try {
        await inviteChefToEvent({
          eventId,
          targetChefId: selectedChef.id,
          role,
          permissions: ROLE_DEFAULTS[role],
          note: note || undefined,
        })
        onSuccess()
      } catch (err: any) {
        onError(err.message)
      }
    })
  }

  return (
    <div className="rounded-lg border border-brand-700 bg-brand-950/40 p-4 space-y-3">
      <p className="text-sm font-semibold text-stone-200">Invite a Connected Chef</p>

      {!selectedChef ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search your connected chefs..."
              className="flex-1 rounded-md border border-stone-600 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <Button variant="secondary" size="sm" onClick={handleSearch} disabled={searching}>
              {searching ? '...' : 'Search'}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-1">
              {searchResults.map((chef) => (
                <button
                  key={chef.id}
                  type="button"
                  onClick={() => setSelectedChef(chef)}
                  className="w-full text-left flex items-center gap-3 rounded-md border border-stone-700 bg-stone-900 px-3 py-2 hover:bg-stone-800 transition-colors text-sm"
                >
                  {chef.profile_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={chef.profile_image_url}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-stone-700 flex items-center justify-center text-xs font-medium text-stone-400">
                      {(chef.display_name || chef.business_name).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-stone-100">
                      {chef.display_name || chef.business_name}
                    </p>
                    {chef.display_name && (
                      <p className="text-xs text-stone-500">{chef.business_name}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchResults.length === 0 && search && !searching && (
            <p className="text-sm text-stone-500">
              No connected chefs found. Only chefs you&apos;re connected with in the Chef Network
              can be invited.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-md bg-stone-900 border border-stone-700 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-stone-700 flex items-center justify-center text-xs font-medium text-stone-400">
              {(selectedChef.display_name || selectedChef.business_name).charAt(0).toUpperCase()}
            </div>
            <p className="text-sm font-medium text-stone-100">
              {selectedChef.display_name || selectedChef.business_name}
            </p>
            <button
              type="button"
              onClick={() => setSelectedChef(null)}
              className="ml-auto text-xs text-stone-400 hover:text-stone-400"
            >
              Change
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as CollaboratorRole)}
              className="w-full rounded-md border border-stone-600 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="co_host">Co-Host - full access except closing event</option>
              <option value="sous_chef">Sous Chef - kitchen-side access only</option>
              <option value="observer">Observer - read-only</option>
            </select>
            <p className="mt-1 text-xs text-stone-500">
              You can adjust individual permissions after inviting.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">Optional note</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. I need help with the dessert station"
              className="w-full rounded-md border border-stone-600 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleInvite} loading={isPending}>
              {isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Handoff Form ─────────────────────────────

function HandoffForm({
  eventId,
  acceptedCollaborators,
  onSuccess,
  onCancel,
  onError,
}: {
  eventId: string
  acceptedCollaborators: EventCollaborator[]
  onSuccess: () => void
  onCancel: () => void
  onError: (msg: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  async function handleHandoff() {
    if (!selectedId || !confirmed) return
    onError('')
    startTransition(async () => {
      try {
        await handoffEvent({ eventId, newPrimaryChefId: selectedId })
        onSuccess()
      } catch (err: any) {
        onError(err.message)
      }
    })
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-950/40 p-4 space-y-3">
      <p className="text-sm font-semibold text-stone-200">Hand Off Event</p>
      <p className="text-xs text-stone-400">
        Transfers operational leadership to another chef. You become an observer (read-only). Both
        of you keep access.
      </p>

      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="w-full rounded-md border border-stone-600 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        <option value="">Select new primary chef...</option>
        {acceptedCollaborators.map((c) => (
          <option key={c.id} value={c.chef_id}>
            {c.chef.display_name || c.chef.business_name} ({ROLE_LABELS[c.role]})
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="h-4 w-4 rounded border-stone-600"
        />
        I understand I will become an observer and lose editing rights
      </label>

      <div className="flex gap-2">
        <Button
          variant="danger"
          size="sm"
          onClick={handleHandoff}
          disabled={isPending || !selectedId || !confirmed}
        >
          {isPending ? 'Transferring...' : 'Confirm Handoff'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ─── Collaborator Row ─────────────────────────

function CollaboratorRow({
  collab,
  isOwner,
  onRemove,
  onRoleChange,
  isPending,
}: {
  collab: EventCollaborator
  isOwner: boolean
  onRemove: () => void
  onRoleChange: (role: CollaboratorRole) => void
  isPending: boolean
}) {
  const [showPermissions, setShowPermissions] = useState(false)

  const chefName = collab.chef.display_name || collab.chef.business_name

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 p-3 space-y-2">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-stone-700 flex items-center justify-center text-sm font-medium text-stone-400 flex-shrink-0">
          {chefName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-100 truncate">{chefName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant={ROLE_BADGE_VARIANTS[collab.role]}>{ROLE_LABELS[collab.role]}</Badge>
            <Badge variant={STATUS_BADGE_VARIANTS[collab.status] || 'default'}>
              {collab.status}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {collab.status === 'accepted' && (
            <button
              type="button"
              onClick={() => setShowPermissions(!showPermissions)}
              className="text-xs text-stone-400 hover:text-stone-400 px-1.5 py-0.5 rounded"
            >
              {showPermissions ? 'Hide' : 'Perms'}
            </button>
          )}
          {isOwner && collab.status !== 'removed' && (
            <>
              {collab.status === 'accepted' && (
                <select
                  value={collab.role}
                  onChange={(e) => onRoleChange(e.target.value as CollaboratorRole)}
                  disabled={isPending}
                  className="text-xs rounded border border-stone-700 px-1 py-0.5 bg-stone-900 text-stone-300"
                  title="Change role"
                >
                  <option value="primary">Primary</option>
                  <option value="co_host">Co-Host</option>
                  <option value="sous_chef">Sous Chef</option>
                  <option value="observer">Observer</option>
                </select>
              )}
              <button
                type="button"
                onClick={onRemove}
                disabled={isPending}
                className="text-xs text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded"
                title="Remove collaborator"
              >
                Remove
              </button>
            </>
          )}
        </div>
      </div>

      {collab.note && <p className="text-xs text-stone-500 italic pl-12">{collab.note}</p>}

      {showPermissions && collab.status === 'accepted' && (
        <div className="pl-12 flex flex-wrap gap-1">
          {(Object.keys(PERMISSION_LABELS) as Array<keyof CollaboratorPermissions>).map((key) => (
            <span
              key={key}
              className={`text-xs rounded-full px-2 py-0.5 ${
                collab.permissions[key]
                  ? 'bg-green-900 text-green-800'
                  : 'bg-stone-800 text-stone-400 line-through'
              }`}
            >
              {PERMISSION_LABELS[key]}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Pending Invitation Row (for invited chef's view) ─────

export function CollaborationInvitationCard({
  collab,
  onRespond,
}: {
  collab: EventCollaborator & {
    event?: { id: string; occasion: string | null; event_date: string | null }
  }
  onRespond?: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handle(accepted: boolean) {
    setError(null)
    startTransition(async () => {
      try {
        await respondToEventInvitation({ collaboratorId: collab.id, accepted })
        router.refresh()
        onRespond?.()
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  const inviterName = collab.invited_by.display_name || collab.invited_by.business_name
  const eventName = (collab as any).event?.occasion || 'an event'
  const eventDate = (collab as any).event?.event_date
    ? format(new Date((collab as any).event.event_date), 'MMM d, yyyy')
    : null

  return (
    <div className="rounded-lg border border-brand-700 bg-brand-950/30 p-4 space-y-3">
      {error && <Alert variant="error">{error}</Alert>}
      <div>
        <p className="text-sm font-semibold text-stone-100">
          Collaboration invitation from {inviterName}
        </p>
        <p className="text-xs text-stone-500 mt-0.5">
          Event: {eventName}
          {eventDate && <span className="ml-1 text-stone-400">· {eventDate}</span>}
        </p>
        {collab.note && (
          <p className="text-xs text-stone-400 mt-0.5 italic">&ldquo;{collab.note}&rdquo;</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={ROLE_BADGE_VARIANTS[collab.role]}>{ROLE_LABELS[collab.role]}</Badge>
        <span className="text-xs text-stone-500">role on this event</span>
      </div>
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={() => handle(true)} loading={isPending}>
          Accept
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handle(false)} disabled={isPending}>
          Decline
        </Button>
      </div>
    </div>
  )
}

// ─── Pending Recipe Share Card (for receiving chef's view) ────

export function PendingRecipeShareCard({
  share,
  onRespond,
}: {
  share: RecipeShare & { recipe?: { id: string; name: string; category: string | null } }
  onRespond?: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handle(accepted: boolean) {
    setError(null)
    startTransition(async () => {
      try {
        await respondToRecipeShare({ shareId: share.id, accepted })
        router.refresh()
        onRespond?.()
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  const fromChefName = share.from_chef.display_name || share.from_chef.business_name
  const recipeName = share.recipe?.name || 'a recipe'

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-950/30 p-4 space-y-3">
      {error && <Alert variant="error">{error}</Alert>}
      <div>
        <p className="text-sm font-semibold text-stone-100">Recipe share from {fromChefName}</p>
        <p className="text-xs text-stone-400 mt-0.5">
          Recipe: <span className="font-medium">{recipeName}</span>
          {share.recipe?.category && ` · ${share.recipe.category}`}
        </p>
        {share.note && (
          <p className="text-xs text-stone-400 mt-1 italic">&ldquo;{share.note}&rdquo;</p>
        )}
      </div>
      <p className="text-xs text-stone-500">
        Accepting creates an independent editable copy in your recipe library.
      </p>
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={() => handle(true)} loading={isPending}>
          {isPending ? 'Copying...' : 'Accept & Copy'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handle(false)} disabled={isPending}>
          Decline
        </Button>
      </div>
    </div>
  )
}
