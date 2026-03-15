import test from 'node:test'
import assert from 'node:assert/strict'
import {
  TOOLTIP_CHARACTER_LIMIT,
  clampTooltipText,
  isTooltipLabelRedundant,
  normalizeTooltipText,
} from '@/lib/ui/tooltip'

test('normalizeTooltipText collapses whitespace and trims edges', () => {
  assert.equal(
    normalizeTooltipText('  Save\n   changes\tfor  this item  '),
    'Save changes for this item'
  )
})

test('clampTooltipText keeps short copy unchanged', () => {
  assert.equal(clampTooltipText('Open Remy assistant'), 'Open Remy assistant')
})

test('clampTooltipText trims long copy at a word boundary and stays within the limit', () => {
  const clamped = clampTooltipText(
    'Create a follow-up reminder for this prospect after the current outreach window closes and the pricing review has been approved by the team lead.'
  )

  assert.ok(clamped)
  assert.ok(clamped!.length <= TOOLTIP_CHARACTER_LIMIT)
  assert.match(clamped!, /\.\.\.$/)
})

test('isTooltipLabelRedundant ignores punctuation and case for matching labels', () => {
  assert.equal(isTooltipLabelRedundant('Sign Out', 'sign out'), true)
  assert.equal(isTooltipLabelRedundant('Open Remy', 'Open Remy!'), true)
})

test('isTooltipLabelRedundant preserves explanatory labels that add context', () => {
  assert.equal(isTooltipLabelRedundant('Toggle navigation menu', 'Menu'), false)
  assert.equal(isTooltipLabelRedundant('Open client profile', 'Profile'), false)
})
