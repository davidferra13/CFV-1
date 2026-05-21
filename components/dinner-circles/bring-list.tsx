'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  claimBringItem,
  unclaimBringItem,
  markBrought,
  createBringItem,
  deleteBringItem,
} from '@/lib/dinner-circles/bring-lists'

interface BringItem {
  id: string
  item_name: string
  item_notes: string | null
  category: string | null
  quantity: string | null
  required: boolean
  claimed_by: string | null
  brought_at: string | null
  is_fulfilled: boolean
  created_by: string
}

interface BringListProps {
  circleId: string
  items: BringItem[]
  callerProfileId: string
  isHost: boolean
  onRefresh?: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  drinks: 'Drinks',
  snacks: 'Snacks',
  supplies: 'Supplies',
  food: 'Food',
  other: 'Other',
}

export function BringList({ circleId, items, callerProfileId, isHost, onRefresh }: BringListProps) {
  const [isPending, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<string>('other')
  const [newQuantity, setNewQuantity] = useState('')

  function handleClaim(itemId: string) {
    startTransition(async () => {
      try {
        await claimBringItem({ circleId, itemId })
        toast.success('Item claimed')
        onRefresh?.()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to claim item')
      }
    })
  }

  function handleUnclaim(itemId: string) {
    startTransition(async () => {
      try {
        await unclaimBringItem({ circleId, itemId })
        toast.success('Claim removed')
        onRefresh?.()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to unclaim')
      }
    })
  }

  function handleMarkBrought(itemId: string) {
    startTransition(async () => {
      try {
        await markBrought({ circleId, itemId })
        toast.success('Marked as brought')
        onRefresh?.()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to mark brought')
      }
    })
  }

  function handleDelete(itemId: string) {
    startTransition(async () => {
      try {
        await deleteBringItem({ circleId, itemId })
        toast.success('Item removed')
        onRefresh?.()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete item')
      }
    })
  }

  function handleAdd() {
    if (!newName.trim()) return
    startTransition(async () => {
      try {
        await createBringItem({
          circleId,
          itemName: newName.trim(),
          required: false,
          category: newCategory as 'drinks' | 'snacks' | 'supplies' | 'food' | 'other',
          quantity: newQuantity.trim() || undefined,
        })
        toast.success('Item added')
        setNewName('')
        setNewQuantity('')
        setShowAdd(false)
        onRefresh?.()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to add item')
      }
    })
  }

  const unclaimed = items.filter((i) => !i.claimed_by && !i.is_fulfilled)
  const claimed = items.filter((i) => i.claimed_by && !i.is_fulfilled)
  const fulfilled = items.filter((i) => i.is_fulfilled)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Bring List</h3>
        {(isHost || true) && (
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
            disabled={isPending}
          >
            + Add item
          </button>
        )}
      </div>

      {showAdd && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Item name"
            className="w-full rounded-md border px-3 py-2 text-sm"
            maxLength={200}
          />
          <div className="flex gap-2">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              aria-label="Category"
              className="flex-1 rounded-md border px-3 py-2 text-sm"
            >
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              placeholder="Quantity (optional)"
              className="flex-1 rounded-md border px-3 py-2 text-sm"
              maxLength={100}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newName.trim() || isPending}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">No items yet. Add the first one.</p>
      )}

      {unclaimed.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Available ({unclaimed.length})
          </p>
          <ul className="space-y-2">
            {unclaimed.map((item) => (
              <BringItemRow
                key={item.id}
                item={item}
                callerProfileId={callerProfileId}
                isHost={isHost}
                isPending={isPending}
                onClaim={() => handleClaim(item.id)}
                onUnclaim={() => handleUnclaim(item.id)}
                onMarkBrought={() => handleMarkBrought(item.id)}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
          </ul>
        </section>
      )}

      {claimed.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Claimed ({claimed.length})
          </p>
          <ul className="space-y-2">
            {claimed.map((item) => (
              <BringItemRow
                key={item.id}
                item={item}
                callerProfileId={callerProfileId}
                isHost={isHost}
                isPending={isPending}
                onClaim={() => handleClaim(item.id)}
                onUnclaim={() => handleUnclaim(item.id)}
                onMarkBrought={() => handleMarkBrought(item.id)}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
          </ul>
        </section>
      )}

      {fulfilled.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Brought ({fulfilled.length})
          </p>
          <ul className="space-y-2 opacity-60">
            {fulfilled.map((item) => (
              <BringItemRow
                key={item.id}
                item={item}
                callerProfileId={callerProfileId}
                isHost={isHost}
                isPending={isPending}
                onClaim={() => {}}
                onUnclaim={() => {}}
                onMarkBrought={() => {}}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

interface BringItemRowProps {
  item: BringItem
  callerProfileId: string
  isHost: boolean
  isPending: boolean
  onClaim: () => void
  onUnclaim: () => void
  onMarkBrought: () => void
  onDelete: () => void
}

function BringItemRow({
  item,
  callerProfileId,
  isHost,
  isPending,
  onClaim,
  onUnclaim,
  onMarkBrought,
  onDelete,
}: BringItemRowProps) {
  const isClaimer = item.claimed_by === callerProfileId
  const isCreator = item.created_by === callerProfileId

  return (
    <li className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium truncate ${item.is_fulfilled ? 'line-through text-muted-foreground' : ''}`}
          >
            {item.item_name}
          </span>
          {item.required && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
              required
            </span>
          )}
          {item.category && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {CATEGORY_LABELS[item.category] ?? item.category}
            </span>
          )}
        </div>
        {item.item_notes && (
          <p className="mt-0.5 text-xs text-muted-foreground truncate">{item.item_notes}</p>
        )}
        {item.quantity && (
          <p className="mt-0.5 text-xs text-muted-foreground">Qty: {item.quantity}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!item.is_fulfilled && (
          <>
            {!item.claimed_by && (
              <button
                onClick={onClaim}
                disabled={isPending}
                className="rounded-md bg-brand-600 px-3 py-1.5 text-xs text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Claim
              </button>
            )}
            {isClaimer && (
              <>
                <button
                  onClick={onMarkBrought}
                  disabled={isPending}
                  className="rounded-md bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Brought it
                </button>
                <button
                  onClick={onUnclaim}
                  disabled={isPending}
                  className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
                >
                  Unclaim
                </button>
              </>
            )}
            {!isClaimer && item.claimed_by && (
              <span className="text-xs text-muted-foreground">Claimed</span>
            )}
          </>
        )}

        {(isHost || isCreator) && !item.is_fulfilled && (
          <button
            onClick={onDelete}
            disabled={isPending}
            className="ml-1 text-muted-foreground hover:text-destructive text-xs"
            title="Delete item"
          >
            Remove
          </button>
        )}
      </div>
    </li>
  )
}
