'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { batchGeocode } from '@/lib/prospecting/pipeline-actions'
import type { GeoCluster } from '@/lib/prospecting/types'
import {
  MapPin,
  Building2,
  User,
  Phone,
  Mail,
  ChevronDown,
  ChevronRight,
  Loader2,
  Globe,
  Target,
} from '@/components/ui/icons'

interface GeoClusterViewProps {
  clusters: GeoCluster[]
}

export function GeoClusterView({ clusters }: GeoClusterViewProps) {
  const [expandedRegion, setExpandedRegion] = useState<string | null>(clusters[0]?.region ?? null)
  const [isPending, startTransition] = useTransition()
  const [geocodeResult, setGeocodeResult] = useState<string | null>(null)

  const totalProspects = clusters.reduce((sum, c) => sum + c.count, 0)
  const totalRegions = clusters.length

  function handleBatchGeocode() {
    setGeocodeResult(null)
    startTransition(async () => {
      try {
        const result = await batchGeocode()
        setGeocodeResult(`Geocoded ${result.geocoded} of ${result.total} prospects`)
      } catch (err) {
        setGeocodeResult(err instanceof Error ? err.message : 'Geocoding failed')
      }
    })
  }

  if (clusters.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MapPin className="h-12 w-12 text-stone-600 mx-auto mb-3" />
          <p className="text-lg font-medium text-stone-400">No geographic clusters yet</p>
          <p className="text-sm text-stone-500 mt-1">
            Run an AI scrub to start building your prospect database.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6 text-sm text-stone-400">
          <span>
            {totalProspects} prospects across {totalRegions} regions
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleBatchGeocode} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Geocoding...
              </>
            ) : (
              <>
                <Globe className="h-4 w-4 mr-1" />
                Geocode Addresses
              </>
            )}
          </Button>
          {geocodeResult && <span className="text-xs text-stone-400">{geocodeResult}</span>}
        </div>
      </div>

      {/* Cluster cards */}
      <div className="space-y-3">
        {clusters.map((cluster) => {
          const isExpanded = expandedRegion === cluster.region
          const topProspects = cluster.prospects.slice(0, 3)
          const hasMore = cluster.prospects.length > 3

          return (
            <Card key={cluster.region} className="overflow-hidden">
              {/* Region header — clickable */}
              <button
                type="button"
                onClick={() => setExpandedRegion(isExpanded ? null : cluster.region)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-800/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-brand-500" />
                  <div>
                    <span className="text-sm font-semibold text-stone-100">{cluster.region}</span>
                    <span className="text-xs text-stone-500 ml-2">
                      {cluster.count} prospect{cluster.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Score range */}
                  {cluster.prospects.length > 0 && (
                    <span className="text-xs text-stone-500">
                      Scores: {Math.min(...cluster.prospects.map((p) => p.lead_score))}–
                      {Math.max(...cluster.prospects.map((p) => p.lead_score))}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-stone-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-stone-500" />
                  )}
                </div>
              </button>

              {/* Expanded view — all prospects in this cluster */}
              {isExpanded && (
                <div className="border-t border-stone-800">
                  {/* Quick preview chips */}
                  {!isExpanded && topProspects.length > 0 && (
                    <div className="px-4 py-2 flex flex-wrap gap-1">
                      {topProspects.map((p) => (
                        <Badge key={p.id} variant="default" className="text-[10px]">
                          {p.name}
                        </Badge>
                      ))}
                      {hasMore && (
                        <Badge variant="default" className="text-[10px]">
                          +{cluster.prospects.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Full prospect list */}
                  <div className="divide-y divide-stone-800">
                    {cluster.prospects.map((prospect) => (
                      <div
                        key={prospect.id}
                        className="px-4 py-3 flex items-center justify-between hover:bg-stone-800/30"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {prospect.prospect_type === 'individual' ? (
                            <User className="h-4 w-4 text-stone-400 flex-shrink-0" />
                          ) : (
                            <Building2 className="h-4 w-4 text-stone-400 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <Link
                              href={`/prospecting/${prospect.id}`}
                              className="text-sm font-medium text-stone-100 hover:underline truncate block"
                            >
                              {prospect.name}
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5">
                              {prospect.city && (
                                <span className="text-xs text-stone-500">
                                  {[prospect.city, prospect.state].filter(Boolean).join(', ')}
                                </span>
                              )}
                              {prospect.category && (
                                <span className="text-[10px] text-stone-600">
                                  {prospect.category.replace(/_/g, ' ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* Lead score */}
                          <span
                            className={`inline-block min-w-[1.75rem] text-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                              prospect.lead_score >= 70
                                ? 'bg-green-950 text-green-400'
                                : prospect.lead_score >= 40
                                  ? 'bg-amber-950 text-amber-400'
                                  : 'bg-stone-800 text-stone-500'
                            }`}
                          >
                            {prospect.lead_score}
                          </span>

                          {/* Contact icons */}
                          <div className="flex items-center gap-1">
                            {prospect.phone && (
                              <a
                                href={`tel:${prospect.phone}`}
                                className="text-brand-600 hover:text-brand-400"
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </a>
                            )}
                            {prospect.email && (
                              <a
                                href={`mailto:${prospect.email}`}
                                className="text-brand-600 hover:text-brand-400"
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>

                          <Link href={`/prospecting/${prospect.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Route planning hint */}
                  <div className="px-4 py-2 bg-stone-800/30 border-t border-stone-800">
                    <p className="text-xs text-stone-500 flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      Plan a {cluster.region} outreach day — {cluster.count} prospects in one area
                    </p>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
