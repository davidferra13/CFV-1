'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createIncident } from '@/lib/safety/incident-actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const INCIDENT_TYPES = [
  { value: 'food_safety', label: 'Food Safety' },
  { value: 'guest_injury', label: 'Guest Injury' },
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'equipment_failure', label: 'Equipment Failure' },
  { value: 'near_miss', label: 'Near Miss' },
  { value: 'other', label: 'Other' },
]

export function IncidentForm({ eventId, onSuccess }: { eventId?: string; onSuccess?: () => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 16))
  const [incidentType, setIncidentType] = useState<
    'food_safety' | 'guest_injury' | 'property_damage' | 'equipment_failure' | 'near_miss' | 'other'
  >('food_safety')
  const [description, setDescription] = useState('')
  const [partiesInvolved, setPartiesInvolved] = useState('')
  const [immediateAction, setImmediateAction] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await createIncident({
        incident_date: new Date(incidentDate).toISOString(),
        incident_type: incidentType,
        description,
        parties_involved: partiesInvolved || undefined,
        immediate_action: immediateAction || undefined,
        event_id: eventId,
      })
      onSuccess?.()
      router.push('/safety/incidents')
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report an Incident</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Date & Time</label>
            <input
              type="datetime-local"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              className="w-full border border-stone-300 rounded px-3 py-2 text-sm"
              title="Incident date and time"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Incident Type</label>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value as typeof incidentType)}
              className="w-full border border-stone-300 rounded px-3 py-2 text-sm"
              title="Incident type"
            >
              {INCIDENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
              className="w-full border border-stone-300 rounded px-3 py-2 text-sm"
              placeholder="What happened?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Parties Involved
            </label>
            <textarea
              value={partiesInvolved}
              onChange={(e) => setPartiesInvolved(e.target.value)}
              rows={2}
              className="w-full border border-stone-300 rounded px-3 py-2 text-sm"
              placeholder="Who was involved or affected?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Immediate Action Taken
            </label>
            <textarea
              value={immediateAction}
              onChange={(e) => setImmediateAction(e.target.value)}
              rows={2}
              className="w-full border border-stone-300 rounded px-3 py-2 text-sm"
              placeholder="What was done immediately?"
            />
          </div>
          <Button type="submit" disabled={isPending || !description.trim()}>
            {isPending ? 'Saving...' : 'Document Incident'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
