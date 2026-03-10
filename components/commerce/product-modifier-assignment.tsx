// Product Modifier Assignment - assign/remove modifier groups to a product
'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  assignModifierGroupToProduct,
  removeModifierGroupFromProduct,
  getProductModifiers,
  getModifierGroups,
} from '@/lib/commerce/modifier-actions'

type ModifierOption = {
  id: string
  name: string
  price_adjustment_cents: number
  is_default: boolean
  available: boolean
}

type ModifierGroup = {
  id: string
  name: string
  selection_type: string
  required: boolean
  modifiers: ModifierOption[]
}

type Props = {
  productId: string
  productName: string
}

export function ProductModifierAssignment({ productId, productName }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [assignedGroups, setAssignedGroups] = useState<ModifierGroup[]>([])
  const [allGroups, setAllGroups] = useState<ModifierGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    loadData()
  }, [productId])

  async function loadData() {
    setLoading(true)
    try {
      const [assigned, all] = await Promise.all([
        getProductModifiers(productId),
        getModifierGroups(),
      ])
      setAssignedGroups(assigned)
      setAllGroups(all)
    } catch (err) {
      console.error('Failed to load modifier data', err)
    } finally {
      setLoading(false)
    }
  }

  const assignedIds = new Set(assignedGroups.map((g) => g.id))
  const availableGroups = allGroups.filter((g) => !assignedIds.has(g.id))

  function handleAssign(groupId: string) {
    startTransition(async () => {
      try {
        await assignModifierGroupToProduct(productId, groupId)
        toast.success('Modifier group assigned')
        setShowDropdown(false)
        await loadData()
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to assign modifier group')
      }
    })
  }

  function handleRemove(groupId: string, groupName: string) {
    if (!confirm(`Remove "${groupName}" from this product?`)) return
    startTransition(async () => {
      try {
        await removeModifierGroupFromProduct(productId, groupId)
        toast.success('Modifier group removed')
        await loadData()
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to remove modifier group')
      }
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-stone-400 text-sm">Loading modifiers...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Modifier Groups</CardTitle>
          {availableGroups.length > 0 && (
            <div className="relative">
              <Button variant="ghost" size="sm" onClick={() => setShowDropdown(!showDropdown)}>
                + Add Group
              </Button>
              {showDropdown && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-stone-900 border border-stone-700 rounded-lg shadow-lg z-10">
                  {availableGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => handleAssign(group.id)}
                      disabled={isPending}
                      className="w-full text-left px-3 py-2 text-sm text-stone-200 hover:bg-stone-800 first:rounded-t-lg last:rounded-b-lg flex items-center justify-between"
                    >
                      <span>{group.name}</span>
                      <span className="text-xs text-stone-500">
                        {group.modifiers.length} options
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {assignedGroups.length === 0 ? (
          <p className="text-stone-500 text-sm">
            No modifier groups assigned. Add groups to let customers customize this product.
          </p>
        ) : (
          <div className="space-y-3">
            {assignedGroups.map((group) => (
              <div key={group.id} className="border border-stone-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-stone-200">{group.name}</span>
                    <Badge variant={group.selection_type === 'single' ? 'default' : 'info'}>
                      {group.selection_type === 'single' ? 'Single' : 'Multiple'}
                    </Badge>
                    {group.required && <Badge variant="warning">Required</Badge>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(group.id, group.name)}
                  >
                    Remove
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.modifiers.map((mod) => (
                    <span
                      key={mod.id}
                      className="text-xs bg-stone-800 text-stone-300 px-2 py-1 rounded"
                    >
                      {mod.name}
                      {mod.price_adjustment_cents > 0 && (
                        <span className="text-emerald-400 ml-1">
                          +${(mod.price_adjustment_cents / 100).toFixed(2)}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
