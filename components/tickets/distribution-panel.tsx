'use client'

import { useState, useTransition, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  getEventDistributions,
  createDistribution,
  updateDistributionStatus,
  removeDistribution,
} from '@/lib/tickets/distribution-actions'
import type { EventDistribution, DistributionPlatform } from '@/lib/tickets/types'

const PLATFORMS: { id: DistributionPlatform; label: string; icon: string; description: string }[] =
  [
    {
      id: 'eventbrite',
      label: 'Eventbrite',
      icon: '🎟️',
      description: 'Sync event and receive ticket orders',
    },
    {
      id: 'facebook',
      label: 'Facebook Events',
      icon: '📘',
      description: 'Publish as a Facebook Event',
    },
    {
      id: 'google',
      label: 'Google Events',
      icon: '🔍',
      description: 'Structured data for search visibility',
    },
    {
      id: 'instagram',
      label: 'Instagram',
      icon: '📸',
      description: 'Generate shareable event card',
    },
  ]

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-stone-700 text-stone-300',
  published: 'bg-emerald-900/50 text-emerald-300',
  synced: 'bg-blue-900/50 text-blue-300',
  failed: 'bg-red-900/50 text-red-300',
  archived: 'bg-stone-800 text-stone-500',
}

type Props = {
  eventId: string
  shareToken: string | null
}

export function DistributionPanel({ eventId, shareToken }: Props) {
  const [distributions, setDistributions] = useState<EventDistribution[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getEventDistributions(eventId)
      .then((data) => {
        setDistributions(data)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [eventId])

  const activeIds = new Set(distributions.map((d) => d.platform))
  const availablePlatforms = PLATFORMS.filter((p) => !activeIds.has(p.id))

  function handleAdd(platform: DistributionPlatform) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await createDistribution({ eventId, platform })
        if (!result.success) {
          setError(result.error || 'Failed to add platform')
          return
        }
        const updated = await getEventDistributions(eventId)
        setDistributions(updated)
      } catch (err: any) {
        setError(err.message || 'Failed to add platform')
      }
    })
  }

  function handlePublish(dist: EventDistribution) {
    setError(null)
    startTransition(async () => {
      try {
        // For google, it's auto-published via JSON-LD on the public page
        if (dist.platform === 'google') {
          const appUrl = window.location.origin
          const publicUrl = shareToken ? `${appUrl}/e/${shareToken}` : null
          await updateDistributionStatus({
            distributionId: dist.id,
            eventId,
            syncStatus: 'published',
            externalUrl: publicUrl || undefined,
          })
        } else if (dist.platform === 'instagram') {
          // Instagram: generate card image and mark as published
          await updateDistributionStatus({
            distributionId: dist.id,
            eventId,
            syncStatus: 'published',
          })
        } else {
          // Other platforms: mark as published (actual API push not yet implemented)
          await updateDistributionStatus({
            distributionId: dist.id,
            eventId,
            syncStatus: 'published',
          })
        }
        const updated = await getEventDistributions(eventId)
        setDistributions(updated)
      } catch (err: any) {
        setError(err.message || 'Failed to publish')
      }
    })
  }

  function handleDownloadCard() {
    const a = document.createElement('a')
    a.href = `/api/events/${eventId}/card`
    a.download = `event-card-${eventId}.png`
    a.click()
  }

  function handleRemove(dist: EventDistribution) {
    setError(null)
    startTransition(async () => {
      try {
        await removeDistribution({ distributionId: dist.id, eventId })
        setDistributions((prev) => prev.filter((d) => d.id !== dist.id))
      } catch (err: any) {
        setError(err.message || 'Failed to remove')
      }
    })
  }

  if (!loaded) return null

  return (
    <Card className="p-5">
      <h3 className="font-semibold text-white mb-1">Distribution</h3>
      <p className="text-xs text-stone-400 mb-4">
        Publish your event across platforms to reach more guests.
      </p>

      {error && (
        <div className="mb-3 rounded-lg bg-red-900/50 border border-red-700 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Active distributions */}
      {distributions.length > 0 && (
        <div className="space-y-2 mb-4">
          {distributions.map((dist) => {
            const platform = PLATFORMS.find((p) => p.id === dist.platform)
            return (
              <div
                key={dist.id}
                className="flex items-center justify-between rounded-lg border border-stone-700 bg-stone-800/30 p-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">{platform?.icon || '🔗'}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {platform?.label || dist.platform}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[dist.sync_status] || STATUS_COLORS.draft}`}
                      >
                        {dist.sync_status}
                      </span>
                    </div>
                    {dist.external_url && (
                      <a
                        href={dist.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline truncate block"
                      >
                        {dist.external_url}
                      </a>
                    )}
                    {dist.last_synced_at && (
                      <p className="text-xs text-stone-500">
                        Last synced: {new Date(dist.last_synced_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {dist.sync_status === 'draft' && (
                    <Button
                      variant="primary"
                      onClick={() => handlePublish(dist)}
                      disabled={isPending}
                      className="text-xs"
                    >
                      Publish
                    </Button>
                  )}
                  {dist.platform === 'instagram' && (
                    <Button
                      variant="ghost"
                      onClick={handleDownloadCard}
                      disabled={isPending}
                      className="text-xs"
                    >
                      Download Card
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => handleRemove(dist)}
                    disabled={isPending}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add platform buttons */}
      {availablePlatforms.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {availablePlatforms.map((p) => (
            <button
              key={p.id}
              onClick={() => handleAdd(p.id)}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg border border-dashed border-stone-700 p-3 text-left hover:border-stone-500 hover:bg-stone-800/30 transition-colors disabled:opacity-50"
            >
              <span className="text-lg">{p.icon}</span>
              <div>
                <p className="text-xs font-medium text-white">{p.label}</p>
                <p className="text-xs text-stone-500">{p.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {distributions.length === 0 && availablePlatforms.length === 0 && (
        <p className="text-sm text-stone-500">All platforms connected.</p>
      )}
    </Card>
  )
}
