// Recipe Compliance Dashboard
// Cross-location standardization tracking. Shows compliance scores
// per recipe per location with trend indicators.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getComplianceSummary } from '@/lib/locations/compliance-actions'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Recipe Compliance' }

function TrendBadge({ trend }: { trend: 'improving' | 'stable' | 'declining' }) {
  const config = {
    improving: { variant: 'success' as const, icon: '\u2191', label: 'Improving' },
    stable: { variant: 'default' as const, icon: '\u2192', label: 'Stable' },
    declining: { variant: 'error' as const, icon: '\u2193', label: 'Declining' },
  }
  const c = config[trend]
  return (
    <Badge variant={c.variant}>
      {c.icon} {c.label}
    </Badge>
  )
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 90 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-stone-500 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-stone-700">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className="text-xs text-stone-400 w-10 text-right">{score.toFixed(0)}%</span>
    </div>
  )
}

export default async function CompliancePage() {
  await requireChef()
  const summaries = await getComplianceSummary()

  // Group by location
  const byLocation = new Map<string, typeof summaries>()
  for (const s of summaries) {
    const existing = byLocation.get(s.locationId) ?? []
    existing.push(s)
    byLocation.set(s.locationId, existing)
  }

  // Overall stats
  const totalChecks = summaries.reduce((sum, s) => sum + s.totalChecks, 0)
  const avgScore =
    summaries.length > 0 ? summaries.reduce((sum, s) => sum + s.avgScore, 0) / summaries.length : 0
  const decliningCount = summaries.filter((s) => s.trend === 'declining').length

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/locations" className="text-stone-500 hover:text-stone-300 text-sm">
              Locations
            </Link>
            <span className="text-stone-600">/</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-100 mt-1">Recipe Compliance</h1>
          <p className="text-sm text-stone-500">
            Standardization tracking across all locations (last 30 days)
          </p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500 uppercase">Total Checks</p>
            <p className="mt-1 text-2xl font-bold text-stone-100">{totalChecks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500 uppercase">Avg Score</p>
            <p
              className={`mt-1 text-2xl font-bold ${avgScore >= 90 ? 'text-emerald-400' : avgScore >= 70 ? 'text-amber-400' : 'text-red-400'}`}
            >
              {avgScore.toFixed(0)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500 uppercase">Recipes Tracked</p>
            <p className="mt-1 text-2xl font-bold text-stone-100">
              {new Set(summaries.map((s) => s.recipeId)).size}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500 uppercase">Declining</p>
            <p
              className={`mt-1 text-2xl font-bold ${decliningCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}
            >
              {decliningCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* By Location */}
      {summaries.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold text-stone-200">No compliance checks recorded</h3>
            <p className="mt-2 text-sm text-stone-400">
              Record recipe compliance checks from individual location pages to start tracking
              standardization.
            </p>
          </CardContent>
        </Card>
      ) : (
        Array.from(byLocation.entries()).map(([locationId, locationSummaries]) => (
          <div key={locationId}>
            <h2 className="text-lg font-semibold text-stone-200 mb-3">
              {locationSummaries[0].locationName}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {locationSummaries.map((s) => (
                <Card key={`${s.recipeId}-${s.locationId}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-stone-200">{s.recipeName}</h3>
                        <p className="text-xs text-stone-500">{s.totalChecks} checks</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendBadge trend={s.trend} />
                        <span
                          className={`text-lg font-bold ${
                            s.avgScore >= 90
                              ? 'text-emerald-400'
                              : s.avgScore >= 70
                                ? 'text-amber-400'
                                : 'text-red-400'
                          }`}
                        >
                          {s.avgScore.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <ScoreBar score={s.portionRate} label="Portion" />
                      <ScoreBar score={s.methodRate} label="Method" />
                      <ScoreBar score={s.ingredientRate} label="Ingredients" />
                      <ScoreBar score={s.presentationRate} label="Presentation" />
                    </div>
                    {s.lastCheckDate && (
                      <p className="text-xs text-stone-500 pt-1 border-t border-stone-700/50">
                        Last checked: {s.lastCheckDate}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
