export const LAUNCH_READINESS_EXPORT_CONTENT_TYPE = 'text/markdown; charset=utf-8'

export const LAUNCH_READINESS_EXPORT_REQUIRED_SECTIONS = [
  '# ChefFlow Launch Readiness Decision Packet',
  '## Required Checks',
  '## Next Evidence Actions',
  '## Evidence Log',
  '## Pilot Candidates',
] as const

export type LaunchReadinessExportDecision = 'ready_for_launch' | 'not_ready'

export type LaunchReadinessExportSummary = {
  status: string
  verifiedChecks: number
  totalChecks: number
  operatorReviewCount: number
  needsActionCount: number
  decision: string | null | undefined
}

export type LaunchReadinessExportContractInput = {
  generatedAt: string
  filename: string
  contentType: string
  markdown: string
  summary: LaunchReadinessExportSummary
}

export type LaunchReadinessExportContractResult =
  | {
      valid: true
      errors: []
    }
  | {
      valid: false
      errors: string[]
    }

export type LaunchReadinessExportMetadata = {
  filename: string
  contentType: typeof LAUNCH_READINESS_EXPORT_CONTENT_TYPE
}

function slugDate(iso: string): string {
  const date = iso.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : 'undated'
}

function markdownLines(markdown: string): string[] {
  return markdown.split(/\r?\n/).map((line) => line.trim())
}

function decisionLabel(decision: LaunchReadinessExportDecision): string {
  return decision === 'ready_for_launch' ? 'Ready for launch' : 'Not ready'
}

function isLaunchReadinessExportDecision(value: string): value is LaunchReadinessExportDecision {
  return value === 'ready_for_launch' || value === 'not_ready'
}

function countOperatorReviewStatusLines(lines: string[]): number {
  return lines.filter((line) => /^Status:\s*Operator review$/i.test(line)).length
}

export function buildLaunchReadinessExportMetadata(
  generatedAt: string
): LaunchReadinessExportMetadata {
  return {
    filename: `chefflow-launch-readiness-${slugDate(generatedAt)}.md`,
    contentType: LAUNCH_READINESS_EXPORT_CONTENT_TYPE,
  }
}

export function validateLaunchReadinessExportContract(
  input: LaunchReadinessExportContractInput
): LaunchReadinessExportContractResult {
  const errors: string[] = []
  const lines = markdownLines(input.markdown)
  const lineSet = new Set(lines)
  const expectedMetadata = buildLaunchReadinessExportMetadata(input.generatedAt)
  const decision = input.summary.decision?.trim() ?? ''
  const decisionLines = lines.filter((line) => line.startsWith('Decision:'))
  const operatorReviewStatusLines = countOperatorReviewStatusLines(lines)

  if (input.markdown.trim().length === 0) {
    errors.push('Markdown content is required.')
  }

  for (const section of LAUNCH_READINESS_EXPORT_REQUIRED_SECTIONS) {
    if (!lineSet.has(section)) {
      errors.push(`Missing required section: ${section}`)
    }
  }

  if (!decision) {
    errors.push('Summary decision is required.')
  } else if (!isLaunchReadinessExportDecision(decision)) {
    errors.push(`Summary decision is invalid: ${decision}`)
  }

  if (decisionLines.length !== 1) {
    errors.push('Markdown must include exactly one Decision line.')
  } else if (decisionLines[0] === 'Decision:') {
    errors.push('Markdown decision is required.')
  } else if (isLaunchReadinessExportDecision(decision)) {
    const expectedDecisionLine = `Decision: ${decisionLabel(decision)}`
    if (decisionLines[0] !== expectedDecisionLine) {
      errors.push(`Markdown decision line must be "${expectedDecisionLine}".`)
    }
  }

  if (input.summary.operatorReviewCount !== operatorReviewStatusLines) {
    errors.push('Operator review summary count must match markdown status lines.')
  }

  if (isLaunchReadinessExportDecision(decision) && decision === 'ready_for_launch') {
    if (input.summary.status !== 'ready') {
      errors.push('Ready export decision requires ready summary status.')
    }
    if (input.summary.operatorReviewCount > 0 || operatorReviewStatusLines > 0) {
      errors.push('Operator review checks cannot be exported as ready for launch.')
    }
    if (input.summary.needsActionCount > 0) {
      errors.push('Needs action checks cannot be exported as ready for launch.')
    }
    if (input.summary.verifiedChecks !== input.summary.totalChecks) {
      errors.push('Ready export decision requires every check to be verified.')
    }
  }

  if (
    input.summary.operatorReviewCount > 0 &&
    !input.markdown.includes('Operator review does not count as verified')
  ) {
    errors.push('Operator review exports must state that operator review is not verified.')
  }

  if (input.filename !== expectedMetadata.filename) {
    errors.push(`Filename must be stable: ${expectedMetadata.filename}`)
  }

  if (input.contentType !== expectedMetadata.contentType) {
    errors.push(`Content type must be stable: ${expectedMetadata.contentType}`)
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, errors: [] }
}
