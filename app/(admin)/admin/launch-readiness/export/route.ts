import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { getLaunchReadinessReport } from '@/lib/validation/launch-readiness'
import { buildLaunchReadinessDecisionPacket } from '@/lib/validation/launch-readiness-decision-packet'

export async function GET() {
  await requireAdmin()
  const report = await getLaunchReadinessReport()
  const packet = buildLaunchReadinessDecisionPacket(report)

  return new NextResponse(packet.markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${packet.filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
