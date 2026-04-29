'use client'

import { useEffect, useId, useState } from 'react'
import { X } from '@/components/ui/icons'
import { getContextPanelStorageKey } from '@/lib/platform-shell/context-panel-contract'
import { ContextPanelSection } from './context-panel-section'
import { ContextPanelToggle } from './context-panel-toggle'
import { PlatformStatusChip } from './platform-status-chip'
import type { ContextCommandPanelProps } from './context-panel-types'

export function ContextCommandPanel({
  family,
  title,
  subtitle,
  statusChips = [],
  sections,
  defaultOpen = false,
}: ContextCommandPanelProps) {
  const panelId = useId()
  const storageKey = getContextPanelStorageKey(family)
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(storageKey)
      if (stored === 'open') setOpen(true)
      if (stored === 'closed') setOpen(false)
    } catch {
      // Session storage is best effort only.
    }
  }, [storageKey])

  useEffect(() => {
    try {
      window.sessionStorage.setItem(storageKey, open ? 'open' : 'closed')
    } catch {
      // Session storage is best effort only.
    }
  }, [open, storageKey])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  return (
    <>
      <div className="xl:hidden">
        <ContextPanelToggle open={open} onClick={() => setOpen((value) => !value)} />
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm xl:hidden">
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="ml-auto flex h-full w-full max-w-md flex-col border-l border-stone-800 bg-stone-950 shadow-2xl"
          >
            <PanelHeader
              title={title}
              subtitle={subtitle}
              statusChips={statusChips}
              onClose={() => setOpen(false)}
            />
            <PanelSections sections={sections} />
          </div>
        </div>
      ) : null}

      <aside className="hidden xl:block">
        <div
          id={`${panelId}-desktop`}
          className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-stone-800 bg-stone-950/70 shadow-xl"
        >
          <PanelHeader title={title} subtitle={subtitle} statusChips={statusChips} />
          <PanelSections sections={sections} />
        </div>
      </aside>
    </>
  )
}

function PanelHeader({
  title,
  subtitle,
  statusChips,
  onClose,
}: {
  title: string
  subtitle?: string
  statusChips: ContextCommandPanelProps['statusChips']
  onClose?: () => void
}) {
  return (
    <header className="border-b border-stone-800 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xxs font-semibold uppercase tracking-[0.2em] text-brand-400">
            Command panel
          </p>
          <h2 className="mt-1 text-base font-semibold text-stone-100">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs leading-5 text-stone-400">{subtitle}</p> : null}
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close context panel"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-100"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {statusChips?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {statusChips.map((chip) => (
            <PlatformStatusChip key={`${chip.label}-${chip.tone ?? 'default'}`} {...chip} />
          ))}
        </div>
      ) : null}
    </header>
  )
}

function PanelSections({ sections }: { sections: ContextCommandPanelProps['sections'] }) {
  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-3">
      {sections.map((section) => (
        <ContextPanelSection key={section.id} {...section} />
      ))}
    </div>
  )
}
