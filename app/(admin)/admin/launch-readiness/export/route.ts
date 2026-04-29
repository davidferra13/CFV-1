import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { getLaunchReadinessReport } from '@/lib/validation/launch-readiness'
import { buildLaunchReadinessDecisionPacket } from '@/lib/validation/launch-readiness-decision-packet'
import { createLaunchReadinessActivityEvent } from '@/lib/validation/launch-readiness-review-store'

export async function GET() {
  const admin = await requireAdmin()
  const report = await getLaunchReadinessReport()
  const packet = buildLaunchReadinessDecisionPacket(report)

  try {
    await createLaunchReadinessActivityEvent({
      eventType: 'export_generated',
      actorUserId: admin.id,
      message: `Launch readiness export generated: ${packet.filename}.`,
      metadata: {
        filename: packet.filename,
        decision: packet.summary.decision,
      },
    })
  } catch (activityError) {
    console.warn('[non-blocking] Launch readiness export activity failed', activityError)
  }

  return new NextResponse(packet.markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${packet.filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
