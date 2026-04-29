import { requireChef } from '@/lib/auth/get-user'
import { loadRadarDataForChef, summarizeRadarMatches } from '@/lib/culinary-radar/read-model'
import { ListCard, type ListCardItem } from '@/components/dashboard/widget-cards/list-card'
import { WidgetCardError } from '@/components/dashboard/widget-cards/widget-card-shell'

function statusForSeverity(severity: string): ListCardItem['status'] {
  if (severity === 'critical') return 'red'
  if (severity === 'high') return 'amber'
  if (severity === 'medium') return 'blue'
  return 'stone'
}

export async function CulinaryRadarWidget() {
  const user = await requireChef()
  const overview = await loadRadarDataForChef(user.entityId, undefined, 5)

  if (!overview.success) {
    return <WidgetCardError widgetId="culinary" title="Culinary Radar" size="md" />
  }

  const summary = summarizeRadarMatches(overview.matches)
  const items: ListCardItem[] = overview.matches.slice(0, 5).map((match) => ({
    id: match.id,
    label: match.item.title,
    sublabel: `${match.severity} from ${match.item.sourceName}`,
    href: '/radar',
    status: statusForSeverity(match.severity),
  }))

  return (
    <ListCard
      widgetId="culinary"
      title="Culinary Radar"
      count={summary.unread || summary.total}
      items={items}
      href="/radar"
      emptyMessage="No relevant external culinary signals right now."
      emptyActionLabel="Open Radar"
      emptyActionHref="/radar"
    />
  )
}
