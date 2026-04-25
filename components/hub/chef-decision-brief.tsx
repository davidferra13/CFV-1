'use client'

import { useState, useEffect } from 'react'
import { getChefDecisionBrief, type ChefDecisionBrief } from '@/lib/hub/chef-decision-brief-actions'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface ChefDecisionBriefPanelProps {
  eventId: string
  tenantId: string
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function ChefDecisionBriefPanel({ eventId, tenantId }: ChefDecisionBriefPanelProps) {
  const [brief, setBrief] = useState<ChefDecisionBrief | null>(null)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    let cancelled = false

    getChefDecisionBrief(eventId, tenantId).then((result) => {
      if (!cancelled) setBrief(result)
    })

    return () => {
      cancelled = true
    }
  }, [eventId, tenantId])

  if (!brief) return null

  const hasDietaryAlerts =
    brief.dietarySummary.allergies.length > 0 || brief.dietarySummary.restrictions.length > 0

  return (
    <Card className="bg-stone-900 border border-stone-700 text-stone-100 p-6">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={expanded}
      >
        <h2 className="text-xl font-semibold">Circle Brief: {brief.circleName}</h2>
        <svg
          className={`h-5 w-5 flex-shrink-0 text-stone-300 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {expanded && (
        <div className="mt-5 space-y-5">
          <p className="text-sm text-stone-200">
            {brief.confirmedCount} guests confirmed ({brief.guestCount} invited)
          </p>

          {hasDietaryAlerts && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-amber-400">Dietary Alerts</h3>
              {brief.dietarySummary.allergies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {brief.dietarySummary.allergies.map((allergy) => (
                    <Badge key={allergy} className="bg-red-500/20 text-red-300 ring-red-500/30">
                      {allergy}
                    </Badge>
                  ))}
                </div>
              )}
              {brief.dietarySummary.restrictions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {brief.dietarySummary.restrictions.map((restriction) => (
                    <Badge
                      key={restriction}
                      className="bg-amber-500/20 text-amber-300 ring-amber-500/30"
                    >
                      {restriction}
                    </Badge>
                  ))}
                </div>
              )}
              {brief.dietarySummary.guestsNoData > 0 && (
                <p className="text-sm text-amber-500">
                  {brief.dietarySummary.guestsNoData} guests have not submitted dietary info
                </p>
              )}
            </section>
          )}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-stone-200">Menu Decisions</h3>
            <div className="space-y-3">
              {brief.menuDecisions.map((course) => (
                <div
                  key={`${course.courseNumber}-${course.courseName}`}
                  className="space-y-1 border-t border-stone-800 pt-3 first:border-t-0 first:pt-0"
                >
                  <p className="text-sm font-medium text-stone-200">
                    Course {course.courseNumber}: {course.courseName}
                  </p>
                  {course.lockedDish ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm text-stone-300">
                      <span>{course.lockedDish}</span>
                      <Badge variant="success">LOCKED</Badge>
                    </div>
                  ) : course.topChoice ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm text-stone-300">
                      <span>
                        Voting ({course.topChoice} leads, {course.voteCount} votes)
                      </span>
                      <Badge variant="warning">VOTING</Badge>
                    </div>
                  ) : (
                    <p className="text-sm text-stone-600">Not published yet</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {brief.lastCircleActivity && (
            <p className="text-sm text-stone-500">
              Last circle activity: {relativeTime(brief.lastCircleActivity)}
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
