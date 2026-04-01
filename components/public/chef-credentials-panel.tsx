// ChefCredentialsPanel - Public renderer for professional credentials.
// Shows work history, awards/accomplishments, portfolio proof, charity impact,
// and an optional resume-available note.
// All data is pre-fetched server-side and passed as props.
// This component renders nothing if there is no credential data.

import Link from 'next/link'
import { PortfolioShowcase } from '@/components/portfolio/portfolio-showcase'
import type { ChefWorkHistoryEntry, PublicCharityImpact } from '@/lib/credentials/actions'
import type { PublicPortfolioPhoto } from '@/lib/events/photo-actions'

const ACHIEVE_TYPE_LABELS: Record<string, string> = {
  competition: 'Competition',
  stage: 'Stage',
  trail: 'Trail',
  press_feature: 'Press Feature',
  award: 'Award',
  speaking: 'Speaking',
  certification: 'Certification',
  course: 'Course',
  book: 'Book',
  podcast: 'Podcast',
  other: 'Achievement',
}

type Achievement = {
  id: string
  achieve_type: string
  title: string
  organization: string | null
  achieve_date: string | null
  description: string | null
  outcome: string | null
  url: string | null
  image_url: string | null
  is_public: boolean
}

type Props = {
  workHistory: ChefWorkHistoryEntry[]
  achievements: Achievement[]
  portfolio: PublicPortfolioPhoto[]
  charityImpact: PublicCharityImpact
  showResumeNote: boolean
  chefName: string
}

function formatDateRange(
  startDate: string | null,
  endDate: string | null,
  isCurrent: boolean
): string {
  const fmt = (d: string) => {
    const date = new Date(`${d}T00:00:00`)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  if (!startDate && !endDate) return isCurrent ? 'Present' : ''
  if (startDate && isCurrent) return `${fmt(startDate)} - Present`
  if (startDate && endDate) return `${fmt(startDate)} - ${fmt(endDate)}`
  if (startDate) return fmt(startDate)
  if (endDate) return fmt(endDate)
  return ''
}

export function ChefCredentialsPanel({
  workHistory,
  achievements,
  portfolio,
  charityImpact,
  showResumeNote,
  chefName,
}: Props) {
  const hasWorkHistory = workHistory.length > 0
  const hasAchievements = achievements.length > 0
  const hasPortfolio = portfolio.length > 0
  const hasCharityData =
    charityImpact.totalHours > 0 ||
    charityImpact.publicCharityPercent !== null ||
    charityImpact.publicCharityNote

  const hasAnything =
    hasWorkHistory || hasAchievements || hasPortfolio || hasCharityData || showResumeNote

  if (!hasAnything) return null

  return (
    <div className="space-y-0">
      {/* Career Timeline */}
      {hasWorkHistory && (
        <section className="py-14 px-6 bg-stone-900/70">
          <div className="max-w-4xl mx-auto">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold text-stone-100">Career Highlights</h2>
              <p className="text-stone-400 mt-2 text-sm">
                Professional background and notable experience.
              </p>
            </div>

            <div className="space-y-6">
              {workHistory.map((entry, idx) => (
                <div key={entry.id} className="relative pl-6 border-l-2 border-stone-700">
                  {/* Timeline dot */}
                  <div
                    className={[
                      'absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2',
                      idx === 0 && entry.is_current
                        ? 'bg-emerald-500 border-emerald-400'
                        : 'bg-stone-700 border-stone-600',
                    ].join(' ')}
                  />

                  <div className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-stone-100 text-base">{entry.role_title}</p>
                        <p className="text-stone-300 text-sm mt-0.5">{entry.organization_name}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-stone-400">
                          {formatDateRange(entry.start_date, entry.end_date, entry.is_current)}
                        </p>
                        {entry.location_label && (
                          <p className="text-xs text-stone-500 mt-0.5">{entry.location_label}</p>
                        )}
                      </div>
                    </div>

                    {entry.summary && (
                      <p className="text-stone-400 text-sm mt-2 leading-relaxed">{entry.summary}</p>
                    )}

                    {entry.notable_credits.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {entry.notable_credits.map((credit, i) => (
                          <span
                            key={i}
                            className="text-xs px-2.5 py-1 rounded-full bg-stone-800 text-stone-300 border border-stone-700"
                          >
                            {credit}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Awards and Accomplishments */}
      {hasAchievements && (
        <section className="py-14 px-6 bg-stone-900/75">
          <div className="max-w-4xl mx-auto">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold text-stone-100">Awards and Accomplishments</h2>
              <p className="text-stone-400 mt-2 text-sm">
                Recognized milestones and professional achievements.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className="rounded-xl border border-stone-700 bg-stone-950/70 p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                        {ACHIEVE_TYPE_LABELS[ach.achieve_type] ?? 'Achievement'}
                      </span>
                      <p className="font-semibold text-stone-100 mt-1 text-sm leading-snug">
                        {ach.title}
                      </p>
                      {ach.organization && (
                        <p className="text-xs text-stone-400 mt-0.5">{ach.organization}</p>
                      )}
                    </div>
                    {ach.achieve_date && (
                      <p className="text-xs text-stone-500 flex-shrink-0">
                        {new Date(`${ach.achieve_date}T00:00:00`).getFullYear()}
                      </p>
                    )}
                  </div>

                  {ach.description && (
                    <p className="text-xs text-stone-400 mt-2 leading-relaxed line-clamp-3">
                      {ach.description}
                    </p>
                  )}

                  {ach.outcome && <p className="text-xs text-emerald-400 mt-1.5">{ach.outcome}</p>}

                  {ach.url && (
                    <a
                      href={ach.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 text-xs text-stone-500 hover:text-stone-300 underline inline-block transition-colors"
                    >
                      Learn more
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Portfolio Proof */}
      {hasPortfolio && (
        <section className="py-14 px-6 bg-stone-900/70">
          <div className="max-w-5xl mx-auto">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold text-stone-100">Portfolio</h2>
              <p className="text-stone-400 mt-2 text-sm">Selected work from past events.</p>
            </div>
            <PortfolioShowcase photos={portfolio} chefName={chefName} />
          </div>
        </section>
      )}

      {/* Community Impact */}
      {hasCharityData && (
        <section className="py-14 px-6 bg-stone-900/75">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-stone-100">Community Impact</h2>
              <p className="text-stone-400 mt-2 text-sm">
                {chefName}&apos;s commitment to giving back.
              </p>
            </div>

            <div className="rounded-xl border border-stone-700 bg-stone-950/70 p-6 space-y-5">
              {charityImpact.publicCharityPercent !== null && (
                <div className="text-center">
                  <p className="text-4xl font-bold text-emerald-400">
                    {charityImpact.publicCharityPercent}%
                  </p>
                  <p className="text-sm text-stone-400 mt-1">of revenue donated to charity</p>
                </div>
              )}

              {charityImpact.publicCharityNote && (
                <p className="text-stone-300 text-sm leading-relaxed text-center">
                  {charityImpact.publicCharityNote}
                </p>
              )}

              {charityImpact.totalHours > 0 && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 pt-2 border-t border-stone-800">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-stone-100">
                      {charityImpact.totalHours.toLocaleString()}
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">volunteer hours</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-stone-100">{charityImpact.uniqueOrgs}</p>
                    <p className="text-xs text-stone-400 mt-0.5">organizations served</p>
                  </div>
                  {charityImpact.verified501cOrgs > 0 && (
                    <div className="text-center col-span-2 sm:col-span-1">
                      <p className="text-2xl font-bold text-emerald-400">
                        {charityImpact.verified501cOrgs}
                      </p>
                      <p className="text-xs text-stone-400 mt-0.5">verified nonprofits</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Resume Availability Note */}
      {showResumeNote && (
        <section className="py-8 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-sm text-stone-400">
              Formal resume available upon request.{' '}
              <span className="text-stone-500">Contact {chefName} through the inquiry form.</span>
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
