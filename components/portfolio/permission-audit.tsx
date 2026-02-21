'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type AuditEntry = {
  client_id: string
  display_name: string
  photo_permission: string | null
  nda_active: boolean
  event_count: number
}

const PERMISSION_BADGE: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  public_freely: 'success',
  public_with_approval: 'warning',
  portfolio_only: 'warning',
  none: 'error',
}

export function PermissionAudit({ entries }: { entries: AuditEntry[] }) {
  const restricted = entries.filter((e) => e.photo_permission === 'none' || !e.photo_permission)
  const total = entries.length

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-stone-700">Portfolio Permission Summary</p>
            <p className="text-sm text-stone-500">
              {restricted.length} of {total} clients restricted
            </p>
          </div>
          <div className="h-2 bg-stone-200 rounded-full overflow-hidden mt-2">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{
                width: total > 0 ? `${((total - restricted.length) / total) * 100}%` : '0%',
              }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {entries.map((entry) => (
          <Card key={entry.client_id}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-900">{entry.display_name}</p>
                  <p className="text-xs text-stone-500">
                    {entry.event_count} event{entry.event_count !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {entry.nda_active && <Badge variant="info">NDA</Badge>}
                  <Badge variant={PERMISSION_BADGE[entry.photo_permission ?? 'none'] ?? 'default'}>
                    {(entry.photo_permission ?? 'none').replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {entries.length === 0 && (
        <p className="text-center py-8 text-stone-400 text-sm">No clients with events to audit.</p>
      )}
    </div>
  )
}
