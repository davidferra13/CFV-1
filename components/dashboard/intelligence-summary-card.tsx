import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getInquiryTriage } from '@/lib/intelligence/inquiry-triage'
import { getPostEventTriggers } from '@/lib/intelligence/post-event-triggers'
import { getSchedulingIntelligence } from '@/lib/intelligence/smart-scheduling'

export async function IntelligenceSummaryCard() {
  // Fetch the three most actionable intelligence sources
  const [triage, postEvent, scheduling] = await Promise.all([
    getInquiryTriage().catch(() => null),
    getPostEventTriggers().catch(() => null),
    getSchedulingIntelligence().catch(() => null),
  ])

  const urgentInquiries = triage?.urgentCount ?? 0
  const overdueTasks = postEvent?.overdueCount ?? 0
  const schedulingWarnings =
    scheduling?.suggestions.filter((s) => s.severity === 'warning' || s.severity === 'critical')
      .length ?? 0
  const totalAlerts = urgentInquiries + overdueTasks + schedulingWarnings

  if (totalAlerts === 0 && !triage && !postEvent && !scheduling) {
    return null // Don't render widget if no intelligence data
  }

  return (
    <Link href="/intelligence" className="block">
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            Intelligence Hub
            {totalAlerts > 0 && (
              <Badge variant="error">
                {totalAlerts} alert{totalAlerts !== 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            {urgentInquiries > 0 && (
              <p className="text-red-600">
                {urgentInquiries} urgent inquir{urgentInquiries === 1 ? 'y' : 'ies'} need response
              </p>
            )}
            {overdueTasks > 0 && (
              <p className="text-amber-600">
                {overdueTasks} overdue post-event task{overdueTasks !== 1 ? 's' : ''}
              </p>
            )}
            {schedulingWarnings > 0 && (
              <p className="text-amber-600">
                {schedulingWarnings} scheduling warning{schedulingWarnings !== 1 ? 's' : ''}
              </p>
            )}
            {totalAlerts === 0 && (
              <p className="text-muted-foreground">All clear - view full intelligence dashboard</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
