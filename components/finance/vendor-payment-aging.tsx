'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { VendorAgingEntry } from '@/lib/vendors/payment-aging'

interface VendorPaymentAgingProps {
  entries: VendorAgingEntry[]
}

function bucketBadgeVariant(
  bucket: VendorAgingEntry['agingBucket']
): 'success' | 'info' | 'warning' | 'error' {
  switch (bucket) {
    case 'current':
      return 'success'
    case '1-30':
      return 'info'
    case '31-60':
      return 'warning'
    case '61-90':
      return 'error'
    case '90+':
      return 'error'
  }
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })
}

export function VendorPaymentAging({ entries }: VendorPaymentAgingProps) {
  const totalCents = entries.reduce((sum, e) => sum + e.amountCents, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Vendor Payment Aging</CardTitle>
      </CardHeader>

      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-stone-400 py-2">No outstanding vendor payments.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left">
                  <th className="pb-2 font-medium text-stone-500">Vendor</th>
                  <th className="pb-2 font-medium text-stone-500 text-right">Amount</th>
                  <th className="pb-2 font-medium text-stone-500 text-right">Days Past Due</th>
                  <th className="pb-2 font-medium text-stone-500 text-right">Bucket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {entries.map((entry, i) => (
                  <tr key={i} className="py-2">
                    <td className="py-2 text-stone-800 font-medium pr-4">{entry.vendorName}</td>
                    <td className="py-2 text-stone-700 text-right pr-4">
                      {formatCents(entry.amountCents)}
                    </td>
                    <td className="py-2 text-stone-600 text-right pr-4">
                      {entry.daysPastDue === 0 ? 'Current' : `${entry.daysPastDue}d`}
                    </td>
                    <td className="py-2 text-right">
                      <Badge variant={bucketBadgeVariant(entry.agingBucket)}>
                        {entry.agingBucket}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-stone-200">
                  <td colSpan={1} className="pt-3 font-semibold text-stone-800">
                    Total Outstanding
                  </td>
                  <td colSpan={3} className="pt-3 text-right font-semibold text-stone-800">
                    {formatCents(totalCents)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
