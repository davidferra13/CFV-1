'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { ShieldAlert } from 'lucide-react'

type Policy = { policy_type: string; expiry_date: string | null }

export function InsuranceHealthCard({ policies }: { policies: Policy[] }) {
  const now = new Date()
  const expiringSoon = policies.filter((p) => {
    if (!p.expiry_date) return false
    const diff = (new Date(p.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 30
  })
  const expired = policies.filter((p) => p.expiry_date && new Date(p.expiry_date) < now)

  const borderColor =
    policies.length === 0 || expired.length > 0
      ? 'border-red-200 bg-red-50'
      : expiringSoon.length > 0
        ? 'border-amber-200 bg-amber-50'
        : 'border-emerald-200 bg-emerald-50'

  const textColor =
    policies.length === 0 || expired.length > 0
      ? 'text-red-800'
      : expiringSoon.length > 0
        ? 'text-amber-800'
        : 'text-emerald-800'

  return (
    <Link href="/settings/protection/insurance">
      <Card className={`border ${borderColor} hover:shadow-sm transition-shadow cursor-pointer`}>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className={`w-4 h-4 ${textColor}`} />
            <span className={`text-sm font-medium ${textColor}`}>
              {policies.length === 0
                ? 'No Insurance on File'
                : expired.length > 0
                  ? 'Insurance Expired'
                  : expiringSoon.length > 0
                    ? 'Insurance Expiring Soon'
                    : `${policies.length} Active Polic${policies.length === 1 ? 'y' : 'ies'}`}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
