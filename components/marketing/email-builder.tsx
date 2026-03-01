'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Edit2, Trash2, Eye, X, Mail } from 'lucide-react'
import { saveEmailTemplate, deleteEmailTemplate } from '@/lib/marketing/email-template-actions'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailTemplate {
  id: string
  name: string
  subject: string
  bodyHtml: string
  category?: string | null
}

interface EmailBuilderProps {
  templates: EmailTemplate[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: '', label: 'No Category' },
  { value: 'welcome', label: 'Welcome' },
  { value: 'follow_up', label: 'Follow-Up' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'event_reminder', label: 'Event Reminder' },
  { value: 'thank_you', label: 'Thank You' },
  { value: 'seasonal', label: 'Seasonal' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function EmailBuilder({ templates: initialTemplates }: EmailBuilderProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates)
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formSubject, setFormSubject] = useState('')
  const [formBody, setFormBody] = useState('')
  const [formCategory, setFormCategory] = useState('')

  function resetForm() {
    setFormName('')
    setFormSubject('')
    setFormBody('')
    setFormCategory('')
    setEditingId(null)
    setShowCreateForm(false)
  }

  function startEdit(template: EmailTemplate) {
    setEditingId(template.id)
    setFormName(template.name)
    setFormSubject(template.subject)
    setFormBody(template.bodyHtml)
    setFormCategory(template.category || '')
    setShowCreateForm(false)
    setPreviewId(null)
  }

  function startCreate() {
    resetForm()
    setShowCreateForm(true)
    setPreviewId(null)
  }

  function handleSave() {
    if (!formName.trim() || !formSubject.trim() || !formBody.trim()) {
      toast.error('Name, subject, and body are all required')
      return
    }

    const payload = {
      name: formName.trim(),
      subject: formSubject.trim(),
      bodyHtml: formBody.trim(),
      category: formCategory || undefined,
    }

    startTransition(async () => {
      try {
        const result = await saveEmailTemplate(payload)
        if (editingId) {
          setTemplates((prev) =>
            prev.map((t) =>
              t.id === editingId
                ? {
                    id: result.template.id,
                    name: result.template.name,
                    subject: result.template.subject,
                    bodyHtml: result.template.bodyHtml,
                    category: result.template.category,
                  }
                : t
            )
          )
          toast.success('Template updated')
        } else {
          setTemplates((prev) => [
            ...prev,
            {
              id: result.template.id,
              name: result.template.name,
              subject: result.template.subject,
              bodyHtml: result.template.bodyHtml,
              category: result.template.category,
            },
          ])
          toast.success('Template created')
        }
        resetForm()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to save template'
        toast.error(message)
      }
    })
  }

  function handleDelete(templateId: string) {
    startTransition(async () => {
      try {
        await deleteEmailTemplate(templateId)
        setTemplates((prev) => prev.filter((t) => t.id !== templateId))
        if (editingId === templateId) resetForm()
        if (previewId === templateId) setPreviewId(null)
        toast.success('Template deleted')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete template'
        toast.error(message)
      }
    })
  }

  const previewTemplate = previewId ? templates.find((t) => t.id === previewId) : null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Email Templates</CardTitle>
        <Button size="sm" variant="ghost" onClick={startCreate}>
          <Plus className="h-4 w-4 mr-1" />
          New Template
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create / Edit Form */}
        {(showCreateForm || editingId) && (
          <div className="rounded-lg border border-brand-700 bg-brand-950/30 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-stone-100">
                {editingId ? 'Edit Template' : 'New Template'}
              </h4>
              <button onClick={resetForm} className="text-stone-400 hover:text-stone-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Template Name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Welcome Series - Day 1"
                required
              />
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1.5">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Input
              label="Subject Line"
              value={formSubject}
              onChange={(e) => setFormSubject(e.target.value)}
              placeholder="e.g., Welcome to Chef {{chef_name}}'s Kitchen"
              required
            />

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">
                Body (HTML) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                rows={8}
                placeholder="<h1>Hello {{client_name}},</h1>&#10;<p>Thank you for choosing...</p>"
                className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
              />
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} loading={isPending}>
                {editingId ? 'Update Template' : 'Create Template'}
              </Button>
              <Button size="sm" variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Template List */}
        {templates.length > 0 && (
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center gap-3 rounded-lg border border-stone-700 p-3 hover:bg-stone-800 transition-colors"
              >
                <Mail className="h-5 w-5 text-stone-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-100">{template.name}</p>
                  <p className="text-xs text-stone-500 truncate">Subject: {template.subject}</p>
                </div>
                {template.category && <Badge variant="info">{template.category}</Badge>}
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => setPreviewId(previewId === template.id ? null : template.id)}
                    className="p-1.5 rounded text-stone-400 hover:text-brand-600 hover:bg-stone-700"
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => startEdit(template)}
                    className="p-1.5 rounded text-stone-400 hover:text-brand-600 hover:bg-stone-700"
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-1.5 rounded text-stone-400 hover:text-red-500 hover:bg-stone-700"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preview Panel */}
        {previewTemplate && (
          <div className="rounded-lg border border-stone-700 bg-stone-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-stone-100">
                Preview: {previewTemplate.name}
              </h4>
              <button
                onClick={() => setPreviewId(null)}
                className="text-stone-400 hover:text-stone-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="bg-stone-900 rounded border border-stone-700 p-4">
              <p className="text-xs text-stone-500 mb-2">
                Subject:{' '}
                <span className="font-medium text-stone-300">{previewTemplate.subject}</span>
              </p>
              <hr className="my-2 border-stone-800" />
              <iframe
                title="Email template preview"
                sandbox=""
                className="w-full min-h-[300px] bg-white rounded"
                srcDoc={previewTemplate.bodyHtml}
              />
            </div>
          </div>
        )}

        {templates.length === 0 && !showCreateForm && (
          <p className="text-sm text-stone-400 italic text-center py-8">
            No email templates yet. Create your first template to start building campaigns.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
