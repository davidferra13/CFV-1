// Pending Follow-Ups Widget — shows stale inquiries needing a nudge
// Dashboard placement: surfaces inquiries where the client has gone quiet

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Send } from '@/components/ui/icons'
import type { PendingFollowUp } from '@/lib/inquiries/follow-up-actions'

interface PendingFollowUpsWidgetProps {
  followUps: PendingFollowUp[]
}

export function PendingFollowUpsWidget({ followUps }: PendingFollowUpsWidgetProps) {
  if (followUps.length === 0) return null

  return (
    <Card className="border-amber-800/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4 text-amber-400" />
            Follow-Ups Due ({followUps.length})
          </CardTitle>
          <Link
            href="/inquiries?status=awaiting_client"
            className="text-xs text-brand-600 hover:text-brand-400"
          >
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {followUps.slice(0, 5).map((fu) => (
          <Link
            key={fu.inquiryId}
            href={`/inquiries/${fu.inquiryId}`}
            className="flex items-center justify-between rounded-lg border border-stone-700 px-3 py-2 hover:bg-stone-800 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-100 truncate">{fu.clientName}</p>
              <p className="text-xs text-stone-500 truncate">{fu.occasion || 'No occasion'}</p>
            </div>
            <Badge variant={fu.daysSinceLastOutbound >= 7 ? 'error' : 'warning'}>
              {fu.daysSinceLastOutbound}d quiet
            </Badge>
          </Link>
        ))}
        {followUps.length > 5 && (
          <p className="text-xs text-stone-500 text-center pt-1">+{followUps.length - 5} more</p>
        )}
      </CardContent>
    </Card>
  )
}
