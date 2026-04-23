import test from 'node:test'
import assert from 'node:assert/strict'
import {
  aggregateMenuPollOptions,
  buildDefaultLockSelections,
  pickLeadingMenuPollOption,
} from '@/lib/hub/menu-polling-core'

test('aggregateMenuPollOptions tallies single-choice responses and picks the leader', () => {
  const options = aggregateMenuPollOptions({
    pollType: 'single_choice',
    options: [
      { id: 'a', label: 'Spring pea soup', optionType: 'standard', dishIndexId: 'dish-a' },
      { id: 'b', label: 'Crab salad', optionType: 'standard', dishIndexId: 'dish-b' },
      { id: 'c', label: 'Skip', optionType: 'opt_out' },
    ],
    votes: [
      { optionId: 'a', profileId: 'guest-1', rank: null },
      { optionId: 'a', profileId: 'guest-2', rank: null },
      { optionId: 'b', profileId: 'guest-3', rank: null },
      { optionId: 'c', profileId: 'guest-4', rank: null },
    ],
  })

  const leader = pickLeadingMenuPollOption('single_choice', options)
  assert.equal(leader?.id, 'a')
  assert.equal(buildDefaultLockSelections('single_choice', options), 'a')

  const springSoup = options.find((option) => option.id === 'a')
  assert.equal(springSoup?.voteCount, 2)
  assert.equal(springSoup?.responseCount, 2)
  assert.equal(springSoup?.score, 2)
})

test('ranked-choice scoring prefers stronger aggregate rank while ignoring opt-out', () => {
  const options = aggregateMenuPollOptions({
    pollType: 'ranked_choice',
    options: [
      { id: 'a', label: 'Halibut', optionType: 'standard', dishIndexId: 'dish-a' },
      { id: 'b', label: 'Duck breast', optionType: 'standard', dishIndexId: 'dish-b' },
      { id: 'c', label: 'Mushroom tart', optionType: 'standard', dishIndexId: 'dish-c' },
      { id: 'skip', label: 'Opt out', optionType: 'opt_out' },
    ],
    votes: [
      { optionId: 'a', profileId: 'guest-1', rank: 1 },
      { optionId: 'b', profileId: 'guest-1', rank: 2 },
      { optionId: 'c', profileId: 'guest-1', rank: 3 },
      { optionId: 'b', profileId: 'guest-2', rank: 1 },
      { optionId: 'a', profileId: 'guest-2', rank: 2 },
      { optionId: 'c', profileId: 'guest-2', rank: 3 },
      { optionId: 'b', profileId: 'guest-3', rank: 1 },
      { optionId: 'a', profileId: 'guest-3', rank: 2 },
      { optionId: 'skip', profileId: 'guest-4', rank: null },
    ],
  })

  const leader = pickLeadingMenuPollOption('ranked_choice', options)
  assert.equal(leader?.id, 'b')
  assert.equal(buildDefaultLockSelections('ranked_choice', options), 'b')

  const duck = options.find((option) => option.id === 'b')
  assert.equal(duck?.score, 8)
  assert.equal(duck?.averageRank, 1.33)
})

test('buildDefaultLockSelections falls back to the first canonical option when there is no leader', () => {
  const options = aggregateMenuPollOptions({
    pollType: 'multi_choice',
    options: [
      { id: 'a', label: 'Burrata', optionType: 'standard', dishIndexId: 'dish-a' },
      { id: 'b', label: 'Gazpacho', optionType: 'standard', dishIndexId: 'dish-b' },
      { id: 'skip', label: 'Opt out', optionType: 'opt_out' },
    ],
    votes: [],
  })

  assert.equal(pickLeadingMenuPollOption('multi_choice', options)?.id, 'a')
  assert.equal(buildDefaultLockSelections('multi_choice', options), 'a')
})
