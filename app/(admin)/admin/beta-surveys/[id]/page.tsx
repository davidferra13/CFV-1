// Admin Beta Survey Results - individual survey detail with aggregated stats,
// response table, invite management, and CSV export.

import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/db/admin'
import { getBetaSurveyResults, getBetaSurveyInvites } from '@/lib/beta-survey/actions'
import { formatSurveyTypeLabel, type SurveyQuestion } from '@/lib/beta-survey/survey-utils'
import type { Metadata } from 'next'
import Link from 'next/link'
import { SurveyResultsClient } from './results-client'

export const metadata: Metadata = { title: 'Form Dashboard - Admin' }

export default async function AdminBetaSurveyDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin()
  const db: any = createAdminClient()

  // Get the survey definition
  const { data: survey } = await (db as any)
    .from('beta_survey_definitions')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!survey) {
    return <div className="p-6 text-red-400">Survey not found.</div>
  }

  const questions = (survey.questions as unknown as SurveyQuestion[]) || []

  // Parallel fetch: results + invites
  const [resultsData, invites] = await Promise.all([
    getBetaSurveyResults(params.id),
    getBetaSurveyInvites(params.id),
  ])

  const { responses, stats } = resultsData
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/beta-surveys"
            className="text-sm text-slate-400 hover:text-slate-200 mb-2 inline-block"
          >
            &larr; Back to forms
          </Link>
          <h1 className="text-2xl font-bold text-white">{survey.title}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {formatSurveyTypeLabel(survey.survey_type)} &middot;{' '}
            {survey.is_active ? 'Active' : 'Inactive'} &middot; {questions.length} questions
          </p>
        </div>
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatChip
            label="Responses"
            value={`${stats.submitted}/${stats.total}`}
            color="bg-slate-700"
          />
          <StatChip
            label="Completion Rate"
            value={`${stats.completionRate}%`}
            color="bg-slate-700"
          />
          {stats.nps && (
            <StatChip
              label="NPS Score"
              value={stats.nps.score.toString()}
              color={
                stats.nps.score >= 50
                  ? 'bg-emerald-900'
                  : stats.nps.score >= 0
                    ? 'bg-amber-900'
                    : 'bg-red-900'
              }
            />
          )}
          {stats.avgSatisfaction !== null && (
            <StatChip
              label="Avg Satisfaction"
              value={`${stats.avgSatisfaction}/10`}
              color="bg-slate-700"
            />
          )}
          {stats.avgTechComfort !== null && (
            <StatChip
              label="Avg Tech Comfort"
              value={`${stats.avgTechComfort}/5`}
              color="bg-slate-700"
            />
          )}
          <StatChip
            label="Would Pay"
            value={`${stats.wouldPayYes} yes / ${stats.wouldPayNo} no`}
            color="bg-slate-700"
          />
        </div>
      )}

      {/* NPS Distribution */}
      {stats?.nps && (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-3">NPS Distribution</h3>
          <div className="flex h-6 rounded-full overflow-hidden">
            {stats.nps.detractors > 0 && (
              <div
                className="bg-red-600 flex items-center justify-center text-xs text-white font-medium"
                style={{
                  width: `${(stats.nps.detractors / (stats.nps.promoters + stats.nps.passives + stats.nps.detractors)) * 100}%`,
                }}
              >
                {stats.nps.detractors}
              </div>
            )}
            {stats.nps.passives > 0 && (
              <div
                className="bg-yellow-600 flex items-center justify-center text-xs text-white font-medium"
                style={{
                  width: `${(stats.nps.passives / (stats.nps.promoters + stats.nps.passives + stats.nps.detractors)) * 100}%`,
                }}
              >
                {stats.nps.passives}
              </div>
            )}
            {stats.nps.promoters > 0 && (
              <div
                className="bg-green-600 flex items-center justify-center text-xs text-white font-medium"
                style={{
                  width: `${(stats.nps.promoters / (stats.nps.promoters + stats.nps.passives + stats.nps.detractors)) * 100}%`,
                }}
              >
                {stats.nps.promoters}
              </div>
            )}
          </div>
          <div className="flex justify-between mt-1 text-xs text-slate-500">
            <span>Detractors (0-6)</span>
            <span>Passives (7-8)</span>
            <span>Promoters (9-10)</span>
          </div>
        </div>
      )}

      {/* Role breakdown */}
      {stats && Object.keys(stats.roleBreakdown).length > 0 && (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Respondents by Role</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.roleBreakdown).map(([role, count]) => (
              <span
                key={role}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-slate-700 text-slate-200"
              >
                {role}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Client component for interactive parts (export, invites, response table) */}
      <SurveyResultsClient
        surveyId={params.id}
        surveySlug={survey.slug}
        surveyType={survey.survey_type}
        responses={responses}
        invites={invites}
        appUrl={APP_URL}
        questions={questions}
      />
    </div>
  )
}

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`${color} rounded-lg p-3`}>
      <div className="text-xs text-slate-400 mb-0.5">{label}</div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  )
}
