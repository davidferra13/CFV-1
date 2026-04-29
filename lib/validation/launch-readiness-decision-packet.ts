import type { LaunchReadinessReport } from '@/lib/validation/launch-readiness'

export type LaunchReadinessDecisionPacket = {
  filename: string
  markdown: string
  summary: {
    status: LaunchReadinessReport['status']
    verifiedChecks: number
    totalChecks: number
    operatorReviewCount: number
    needsActionCount: number
    decision: 'ready_for_launch' | 'not_ready'
  }
}

function slugDate(iso: string): string {
  const date = iso.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : 'undated'
}

function line(value: string): string {
  return value.replace(/\r?\n/g, ' ').trim()
}

function statusLabel(status: string): string {
  if (status === 'verified') return 'Verified'
  if (status === 'operator_review') return 'Operator review'
  if (status === 'needs_action') return 'Needs action'
  return status
}

export function buildLaunchReadinessDecisionPacket(
  report: LaunchReadinessReport
): LaunchReadinessDecisionPacket {
  const operatorReviewCount = report.checks.filter(
    (check) => check.status === 'operator_review'
  ).length
  const needsActionCount = report.checks.filter((check) => check.status === 'needs_action').length
  const decision = report.status === 'ready' ? 'ready_for_launch' : 'not_ready'
  const markdown: string[] = [
    '# ChefFlow Launch Readiness Decision Packet',
    '',
    `Generated: ${report.generatedAt}`,
    `Decision: ${decision === 'ready_for_launch' ? 'Ready for launch' : 'Not ready'}`,
    `Verified checks: ${report.verifiedChecks}/${report.totalChecks}`,
    `Operator review: ${operatorReviewCount}`,
    `Needs action: ${needsActionCount}`,
    '',
    'Operator review does not count as verified. Treat this packet as evidence for a human launch decision, not as automatic approval.',
    '',
    '## Required Checks',
  ]

  for (const check of report.checks) {
    markdown.push(
      '',
      `### ${check.label}`,
      `Status: ${statusLabel(check.status)}`,
      `Evidence: ${line(check.evidence)}`,
      `Next step: ${line(check.nextStep)}`
    )

    if (check.evidenceItems.length > 0) {
      markdown.push('', 'Evidence items:')
      for (const item of check.evidenceItems) {
        const href = item.href ? ` (${item.href})` : ''
        markdown.push(`- ${item.label}: ${line(item.value)}; source: ${line(item.source)}${href}`)
      }
    }
  }

  markdown.push('', '## Next Evidence Actions')
  if (report.nextActions.length === 0) {
    markdown.push('', 'No open launch evidence actions.')
  } else {
    for (const action of report.nextActions) {
      const href = action.href ? ` (${action.href})` : ''
      markdown.push(`- ${action.label}: ${line(action.reason)}${href}`)
    }
  }

  markdown.push('', '## Evidence Log')
  for (const item of report.evidenceLog) {
    const href = item.href ? ` (${item.href})` : ''
    markdown.push(`- ${item.label}: ${line(item.value)}; source: ${line(item.source)}${href}`)
  }

  markdown.push('', '## Pilot Candidates')
  if (report.pilotCandidates.length === 0) {
    markdown.push('', 'No pilot candidates found.')
  } else {
    for (const candidate of report.pilotCandidates.slice(0, 10)) {
      markdown.push(
        `- ${candidate.chefName}: ${candidate.completedSystemSteps}/${candidate.totalSystemSteps} system checks, ${candidate.activeSpanDays} active-span days, ${candidate.evidence.inquiries} inquiries, ${candidate.evidence.events} events, ${candidate.evidence.feedbackSignals} feedback signals`
      )
    }
  }

  markdown.push('')

  return {
    filename: `chefflow-launch-readiness-${slugDate(report.generatedAt)}.md`,
    markdown: markdown.join('\n'),
    summary: {
      status: report.status,
      verifiedChecks: report.verifiedChecks,
      totalChecks: report.totalChecks,
      operatorReviewCount,
      needsActionCount,
      decision,
    },
  }
}
