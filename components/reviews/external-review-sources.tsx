'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import {
  type ExternalReviewSourceSummary,
  createExternalReviewSource,
  deleteExternalReviewSource,
  syncAllExternalReviewSourcesForChef,
  syncExternalReviewSourceNow,
  toggleExternalReviewSource,
} from '@/lib/reviews/external-actions'

type Provider = 'google_places' | 'website_jsonld'

function providerLabel(provider: Provider) {
  if (provider === 'google_places') return 'Google Places API'
  return 'Website JSON-LD'
}

function formatDateTime(value: string | null) {
  if (!value) return 'Never'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Never'
  return parsed.toLocaleString()
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function getUrlCount(value: unknown) {
  if (!Array.isArray(value)) return 0
  return value.filter((item) => typeof item === 'string' && item.trim().length > 0).length
}

export function ExternalReviewSources({ sources }: { sources: ExternalReviewSourceSummary[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [provider, setProvider] = useState<Provider>('google_places')
  const [label, setLabel] = useState('')
  const [placeId, setPlaceId] = useState('')
  const [placeUrl, setPlaceUrl] = useState('')
  const [websiteUrls, setWebsiteUrls] = useState('')
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState('360')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const activeSources = useMemo(() => sources.filter((source) => source.active), [sources])

  function clearForm() {
    setLabel('')
    setPlaceId('')
    setPlaceUrl('')
    setWebsiteUrls('')
    setSyncIntervalMinutes('360')
  }

  function handleCreateSource(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    startTransition(async () => {
      try {
        const interval = Number(syncIntervalMinutes)
        if (!Number.isFinite(interval) || interval < 15) {
          throw new Error('Sync interval must be at least 15 minutes')
        }

        if (provider === 'google_places') {
          await createExternalReviewSource({
            provider,
            label,
            place_id: placeId,
            place_url: placeUrl,
            active: true,
            sync_interval_minutes: Math.floor(interval),
          })
        } else {
          const urls = websiteUrls
            .split(/\r?\n/)
            .map((url) => url.trim())
            .filter(Boolean)

          await createExternalReviewSource({
            provider,
            label,
            urls,
            active: true,
            sync_interval_minutes: Math.floor(interval),
          })
        }

        clearForm()
        setInfo('Source created successfully.')
        router.refresh()
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Failed to create source')
      }
    })
  }

  function handleSyncAll() {
    setError(null)
    setInfo(null)

    startTransition(async () => {
      try {
        const result = await syncAllExternalReviewSourcesForChef()
        setInfo(`Sync finished. Pulled ${result.pulled} reviews, upserted ${result.upserted}.`)
        router.refresh()
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Failed to sync sources')
      }
    })
  }

  function handleSyncOne(sourceId: string) {
    setError(null)
    setInfo(null)

    startTransition(async () => {
      try {
        const result = await syncExternalReviewSourceNow(sourceId)
        if (result.error) {
          setError(result.error)
        } else {
          setInfo(`Source synced. Pulled ${result.pulled}, upserted ${result.upserted}.`)
        }
        router.refresh()
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Failed to sync source')
      }
    })
  }

  function handleToggle(sourceId: string, nextActive: boolean) {
    setError(null)
    setInfo(null)

    startTransition(async () => {
      try {
        await toggleExternalReviewSource(sourceId, nextActive)
        setInfo(nextActive ? 'Source resumed.' : 'Source paused.')
        router.refresh()
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : 'Failed to update source status'
        )
      }
    })
  }

  function handleDelete(sourceId: string) {
    setError(null)
    setInfo(null)

    startTransition(async () => {
      try {
        await deleteExternalReviewSource(sourceId)
        setInfo('Source removed.')
        router.refresh()
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Failed to delete source')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>External Review Sync</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="info">
          Uses official API pulls and owned-site schema parsing. Direct scraping of third-party
          sites is intentionally not used.
        </Alert>

        {error && <Alert variant="error">{error}</Alert>}
        {info && <Alert variant="success">{info}</Alert>}

        <div className="rounded-lg border border-stone-700 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-stone-100">Configured Sources</p>
              <p className="text-xs text-stone-500 mt-1">
                {activeSources.length} active of {sources.length} total
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSyncAll}
              loading={isPending}
              disabled={activeSources.length === 0}
            >
              Sync All Now
            </Button>
          </div>

          {sources.length === 0 ? (
            <p className="text-sm text-stone-500 mt-4">
              No external review sources configured yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {sources.map((source) => {
                const placeIdForDisplay = getString(source.config.place_id)
                const urlsForDisplay = getUrlCount(source.config.urls)

                return (
                  <div
                    key={source.id}
                    className="rounded-lg border border-stone-700 px-3 py-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-stone-100">{source.label}</p>
                        <Badge variant={source.active ? 'success' : 'default'}>
                          {source.active ? 'Active' : 'Paused'}
                        </Badge>
                        <Badge variant="default">
                          {providerLabel(source.provider as Provider)}
                        </Badge>
                      </div>

                      <p className="text-xs text-stone-500 mt-1">
                        Sync every {source.syncIntervalMinutes} minutes
                      </p>

                      {source.provider === 'google_places' && placeIdForDisplay && (
                        <p className="text-xs text-stone-500 mt-1">Place ID: {placeIdForDisplay}</p>
                      )}

                      {source.provider === 'website_jsonld' && (
                        <p className="text-xs text-stone-500 mt-1">
                          Tracked URLs: {urlsForDisplay}
                        </p>
                      )}

                      <p className="text-xs text-stone-400 mt-1">
                        Last synced: {formatDateTime(source.lastSyncedAt)}
                      </p>

                      {source.lastError && (
                        <p className="text-xs text-red-600 mt-1">Last error: {source.lastError}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSyncOne(source.id)}
                        loading={isPending}
                      >
                        Sync
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleToggle(source.id, !source.active)}
                        disabled={isPending}
                      >
                        {source.active ? 'Pause' : 'Resume'}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(source.id)}
                        disabled={isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <form
          onSubmit={handleCreateSource}
          className="rounded-lg border border-stone-700 p-4 space-y-3"
        >
          <p className="text-sm font-medium text-stone-100">Add Source</p>

          <Select
            label="Provider"
            value={provider}
            onChange={(event) => setProvider(event.target.value as Provider)}
            options={[
              { value: 'google_places', label: 'Google Places API' },
              { value: 'website_jsonld', label: 'Website JSON-LD' },
            ]}
            required
          />

          <Input
            label="Source Label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Google Business Profile"
            required
          />

          <Input
            label="Sync Interval (minutes)"
            type="number"
            min={15}
            value={syncIntervalMinutes}
            onChange={(event) => setSyncIntervalMinutes(event.target.value)}
            required
          />

          {provider === 'google_places' ? (
            <>
              <Input
                label="Google Place ID"
                value={placeId}
                onChange={(event) => setPlaceId(event.target.value)}
                placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
                required
                helperText="Requires GOOGLE_PLACES_API_KEY in environment settings."
              />
              <Input
                label="Fallback Google URL (optional)"
                type="url"
                value={placeUrl}
                onChange={(event) => setPlaceUrl(event.target.value)}
                placeholder="https://maps.google.com/..."
              />
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">
                Website URLs (one per line)
              </label>
              <Textarea
                value={websiteUrls}
                onChange={(event) => setWebsiteUrls(event.target.value)}
                rows={4}
                required
                placeholder="https://dfprivatechef.com/reviews&#10;https://dfprivatechef.com/testimonials"
              />
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={isPending}>
              Add Source
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
