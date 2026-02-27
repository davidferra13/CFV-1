'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { saveAsTemplate } from '@/lib/marketing/actions'

export function SaveTemplateButton({
  campaignId,
  campaignName,
}: {
  campaignId: string
  campaignName: string
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(campaignName)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await saveAsTemplate(campaignId, name)
      setSaved(true)
      setOpen(false)
    } catch {
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return <span className="text-sm text-emerald-600">Saved as template</span>
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Save as template
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Template name"
        className="w-48 h-8 text-sm"
      />
      <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  )
}
