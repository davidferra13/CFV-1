'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { createHousehold, updateHousehold } from '@/lib/households/actions'
import type { Household } from '@/lib/households/actions'

interface ClientOption {
  id: string
  full_name: string
  email: string
}

interface HouseholdFormProps {
  clients: ClientOption[]
  household?: Household
  onComplete?: (household: Household) => void
  onCancel?: () => void
}

export function HouseholdForm({ clients, household, onComplete, onCancel }: HouseholdFormProps) {
  const [name, setName] = useState(household?.name || '')
  const [primaryClientId, setPrimaryClientId] = useState(household?.primary_client_id || '')
  const [notes, setNotes] = useState(household?.notes || '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isEdit = !!household

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    startTransition(async () => {
      try {
        if (isEdit) {
          const result = await updateHousehold(household.id, {
            name: name.trim(),
            primary_client_id: primaryClientId || null,
            notes: notes.trim() || null,
          })
          onComplete?.(result.household)
        } else {
          const result = await createHousehold({
            name: name.trim(),
            primary_client_id: primaryClientId || undefined,
            notes: notes.trim() || undefined,
          })
          onComplete?.(result.household)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <Input
        label="Household Name"
        required
        placeholder='e.g., "The Johnsons" or "Smith Family"'
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <Select
        label="Primary Contact"
        options={[
          { value: '', label: 'Select a primary contact...' },
          ...clients.map((c) => ({
            value: c.id,
            label: `${c.full_name} (${c.email})`,
          })),
        ]}
        value={primaryClientId}
        onChange={(e) => setPrimaryClientId(e.target.value)}
        helperText="The main person you communicate with for this household"
      />

      <Textarea
        label="Notes"
        placeholder="Any notes about this household..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
      />

      <div className="flex gap-2">
        <Button type="submit" loading={isPending} disabled={isPending}>
          {isEdit ? 'Update Household' : 'Create Household'}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
