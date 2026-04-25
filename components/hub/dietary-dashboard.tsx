'use client'

import { useState, useEffect } from 'react'
import {
  getCircleHouseholdSummary,
  type HouseholdMember,
  type HouseholdDietarySummary,
} from '@/lib/hub/household-actions'

interface DietaryDashboardProps {
  groupId: string
  groupToken: string
  isChefOrAdmin: boolean
}

const SEVERITY_COLOR: Record<string, string> = {
  // Common severe allergies
  peanuts: 'bg-red-500/20 text-red-300 border-red-500/30',
  'tree nuts': 'bg-red-500/20 text-red-300 border-red-500/30',
  shellfish: 'bg-red-500/20 text-red-300 border-red-500/30',
  fish: 'bg-red-500/20 text-red-300 border-red-500/30',
  eggs: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  dairy: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  milk: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  soy: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  wheat: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  gluten: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  sesame: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
}

function allergyColor(allergy: string): string {
  const key = allergy.toLowerCase()
  return SEVERITY_COLOR[key] ?? 'bg-stone-700/50 text-stone-300 border-stone-600'
}

const AGE_EMOJI: Record<string, string> = {
  infant: '👶',
  toddler: '🧒',
  child: '👦',
  teen: '🧑',
  adult: '🧑',
}

const RELATIONSHIP_LABEL: Record<string, string> = {
  partner: 'Partner',
  spouse: 'Spouse',
  child: 'Child',
  parent: 'Parent',
  sibling: 'Sibling',
  assistant: 'Assistant',
  house_manager: 'House Manager',
  nanny: 'Nanny',
  other: 'Other',
}

export function DietaryDashboard({ groupId, groupToken, isChefOrAdmin }: DietaryDashboardProps) {
  const [summary, setSummary] = useState<HouseholdDietarySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!isChefOrAdmin) return
    getCircleHouseholdSummary(groupId, groupToken)
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [groupId, groupToken, isChefOrAdmin])

  if (!isChefOrAdmin) return null
  if (loading) {
    return (
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
        <div className="h-4 w-24 animate-pulse rounded bg-stone-800" />
      </div>
    )
  }
  if (
    !summary ||
    (summary.members.length === 0 &&
      summary.allAllergies.length === 0 &&
      summary.allDietary.length === 0 &&
      summary.profilesNotAnswered === 0)
  ) {
    return null
  }

  const hasAlerts = summary.allAllergies.length > 0
  const hasUnknowns = summary.profilesNotAnswered > 0

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-stone-300">Dietary Overview</span>
          {hasAlerts && (
            <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-medium text-red-300">
              {summary.allAllergies.length} allerg{summary.allAllergies.length !== 1 ? 'ies' : 'y'}
            </span>
          )}
          {hasUnknowns && (
            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
              {summary.profilesNotAnswered} not answered
            </span>
          )}
          {summary.allDietary.length > 0 && (
            <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-400">
              {summary.allDietary.length} restriction{summary.allDietary.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span className="text-[10px] text-stone-600">
          {expanded ? '▲' : '▼'} {summary.members.length} people
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Unknown allergy status - guests who never answered */}
          {hasUnknowns && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <p className="text-xs font-medium text-amber-300">
                {summary.profilesNotAnswered} guest{summary.profilesNotAnswered !== 1 ? 's' : ''}{' '}
                never answered the allergy question
              </p>
              <p className="mt-0.5 text-[10px] text-amber-400/70">
                Follow up before the event to confirm.
              </p>
            </div>
          )}

          {/* Allergy alerts (critical) */}
          {summary.allAllergies.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-red-400">
                Allergies (all members combined)
              </p>
              <div className="flex flex-wrap gap-1">
                {summary.allAllergies.map((a) => (
                  <span
                    key={a}
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${allergyColor(a)}`}
                  >
                    ⚠ {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dietary restrictions */}
          {summary.allDietary.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-emerald-400">
                Dietary restrictions
              </p>
              <div className="flex flex-wrap gap-1">
                {summary.allDietary.map((d) => (
                  <span
                    key={d}
                    className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs text-emerald-300"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Per-person breakdown */}
          {summary.members.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-stone-500">
                Household members
              </p>
              <div className="space-y-1.5">
                {summary.members.map((m) => (
                  <div key={m.id} className="rounded-lg bg-stone-800/50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {m.age_group ? (AGE_EMOJI[m.age_group] ?? '👤') : '👤'}
                      </span>
                      <span className="text-xs font-medium text-stone-200">{m.display_name}</span>
                      <span className="text-[10px] text-stone-500">
                        {RELATIONSHIP_LABEL[m.relationship] ?? m.relationship}
                        {m.age_group ? ` (${m.age_group})` : ''}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {m.allergies.map((a) => (
                        <span
                          key={a}
                          className={`rounded-full border px-1.5 py-0.5 text-[10px] ${allergyColor(a)}`}
                        >
                          ⚠ {a}
                        </span>
                      ))}
                      {m.dietary_restrictions.map((d) => (
                        <span
                          key={d}
                          className="rounded-full bg-emerald-900/40 px-1.5 py-0.5 text-[10px] text-emerald-300"
                        >
                          {d}
                        </span>
                      ))}
                      {m.dislikes.length > 0 && (
                        <span className="text-[10px] text-stone-500">
                          Dislikes: {m.dislikes.join(', ')}
                        </span>
                      )}
                      {m.favorites.length > 0 && (
                        <span className="text-[10px] text-stone-400">
                          Loves: {m.favorites.join(', ')}
                        </span>
                      )}
                    </div>
                    {m.notes && (
                      <p className="mt-0.5 text-[10px] text-stone-500 italic">{m.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary.profilesConfirmedNone > 0 && (
            <p className="text-[10px] text-emerald-600">
              {summary.profilesConfirmedNone} guest{summary.profilesConfirmedNone !== 1 ? 's' : ''}{' '}
              confirmed no allergies.
            </p>
          )}
          <p className="text-[10px] text-stone-600 italic">Chef only</p>
        </div>
      )}
    </div>
  )
}
