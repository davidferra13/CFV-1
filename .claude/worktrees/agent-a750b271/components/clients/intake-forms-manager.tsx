// Intake Forms Manager - Client component for managing intake forms
// Handles: form list, create/edit modal, send link, view responses

'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import type { IntakeForm, IntakeFormField, IntakeResponse } from '@/lib/clients/intake-types'
import { MAPPABLE_CLIENT_FIELDS } from '@/lib/clients/intake-types'
import {
  createIntakeForm,
  updateIntakeForm,
  deleteIntakeForm,
  sendIntakeForm,
} from '@/lib/clients/intake-actions'
import { IntakeFormBuilder } from './intake-form-builder'
import { IntakeFormPreview } from './intake-form-preview'

interface Props {
  forms: IntakeForm[]
  responses: (IntakeResponse & { form_name?: string })[]
}

type View = 'list' | 'create' | 'edit' | 'preview' | 'responses' | 'send'

export function IntakeFormsManager({ forms: initialForms, responses: initialResponses }: Props) {
  const [forms, setForms] = useState(initialForms)
  const [responses] = useState(initialResponses)
  const [view, setView] = useState<View>('list')
  const [activeForm, setActiveForm] = useState<IntakeForm | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [shareResult, setShareResult] = useState<{ shareUrl: string } | null>(null)
  const [sendEmail, setSendEmail] = useState('')
  const [sendName, setSendName] = useState('')

  function handleCreate() {
    setActiveForm(null)
    setView('create')
    setError(null)
  }

  function handleEdit(form: IntakeForm) {
    setActiveForm(form)
    setView('edit')
    setError(null)
  }

  function handlePreview(form: IntakeForm) {
    setActiveForm(form)
    setView('preview')
  }

  function handleSendView(form: IntakeForm) {
    setActiveForm(form)
    setShareResult(null)
    setSendEmail('')
    setSendName('')
    setView('send')
    setError(null)
  }

  function handleSaveForm(name: string, description: string, fields: IntakeFormField[]) {
    setError(null)
    const previousForms = [...forms]
    startTransition(async () => {
      try {
        if (view === 'edit' && activeForm) {
          const updated = await updateIntakeForm(activeForm.id, { name, description, fields })
          setForms((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
        } else {
          const created = await createIntakeForm({ name, description, fields })
          setForms((prev) => [created, ...prev])
        }
        setView('list')
      } catch (err) {
        setForms(previousForms)
        setError(err instanceof Error ? err.message : 'Failed to save form')
      }
    })
  }

  function handleDelete(formId: string) {
    if (!confirm('Delete this form template? Existing responses will be preserved.')) return
    const previousForms = [...forms]
    setForms((prev) => prev.filter((f) => f.id !== formId))
    startTransition(async () => {
      try {
        await deleteIntakeForm(formId)
      } catch (err) {
        setForms(previousForms)
        setError(err instanceof Error ? err.message : 'Failed to delete form')
      }
    })
  }

  function handleSend() {
    if (!activeForm) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await sendIntakeForm({
          formId: activeForm.id,
          clientEmail: sendEmail || undefined,
          clientName: sendName || undefined,
        })
        setShareResult(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create share link')
      }
    })
  }

  // ---------- Render ----------

  if (view === 'create' || view === 'edit') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setView('list')}>
          &larr; Back to Forms
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <IntakeFormBuilder
          initialForm={activeForm || undefined}
          onSave={handleSaveForm}
          onCancel={() => setView('list')}
          saving={pending}
        />
      </div>
    )
  }

  if (view === 'preview' && activeForm) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setView('list')}>
          &larr; Back to Forms
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Preview: {activeForm.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <IntakeFormPreview fields={activeForm.fields} />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (view === 'send' && activeForm) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setView('list')}>
          &larr; Back to Forms
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Send: {activeForm.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {shareResult ? (
              <div className="space-y-3">
                <p className="text-sm text-green-700 font-medium">Share link created.</p>
                <div className="flex items-center gap-2">
                  <Input value={shareResult.shareUrl} readOnly className="font-mono text-xs" />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(shareResult.shareUrl)
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-stone-500">
                  This link is valid for 30 days and can only be submitted once.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-stone-600">
                  Generate a shareable link for this intake form. Optionally pre-fill the client's
                  name and email.
                </p>
                <Input
                  label="Client Name (optional)"
                  value={sendName}
                  onChange={(e) => setSendName(e.target.value)}
                  placeholder="Jane Doe"
                />
                <Input
                  label="Client Email (optional)"
                  value={sendEmail}
                  onChange={(e) => setSendEmail(e.target.value)}
                  placeholder="jane@example.com"
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button onClick={handleSend} loading={pending}>
                  Generate Share Link
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (view === 'responses') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setView('list')}>
          &larr; Back to Forms
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>All Responses ({responses.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {responses.length === 0 ? (
              <p className="text-sm text-stone-500">No responses yet.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {responses.map((r) => (
                  <div key={r.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-stone-900">
                        {r.client_name || r.client_email || 'Anonymous'}
                      </p>
                      <p className="text-xs text-stone-500">
                        {r.form_name} - {format(new Date(r.submitted_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.applied_at ? (
                        <Badge variant="success">Applied</Badge>
                      ) : (
                        <Badge variant="default">Pending</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Default: List view
  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Actions bar */}
      <div className="flex items-center gap-3">
        <Button onClick={handleCreate}>+ New Form</Button>
        <Button variant="secondary" onClick={() => setView('responses')}>
          View Responses ({responses.length})
        </Button>
      </div>

      {/* Forms grid */}
      {forms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-500">No intake forms yet. Create your first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => {
            const formResponses = responses.filter((r) => r.form_id === form.id)
            return (
              <Card key={form.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{form.name}</CardTitle>
                      {form.is_default && (
                        <Badge variant="info" className="mt-1">
                          Template
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-stone-400">{form.fields.length} fields</span>
                  </div>
                </CardHeader>
                {form.description && (
                  <CardContent className="pt-0 pb-2">
                    <p className="text-sm text-stone-500 line-clamp-2">{form.description}</p>
                  </CardContent>
                )}
                <CardFooter className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" onClick={() => handleSendView(form)}>
                    Send
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handlePreview(form)}>
                    Preview
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(form)}>
                    Edit
                  </Button>
                  {!form.is_default && (
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(form.id)}>
                      Delete
                    </Button>
                  )}
                  {formResponses.length > 0 && (
                    <span className="text-xs text-stone-400 ml-auto">
                      {formResponses.length} response{formResponses.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
