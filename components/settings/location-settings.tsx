'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { saveUserLocation } from '@/lib/location/location-actions'
import { updateAccountRadius } from '@/lib/location/account-location'

const RADIUS_OPTIONS = [5, 10, 25, 50, 100] as const

type LocationSettingsProps = {
  currentLocation: {
    zip: string
    city: string | null
    state: string | null
    lat: number | null
    lng: number | null
    radiusMiles: number
  } | null
  userId: string
}

export function LocationSettings({ currentLocation, userId }: LocationSettingsProps) {
  const router = useRouter()
  const [zip, setZip] = useState(currentLocation?.zip ?? '')
  const [radius, setRadius] = useState(String(currentLocation?.radiusMiles ?? 25))
  const [isSavingZip, startZipTransition] = useTransition()
  const [isSavingRadius, startRadiusTransition] = useTransition()

  function handleZipSave(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = zip.trim()
    if (!trimmed || !/^\d{5}$/.test(trimmed)) {
      toast.error('Enter a valid 5-digit zip code')
      return
    }

    startZipTransition(async () => {
      try {
        await saveUserLocation(trimmed)
        toast.success('Home location updated')
        router.refresh()
      } catch (err: any) {
        toast.error(err?.message || 'Failed to save location')
      }
    })
  }

  function handleRadiusChange(value: string) {
    setRadius(value)
    startRadiusTransition(async () => {
      try {
        await updateAccountRadius(userId, Number(value))
        toast.success('Service radius updated')
        router.refresh()
      } catch (err: any) {
        toast.error(err?.message || 'Failed to update radius')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-stone-400" />
          <CardTitle className="text-base">Home Location</CardTitle>
        </div>
        <CardDescription>
          Your default location for pricing, nearby searches, and client matching.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Current location display */}
        {currentLocation?.city && currentLocation?.state && (
          <div className="rounded-md bg-stone-800/50 px-3 py-2">
            <p className="text-sm text-stone-300">
              {currentLocation.city}, {currentLocation.state} {currentLocation.zip}
            </p>
            {currentLocation.lat != null && currentLocation.lng != null && (
              <p className="text-xs text-stone-500 mt-0.5">
                {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
              </p>
            )}
          </div>
        )}

        {/* Zip code form */}
        <form onSubmit={handleZipSave} className="space-y-2">
          <Label htmlFor="home-zip">Zip Code</Label>
          <div className="flex gap-2">
            <Input
              id="home-zip"
              type="text"
              inputMode="numeric"
              pattern="\d{5}"
              maxLength={5}
              placeholder="01835"
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
              disabled={isSavingZip}
              className="w-32"
            />
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={isSavingZip}
              disabled={isSavingZip || zip.length !== 5}
            >
              Save
            </Button>
          </div>
        </form>

        {/* Radius selector */}
        <div className="space-y-2">
          <Label htmlFor="service-radius">Service Radius</Label>
          <Select
            id="service-radius"
            value={radius}
            onChange={(e) => handleRadiusChange(e.target.value)}
            disabled={isSavingRadius}
            options={RADIUS_OPTIONS.map((miles) => ({
              value: String(miles),
              label: `${miles} miles`,
            }))}
            className="w-40"
          />
        </div>
      </CardContent>
    </Card>
  )
}
