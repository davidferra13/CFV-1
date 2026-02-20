// Chef Surveys Dashboard
// Displays all post-event surveys with response stats and individual responses.

import { requireChef } from '@/lib/auth/get-user'
import { getChefSurveys } from '@/lib/surveys/actions'
import { computeSurveyStats } from '@/lib/surveys/survey-utils'
import { Badge } from '@/components/ui/badge'

function StarDisplay({ value }: { value: number | null }) {
  if (value === null) return <span className="text-stone-400 text-sm">—</span>
  return (
    <span className="text-amber-500 font-semibold text-sm">
      {'★'.repeat(value)}
      {'☆'.repeat(5 - value)}
      <span className="ml-1 text-stone-600">{value}/5</span>
    </span>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <p className="text-xs text-stone-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-stone-900">{value}</p>
    </div>
  )
}

export default async function SurveysPage() {
  await requireChef()
  const surveys = await getChefSurveys()
  const stats = computeSurveyStats(surveys)

  const submittedSurveys = surveys.filter((s) => s.submitted_at !== null)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Client Surveys</h1>
        <p className="mt-1 text-stone-500">
          Post-event feedback collected automatically when events complete.
        </p>
      </div>

      {/* Stats */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard label="Surveys sent" value={stats.total} />
          <StatCard
            label="Response rate"
            value={
              stats.total > 0
                ? `${Math.round((stats.submitted / stats.total) * 100)}%`
                : '—'
            }
          />
          <StatCard
            label="Avg. overall"
            value={stats.averageOverall !== null ? `${stats.averageOverall} / 5` : '—'}
          />
          <StatCard
            label="Would book again"
            value={
              stats.submitted > 0
                ? `${Math.round((stats.wouldBookAgainYes / stats.submitted) * 100)}%`
                : '—'
            }
          />
        </div>
      )}

      {/* No surveys yet */}
      {surveys.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-stone-200">
          <div className="text-4xl mb-3">📋</div>
          <h2 className="text-lg font-semibold text-stone-900 mb-1">No surveys yet</h2>
          <p className="text-stone-500 max-w-sm mx-auto text-sm">
            A survey is automatically sent to clients when you mark an event as
            completed. Responses will appear here.
          </p>
        </div>
      )}

      {/* Survey list */}
      {surveys.length > 0 && (
        <div className="space-y-4">
          {surveys.map((survey) => {
            const clientName = survey.event?.client?.full_name ?? 'Unknown Client'
            const occasion = survey.event?.occasion ?? 'Untitled event'
            const isSubmitted = survey.submitted_at !== null

            return (
              <div
                key={survey.id}
                className="bg-white rounded-xl border border-stone-200 p-5"
              >
                {/* Row header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="font-medium text-stone-900">{clientName}</p>
                    <p className="text-sm text-stone-500">{occasion}</p>
                  </div>
                  <Badge variant={isSubmitted ? 'success' : 'default'}>
                    {isSubmitted ? 'Responded' : 'Pending'}
                  </Badge>
                </div>

                {isSubmitted ? (
                  <>
                    {/* Ratings grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      <div>
                        <p className="text-xs text-stone-400 mb-0.5">Overall</p>
                        <StarDisplay value={survey.overall_rating} />
                      </div>
                      <div>
                        <p className="text-xs text-stone-400 mb-0.5">Food</p>
                        <StarDisplay value={survey.food_quality_rating} />
                      </div>
                      <div>
                        <p className="text-xs text-stone-400 mb-0.5">Communication</p>
                        <StarDisplay value={survey.communication_rating} />
                      </div>
                      <div>
                        <p className="text-xs text-stone-400 mb-0.5">Value</p>
                        <StarDisplay value={survey.value_rating} />
                      </div>
                    </div>

                    {/* Would book again */}
                    {survey.would_book_again && (
                      <p className="text-sm text-stone-600 mb-2">
                        <span className="text-stone-400">Book again: </span>
                        <span className="capitalize font-medium text-stone-900">
                          {survey.would_book_again}
                        </span>
                      </p>
                    )}

                    {/* Highlight */}
                    {survey.highlight_text && (
                      <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-2">
                        <p className="text-xs text-amber-700 font-medium mb-0.5">Highlight</p>
                        <p className="text-sm text-stone-700">{survey.highlight_text}</p>
                      </div>
                    )}

                    {/* Testimonial consent badge */}
                    {survey.testimonial_consent && (
                      <p className="text-xs text-stone-400 mt-1">
                        ✓ Consented to testimonial display
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-stone-400">
                    Survey link sent — awaiting client response.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
