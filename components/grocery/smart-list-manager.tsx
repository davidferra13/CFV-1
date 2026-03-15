'use client'

import { useState, useTransition, useCallback } from 'react'
import {
  type SmartGroceryList,
  type ListStatus,
  createSmartList,
  archiveList,
  duplicateList,
  getSmartList,
} from '@/lib/grocery/smart-list-actions'
import { SmartListView } from './smart-list-view'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ============================================
// TYPES
// ============================================

type ListWithCounts = SmartGroceryList & {
  smart_grocery_items: { id: string; is_checked: boolean }[]
}

interface SmartListManagerProps {
  initialLists: ListWithCounts[]
}

// ============================================
// COMPONENT
// ============================================

export function SmartListManager({ initialLists }: SmartListManagerProps) {
  const [lists, setLists] = useState(initialLists)
  const [isPending, startTransition] = useTransition()
  const [statusFilter, setStatusFilter] = useState<ListStatus | 'all'>('active')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [selectedList, setSelectedList] = useState<(SmartGroceryList & { smart_grocery_items: any[] }) | null>(null)
  const [duplicateName, setDuplicateName] = useState('')
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)

  const filteredLists = statusFilter === 'all'
    ? lists
    : lists.filter(l => l.status === statusFilter)

  const handleCreate = useCallback(() => {
    if (!newListName.trim()) return
    const name = newListName.trim()
    setNewListName('')
    setShowCreateForm(false)

    startTransition(async () => {
      try {
        const created = await createSmartList(name)
        setLists(prev => [{ ...created, smart_grocery_items: [] }, ...prev])
      } catch {
        // Failed to create
      }
    })
  }, [newListName])

  const handleArchive = useCallback((listId: string) => {
    const previous = [...lists]
    setLists(prev => prev.map(l => l.id === listId ? { ...l, status: 'archived' as ListStatus } : l))

    startTransition(async () => {
      try {
        await archiveList(listId)
      } catch {
        setLists(previous)
      }
    })
  }, [lists])

  const handleDuplicate = useCallback((listId: string) => {
    if (!duplicateName.trim()) return
    const name = duplicateName.trim()
    setDuplicatingId(null)
    setDuplicateName('')

    startTransition(async () => {
      try {
        const result = await duplicateList(listId, name)
        // Re-fetch would be ideal, but for now add a stub
        const original = lists.find(l => l.id === listId)
        if (original && result) {
          setLists(prev => [{
            ...original,
            id: result.id,
            name,
            status: 'active' as ListStatus,
            created_at: new Date().toISOString(),
            completed_at: null,
            smart_grocery_items: original.smart_grocery_items.map(i => ({ ...i, is_checked: false })),
          }, ...prev])
        }
      } catch {
        // Failed
      }
    })
  }, [duplicateName, lists])

  const handleOpenList = useCallback((listId: string) => {
    startTransition(async () => {
      try {
        const full = await getSmartList(listId)
        setSelectedList(full)
      } catch {
        // Failed to load
      }
    })
  }, [])

  const handleBack = useCallback(() => {
    setSelectedList(null)
    // Lists will be refreshed via revalidation on next render
  }, [])

  // If viewing a specific list
  if (selectedList) {
    return <SmartListView list={selectedList} onBack={handleBack} />
  }

  const statusBadgeVariant = (status: ListStatus) => {
    switch (status) {
      case 'active': return 'info' as const
      case 'completed': return 'success' as const
      case 'archived': return 'default' as const
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Grocery Lists</h2>
        <Button variant="primary" onClick={() => setShowCreateForm(true)} disabled={isPending}>
          New List
        </Button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="flex items-center gap-2 border rounded-lg p-3 bg-white">
          <input
            type="text"
            value={newListName}
            onChange={e => setNewListName(e.target.value)}
            placeholder="List name (e.g. Saturday dinner party)"
            className="flex-1 border rounded px-2 py-1.5 text-sm"
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
            autoFocus
          />
          <Button variant="primary" onClick={handleCreate} disabled={isPending || !newListName.trim()}>
            Create
          </Button>
          <Button variant="ghost" onClick={() => { setShowCreateForm(false); setNewListName('') }}>
            Cancel
          </Button>
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-2">
        {(['all', 'active', 'completed', 'archived'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* List grid */}
      {filteredLists.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          {statusFilter === 'all' ? 'No grocery lists yet. Create your first one.' : `No ${statusFilter} lists.`}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLists.map(list => {
            const total = list.smart_grocery_items.length
            const checked = list.smart_grocery_items.filter(i => i.is_checked).length
            const pct = total > 0 ? Math.round((checked / total) * 100) : 0

            return (
              <div
                key={list.id}
                className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => handleOpenList(list.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900 truncate">{list.name}</h3>
                  <Badge variant={statusBadgeVariant(list.status as ListStatus)}>
                    {list.status}
                  </Badge>
                </div>

                <div className="text-sm text-gray-500 mb-3">
                  {total} item{total !== 1 ? 's' : ''}
                  {total > 0 && ` (${pct}% done)`}
                </div>

                {total > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                    <div
                      className="bg-green-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}

                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  {duplicatingId === list.id ? (
                    <div className="flex items-center gap-1 w-full">
                      <input
                        type="text"
                        value={duplicateName}
                        onChange={e => setDuplicateName(e.target.value)}
                        placeholder="New list name"
                        className="flex-1 text-xs border rounded px-1.5 py-1"
                        onKeyDown={e => { if (e.key === 'Enter') handleDuplicate(list.id) }}
                        autoFocus
                      />
                      <Button variant="ghost" onClick={() => handleDuplicate(list.id)} disabled={isPending}>
                        OK
                      </Button>
                      <Button variant="ghost" onClick={() => { setDuplicatingId(null); setDuplicateName('') }}>
                        X
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => { setDuplicatingId(list.id); setDuplicateName(`${list.name} (copy)`) }}
                        disabled={isPending}
                      >
                        Duplicate
                      </Button>
                      {list.status === 'active' && (
                        <Button variant="ghost" onClick={() => handleArchive(list.id)} disabled={isPending}>
                          Archive
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
