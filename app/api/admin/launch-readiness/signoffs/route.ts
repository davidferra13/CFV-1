import { revalidatePath } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/admin'
import { getLaunchReadinessReport } from '@/lib/validation/launch-readiness'
import { buildLaunchReadinessDecisionPacket } from '@/lib/validation/launch-readiness-decision-packet'
import {
  createLaunchReadinessActivityEvent,
  createLaunchReadinessSignoff,
  listLaunchReadinessSignoffs,
} from '@/lib/validation/launch-readiness-review-store'

const SignoffInputSchema = z.object({
  note: z.string().trim().max(2000).optional().nullable(),
})

export async function GET() {
  await requireAdmin()

  try {
    const signoffs = await listLaunchReadinessSignoffs()
    return NextResponse.json(
      { success: true, signoffs },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error('[launch-readiness] signoff list failed', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load launch readiness signoffs.' },
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

  const parsed = SignoffInputSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid signoff input.'
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }

  try {
    const report = await getLaunchReadinessReport()
    if (report.status !== 'ready' || report.verifiedChecks !== report.totalChecks) {
      return NextResponse.json(
        {
          success: false,
          error: 'Launch readiness sign-off requires every check to be verified.',
        },
        { status: 409 }
      )
    }

    const packet = buildLaunchReadinessDecisionPacket(report)
    const signoff = await createLaunchReadinessSignoff({
      signoffUserId: admin.id,
      generatedAt: report.generatedAt,
      verifiedChecks: report.verifiedChecks,
      totalChecks: report.totalChecks,
      packet,
      note: parsed.data.note,
    })

    try {
      await createLaunchReadinessActivityEvent({
        eventType: 'signoff_created',
        actorUserId: admin.id,
        message: `Final launch sign-off recorded for ${report.verifiedChecks}/${report.totalChecks} verified checks.`,
        metadata: {
          signoffId: signoff.id,
          packetFilename: signoff.packetFilename,
          packetSha256: signoff.packetSha256,
        },
      })
    } catch (activityError) {
      console.warn('[non-blocking] Launch readiness signoff activity failed', activityError)
    }

    revalidatePath('/admin/launch-readiness')
    return NextResponse.json(
      { success: true, signoff },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error('[launch-readiness] signoff insert failed', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save launch readiness sign-off.' },
      { status: 500 }
    )
  }
}
