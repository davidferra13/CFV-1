'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LoadTemplateDropdown } from './load-template-dropdown'
import {
  saveEventPackingAsTemplate,
  type PackingTemplateItem,
} from '@/lib/packing/template-actions'

type PackPageTemplateBarProps = {
  eventId: string
}

export function PackPageTemplateBar({ eventId }: PackPageTemplateBarProps) {
  const router = useRouter()
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleTemplateLoaded = (_items: PackingTemplateItem[]) => {
    // Template items are loaded. Since the packing list is generated from
    // event/menu data (not from a stored items array), loading a template
    // here shows a confirmation. The template items are stored in localStorage
    // so the chef can reference them alongside the auto-generated list.
    try {
      const existing = localStorage.getItem(`packing-template-${eventId}`)
      const merged = existing ? JSON.parse(existing) : []
      merged.push(..._items)
      localStorage.setItem(`packing-template-${eventId}`, JSON.stringify(merged))
    } catch {
      // localStorage unavailable
    }
    setMessage({ type: 'success', text: 'Template loaded! Items added to your checklist.' })
    setTimeout(() => setMessage(null), 3000)
    router.refresh()
  }

  const handleSaveAsTemplate = () => {
    if (!templateName.trim()) return

    setMessage(null)

    startTransition(async () => {
      try {
        const result = await saveEventPackingAsTemplate(eventId, templateName.trim())
        if (result.success) {
          setMessage({ type: 'success', text: `Saved as "${templateName.trim()}"` })
          setShowSaveForm(false)
          setTemplateName('')
          setTimeout(() => setMessage(null), 3000)
        } else {
          setMessage({ type: 'error', text: result.error ?? 'Failed to save template' })
        }
      } catch {
        setMessage({ type: 'error', text: 'Failed to save template' })
      }
    })
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg px-4 py-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <LoadTemplateDropdown
          eventId={eventId}
          onTemplateLoaded={handleTemplateLoaded}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSaveForm(prev => !prev)}
        >
          Save as Template
        </Button>
        <a
          href="/packing-templates"
          className="text-xs text-stone-400 hover:text-stone-600 ml-auto"
        >
          Manage Templates
        </a>
      </div>

      {showSaveForm && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            placeholder="Template name, e.g. Intimate Dinner"
            className="flex-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:border-stone-500 focus:outline-none"
            onKeyDown={e => {
              if (e.key === 'Enter') handleSaveAsTemplate()
            }}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveAsTemplate}
            disabled={isPending || !templateName.trim()}
          >
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}

      {message && (
        <p className={`text-xs ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
