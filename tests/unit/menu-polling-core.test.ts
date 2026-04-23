import test from 'node:test'
import assert from 'node:assert/strict'
import {
  aggregateMenuPollOptions,
  buildDefaultLockSelections,
  pickLeadingMenuPollOption,
} from '@/lib/hub/menu-polling-core'

test('aggregateMenuPollOptions computes ranked scores and ignores opt-out for winner selection', () => {
  const aggregated = aggregateMenuPollOptions({
    pollType: 'ranked_choice',
    options: [
      { id: 'app-1', label: 'Citrus crudo', optionType: 'standard' },
      { id: 'app-2', label: 'Spring tart', optionType: 'standard' },
      { id: 'opt-out', label: 'Skip course', optionType: 'opt_out' },
    ],
    votes: [
      { optionId: 'app-1', profileId: 'guest-1', rank: 1 },
      { optionId: 'app-2', profileId: 'guest-1', rank: 2 },
      { optionId: 'app-2', profileId: 'guest-2', rank: 1 },
      { optionId: 'opt-out', profileId: 'guest-3', rank: null },
    ],
  })

  const leader = pickLeadingMenuPollOption('ranked_choice', aggregated)

  assert.equal(leader?.id, 'app-2')
  assert.equal(buildDefaultLockSelections('ranked_choice', aggregated), 'app-2')
  assert.equal(aggregated.find((option) => option.id === 'app-1')?.score, 2)
  assert.equal(aggregated.find((option) => option.id === 'app-2')?.score, 3)
  assert.equal(aggregated.find((option) => option.id === 'opt-out')?.score, 1)
})
