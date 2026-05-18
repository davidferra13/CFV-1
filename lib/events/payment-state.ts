import type { BadgeProps } from '@/components/ui/badge'

export type EventIndexPaymentKind =
  | 'paid'
  | 'partial'
  | 'unpaid'
  | 'overdue'
  | 'refunded'
  | 'unknown'

export type EventIndexPaymentInput = {
  eventDate: string | null
  paymentStatus: string | null
  quotedPriceCents: number | null
  totalPaidCents: number | null
  outstandingBalanceCents: number | null
  today?: Date
}

export type EventIndexPaymentState = {
  kind: EventIndexPaymentKind
  label: string
  badgeVariant: NonNullable<BadgeProps['variant']>
  outstandingBalanceCents: number
  totalPaidCents: number
  quotedPriceCents: number | null
  showOutstanding: boolean
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function parseEventDate(value: string | null) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

export function getEventIndexPaymentState(input: EventIndexPaymentInput): EventIndexPaymentState {
  const paymentStatus = input.paymentStatus
  const outstandingBalanceCents = Math.max(0, Number(input.outstandingBalanceCents ?? 0))
  const totalPaidCents = Math.max(0, Number(input.totalPaidCents ?? 0))
  const quotedPriceCents =
    input.quotedPriceCents === null || input.quotedPriceCents === undefined
      ? null
      : Math.max(0, Number(input.quotedPriceCents))
  const eventDate = parseEventDate(input.eventDate)
  const today = startOfLocalDay(input.today ?? new Date())
  const isPastDue = Boolean(eventDate && eventDate < today && outstandingBalanceCents > 0)

  if (!paymentStatus && quotedPriceCents === null) {
    return {
      kind: 'unknown',
      label: 'Unknown',
      badgeVariant: 'default',
      outstandingBalanceCents: 0,
      totalPaidCents: 0,
      quotedPriceCents,
      showOutstanding: false,
    }
  }

  if (paymentStatus === 'refunded') {
    return {
      kind: 'refunded',
      label: 'Refunded',
      badgeVariant: 'info',
      outstandingBalanceCents,
      totalPaidCents,
      quotedPriceCents,
      showOutstanding: false,
    }
  }

  if (isPastDue) {
    return {
      kind: 'overdue',
      label: 'Overdue',
      badgeVariant: 'error',
      outstandingBalanceCents,
      totalPaidCents,
      quotedPriceCents,
      showOutstanding: true,
    }
  }

  if (outstandingBalanceCents === 0 && (paymentStatus === 'paid' || totalPaidCents > 0)) {
    return {
      kind: 'paid',
      label: 'Paid',
      badgeVariant: 'success',
      outstandingBalanceCents,
      totalPaidCents,
      quotedPriceCents,
      showOutstanding: false,
    }
  }

  if (totalPaidCents > 0 || paymentStatus === 'partial' || paymentStatus === 'deposit_paid') {
    return {
      kind: 'partial',
      label: paymentStatus === 'deposit_paid' ? 'Deposit paid' : 'Partial',
      badgeVariant: 'warning',
      outstandingBalanceCents,
      totalPaidCents,
      quotedPriceCents,
      showOutstanding: outstandingBalanceCents > 0,
    }
  }

  return {
    kind: 'unpaid',
    label: 'Unpaid',
    badgeVariant: 'error',
    outstandingBalanceCents,
    totalPaidCents,
    quotedPriceCents,
    showOutstanding: outstandingBalanceCents > 0,
  }
}
