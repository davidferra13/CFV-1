import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildChefLearningInsights,
  computeDishPerformanceMemory,
  computeEventOutcomeMetrics,
  computeEventSuccessScore,
} from '@/lib/post-event/learning-logic'

test('computeEventSuccessScore rewards clean execution and strong guest sentiment', () => {
  const score = computeEventSuccessScore({
    plannedDishCount: 4,
    matchedDishCount: 4,
    addedDishCount: 0,
    removedDishCount: 0,
    substitutedDishCount: 0,
    issueCount: 0,
    prepAccuracy: 'on_target',
    timeAccuracy: 'on_time',
    guestAvgOverall: 5,
    feedbackCount: 8,
    negativeFeedbackCount: 0,
  })

  assert.equal(score, 100)
})

test('computeEventOutcomeMetrics captures menu drift, issue volume, and guest signal', () => {
  const metrics = computeEventOutcomeMetrics({
    dishes: [
      {
        outcomeStatus: 'planned_served',
        wasServed: true,
        issueFlags: ['timing'],
        guestFeedbackCount: 2,
        positiveFeedbackCount: 2,
        negativeFeedbackCount: 0,
        neutralFeedbackCount: 0,
      },
      {
        outcomeStatus: 'removed',
        wasServed: false,
        issueFlags: [],
        guestFeedbackCount: 0,
        positiveFeedbackCount: 0,
        negativeFeedbackCount: 0,
        neutralFeedbackCount: 0,
      },
      {
        outcomeStatus: 'added',
        wasServed: true,
        issueFlags: ['complexity'],
        guestFeedbackCount: 2,
        positiveFeedbackCount: 1,
        negativeFeedbackCount: 1,
        neutralFeedbackCount: 0,
      },
    ],
    prepAccuracy: 'over',
    timeAccuracy: 'behind',
    guestOverallRatings: [5, 4],
    guestFoodRatings: [5, 4],
    guestExperienceRatings: [4, 3],
  })

  assert.equal(metrics.plannedDishCount, 2)
  assert.equal(metrics.actualDishCount, 2)
  assert.equal(metrics.matchedDishCount, 1)
  assert.equal(metrics.addedDishCount, 1)
  assert.equal(metrics.removedDishCount, 1)
  assert.equal(metrics.substitutedDishCount, 0)
  assert.equal(metrics.issueCount, 2)
  assert.equal(metrics.guestResponseCount, 2)
  assert.equal(metrics.guestAvgOverall, 4.5)
  assert.equal(metrics.guestAvgFood, 4.5)
  assert.equal(metrics.guestAvgExperience, 3.5)
  assert.equal(metrics.positiveFeedbackCount, 3)
  assert.equal(metrics.negativeFeedbackCount, 1)
  assert.equal(metrics.positiveFeedbackRate, 75)
  assert.equal(metrics.successScore, 58.7)
})

test('computeDishPerformanceMemory aggregates large-group and issue patterns', () => {
  const summary = computeDishPerformanceMemory([
    {
      outcomeStatus: 'planned_served',
      wasServed: true,
      groupSize: 14,
      issueFlags: ['timing', 'prep'],
      averageRating: 3,
      guestFeedbackCount: 2,
      positiveFeedbackCount: 1,
      negativeFeedbackCount: 1,
      neutralFeedbackCount: 0,
    },
    {
      outcomeStatus: 'removed',
      wasServed: false,
      groupSize: 8,
      issueFlags: ['timing'],
      averageRating: null,
      guestFeedbackCount: 0,
      positiveFeedbackCount: 0,
      negativeFeedbackCount: 0,
      neutralFeedbackCount: 0,
    },
    {
      outcomeStatus: 'planned_served',
      wasServed: true,
      groupSize: 16,
      issueFlags: ['complexity'],
      averageRating: 4,
      guestFeedbackCount: 1,
      positiveFeedbackCount: 1,
      negativeFeedbackCount: 0,
      neutralFeedbackCount: 0,
    },
  ])

  assert.equal(summary.selectionFrequency, 3)
  assert.equal(summary.servedCount, 2)
  assert.equal(summary.acceptanceRate, 66.67)
  assert.equal(summary.feedbackCount, 3)
  assert.equal(summary.averageRating, 3.5)
  assert.equal(summary.positiveFeedbackRate, 66.67)
  assert.deepEqual(summary.issueCounts, {
    timing: 2,
    prep: 1,
    complexity: 1,
  })
  assert.equal(summary.largeGroupServedCount, 2)
  assert.equal(summary.largeGroupIssueCount, 3)
  assert.equal(summary.largeGroupNegativeCount, 1)
})

test('buildChefLearningInsights emits actionable execution guidance', () => {
  const insights = buildChefLearningInsights({
    guestCount: 14,
    dishMemories: [
      {
        dishName: 'Short Rib',
        summary: {
          selectionFrequency: 3,
          servedCount: 3,
          acceptanceRate: 100,
          feedbackCount: 5,
          averageRating: 3.2,
          positiveFeedbackRate: 40,
          issueCounts: { timing: 1 },
          largeGroupServedCount: 3,
          largeGroupIssueCount: 2,
          largeGroupNegativeCount: 1,
        },
      },
      {
        dishName: 'Citrus Tart',
        summary: {
          selectionFrequency: 4,
          servedCount: 4,
          acceptanceRate: 100,
          feedbackCount: 8,
          averageRating: 4.8,
          positiveFeedbackRate: 100,
          issueCounts: {},
          largeGroupServedCount: 1,
          largeGroupIssueCount: 0,
          largeGroupNegativeCount: 0,
        },
      },
    ],
    menuPattern: {
      courseCount: 5,
      comparableEvents: 4,
      overTimeRate: 66,
      prepOverRate: 50,
      averageSuccessScore: 73,
    },
  })

  assert.deepEqual(insights, [
    'Short Rib underperforms in groups over 12 (2 large-group issues).',
    'Citrus Tart is a strong performer (4.8/5 across 4 selections).',
    '5+ dish menus go over time 66% of the time.',
    '5+ dish menus push prep over target 50% of the time.',
  ])
})
