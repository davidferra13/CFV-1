'use client'

import { MapPin, Car } from '@/components/ui/icons'

export function BriefingAddress({
  address,
  city,
  state,
  zip,
  mapUrl,
}: {
  address: string
  city: string
  state: string
  zip: string
  mapUrl: string | null
}) {
  const fullAddress = [address, city, state, zip].filter(Boolean).join(', ')

  return (
    <div className="space-y-3">
      {/* Address display */}
      <div className="flex items-start gap-3">
        <MapPin className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" weight="fill" />
        <p className="text-base text-stone-200 font-medium leading-snug">
          {fullAddress || 'No address set'}
        </p>
      </div>

      {/* Navigate button */}
      {mapUrl && (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-blue-600 text-white text-lg font-bold hover:bg-blue-500 active:scale-[0.98] transition-all"
        >
          <Car className="h-6 w-6" />
          Navigate
        </a>
      )}
    </div>
  )
}
