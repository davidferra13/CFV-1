'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  getPackingTemplates,
  applyTemplateToEvent,
  type PackingTemplate,
  type PackingTemplateItem,
} from '@/lib/packing/template-actions'

type LoadTemplateDropdownProps = {
  eventId: string
  onTemplateLoaded: (items: PackingTemplateItem[]) => void
}

export function LoadTemplateDropdown({
  eventId,
  onTemplateLoaded,
}: LoadTemplateDropdownProps) {
  const [templates, setTemplates] = useState<PackingTemplate[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Fetch templates when dropdown opens
  useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoading(true)

    getPackingTemplates().then(data => {
      if (!cancelled) {
        setTemplates(data)
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) {
        setLoading(false)
        setError('Could not load templates')
      }
    })

    return () => { cancelled = true }
  }, [open])

  const handleSelect = (template: PackingTemplate) => {
    setError(null)

    startTransition(async () => {
      try {
        const result = await applyTemplateToEvent(template.id, eventId)
        if (result.success && result.items) {
          onTemplateLoaded(result.items)
          setOpen(false)
        } else {
          setError(result.error ?? 'Failed to load template')
        }
      } catch {
        setError('Failed to load template')
      }
    })
  }

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(prev => !prev)}
      >
        Load Template
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute left-0 top-full mt-1 z-20 w-64 bg-white rounded-lg border border-stone-200 shadow-lg py-1">
            {loading ? (
              <p className="text-sm text-stone-400 px-3 py-2">Loading...</p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-stone-400 px-3 py-2">
                No templates yet. Create one in Packing Templates.
              </p>
            ) : (
              templates.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelect(t)}
                  disabled={isPending}
                  className="w-full text-left px-3 py-2 hover:bg-stone-50 transition-colors disabled:opacity-50"
                >
                  <span className="text-sm font-medium text-stone-900 block">
                    {t.name}
                    {t.is_default && (
                      <span className="ml-1.5 text-xs bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded-full">
                        default
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-stone-400 block">
                    {t.items.length} item{t.items.length !== 1 ? 's' : ''}
                    {t.event_type ? ` · ${t.event_type}` : ''}
                  </span>
                </button>
              ))
            )}

            {error && (
              <p className="text-xs text-red-600 px-3 py-1">{error}</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
