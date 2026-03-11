'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Check, X } from '@/components/ui/icons'
import {
  toggleChecklistItem,
  addCustomChecklistItem,
  removeCustomChecklistItem,
} from '@/lib/commerce/daily-checklist-actions'
import type { ChecklistItem } from '@/lib/commerce/daily-checklist-actions'
import { toast } from 'sonner'

type Props = {
  openingItems: ChecklistItem[]
  closingItems: ChecklistItem[]
  date: string
}

export function DailyChecklist({ openingItems, closingItems, date }: Props) {
  const [activeTab, setActiveTab] = useState<'opening' | 'closing'>('opening')
  const [isPending, startTransition] = useTransition()
  const [opening, setOpening] = useState(openingItems)
  const [closing, setClosing] = useState(closingItems)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItemTitle, setNewItemTitle] = useState('')

  const items = activeTab === 'opening' ? opening : closing
  const setItems = activeTab === 'opening' ? setOpening : setClosing

  const completed = items.filter((i) => i.completed).length
  const total = items.length
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  // Group items by category
  const grouped = items.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  function handleToggle(itemKey: string) {
    const previousItems = [...items]
    // Optimistic update
    setItems(items.map((i) => (i.key === itemKey ? { ...i, completed: !i.completed } : i)))

    startTransition(async () => {
      try {
        await toggleChecklistItem(date, itemKey, activeTab)
      } catch (err) {
        setItems(previousItems)
        toast.error('Failed to update checklist')
      }
    })
  }

  function handleAddCustom() {
    if (!newItemTitle.trim()) return

    startTransition(async () => {
      try {
        const result = await addCustomChecklistItem(activeTab, newItemTitle.trim())
        setItems([
          ...items,
          {
            key: result.id,
            title: newItemTitle.trim(),
            category: 'Custom',
            isCustom: true,
            completed: false,
            completedAt: null,
            completedBy: null,
          },
        ])
        setNewItemTitle('')
        setShowAddForm(false)
        toast.success('Custom item added')
      } catch (err) {
        toast.error('Failed to add item')
      }
    })
  }

  function handleRemoveCustom(itemKey: string) {
    const previousItems = [...items]
    setItems(items.filter((i) => i.key !== itemKey))

    startTransition(async () => {
      try {
        await removeCustomChecklistItem(itemKey)
        toast.success('Item removed')
      } catch (err) {
        setItems(previousItems)
        toast.error('Failed to remove item')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Daily Checklist</CardTitle>
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            <button
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeTab === 'opening'
                  ? 'bg-background shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('opening')}
            >
              Opening
            </button>
            <button
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeTab === 'closing'
                  ? 'bg-background shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('closing')}
            >
              Closing
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">
              {completed} of {total} complete
            </span>
            <span className="font-medium">{percent}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Grouped checklist items */}
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, categoryItems]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {category}
              </h3>
              <div className="space-y-1">
                {categoryItems.map((item) => (
                  <div
                    key={item.key}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer hover:bg-muted/50 ${
                      item.completed ? 'bg-green-50/50' : ''
                    }`}
                    onClick={() => handleToggle(item.key)}
                  >
                    {/* Large checkbox for tablet use */}
                    <div
                      className={`flex-shrink-0 h-7 w-7 rounded-md border-2 flex items-center justify-center transition-colors ${
                        item.completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300'
                      }`}
                    >
                      {item.completed && <Check className="h-4 w-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-sm ${
                          item.completed ? 'line-through text-muted-foreground' : ''
                        }`}
                      >
                        {item.title}
                      </span>
                      {item.completedAt && (
                        <span className="block text-xs text-muted-foreground">
                          {new Date(item.completedAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>

                    {item.isCustom && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveCustom(item.key)
                        }}
                        disabled={isPending}
                        className="opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Add custom item */}
        <div className="mt-6 pt-4 border-t">
          {showAddForm ? (
            <div className="flex items-center gap-2">
              <Input
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="Custom checklist item..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCustom()
                  if (e.key === 'Escape') {
                    setShowAddForm(false)
                    setNewItemTitle('')
                  }
                }}
              />
              <Button size="sm" onClick={handleAddCustom} disabled={isPending}>
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowAddForm(false)
                  setNewItemTitle('')
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Custom Item
            </Button>
          )}
        </div>

        {/* Sign-off when 100% */}
        {percent === 100 && (
          <div className="mt-4 p-3 rounded-md bg-green-50 text-green-200 text-sm text-center font-medium">
            {activeTab === 'opening' ? 'Opening' : 'Closing'} checklist complete
          </div>
        )}
      </CardContent>
    </Card>
  )
}
