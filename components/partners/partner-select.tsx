// Partner Select — Cascading dropdown for selecting partner + location
// Used in inquiry form and event form
'use client'

import { useState, useEffect } from 'react'
import { Select } from '@/components/ui/select'

type Partner = {
  id: string
  name: string
  partner_type: string
}

type Location = {
  id: string
  name: string
  city: string | null
  state: string | null
}

const TYPE_LABELS: Record<string, string> = {
  airbnb_host: 'Airbnb',
  business: 'Business',
  platform: 'Platform',
  individual: 'Individual',
  venue: 'Venue',
  other: 'Other',
}

export function PartnerSelect({
  partners,
  partnerLocations,
  defaultPartnerId,
  defaultLocationId,
  onPartnerChange,
  onLocationChange,
}: {
  partners: Partner[]
  partnerLocations: Record<string, Location[]>
  defaultPartnerId?: string | null
  defaultLocationId?: string | null
  onPartnerChange?: (partnerId: string | null) => void
  onLocationChange?: (locationId: string | null) => void
}) {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(defaultPartnerId || '')
  const [selectedLocationId, setSelectedLocationId] = useState<string>(defaultLocationId || '')

  const locations = selectedPartnerId ? partnerLocations[selectedPartnerId] || [] : []

  function handlePartnerChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    setSelectedPartnerId(value)
    setSelectedLocationId('')
    onPartnerChange?.(value || null)
    onLocationChange?.(null)
  }

  function handleLocationChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    setSelectedLocationId(value)
    onLocationChange?.(value || null)
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-1">Referral Partner</label>
        <Select name="referral_partner_id" value={selectedPartnerId} onChange={handlePartnerChange}>
          <option value="">None</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({TYPE_LABELS[p.partner_type] || p.partner_type})
            </option>
          ))}
        </Select>
        <p className="text-xs text-stone-400 mt-1">Who referred this inquiry?</p>
      </div>

      {locations.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Partner Location</label>
          <Select
            name="partner_location_id"
            value={selectedLocationId}
            onChange={handleLocationChange}
          >
            <option value="">Not specified</option>
            {locations.map((loc) => {
              const cityState = [loc.city, loc.state].filter(Boolean).join(', ')
              return (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                  {cityState ? ` — ${cityState}` : ''}
                </option>
              )
            })}
          </Select>
          <p className="text-xs text-stone-400 mt-1">Which specific location?</p>
        </div>
      )}

      {/* Hidden input for location when no locations exist */}
      {locations.length === 0 && <input type="hidden" name="partner_location_id" value="" />}
    </div>
  )
}
