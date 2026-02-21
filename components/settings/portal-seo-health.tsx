'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle } from 'lucide-react'

type SEOItem = {
  key: string
  label: string
  passed: boolean
  suggestion?: string
}

export function PortalSEOHealth({ items }: { items: SEOItem[] }) {
  const passed = items.filter((i) => i.passed).length
  const total = items.length
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Public Profile SEO Health</CardTitle>
          <Badge variant={pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'error'}>
            {passed}/{total}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-2 bg-stone-200 rounded-full overflow-hidden mb-4">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.key} className="flex items-start gap-2">
              {item.passed ? (
                <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              )}
              <div>
                <p
                  className={`text-sm ${item.passed ? 'text-stone-600' : 'text-stone-900 font-medium'}`}
                >
                  {item.label}
                </p>
                {!item.passed && item.suggestion && (
                  <p className="text-xs text-stone-400 mt-0.5">{item.suggestion}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
