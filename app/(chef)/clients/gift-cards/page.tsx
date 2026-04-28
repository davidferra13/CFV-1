// Chef Gift Cards & Vouchers Management
// Create, view, send, and deactivate incentive codes for your clients.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  getVoucherAndGiftCards,
  getIncentiveStats,
  getIncentiveRedemptions,
} from '@/lib/loyalty/voucher-actions'
import { getGiftCertificates, getGiftCertificateStats } from '@/lib/gifts/gift-certificate-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IncentiveRedemptionHistory } from '@/components/incentives/incentive-redemption-history'
import { IssueButton, RowActions } from './gift-cards-client-shell'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info'

function formatOptionalDate(value: string | null) {
  return value ? format(new Date(value), 'MMM d, yyyy') : null
}

export default async function GiftCardsPage() {
  const db: any = createServerClient()
  const user = await requireChef()

  // Fetch clients for the "for client" dropdown in the issue form
  const { data: clientsRaw } = await db
    .from('clients')
    .select('id, full_name')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .order('full_name')

  const clients = (clientsRaw || []) as { id: string; full_name: string | null }[]

  const [incentives, stats, redemptions, certificates, certificateStats] = await Promise.all([
    getVoucherAndGiftCards(),
    getIncentiveStats(),
    getIncentiveRedemptions(),
    getGiftCertificates(),
    getGiftCertificateStats(),
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
                    const statusVariant: BadgeVariant =
                      statusLabel === 'Active' ? 'success' : 'default'

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
                              <span className="ml-1.5 text-brand-500">• purchased</span>
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
                          <Badge variant={statusVariant}>{statusLabel}</Badge>
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

      {/* Passive store gift certificates */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <CardTitle>Purchased Gift Certificates</CardTitle>
              <p className="text-sm text-stone-500 mt-1">
                Codes sold through the public store and available for chef-side reconciliation.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-right sm:min-w-[280px]">
              <div>
                <div className="text-sm font-semibold text-stone-100">
                  {certificateStats.activeCount}
                </div>
                <div className="text-xs text-stone-500">Active</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-stone-100">
                  {formatCurrency(certificateStats.outstandingBalanceCents)}
                </div>
                <div className="text-xs text-stone-500">Outstanding</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-stone-100">
                  {certificateStats.totalSold}
                </div>
                <div className="text-xs text-stone-500">Sold</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-stone-100">
                  {formatCurrency(certificateStats.totalSoldCents)}
                </div>
                <div className="text-xs text-stone-500">Gross Value</div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {certificates.length === 0 ? (
            <p className="text-sm text-stone-500 py-6 text-center">
              No purchased gift certificates yet. Public store purchases will appear here.
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
                      Purchaser
                    </th>
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Recipient
                    </th>
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Amount
                    </th>
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Balance
                    </th>
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Expires
                    </th>
                    <th className="text-left py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">
                      Redeemed Event
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((certificate) => {
                    const isExpired =
                      certificate.expires_at && new Date(certificate.expires_at) < new Date()
                    const statusLabel = isExpired && certificate.status === 'active'
                      ? 'expired'
                      : certificate.status
                    const statusVariant: BadgeVariant =
                      statusLabel === 'active'
                        ? 'success'
                        : statusLabel === 'redeemed'
                          ? 'info'
                          : statusLabel === 'voided'
                            ? 'error'
                            : 'warning'

                    return (
                      <tr
                        key={certificate.id}
                        className="border-b border-stone-800 hover:bg-stone-800"
                      >
                        <td className="py-3 pr-4">
                          <span className="font-mono text-xs bg-stone-800 px-2 py-0.5 rounded text-stone-200">
                            {certificate.code}
                          </span>
                          <div className="text-xs text-stone-500 mt-0.5">
                            Sold {formatOptionalDate(certificate.purchased_at) ?? 'date unknown'}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-stone-300 max-w-[180px]">
                          <div className="truncate">{certificate.purchaser_name}</div>
                          {certificate.purchaser_email && (
                            <div className="text-xs text-stone-500 truncate">
                              {certificate.purchaser_email}
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-stone-300 max-w-[180px]">
                          <div className="truncate">{certificate.recipient_name ?? '-'}</div>
                          {certificate.recipient_email && (
                            <div className="text-xs text-stone-500 truncate">
                              {certificate.recipient_email}
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-stone-300">
                          {formatCurrency(certificate.amount_cents)}
                        </td>
                        <td className="py-3 pr-4 text-stone-300">
                          {formatCurrency(certificate.balance_cents)}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={statusVariant} className="capitalize">
                            {statusLabel}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-stone-500 text-xs whitespace-nowrap">
                          {formatOptionalDate(certificate.expires_at) ?? (
                            <span className="text-stone-300">Never</span>
                          )}
                        </td>
                        <td className="py-3 text-stone-500 text-xs">
                          {certificate.redeemed_event_id ? (
                            <span className="font-mono">{certificate.redeemed_event_id}</span>
                          ) : (
                            <span className="text-stone-300">Not redeemed</span>
                          )}
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
