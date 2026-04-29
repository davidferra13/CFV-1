import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  summarizeOperatorSurveyReadiness,
  type OperatorSurveyReadinessSummary,
} from '../../lib/validation/operator-survey-readiness'

describe('summarizeOperatorSurveyReadiness', () => {
  it('marks survey proof missing before launch or responses exist', () => {
    const summary = summarizeOperatorSurveyReadiness({
      activeSurveys: 0,
      totalResponses: 0,
      submittedResponses: 0,
    })

    assert.deepEqual(pickStableFields(summary), {
      status: 'missing',
      href: '/admin/beta-surveys',
      evidence:
        '0 active surveys; 0 total responses; 0 submitted responses; no Wave-1 operator survey proof yet',
      nextStep: 'Launch the Wave-1 operator survey before using it as readiness proof.',
    })
  })

  it('marks launched when the survey exists but has no submitted responses', () => {
    const summary = summarizeOperatorSurveyReadiness({
      activeSurveys: 1,
      totalResponses: 0,
      submittedResponses: 0,
      launchedAt: '2026-04-29T15:00:00.000Z',
      href: '/admin/custom-surveys',
    })

    assert.deepEqual(pickStableFields(summary), {
      status: 'launched',
      href: '/admin/custom-surveys',
      evidence:
        '1 active survey; 0 total responses; 0 submitted responses; launched at 2026-04-29T15:00:00.000Z; survey is live but still needs submitted operator responses',
      nextStep:
        'Collect submitted operator responses before making launch decisions from the survey.',
    })
  })

  it('marks operator review when responses are submitted but not analyzed', () => {
    const summary = summarizeOperatorSurveyReadiness({
      activeSurveys: 1,
      totalResponses: 4,
      submittedResponses: 3,
      analyzedResponses: 0,
      lastResponseAt: '2026-04-29T18:30:00.000Z',
    })

    assert.equal(summary.status, 'operator_review')
    assert.equal(
      summary.evidence,
      '1 active survey; 4 total responses; 3 submitted responses; 0 analyzed responses; last response at 2026-04-29T18:30:00.000Z; submitted responses need operator analysis'
    )
    assert.equal(summary.nextStep, 'Review the submitted responses and record analyzed findings.')
  })

  it('marks verified when analyzed response proof exists', () => {
    const summary = summarizeOperatorSurveyReadiness({
      activeSurveys: 1,
      totalResponses: 5,
      submittedResponses: 5,
      analyzedResponses: 2,
    })

    assert.equal(summary.status, 'verified')
    assert.equal(
      summary.evidence,
      '1 active survey; 5 total responses; 5 submitted responses; 2 analyzed responses; analyzed operator survey proof is available'
    )
    assert.equal(
      summary.nextStep,
      'Use the analyzed operator findings to decide which launch claims and backlog items survive.'
    )
  })

  it('normalizes invalid and partial counts without inventing proof', () => {
    const summary = summarizeOperatorSurveyReadiness({
      activeSurveys: -2,
      totalResponses: 1.8,
      submittedResponses: Number.NaN,
      analyzedResponses: null,
      launchedAt: '  ',
    })

    assert.equal(summary.status, 'launched')
    assert.equal(
      summary.evidence,
      '0 active surveys; 1 total response; 0 submitted responses; survey is live but still needs submitted operator responses'
    )
  })
})

function pickStableFields(summary: OperatorSurveyReadinessSummary): OperatorSurveyReadinessSummary {
  return summary
}
