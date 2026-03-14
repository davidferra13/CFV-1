'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { ShieldCheck } from '@/components/ui/icons'

export function BusinessHealthCard({ score, total }: { score: number; total: number }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0
  const color = pct >= 80 ? 'emerald' : pct >= 50 ? 'amber' : 'red'

  return (
    <Link href="/settings/protection">
      <Card
        className={`border border-${color}-200 bg-${color}-50 hover:shadow-sm transition-shadow cursor-pointer`}
      >
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className={`w-4 h-4 text-${color}-700`} />
            <span className={`text-sm font-medium text-${color}-800`}>
              Business Health: {score}/{total}
            </span>
          </div>
          <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-${color}-500 transition-all`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
