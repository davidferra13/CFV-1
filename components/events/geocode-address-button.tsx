'use client'

import { useState, useTransition } from 'react'
import { geocodeEventAddress } from '@/lib/events/geocoding-actions'
import { Button } from '@/components/ui/button'

interface GeocodeAddressButtonProps {
  eventId: string
}

export function GeocodeAddressButton({ eventId }: GeocodeAddressButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  function handleGeocode() {
    setStatus('idle')
    startTransition(async () => {
      const result = await geocodeEventAddress(eventId)
      if (result.success) {
        setStatus('success')
        setMessage('Map location set — reload to see the map.')
      } else {
        setStatus('error')
        setMessage(result.error ?? 'Could not geocode address')
      }
    })
  }

  if (status === 'success') {
    return <p className="text-xs text-green-700 mt-2">✓ {message}</p>
  }

  return (
    <div className="mt-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleGeocode}
        disabled={isPending}
        className="text-xs h-7 px-2 text-stone-500 hover:text-stone-300"
      >
        {isPending ? 'Finding location…' : '📍 Add map location'}
      </Button>
      {status === 'error' && <p className="text-xs text-red-600 mt-1">{message}</p>}
    </div>
  )
}
