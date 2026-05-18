// New Contract Form - Client Component
// Interactive form for creating standalone contracts with clause composition.

'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Eye,
  FileText,
  Plus,
  Trash2,
  X,
} from '@/components/ui/icons'
import Link from 'next/link'
import { createStandaloneContract } from '@/lib/contracts/actions'

type ClientOption = { id: string; name: string }
type TemplateOption = { id: string; name: string; body: string; isDefault: boolean }
type EventOption = { id: string; label: string }
type ClauseOption = {
  id: string
  title: string
  body: string
  category: string
  isDefault: boolean
  sortOrder: number
}

type ClauseDraft = {
  id: string
  sourceId?: string
  title: string
  body: string
  category: string
  enabled: boolean
  isDefault: boolean
  isCustom: boolean
}

type Props = {
  clients: ClientOption[]
  templates: TemplateOption[]
  events: EventOption[]
  clauses: ClauseOption[]
}

const CATEGORY_LABELS: Record<string, string> = {
  cancellation: 'Cancellation',
  reschedule: 'Reschedule',
  liability: 'Liability',
  kitchen: 'Kitchen',
  ip: 'Intellectual Property',
  confidentiality: 'Confidentiality',
  force_majeure: 'Force Majeure',
  dispute: 'Dispute',
  payment: 'Payment',
  scope: 'Scope',
  custom: 'Custom',
}

function newCustomId() {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function stripMarkdown(body: string) {
  return body
    .replace(/[#*_`>-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildInitialClauses(clauses: ClauseOption[]): ClauseDraft[] {
  return [...clauses]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
    .map((clause) => ({
      id: clause.id,
      sourceId: clause.id,
      title: clause.title,
      body: clause.body,
      category: clause.category,
      enabled: clause.isDefault,
      isDefault: clause.isDefault,
      isCustom: false,
    }))
}

export function NewContractForm({ clients, templates, events, clauses }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const defaultTemplate = templates.find((t) => t.isDefault)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplate?.id ?? '')
  const [selectedEventId, setSelectedEventId] = useState('')
  const [clauseDrafts, setClauseDrafts] = useState<ClauseDraft[]>(() =>
    buildInitialClauses(clauses)
  )
  const [showPreview, setShowPreview] = useState(true)
  const [customTitle, setCustomTitle] = useState('')
  const [customBody, setCustomBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)
  const selectedClient = clients.find((c) => c.id === selectedClientId)
  const enabledClauses = clauseDrafts.filter((clause) => clause.enabled)

  const composedBody = useMemo(() => {
    const sections: string[] = []
    if (selectedTemplate?.body) sections.push(selectedTemplate.body.trim())
    for (const clause of enabledClauses) {
      if (clause.body.trim()) sections.push(clause.body.trim())
    }
    return sections.join('\n\n---\n\n')
  }, [enabledClauses, selectedTemplate])

  const previewBody = composedBody.replace(
    /\{\{client_name\}\}/g,
    selectedClient?.name ?? '{{client_name}}'
  )

  const canSubmit = Boolean(selectedClientId && composedBody.trim())

  function setClauseEnabled(id: string, enabled: boolean) {
    setClauseDrafts((current) =>
      current.map((clause) => (clause.id === id ? { ...clause, enabled } : clause))
    )
  }

  function moveClause(id: string, direction: -1 | 1) {
    setClauseDrafts((current) => {
      const index = current.findIndex((clause) => clause.id === id)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current
      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(nextIndex, 0, item)
      return next
    })
  }

  function removeClause(id: string) {
    setClauseDrafts((current) =>
      current
        .filter((clause) => clause.id !== id || !clause.isCustom)
        .map((clause) => (clause.id === id ? { ...clause, enabled: false } : clause))
    )
  }

  function addCustomClause() {
    const title = customTitle.trim()
    const body = customBody.trim()
    if (!title || !body) {
      setError('Add a title and body before adding a custom clause.')
      return
    }
    setClauseDrafts((current) => [
      ...current,
      {
        id: newCustomId(),
        title,
        body,
        category: 'custom',
        enabled: true,
        isDefault: false,
        isCustom: true,
      },
    ])
    setCustomTitle('')
    setCustomBody('')
    setError(null)
  }

  function handleSubmit() {
    if (!canSubmit) return
    setError(null)

    startTransition(async () => {
      const result = await createStandaloneContract({
        client_id: selectedClientId,
        template_id: selectedTemplateId || undefined,
        event_id: selectedEventId || undefined,
        body_markdown: composedBody,
      })

      if (!result.success) {
        setError(result.error ?? 'Failed to create contract')
        return
      }

      router.push('/contracts')
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/contracts">
          <Button variant="ghost" size="sm" tooltip="Back to contracts">
            <ArrowLeft size={16} />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-100">New Contract</h1>
          <p className="mt-0.5 text-sm text-stone-400">
            Create a service agreement from templates and reusable clauses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-5 py-6">
              <div className="grid gap-4 md:grid-cols-2">
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
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-300">
                    Link to Event <span className="text-stone-500">(optional)</span>
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">No event</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-stone-300">Base Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">No base template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} {template.isDefault ? '(Default)' : ''}
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
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 py-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-stone-100">Clauses</h2>
                  <p className="text-sm text-stone-400">
                    Default clauses are included. Toggle, remove, and reorder before creating.
                  </p>
                </div>
                <Badge variant="info">{enabledClauses.length} active</Badge>
              </div>

              {clauseDrafts.length === 0 ? (
                <div className="rounded-lg border border-stone-700 bg-stone-800/30 p-4 text-sm text-stone-400">
                  No clauses in your library yet. Add a custom clause below or manage the clause
                  library.
                </div>
              ) : (
                <div className="space-y-3">
                  {clauseDrafts.map((clause, index) => (
                    <div
                      key={clause.id}
                      className={`rounded-lg border p-3 ${
                        clause.enabled
                          ? 'border-brand-500/40 bg-brand-500/5'
                          : 'border-stone-700 bg-stone-800/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={clause.enabled}
                          onChange={(event) => setClauseEnabled(clause.id, event.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-stone-600 bg-stone-900 text-brand-600 focus:ring-brand-500 focus:ring-offset-stone-900"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-stone-100">{clause.title}</p>
                            <Badge>{CATEGORY_LABELS[clause.category] ?? clause.category}</Badge>
                            {clause.isDefault && <Badge variant="success">Default</Badge>}
                            {clause.isCustom && <Badge variant="info">Custom</Badge>}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-400">
                            {stripMarkdown(clause.body)}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => moveClause(clause.id, -1)}
                            disabled={index === 0}
                            tooltip="Move up"
                          >
                            <ArrowUp size={15} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => moveClause(clause.id, 1)}
                            disabled={index === clauseDrafts.length - 1}
                            tooltip="Move down"
                          >
                            <ArrowDown size={15} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeClause(clause.id)}
                            tooltip={clause.isCustom ? 'Remove clause' : 'Remove from contract'}
                          >
                            {clause.isCustom ? <Trash2 size={15} /> : <X size={15} />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
                <h3 className="text-sm font-semibold text-stone-200">Add Custom Clause</h3>
                <div className="mt-3 space-y-3">
                  <input
                    value={customTitle}
                    onChange={(event) => setCustomTitle(event.target.value)}
                    placeholder="Clause title"
                    className="w-full rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500"
                  />
                  <textarea
                    value={customBody}
                    onChange={(event) => setCustomBody(event.target.value)}
                    placeholder="Clause body"
                    rows={5}
                    className="w-full resize-y rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm leading-6 text-stone-100 outline-none focus:border-brand-500"
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={addCustomClause}>
                    <Plus size={16} />
                    Add Clause
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardContent className="space-y-4 py-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-stone-100">Preview</h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview((current) => !current)}
                  disabled={!composedBody}
                >
                  <Eye size={16} />
                  {showPreview ? 'Hide' : 'Show'}
                </Button>
              </div>

              {showPreview ? (
                <div className="max-h-[620px] overflow-y-auto rounded-lg border border-stone-700 bg-stone-950 p-4">
                  {previewBody ? (
                    <div className="whitespace-pre-wrap text-sm leading-6 text-stone-300">
                      {previewBody}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-stone-500">
                      Select a template or clause to preview the contract.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-stone-500">Preview hidden.</p>
              )}

              {error && (
                <div className="rounded-md border border-red-800 bg-red-950/30 px-3 py-2">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!canSubmit || isPending}
                loading={isPending}
                className="w-full"
              >
                <FileText size={16} />
                Create Draft
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
