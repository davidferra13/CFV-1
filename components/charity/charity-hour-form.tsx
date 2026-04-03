'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Clock, ExternalLink, MapPin, X } from '@/components/ui/icons'
import { StoreAutocomplete, type StorePlaceData } from '@/components/ui/store-autocomplete'
import { toast } from 'sonner'
import { logCharityHours, updateCharityHours } from '@/lib/charity/hours-actions'
import { getOrganizationLinks } from '@/lib/charity/organization-links'
import { searchNonprofits } from '@/lib/charity/propublica-actions'
import type { CharityHourEntry, CharityOrganization } from '@/lib/charity/hours-types'
import { NonprofitBadge } from './nonprofit-badge'

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
  const [orgName, setOrgName] = useState(editEntry?.organizationName ?? '')
  const [orgAddress, setOrgAddress] = useState(editEntry?.organizationAddress ?? '')
  const [googlePlaceId, setGooglePlaceId] = useState(editEntry?.googlePlaceId ?? '')
  const [ein, setEin] = useState(editEntry?.ein ?? '')
  const [organizationWebsiteUrl, setOrganizationWebsiteUrl] = useState(
    editEntry?.organizationWebsiteUrl ?? ''
  )
  const [isVerified, setIsVerified] = useState(editEntry?.isVerified501c ?? false)
  const [serviceDate, setServiceDate] = useState(
    editEntry?.serviceDate ?? new Date().toISOString().slice(0, 10)
  )
  const [hours, setHours] = useState(editEntry?.hours?.toString() ?? '')
  const [notes, setNotes] = useState(editEntry?.notes ?? '')
  const [manualMode, setManualMode] = useState(false)
  const [enriching, setEnriching] = useState(false)

  const selectedLinks = useMemo(
    () =>
      getOrganizationLinks({
        organizationName: orgName,
        organizationAddress: orgAddress || null,
        googlePlaceId: googlePlaceId || null,
        ein: ein || null,
        websiteUrl: organizationWebsiteUrl || null,
      }),
    [ein, googlePlaceId, orgAddress, orgName, organizationWebsiteUrl]
  )

  function resetForm() {
    setOrgName('')
    setOrgAddress('')
    setGooglePlaceId('')
    setEin('')
    setOrganizationWebsiteUrl('')
    setIsVerified(false)
    setServiceDate(new Date().toISOString().slice(0, 10))
    setHours('')
    setNotes('')
    setManualMode(false)
  }

  function extractState(address: string): string | undefined {
    const match = address.match(/,\s*([A-Z]{2})\s+\d{5}/)
    return match?.[1]
  }

  const enrichWithProPublica = useCallback(async (name: string, address: string) => {
    setEnriching(true)
    try {
      const state = extractState(address)
      const { results } = await searchNonprofits(name, state)
      if (results.length > 0) {
        const nameLower = name.toLowerCase()
        const match =
          results.find(
            (result) =>
              result.name.toLowerCase().includes(nameLower) ||
              nameLower.includes(result.name.toLowerCase())
          ) ?? results[0]
        setEin(match.ein)
        setIsVerified(true)
      }
    } catch {
      // Non-blocking.
    } finally {
      setEnriching(false)
    }
  }, [])

  function handlePlaceSelect(data: StorePlaceData) {
    setOrgName(data.name)
    setOrgAddress(data.address)
    setGooglePlaceId(data.place_id ?? '')
    setManualMode(false)
    setEin('')
    setIsVerified(false)
    if (data.name && data.address) enrichWithProPublica(data.name, data.address)
  }

  function handleRecentOrgClick(org: CharityOrganization) {
    setOrgName(org.organizationName)
    setOrgAddress(org.organizationAddress ?? '')
    setGooglePlaceId(org.googlePlaceId ?? '')
    setEin(org.ein ?? '')
    setOrganizationWebsiteUrl(org.websiteUrl ?? '')
    setIsVerified(org.isVerified501c)
    setManualMode(false)
  }

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
    setOrganizationWebsiteUrl('')
    setIsVerified(true)
    setManualMode(false)
  }

  if (typeof window !== 'undefined') {
    ;(window as any).__charityHourFormFill = handleNonprofitSelect
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsedHours = parseFloat(hours)
    if (!orgName.trim() || isNaN(parsedHours) || parsedHours <= 0) {
      toast.error('Add an organization and hours before saving.')
      return
    }

    startTransition(async () => {
      try {
        const input = {
          organizationName: orgName.trim(),
          organizationAddress: orgAddress.trim() || undefined,
          googlePlaceId: googlePlaceId || undefined,
          ein: ein || undefined,
          organizationWebsiteUrl: organizationWebsiteUrl.trim() || undefined,
          isVerified501c: isVerified,
          serviceDate,
          hours: parsedHours,
          notes: notes.trim() || undefined,
        }

        if (mode === 'edit' && editEntry) {
          await updateCharityHours({ ...input, id: editEntry.id })
          toast.success('Volunteer entry updated.')
        } else {
          await logCharityHours(input)
          toast.success('Volunteer hours logged.')
          resetForm()
        }
        onDone?.()
      } catch {
        toast.error(mode === 'edit' ? 'Failed to update entry.' : 'Failed to log hours.')
      }
    })
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium text-stone-300">
          <Clock className="h-4 w-4" />
          {mode === 'edit' ? 'Edit volunteer entry' : 'Log volunteer hours'}
        </h2>
        {mode === 'edit' && onDone && (
          <button
            type="button"
            onClick={onDone}
            className="text-stone-500 transition-colors hover:text-stone-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {recentOrgs.length > 0 && mode === 'create' && (
        <div className="mb-4 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-500">
            Recently used organizations
          </p>
          <div className="flex flex-wrap gap-2">
            {recentOrgs.slice(0, 6).map((org) => (
              <button
                key={org.id ?? org.organizationName}
                type="button"
                onClick={() => handleRecentOrgClick(org)}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-700 bg-stone-900 px-3 py-1 text-xs text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100"
              >
                <span>{org.organizationName}</span>
                <span className="text-stone-500">{org.totalHours}h</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs text-stone-500">Organization</label>
          {manualMode ? (
            <div className="flex gap-2">
              <Input
                value={orgName}
                onChange={(event) => setOrgName(event.target.value)}
                placeholder="Organization name"
                required
              />
              <button
                type="button"
                onClick={() => setManualMode(false)}
                className="whitespace-nowrap text-xs text-stone-500 transition-colors hover:text-stone-300"
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
                placeholder="Search for a pantry, shelter, nonprofit, or community kitchen"
              />
              <button
                type="button"
                onClick={() => setManualMode(true)}
                className="mt-1 text-xs text-stone-600 transition-colors hover:text-stone-400"
              >
                Can&apos;t find it? Enter it manually
              </button>
            </div>
          )}

          {(orgAddress || isVerified || selectedLinks.websiteUrl || selectedLinks.mapsUrl) && (
            <div className="mt-2 rounded-xl border border-stone-800 bg-stone-950/60 p-3">
              <div className="flex flex-wrap items-center gap-2">
                {orgAddress && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-stone-400">
                    <MapPin className="h-3 w-3 text-stone-600" />
                    {orgAddress}
                  </span>
                )}
                <NonprofitBadge verified={isVerified} />
                {enriching && (
                  <span className="text-xs text-stone-500">Verifying nonprofit status...</span>
                )}
              </div>

              {(selectedLinks.websiteUrl ||
                selectedLinks.mapsUrl ||
                selectedLinks.verificationUrl) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedLinks.websiteUrl && (
                    <a
                      href={selectedLinks.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-stone-700 px-2.5 py-1 text-[11px] text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100"
                    >
                      Website <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {selectedLinks.mapsUrl && (
                    <a
                      href={selectedLinks.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-stone-700 px-2.5 py-1 text-[11px] text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100"
                    >
                      Maps <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {selectedLinks.verificationUrl && (
                    <a
                      href={selectedLinks.verificationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-stone-700 px-2.5 py-1 text-[11px] text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100"
                    >
                      Verification <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs text-stone-500">
            Organization website (optional)
          </label>
          <Input
            type="url"
            value={organizationWebsiteUrl}
            onChange={(event) => setOrganizationWebsiteUrl(event.target.value)}
            placeholder="https://example.org"
          />
          <p className="mt-1 text-xs text-stone-600">
            Add a direct link if you want people to be able to jump straight to this organization.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-stone-500">Date</label>
            <Input
              type="date"
              value={serviceDate}
              onChange={(event) => setServiceDate(event.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-500">Hours</label>
            <Input
              type="number"
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              placeholder="e.g. 4.5"
              step="0.25"
              min="0.25"
              max="24"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-stone-500">What happened? (optional)</label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Cooked meals, sorted donations, ran pantry setup, supported a scheduled event..."
            className="w-full resize-none rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
            rows={3}
            maxLength={2000}
          />
        </div>

        <Button type="submit" disabled={pending} loading={pending}>
          {mode === 'edit' ? 'Update volunteer entry' : 'Save volunteer entry'}
        </Button>
      </form>
    </Card>
  )
}
