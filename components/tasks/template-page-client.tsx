'use client'

// Template Page Client - client-side interactivity for the template management page
// Handles: template list expansion, create form toggle, generate tasks modal, edit/delete

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { toast } from 'sonner'
import { TaskTemplateForm } from './task-template-form'
import { useDeferredAction } from '@/hooks/use-deferred-action'
import {
  deleteTemplate,
  generateTasksFromTemplate,
  type TaskTemplate,
} from '@/lib/tasks/template-actions'
import { TEMPLATE_CATEGORIES } from '@/lib/tasks/template-constants'

type StaffOption = { id: string; name: string; role: string }

type Props = {
  templates: TaskTemplate[]
  staff: StaffOption[]
}

// ============================================
// CATEGORY BADGE VARIANT MAP
// ============================================

const CATEGORY_BADGE_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> =
  {
    prep: 'warning',
    service: 'info',
    cleanup: 'default',
    setup: 'success',
    admin: 'default',
    inventory: 'info',
    maintenance: 'warning',
    other: 'default',
  }

// ============================================
// GENERATE TASKS FORM (inline)
// ============================================

function GenerateTasksForm({
  templateId,
  staff,
  onDone,
}: {
  templateId: string
  staff: StaffOption[]
  onDone: () => void
}) {
  const router = useRouter()
  const [dueDate, setDueDate] = useState(
    ((_tpc) =>
      `${_tpc.getFullYear()}-${String(_tpc.getMonth() + 1).padStart(2, '0')}-${String(_tpc.getDate()).padStart(2, '0')}`)(
      new Date()
    )
  )
  const [assignedTo, setAssignedTo] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successCount, setSuccessCount] = useState<number | null>(null)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setGenerating(true)
    setError(null)
    setSuccessCount(null)

    try {
      const tasks = await generateTasksFromTemplate(templateId, dueDate, assignedTo || undefined)
      setSuccessCount(tasks.length)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tasks')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <form
      onSubmit={handleGenerate}
      className="mt-3 space-y-3 rounded-lg border border-stone-700 bg-stone-800/50 p-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-300 mb-1">Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
            className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-1.5 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-300 mb-1">
            Assign to (optional)
          </label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-1.5 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {successCount !== null && (
        <p className="text-xs text-emerald-400">
          Created {successCount} task{successCount !== 1 ? 's' : ''} for {dueDate}.
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={generating}>
          {generating ? 'Generating...' : 'Generate Tasks'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

// ============================================
// TEMPLATE CARD
// ============================================

function TemplateCard({ template, staff }: { template: TaskTemplate; staff: StaffOption[] }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { execute: deferDelete } = useDeferredAction({
    delay: 8000,
    toastMessage: `Template "${template.name}" deleted`,
    onExecute: async () => {
      await deleteTemplate(template.id)
      router.refresh()
    },
    onUndo: () => {
      setDeleted(false)
      setShowDeleteConfirm(false)
    },
    onError: (err) => {
      setDeleted(false)
      toast.error(err instanceof Error ? err.message : 'Failed to delete template')
    },
  })

  const badgeVariant = CATEGORY_BADGE_VARIANT[template.category] ?? 'default'
  const categoryLabel = TEMPLATE_CATEGORIES[template.category] ?? template.category
  const totalMinutes = template.items.reduce((sum, item) => sum + (item.estimated_minutes ?? 0), 0)

  function handleDelete() {
    if (deleted) return
    setShowDeleteConfirm(true)
  }

  function handleConfirmedDelete() {
    setShowDeleteConfirm(false)
    setDeleted(true)
    deferDelete()
  }

  if (deleted) {
    return (
      <Card className="opacity-50">
        <CardContent className="pt-4 pb-4 text-center text-sm text-stone-500 italic">
          Deleted (undo in toast)
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div
            className="flex-1 cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setExpanded(!expanded)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setExpanded(!expanded)
              }
            }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-stone-100">{template.name}</span>
              <Badge variant={badgeVariant}>{categoryLabel}</Badge>
              <span className="text-xs text-stone-500">
                {template.items.length} item{template.items.length !== 1 ? 's' : ''}
                {totalMinutes > 0 && ` \u00B7 ~${totalMinutes} min`}
              </span>
            </div>
            {template.description && (
              <p className="mt-0.5 text-xs text-stone-400">{template.description}</p>
            )}
          </div>

          <div className="flex gap-1 flex-shrink-0 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowGenerate(!showGenerate)
                setShowEdit(false)
              }}
            >
              Generate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowEdit(!showEdit)
                setShowGenerate(false)
              }}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleted}
              className="text-red-400 hover:text-red-300"
            >
              {deleted ? '...' : 'Delete'}
            </Button>
          </div>
        </div>

        {/* Expanded: show items */}
        {expanded && (
          <div className="mt-3 space-y-1.5">
            {template.items.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-md bg-stone-800/50 px-3 py-2 text-sm"
              >
                <span className="text-stone-500 text-xs mt-0.5 w-5 text-right flex-shrink-0">
                  {i + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-stone-200">{item.title}</span>
                  {item.description && (
                    <span className="text-stone-400 ml-1">- {item.description}</span>
                  )}
                </div>
                {item.estimated_minutes && item.estimated_minutes > 0 && (
                  <span className="text-xs text-stone-500 flex-shrink-0">
                    {item.estimated_minutes} min
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Generate tasks form */}
        {showGenerate && (
          <GenerateTasksForm
            templateId={template.id}
            staff={staff}
            onDone={() => setShowGenerate(false)}
          />
        )}

        {/* Edit form */}
        {showEdit && (
          <div className="mt-3 rounded-lg border border-stone-700 bg-stone-800/50 p-3">
            <TaskTemplateForm template={template} onDone={() => setShowEdit(false)} />
          </div>
        )}

        <ConfirmModal
          open={showDeleteConfirm}
          title={`Delete template "${template.name}"?`}
          description="You'll have 8 seconds to undo."
          confirmLabel="Delete"
          variant="danger"
          loading={deleted}
          onConfirm={handleConfirmedDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      </CardContent>
    </Card>
  )
}

// ============================================
// TEMPLATE PAGE CLIENT
// ============================================

export function TemplatePageClient({ templates, staff }: Props) {
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="space-y-4">
      {/* Create form toggle */}
      {showCreate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Template</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskTemplateForm onDone={() => setShowCreate(false)} />
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setShowCreate(true)}>+ New Template</Button>
      )}

      {/* Template list */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-400 text-sm">No templates yet.</p>
            <p className="text-stone-500 text-xs mt-1">
              Create a template to quickly generate recurring task lists.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} staff={staff} />
          ))}
        </div>
      )}
    </div>
  )
}
