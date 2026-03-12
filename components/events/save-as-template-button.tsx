// Save As Template Button
// Shown on event detail page to save current event config as a reusable template.
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { createTemplateFromEvent } from '@/lib/events/template-actions'

type SaveAsTemplateButtonProps = {
  eventId: string
  defaultName?: string
}

export function SaveAsTemplateButton({ eventId, defaultName }: SaveAsTemplateButtonProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(defaultName || '')
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!name.trim()) {
      toast.error('Template name is required')
      return
    }

    startTransition(async () => {
      try {
        const result = await createTemplateFromEvent(eventId, name.trim())
        if (result.success) {
          toast.success(`Template "${name.trim()}" saved`)
          setOpen(false)
          setName('')
        } else {
          toast.error(result.error || 'Failed to save template')
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save template')
      }
    })
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Save as Template
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Template name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-48"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') {
            setOpen(false)
            setName('')
          }
        }}
      />
      <Button variant="primary" onClick={handleSave} disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </Button>
      <Button
        variant="ghost"
        onClick={() => {
          setOpen(false)
          setName('')
        }}
      >
        Cancel
      </Button>
    </div>
  )
}
