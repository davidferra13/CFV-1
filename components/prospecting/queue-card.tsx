'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Phone,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  User,
  Building2,
} from '@/components/ui/icons'
import type { Prospect } from '@/lib/prospecting/types'
import { logProspectCall } from '@/lib/prospecting/queue-actions'
import { CALL_OUTCOMES, PROSPECT_CATEGORY_LABELS } from '@/lib/prospecting/constants'
import type { ProspectCategory } from '@/lib/prospecting/constants'
import type { CallScript } from '@/lib/prospecting/types'

interface QueueCardProps {
  prospect: Prospect
  script?: CallScript | null
  onCallLogged?: () => void
}

export function QueueCard({ prospect, script, onCallLogged }: QueueCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState('')
  const [followUpDays, setFollowUpDays] = useState(7)
  const [isPending, startTransition] = useTransition()
  const [logged, setLogged] = useState(false)

  function handleOutcome(outcomeValue: string) {
    startTransition(async () => {
      try {
        await logProspectCall(
          prospect.id,
          outcomeValue,
          notes || undefined,
          outcomeValue === 'spoke_follow_up' ? followUpDays : undefined
        )
        setLogged(true)
        onCallLogged?.()
      } catch (err) {
        console.error('Failed to log call:', err)
      }
    })
  }

  if (logged) {
    return (
      <div className="p-4 rounded-lg border border-green-200 bg-green-950 text-green-800 text-sm">
        <span className="font-medium">{prospect.name}</span> — call logged!
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-stone-800 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {prospect.prospect_type === 'individual' ? (
              <User className="h-4 w-4 text-stone-300 flex-shrink-0" />
            ) : (
              <Building2 className="h-4 w-4 text-stone-300 flex-shrink-0" />
            )}
            <Link
              href={`/prospecting/${prospect.id}`}
              className="font-medium text-stone-100 hover:underline truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {prospect.name}
            </Link>
            <Badge variant="default" className="flex-shrink-0">
              {PROSPECT_CATEGORY_LABELS[prospect.category as ProspectCategory] ?? prospect.category}
            </Badge>
            {prospect.priority === 'high' && (
              <Badge variant="warning" className="flex-shrink-0">
                High Priority
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
            {prospect.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[prospect.city, prospect.state].filter(Boolean).join(', ')}
              </span>
            )}
            {prospect.best_time_to_call && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {prospect.best_time_to_call}
              </span>
            )}
            {prospect.call_count > 0 && (
              <span>
                Called {prospect.call_count}x — Last: {prospect.last_outcome}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {prospect.phone && (
            <a
              href={`tel:${prospect.phone}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="h-3.5 w-3.5" />
              Call
            </a>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-stone-300" />
          ) : (
            <ChevronDown className="h-4 w-4 text-stone-300" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-stone-800 p-4 space-y-4">
          {/* Gatekeeper Intel */}
          {(prospect.contact_person || prospect.gatekeeper_notes) && (
            <div className="bg-amber-950 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-medium text-amber-800 mb-1">Gatekeeper Intel</p>
              {prospect.contact_person && (
                <p className="text-sm text-amber-900">
                  Ask for: <strong>{prospect.contact_person}</strong>{' '}
                  {prospect.contact_title && `(${prospect.contact_title})`}
                </p>
              )}
              {prospect.gatekeeper_notes && (
                <p className="text-xs text-amber-700 mt-1">{prospect.gatekeeper_notes}</p>
              )}
            </div>
          )}

          {/* Approach Strategy */}
          {prospect.approach_strategy && (
            <div className="bg-blue-950 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-800 mb-1">Approach Strategy</p>
              <p className="text-sm text-blue-900">{prospect.approach_strategy}</p>
            </div>
          )}

          {/* Talking Points */}
          {prospect.talking_points && (
            <div className="bg-stone-800 border border-stone-700 rounded-lg p-3">
              <p className="text-xs font-medium text-stone-300 mb-1">Talking Points</p>
              <p className="text-sm text-stone-200">{prospect.talking_points}</p>
            </div>
          )}

          {/* Call Script */}
          {script && (
            <div className="bg-stone-800 border border-stone-700 rounded-lg p-3">
              <p className="text-xs font-medium text-stone-300 mb-1">Call Script: {script.name}</p>
              <p className="text-sm text-stone-200 whitespace-pre-wrap">{script.script_body}</p>
            </div>
          )}

          {/* Contact Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {prospect.phone && (
              <div>
                <span className="text-stone-500 text-xs">Phone:</span>
                <a href={`tel:${prospect.phone}`} className="block text-brand-600 hover:underline">
                  {prospect.phone}
                </a>
              </div>
            )}
            {prospect.contact_direct_phone && (
              <div>
                <span className="text-stone-500 text-xs">Direct:</span>
                <a
                  href={`tel:${prospect.contact_direct_phone}`}
                  className="block text-brand-600 hover:underline"
                >
                  {prospect.contact_direct_phone}
                </a>
              </div>
            )}
            {prospect.email && (
              <div>
                <span className="text-stone-500 text-xs">Email:</span>
                <a
                  href={`mailto:${prospect.email}`}
                  className="block text-brand-600 hover:underline"
                >
                  {prospect.email}
                </a>
              </div>
            )}
            {prospect.website && (
              <div>
                <span className="text-stone-500 text-xs">Website:</span>
                <a
                  href={prospect.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-brand-600 hover:underline truncate"
                >
                  {prospect.website}
                </a>
              </div>
            )}
          </div>

          {/* Notes input */}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Call notes (optional)..."
            className="w-full h-16 rounded-lg border border-stone-700 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            disabled={isPending}
          />

          {/* Follow-up days selector (shows when relevant) */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-stone-300">Follow up in</span>
            <select
              value={followUpDays}
              onChange={(e) => setFollowUpDays(Number(e.target.value))}
              className="rounded border border-stone-700 px-2 py-1 text-sm"
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>1 week</option>
              <option value={14}>2 weeks</option>
              <option value={30}>1 month</option>
            </select>
          </div>

          {/* Outcome buttons */}
          <div className="flex flex-wrap gap-2">
            {CALL_OUTCOMES.map((outcome) => (
              <Button
                key={outcome.value}
                variant={outcome.value === 'spoke_booked' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleOutcome(outcome.value)}
                disabled={isPending}
              >
                {outcome.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
