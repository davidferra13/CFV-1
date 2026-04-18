'use client'

// Staff Event Portal - Mobile-First Briefing View
// Staff open this on their phone via a link from the chef.
// No login required. Shows event details, dietary alerts, tasks, schedule, and hours logging.

import { useState, useTransition } from 'react'
import { format, parseISO } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  markStaffTaskComplete,
  submitStaffHours,
  type StaffEventData,
  type StaffEventTask,
} from '@/lib/staff/staff-event-portal-actions'

const ROLE_LABELS: Record<string, string> = {
  sous_chef: 'Sous Chef',
  kitchen_assistant: 'Kitchen Assistant',
  service_staff: 'Service Staff',
  server: 'Server',
  bartender: 'Bartender',
  dishwasher: 'Dishwasher',
  other: 'Team Member',
}

function formatTime(time: string | null): string {
  if (!time) return ''
  // Handle HH:MM:SS or HH:MM format
  const parts = time.split(':')
  const h = parseInt(parts[0], 10)
  const m = parts[1] ?? '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m} ${ampm}`
}

type Props = {
  eventData: StaffEventData
  token: string
}

export function StaffEventView({ eventData, token }: Props) {
  const [tasks, setTasks] = useState<StaffEventTask[]>(eventData.tasks)
  const [hoursWorked, setHoursWorked] = useState('')
  const [hoursNotes, setHoursNotes] = useState('')
  const [hoursSubmitted, setHoursSubmitted] = useState(false)
  const [hoursError, setHoursError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const { event, dietaryAlerts, schedule, chefName, chefPhone, collaborators } = eventData

  const fullAddress = [
    event.locationAddress,
    event.locationCity,
    event.locationState,
    event.locationZip,
  ]
    .filter(Boolean)
    .join(', ')

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`

  function handleTaskToggle(taskIndex: number) {
    const previousTasks = [...tasks]
    // Optimistic update
    setTasks((prev) =>
      prev.map((t, i) => (i === taskIndex ? { ...t, completed: !t.completed } : t))
    )

    startTransition(async () => {
      try {
        const result = await markStaffTaskComplete(token, taskIndex)
        if (!result.success) {
          setTasks(previousTasks) // rollback
        }
      } catch {
        setTasks(previousTasks) // rollback
      }
    })
  }

  function handleSubmitHours() {
    const hours = parseFloat(hoursWorked)
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      setHoursError('Enter a valid number of hours (0.5 to 24)')
      return
    }

    setHoursError(null)
    startTransition(async () => {
      try {
        const result = await submitStaffHours(token, hours, hoursNotes || undefined)
        if (result.success) {
          setHoursSubmitted(true)
        } else {
          setHoursError(result.error ?? 'Failed to submit hours')
        }
      } catch {
        setHoursError('Failed to submit hours. Try again.')
      }
    })
  }

  const hasAlerts =
    dietaryAlerts.allergies.length > 0 || dietaryAlerts.dietaryRestrictions.length > 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center pb-2">
        <p className="text-sm font-medium text-brand-600">{chefName}</p>
        <h1 className="text-2xl font-bold text-stone-100 mt-1">
          {event.occasion || 'Event Briefing'}
        </h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Badge variant="info">{ROLE_LABELS[eventData.staffRole] ?? eventData.staffRole}</Badge>
          {eventData.assignedStation && (
            <Badge variant="default">{eventData.assignedStation}</Badge>
          )}
        </div>
        <p className="text-sm text-stone-400 mt-1">Welcome, {eventData.staffName}</p>
      </div>

      {/* Dietary Alerts - ALWAYS FIRST, safety-critical */}
      {hasAlerts && (
        <Card className="border-red-500/50 bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-400 text-base flex items-center gap-2">
              <span className="text-lg">!</span> Dietary Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dietaryAlerts.allergies.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1">
                  Allergies (life-threatening)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {dietaryAlerts.allergies.map((a) => (
                    <Badge key={a} variant="error" className="text-sm">
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {dietaryAlerts.dietaryRestrictions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-1">
                  Dietary Restrictions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {dietaryAlerts.dietaryRestrictions.map((d) => (
                    <Badge key={d} variant="warning" className="text-sm">
                      {d}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Event Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-stone-500 text-xs">Date</p>
              <p className="font-medium text-stone-100">
                {format(parseISO(event.eventDate), 'EEE, MMM d, yyyy')}
              </p>
            </div>
            <div>
              <p className="text-stone-500 text-xs">Serve Time</p>
              <p className="font-medium text-stone-100">{formatTime(event.serveTime)}</p>
            </div>
            {event.arrivalTime && (
              <div>
                <p className="text-stone-500 text-xs">Arrival Time</p>
                <p className="font-medium text-stone-100">{formatTime(event.arrivalTime)}</p>
              </div>
            )}
            <div>
              <p className="text-stone-500 text-xs">Guests</p>
              <p className="font-medium text-stone-100">{event.guestCount}</p>
            </div>
            <div>
              <p className="text-stone-500 text-xs">Service Style</p>
              <p className="font-medium text-stone-100 capitalize">
                {event.serviceStyle.replace(/_/g, ' ')}
              </p>
            </div>
            {schedule.scheduledHours && (
              <div>
                <p className="text-stone-500 text-xs">Your Shift</p>
                <p className="font-medium text-stone-100">{schedule.scheduledHours} hours</p>
              </div>
            )}
          </div>

          {event.specialRequests && (
            <div className="pt-2 border-t border-stone-800">
              <p className="text-stone-500 text-xs mb-1">Special Requests</p>
              <p className="text-sm text-stone-300">{event.specialRequests}</p>
            </div>
          )}

          {schedule.notes && (
            <div className="pt-2 border-t border-stone-800">
              <p className="text-stone-500 text-xs mb-1">Chef Notes for You</p>
              <p className="text-sm text-stone-300">{schedule.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location with Map Link */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-stone-700 p-3 hover:border-brand-500 transition-colors"
          >
            <p className="font-medium text-stone-100 text-sm">{event.locationAddress}</p>
            <p className="text-stone-400 text-sm">
              {event.locationCity}, {event.locationState} {event.locationZip}
            </p>
            <p className="text-brand-500 text-xs mt-1">Open in Maps</p>
          </a>

          {event.accessInstructions && (
            <div>
              <p className="text-stone-500 text-xs mb-1">Access Instructions</p>
              <p className="text-sm text-stone-300">{event.accessInstructions}</p>
            </div>
          )}

          {event.locationNotes && (
            <div>
              <p className="text-stone-500 text-xs mb-1">Location Notes</p>
              <p className="text-sm text-stone-300">{event.locationNotes}</p>
            </div>
          )}

          {event.kitchenNotes && (
            <div>
              <p className="text-stone-500 text-xs mb-1">Kitchen Notes</p>
              <p className="text-sm text-stone-300">{event.kitchenNotes}</p>
            </div>
          )}

          {event.siteNotes && (
            <div>
              <p className="text-stone-500 text-xs mb-1">Site Notes</p>
              <p className="text-sm text-stone-300">{event.siteNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Checklist */}
      {tasks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Tasks ({tasks.filter((t) => t.completed).length}/{tasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {tasks.map((task) => (
                <li key={task.index}>
                  <button
                    type="button"
                    onClick={() => handleTaskToggle(task.index)}
                    disabled={isPending}
                    className="flex items-start gap-3 w-full text-left p-2 rounded-lg hover:bg-stone-800/50 transition-colors disabled:opacity-50"
                  >
                    <div
                      className={`mt-0.5 h-5 w-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                        task.completed ? 'bg-green-600 border-green-600' : 'border-stone-600'
                      }`}
                    >
                      {task.completed && (
                        <svg
                          className="h-3 w-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        task.completed ? 'line-through text-stone-500' : 'text-stone-200'
                      }`}
                    >
                      {task.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Log Hours Form */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Log Hours</CardTitle>
        </CardHeader>
        <CardContent>
          {hoursSubmitted ? (
            <div className="text-center py-4">
              <div className="text-green-400 text-lg font-semibold mb-1">Hours Submitted</div>
              <p className="text-sm text-stone-400">
                {hoursWorked} hours logged. Thanks, {eventData.staffName}!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label htmlFor="hours" className="block text-xs text-stone-500 mb-1">
                  Hours Worked
                </label>
                <input
                  id="hours"
                  type="number"
                  step="0.25"
                  min="0.25"
                  max="24"
                  placeholder="e.g. 6.5"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(e.target.value)}
                  className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2.5 text-stone-100 text-base placeholder:text-stone-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label htmlFor="notes" className="block text-xs text-stone-500 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  rows={2}
                  placeholder="Any notes about your shift..."
                  value={hoursNotes}
                  onChange={(e) => setHoursNotes(e.target.value)}
                  className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2.5 text-stone-100 text-base placeholder:text-stone-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                />
              </div>
              {hoursError && <p className="text-sm text-red-400">{hoursError}</p>}
              <Button
                onClick={handleSubmitHours}
                disabled={isPending || !hoursWorked}
                className="w-full"
                variant="primary"
              >
                {isPending ? 'Submitting...' : 'Submit Hours'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chef Contact */}
      {chefPhone && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-500">Need to reach the chef?</p>
                <p className="text-sm font-medium text-stone-100">{chefName}</p>
              </div>
              <a
                href={`tel:${chefPhone}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 px-3 py-2 text-sm text-stone-300 hover:border-brand-500 hover:text-brand-400 transition-colors"
              >
                Call
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collaborating Chefs */}
      {collaborators && collaborators.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-stone-500 mb-2">Also working this event</p>
            <div className="space-y-1.5">
              {collaborators.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <p className="text-sm font-medium text-stone-100">{c.name}</p>
                  <p className="text-xs text-stone-400 capitalize">{c.role}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <p className="text-center text-xs text-stone-600 pb-8">Powered by ChefFlow</p>
    </div>
  )
}
