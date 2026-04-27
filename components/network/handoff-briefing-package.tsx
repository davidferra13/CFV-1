'use client'

import { useEffect, useState } from 'react'
import { getHandoffBriefing, type HandoffBriefing } from '@/lib/network/handoff-briefing-actions'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  MapPin,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
} from '@/components/ui/icons'

type HandoffBriefingProps = {
  handoffId: string
  eventId: string | null
  isRecipient: boolean
}

function formatCents(cents: number | null): string {
  if (!cents) return '$0'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function HandoffBriefingPackage({ handoffId, eventId, isRecipient }: HandoffBriefingProps) {
  const [briefing, setBriefing] = useState<HandoffBriefing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!eventId) {
      setLoading(false)
      return
    }
    getHandoffBriefing(handoffId)
      .then((data) => {
        setBriefing(data)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [handoffId, eventId])

  if (loading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-zinc-800/50 rounded-lg p-4 animate-pulse h-20" />
        ))}
      </div>
    )
  }

  if (error || !briefing) {
    return (
      <div className="mt-4 bg-zinc-800/50 rounded-lg p-4 text-sm text-stone-500">
        Event details not available for this handoff.
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">
        Event Briefing
      </div>

      {/* Event overview */}
      <Section icon={<Calendar className="h-4 w-4 text-stone-400" />} title="Event">
        <div className="space-y-1.5">
          {briefing.eventDate && (
            <Row label="Date">
              {new Date(briefing.eventDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Row>
          )}
          {briefing.occasion && <Row label="Occasion">{briefing.occasion}</Row>}
          {briefing.guestCount && <Row label="Guests">{briefing.guestCount}</Row>}
          {briefing.serviceStyle && <Row label="Style">{briefing.serviceStyle}</Row>}
          {(briefing.locationCity || briefing.locationState) && (
            <Row label="Location">
              {[briefing.locationCity, briefing.locationState].filter(Boolean).join(', ')}
            </Row>
          )}
        </div>
      </Section>

      {/* Client snapshot */}
      <Section icon={<Users className="h-4 w-4 text-stone-400" />} title="Client">
        <div className="space-y-2">
          {briefing.clientFirstName && <Row label="Name">{briefing.clientFirstName}</Row>}
          {briefing.dietaryRestrictions.length > 0 && (
            <div>
              <span className="text-xs text-stone-500">Dietary: </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {briefing.dietaryRestrictions.map((d) => (
                  <Badge key={d} variant="warning">
                    {d}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {briefing.allergies.length > 0 && (
            <div>
              <span className="text-xs text-stone-500">Allergies: </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {briefing.allergies.map((a) => (
                  <Badge key={a} variant="error">
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {briefing.dislikes.length > 0 && (
            <div>
              <span className="text-xs text-stone-500">Dislikes: </span>
              <span className="text-xs text-stone-300">{briefing.dislikes.join(', ')}</span>
            </div>
          )}
        </div>
      </Section>

      {/* Menu */}
      {(briefing.menuName || briefing.menuItems.length > 0) && (
        <Section icon={<Clock className="h-4 w-4 text-stone-400" />} title="Menu">
          {briefing.menuName && (
            <div className="text-sm text-stone-200 font-medium mb-2">{briefing.menuName}</div>
          )}
          {briefing.menuItems.length > 0 && (
            <div className="space-y-1">
              {briefing.menuItems.map((item, i) => (
                <div key={i} className="flex items-baseline gap-2">
                  <span className="text-xs text-stone-500 uppercase w-20 flex-shrink-0">
                    {item.category}
                  </span>
                  <span className="text-sm text-stone-300">{item.name}</span>
                </div>
              ))}
            </div>
          )}
          {briefing.recipeNames.length > 0 && (
            <div className="mt-2 pt-2 border-t border-zinc-700">
              <span className="text-xs text-stone-500">Linked recipes: </span>
              <span className="text-xs text-stone-300">{briefing.recipeNames.join(', ')}</span>
            </div>
          )}
        </Section>
      )}

      {/* Kitchen + Logistics */}
      {(briefing.kitchenSize || briefing.kitchenConstraints || briefing.parkingInstructions) && (
        <Section icon={<MapPin className="h-4 w-4 text-stone-400" />} title="Kitchen & Logistics">
          {briefing.kitchenSize && <Row label="Kitchen">{briefing.kitchenSize}</Row>}
          {briefing.kitchenConstraints && (
            <Row label="Constraints">{briefing.kitchenConstraints}</Row>
          )}
          {briefing.parkingInstructions && (
            <Row label="Parking">{briefing.parkingInstructions}</Row>
          )}
        </Section>
      )}

      {/* Readiness */}
      <Section icon={<CheckCircle className="h-4 w-4 text-stone-400" />} title="Readiness">
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Grocery list', ready: briefing.groceryListReady },
            { label: 'Prep list', ready: briefing.prepListReady },
            { label: 'Timeline', ready: briefing.timelineReady },
          ].map((item) => (
            <span
              key={item.label}
              className={`text-xs flex items-center gap-1 ${
                item.ready ? 'text-green-400' : 'text-stone-500'
              }`}
            >
              {item.ready ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {item.label}
            </span>
          ))}
        </div>
      </Section>

      {/* Financial */}
      {briefing.quotedPriceCents && (
        <Section icon={<DollarSign className="h-4 w-4 text-stone-400" />} title="Financial">
          <Row label="Quoted price">{formatCents(briefing.quotedPriceCents)}</Row>
        </Section>
      )}

      {/* Notes */}
      {(briefing.privateNote || briefing.contingencyNotes) && (
        <Section icon={<AlertTriangle className="h-4 w-4 text-amber-400" />} title="Notes">
          {briefing.privateNote && (
            <div className="text-sm text-stone-300 mb-2">{briefing.privateNote}</div>
          )}
          {briefing.contingencyNotes && (
            <div className="text-sm text-stone-400 italic">
              Contingency plan: {briefing.contingencyNotes}
            </div>
          )}
        </Section>
      )}
    </div>
  )
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-zinc-800/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-stone-500 w-20 flex-shrink-0">{label}</span>
      <span className="text-sm text-stone-300">{children}</span>
    </div>
  )
}
