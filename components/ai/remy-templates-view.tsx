'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getProjects,
} from '@/lib/ai/remy-local-storage'
import type { LocalProject, LocalTemplate } from '@/lib/ai/remy-types'
import { BookTemplate, Plus, Play, Edit3, Trash2, X } from '@/components/ui/icons'
import { ConfirmModal } from '@/components/ui/confirm-modal'

function interpolateTemplate(prompt: string): string {
  const now = new Date()
  const vars: Record<string, string> = {
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    day: now.toLocaleDateString('en-US', { weekday: 'long' }),
    month: now.toLocaleDateString('en-US', { month: 'long' }),
    year: now.getFullYear().toString(),
    timestamp: now.toISOString(),
  }
  return prompt.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] ?? match)
}

interface RemyTemplatesViewProps {
  onRunTemplate: (prompt: string, projectId?: string | null) => void
}

export function RemyTemplatesView({ onRunTemplate }: RemyTemplatesViewProps) {
  const [templates, setTemplates] = useState<LocalTemplate[]>([])
  const [projects, setProjects] = useState<LocalProject[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formPrompt, setFormPrompt] = useState('')
  const [formProjectId, setFormProjectId] = useState<string | null>(null)
  const [formIcon, setFormIcon] = useState('⚡')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [tmpls, projs] = await Promise.all([getTemplates(), getProjects()])
    setTemplates(tmpls)
    setProjects(projs)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const resetForm = () => {
    setFormName('')
    setFormPrompt('')
    setFormProjectId(null)
    setFormIcon('⚡')
    setShowCreate(false)
    setEditingId(null)
  }

  const handleCreate = async () => {
    if (!formName.trim() || !formPrompt.trim()) return
    await createTemplate(formName.trim(), formPrompt.trim(), formProjectId, formIcon)
    resetForm()
    loadData()
  }

  const handleEdit = (tmpl: LocalTemplate) => {
    setEditingId(tmpl.id)
    setFormName(tmpl.name)
    setFormPrompt(tmpl.prompt)
    setFormProjectId(tmpl.projectId)
    setFormIcon(tmpl.icon)
    setShowCreate(false)
  }

  const handleUpdate = async () => {
    if (!editingId || !formName.trim() || !formPrompt.trim()) return
    await updateTemplate(editingId, {
      name: formName.trim(),
      prompt: formPrompt.trim(),
      projectId: formProjectId,
      icon: formIcon,
    })
    resetForm()
    loadData()
  }

  const handleDelete = (id: string) => {
    setDeleteTargetId(id)
    setShowDeleteConfirm(true)
  }

  const handleConfirmedDelete = async () => {
    if (!deleteTargetId) return
    setShowDeleteConfirm(false)
    await deleteTemplate(deleteTargetId)
    loadData()
  }

  const handleRun = (tmpl: LocalTemplate) => {
    onRunTemplate(interpolateTemplate(tmpl.prompt), tmpl.projectId)
  }

  const isEditing = editingId !== null
  const showForm = showCreate || isEditing

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
          <BookTemplate className="w-4 h-4" />
          Templates
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowCreate(true)
          }}
          className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
          title="New template"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="px-3 py-2 border-b border-white/10 bg-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-300">
              {isEditing ? 'Edit Template' : 'New Template'}
            </span>
            <button
              onClick={resetForm}
              className="flex items-center justify-center w-11 h-11 hover:bg-white/10 rounded touch-manipulation"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div className="flex gap-2">
            <input
              value={formIcon}
              onChange={(e) => setFormIcon(e.target.value)}
              className="w-10 text-center bg-transparent border border-white/20 rounded text-sm"
              maxLength={2}
            />
            <input
              autoFocus
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Template name..."
              className="flex-1 bg-transparent border border-white/20 rounded px-2 py-1 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-500/50"
            />
          </div>

          <textarea
            value={formPrompt}
            onChange={(e) => setFormPrompt(e.target.value)}
            placeholder="Template prompt (what Remy should do)..."
            rows={3}
            className="w-full bg-transparent border border-white/20 rounded px-2 py-1 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-500/50 resize-none"
          />

          <div className="flex items-center gap-2">
            <select
              value={formProjectId ?? ''}
              onChange={(e) => setFormProjectId(e.target.value || null)}
              className="flex-1 bg-transparent border border-white/20 rounded px-2 py-1 text-xs text-gray-300 outline-none"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={isEditing ? handleUpdate : handleCreate}
              disabled={!formName.trim() || !formPrompt.trim()}
              className="px-3 py-1 text-xs bg-brand-500 text-white rounded hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isEditing ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Template List */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {templates.length === 0 && !showForm && (
          <div className="text-center py-8 text-gray-500 text-sm">
            <p className="mb-2">No templates yet.</p>
            <p className="text-xs">
              Create reusable prompts for common tasks like &ldquo;Plan a dinner for 20
              guests&rdquo;
            </p>
          </div>
        )}

        {templates.map((tmpl) => (
          <div
            key={tmpl.id}
            className="px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm">{tmpl.icon}</span>
              <span className="flex-1 text-sm font-medium text-gray-200 truncate">{tmpl.name}</span>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleRun(tmpl)}
                  className="p-1 hover:bg-green-500/20 rounded text-green-400"
                  title="Run this template"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleEdit(tmpl)}
                  className="p-1 hover:bg-white/10 rounded text-gray-400"
                  title="Edit"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(tmpl.id)}
                  className="p-1 hover:bg-red-500/10 rounded text-red-400"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 truncate pl-6">{tmpl.prompt}</p>
          </div>
        ))}
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete this template?"
        description="This template will be permanently removed."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleConfirmedDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}
