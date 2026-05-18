import type { PaymentMethod } from '@/lib/ledger/append'
import type { NormalizedSplitTenderLine, SplitTenderInput } from './types'

export function computeChangeDueCents(input: {
  paymentMethod: PaymentMethod
  amountTenderedCents: number
  totalChargedCents: number
}) {
  return input.paymentMethod === 'cash'
    ? Math.max(0, input.amountTenderedCents - input.totalChargedCents)
    : 0
}

export function computeSplitTenderChangeDueCents(input: {
  splitTenders: NormalizedSplitTenderLine[]
  totalChargedCents: number
}) {
  const totalTenderedCents = input.splitTenders.reduce(
    (sum, line) => sum + line.amountTenderedCents,
    0
  )
  return Math.max(0, totalTenderedCents - input.totalChargedCents)
}

export function computeCashDrawerSaleMovementCents(input: {
  paymentMethod: PaymentMethod
  splitTenders: NormalizedSplitTenderLine[] | null
  totalChargedCents: number
}) {
  if (input.splitTenders) {
    return input.splitTenders.reduce(
      (sum, line) => sum + (line.paymentMethod === 'cash' ? line.amountCents : 0),
      0
    )
  }

  if (input.paymentMethod === 'cash') {
    return input.totalChargedCents
  }

  return 0
}

export function normalizeSplitTenders(input: {
  splitTenders?: SplitTenderInput[]
  defaultCardEntryMode: 'terminal' | 'manual_keyed'
  defaultManualCardReference: string | null
}): NormalizedSplitTenderLine[] | null {
  if (!input.splitTenders || input.splitTenders.length === 0) return null

  return input.splitTenders.map((line) => {
    const paymentMethod = line.paymentMethod
    const amountCents = line.amountCents
    const amountTenderedCents =
      paymentMethod === 'cash'
        ? Math.max(line.amountTenderedCents ?? amountCents, amountCents)
        : amountCents

    let cardEntryMode: 'terminal' | 'manual_keyed' = 'terminal'
    let manualCardReference: string | null = null

    if (paymentMethod === 'card') {
      cardEntryMode = line.cardEntryMode ?? input.defaultCardEntryMode
      manualCardReference =
        String(line.manualCardReference ?? '').trim() ||
        (cardEntryMode === 'manual_keyed' ? input.defaultManualCardReference : null)
    }

    return {
      paymentMethod,
      amountCents,
      amountTenderedCents,
      cardEntryMode,
      manualCardReference,
    }
  })
}

export function allocateTipAcrossSplitTenders(input: {
  splitTenders: NormalizedSplitTenderLine[]
  tipCents: number
  totalChargedCents: number
}): number[] {
  const { splitTenders, tipCents, totalChargedCents } = input
  if (tipCents <= 0 || totalChargedCents <= 0) {
    return splitTenders.map(() => 0)
  }

  const allocations = splitTenders.map((line) =>
    Math.min(line.amountCents, Math.floor((line.amountCents * tipCents) / totalChargedCents))
  )

  let remaining = tipCents - allocations.reduce((sum, value) => sum + value, 0)
  for (let i = 0; i < splitTenders.length && remaining > 0; i += 1) {
    if (allocations[i] >= splitTenders[i].amountCents) continue
    allocations[i] += 1
    remaining -= 1
    if (i === splitTenders.length - 1 && remaining > 0) {
      i = -1
    }
  }

  return allocations
}
