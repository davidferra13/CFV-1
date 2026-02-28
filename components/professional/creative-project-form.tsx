'use client'

import { useState, useTransition } from 'react'
import {
  createCreativeProject,
  updateCreativeProject,
} from '@/lib/professional/creative-project-actions'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function CreativeProjectForm({
  project,
  onClose,
}: {
  project?: {
    id: string
    dish_name: string
    cuisine: string | null
    notes: string | null
    status: string
  }
  onClose?: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [dishName, setDishName] = useState(project?.dish_name ?? '')
  const [cuisine, setCuisine] = useState(project?.cuisine ?? '')
  const [notes, setNotes] = useState(project?.notes ?? '')
  const [status, setStatus] = useState(project?.status ?? 'experimenting')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        if (project) {
          await updateCreativeProject(project.id, { dish_name: dishName, cuisine, notes, status })
        } else {
          await createCreativeProject({
            dish_name: dishName,
            cuisine: cuisine || undefined,
            notes: notes || undefined,
            status,
          })
        }
        onClose?.()
      } catch (err) {
        toast.error('Failed to save project')
      }
    })
  }

  return (
    <Card>
      <CardContent className="py-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Dish Name *</label>
            <input
              type="text"
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              required
              className="w-full border border-stone-600 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Cuisine</label>
            <input
              type="text"
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              className="w-full border border-stone-600 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-stone-600 rounded px-3 py-2 text-sm"
              title="Project status"
            >
              <option value="experimenting">Experimenting</option>
              <option value="nearly_there">Nearly There</option>
              <option value="mastered">Mastered</option>
              <option value="abandoned">Abandoned</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-stone-600 rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending || !dishName.trim()}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
            {onClose && (
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
