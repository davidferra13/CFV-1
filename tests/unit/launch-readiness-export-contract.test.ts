import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  LAUNCH_READINESS_EXPORT_CONTENT_TYPE,
  buildLaunchReadinessExportMetadata,
  validateLaunchReadinessExportContract,
  type LaunchReadinessExportContractInput,
} from '@/lib/validation/launch-readiness-export-contract'

const generatedAt = '2026-04-29T20:00:00.000Z'

function validMarkdown(decisionLine = 'Decision: Not ready'): string {
  return [
    '# ChefFlow Launch Readiness Decision Packet',
    '',
    `Generated: ${generatedAt}`,
    decisionLine,
    'Verified checks: 1/3',
    'Operator review: 1',
    'Needs action: 1',
    '',
    'Operator review does not count as verified. Treat this packet as evidence for a human launch decision, not as automatic approval.',
    '',
    '## Required Checks',
    '',
    '### Public booking tested by a non-developer',
    'Status: Operator review',
    'Evidence: 1 public booking inquiry exists',
    'Next step: Confirm the tester was not a developer.',
    '',
    '## Next Evidence Actions',
    '- Public booking tested by a non-developer: Confirm the tester was not a developer.',
    '',
    '## Evidence Log',
    '- Best pilot candidate: Pilot Chef: 5/6 system checks; source: chefs plus first-week activation evidence',
    '',
    '## Pilot Candidates',
    '- Pilot Chef: 5/6 system checks, 28 active-span days, 1 inquiries, 1 events, 1 feedback signals',
    '',
  ].join('\n')
}

function validReadyMarkdown(): string {
  return [
    '# ChefFlow Launch Readiness Decision Packet',
    '',
    `Generated: ${generatedAt}`,
    'Decision: Ready for launch',
    'Verified checks: 3/3',
    'Operator review: 0',
    'Needs action: 0',
    '',
    'Operator review does not count as verified. Treat this packet as evidence for a human launch decision, not as automatic approval.',
    '',
    '## Required Checks',
    '',
    '### Public booking tested by a non-developer',
    'Status: Verified',
    'Evidence: Non-developer proof verified',
    'Next step: Keep proof with launch evidence.',
    '',
    '## Next Evidence Actions',
    'No open launch evidence actions.',
    '',
    '## Evidence Log',
    '- Public booking tests: 1 test; source: open_booking_inquiries',
    '',
    '## Pilot Candidates',
    '- Pilot Chef: 6/6 system checks, 28 active-span days, 1 inquiries, 1 events, 1 feedback signals',
    '',
  ].join('\n')
}

function input(overrides: Partial<LaunchReadinessExportContractInput> = {}) {
  return {
    generatedAt,
    filename: 'chefflow-launch-readiness-2026-04-29.md',
    contentType: LAUNCH_READINESS_EXPORT_CONTENT_TYPE,
    markdown: validMarkdown(),
    summary: {
      status: 'blocked',
      verifiedChecks: 1,
      totalChecks: 3,
      operatorReviewCount: 1,
      needsActionCount: 1,
      decision: 'not_ready',
    },
    ...overrides,
  } satisfies LaunchReadinessExportContractInput
}

describe('launch readiness export contract', () => {
  it('accepts a blocked export packet with operator review called out', () => {
    const result = validateLaunchReadinessExportContract(input())

    assert.deepEqual(result, { valid: true, errors: [] })
  })

  it('accepts a ready export only when every check is verified', () => {
    const result = validateLaunchReadinessExportContract(
      input({
        markdown: validReadyMarkdown(),
        summary: {
          status: 'ready',
          verifiedChecks: 3,
          totalChecks: 3,
          operatorReviewCount: 0,
          needsActionCount: 0,
          decision: 'ready_for_launch',
        },
      })
    )

    assert.deepEqual(result, { valid: true, errors: [] })
  })

  it('rejects packets missing required sections', () => {
    const result = validateLaunchReadinessExportContract(
      input({
        markdown: validMarkdown().replace('\n## Evidence Log\n', '\n'),
      })
    )

    assert.equal(result.valid, false)
    assert.match(result.errors.join('\n'), /Missing required section: ## Evidence Log/)
  })

  it('rejects empty summary and markdown decisions', () => {
    const result = validateLaunchReadinessExportContract(
      input({
        markdown: validMarkdown('Decision:'),
        summary: {
          status: 'blocked',
          verifiedChecks: 1,
          totalChecks: 3,
          operatorReviewCount: 1,
          needsActionCount: 1,
          decision: '',
        },
      })
    )

    assert.equal(result.valid, false)
    assert.match(result.errors.join('\n'), /Summary decision is required/)
    assert.match(result.errors.join('\n'), /Markdown decision is required/)
  })

  it('rejects operator review as ready ambiguity', () => {
    const result = validateLaunchReadinessExportContract(
      input({
        markdown: validMarkdown('Decision: Ready for launch'),
        summary: {
          status: 'ready',
          verifiedChecks: 3,
          totalChecks: 3,
          operatorReviewCount: 1,
          needsActionCount: 0,
          decision: 'ready_for_launch',
        },
      })
    )

    assert.equal(result.valid, false)
    assert.match(result.errors.join('\n'), /Operator review checks cannot be exported as ready/)
  })

  it('rejects filename and content type drift', () => {
    const result = validateLaunchReadinessExportContract(
      input({
        filename: 'launch-readiness.md',
        contentType: 'text/plain',
      })
    )

    assert.equal(result.valid, false)
    assert.match(
      result.errors.join('\n'),
      /Filename must be stable: chefflow-launch-readiness-2026-04-29\.md/
    )
    assert.match(result.errors.join('\n'), /Content type must be stable: text\/markdown/)
  })

  it('builds stable export metadata from generated time', () => {
    assert.deepEqual(buildLaunchReadinessExportMetadata(generatedAt), {
      filename: 'chefflow-launch-readiness-2026-04-29.md',
      contentType: LAUNCH_READINESS_EXPORT_CONTENT_TYPE,
    })
  })
})
