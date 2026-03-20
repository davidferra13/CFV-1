'use client'

import { useState, useTransition, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Trash2,
  Play,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Clock,
  Check,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
} from '@/components/ui/icons'
import { toast } from 'sonner'
import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  updateWebhookEndpoint,
  testWebhookEndpoint,
  getWebhookDeliveryLog,
} from '@/lib/webhooks/actions'
import { useConfirm } from '@/lib/hooks/use-confirm'
import {
  ALL_WEBHOOK_EVENT_TYPES,
  WEBHOOK_EVENT_LABELS,
  type WebhookSubscription,
  type DeliveryLogEntry,
} from '@/lib/webhooks/types'

interface Props {
  initialEndpoints: WebhookSubscription[]
}

export function WebhookSettings({ initialEndpoints }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['event.created'])
  const [isPending, startTransition] = useTransition()
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [secretVisible, setSecretVisible] = useState(false)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [deliveryLogs, setDeliveryLogs] = useState<Record<string, DeliveryLogEntry[]>>({})
  const [testResults, setTestResults] = useState<
    Record<
      string,
      { success: boolean; status: number | null; durationMs: number; error?: string } | null
    >
  >({})
  const { confirm, ConfirmDialog } = useConfirm()

  function toggleEvent(e: string) {
    setSelectedEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]))
  }

  function handleAdd() {
    if (!url.trim()) return toast.error('URL is required')
    if (selectedEvents.length === 0) return toast.error('Select at least one event type')
    try {
      new URL(url)
    } catch {
      return toast.error('Invalid URL')
    }
    startTransition(async () => {
      try {
        const result = await createWebhookEndpoint({ url, description, events: selectedEvents })
        setNewSecret(result.secret)
        setSecretVisible(true)
        toast.success(
          'Webhook endpoint created. Copy the signing secret now - it will not be shown again.'
        )
        setUrl('')
        setDescription('')
        setSelectedEvents(['event.created'])
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Delete this webhook endpoint?',
      description: 'External systems listening on this endpoint will stop receiving events.',
      confirmLabel: 'Delete Endpoint',
      variant: 'danger',
    })
    if (!ok) return
    startTransition(async () => {
      try {
        await deleteWebhookEndpoint(id)
        toast.success('Endpoint deleted')
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  function handleToggleActive(id: string, currentlyActive: boolean) {
    startTransition(async () => {
      try {
        await updateWebhookEndpoint(id, { is_active: !currentlyActive })
        toast.success(currentlyActive ? 'Endpoint paused' : 'Endpoint activated')
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  function handleTest(id: string) {
    setTestResults((prev) => ({ ...prev, [id]: null }))
    startTransition(async () => {
      try {
        const result = await testWebhookEndpoint(id)
        setTestResults((prev) => ({ ...prev, [id]: result }))
        if (result.success) {
          toast.success(`Test successful (${result.durationMs}ms)`)
        } else {
          toast.error(`Test failed: ${result.error || `HTTP ${result.status}`}`)
        }
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  const loadDeliveryLog = useCallback(
    (subscriptionId: string) => {
      if (expandedLog === subscriptionId) {
        setExpandedLog(null)
        return
      }
      setExpandedLog(subscriptionId)
      startTransition(async () => {
        try {
          const logs = await getWebhookDeliveryLog(subscriptionId, 20)
          setDeliveryLogs((prev) => ({ ...prev, [subscriptionId]: logs }))
        } catch (err: any) {
          toast.error('Failed to load delivery log')
        }
      })
    },
    [expandedLog]
  )

  function copySecret(secret: string) {
    navigator.clipboard.writeText(secret)
    toast.success('Secret copied to clipboard')
  }

  return (
    <div className="space-y-4">
      <ConfirmDialog />

      {/* Header */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-stone-400">
          {initialEndpoints.length} endpoint{initialEndpoints.length !== 1 ? 's' : ''} configured
        </p>
        <Button
          size="sm"
          onClick={() => {
            setShowForm(!showForm)
            setNewSecret(null)
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Endpoint
        </Button>
      </div>

      {/* New secret display (shown once after creation) */}
      {newSecret && (
        <Card className="border-amber-600/50 bg-amber-950/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-200">
                  Signing secret (copy now, shown only once)
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="text-xs bg-stone-900 px-2 py-1 rounded font-mono text-stone-200 break-all">
                    {secretVisible ? newSecret : '••••••••••••••••••••••••••••••••'}
                  </code>
                  <button
                    onClick={() => setSecretVisible(!secretVisible)}
                    className="text-stone-400 hover:text-stone-200"
                  >
                    {secretVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => copySecret(newSecret)}
                    className="text-stone-400 hover:text-stone-200"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setNewSecret(null)}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Webhook Endpoint</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">
                Endpoint URL *
              </label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-app.com/webhooks/chefflow"
                className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-stone-900 text-stone-100"
              />
              <p className="text-xs text-stone-500 mt-1">
                Must be HTTPS. Private/local IPs are blocked.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this endpoint do?"
                className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-stone-900 text-stone-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">
                Events to Subscribe
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_WEBHOOK_EVENT_TYPES.map((e) => (
                  <button
                    key={e}
                    onClick={() => toggleEvent(e)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selectedEvents.includes(e)
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-stone-900 text-stone-300 border-stone-600 hover:border-brand-400'
                    }`}
                  >
                    {WEBHOOK_EVENT_LABELS[e] || e}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} loading={isPending}>
                Create Endpoint
              </Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {initialEndpoints.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-500">No webhook endpoints configured yet.</p>
            <p className="text-stone-600 text-sm mt-1">
              Webhooks let you push ChefFlow events to external systems in real time.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Endpoint list */}
      {initialEndpoints.map((ep) => (
        <Card key={ep.id}>
          <CardContent className="py-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-100 font-mono text-sm truncate">{ep.url}</p>
                {ep.description && (
                  <p className="text-sm text-stone-500 mt-0.5">{ep.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={ep.is_active ? 'success' : 'error'}>
                  {ep.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {ep.failure_count > 0 && (
                  <Badge variant="warning">
                    {ep.failure_count} failure{ep.failure_count !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>

            {/* Event type badges */}
            <div className="flex flex-wrap gap-1">
              {ep.events?.map((e) => (
                <Badge key={e} variant="default">
                  {WEBHOOK_EVENT_LABELS[e as keyof typeof WEBHOOK_EVENT_LABELS] || e}
                </Badge>
              ))}
            </div>

            {/* Last triggered */}
            {ep.last_triggered_at && (
              <p className="text-xs text-stone-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last triggered: {new Date(ep.last_triggered_at).toLocaleString()}
              </p>
            )}

            {/* Test result */}
            {testResults[ep.id] !== undefined && testResults[ep.id] !== null && (
              <div
                className={`text-xs px-3 py-2 rounded ${
                  testResults[ep.id]!.success
                    ? 'bg-emerald-950/40 text-emerald-300'
                    : 'bg-red-950/40 text-red-300'
                }`}
              >
                {testResults[ep.id]!.success ? (
                  <span className="flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Test ping delivered ({testResults[ep.id]!.durationMs}ms)
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Test failed: {testResults[ep.id]!.error || `HTTP ${testResults[ep.id]!.status}`}
                  </span>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleTest(ep.id)}
                disabled={isPending}
              >
                <Play className="h-4 w-4 mr-1" />
                Test
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleToggleActive(ep.id, ep.is_active)}
                disabled={isPending}
              >
                {ep.is_active ? (
                  <>
                    <ToggleRight className="h-4 w-4 mr-1" /> Pause
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-4 w-4 mr-1" /> Enable
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => loadDeliveryLog(ep.id)}
                disabled={isPending}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                {expandedLog === ep.id ? 'Hide Log' : 'Delivery Log'}
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleDelete(ep.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Delivery log */}
            {expandedLog === ep.id && (
              <div className="border-t border-stone-700 pt-3 mt-2">
                <p className="text-xs font-medium text-stone-400 mb-2">Recent Deliveries</p>
                {!deliveryLogs[ep.id] || deliveryLogs[ep.id].length === 0 ? (
                  <p className="text-xs text-stone-600">No deliveries recorded yet.</p>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {deliveryLogs[ep.id].map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded bg-stone-900/50"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              log.success ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          />
                          <span className="text-stone-300 font-mono">{log.event_type}</span>
                        </div>
                        <div className="flex items-center gap-3 text-stone-500">
                          {log.response_status && <span>HTTP {log.response_status}</span>}
                          {log.duration_ms != null && <span>{log.duration_ms}ms</span>}
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
