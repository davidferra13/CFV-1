'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addTag, removeTag } from '@/lib/guests/tag-actions'

const PRESET_TAGS = [
  { tag: 'VIP', color: 'gold' },
  { tag: 'Regular', color: 'brand' },
  { tag: 'New', color: 'green' },
  { tag: 'Problem', color: 'red' },
] as const

const TAG_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  gold: { bg: 'bg-amber-950', text: 'text-amber-400', ring: 'ring-amber-800' },
  brand: { bg: 'bg-brand-950', text: 'text-brand-400', ring: 'ring-brand-800' },
  green: { bg: 'bg-emerald-950', text: 'text-emerald-400', ring: 'ring-emerald-800' },
  red: { bg: 'bg-red-950', text: 'text-red-400', ring: 'ring-red-800' },
  purple: { bg: 'bg-purple-950', text: 'text-purple-400', ring: 'ring-purple-800' },
}

function getTagStyle(color?: string | null) {
  const c = TAG_COLORS[color || ''] || TAG_COLORS.brand
  return `${c.bg} ${c.text} ring-1 ring-inset ${c.ring}`
}

interface GuestTag {
  id: string
  tag: string
  color: string | null
}

interface GuestTagsProps {
  guestId: string
  tags: GuestTag[]
}

export function GuestTags({ guestId, tags }: GuestTagsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [customTag, setCustomTag] = useState('')

  const existingTags = new Set(tags.map((t) => t.tag))

  const handleAddPreset = async (tag: string, color: string) => {
    if (existingTags.has(tag)) return
    setLoading(true)
    try {
      await addTag(guestId, tag, color)
      router.refresh()
    } catch (err: any) {
      console.error('[GuestTags] add error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCustom = async () => {
    if (!customTag.trim()) return
    setLoading(true)
    try {
      await addTag(guestId, customTag.trim(), 'brand')
      setCustomTag('')
      setShowAdd(false)
      router.refresh()
    } catch (err: any) {
      console.error('[GuestTags] add custom error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (tag: string) => {
    setLoading(true)
    try {
      await removeTag(guestId, tag)
      router.refresh()
    } catch (err: any) {
      console.error('[GuestTags] remove error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Current tags */}
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 && <span className="text-xs text-stone-500">No tags yet</span>}
        {tags.map((t) => (
          <span
            key={t.id}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getTagStyle(t.color)}`}
          >
            {t.tag}
            <button
              onClick={() => handleRemove(t.tag)}
              className="ml-0.5 hover:opacity-70 transition-opacity"
              disabled={loading}
              aria-label={`Remove ${t.tag} tag`}
            >
              x
            </button>
          </span>
        ))}
      </div>

      {/* Add tag options */}
      <div className="flex flex-wrap gap-2 items-center">
        {PRESET_TAGS.filter((p) => !existingTags.has(p.tag)).map((preset) => (
          <button
            key={preset.tag}
            onClick={() => handleAddPreset(preset.tag, preset.color)}
            disabled={loading}
            className="text-xs px-2 py-1 rounded-lg bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300 transition-colors"
          >
            + {preset.tag}
          </button>
        ))}

        {showAdd ? (
          <div className="flex gap-2 items-center">
            <Input
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              placeholder="Custom tag..."
              className="w-32 h-8 text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddCustom()
                }
              }}
            />
            <Button variant="ghost" size="sm" onClick={handleAddCustom} loading={loading}>
              Add
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="text-xs px-2 py-1 rounded-lg bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300 transition-colors"
          >
            + Custom
          </button>
        )}
      </div>
    </div>
  )
}
