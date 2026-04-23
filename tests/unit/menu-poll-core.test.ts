import test from 'node:test'
import assert from 'node:assert/strict'
import { getNextRank, summarizeHubPollVotes } from '@/lib/hub/menu-poll-core'

test('summarizeHubPollVotes scores ranked ballots against standard options only', () => {
  const result = summarizeHubPollVotes({
    pollType: 'ranked_choice',
    viewerProfileId: 'viewer-1',
    options: [
      { id: 'dish-a', option_type: 'standard' },
      { id: 'dish-b', option_type: 'standard' },
      { id: 'opt-out', option_type: 'opt_out' },
    ],
    votes: [
      { option_id: 'dish-a', profile_id: 'viewer-1', rank: 1 },
      { option_id: 'dish-b', profile_id: 'viewer-1', rank: 2 },
      { option_id: 'dish-b', profile_id: 'viewer-2', rank: 1 },
      { option_id: 'opt-out', profile_id: 'viewer-3', rank: null },
    ],
  })

  assert.equal(result.summary.participantCount, 3)
  assert.equal(result.summary.totalSelections, 4)
  assert.deepEqual(result.summary.winningOptionIds, ['dish-b'])

  const dishA = result.options.find((option) => option.id === 'dish-a')
  const dishB = result.options.find((option) => option.id === 'dish-b')
  const optOut = result.options.find((option) => option.id === 'opt-out')

  assert.equal(dishA?.score, 2)
  assert.equal(dishA?.first_choice_count, 1)
  assert.equal(dishA?.voted_by_me, true)
  assert.equal(dishA?.ranked_by_me, 1)

  assert.equal(dishB?.score, 3)
  assert.equal(dishB?.first_choice_count, 1)
  assert.equal(dishB?.ranked_by_me, 2)
  assert.equal(optOut?.score, 1)
})

test('getNextRank ignores revoked votes and gaps', () => {
  assert.equal(
    getNextRank([
      { rank: 1, revoked_at: null },
      { rank: 2, revoked_at: '2026-04-22T12:00:00.000Z' },
      { rank: 3, revoked_at: null },
    ]),
    4
  )
})
