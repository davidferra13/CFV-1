import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  analyzeWave1SurveyResponses,
  type Wave1SurveyAnalysisRecord,
} from '../../lib/beta-survey/analysis'
import { buildBetaSurveyAnswersWithMeta } from '../../lib/beta-survey/survey-utils'

const records: Wave1SurveyAnalysisRecord[] = [
  {
    id: 'a',
    submitted_at: '2026-04-01T12:00:00.000Z',
    source: 'warm outreach',
    channel: 'email',
    nps_score: 10,
    overall_satisfaction: 9,
    would_pay: true,
    answers: {
      interest: 'Very interested',
      biggest_objection: 'Pricing needs to be clear for my budget.',
      best_value: 'Automation would save time on follow-up reminders.',
    },
  },
  {
    id: 'b',
    submitted_at: '2026-04-01T12:05:00.000Z',
    source: 'warm outreach',
    channel: 'email',
    nps_score: 8,
    overall_satisfaction: 8,
    would_pay: 'yes',
    answers: buildBetaSurveyAnswersWithMeta(
      {
        qualification: 'Good fit',
        concern: 'I need client communication and payment workflow control.',
      },
      {
        source: 'ignored because top-level source wins',
        channel: 'ignored',
      }
    ),
  },
  {
    id: 'c',
    submitted_at: '2026-04-01T12:10:00.000Z',
    source: 'directory',
    channel: 'social',
    nps_score: 4,
    overall_satisfaction: 5,
    would_pay: false,
    answers: {
      qualification: 'Not interested',
      concern: 'Setup time and trust in accuracy are blockers.',
    },
  },
  {
    id: 'd',
    submitted_at: null,
    source: 'directory',
    channel: 'social',
    nps_score: 9,
    overall_satisfaction: 9,
    would_pay: true,
    answers: {
      interest: 'Very interested',
    },
  },
]

describe('Wave-1 beta survey analysis', () => {
  it('computes qualified counts from explicit and derived response signals', () => {
    const analysis = analyzeWave1SurveyResponses(records, {
      thresholds: {
        minSubmitted: 3,
        minQualified: 2,
        minWouldPayYes: 2,
        minAverageSatisfaction: 7,
        maxTopObjectionShare: 70,
      },
    })

    assert.deepEqual(analysis.counts, {
      total: 4,
      submitted: 3,
      qualified: 2,
      unqualified: 1,
      qualificationRate: 67,
      wouldPayYes: 2,
      wouldPayNo: 1,
      wouldPayUnknown: 0,
      averageNps: 7.3,
      npsScore: 0,
      averageSatisfaction: 7.3,
    })
  })

  it('ranks source and channel performance by qualified responses and rate', () => {
    const analysis = analyzeWave1SurveyResponses(records)

    assert.deepEqual(
      analysis.sourcePerformance.map((segment) => segment.key),
      ['warm_outreach', 'directory']
    )
    assert.equal(analysis.sourcePerformance[0].submitted, 2)
    assert.equal(analysis.sourcePerformance[0].qualified, 2)
    assert.equal(analysis.sourcePerformance[0].qualificationRate, 100)
    assert.deepEqual(
      analysis.channelPerformance.map((segment) => segment.key),
      ['email', 'social']
    )
  })

  it('extracts objections and positive themes from existing text fields without AI', () => {
    const analysis = analyzeWave1SurveyResponses(records)

    assert.deepEqual(
      analysis.objections.map((hit) => hit.key),
      ['price', 'time', 'trust']
    )
    assert.deepEqual(analysis.objections.find((hit) => hit.key === 'price')?.responseIds, ['a'])
    assert.deepEqual(
      analysis.themes.map((hit) => hit.key),
      ['automation', 'client_experience', 'ops_control', 'payments', 'time_savings']
    )
  })

  it('evaluates readiness thresholds and generates deterministic next actions', () => {
    const analysis = analyzeWave1SurveyResponses(records, {
      thresholds: {
        minSubmitted: 3,
        minQualified: 2,
        minQualificationRate: 60,
        minWouldPayYes: 2,
        minAverageSatisfaction: 7,
        minNpsScore: 0,
        maxTopObjectionShare: 40,
      },
    })

    assert.equal(analysis.readiness.status, 'ready')
    assert.equal(analysis.readiness.score, 100)
    assert.deepEqual(
      analysis.nextActions.map((action) => action.id),
      ['schedule-wave-1-pilot', 'double-down-best-source']
    )
  })

  it('fails closed on empty input with collect-more-responses as the first action', () => {
    const analysis = analyzeWave1SurveyResponses([])

    assert.equal(analysis.counts.total, 0)
    assert.equal(analysis.counts.submitted, 0)
    assert.equal(analysis.readiness.status, 'not_ready')
    assert.equal(analysis.nextActions[0].id, 'collect-more-responses')
  })
})
