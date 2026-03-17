// Admin Beta Surveys - list all survey definitions with response counts.

import { requireAdmin } from '@/lib/auth/admin'
import { getAllBetaSurveys } from '@/lib/beta-survey/actions'
import type { Metadata } from 'next'
import Link from 'next/link'
import { BetaSurveyListActions } from './list-actions'

export const metadata: Metadata = { title: 'Beta Surveys - Admin' }

export default async function AdminBetaSurveysPage() {
  await requireAdmin()

  const surveys = await getAllBetaSurveys()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Beta Surveys</h1>
        <p className="text-slate-400 text-sm mt-1">
          Pre-beta and post-beta surveys for gathering participant feedback.
        </p>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-slate-700 text-slate-200">
          {surveys.length} surveys
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-emerald-900 text-emerald-300">
          {surveys.reduce((sum, s) => sum + s.submittedResponses, 0)} total responses
        </span>
      </div>

      {/* Survey cards */}
      <div className="space-y-4">
        {surveys.map((survey) => (
          <div key={survey.id} className="bg-slate-800 rounded-lg border border-slate-700 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    href={`/admin/beta-surveys/${survey.id}`}
                    className="text-lg font-semibold text-white hover:text-brand-400 transition-colors"
                  >
                    {survey.title}
                  </Link>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      survey.is_active
                        ? 'bg-green-900 text-green-300'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {survey.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-700 text-slate-300">
                    {survey.survey_type === 'pre_beta' ? 'Pre-Beta' : 'Post-Beta'}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mb-3">{survey.description}</p>
                <div className="flex gap-4 text-sm text-slate-400">
                  <span>
                    <strong className="text-slate-200">{survey.submittedResponses}</strong>{' '}
                    submitted
                  </span>
                  <span>
                    <strong className="text-slate-200">{survey.totalResponses}</strong> total
                    started
                  </span>
                  <span>
                    <strong className="text-slate-200">{survey.questions.length}</strong> questions
                  </span>
                  <span>
                    Slug: <code className="text-slate-300">{survey.slug}</code>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <BetaSurveyListActions surveyId={survey.id} isActive={survey.is_active} />
                <Link
                  href={`/admin/beta-surveys/${survey.id}`}
                  className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                >
                  View Results
                </Link>
              </div>
            </div>
          </div>
        ))}

        {surveys.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No survey definitions found. Run the migration to seed the initial surveys.
          </div>
        )}
      </div>
    </div>
  )
}
