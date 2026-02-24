'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createGuest, updateGuest } from '@/lib/guests/actions'
import type { CreateGuestInput } from '@/lib/guests/actions'

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
  )
}
