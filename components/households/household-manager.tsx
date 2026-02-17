'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, X, Crown, ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import {
  createHousehold,
  addHouseholdMember,
  removeHouseholdMember,
} from '@/lib/households/actions'
import type {
  HouseholdWithMembers,
  HouseholdRelationship,
} from '@/lib/households/actions'
import Link from 'next/link'

const RELATIONSHIP_LABELS: Record<HouseholdRelationship, string> = {
  partner: 'Partner',
  child: 'Child',
  family_member: 'Family Member',
  regular_guest: 'Regular Guest',
}

const RELATIONSHIP_OPTIONS = [
  { value: 'partner', label: 'Partner' },
  { value: 'child', label: 'Child' },
  { value: 'family_member', label: 'Family Member' },
  { value: 'regular_guest', label: 'Regular Guest' },
]

interface HouseholdManagerProps {
  clientId: string
  clientName: string
  household: HouseholdWithMembers | null
  allHouseholds: HouseholdWithMembers[]
}

export function HouseholdManager({
  clientId,
  clientName,
  household: initialHousehold,
  allHouseholds,
}: HouseholdManagerProps) {
  const router = useRouter()
  const [household, setHousehold] = useState(initialHousehold)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Create new household form state
  const [newName, setNewName] = useState(`The ${clientName.split(' ').pop() || clientName}s`)
  const [joinHouseholdId, setJoinHouseholdId] = useState('')
  const [joinRelationship, setJoinRelationship] = useState<HouseholdRelationship>('partner')
  const [error, setError] = useState<string | null>(null)

  const handleCreateHousehold = () => {
    if (!newName.trim()) return
    setError(null)

    startTransition(async () => {
      try {
        const result = await createHousehold({
          name: newName.trim(),
          primary_client_id: clientId,
        })

        // Add the client as primary member
        await addHouseholdMember({
          household_id: result.household.id,
          client_id: clientId,
          relationship: 'partner',
        })

        setShowCreate(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create household')
      }
    })
  }

  const handleJoinHousehold = () => {
    if (!joinHouseholdId) return
    setError(null)

    startTransition(async () => {
      try {
        await addHouseholdMember({
          household_id: joinHouseholdId,
          client_id: clientId,
          relationship: joinRelationship,
        })
        setShowJoin(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to join household')
      }
    })
  }

  const handleRemoveMember = (memberId: string) => {
    startTransition(async () => {
      try {
        await removeHouseholdMember(memberId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove member')
      }
    })
  }

  // Households this client is NOT already in
  const availableHouseholds = allHouseholds.filter(
    (h) => h.id !== household?.id
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" />
            Household
          </CardTitle>
          {household && (
            <Link href={`/households/${household.id}`}>
              <Button variant="ghost" size="sm">
                View Household <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
        )}

        {household ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-medium text-stone-900">{household.name}</h3>
              <span className="text-xs text-stone-500">
                ({household.members.length} member{household.members.length !== 1 ? 's' : ''})
              </span>
            </div>

            <div className="space-y-2">
              {household.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-stone-50"
                >
                  <div className="flex items-center gap-2">
                    {member.client_id === household.primary_client_id && (
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-stone-800">
                        {member.client_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-stone-500">
                        {RELATIONSHIP_LABELS[member.relationship]}
                      </p>
                    </div>
                  </div>
                  {member.client_id !== clientId && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={isPending}
                      className="p-1 text-stone-400 hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Remove member"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {household.notes && (
              <p className="mt-3 text-xs text-stone-500">{household.notes}</p>
            )}
          </div>
        ) : (
          <div>
            {!showCreate && !showJoin && (
              <div className="text-center py-6">
                <Users className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-sm text-stone-500 mb-4">
                  Not part of a household yet
                </p>
                <div className="flex justify-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setShowCreate(true)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Create Household
                  </Button>
                  {availableHouseholds.length > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowJoin(true)}
                    >
                      Join Existing
                    </Button>
                  )}
                </div>
              </div>
            )}

            {showCreate && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-stone-700">Create Household</h4>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Household name"
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleCreateHousehold}
                    loading={isPending}
                    disabled={isPending || !newName.trim()}
                  >
                    Create
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowCreate(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {showJoin && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-stone-700">Join Existing Household</h4>
                <Select
                  label="Household"
                  options={[
                    { value: '', label: 'Select a household...' },
                    ...availableHouseholds.map((h) => ({
                      value: h.id,
                      label: `${h.name} (${h.members.length} members)`,
                    })),
                  ]}
                  value={joinHouseholdId}
                  onChange={(e) => setJoinHouseholdId(e.target.value)}
                />
                <Select
                  label="Relationship"
                  options={RELATIONSHIP_OPTIONS}
                  value={joinRelationship}
                  onChange={(e) => setJoinRelationship(e.target.value as HouseholdRelationship)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleJoinHousehold}
                    loading={isPending}
                    disabled={isPending || !joinHouseholdId}
                  >
                    Join
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowJoin(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
