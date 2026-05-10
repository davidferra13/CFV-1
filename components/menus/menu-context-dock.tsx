'use client'

// Menu Context Dock: shows who this menu is for (client, circle, event)
// Allows attaching/detaching client and circle directly from menu detail.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { updateMenu } from '@/lib/menus/actions'
import Link from 'next/link'

type ClientOption = { id: string; full_name: string | null }
type CircleOption = { id: string; name: string; emoji: string | null }

type EventInfo = {
  id: string
  occasion: string | null
  event_date: string
  status: string
  clients?: { full_name?: string } | null
} | null

interface Props {
  menuId: string
  locked: boolean
  clientId: string | null
  clientName: string | null
  circleId: string | null
  circleName: string | null
  circleEmoji: string | null
  visibleToCircle: boolean
  event: EventInfo
  clients: ClientOption[]
  circles: CircleOption[]
}

export function MenuContextDock({
  menuId,
  locked,
  clientId,
  clientName,
  circleId,
  circleName,
  circleEmoji,
  visibleToCircle,
  event,
  clients,
  circles,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showClientPicker, setShowClientPicker] = useState(false)
  const [showCirclePicker, setShowCirclePicker] = useState(false)
  const [clientFilter, setClientFilter] = useState('')
  const [circleFilter, setCircleFilter] = useState('')

  const handleSetClient = (id: string | null) => {
    setError(null)
    setShowClientPicker(false)
    startTransition(async () => {
      try {
        await updateMenu(menuId, { client_id: id })
        router.refresh()
      } catch {
        setError('Failed to update client')
      }
    })
  }

  const handleSetCircle = (id: string | null) => {
    setError(null)
    setShowCirclePicker(false)
    startTransition(async () => {
      try {
        await updateMenu(menuId, { dinner_circle_group_id: id })
        router.refresh()
      } catch {
        setError('Failed to update circle')
      }
    })
  }

  const handleToggleVisibility = () => {
    setError(null)
    startTransition(async () => {
      try {
        await updateMenu(menuId, { visible_to_dinner_circle: !visibleToCircle })
        router.refresh()
      } catch {
        setError('Failed to update visibility')
      }
    })
  }

  const filteredClients = clientFilter
    ? clients.filter((c) => (c.full_name ?? '').toLowerCase().includes(clientFilter.toLowerCase()))
    : clients

  const filteredCircles = circleFilter
    ? circles.filter((c) => c.name.toLowerCase().includes(circleFilter.toLowerCase()))
    : circles

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Context</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-xs text-red-400">{error}</p>}

        {/* Client */}
        <div>
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">
            Client
          </label>
          {clientId && clientName ? (
            <div className="mt-1 flex items-center justify-between">
              <Link
                href={`/clients/${clientId}`}
                className="text-sm text-stone-200 hover:text-brand-400 transition-colors"
              >
                {clientName}
              </Link>
              {!locked && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setShowClientPicker(true)}
                    disabled={isPending}
                    className="text-xs text-stone-500 hover:text-stone-300 disabled:opacity-50"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetClient(null)}
                    disabled={isPending}
                    className="text-xs text-stone-500 hover:text-red-400 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-1">
              {!locked ? (
                <button
                  type="button"
                  onClick={() => setShowClientPicker(!showClientPicker)}
                  disabled={isPending}
                  className="text-xs text-brand-500 hover:text-brand-400 disabled:opacity-50"
                >
                  + Attach client
                </button>
              ) : (
                <p className="text-xs text-stone-600">None</p>
              )}
            </div>
          )}

          {showClientPicker && (
            <div className="mt-2 p-2 bg-stone-800 rounded-md border border-stone-700 max-h-48 overflow-y-auto">
              {clients.length > 5 && (
                <input
                  type="text"
                  placeholder="Filter clients..."
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="w-full mb-2 px-2 py-1 text-xs bg-stone-900 border border-stone-700 rounded text-stone-200 placeholder:text-stone-500"
                  autoFocus
                />
              )}
              {filteredClients.length === 0 ? (
                <p className="text-xs text-stone-500 py-1">No clients found</p>
              ) : (
                filteredClients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSetClient(c.id)}
                    className="w-full text-left px-2 py-1.5 text-sm text-stone-300 hover:bg-stone-700 rounded"
                  >
                    {c.full_name ?? 'Unnamed'}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Dinner Circle */}
        <div>
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">
            Dinner Circle
          </label>
          {circleId && circleName ? (
            <div className="mt-1">
              <div className="flex items-center justify-between">
                <Link
                  href={`/circles/${circleId}`}
                  className="text-sm text-stone-200 hover:text-brand-400 transition-colors"
                >
                  {circleEmoji && <span className="mr-1">{circleEmoji}</span>}
                  {circleName}
                </Link>
                {!locked && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setShowCirclePicker(true)}
                      disabled={isPending}
                      className="text-xs text-stone-500 hover:text-stone-300 disabled:opacity-50"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetCircle(null)}
                      disabled={isPending}
                      className="text-xs text-stone-500 hover:text-red-400 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              {/* Circle visibility toggle */}
              <button
                type="button"
                onClick={handleToggleVisibility}
                disabled={locked || isPending}
                className="mt-2 flex items-center gap-2 text-left group disabled:opacity-50"
              >
                <span
                  className={`w-7 h-4 rounded-full relative transition-colors ${
                    visibleToCircle ? 'bg-emerald-500' : 'bg-stone-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                      visibleToCircle ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </span>
                <span className="text-xs text-stone-400 group-hover:text-stone-300">
                  {visibleToCircle ? 'Visible to circle' : 'Hidden from circle'}
                </span>
              </button>
            </div>
          ) : (
            <div className="mt-1">
              {!locked ? (
                <button
                  type="button"
                  onClick={() => setShowCirclePicker(!showCirclePicker)}
                  disabled={isPending}
                  className="text-xs text-brand-500 hover:text-brand-400 disabled:opacity-50"
                >
                  + Attach circle
                </button>
              ) : (
                <p className="text-xs text-stone-600">None</p>
              )}
            </div>
          )}

          {showCirclePicker && (
            <div className="mt-2 p-2 bg-stone-800 rounded-md border border-stone-700 max-h-48 overflow-y-auto">
              {circles.length > 5 && (
                <input
                  type="text"
                  placeholder="Filter circles..."
                  value={circleFilter}
                  onChange={(e) => setCircleFilter(e.target.value)}
                  className="w-full mb-2 px-2 py-1 text-xs bg-stone-900 border border-stone-700 rounded text-stone-200 placeholder:text-stone-500"
                  autoFocus
                />
              )}
              {filteredCircles.length === 0 ? (
                <p className="text-xs text-stone-500 py-1">No circles found</p>
              ) : (
                filteredCircles.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSetCircle(c.id)}
                    className="w-full text-left px-2 py-1.5 text-sm text-stone-300 hover:bg-stone-700 rounded"
                  >
                    {c.emoji && <span className="mr-1">{c.emoji}</span>}
                    {c.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Event (read-only, linked elsewhere) */}
        <div>
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">
            Event
          </label>
          {event ? (
            <div className="mt-1 flex items-center gap-2">
              <Link
                href={`/events/${event.id}`}
                className="text-sm text-stone-200 hover:text-brand-400 transition-colors"
              >
                {event.occasion ?? 'Untitled Event'}
              </Link>
              <Badge variant="default" className="text-xxs">
                {event.status}
              </Badge>
            </div>
          ) : (
            <p className="mt-1 text-xs text-stone-600">No event linked</p>
          )}
        </div>

        {isPending && <p className="text-xxs text-stone-500">Saving...</p>}
      </CardContent>
    </Card>
  )
}
