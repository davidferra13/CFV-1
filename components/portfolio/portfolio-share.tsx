'use client'

// PortfolioShare - Public link preview, copy-to-clipboard, and public/private toggling.
// Shows the PortfolioShowcase in a preview frame with sharing controls.

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, Globe, Lock, Eye, ExternalLink } from '@/components/ui/icons'
import { updatePortfolioItem } from '@/lib/portfolio/actions'
import type { PortfolioItem } from '@/lib/portfolio/actions'
import { toast } from 'sonner'

interface PortfolioShareProps {
  items: PortfolioItem[]
  publicLink: string | null
}

export function PortfolioShare({ items: initialItems, publicLink }: PortfolioShareProps) {
  const [items, setItems] = useState<PortfolioItem[]>(initialItems)
  const [isPending, startTransition] = useTransition()

  const publicCount = items.filter((i) => i.isPublic).length
  const privateCount = items.filter((i) => !i.isPublic).length
  const totalCount = items.length

  function handleCopyLink() {
    if (!publicLink) {
      toast.error('No public portfolio link available. Set your chef slug in settings.')
      return
    }
    const fullUrl = `${window.location.origin}${publicLink}`
    navigator.clipboard.writeText(fullUrl).then(
      () => toast.success('Portfolio link copied to clipboard'),
      () => toast.error('Failed to copy link')
    )
  }

  function handleTogglePublic(itemId: string, makePublic: boolean) {
    const previous = [...items]
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, isPublic: makePublic } : i)))

    startTransition(async () => {
      try {
        await updatePortfolioItem(itemId, { isPublic: makePublic })
        toast.success(makePublic ? 'Photo set to public' : 'Photo set to private')
      } catch {
        setItems(previous)
        toast.error('Failed to update visibility')
      }
    })
  }

  function handleBulkToggle(makePublic: boolean) {
    const affected = items.filter((i) => i.isPublic !== makePublic)
    if (affected.length === 0) return

    const previous = [...items]
    setItems((prev) => prev.map((i) => ({ ...i, isPublic: makePublic })))

    startTransition(async () => {
      try {
        await Promise.all(
          affected.map((item) => updatePortfolioItem(item.id, { isPublic: makePublic }))
        )
        toast.success(`All items set to ${makePublic ? 'public' : 'private'}`)
      } catch {
        setItems(previous)
        toast.error('Failed to update visibility')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Public link card */}
      <Card>
        <CardHeader>
          <CardTitle>Public Portfolio Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {publicLink ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-300 font-mono truncate">
                {typeof window !== 'undefined'
                  ? `${window.location.origin}${publicLink}`
                  : publicLink}
              </div>
              <Button size="sm" onClick={handleCopyLink}>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
              <a
                href={publicLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <p className="text-sm text-stone-400">
              Set your chef profile slug in Settings to generate a public portfolio link.
            </p>
          )}

          {/* Stats */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-stone-300">
              <Globe className="h-4 w-4 text-green-500" />
              <span>{publicCount} public</span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-300">
              <Lock className="h-4 w-4 text-stone-500" />
              <span>{privateCount} private</span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-400">
              <Eye className="h-4 w-4" />
              <span>{totalCount} total</span>
            </div>
          </div>

          {/* Bulk actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleBulkToggle(true)}
              disabled={isPending || privateCount === 0}
            >
              Make all public
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleBulkToggle(false)}
              disabled={isPending || publicCount === 0}
            >
              Make all private
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Item visibility grid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Photo Visibility</CardTitle>
          <span className="text-sm text-stone-400">{totalCount} items</span>
        </CardHeader>
        <CardContent>
          {totalCount === 0 ? (
            <p className="text-sm text-stone-500 italic py-8 text-center">
              No portfolio items yet. Add items from the Curated tab.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`relative group rounded-lg border overflow-hidden bg-stone-900 transition ${
                    item.isPublic ? 'border-stone-700' : 'border-stone-700 opacity-60'
                  }`}
                >
                  <div className="relative aspect-square bg-stone-800">
                    <Image
                      src={item.photoUrl}
                      alt={item.dishName || item.caption || 'Portfolio photo'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    />
                    {/* Visibility badge */}
                    <div className="absolute top-1.5 right-1.5">
                      <Badge variant={item.isPublic ? 'success' : 'default'}>
                        {item.isPublic ? 'Public' : 'Private'}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-2 flex items-center justify-between">
                    <p className="text-xs text-stone-300 truncate flex-1">
                      {item.dishName || item.caption || 'Untitled'}
                    </p>
                    <button
                      onClick={() => handleTogglePublic(item.id, !item.isPublic)}
                      className={`ml-2 p-1 rounded transition ${
                        item.isPublic
                          ? 'text-green-500 hover:text-red-400'
                          : 'text-stone-500 hover:text-green-400'
                      }`}
                      title={item.isPublic ? 'Make private' : 'Make public'}
                      disabled={isPending}
                    >
                      {item.isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
