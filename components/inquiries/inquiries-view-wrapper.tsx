// InquiriesViewWrapper — Client component that manages list/kanban view toggle
// The existing list (server component) is passed as children; kanban data is a prop.
'use client'

import { List, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KanbanBoard, type KanbanBoardInquiry } from './kanban-board'
import { usePersistentViewState } from '@/lib/view-state/use-persistent-view-state'

interface InquiriesViewWrapperProps {
  /** The existing list view (server component) passed as a slot */
  children: React.ReactNode
  /** Pre-fetched inquiries for the kanban board */
  inquiries: KanbanBoardInquiry[]
}

export function InquiriesViewWrapper({ children, inquiries }: InquiriesViewWrapperProps) {
  const { state, setState } = usePersistentViewState('inquiries.list', {
    strategy: 'url',
    defaults: { view: 'list' as 'list' | 'kanban' },
  })
  const view = state.view

  function handleSetView(next: 'list' | 'kanban') {
    setState({ view: next })
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

      {/* Views */}
      {view === 'list' ? <div>{children}</div> : <KanbanBoard inquiries={inquiries} />}
    </div>
  )
}
