import { revalidatePath } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/admin'
import {
  LAUNCH_READINESS_REVIEWABLE_CHECK_KEYS,
  type LaunchReadinessOperatorReviewDecision,
} from '@/lib/validation/launch-readiness-operator-review'
import {
  createLaunchReadinessOperatorReview,
  listLaunchReadinessOperatorReviews,
} from '@/lib/validation/launch-readiness-review-store'

const ReviewInputSchema = z.object({
  checkKey: z.enum(LAUNCH_READINESS_REVIEWABLE_CHECK_KEYS),
  decision: z.enum(['verified', 'rejected']),
  note: z.string().trim().max(2000).optional().nullable(),
  evidenceUrl: z.string().trim().max(1000).optional().nullable(),
})

export async function GET() {
  await requireAdmin()

  try {
    const reviews = await listLaunchReadinessOperatorReviews()
    return NextResponse.json(
      { success: true, reviews },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error('[launch-readiness] review list failed', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load launch readiness reviews.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 })
  }

  const parsed = ReviewInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid review input.' }, { status: 400 })
  }

  try {
    const review = await createLaunchReadinessOperatorReview({
      checkKey: parsed.data.checkKey,
      decision: parsed.data.decision as LaunchReadinessOperatorReviewDecision,
      reviewerUserId: admin.id,
      note: parsed.data.note,
      evidenceUrl: parsed.data.evidenceUrl,
    })

    revalidatePath('/admin/launch-readiness')
    return NextResponse.json(
      { success: true, review },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error('[launch-readiness] review insert failed', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save launch readiness review.' },
      { status: 500 }
    )
  }
}
