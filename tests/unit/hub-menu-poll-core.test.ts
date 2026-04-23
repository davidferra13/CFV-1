import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeHubPollVotes } from '@/lib/hub/menu-poll-core'

test('summarizeHubPollVotes ignores revoked votes and excludes opt-out from winning options', () => {
  const result = summarizeHubPollVotes({
    pollType: 'single_choice',
    viewerProfileId: 'guest-1',
    options: [
      { id: 'a', option_type: 'standard' },
      { id: 'b', option_type: 'standard' },
      { id: 'skip', option_type: 'opt_out' },
    ],
    votes: [
      { option_id: 'a', profile_id: 'guest-1', rank: null },
      { option_id: 'a', profile_id: 'guest-2', rank: null, revoked_at: '2026-04-22T10:00:00Z' },
      { option_id: 'b', profile_id: 'guest-3', rank: null },
      { option_id: 'skip', profile_id: 'guest-4', rank: null },
    ],
  })

  assert.equal(result.summary.participantCount, 3)
  assert.equal(result.summary.totalSelections, 3)
  assert.deepEqual(result.summary.winningOptionIds, ['a', 'b'])

  const optionA = result.options.find((option) => option.id === 'a')
  assert.equal(optionA?.vote_count, 1)
  assert.equal(optionA?.voted_by_me, true)
})

test('summarizeHubPollVotes applies ranked-choice score and rank display', () => {
  const result = summarizeHubPollVotes({
    pollType: 'ranked_choice',
    viewerProfileId: 'guest-1',
    options: [
      { id: 'a', option_type: 'standard' },
      { id: 'b', option_type: 'standard' },
      { id: 'c', option_type: 'standard' },
    ],
    votes: [
      { option_id: 'a', profile_id: 'guest-1', rank: 1 },
      { option_id: 'b', profile_id: 'guest-1', rank: 2 },
      { option_id: 'c', profile_id: 'guest-1', rank: 3 },
      { option_id: 'b', profile_id: 'guest-2', rank: 1 },
      { option_id: 'a', profile_id: 'guest-2', rank: 2 },
    ],
  })

  assert.deepEqual(result.summary.winningOptionIds, ['a', 'b'])

  const optionA = result.options.find((option) => option.id === 'a')
  const optionB = result.options.find((option) => option.id === 'b')

  assert.equal(optionA?.score, 5)
  assert.equal(optionA?.ranked_by_me, 1)
  assert.equal(optionB?.score, 5)
  assert.equal(optionB?.first_choice_count, 1)
})
