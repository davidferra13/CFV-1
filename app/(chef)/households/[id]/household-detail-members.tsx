'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Crown, Plus, X, UserPlus } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import {
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

interface ClientOption {
  id: string
  full_name: string
  email: string
}

interface HouseholdDetailMembersProps {
  household: HouseholdWithMembers
  availableClients: ClientOption[]
}

export function HouseholdDetailMembers({
  household,
  availableClients,
}: HouseholdDetailMembersProps) {
  const router = useRouter()
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedRelationship, setSelectedRelationship] = useState<HouseholdRelationship>('partner')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleAddMember = () => {
    if (!selectedClientId) return
    setError(null)

    startTransition(async () => {
      try {
        await addHouseholdMember({
          household_id: household.id,
          client_id: selectedClientId,
          relationship: selectedRelationship,
        })
        setShowAddForm(false)
        setSelectedClientId('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add member')
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Members</CardTitle>
          {availableClients.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              Add Member
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
        )}

        {showAddForm && (
          <div className="p-4 rounded-lg border border-dashed border-brand-200 bg-brand-50/30 mb-4 space-y-3">
            <h4 className="text-sm font-medium text-stone-700">Add a Client to This Household</h4>
            <Select
              label="Client"
              options={[
                { value: '', label: 'Select a client...' },
                ...availableClients.map((c) => ({
                  value: c.id,
                  label: `${c.full_name} (${c.email})`,
                })),
              ]}
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
            />
            <Select
              label="Relationship"
              options={RELATIONSHIP_OPTIONS}
              value={selectedRelationship}
              onChange={(e) => setSelectedRelationship(e.target.value as HouseholdRelationship)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddMember}
                loading={isPending}
                disabled={isPending || !selectedClientId}
              >
                Add Member
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowAddForm(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {household.members.length === 0 ? (
          <p className="text-sm text-stone-500 text-center py-6">
            No members yet. Add clients to this household.
          </p>
        ) : (
          <div className="space-y-2">
            {household.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between py-3 px-4 rounded-lg bg-stone-50 border border-stone-100"
              >
                <div className="flex items-center gap-3">
                  {member.client_id === household.primary_client_id && (
                    <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                  <div>
                    <Link
                      href={`/clients/${member.client_id}`}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      {member.client_name || 'Unknown Client'}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-stone-500">
                        {RELATIONSHIP_LABELS[member.relationship]}
                      </span>
                      {member.client_email && (
                        <span className="text-xs text-stone-400">{member.client_email}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member.id)}
                  disabled={isPending}
                  className="p-1.5 text-stone-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  title="Remove member"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
