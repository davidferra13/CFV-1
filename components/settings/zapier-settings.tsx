'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Trash2, Zap, Send, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { ZAPIER_EVENT_TYPES, type ZapierEventType } from '@/lib/integrations/zapier/zapier-webhooks'

type Subscription = {
  id: string
  target_url: string
  event_types: string[]
  is_active: boolean
  created_at: string
}

type Delivery = {
  id: string
  event_type: string
  response_status: number | null
  error: string | null
  delivered_at: string | null
  created_at: string
}

const EVENT_LABELS: Record<string, string> = {
  'inquiry.created': 'New Inquiry',
  'inquiry.updated': 'Inquiry Updated',
  'event.created': 'Event Created',
  'event.status_changed': 'Event Status Changed',
  'event.completed': 'Event Completed',
  'client.created': 'New Client',
  'client.updated': 'Client Updated',
  'payment.received': 'Payment Received',
  'payment.refunded': 'Payment Refunded',
  'invoice.created': 'Invoice Created',
  'invoice.sent': 'Invoice Sent',
  'quote.sent': 'Quote Sent',
  'quote.accepted': 'Quote Accepted',
  'contract.signed': 'Contract Signed',
  'expense.created': 'Expense Created',
  'review.received': 'Review Received',
  'task.completed': 'Task Completed',
}

export function ZapierSettings({ initialSubscriptions }: { initialSubscriptions: Subscription[] }) {
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions)
  const [isPending, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set(['inquiry.created']))
  const [expandedSub, setExpandedSub] = useState<string | null>(null)
  const [deliveries, setDeliveries] = useState<Record<string, Delivery[]>>({})

  function handleAdd() {
    if (!newUrl.trim()) {
      toast.error('Enter a webhook URL')
      return
    }

    startTransition(async () => {
      try {
        const { createWebhookSubscription } =
          await import('@/lib/integrations/zapier/zapier-webhooks')
        const result = await createWebhookSubscription({
          targetUrl: newUrl.trim(),
          eventTypes: Array.from(selectedEvents),
        })
        setSubscriptions((prev) => [
          {
            id: result.id,
            target_url: result.target_url,
            event_types: result.event_types,
            is_active: true,
            created_at: result.created_at,
          },
          ...prev,
        ])
        setNewUrl('')
        setSelectedEvents(new Set(['inquiry.created']))
        setShowAdd(false)
        toast.success('Webhook subscription created')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create subscription')
      }
    })
  }

  function handleDelete(id: string) {
    const prev = subscriptions
    setSubscriptions((s) => s.filter((sub) => sub.id !== id))

    startTransition(async () => {
      try {
        const { deleteWebhookSubscription } =
          await import('@/lib/integrations/zapier/zapier-webhooks')
        await deleteWebhookSubscription(id)
        toast.success('Subscription removed')
      } catch {
        setSubscriptions(prev)
        toast.error('Failed to remove subscription')
      }
    })
  }

  function handleTest(id: string) {
    startTransition(async () => {
      try {
        const { testWebhookSubscription } =
          await import('@/lib/integrations/zapier/zapier-webhooks')
        const result = await testWebhookSubscription(id)
        if (result.success) {
          toast.success(`Test ping sent — HTTP ${result.status}`)
        } else {
          toast.error(`Test ping failed — HTTP ${result.status}`)
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Test failed')
      }
    })
  }

  async function handleToggleExpand(id: string) {
    if (expandedSub === id) {
      setExpandedSub(null)
      return
    }
    setExpandedSub(id)
    if (!deliveries[id]) {
      try {
        const { getRecentDeliveries } = await import('@/lib/integrations/zapier/zapier-webhooks')
        const result = await getRecentDeliveries(id, 10)
        setDeliveries((prev) => ({ ...prev, [id]: result }))
      } catch {
        toast.error('Failed to load delivery log')
      }
    }
  }

  function toggleEvent(event: string) {
    setSelectedEvents((prev) => {
      const next = new Set(prev)
      if (next.has(event)) {
        if (next.size > 1) next.delete(event)
      } else {
        next.add(event)
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-brand-400" />
              <CardTitle>Webhook Subscriptions</CardTitle>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAdd(!showAdd)}
              disabled={isPending}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Webhook
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-stone-400">
            Add webhook URLs from Zapier, Make, or any automation platform. ChefFlow will POST
            events to these URLs in real-time when things happen in your account.
          </p>

          {showAdd && (
            <div className="rounded-lg border border-brand-700 bg-stone-900 p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-stone-400 mb-1 block">Webhook URL</label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-400 mb-2 block">
                  Events to Send
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ZAPIER_EVENT_TYPES.map((event) => (
                    <button
                      key={event}
                      type="button"
                      onClick={() => toggleEvent(event)}
                      className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                        selectedEvents.has(event)
                          ? 'bg-brand-500/20 border-brand-500 text-brand-300'
                          : 'border-stone-700 text-stone-500 hover:border-stone-500'
                      }`}
                    >
                      {EVENT_LABELS[event] || event}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={handleAdd} disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Plus className="h-3.5 w-3.5 mr-1" />
                  )}
                  Create Subscription
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {subscriptions.length === 0 ? (
            <p className="text-sm text-stone-500 py-4 text-center">
              No webhook subscriptions yet. Add one to start automating.
            </p>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="rounded-lg border border-stone-700 overflow-hidden">
                  <div className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleExpand(sub.id)}
                          className="text-stone-500 hover:text-stone-300"
                        >
                          {expandedSub === sub.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        <Badge variant={sub.is_active ? 'success' : 'default'}>
                          {sub.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-xs text-stone-400 mt-1 break-all">{sub.target_url}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {sub.event_types.map((event) => (
                          <span
                            key={event}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-400"
                          >
                            {EVENT_LABELS[event] || event}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTest(sub.id)}
                        disabled={isPending}
                        title="Send test ping"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(sub.id)}
                        disabled={isPending}
                        className="text-stone-500 hover:text-red-400"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {expandedSub === sub.id && (
                    <div className="border-t border-stone-700 bg-stone-900/50 px-4 py-3">
                      <p className="text-xs font-medium text-stone-400 mb-2">Recent Deliveries</p>
                      {!deliveries[sub.id] ? (
                        <p className="text-xs text-stone-500">Loading...</p>
                      ) : deliveries[sub.id].length === 0 ? (
                        <p className="text-xs text-stone-500">No deliveries yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {deliveries[sub.id].map((d) => (
                            <div key={d.id} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    d.response_status && d.response_status < 400
                                      ? 'success'
                                      : d.error
                                        ? 'error'
                                        : 'default'
                                  }
                                >
                                  {d.response_status || 'err'}
                                </Badge>
                                <span className="text-stone-400">
                                  {EVENT_LABELS[d.event_type] || d.event_type}
                                </span>
                              </div>
                              <span className="text-stone-600">
                                {new Date(d.created_at).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
