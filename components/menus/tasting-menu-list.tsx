'use client'

// TastingMenuList - Grid display of tasting menus with duplicate/delete actions
// Click a menu card to open the form for editing

import { useState, useTransition } from 'react'
import {
  deleteTastingMenu,
  duplicateTastingMenu,
  type TastingMenu,
} from '@/lib/menus/tasting-menu-actions'

type Props = {
  menus: TastingMenu[]
  onEdit: (id: string) => void
  onPreview: (id: string) => void
  onRefresh: () => void
}

export function TastingMenuList({ menus, onEdit, onPreview, onRefresh }: Props) {
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This will remove all courses too.`)) return

    const previousMenus = menus
    setDeletingId(id)

    startTransition(async () => {
      try {
        await deleteTastingMenu(id)
        onRefresh()
      } catch (err) {
        console.error('[TastingMenuList] Delete error:', err)
        alert('Failed to delete tasting menu')
      } finally {
        setDeletingId(null)
      }
    })
  }

  function handleDuplicate(id: string, name: string) {
    const newName = prompt('Name for the copy:', `${name} (Copy)`)
    if (!newName?.trim()) return

    startTransition(async () => {
      try {
        await duplicateTastingMenu(id, newName.trim())
        onRefresh()
      } catch (err) {
        console.error('[TastingMenuList] Duplicate error:', err)
        alert('Failed to duplicate tasting menu')
      }
    })
  }

  function formatPrice(cents: number | null): string {
    if (!cents) return '-'
    return `$${(cents / 100).toFixed(2)}`
  }

  if (menus.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-stone-700 p-8 text-center">
        <p className="text-sm text-stone-400">No tasting menus yet.</p>
        <p className="mt-1 text-xs text-stone-500">
          Create your first multi-course tasting menu to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {menus.map((menu) => (
        <div
          key={menu.id}
          className="group relative rounded-lg border border-stone-700 bg-stone-900 p-4 shadow-sm transition-shadow hover:shadow-md hover:border-brand-600/50"
        >
          {/* Clickable card body */}
          <button type="button" onClick={() => onEdit(menu.id)} className="block w-full text-left">
            <h3 className="text-sm font-semibold text-stone-100 group-hover:text-brand-400">
              {menu.name}
            </h3>
            {menu.description && (
              <p className="mt-1 line-clamp-2 text-xs text-stone-400">{menu.description}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-stone-800 px-2 py-0.5 text-xs text-stone-300">
                {menu.course_count} courses
              </span>
              {menu.price_per_person_cents && (
                <span className="inline-flex items-center rounded-full bg-green-900/40 px-2 py-0.5 text-xs text-green-400">
                  {formatPrice(menu.price_per_person_cents)}/pp
                </span>
              )}
              {menu.wine_pairing_upcharge_cents && menu.wine_pairing_upcharge_cents > 0 && (
                <span className="inline-flex items-center rounded-full bg-purple-900/40 px-2 py-0.5 text-xs text-purple-400">
                  +{formatPrice(menu.wine_pairing_upcharge_cents)} wine
                </span>
              )}
              {menu.season && (
                <span className="inline-flex items-center rounded-full bg-amber-900/40 px-2 py-0.5 text-xs text-amber-400">
                  {menu.season}
                </span>
              )}
            </div>
          </button>

          {/* Action buttons */}
          <div className="mt-3 flex items-center gap-2 border-t border-stone-800 pt-2">
            <button
              type="button"
              onClick={() => onPreview(menu.id)}
              className="rounded px-2 py-1 text-xs text-stone-400 hover:bg-stone-800 hover:text-stone-200"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => handleDuplicate(menu.id, menu.name)}
              disabled={isPending}
              className="rounded px-2 py-1 text-xs text-stone-400 hover:bg-stone-800 hover:text-stone-200"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => handleDelete(menu.id, menu.name)}
              disabled={isPending || deletingId === menu.id}
              className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-950 hover:text-red-300"
            >
              {deletingId === menu.id ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
