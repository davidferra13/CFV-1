import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { getLaunchReadinessReport } from '@/lib/validation/launch-readiness'
import { buildLaunchReadinessDecisionPacket } from '@/lib/validation/launch-readiness-decision-packet'

export async function GET() {
  await requireAdmin()
  const report = await getLaunchReadinessReport()
  const packet = buildLaunchReadinessDecisionPacket(report)

  return NextResponse.json(
    {
      generatedAt: report.generatedAt,
      summary: packet.summary,
      filename: packet.filename,
      markdown: packet.markdown,
      checks: report.checks.map((check) => ({
        key: check.key,
        label: check.label,
        status: check.status,
        evidence: check.evidence,
        nextStep: check.nextStep,
        href: check.href,
      })),
      nextActions: report.nextActions,
      evidenceLog: report.evidenceLog,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
