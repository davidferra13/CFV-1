import test from 'node:test'
import assert from 'node:assert/strict'

import {
  formatCurrency as formatCurrencyAdapter,
  formatCentsToDisplay as formatCentsToDisplayAdapter,
  formatWholeCurrency as formatWholeCurrencyAdapter,
  parseCurrencyToCents as parseCurrencyToCentsAdapter,
} from '../../lib/utils/currency'
import {
  formatCurrency as formatCurrencyCore,
  formatCentsToDisplay as formatCentsToDisplayCore,
  formatWholeCurrency as formatWholeCurrencyCore,
  parseCurrencyToCents as parseCurrencyToCentsCore,
} from '../../lib/utils/format'

test('legacy currency module delegates display formatting to the shared formatter', () => {
  const cents = 123456

  assert.equal(formatCurrencyAdapter(cents), formatCurrencyCore(cents, { currency: 'USD' }))
  assert.equal(
    formatCurrencyAdapter(cents, { currency: 'USD', maximumFractionDigits: 0 }),
    formatCurrencyCore(cents, { currency: 'USD', maximumFractionDigits: 0 })
  )
  assert.equal(formatWholeCurrencyAdapter(cents), formatWholeCurrencyCore(cents))
})

test('legacy currency module delegates parsing and plain display formatting', () => {
  const cents = 123456
  const currencyInput = '$1,234.56'

  assert.equal(formatCentsToDisplayAdapter(cents), formatCentsToDisplayCore(cents))
  assert.equal(parseCurrencyToCentsAdapter(currencyInput), parseCurrencyToCentsCore(currencyInput))
})
