import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { getLaunchReadinessReport } from '@/lib/validation/launch-readiness'
import { buildLaunchReadinessDecisionPacket } from '@/lib/validation/launch-readiness-decision-packet'
import { buildLaunchReadinessRiskRegister } from '@/lib/validation/launch-readiness-risk-register'
import { createLaunchReadinessActivityEvent } from '@/lib/validation/launch-readiness-review-store'

export async function GET() {
  const admin = await requireAdmin()
  const report = await getLaunchReadinessReport()
  const packet = buildLaunchReadinessDecisionPacket(report)
  const riskRegister = buildLaunchReadinessRiskRegister({
    checks: report.checks,
    nextActions: report.nextActions,
  })

  try {
    await createLaunchReadinessActivityEvent({
      eventType: 'export_generated',
      actorUserId: admin.id,
      message: `Launch readiness JSON packet generated: ${packet.filename}.`,
      metadata: {
        filename: packet.filename,
        decision: packet.summary.decision,
      },
    })
  } catch (activityError) {
    console.warn('[non-blocking] Launch readiness JSON packet activity failed', activityError)
  }

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
      riskRegister,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
