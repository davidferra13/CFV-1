'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Guest = {
  full_name: string
  rsvp_status: string
  photo_consent?: boolean
}

export function PhotoConsentSummary({ guests }: { guests: Guest[] }) {
  const attending = guests.filter((g) => g.rsvp_status === 'attending')
  if (attending.length === 0) return null

  const consented = attending.filter((g) => g.photo_consent)
  const notConsented = attending.filter((g) => !g.photo_consent)
  const allConsented = notConsented.length === 0
  const percentage = Math.round((consented.length / attending.length) * 100)

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-stone-100">Photo Consent</h3>
        <Badge
          variant={
            allConsented
              ? 'success'
              : notConsented.length > attending.length / 2
                ? 'warning'
                : 'info'
          }
        >
          {consented.length}/{attending.length} consented
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-stone-700 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all ${allConsented ? 'bg-emerald-9500' : 'bg-brand-9500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {allConsented ? (
        <p className="text-sm text-emerald-700 bg-emerald-950 rounded-lg px-3 py-2">
          All attending guests have consented to photo sharing. You're clear to post!
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-stone-400">
            {notConsented.length} guest{notConsented.length !== 1 ? 's' : ''} ha
            {notConsented.length !== 1 ? 've' : 's'}n't consented to photo sharing. Be mindful when
            posting event photos.
          </p>
          <details className="text-xs text-stone-500">
            <summary className="cursor-pointer hover:text-stone-300 font-medium">
              Who hasn't consented
            </summary>
            <ul className="mt-1 space-y-0.5 ml-3">
              {notConsented.map((g, i) => (
                <li key={i} className="list-disc">
                  {g.full_name}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </Card>
  )
}
