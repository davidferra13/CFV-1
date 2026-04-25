'use client'

import { FormEvent, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  getConnectedChefsForCollaboration,
  inviteChefToEvent,
  removeCollaborator,
} from '@/lib/collaboration/actions'
import type { CollaboratorRole, EventCollaborator } from '@/lib/collaboration/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type ConnectedChef = Awaited<ReturnType<typeof getConnectedChefsForCollaboration>>[number]

type EventCollaboratorsPanelProps = {
  eventId: string
  collaborators: EventCollaborator[]
}

const roleLabels: Record<CollaboratorRole, string> = {
  primary: 'Primary Chef',
  co_host: 'Co-Host',
  sous_chef: 'Sous Chef',
  observer: 'Observer',
}

const roleBadgeVariants: Record<CollaboratorRole, 'default' | 'success' | 'warning' | 'info'> = {
  primary: 'success',
  co_host: 'info',
  sous_chef: 'default',
  observer: 'warning',
}

const statusBadgeVariants: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  pending: 'warning',
  accepted: 'success',
  declined: 'default',
}

export function EventCollaboratorsPanel({ eventId, collaborators }: EventCollaboratorsPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<ConnectedChef[]>([])
  const [selectedChefId, setSelectedChefId] = useState('')
  const [role, setRole] = useState<CollaboratorRole>('co_host')
  const [note, setNote] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const visibleCollaborators = collaborators.filter(
    (collaborator) => collaborator.status !== 'removed'
  )
  const invitedChefIds = new Set(visibleCollaborators.map((collaborator) => collaborator.chef_id))
  const inviteCandidates = searchResults.filter((chef) => !invitedChefIds.has(chef.id))

  async function handleSearch() {
    setIsSearching(true)

    try {
      const chefs = await getConnectedChefsForCollaboration(search.trim() || undefined)
      setSearchResults(chefs)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to search connected chefs')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedChefId) {
      toast.error('Select a chef to invite')
      return
    }

    startTransition(() => {
      void (async () => {
        try {
          await inviteChefToEvent({
            eventId,
            targetChefId: selectedChefId,
            role,
            note: note.trim() || undefined,
          })
          setShowInviteForm(false)
          setSearch('')
          setSearchResults([])
          setSelectedChefId('')
          setRole('co_host')
          setNote('')
          router.refresh()
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to invite collaborator')
        }
      })()
    })
  }

  function handleRemove(collaboratorId: string) {
    startTransition(() => {
      void (async () => {
        try {
          await removeCollaborator(collaboratorId)
          router.refresh()
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to remove collaborator')
        }
      })()
    })
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-stone-100">Team</h2>
          <p className="mt-1 text-sm text-stone-400">
            Co-hosts and assistants connected to this event.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => setShowInviteForm((current) => !current)}
        >
          Invite
        </Button>
      </div>

      {showInviteForm && (
        <form
          onSubmit={handleInvite}
          className="mt-5 space-y-4 rounded-lg border border-stone-700 p-4"
        >
          <div className="space-y-2">
            <label htmlFor="collaborator-search" className="text-sm font-medium text-stone-200">
              Connected chef
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="collaborator-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by chef or business name"
                className="min-h-[44px] flex-1 rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSearch}
                loading={isSearching}
              >
                Search
              </Button>
            </div>
          </div>

          {searchResults.length > 0 && inviteCandidates.length === 0 ? (
            <p className="text-sm text-stone-400">All matching chefs are already on this team.</p>
          ) : inviteCandidates.length > 0 ? (
            <div className="space-y-2">
              {inviteCandidates.map((chef) => {
                const chefName = chef.display_name || chef.business_name
                return (
                  <label
                    key={chef.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-stone-700 bg-stone-900/70 p-3 text-sm text-stone-100 hover:border-stone-600"
                  >
                    <input
                      type="radio"
                      name="targetChefId"
                      value={chef.id}
                      checked={selectedChefId === chef.id}
                      onChange={() => setSelectedChefId(chef.id)}
                      className="h-4 w-4 border-stone-600 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{chefName}</span>
                      {chef.display_name && (
                        <span className="block truncate text-xs text-stone-400">
                          {chef.business_name}
                        </span>
                      )}
                    </span>
                  </label>
                )
              })}
            </div>
          ) : searchResults.length === 0 && search.trim() ? (
            <p className="text-sm text-stone-400">No connected chefs found.</p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="collaborator-role" className="text-sm font-medium text-stone-200">
                Role
              </label>
              <select
                id="collaborator-role"
                value={role}
                onChange={(event) => setRole(event.target.value as CollaboratorRole)}
                className="min-h-[44px] w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="co_host">Co-Host</option>
                <option value="sous_chef">Sous Chef</option>
                <option value="observer">Observer</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="collaborator-note" className="text-sm font-medium text-stone-200">
                Note
              </label>
              <input
                id="collaborator-note"
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional"
                className="min-h-[44px] w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" size="sm" loading={isPending}>
              Send Invite
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowInviteForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="mt-5 space-y-3">
        {visibleCollaborators.length === 0 ? (
          <p className="text-sm text-stone-400">
            No collaborators yet. Invite a co-host or sous chef.
          </p>
        ) : (
          visibleCollaborators.map((collaborator) => {
            const chefName =
              collaborator.chef?.display_name || collaborator.chef?.business_name || 'Collaborator'

            return (
              <div
                key={collaborator.id}
                className="flex flex-col gap-3 rounded-lg border border-stone-700 bg-stone-900/60 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-100">{chefName}</p>
                  {collaborator.chef?.display_name && (
                    <p className="truncate text-xs text-stone-400">
                      {collaborator.chef.business_name}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={roleBadgeVariants[collaborator.role]}>
                    {roleLabels[collaborator.role]}
                  </Badge>
                  <Badge variant={statusBadgeVariants[collaborator.status] ?? 'default'}>
                    {collaborator.status}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(collaborator.id)}
                    disabled={isPending}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </Card>
  )
}
