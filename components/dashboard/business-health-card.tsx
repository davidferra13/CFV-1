'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { ShieldCheck } from '@/components/ui/icons'

const colorMap = {
  emerald: {
    card: 'border-emerald-200 bg-emerald-50',
    icon: 'text-emerald-700',
    text: 'text-emerald-800',
    bar: 'bg-emerald-500',
  },
  amber: {
    card: 'border-amber-200 bg-amber-50',
    icon: 'text-amber-700',
    text: 'text-amber-800',
    bar: 'bg-amber-500',
  },
  red: {
    card: 'border-red-200 bg-red-50',
    icon: 'text-red-700',
    text: 'text-red-800',
    bar: 'bg-red-500',
  },
} as const

export function BusinessHealthCard({ score, total }: { score: number; total: number }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0
  const color = pct >= 80 ? 'emerald' : pct >= 50 ? 'amber' : 'red'
  const c = colorMap[color]

  return (
    <Link href="/settings/protection">
      <Card className={`border ${c.card} hover:shadow-sm transition-shadow cursor-pointer`}>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className={`w-4 h-4 ${c.icon}`} />
            <span className={`text-sm font-medium ${c.text}`}>
              Business Health: {score}/{total}
            </span>
          </div>
          <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${c.bar} transition-all`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
