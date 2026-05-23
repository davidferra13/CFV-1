'use client'

// Dietary Cheat Sheet for Kitchen Mode
// Color-coded guest dietary info for quick scanning during service.

import type { KitchenGuest } from '@/lib/kitchen/kitchen-mode-actions'

interface DietaryCheatSheetProps {
  guests: KitchenGuest[]
  eventDietary: string[]
  eventAllergies: string[]
  specialRequests: string | null
}

function getSeverityStyle(severity: 'allergy' | 'restriction' | 'preference'): {
  border: string
  bg: string
  badge: string
  badgeText: string
  label: string
} {
  switch (severity) {
    case 'allergy':
      return {
        border: 'border-red-500',
        bg: 'bg-red-950/50',
        badge: 'bg-red-600',
        badgeText: 'text-white',
        label: 'ALLERGY',
      }
    case 'restriction':
      return {
        border: 'border-orange-500',
        bg: 'bg-orange-950/50',
        badge: 'bg-orange-600',
        badgeText: 'text-white',
        label: 'RESTRICTION',
      }
    case 'preference':
      return {
        border: 'border-yellow-500',
        bg: 'bg-yellow-950/50',
        badge: 'bg-yellow-600',
        badgeText: 'text-black',
        label: 'PREFERENCE',
      }
  }
}

export function DietaryCheatSheet({
  guests,
  eventDietary,
  eventAllergies,
  specialRequests,
}: DietaryCheatSheetProps) {
  const hasAnyInfo =
    guests.length > 0 || eventDietary.length > 0 || eventAllergies.length > 0 || specialRequests

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Dietary Alerts</h2>

      {!hasAnyInfo ? (
        <div className="text-center py-6 text-zinc-500 text-lg">
          No dietary restrictions or allergies recorded for this event.
        </div>
      ) : (
        <div className="space-y-3">
          {/* Allergy warnings first (highest priority) */}
          {eventAllergies.length > 0 && (
            <div className="rounded-xl border-2 border-red-500 bg-red-950/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                  ALLERGY
                </span>
                <span className="text-red-300 text-sm font-medium">Critical</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {eventAllergies.map((allergy, i) => (
                  <span
                    key={i}
                    className="bg-red-800 text-red-100 px-3 py-1.5 rounded-lg text-lg font-medium"
                  >
                    {allergy}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dietary restrictions */}
          {eventDietary.length > 0 && (
            <div className="rounded-xl border-2 border-orange-500 bg-orange-950/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded">
                  RESTRICTION
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {eventDietary.map((restriction, i) => (
                  <span
                    key={i}
                    className="bg-orange-800 text-orange-100 px-3 py-1.5 rounded-lg text-lg font-medium"
                  >
                    {restriction}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Per-guest cards */}
          {guests.map((guest, idx) => {
            const style = getSeverityStyle(guest.severity)
            return (
              <div key={idx} className={`rounded-xl border-2 ${style.border} ${style.bg} p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white text-lg font-bold">{guest.name}</span>
                  <span className={`${style.badge} ${style.badgeText} text-xs font-bold px-2 py-1 rounded`}>
                    {style.label}
                  </span>
                </div>
                {guest.allergies.length > 0 && (
                  <div className="mb-2">
                    <span className="text-red-400 text-sm">Allergies: </span>
                    <span className="text-red-200 text-lg">{guest.allergies.join(', ')}</span>
                  </div>
                )}
                {guest.dietaryRestrictions.length > 0 && (
                  <div>
                    <span className="text-orange-400 text-sm">Dietary: </span>
                    <span className="text-orange-200 text-lg">
                      {guest.dietaryRestrictions.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )
          })}

          {/* Special requests */}
          {specialRequests && (
            <div className="rounded-xl border-2 border-zinc-600 bg-zinc-800/50 p-4">
              <div className="text-zinc-400 text-sm font-medium mb-1">Special Requests</div>
              <div className="text-zinc-200 text-lg">{specialRequests}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
