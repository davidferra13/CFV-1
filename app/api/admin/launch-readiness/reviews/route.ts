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

const ReviewInputSchema = z
  .object({
    checkKey: z.enum(LAUNCH_READINESS_REVIEWABLE_CHECK_KEYS),
    decision: z.enum(['verified', 'rejected']),
    note: z.string().trim().max(2000).optional().nullable(),
    evidenceUrl: z.string().trim().max(1000).optional().nullable(),
  })
  .superRefine((input, context) => {
    const hasNote = typeof input.note === 'string' && input.note.trim().length > 0
    const hasEvidenceUrl =
      typeof input.evidenceUrl === 'string' && input.evidenceUrl.trim().length > 0

    if (input.decision === 'verified' && !hasNote && !hasEvidenceUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['note'],
        message: 'Verified launch readiness reviews require a note or evidence link.',
      })
    }
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
    const message = parsed.error.issues[0]?.message ?? 'Invalid review input.'
    return NextResponse.json({ success: false, error: message }, { status: 400 })
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
