import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { IntegrationEventSummary } from '@/lib/integrations/core/types'

type ProviderOverviewItem = {
  provider: string
  label: string
  category: 'website' | 'pos' | 'scheduling' | 'crm' | 'custom'
  supportsWebhook: boolean
  supportsPull: boolean
  supportsOAuth: boolean
  isConnected: boolean
  connectionCount: number
  errorCount: number
  lastSyncAt: string | null
  lastEventStatus: string | null
  lastEventAt: string | null
}

function statusVariant(status: string | null) {
  if (status === 'connected' || status === 'completed') return 'success' as const
  if (status === 'processing' || status === 'pending') return 'info' as const
  if (status === 'error' || status === 'failed') return 'error' as const
  return 'default' as const
}

function categoryTitle(category: ProviderOverviewItem['category']) {
  if (category === 'pos') return 'POS Systems'
  if (category === 'scheduling') return 'Scheduling Systems'
  if (category === 'crm') return 'Lead / CRM Systems'
  if (category === 'website') return 'Website Channels'
  return 'Custom Integrations'
}

const CATEGORY_ORDER: ProviderOverviewItem['category'][] = [
  'website',
  'pos',
  'scheduling',
  'crm',
  'custom',
]

export function IntegrationCenter({
  overview,
  recentEvents,
}: {
  overview: ProviderOverviewItem[]
  recentEvents: IntegrationEventSummary[]
}) {
  return (
    <div className="space-y-6">
      {CATEGORY_ORDER.map((category) => {
        const providers = overview.filter((item) => item.category === category)
        if (providers.length === 0) return null

        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{categoryTitle(category)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {providers.map((provider) => (
                <div
                  key={provider.provider}
                  className="flex items-start justify-between gap-3 rounded-lg border border-stone-200 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-stone-900">{provider.label}</p>
                      <Badge variant={provider.isConnected ? 'success' : 'default'}>
                        {provider.isConnected ? 'Connected' : 'Not connected'}
                      </Badge>
                      {provider.errorCount > 0 && (
                        <Badge variant="warning">{provider.errorCount} errors</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      {provider.supportsOAuth ? 'OAuth' : 'Manual auth'}
                      {' / '}
                      {provider.supportsWebhook ? 'Webhook ingest' : 'No webhook ingest'}
                      {' / '}
                      {provider.supportsPull ? 'Incremental pull' : 'No pull sync'}
                    </p>
                    {provider.lastSyncAt && (
                      <p className="mt-1 text-xs text-stone-400">
                        Last sync: {new Date(provider.lastSyncAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-xs text-stone-500">Connections: {provider.connectionCount}</p>
                    {provider.lastEventStatus && (
                      <Badge variant={statusVariant(provider.lastEventStatus)} className="mt-1">
                        {provider.lastEventStatus}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })}

      <Card>
        <CardHeader>
          <CardTitle>Recent Integration Events</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-stone-500">No integration events processed yet.</p>
          ) : (
            <div className="space-y-2">
              {recentEvents.slice(0, 20).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 px-4 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-900">
                      {event.provider} / {event.sourceEventType}
                    </p>
                    <p className="text-xs text-stone-500">
                      Received {new Date(event.receivedAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={statusVariant(event.status)}>{event.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
