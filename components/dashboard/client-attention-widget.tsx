'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { AttentionItem } from '@/app/(chef)/dashboard/_sections/client-attention-data'

type Props = {
  items: AttentionItem[]
}

function urgencyVariant(urgency: AttentionItem['urgency']): 'error' | 'warning' | 'info' {
  if (urgency === 'critical') return 'error'
  if (urgency === 'high') return 'warning'
  return 'info'
}

export function ClientAttentionWidget({ items }: Props) {
  if (items.length === 0) return null

  return (
    <Card className="p-4" data-cf-surface="chef:client-attention-widget">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-100">Needs Attention</h3>
        <span className="text-xs text-stone-500">
          {items.length} client{items.length === 1 ? '' : 's'}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-start justify-between gap-2 rounded-lg border border-stone-800 bg-stone-950/40 p-3 transition-colors hover:border-stone-700 hover:bg-stone-900/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-stone-200">{item.clientName}</p>
                <p className="mt-0.5 text-xs text-stone-500">{item.reason}</p>
                {item.occasion && <p className="mt-0.5 text-xs text-stone-600">{item.occasion}</p>}
              </div>
              <Badge variant={urgencyVariant(item.urgency)}>{item.daysSilent}d</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
