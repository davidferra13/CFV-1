import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  buildPaymentStructure,
  readPaymentStructure,
  serializePaymentStructureForContext,
} from '@/lib/payments/payment-structure'

const ROOT = process.cwd()

test('payment structure builds deposit plus balance terms', () => {
  const structure = buildPaymentStructure({
    mode: 'deposit_balance',
    totalCents: 120000,
    depositCents: 30000,
    depositPercentage: 25,
  })

  assert.equal(structure.label, 'Deposit plus balance')
  assert.equal(structure.installments.length, 2)
  assert.equal(structure.installments[0].label, 'Deposit')
  assert.equal(structure.installments[0].amountCents, 30000)
  assert.equal(structure.installments[1].label, 'Remaining balance')
  assert.equal(structure.installments[1].amountCents, 90000)
  assert.match(structure.clientNote, /Deposit \$300\.00 due to reserve the date/)
})

test('payment structure splits uneven cents across payers without losing money', () => {
  const structure = buildPaymentStructure({
    mode: 'split_evenly',
    totalCents: 100001,
    participantCount: 3,
  })

  assert.equal(structure.installments.length, 3)
  assert.deepEqual(
    structure.installments.map((installment) => installment.amountCents),
    [33334, 33334, 33333]
  )
  assert.equal(
    structure.installments.reduce((sum, installment) => sum + installment.amountCents, 0),
    100001
  )
  assert.equal(structure.installments[0].payerLabel, 'Payer 1')
})

test('payment structure round trips through quote pricing context', () => {
  const structure = buildPaymentStructure({
    mode: 'thirds',
    totalCents: 90000,
  })
  const context = serializePaymentStructureForContext(structure)

  assert.deepEqual(readPaymentStructure(context), structure)
  assert.equal(readPaymentStructure({}), null)
})

test('event-prefilled quote creation keeps event link for installment sync', () => {
  const quoteFormSrc = readFileSync(resolve(ROOT, 'components/quotes/quote-form.tsx'), 'utf8')

  assert.match(quoteFormSrc, /event_id:\s*prefilledEventId \|\| null/)
})

test('deposit checkbox normalizes payment structure modes', () => {
  const quoteFormSrc = readFileSync(resolve(ROOT, 'components/quotes/quote-form.tsx'), 'utf8')

  assert.match(quoteFormSrc, /paymentStructureMode === 'split_evenly'/)
  assert.match(quoteFormSrc, /paymentStructureMode === 'custom_terms'/)
  assert.match(quoteFormSrc, /paymentStructureMode === 'thirds'/)
  assert.match(quoteFormSrc, /applyPaymentStructureMode\('deposit_balance'\)/)
  assert.match(quoteFormSrc, /applyPaymentStructureMode\('full_upfront'\)/)
})

test('authenticated client quote detail renders saved payment structure', () => {
  const clientQuoteSrc = readFileSync(
    resolve(ROOT, 'app/(client)/my-quotes/[id]/page.tsx'),
    'utf8'
  )

  assert.match(clientQuoteSrc, /readPaymentStructure/)
  assert.match(clientQuoteSrc, /PaymentStructureSummary/)
  assert.match(clientQuoteSrc, /pricing_context/)
})
