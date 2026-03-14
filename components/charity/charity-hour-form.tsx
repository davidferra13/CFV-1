'use client'

import { useState, useTransition, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StoreAutocomplete, type StorePlaceData } from '@/components/ui/store-autocomplete'
import { NonprofitBadge } from './nonprofit-badge'
import { logCharityHours, updateCharityHours } from '@/lib/charity/hours-actions'
import { searchNonprofits } from '@/lib/charity/propublica-actions'
import type { CharityHourEntry, CharityOrganization } from '@/lib/charity/hours-types'
import { toast } from 'sonner'
import { Clock, MapPin, X } from '@/components/ui/icons'

type FormMode = 'create' | 'edit'

export function CharityHourForm({
  recentOrgs,
  editEntry,
  onDone,
}: {
  recentOrgs: CharityOrganization[]
  editEntry?: CharityHourEntry | null
  onDone?: () => void
}) {
  const mode: FormMode = editEntry ? 'edit' : 'create'
  const [pending, startTransition] = useTransition()

  // Form state
  const [orgName, setOrgName] = useState(editEntry?.organizationName ?? '')
  const [orgAddress, setOrgAddress] = useState(editEntry?.organizationAddress ?? '')
  const [googlePlaceId, setGooglePlaceId] = useState(editEntry?.googlePlaceId ?? '')
  const [ein, setEin] = useState(editEntry?.ein ?? '')
  const [isVerified, setIsVerified] = useState(editEntry?.isVerified501c ?? false)
  const [serviceDate, setServiceDate] = useState(
    editEntry?.serviceDate ?? new Date().toISOString().slice(0, 10)
  )
  const [hours, setHours] = useState(editEntry?.hours?.toString() ?? '')
  const [notes, setNotes] = useState(editEntry?.notes ?? '')
  const [manualMode, setManualMode] = useState(false)

  // ProPublica enrichment
  const [enriching, setEnriching] = useState(false)

  function resetForm() {
    setOrgName('')
    setOrgAddress('')
    setGooglePlaceId('')
    setEin('')
    setIsVerified(false)
    setServiceDate(new Date().toISOString().slice(0, 10))
    setHours('')
    setNotes('')
    setManualMode(false)
  }

  // Extract state abbreviation from address for ProPublica search
  function extractState(address: string): string | undefined {
    const match = address.match(/,\s*([A-Z]{2})\s+\d{5}/)
    return match?.[1]
  }

  // After Google Places selection, try to verify via ProPublica
  const enrichWithProPublica = useCallback(async (name: string, address: string) => {
    setEnriching(true)
    try {
      const state = extractState(address)
      const { results } = await searchNonprofits(name, state)
      if (results.length > 0) {
        // Find best match (exact or close name match)
        const nameLower = name.toLowerCase()
        const match =
          results.find(
            (r) =>
              r.name.toLowerCase().includes(nameLower) || nameLower.includes(r.name.toLowerCase())
          ) ?? results[0]
        setEin(match.ein)
        setIsVerified(true)
      }
    } catch {
      // Non-blocking — form works without ProPublica
    } finally {
      setEnriching(false)
    }
  }, [])

  function handlePlaceSelect(data: StorePlaceData) {
    setOrgName(data.name)
    setOrgAddress(data.address)
    setGooglePlaceId(data.place_id ?? '')
    setManualMode(false)
    // Reset previous verification
    setEin('')
    setIsVerified(false)
    // Try ProPublica enrichment
    if (data.name && data.address) {
      enrichWithProPublica(data.name, data.address)
    }
  }

  function handleRecentOrgClick(org: CharityOrganization) {
    setOrgName(org.organizationName)
    setOrgAddress(org.organizationAddress ?? '')
    setGooglePlaceId(org.googlePlaceId ?? '')
    setEin(org.ein ?? '')
    setIsVerified(org.isVerified501c)
    setManualMode(false)
  }

  /** Fill form from the nonprofit search panel */
  function handleNonprofitSelect(nonprofit: {
    name: string
    city: string
    state: string
    ein: string
  }) {
    setOrgName(nonprofit.name)
    setOrgAddress(`${nonprofit.city}, ${nonprofit.state}`)
    setGooglePlaceId('')
    setEin(nonprofit.ein)
    setIsVerified(true)
    setManualMode(false)
  }

  // Expose the fill function to parent via ref or callback
  // We use a global event approach for simplicity
  if (typeof window !== 'undefined') {
    ;(window as any).__charityHourFormFill = handleNonprofitSelect
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsedHours = parseFloat(hours)
    if (!orgName.trim() || isNaN(parsedHours) || parsedHours <= 0) {
      toast.error('Please fill in the organization and hours')
      return
    }

    startTransition(async () => {
      try {
        const input = {
          organizationName: orgName.trim(),
          organizationAddress: orgAddress.trim() || undefined,
          googlePlaceId: googlePlaceId || undefined,
          ein: ein || undefined,
          isVerified501c: isVerified,
          serviceDate,
          hours: parsedHours,
          notes: notes.trim() || undefined,
        }

        if (mode === 'edit' && editEntry) {
          await updateCharityHours({ ...input, id: editEntry.id })
          toast.success('Hours updated')
        } else {
          await logCharityHours(input)
          toast.success('Charity hours logged!')
          resetForm()
        }
        onDone?.()
      } catch (err) {
        toast.error(mode === 'edit' ? 'Failed to update' : 'Failed to log hours')
      }
    })
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-stone-300 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {mode === 'edit' ? 'Edit Hours' : 'Log Charity Hours'}
        </h2>
        {mode === 'edit' && onDone && (
          <button onClick={onDone} className="text-stone-500 hover:text-stone-300">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Recent orgs chips */}
      {recentOrgs.length > 0 && mode === 'create' && (
        <div className="flex flex-wrap gap-2 mb-3">
          {recentOrgs.slice(0, 6).map((org) => (
            <button
              key={org.organizationName}
              type="button"
              onClick={() => handleRecentOrgClick(org)}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-stone-100 transition-colors"
            >
              {org.isVerified501c && <span className="text-emerald-500">✓</span>}
              {org.organizationName}
              <span className="text-stone-500 ml-1">{org.totalHours}h</span>
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Organization search */}
        <div>
          <label className="text-xs text-stone-500 mb-1 block">Organization</label>
          {manualMode ? (
            <div className="flex gap-2">
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Organization name"
                required
              />
              <button
                type="button"
                onClick={() => setManualMode(false)}
                className="text-xs text-stone-500 hover:text-stone-300 whitespace-nowrap"
              >
                Search instead
              </button>
            </div>
          ) : (
            <div>
              <StoreAutocomplete
                value={orgName}
                onChange={setOrgName}
                onPlaceSelect={handlePlaceSelect}
                placeholder="Search for a food bank, shelter, nonprofit..."
              />
              <button
                type="button"
                onClick={() => setManualMode(true)}
                className="text-xs text-stone-600 hover:text-stone-400 mt-1"
              >
                Can&apos;t find it? Enter manually
              </button>
            </div>
          )}
          {orgAddress && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <MapPin className="w-3 h-3 text-stone-600" />
              <span className="text-xs text-stone-500">{orgAddress}</span>
              <NonprofitBadge verified={isVerified} />
              {enriching && <span className="text-xs text-stone-600">Verifying...</span>}
            </div>
          )}
        </div>

        {/* Date + Hours side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-stone-500 mb-1 block">Date</label>
            <Input
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>
          <div>
            <label className="text-xs text-stone-500 mb-1 block">Hours</label>
            <Input
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="e.g. 4.5"
              step="0.25"
              min="0.25"
              max="24"
              required
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-stone-500 mb-1 block">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you do? (sorted donations, cooked meals, etc.)"
            className="w-full rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            rows={2}
            maxLength={2000}
          />
        </div>

        <Button type="submit" disabled={pending} loading={pending}>
          {mode === 'edit' ? 'Update Hours' : 'Log Hours'}
        </Button>
      </form>
    </Card>
  )
}
