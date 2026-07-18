/**
 * Shared cancellation / reschedule fee resolution.
 *
 * cancel-actions and reschedule-actions each carried an identical copy of this
 * logic whose percent branch swallowed any error into a $0 fee. A genuine "no
 * payments yet" total is legitimately $0; a failure to READ the total is not,
 * and must never masquerade as $0. So the percent path here reads the paid
 * total through an injected fetcher and lets its errors propagate. The action
 * that calls this surfaces the failure (refuses to cancel or reschedule on an
 * unknown fee) rather than posting a fabricated free ride.
 *
 * fee_value is cents for a flat tier, or basis points for a percent tier
 * (10000 = 100%).
 */

export type FeeTier = {
  days_before_min: number
  days_before_max: number
  fee_type: string
  fee_value: number
}

export function daysBetween(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((to.getTime() - from.getTime()) / msPerDay)
}

/**
 * Resolve the fee in cents for the tier matching `daysBefore`.
 *
 * `getPaidCents` is awaited only when a percent tier matches; its errors
 * propagate on purpose and are never caught into a silent 0. Returns 0 only
 * when there is genuinely no fee: no tiers, no matching tier, or a matched
 * flat tier whose value is 0.
 */
export async function resolveFeeCents(
  tiers: FeeTier[] | null | undefined,
  daysBefore: number,
  getPaidCents: () => Promise<number>
): Promise<number> {
  if (!tiers || tiers.length === 0) return 0

  for (const tier of tiers) {
    if (daysBefore >= tier.days_before_min && daysBefore <= tier.days_before_max) {
      if (tier.fee_type === 'flat') {
        return tier.fee_value
      }
      if (tier.fee_type === 'percent') {
        const paidCents = await getPaidCents()
        return Math.round(paidCents * (tier.fee_value / 10000))
      }
    }
  }

  return 0
}
