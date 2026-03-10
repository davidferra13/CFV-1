import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatPeakMonths,
  getPrimarySeason,
  resolveIngredientSeasonality,
} from '@/lib/public-data/seasonality'

test('resolveIngredientSeasonality marks tomatoes as peak in July', () => {
  const july = new Date('2026-07-10T12:00:00Z')
  const result = resolveIngredientSeasonality('Heirloom tomatoes', 'produce', july)

  assert.equal(result.status, 'peak_now')
  assert.equal(getPrimarySeason(result, july), 'Summer')
  assert.equal(formatPeakMonths(result.peakMonths), 'Jul, Aug, Sep')
})

test('resolveIngredientSeasonality treats pantry ingredients as year-round', () => {
  const result = resolveIngredientSeasonality('Rice', 'pantry', new Date('2026-01-10T12:00:00Z'))

  assert.equal(result.status, 'year_round')
  assert.deepEqual(result.peakMonths, [])
})

test('resolveIngredientSeasonality leaves unknown produce unclassified', () => {
  const result = resolveIngredientSeasonality('Dragonfruit blossoms', 'produce')

  assert.equal(result.status, 'unclassified')
})
