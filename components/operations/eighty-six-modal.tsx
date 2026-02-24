'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, X } from 'lucide-react'
import { mark86 } from '@/lib/operations/kds-actions'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EightySixModalProps {
  courseId: string
  courseName: string
  onClose: () => void
  onConfirm?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EightySixModal({ courseId, courseName, onClose, onConfirm }: EightySixModalProps) {
  const [substitute, setSubstitute] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      try {
        await mark86(courseId)
        toast.success(`"${courseName}" has been 86'd`)
        onConfirm?.()
        onClose()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to 86 course'
        toast.error(message)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-surface rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-400"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-900 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-stone-100">86 Course</h3>
            <p className="text-sm text-stone-500">This will remove the course from service</p>
          </div>
        </div>

        {/* Course name */}
        <div className="rounded-lg bg-red-950 border border-red-200 p-3 mb-4">
          <p className="text-sm font-medium text-red-800">
            Are you sure you want to 86{' '}
            <span className="font-bold">&ldquo;{courseName}&rdquo;</span>?
          </p>
        </div>

        {/* Substitute suggestion */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-stone-300 mb-1.5">
            Substitute Suggestion (optional)
          </label>
          <textarea
            value={substitute}
            onChange={(e) => setSubstitute(e.target.value)}
            rows={3}
            placeholder="e.g., Replace with pan-seared salmon with lemon butter..."
            className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} loading={isPending}>
            Confirm 86
          </Button>
        </div>
      </div>
    </div>
  )
}
