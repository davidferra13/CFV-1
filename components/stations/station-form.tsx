'use client'

// Station Form — Create or edit a station
// Used on the stations list page and station detail page.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  createStation,
  updateStation,
  deleteStation,
  type CreateStationInput,
} from '@/lib/stations/actions'

type StationData = {
  id: string
  name: string
  description: string | null
  display_order: number
}

type Props = {
  station?: StationData
  onDone?: () => void
}

export function StationForm({ station, onDone }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: station?.name ?? '',
    description: station?.description ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const input: CreateStationInput = {
      name: form.name,
      description: form.description || undefined,
      display_order: station?.display_order ?? 0,
    }

    try {
      if (station) {
        await updateStation(station.id, {
          name: input.name,
          description: input.description,
        })
      } else {
        await createStation(input)
        setForm({ name: '', description: '' })
      }
      router.refresh()
      onDone?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function handleDelete() {
    if (!station) return
    setShowDeleteConfirm(true)
  }

  async function handleConfirmedDelete() {
    if (!station) return
    setShowDeleteConfirm(false)
    setDeleting(true)
    setError(null)

    try {
      await deleteStation(station.id)
      router.push('/stations')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Station Name"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="e.g., Grill, Sauté, Pastry"
          required
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="What this station handles..."
          rows={2}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" loading={saving}>
          {station ? 'Update Station' : 'Create Station'}
        </Button>
        {station && (
          <Button type="button" variant="danger" loading={deleting} onClick={handleDelete}>
            Delete
          </Button>
        )}
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>

      {station && (
        <ConfirmModal
          open={showDeleteConfirm}
          title={`Delete station "${station.name}"?`}
          description="This cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          loading={deleting}
          onConfirm={handleConfirmedDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </form>
  )
}
