'use client'

import { useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import type { ChefFriend } from '@/lib/network/actions'
import {
  addTrustedChef,
  removeTrustedChef,
  type TrustedCircleMember,
} from '@/lib/network/collab-actions'

interface TrustedCircleProps {
  connections: ChefFriend[]
  initialTrusted: TrustedCircleMember[]
}

export function TrustedCircle({ connections, initialTrusted }: TrustedCircleProps) {
  const [trusted, setTrusted] = useState(initialTrusted)
  const [selectedChefId, setSelectedChefId] = useState('')
  const [trustLevel, setTrustLevel] = useState<'partner' | 'preferred' | 'inner_circle'>('partner')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const trustedChefIds = useMemo(
    () => new Set(trusted.map((member) => member.chef.chef_id)),
    [trusted]
  )

  const availableConnections = useMemo(
    () => connections.filter((connection) => !trustedChefIds.has(connection.chef_id)),
    [connections, trustedChefIds]
  )

  function resetForm() {
    setSelectedChefId('')
    setTrustLevel('partner')
    setNote('')
  }

  function handleAddTrustedChef() {
    setError(null)

    if (!selectedChefId) {
      setError('Select a connected chef to add to trusted circle.')
      return
    }

    startTransition(async () => {
      try {
        await addTrustedChef({
          trustedChefId: selectedChefId,
          trustLevel,
          notes: note.trim() || null,
        })

        const connection = connections.find((item) => item.chef_id === selectedChefId)
        if (connection) {
          setTrusted((prev) => [
            {
              id: `local-${Date.now()}`,
              trust_level: trustLevel,
              notes: note.trim() || null,
              created_at: new Date().toISOString(),
              chef: {
                chef_id: connection.chef_id,
                display_name: connection.display_name,
                business_name: connection.business_name,
                profile_image_url: connection.profile_image_url,
                city: connection.city,
                state: connection.state,
              },
            },
            ...prev,
          ])
        }
        resetForm()
      } catch (err: any) {
        setError(err.message || 'Failed to add trusted chef.')
      }
    })
  }

  function handleRemoveTrustedChef(chefId: string) {
    setError(null)

    startTransition(async () => {
      try {
        await removeTrustedChef(chefId)
        setTrusted((prev) => prev.filter((member) => member.chef.chef_id !== chefId))
      } catch (err: any) {
        setError(err.message || 'Failed to remove trusted chef.')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-stone-700 bg-stone-900 p-4 space-y-3">
        <h4 className="text-sm font-semibold text-stone-100">Add to Trusted Circle</h4>
        <p className="text-xs text-stone-400">
          Trusted chefs receive priority for handoffs and backup requests.
        </p>

        {availableConnections.length === 0 ? (
          <p className="text-sm text-stone-500">
            All your connections are already in your trusted circle.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1.5">
                  Connected Chef
                </label>
                <select
                  value={selectedChefId}
                  onChange={(event) => setSelectedChefId(event.target.value)}
                  className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  disabled={isPending}
                >
                  <option value="">Select a chef...</option>
                  {availableConnections.map((connection) => (
                    <option key={connection.chef_id} value={connection.chef_id}>
                      {connection.display_name || connection.business_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1.5">
                  Trust Level
                </label>
                <select
                  value={trustLevel}
                  onChange={(event) =>
                    setTrustLevel(event.target.value as 'partner' | 'preferred' | 'inner_circle')
                  }
                  className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  disabled={isPending}
                >
                  <option value="partner">Partner</option>
                  <option value="preferred">Preferred</option>
                  <option value="inner_circle">Inner Circle</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">Notes</label>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Optional notes about this trusted relationship."
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                disabled={isPending}
              />
            </div>

            <div className="flex justify-end">
              <Button size="sm" onClick={handleAddTrustedChef} disabled={isPending}>
                Add Trusted Chef
              </Button>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-700 bg-red-950 px-3 py-2">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
        <h4 className="text-sm font-semibold text-stone-100">Trusted Circle ({trusted.length})</h4>
        {trusted.length === 0 ? (
          <p className="text-sm text-stone-500 mt-3">
            No trusted chefs yet. Add your closest collaborators above.
          </p>
        ) : (
          <div className="space-y-2 mt-3">
            {trusted.map((member) => (
              <div
                key={member.id}
                className="rounded-lg border border-stone-700 bg-stone-900/70 px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-100 truncate">
                      {member.chef.display_name || member.chef.business_name}
                    </p>
                    <p className="text-xs text-stone-500">
                      {member.trust_level.replace('_', ' ')}
                      {member.chef.city || member.chef.state
                        ? ` - ${[member.chef.city, member.chef.state].filter(Boolean).join(', ')}`
                        : ''}
                    </p>
                    {member.notes && <p className="text-xs text-stone-400 mt-1">{member.notes}</p>}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveTrustedChef(member.chef.chef_id)}
                    disabled={isPending}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
