import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { getLaunchReadinessReport } from '@/lib/validation/launch-readiness'
import { applyLaunchReadinessOperatorReviews } from '@/lib/validation/launch-readiness-operator-review'

const REVIEWABLE_CHECK_KEYS = [
  'real_chef_two_weeks',
  'public_booking_test',
  'operator_survey',
  'operator_survey_signal',
  'onboarding_test',
  'acquisition_attribution',
] as const

export async function POST(request: NextRequest) {
  await requireAdmin()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 })
  }

  const records =
    body && typeof body === 'object' && Array.isArray((body as { records?: unknown }).records)
      ? (body as { records: unknown[] }).records
      : null

  if (!records) {
    return NextResponse.json(
      { success: false, error: 'records must be an array.' },
      { status: 400 }
    )
  }

  const report = await getLaunchReadinessReport()
  const review = applyLaunchReadinessOperatorReviews(report, records, {
    allowedCheckKeys: REVIEWABLE_CHECK_KEYS,
  })

  return NextResponse.json(
    {
      success: true,
      generatedAt: report.generatedAt,
      summary: review.summary,
      appliedDecisions: review.appliedDecisions,
      rejectedDecisions: review.rejectedDecisions,
      nextActions: review.report.nextActions,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
