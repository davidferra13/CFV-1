'use client'

import { MapPin } from '@/components/ui/icons'

interface Props {
  eventId: string
  lat: number | null
  lng: number | null
  address: string | null
}

export function EventMapLink({ lat, lng, address }: Props) {
  if (!lat || !lng) return null

  const url = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : `https://www.google.com/maps/@${lat},${lng},15z`

  const displayAddress = address
    ? address.length > 40
      ? address.slice(0, 40) + '...'
      : address
    : `${lat.toFixed(4)}, ${lng.toFixed(4)}`

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md bg-stone-800 px-2.5 py-1.5 text-xs text-blue-400 hover:bg-stone-700 transition-colors"
    >
      <MapPin size={14} />
      <span className="truncate">{displayAddress}</span>
    </a>
  )
}
