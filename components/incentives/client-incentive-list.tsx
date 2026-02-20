// ClientIncentiveList — Shows a client's received gift cards and vouchers
// Used on /my-rewards page to display codes they've received or own.

import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'

type Incentive = {
  id: string
  type: 'gift_card' | 'voucher'
  code: string
  title: string
  amount_cents: number | null
  discount_percent: number | null
  remaining_balance_cents: number | null
  expires_at: string | null
  redemptions_used: number
  max_redemptions: number
  is_active: boolean
  currency_code: string
}

type Props = {
  incentives: Incentive[]
}

function getValueLabel(incentive: Incentive): string {
  if (incentive.discount_percent != null) {
    return `${incentive.discount_percent}% off`
  }
  if (incentive.amount_cents != null) {
    const currency = incentive.currency_code || 'USD'
    if (incentive.type === 'gift_card') {
      const remaining = incentive.remaining_balance_cents ?? incentive.amount_cents
      return `${formatCurrency(remaining, currency)} remaining`
    }
    return `${formatCurrency(incentive.amount_cents, currency)} off`
  }
  return 'Value at redemption'
}

function getStatus(incentive: Incentive): { label: string; variant: 'success' | 'default' | 'error' } {
  if (!incentive.is_active) return { label: 'Inactive', variant: 'default' }
  if (incentive.expires_at && new Date(incentive.expires_at) < new Date()) {
    return { label: 'Expired', variant: 'error' }
  }
  if (
    incentive.redemptions_used >= incentive.max_redemptions ||
    (incentive.type === 'gift_card' && (incentive.remaining_balance_cents ?? 0) <= 0)
  ) {
    return { label: 'Used', variant: 'default' }
  }
  return { label: 'Active', variant: 'success' }
}

export function ClientIncentiveList({ incentives }: Props) {
  if (incentives.length === 0) {
    return (
      <p className="text-sm text-stone-500 py-4 text-center">
        No gift cards or vouchers yet. Ask your chef or purchase one from their profile page.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {incentives.map((incentive) => {
        const status = getStatus(incentive)
        const isActive = status.label === 'Active'

        return (
          <div
            key={incentive.id}
            className={`border rounded-xl p-4 ${
              isActive ? 'border-stone-200 bg-white' : 'border-stone-100 bg-stone-50'
            }`}
          >
            {/* Type badge + status */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                {incentive.type === 'gift_card' ? 'Gift Card' : 'Voucher'}
              </span>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>

            {/* Title */}
            <h3 className="font-semibold text-stone-900 mb-1">{incentive.title}</h3>

            {/* Value */}
            <div className="text-2xl font-bold text-stone-900 mb-3">
              {getValueLabel(incentive)}
            </div>

            {/* Code */}
            <div className="bg-stone-100 rounded-lg px-3 py-2 mb-3">
              <p className="text-xs text-stone-500 mb-0.5">Code</p>
              <p className="font-mono font-bold text-stone-900 text-sm tracking-widest">
                {incentive.code}
              </p>
            </div>

            {/* Details */}
            <div className="space-y-1 text-xs text-stone-500">
              {incentive.expires_at && (
                <div className="flex justify-between">
                  <span>Expires</span>
                  <span>{format(new Date(incentive.expires_at), 'MMM d, yyyy')}</span>
                </div>
              )}
              {incentive.type === 'gift_card' && incentive.amount_cents != null && (
                <div className="flex justify-between">
                  <span>Original value</span>
                  <span>{formatCurrency(incentive.amount_cents)}</span>
                </div>
              )}
            </div>

            {isActive && (
              <p className="text-xs text-stone-400 mt-3">
                Enter this code on your event payment page to apply it.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
