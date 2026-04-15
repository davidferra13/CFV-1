'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createGuest, updateGuest } from '@/lib/guests/actions'
import type { CreateGuestInput } from '@/lib/guests/actions'
import { useProtectedForm } from '@/lib/qol/use-protected-form'
import { FormShield } from '@/components/forms/form-shield'

interface GuestFormProps {
  guest?: {
    id: string
    name: string
    phone?: string | null
    email?: string | null
    notes?: string | null
  }
  onSuccess?: () => void
}

export function GuestForm({ guest, onSuccess }: GuestFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(guest?.name ?? '')
  const [phone, setPhone] = useState(guest?.phone ?? '')
  const [email, setEmail] = useState(guest?.email ?? '')
  const [notes, setNotes] = useState(guest?.notes ?? '')

  const defaultData = useMemo(
    () => ({
      name: guest?.name ?? '',
      phone: guest?.phone ?? '',
      email: guest?.email ?? '',
      notes: guest?.notes ?? '',
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [guest?.id]
  )

  const currentData = useMemo(() => ({ name, phone, email, notes }), [name, phone, email, notes])

  const protection = useProtectedForm({
    surfaceId: 'guest-form',
    recordId: guest?.id ?? null,
    tenantId: 'local',
    defaultData,
    currentData,
  })

  const applyFormData = useCallback((d: typeof defaultData) => {
    setName(d.name)
    setPhone(d.phone ?? '')
    setEmail(d.email ?? '')
    setNotes(d.notes ?? '')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const input: CreateGuestInput = {
        name,
        phone: phone || undefined,
        email: email || undefined,
        notes: notes || undefined,
      }

      if (guest) {
        await updateGuest(guest.id, input)
      } else {
        await createGuest(input)
      }

      protection.markCommitted()
      router.refresh()
      onSuccess?.()

      if (!guest) {
        setName('')
        setPhone('')
        setEmail('')
        setNotes('')
      }
    } catch (err: any) {
      console.error('[GuestForm] error:', err)
      setError(err.message || 'Failed to save guest')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormShield
      guard={protection.guard}
      showRestorePrompt={protection.showRestorePrompt}
      lastSavedAt={protection.lastSavedAt}
      onRestore={() => {
        const d = protection.restoreDraft()
        if (d) applyFormData(d)
      }}
      onDiscard={protection.discardDraft}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Guest name"
          />
          <Input
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="guest@email.com"
        />

        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Dietary preferences, special requests..."
          rows={3}
        />

        <div className="flex gap-3">
          <Button type="submit" loading={loading}>
            {guest ? 'Update Guest' : 'Add Guest'}
          </Button>
          {onSuccess && (
            <Button type="button" variant="ghost" onClick={onSuccess}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </FormShield>
  )
}
