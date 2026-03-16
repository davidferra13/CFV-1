// Chef Gift Cards & Vouchers Management
// Create, view, send, and deactivate incentive codes for your clients.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import {
  getVoucherAndGiftCards,
  getIncentiveStats,
  getIncentiveRedemptions,
} from '@/lib/loyalty/voucher-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IncentiveRedemptionHistory } from '@/components/incentives/incentive-redemption-history'
import { IssueButton, RowActions } from './gift-cards-client-shell'

export default async function GiftCardsPage() {
  await requireChef()

  const supabase: any = createServerClient()
  const user = await requireChef()

  // Fetch clients for the "for client" dropdown in the issue form
  const { data: clientsRaw } = await supabase
    .from('clients')
    .select('id, full_name')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .order('full_name')

  const clients = (clientsRaw || []) as { id: string; full_name: string | null }[]

  const [incentives, stats, redemptions] = await Promise.all([
    getVoucherAndGiftCards(),
    getIncentiveStats(),
    getIncentiveRedemptions(),
  ])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Gift Cards & Vouchers</h1>
          <p className="text-stone-500 mt-1">
            Issue codes to reward clients or sell gift cards via your public profile.
          </p>
        </div>
        <IssueButton clients={clients} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-stone-100">{stats.totalIssued}</div>
            <div className="text-sm text-stone-500 mt-0.5">Total Issued</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-stone-100">{stats.totalRedeemed}</div>
            <div className="text-sm text-stone-500 mt-0.5">Times Redeemed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-stone-100">
              {formatCurrency(stats.totalValueAppliedCents)}
            </div>
            <div className="text-sm text-stone-500 mt-0.5">Value Applied</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-stone-100">
              {stats.giftCardCount} / {stats.voucherCount}
            </div>
            <div className="text-sm text-stone-500 mt-0.5">GC / Vouchers</div>
          </CardContent>
        </Card>
      </div>

      {/* Codes table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>All Codes</CardTitle>
        </CardHeader>
        <CardContent>
          {incentives.length === 0 ? (
            <p className="text-sm text-stone-500 py-6 text-center">
              No codes yet. Issue your first gift card or voucher above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-700">
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Code
                    </th>
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Title
                    </th>
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Value
                    </th>
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Remaining
                    </th>
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Redeemed
                    </th>
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Expires
                    </th>
                    <th className="text-right py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {incentives.map((incentive: any) => {
                    const isGiftCard = incentive.type === 'gift_card'
                    const isExpired =
                      incentive.expires_at && new Date(incentive.expires_at) < new Date()
                    const isFullyUsed =
                      incentive.redemptions_used >= incentive.max_redemptions ||
                      (isGiftCard && (incentive.remaining_balance_cents ?? 0) <= 0)
                    const statusLabel = !incentive.is_active
                      ? 'Inactive'
                      : isExpired
                        ? 'Expired'
                        : isFullyUsed
                          ? 'Used'
                          : 'Active'
                    const statusVariant = statusLabel === 'Active' ? 'success' : 'default'

                    return (
                      <tr
                        key={incentive.id}
                        className="border-b border-stone-800 hover:bg-stone-800"
                      >
                        <td className="py-3 pr-4">
                          <span className="font-mono text-xs bg-stone-800 px-2 py-0.5 rounded text-stone-200">
                            {incentive.code}
                          </span>
                          <div className="text-xs text-stone-400 mt-0.5 capitalize">
                            {isGiftCard ? 'gift card' : 'voucher'}
                            {incentive.purchase_status === 'paid' && (
                              <span className="ml-1.5 text-blue-500">• purchased</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-stone-300 max-w-[160px] truncate">
                          {incentive.title}
                        </td>
                        <td className="py-3 pr-4 text-stone-300">
                          {incentive.discount_percent != null
                            ? `${incentive.discount_percent}% off`
                            : incentive.amount_cents != null
                              ? formatCurrency(incentive.amount_cents)
                              : '-'}
                        </td>
                        <td className="py-3 pr-4 text-stone-300">
                          {isGiftCard && incentive.remaining_balance_cents != null ? (
                            formatCurrency(incentive.remaining_balance_cents)
                          ) : (
                            <span className="text-stone-400">-</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-stone-300">
                          {incentive.redemptions_used} / {incentive.max_redemptions}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={statusVariant as any}>{statusLabel}</Badge>
                        </td>
                        <td className="py-3 pr-4 text-stone-500 text-xs whitespace-nowrap">
                          {incentive.expires_at ? (
                            format(new Date(incentive.expires_at), 'MMM d, yyyy')
                          ) : (
                            <span className="text-stone-300">Never</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <RowActions incentive={incentive} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Redemption history */}
      <Card>
        <CardHeader>
          <CardTitle>Redemption History</CardTitle>
        </CardHeader>
        <CardContent>
          <IncentiveRedemptionHistory redemptions={redemptions} />
        </CardContent>
      </Card>
    </div>
  )
}
