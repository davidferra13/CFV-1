// Client Intake Panel - Shows intake responses for a specific client
// Displays on the client detail page with "Send Intake Form" and "Apply to Profile" actions

'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { format } from 'date-fns'
import type { IntakeForm, IntakeResponse } from '@/lib/clients/intake-types'
import { sendIntakeForm, applyIntakeToClient } from '@/lib/clients/intake-actions'

interface Props {
  clientId: string
  clientName: string
  clientEmail?: string
  forms: IntakeForm[]
  responses: (IntakeResponse & { form_name?: string })[]
}

export function ClientIntakePanel({
  clientId,
  clientName,
  clientEmail,
  forms,
  responses: initialResponses,
}: Props) {
  const [responses, setResponses] = useState(initialResponses)
  const [showSend, setShowSend] = useState(false)
  const [selectedFormId, setSelectedFormId] = useState(forms[0]?.id || '')
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null)

  function handleSendForm() {
    if (!selectedFormId) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await sendIntakeForm({
          formId: selectedFormId,
          clientId,
          clientEmail: clientEmail || undefined,
          clientName,
        })
        setShareUrl(result.shareUrl)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate link')
      }
    })
  }

  function handleApply(responseId: string) {
    setError(null)
    const previousResponses = [...responses]
    setResponses((prev) =>
      prev.map((r) => (r.id === responseId ? { ...r, applied_at: new Date().toISOString() } : r))
    )
    startTransition(async () => {
      try {
        await applyIntakeToClient(responseId, clientId)
      } catch (err) {
        setResponses(previousResponses)
        setError(err instanceof Error ? err.message : 'Failed to apply response')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Intake Forms</CardTitle>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setShowSend(!showSend)
              setShareUrl(null)
            }}
          >
            {showSend ? 'Cancel' : 'Send Intake Form'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Send form UI */}
        {showSend && (
          <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-3">
            {shareUrl ? (
              <div className="space-y-2">
                <p className="text-sm text-green-700 font-medium">Link generated.</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-mono text-stone-700"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigator.clipboard.writeText(shareUrl)}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-stone-500">Valid for 30 days, single use.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Select
                  label="Choose a form"
                  value={selectedFormId}
                  onChange={(e) => setSelectedFormId(e.target.value)}
                  options={forms.map((f) => ({ value: f.id, label: f.name }))}
                />
                <Button size="sm" onClick={handleSendForm} loading={pending}>
                  Generate Link
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Responses list */}
        {responses.length === 0 ? (
          <p className="text-sm text-stone-500">No intake responses yet.</p>
        ) : (
          <div className="divide-y divide-stone-100">
            {responses.map((r) => (
              <div key={r.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-900">
                      {r.form_name || 'Intake Form'}
                    </p>
                    <p className="text-xs text-stone-500">
                      {format(new Date(r.submitted_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.applied_at ? (
                      <Badge variant="success">Applied</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleApply(r.id)}
                        loading={pending}
                      >
                        Apply to Profile
                      </Button>
                    )}
                    <button
                      type="button"
                      className="text-xs text-brand-600 hover:text-brand-700"
                      onClick={() => setExpandedResponse(expandedResponse === r.id ? null : r.id)}
                    >
                      {expandedResponse === r.id ? 'Hide' : 'View'}
                    </button>
                  </div>
                </div>
                {expandedResponse === r.id && (
                  <div className="mt-3 p-3 rounded-lg bg-stone-50 text-sm space-y-2">
                    {Object.entries(r.responses as Record<string, unknown>).map(([key, val]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-stone-500 font-medium min-w-[120px]">{key}:</span>
                        <span className="text-stone-900">
                          {Array.isArray(val) ? val.join(', ') : String(val || '')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
