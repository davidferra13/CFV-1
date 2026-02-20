// Cancellation Policy Engine
// Implements Take a Chef's cancellation & refund terms.
//
// Policy tiers (applied in order):
//  1. Within 24 hrs of payment AND event >3 days away → full balance refund (deposit non-refundable)
//  2. ≥ cutoff days (default 15) before event      → full balance refund (deposit non-refundable)
//  3. < cutoff days (and outside 24-hr window)      → no refund
//
// Deposits are non-refundable by default; chef can override per-event at refund time.

export type CancellationPolicyConfig = {
  cancellationCutoffDays: number  // Default 15
  depositRefundable: boolean      // Default false
}

export const DEFAULT_POLICY: CancellationPolicyConfig = {
  cancellationCutoffDays: 15,
  depositRefundable: false,
}

export type LedgerSnapshot = {
  totalPaidCents: number
  totalRefundedCents: number
  depositPaidCents: number  // Sum of 'deposit' entry_type entries
}

export type CancellationRefundResult = {
  refundAmountCents: number
  depositRefundCents: number
  balanceRefundCents: number
  policyTier: 'full_refund' | 'full_refund_24hr' | 'no_refund'
  description: string
  depositNonRefundableWarning: boolean
}

/**
 * Compute the refund owed when cancelling an event.
 *
 * @param eventDate - ISO date string of the event
 * @param firstPaymentAt - ISO timestamp of the first payment (for 24-hr window check)
 * @param ledger - financial snapshot from ledger
 * @param cancelledAt - when the cancellation occurs (defaults to now)
 * @param policy - per-chef policy config (defaults to DEFAULT_POLICY)
 */
export function computeCancellationRefund(
  eventDate: string,
  firstPaymentAt: string | null,
  ledger: LedgerSnapshot,
  cancelledAt: Date = new Date(),
  policy: CancellationPolicyConfig = DEFAULT_POLICY
): CancellationRefundResult {
  const netPaidCents = ledger.totalPaidCents - ledger.totalRefundedCents
  const depositPaidCents = policy.depositRefundable ? 0 : Math.min(ledger.depositPaidCents, netPaidCents)
  const balancePaidCents = Math.max(0, netPaidCents - depositPaidCents)

  // Days until event (negative = event has passed)
  const eventMs = new Date(eventDate).getTime()
  const cancelledMs = cancelledAt.getTime()
  const daysUntilEvent = (eventMs - cancelledMs) / (1000 * 60 * 60 * 24)

  // Tier 1: Full refund — 24-hour window (payment within 24 hrs AND event >3 days away)
  if (firstPaymentAt) {
    const paymentMs = new Date(firstPaymentAt).getTime()
    const hoursSincePayment = (cancelledMs - paymentMs) / (1000 * 60 * 60)
    const within24hrWindow = hoursSincePayment <= 24
    const eventFarEnough = daysUntilEvent > 3

    if (within24hrWindow && eventFarEnough) {
      const depositRefundCents = policy.depositRefundable ? depositPaidCents : 0
      const refundAmountCents = balancePaidCents + depositRefundCents

      return {
        refundAmountCents,
        depositRefundCents,
        balanceRefundCents: balancePaidCents,
        policyTier: 'full_refund_24hr',
        description: 'Full refund — cancelled within 24 hours of payment and event is more than 3 days away.',
        depositNonRefundableWarning: !policy.depositRefundable && depositPaidCents > 0,
      }
    }
  }

  // Tier 2: Full balance refund — cancelled ≥ cutoff days before event
  if (daysUntilEvent >= policy.cancellationCutoffDays) {
    const depositRefundCents = policy.depositRefundable ? depositPaidCents : 0
    const refundAmountCents = balancePaidCents + depositRefundCents

    return {
      refundAmountCents,
      depositRefundCents,
      balanceRefundCents: balancePaidCents,
      policyTier: 'full_refund',
      description: `Full balance refund — cancelled ${Math.floor(daysUntilEvent)} days before the event (${policy.cancellationCutoffDays}+ days required).`,
      depositNonRefundableWarning: !policy.depositRefundable && depositPaidCents > 0,
    }
  }

  // Tier 3: No refund — within cutoff window
  return {
    refundAmountCents: 0,
    depositRefundCents: 0,
    balanceRefundCents: 0,
    policyTier: 'no_refund',
    description: `No refund — cancelled less than ${policy.cancellationCutoffDays} days before the event.`,
    depositNonRefundableWarning: depositPaidCents > 0,
  }
}

/**
 * Return a short human-readable summary of the cancellation policy.
 * Used in UI banners and email footers.
 */
export function getCancellationPolicySummary(policy: CancellationPolicyConfig = DEFAULT_POLICY): string {
  const lines = [
    `Cancel ${policy.cancellationCutoffDays}+ days before your event: full balance refund.`,
    `Cancel within 24 hours of payment (event >3 days away): full balance refund.`,
    `Cancel within ${policy.cancellationCutoffDays} days: no refund.`,
    policy.depositRefundable
      ? 'Deposits may be refunded depending on timing.'
      : 'Deposits are non-refundable.',
  ]
  return lines.join(' ')
}

/**
 * Return a structured policy text object for richer UI display.
 */
export function getCancellationPolicyLines(policy: CancellationPolicyConfig = DEFAULT_POLICY): {
  tier: string
  condition: string
  outcome: string
}[] {
  return [
    {
      tier: '1',
      condition: `${policy.cancellationCutoffDays}+ days before event`,
      outcome: 'Full balance refund',
    },
    {
      tier: '2',
      condition: 'Within 24 hrs of payment (event >3 days away)',
      outcome: 'Full balance refund',
    },
    {
      tier: '3',
      condition: `Within ${policy.cancellationCutoffDays} days of event`,
      outcome: 'No refund',
    },
    {
      tier: 'deposit',
      condition: 'Deposit',
      outcome: policy.depositRefundable ? 'Refundable (based on timing)' : 'Non-refundable',
    },
  ]
}
