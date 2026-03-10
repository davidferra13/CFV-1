// Modifier Group Manager - admin CRUD for modifier groups and their options
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  createModifierGroup,
  updateModifierGroup,
  deleteModifierGroup,
  addModifier,
  updateModifier,
  deleteModifier,
} from '@/lib/commerce/modifier-actions'

type ModifierOption = {
  id: string
  name: string
  price_adjustment_cents: number
  is_default: boolean
  available: boolean
  sort_order: number
}

type ModifierGroup = {
  id: string
  name: string
  selection_type: 'single' | 'multiple'
  required: boolean
  min_selections: number
  max_selections: number | null
  sort_order: number
  modifiers: ModifierOption[]
}

type Props = {
  groups: ModifierGroup[]
}

export function ModifierGroupManager({ groups: initialGroups }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [showNewModifier, setShowNewModifier] = useState<string | null>(null)

  // New group form state
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupType, setNewGroupType] = useState<'single' | 'multiple'>('single')
  const [newGroupRequired, setNewGroupRequired] = useState(false)

  // Edit group form state
  const [editGroupName, setEditGroupName] = useState('')
  const [editGroupType, setEditGroupType] = useState<'single' | 'multiple'>('single')
  const [editGroupRequired, setEditGroupRequired] = useState(false)

  // New modifier form state
  const [newModName, setNewModName] = useState('')
  const [newModPrice, setNewModPrice] = useState('')
  const [newModDefault, setNewModDefault] = useState(false)

  function handleCreateGroup() {
    if (!newGroupName.trim()) {
      toast.error('Group name is required')
      return
    }
    startTransition(async () => {
      try {
        await createModifierGroup({
          name: newGroupName.trim(),
          selectionType: newGroupType,
          required: newGroupRequired,
        })
        toast.success('Modifier group created')
        setShowNewGroup(false)
        setNewGroupName('')
        setNewGroupType('single')
        setNewGroupRequired(false)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create group')
      }
    })
  }

  function startEditGroup(group: ModifierGroup) {
    setEditingGroup(group.id)
    setEditGroupName(group.name)
    setEditGroupType(group.selection_type)
    setEditGroupRequired(group.required)
  }

  function handleUpdateGroup(groupId: string) {
    if (!editGroupName.trim()) {
      toast.error('Group name is required')
      return
    }
    startTransition(async () => {
      try {
        await updateModifierGroup({
          id: groupId,
          name: editGroupName.trim(),
          selectionType: editGroupType,
          required: editGroupRequired,
        })
        toast.success('Group updated')
        setEditingGroup(null)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update group')
      }
    })
  }

  function handleDeleteGroup(groupId: string, groupName: string) {
    if (!confirm(`Delete "${groupName}" and all its modifiers?`)) return
    startTransition(async () => {
      try {
        await deleteModifierGroup(groupId)
        toast.success('Group deleted')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete group')
      }
    })
  }

  function handleAddModifier(groupId: string) {
    if (!newModName.trim()) {
      toast.error('Modifier name is required')
      return
    }
    const priceCents = newModPrice ? Math.round(parseFloat(newModPrice) * 100) : 0
    startTransition(async () => {
      try {
        await addModifier({
          groupId,
          name: newModName.trim(),
          priceAdjustmentCents: priceCents,
          isDefault: newModDefault,
        })
        toast.success('Modifier added')
        setShowNewModifier(null)
        setNewModName('')
        setNewModPrice('')
        setNewModDefault(false)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to add modifier')
      }
    })
  }

  function handleToggleModifier(modId: string, available: boolean) {
    startTransition(async () => {
      try {
        await updateModifier({ id: modId, available: !available })
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update modifier')
      }
    })
  }

  function handleDeleteModifier(modId: string, modName: string) {
    if (!confirm(`Delete modifier "${modName}"?`)) return
    startTransition(async () => {
      try {
        await deleteModifier(modId)
        toast.success('Modifier deleted')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete modifier')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-100">Modifier Groups</h2>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowNewGroup(true)}
          disabled={showNewGroup}
        >
          + New Group
        </Button>
      </div>

      {/* New group form */}
      {showNewGroup && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name (e.g. Temperature, Side Choice)"
              autoFocus
            />
            <div className="flex gap-4 items-center">
              <select
                value={newGroupType}
                onChange={(e) => setNewGroupType(e.target.value as 'single' | 'multiple')}
                className="rounded-md border border-stone-700 bg-stone-900 text-stone-200 px-3 py-2 text-sm"
              >
                <option value="single">Single choice (radio)</option>
                <option value="multiple">Multiple choice (checkboxes)</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newGroupRequired}
                  onChange={(e) => setNewGroupRequired(e.target.checked)}
                  className="rounded border-stone-600"
                />
                Required
              </label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowNewGroup(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleCreateGroup} disabled={isPending}>
                {isPending ? 'Creating...' : 'Create Group'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Group list */}
      {initialGroups.length === 0 && !showNewGroup && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-stone-400">No modifier groups yet.</p>
            <p className="text-stone-500 text-sm mt-1">
              Create groups like "Temperature", "Side Choice", or "Add-ons" to customize your
              products.
            </p>
          </CardContent>
        </Card>
      )}

      {initialGroups.map((group) => {
        const isExpanded = expandedGroup === group.id
        const isEditing = editingGroup === group.id

        return (
          <Card key={group.id}>
            <CardHeader
              className="cursor-pointer"
              onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{group.name}</CardTitle>
                  <Badge variant={group.selection_type === 'single' ? 'default' : 'info'}>
                    {group.selection_type === 'single' ? 'Single' : 'Multiple'}
                  </Badge>
                  {group.required && <Badge variant="warning">Required</Badge>}
                  <span className="text-xs text-stone-500">
                    {group.modifiers.length} option{group.modifiers.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className="text-stone-400 text-sm">{isExpanded ? '\u25B2' : '\u25BC'}</span>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="border-t border-stone-800 pt-4 space-y-3">
                {/* Group actions */}
                {isEditing ? (
                  <div className="space-y-3 mb-4 p-3 bg-stone-800/50 rounded-lg">
                    <Input
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                    />
                    <div className="flex gap-4 items-center">
                      <select
                        value={editGroupType}
                        onChange={(e) => setEditGroupType(e.target.value as 'single' | 'multiple')}
                        className="rounded-md border border-stone-700 bg-stone-900 text-stone-200 px-3 py-2 text-sm"
                      >
                        <option value="single">Single choice</option>
                        <option value="multiple">Multiple choice</option>
                      </select>
                      <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editGroupRequired}
                          onChange={(e) => setEditGroupRequired(e.target.checked)}
                          className="rounded border-stone-600"
                        />
                        Required
                      </label>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setEditingGroup(null)}>
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleUpdateGroup(group.id)}
                        disabled={isPending}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mb-3">
                    <Button variant="ghost" size="sm" onClick={() => startEditGroup(group)}>
                      Edit Group
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                    >
                      Delete Group
                    </Button>
                  </div>
                )}

                {/* Modifier list */}
                {group.modifiers.length === 0 ? (
                  <p className="text-stone-500 text-sm">No modifiers in this group yet.</p>
                ) : (
                  <div className="space-y-2">
                    {group.modifiers.map((mod) => (
                      <div
                        key={mod.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-stone-800/30"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm ${mod.available ? 'text-stone-200' : 'text-stone-500 line-through'}`}
                          >
                            {mod.name}
                          </span>
                          {mod.price_adjustment_cents > 0 && (
                            <span className="text-xs text-emerald-400">
                              +${(mod.price_adjustment_cents / 100).toFixed(2)}
                            </span>
                          )}
                          {mod.price_adjustment_cents < 0 && (
                            <span className="text-xs text-red-400">
                              -${(Math.abs(mod.price_adjustment_cents) / 100).toFixed(2)}
                            </span>
                          )}
                          {mod.is_default && <Badge variant="default">Default</Badge>}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleModifier(mod.id, mod.available)}
                          >
                            {mod.available ? 'Disable' : 'Enable'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteModifier(mod.id, mod.name)}
                          >
                            &times;
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add modifier */}
                {showNewModifier === group.id ? (
                  <div className="space-y-2 p-3 bg-stone-800/50 rounded-lg">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={newModName}
                        onChange={(e) => setNewModName(e.target.value)}
                        placeholder="Modifier name"
                        autoFocus
                      />
                      <Input
                        type="number"
                        step="0.01"
                        value={newModPrice}
                        onChange={(e) => setNewModPrice(e.target.value)}
                        placeholder="Price adjustment ($)"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newModDefault}
                        onChange={(e) => setNewModDefault(e.target.checked)}
                        className="rounded border-stone-600"
                      />
                      Default selection
                    </label>
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setShowNewModifier(null)}>
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAddModifier(group.id)}
                        disabled={isPending}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowNewModifier(group.id)
                      setNewModName('')
                      setNewModPrice('')
                      setNewModDefault(false)
                    }}
                  >
                    + Add Modifier
                  </Button>
                )}
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
