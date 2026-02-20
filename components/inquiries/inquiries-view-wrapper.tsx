// InquiriesViewWrapper — Client component that manages list/kanban view toggle
// The existing list (server component) is passed as children; kanban data is a prop.
'use client'

import { useState, useEffect } from 'react'
import { List, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KanbanBoard, type KanbanBoardInquiry } from './kanban-board'

const STORAGE_KEY = 'inquiries-view-mode'

interface InquiriesViewWrapperProps {
  /** The existing list view (server component) passed as a slot */
  children: React.ReactNode
  /** Pre-fetched inquiries for the kanban board */
  inquiries: KanbanBoardInquiry[]
}

export function InquiriesViewWrapper({
  children,
  inquiries,
}: InquiriesViewWrapperProps) {
  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [mounted, setMounted] = useState(false)

  // Read persisted preference after mount to avoid hydration mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'kanban' || stored === 'list') {
        setView(stored)
      }
    } catch {
      // localStorage unavailable (e.g. private mode with strict settings)
    }
    setMounted(true)
  }, [])

  function handleSetView(next: 'list' | 'kanban') {
    setView(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore write errors
    }
  }

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={view === 'list' ? 'primary' : 'secondary'}
          onClick={() => handleSetView('list')}
          aria-label="List view"
        >
          <List className="h-4 w-4" />
          List
        </Button>
        <Button
          size="sm"
          variant={view === 'kanban' ? 'primary' : 'secondary'}
          onClick={() => handleSetView('kanban')}
          aria-label="Kanban view"
        >
          <LayoutGrid className="h-4 w-4" />
          Kanban
        </Button>
      </div>

      {/* Views — only render once mounted to respect stored preference */}
      {!mounted ? (
        // Pre-mount: render the list (SSR default)
        <div>{children}</div>
      ) : view === 'list' ? (
        <div>{children}</div>
      ) : (
        <KanbanBoard inquiries={inquiries} />
      )}
    </div>
  )
}
