'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  shareCatalogSelection,
  deleteCatalogSelection,
  convertPicksToMenu,
  type CatalogSelectionSummary,
} from '@/lib/menus/catalog-selection-actions'
import { useRouter } from 'next/navigation'

interface CatalogSelectionsListProps {
  selections: CatalogSelectionSummary[]
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-stone-700 text-stone-300' },
  shared: { label: 'Sent', color: 'bg-blue-900 text-blue-400' },
  picks_received: { label: 'Picks In', color: 'bg-green-900 text-green-400' },
  menu_created: { label: 'Menu Created', color: 'bg-brand-900 text-brand-400' },
  expired: { label: 'Expired', color: 'bg-red-900/50 text-red-400' },
}

export function CatalogSelectionsList({ selections }: CatalogSelectionsListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleShare = (selectionId: string) => {
    startTransition(async () => {
      try {
        const result = await shareCatalogSelection(selectionId, 30)
        await navigator.clipboard.writeText(result.url)
        toast.success('Share link copied to clipboard')
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to share')
      }
    })
  }

  const handleCopyLink = async (token: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
    const url = `${baseUrl}/catalog-pick/${token}`
    await navigator.clipboard.writeText(url)
    toast.success('Link copied')
  }

  const handleConvert = (selectionId: string) => {
    startTransition(async () => {
      try {
        const result = await convertPicksToMenu(selectionId)
        toast.success('Menu created from picks')
        router.push(`/menus/${result.menuId}`)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to create menu')
      }
    })
  }

  const handleDelete = (selectionId: string) => {
    startTransition(async () => {
      try {
        await deleteCatalogSelection(selectionId)
        toast.success('Selection deleted')
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete')
      }
    })
  }

  if (selections.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-stone-400 text-sm">No selections yet.</p>
        <p className="text-stone-500 text-xs mt-1">
          Go to your Dish Index, pick courses, and send them to clients.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {selections.map((sel) => {
        const statusInfo = STATUS_LABELS[sel.status] || STATUS_LABELS.draft
        return (
          <Card key={sel.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-medium text-stone-200 truncate">{sel.name}</h3>
                  <span
                    className={`text-xxs font-medium px-2 py-0.5 rounded-full ${statusInfo.color}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                {sel.clientName && <p className="text-xs text-stone-500">For: {sel.clientName}</p>}

                <div className="flex items-center gap-3 mt-2 text-xs text-stone-500">
                  <span>{sel.dishCount} courses offered</span>
                  {sel.pickedCount > 0 && (
                    <span className="text-green-400">
                      {sel.pickedCount} picked
                      {sel.pickerName ? ` by ${sel.pickerName}` : ''}
                    </span>
                  )}
                  <span>
                    {new Date(sel.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {sel.pickerNotes && (
                  <p className="text-xs text-stone-400 mt-2 italic">
                    &ldquo;{sel.pickerNotes}&rdquo;
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {sel.status === 'draft' && (
                  <>
                    <Button size="sm" onClick={() => handleShare(sel.id)} disabled={isPending}>
                      Share
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(sel.id)}
                      disabled={isPending}
                      className="text-red-400 hover:text-red-300"
                    >
                      Delete
                    </Button>
                  </>
                )}

                {sel.status === 'shared' && sel.shareToken && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCopyLink(sel.shareToken!)}
                  >
                    Copy Link
                  </Button>
                )}

                {sel.status === 'picks_received' && (
                  <Button size="sm" onClick={() => handleConvert(sel.id)} disabled={isPending}>
                    {isPending ? 'Creating...' : 'Create Menu'}
                  </Button>
                )}

                {sel.status === 'menu_created' && sel.menuId && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => router.push(`/menus/${sel.menuId}`)}
                  >
                    View Menu
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
