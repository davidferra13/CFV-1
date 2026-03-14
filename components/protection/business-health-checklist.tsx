'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle } from '@/components/ui/icons'

type HealthItem = {
  id: string
  label?: string
  title?: string
  completed: boolean
  category?: string
  sort_order?: number
}

export function BusinessHealthChecklist({ items }: { items: HealthItem[] }) {
  const completedCount = items.filter((i) => i.completed).length
  const totalCount = items.length

  if (totalCount === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-stone-400">
          <p className="text-sm">No checklist items configured yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Badge variant={completedCount === totalCount ? 'success' : 'warning'}>
          {completedCount}/{totalCount} complete
        </Badge>
      </div>

      <Card>
        <CardContent className="py-4 divide-y divide-stone-800">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-stone-300 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm ${item.completed ? 'text-stone-400 line-through' : 'text-stone-300'}`}
                >
                  {item.title ?? item.label ?? 'Untitled item'}
                </p>
                {item.category && <p className="text-xs text-stone-400 mt-0.5">{item.category}</p>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
