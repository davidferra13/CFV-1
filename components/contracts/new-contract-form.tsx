// New Contract Form - Client Component
// Interactive form for creating standalone contracts.
// Allows selecting client, template, optional event, and previewing the rendered body.

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Eye, FileText } from '@/components/ui/icons'
import Link from 'next/link'
import { createStandaloneContract } from '@/lib/contracts/actions'

type ClientOption = { id: string; name: string }
type TemplateOption = { id: string; name: string; body: string; isDefault: boolean }
type EventOption = { id: string; label: string }

type Props = {
  clients: ClientOption[]
  templates: TemplateOption[]
  events: EventOption[]
}

export function NewContractForm({ clients, templates, events }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const defaultTemplate = templates.find((t) => t.isDefault)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplate?.id ?? '')
  const [selectedEventId, setSelectedEventId] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)
  const selectedClient = clients.find((c) => c.id === selectedClientId)

  // Basic merge field preview (client_name only for standalone)
  const previewBody = selectedTemplate
    ? selectedTemplate.body.replace(
        /\{\{client_name\}\}/g,
        selectedClient?.name ?? '{{client_name}}'
      )
    : ''

  const canSubmit = selectedClientId && selectedTemplateId

  function handleSubmit() {
    if (!canSubmit) return
    setError(null)

    startTransition(async () => {
      try {
        await createStandaloneContract({
          client_id: selectedClientId,
          template_id: selectedTemplateId,
          event_id: selectedEventId || undefined,
        })
        router.push('/contracts')
      } catch (err: any) {
        setError(err?.message ?? 'Failed to create contract')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/contracts">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-100">New Contract</h1>
          <p className="text-stone-400 text-sm mt-0.5">Create a standalone service agreement</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardContent className="py-6 space-y-5">
            {/* Client Select */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-300">
                Client <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select a client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Template Select */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-300">
                Template <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select a template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
              {templates.length === 0 && (
                <p className="text-xs text-stone-500">
                  No templates found.{' '}
                  <Link href="/settings/contracts" className="text-brand-400 hover:underline">
                    Create one
                  </Link>
                </p>
              )}
            </div>

            {/* Event Select (optional) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-300">
                Link to Event <span className="text-stone-500">(optional)</span>
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">No event (general agreement)</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-md border border-red-800 bg-red-950/30 px-3 py-2">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit || isPending}>
                <FileText size={16} className="mr-1.5" />
                {isPending ? 'Creating...' : 'Create Draft'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowPreview(!showPreview)}
                disabled={!selectedTemplateId}
              >
                <Eye size={16} className="mr-1.5" />
                {showPreview ? 'Hide Preview' : 'Preview'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        {showPreview && selectedTemplate && (
          <Card>
            <CardContent className="py-6">
              <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wide mb-3">
                Contract Preview
              </h3>
              <div className="prose prose-invert prose-sm max-w-none text-stone-300 whitespace-pre-wrap">
                {previewBody}
              </div>
            </CardContent>
          </Card>
        )}

        {!showPreview && (
          <div className="hidden lg:flex items-center justify-center">
            <div className="text-center text-stone-500 space-y-2">
              <FileText size={48} className="mx-auto opacity-30" />
              <p className="text-sm">
                Select a template and click Preview to see the contract body
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
