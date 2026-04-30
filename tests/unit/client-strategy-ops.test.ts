import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  projectClientStrategyOperationalState,
  type ClientStrategyScheduledMessageRow,
  type ClientStrategyTodoRow,
} from '@/lib/clients/client-strategy-ops'
import {
  buildStrategyOutcomeNote,
  buildStrategyRecommendationNote,
  buildStrategyReplyNote,
} from '@/lib/clients/client-strategy-note'

function todo(overrides: Partial<ClientStrategyTodoRow>): ClientStrategyTodoRow {
  return {
    id: 'todo_1',
    text: 'Strategy task',
    completed: false,
    completed_at: null,
    created_at: '2026-04-01T00:00:00.000Z',
    notes: null,
    ...overrides,
  }
}

function scheduledMessage(
  overrides: Partial<ClientStrategyScheduledMessageRow>
): ClientStrategyScheduledMessageRow {
  return {
    id: 'message_1',
    status: 'scheduled',
    body: null,
    scheduled_for: '2026-04-02T00:00:00.000Z',
    sent_at: null,
    created_at: '2026-04-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('projectClientStrategyOperationalState', () => {
  it('projects reminders, reply reviews, messages, and outcomes into status records', () => {
    const state = projectClientStrategyOperationalState({
      clientId: 'client_1',
      todos: [
        todo({
          id: 'todo_reminder',
          notes: buildStrategyRecommendationNote('complete-client-profile'),
        }),
        todo({
          id: 'todo_reply',
          notes: `${buildStrategyReplyNote('complete-client-profile')}\nReply: confirmed`,
        }),
        todo({
          id: 'todo_outcome',
          completed: true,
          completed_at: '2026-04-03T00:00:00.000Z',
          notes: `${buildStrategyOutcomeNote('complete-client-profile')}\nOutcome: profile_updated`,
        }),
      ],
      scheduledMessages: [
        scheduledMessage({
          id: 'message_strategy',
          body: buildStrategyRecommendationNote('complete-client-profile'),
        }),
      ],
    })

    const [status] = state.statuses
    assert.equal(status.recommendationId, 'complete-client-profile')
    assert.equal(status.status, 'done')
    assert.deepEqual(status.taskIds, ['todo_reminder'])
    assert.deepEqual(status.replyReviewTaskIds, ['todo_reply'])
    assert.deepEqual(status.scheduledMessageIds, ['message_strategy'])
    assert.equal(status.outcomes[0].outcome, 'profile_updated')
    assert.equal(state.diff.completedRecommendationIds.includes('complete-client-profile'), true)
    assert.equal(state.timeline.length, 4)
  })

  it('keeps wrong recommendations separate from completed outcomes', () => {
    const state = projectClientStrategyOperationalState({
      clientId: 'client_1',
      todos: [
        todo({
          id: 'todo_wrong',
          completed: true,
          notes: `${buildStrategyOutcomeNote('review-menu-fit-from-known-history')}\nOutcome: wrong_recommendation`,
        }),
      ],
      scheduledMessages: [],
    })

    assert.equal(state.statuses[0].status, 'wrong_recommendation')
    assert.deepEqual(state.diff.completedRecommendationIds, [])
    assert.deepEqual(state.diff.wrongRecommendationIds, ['review-menu-fit-from-known-history'])
  })
})
