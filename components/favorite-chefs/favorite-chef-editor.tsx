'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Edit2, X, ExternalLink, Share2, Copy, Check } from 'lucide-react'
import {
  createFavoriteChef,
  updateFavoriteChef,
  deleteFavoriteChef,
  generateSocialText,
} from '@/lib/favorite-chefs/actions'
import type { FavoriteChef } from '@/lib/favorite-chefs/types'
import { toast } from 'sonner'

interface FavoriteChefEditorProps {
  chefs: FavoriteChef[]
}

export function FavoriteChefEditor({ chefs: initialChefs }: FavoriteChefEditorProps) {
  const [chefs, setChefs] = useState<FavoriteChef[]>(initialChefs)
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [copied, setCopied] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formReason, setFormReason] = useState('')
  const [formImageUrl, setFormImageUrl] = useState('')
  const [formWebsiteUrl, setFormWebsiteUrl] = useState('')

  function resetForm() {
    setFormName('')
    setFormReason('')
    setFormImageUrl('')
    setFormWebsiteUrl('')
    setEditingId(null)
    setShowAddForm(false)
  }

  function startEdit(chef: FavoriteChef) {
    setEditingId(chef.id)
    setFormName(chef.chefName)
    setFormReason(chef.reason ?? '')
    setFormImageUrl(chef.imageUrl ?? '')
    setFormWebsiteUrl(chef.websiteUrl ?? '')
    setShowAddForm(false)
  }

  function startAdd() {
    resetForm()
    setShowAddForm(true)
  }

  function handleSave() {
    if (!formName.trim()) {
      toast.error('Chef name is required')
      return
    }

    if (editingId) {
      startTransition(async () => {
        try {
          const result = await updateFavoriteChef(editingId, {
            chefName: formName.trim(),
            reason: formReason.trim() || null,
            imageUrl: formImageUrl.trim() || null,
            websiteUrl: formWebsiteUrl.trim() || null,
          })
          setChefs((prev) => prev.map((c) => (c.id === editingId ? result.chef : c)))
          resetForm()
          toast.success('Updated')
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to update'
          toast.error(message)
        }
      })
    } else {
      startTransition(async () => {
        try {
          const result = await createFavoriteChef({
            chefName: formName.trim(),
            reason: formReason.trim() || undefined,
            imageUrl: formImageUrl.trim() || undefined,
            websiteUrl: formWebsiteUrl.trim() || undefined,
          })
          setChefs((prev) => [...prev, result.chef])
          resetForm()
          toast.success('Added!')
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to add'
          toast.error(message)
        }
      })
    }
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteFavoriteChef(id)
        setChefs((prev) => prev.filter((c) => c.id !== id))
        if (editingId === id) resetForm()
        toast.success('Removed')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to remove'
        toast.error(message)
      }
    })
  }

  function handleShare() {
    startTransition(async () => {
      try {
        const text = await generateSocialText()
        await navigator.clipboard.writeText(text)
        setCopied(true)
        toast.success('Copied to clipboard! Paste it into your favorite social platform.')
        setTimeout(() => setCopied(false), 3000)
      } catch {
        toast.error('Could not copy to clipboard')
      }
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>My Culinary Heroes</CardTitle>
        <div className="flex gap-2">
          {chefs.length > 0 && (
            <Button size="sm" variant="ghost" onClick={handleShare} disabled={isPending}>
              {copied ? (
                <Check className="h-4 w-4 mr-1 text-emerald-500" />
              ) : (
                <Share2 className="h-4 w-4 mr-1" />
              )}
              {copied ? 'Copied!' : 'Share'}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={startAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Add Chef
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPending && (
          <div className="absolute inset-0 bg-stone-900/50 z-10 rounded-xl pointer-events-none" />
        )}

        {/* Add / Edit Form */}
        {(showAddForm || editingId) && (
          <div className="rounded-lg border border-brand-700 bg-brand-950/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-stone-100">
                {editingId ? 'Edit Favorite Chef' : 'Add a Culinary Hero'}
              </h4>
              <button onClick={resetForm} className="text-stone-400 hover:text-stone-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <Input
              label="Chef Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Thomas Keller, Julia Child"
              required
            />

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">
                Why they inspire you
              </label>
              <textarea
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                placeholder="What about their work, philosophy, or craft inspires you?"
                rows={3}
                maxLength={1000}
                className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Photo URL (optional)"
                value={formImageUrl}
                onChange={(e) => setFormImageUrl(e.target.value)}
                placeholder="https://..."
              />
              <Input
                label="Website / Social (optional)"
                value={formWebsiteUrl}
                onChange={(e) => setFormWebsiteUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} loading={isPending}>
                {editingId ? 'Update' : 'Add Chef'}
              </Button>
              <Button size="sm" variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Chef List */}
        <div className="space-y-2">
          {chefs.map((chef, index) => (
            <div
              key={chef.id}
              className="flex items-start gap-3 rounded-lg border border-stone-700 p-3 hover:bg-stone-800 transition-colors"
            >
              {/* Number badge */}
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-900 text-brand-400 flex items-center justify-center text-sm font-semibold">
                {index + 1}
              </div>

              {/* Image thumbnail */}
              {chef.imageUrl && (
                <img
                  src={chef.imageUrl}
                  alt={chef.chefName}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-stone-100">{chef.chefName}</p>
                  {chef.websiteUrl && (
                    <a
                      href={chef.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-400 hover:text-brand-600"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                {chef.reason && (
                  <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{chef.reason}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => startEdit(chef)}
                  className="p-1.5 rounded text-stone-400 hover:text-brand-600 hover:bg-stone-700"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(chef.id)}
                  className="p-1.5 rounded text-stone-400 hover:text-red-500 hover:bg-stone-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {chefs.length === 0 && !showAddForm && (
          <div className="text-center py-10">
            <p className="text-stone-400 italic">
              No favorite chefs yet. Who inspires your cooking?
            </p>
            <Button size="sm" variant="ghost" onClick={startAdd} className="mt-3">
              <Plus className="h-4 w-4 mr-1" />
              Add your first culinary hero
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
