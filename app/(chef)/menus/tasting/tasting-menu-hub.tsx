'use client'

// TastingMenuHub - Orchestrates list/form/preview views for tasting menus
// Single-page hub: list → create/edit → preview, all without navigation.

import { useState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TastingMenuList } from '@/components/menus/tasting-menu-list'
import { TastingMenuForm } from '@/components/menus/tasting-menu-form'
import { TastingMenuPreview } from '@/components/menus/tasting-menu-preview'
import {
  getTastingMenus,
  getTastingMenu,
  type TastingMenu,
  type TastingMenuWithCourses,
} from '@/lib/menus/tasting-menu-actions'

type View = 'list' | 'create' | 'edit' | 'preview'

type Props = {
  initialMenus: TastingMenu[]
}

export function TastingMenuHub({ initialMenus }: Props) {
  const router = useRouter()
  const [view, setView] = useState<View>('list')
  const [menus, setMenus] = useState(initialMenus)
  const [editMenu, setEditMenu] = useState<TastingMenuWithCourses | null>(null)
  const [previewMenu, setPreviewMenu] = useState<TastingMenuWithCourses | null>(null)
  const [loading, startTransition] = useTransition()

  const refreshList = useCallback(() => {
    startTransition(async () => {
      try {
        const fresh = await getTastingMenus()
        setMenus(fresh)
      } catch (err) {
        console.error('[TastingMenuHub] Refresh failed:', err)
      }
    })
  }, [])

  const handleEdit = useCallback((id: string) => {
    startTransition(async () => {
      try {
        const full = await getTastingMenu(id)
        setEditMenu(full)
        setView('edit')
      } catch (err) {
        console.error('[TastingMenuHub] Load menu failed:', err)
      }
    })
  }, [])

  const handlePreview = useCallback((id: string) => {
    startTransition(async () => {
      try {
        const full = await getTastingMenu(id)
        setPreviewMenu(full)
        setView('preview')
      } catch (err) {
        console.error('[TastingMenuHub] Load preview failed:', err)
      }
    })
  }, [])

  const handleSaved = useCallback(
    (_id: string) => {
      refreshList()
      setEditMenu(null)
      setView('list')
    },
    [refreshList]
  )

  const handleCancel = useCallback(() => {
    setEditMenu(null)
    setPreviewMenu(null)
    setView('list')
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/menus" className="text-sm text-stone-500 hover:text-stone-300">
            ← Menus
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Tasting Menus</h1>
          <p className="text-stone-500 mt-1">
            Multi-course tasting experiences with wine pairings and course progression
          </p>
        </div>
        {view === 'list' && <Button onClick={() => setView('create')}>+ New Tasting Menu</Button>}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-stone-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-600 border-t-brand-500" />
          Loading...
        </div>
      )}

      {/* Views */}
      {view === 'list' && (
        <TastingMenuList
          menus={menus}
          onEdit={handleEdit}
          onPreview={handlePreview}
          onRefresh={refreshList}
        />
      )}

      {view === 'create' && <TastingMenuForm onSaved={handleSaved} onCancel={handleCancel} />}

      {view === 'edit' && editMenu && (
        <TastingMenuForm menu={editMenu} onSaved={handleSaved} onCancel={handleCancel} />
      )}

      {view === 'preview' && previewMenu && (
        <TastingMenuPreview menu={previewMenu} onClose={handleCancel} />
      )}
    </div>
  )
}
