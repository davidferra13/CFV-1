// Cancellation Policy Display Component
// Shows the chef's cancellation terms to clients.
// Two variants: 'compact' (inline banner) and 'full' (expandable card with all tiers).

import { getCancellationPolicyLines, getCancellationPolicySummary, DEFAULT_POLICY } from '@/lib/cancellation/policy'
import type { CancellationPolicyConfig } from '@/lib/cancellation/policy'

type Props = {
  variant: 'compact' | 'full'
  policy?: CancellationPolicyConfig
}

export function CancellationPolicyDisplay({ variant, policy = DEFAULT_POLICY }: Props) {
  if (variant === 'compact') {
    return (
      <div className="flex items-start gap-2 text-sm text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-4 py-3">
        <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          <strong className="text-stone-700">Cancellation policy:</strong>{' '}
          {getCancellationPolicySummary(policy)}
        </span>
      </div>
    )
  }

  // Full variant
  const lines = getCancellationPolicyLines(policy)
  const [tier1, tier2, tier3, depositLine] = lines

  return (
    <div className="border border-stone-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
        <h3 className="text-sm font-semibold text-stone-700">Cancellation Policy</h3>
      </div>
      <div className="divide-y divide-stone-100">
        {/* Tier 1: Full refund */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium text-stone-900">{tier1.condition}</p>
          </div>
          <span className="text-sm font-medium text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full">
            {tier1.outcome}
          </span>
        </div>

        {/* Tier 2: 24-hr window */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium text-stone-900">{tier2.condition}</p>
          </div>
          <span className="text-sm font-medium text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full">
            {tier2.outcome}
          </span>
        </div>

        {/* Tier 3: No refund */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium text-stone-900">{tier3.condition}</p>
          </div>
          <span className="text-sm font-medium text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full">
            {tier3.outcome}
          </span>
        </div>

        {/* Deposit line */}
        <div className="flex items-center justify-between px-4 py-3 bg-stone-50">
          <div>
            <p className="text-sm font-medium text-stone-700">Security deposit</p>
          </div>
          <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${
            policy.depositRefundable
              ? 'text-green-700 bg-green-50'
              : 'text-amber-700 bg-amber-50'
          }`}>
            {depositLine.outcome}
          </span>
        </div>
      </div>
      <div className="px-4 py-3 bg-stone-50 border-t border-stone-200">
        <p className="text-xs text-stone-500">
          Refunds are processed back to the original payment method within 3–5 business days.
          Written cancellation notice required.
        </p>
      </div>
    </div>
  )
}
