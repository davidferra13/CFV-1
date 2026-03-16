// Wix Connection - setup, status, and recent submissions UI
// Follows the same pattern as components/settings/connected-accounts.tsx (Gmail)
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  setupWixConnection,
  disconnectWix,
  regenerateWixSecret,
  retryWixSubmission,
} from '@/lib/wix/actions'
import type { WixConnectionStatus, WixSubmission } from '@/lib/wix/types'

interface WixConnectionProps {
  connection: WixConnectionStatus
  recentSubmissions: WixSubmission[]
}

export function WixConnection({ connection, recentSubmissions }: WixConnectionProps) {
  const router = useRouter()
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl] = useState(connection.webhookUrl)
  const [copied, setCopied] = useState(false)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)

  const handleSetup = async () => {
    setConnecting(true)
    setError(null)
    try {
      const result = await setupWixConnection()
      setWebhookUrl(result.webhookUrl)
      router.refresh()
    } catch (err) {
      const e = err as Error
      setError(e.message)
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setShowDisconnectConfirm(false)
    setDisconnecting(true)
    setError(null)
    try {
      await disconnectWix()
      setWebhookUrl(null)
      router.refresh()
    } catch (err) {
      const e = err as Error
      setError(e.message)
    } finally {
      setDisconnecting(false)
    }
  }

  const handleRegenerate = async () => {
    setShowRegenerateConfirm(false)
    setRegenerating(true)
    setError(null)
    try {
      const result = await regenerateWixSecret()
      setWebhookUrl(result.webhookUrl)
      router.refresh()
    } catch (err) {
      const e = err as Error
      setError(e.message)
    } finally {
      setRegenerating(false)
    }
  }

  const handleRetry = async (submissionId: string) => {
    setRetrying(submissionId)
    setError(null)
    try {
      await retryWixSubmission(submissionId)
      router.refresh()
    } catch (err) {
      const e = err as Error
      setError(e.message)
    } finally {
      setRetrying(null)
    }
  }

  const copyUrl = async () => {
    if (!webhookUrl) return
    await navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WixLogo />
          Wix Integration
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        {!connection.connected ? (
          <>
            <p className="text-sm text-stone-400">
              Connect your Wix site to automatically capture form submissions as inquiries. When
              someone fills out a form on your Wix website, it creates an inquiry in ChefFlow.
            </p>
            <Button variant="primary" onClick={handleSetup} loading={connecting}>
              Connect Wix
            </Button>
          </>
        ) : (
          <>
            {/* Connection status */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">Connected</Badge>
                  <span className="text-sm text-stone-400">
                    {connection.totalSubmissions} submission
                    {connection.totalSubmissions !== 1 ? 's' : ''} received
                  </span>
                </div>
                {connection.lastSubmission && (
                  <p className="text-xs text-stone-500 mt-1">
                    Last submission: {new Date(connection.lastSubmission).toLocaleString()}
                  </p>
                )}
                {connection.errorCount > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    {connection.errorCount} error(s) in recent processing
                  </p>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDisconnectConfirm(true)}
                loading={disconnecting}
              >
                Disconnect
              </Button>
            </div>

            {/* Webhook URL */}
            <div className="bg-stone-800 border border-stone-700 rounded-lg p-3">
              <p className="text-xs font-medium text-stone-300 mb-1">Webhook URL</p>
              <p className="text-xs text-stone-500 mb-2">
                Paste this URL into your Wix Automation&apos;s HTTP Request action.
              </p>
              <div className="flex gap-2">
                <code className="flex-1 text-xs bg-stone-900 border border-stone-700 rounded px-2 py-1.5 overflow-x-auto whitespace-nowrap">
                  {webhookUrl}
                </code>
                <Button variant="secondary" size="sm" onClick={copyUrl}>
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => setShowRegenerateConfirm(true)}
                  disabled={regenerating}
                  className="text-xs text-stone-400 hover:text-stone-400 underline"
                >
                  {regenerating ? 'Regenerating...' : 'Regenerate secret'}
                </button>
              </div>
            </div>

            {/* Setup instructions */}
            <details className="text-sm">
              <summary className="text-stone-400 cursor-pointer hover:text-stone-200 font-medium">
                How to set up in Wix
              </summary>
              <ol className="mt-2 ml-4 space-y-1 text-xs text-stone-500 list-decimal">
                <li>Go to your Wix Dashboard &rarr; Automations</li>
                <li>Create a new automation</li>
                <li>Set the trigger to &ldquo;Form is submitted&rdquo;</li>
                <li>Add an action: &ldquo;Send an HTTP request&rdquo;</li>
                <li>
                  Set method to <strong>POST</strong>
                </li>
                <li>Paste the webhook URL above as the target URL</li>
                <li>Set body to &ldquo;Send entire trigger payload&rdquo;</li>
                <li>Save and activate the automation</li>
              </ol>
            </details>

            {/* Recent submissions */}
            {recentSubmissions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-stone-300 mb-2">Recent Submissions</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {recentSubmissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between text-xs border-b border-stone-800 py-1.5 last:border-0"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <StatusBadge status={sub.status} />
                        <span className="text-stone-400 truncate">
                          {sub.submitter_name || sub.submitter_email || 'Unknown'}
                          {sub.submitter_email && sub.submitter_name && (
                            <span className="text-stone-400"> ({sub.submitter_email})</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <span className="text-stone-400">
                          {new Date(sub.created_at).toLocaleDateString()}
                        </span>
                        {sub.status === 'failed' && (
                          <button
                            onClick={() => handleRetry(sub.id)}
                            disabled={retrying === sub.id}
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            {retrying === sub.id ? '...' : 'Retry'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      <ConfirmModal
        open={showDisconnectConfirm}
        title="Disconnect Wix?"
        description="New form submissions will no longer create inquiries automatically."
        confirmLabel="Disconnect"
        variant="danger"
        loading={disconnecting}
        onConfirm={handleDisconnect}
        onCancel={() => setShowDisconnectConfirm(false)}
      />

      <ConfirmModal
        open={showRegenerateConfirm}
        title="Regenerate webhook secret?"
        description="You will need to update the URL in Wix Automations."
        confirmLabel="Regenerate"
        variant="danger"
        loading={regenerating}
        onConfirm={handleRegenerate}
        onCancel={() => setShowRegenerateConfirm(false)}
      />
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-900 text-amber-700',
    processing: 'bg-blue-900 text-blue-700',
    completed: 'bg-emerald-900 text-emerald-700',
    failed: 'bg-red-900 text-red-600',
    duplicate: 'bg-stone-800 text-stone-400',
  }
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${colors[status] || 'bg-stone-800 text-stone-400'}`}
    >
      {status}
    </span>
  )
}

function WixLogo() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path
        d="M4.4 7.6c.4-.8 1-1.3 1.7-1.5.8-.2 1.5.1 1.9.5.5.5.7 1.2.8 2L10 15l2-6c.3-.9.8-1.6 1.5-2 .7-.3 1.4-.2 2 .2.5.4.9 1 1.1 1.8L18 15l1.2-6.4c.2-.8.5-1.5 1-2 .5-.4 1.1-.7 1.9-.5.7.2 1.3.7 1.7 1.5"
        stroke="#000"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
