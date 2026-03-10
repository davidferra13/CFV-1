'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { BookmarkCheck } from '@/components/ui/icons'
import { saveAsTemplate, type TemplateType } from '@/lib/templates/template-actions'

// ─── Props ────────────────────────────────────────────────────────

type SaveAsTemplateButtonProps = {
  templateType: TemplateType
  entityData: Record<string, any>
  onSaved?: () => void
  className?: string
}

// ─── Component ────────────────────────────────────────────────────

export function SaveAsTemplateButton({
  templateType,
  entityData,
  onSaved,
  className,
}: SaveAsTemplateButtonProps) {
  const [pending, startTransition] = useTransition()
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Enter a name for this template')
      return
    }

    startTransition(async () => {
      try {
        await saveAsTemplate(name.trim(), templateType, entityData, description.trim() || undefined)
        toast.success(`Saved as template: ${name.trim()}`)
        setShowModal(false)
        setName('')
        setDescription('')
        onSaved?.()
      } catch (err: any) {
        toast.error(err?.message || 'Failed to save template')
      }
    })
  }

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setShowModal(true)}
        className={className}
        title="Save as template"
      >
        <BookmarkCheck size={16} className="mr-1" />
        Save as Template
      </Button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-stone-900 border border-stone-700 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-stone-100 mb-4">Save as Template</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm"
                  placeholder="Weekly Corporate Lunch, Saturday Bread Batch..."
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm resize-none"
                  rows={3}
                  placeholder="What's this template for?"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button type="submit" variant="primary" disabled={pending}>
                  {pending ? 'Saving...' : 'Save Template'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
