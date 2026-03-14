'use client'

// Admin Preview Toggle
// Floating pill that lets admins switch between "Admin view" and "Chef preview".
// Only rendered for real admins. Stays in the bottom-right corner above other FABs.

import { useState, useTransition } from 'react'
import { Eye, EyeOff } from '@/components/ui/icons'
import { toggleAdminPreview } from '@/lib/auth/admin-preview-actions'

type Props = {
  initialPreview: boolean
}

export function AdminPreviewToggle({ initialPreview }: Props) {
  const [preview, setPreview] = useState(initialPreview)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const previous = preview
    const next = !preview
    setPreview(next)
    startTransition(async () => {
      try {
        await toggleAdminPreview(next)
      } catch {
        setPreview(previous)
      }
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`fixed bottom-20 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg text-xs font-medium transition-all disabled:opacity-50 ${
        preview
          ? 'bg-amber-500 text-stone-900 hover:bg-amber-400'
          : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-600'
      }`}
      title={
        preview ? 'Viewing as chef — click to return to admin view' : 'Click to preview as chef'
      }
    >
      {preview ? (
        <>
          <Eye size={14} />
          <span>Chef Preview</span>
        </>
      ) : (
        <>
          <EyeOff size={14} />
          <span>Admin View</span>
        </>
      )}
    </button>
  )
}
