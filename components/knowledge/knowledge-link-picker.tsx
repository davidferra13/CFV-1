'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Link2, Search, X, Calendar, BookOpen, Lightbulb } from '@/components/ui/icons'
import {
  searchLinkableEntities,
  linkKnowledge,
  unlinkKnowledge,
  getLinksFor,
} from '@/lib/knowledge/link-actions'
import type {
  KnowledgeSourceType,
  KnowledgeLinkTargetType,
  KnowledgeLink,
} from '@/lib/knowledge/types'
import { toast } from 'sonner'

const TARGET_TYPES: { value: KnowledgeLinkTargetType; label: string }[] = [
  { value: 'event', label: 'Event' },
  { value: 'recipe', label: 'Recipe' },
  { value: 'ingredient', label: 'Ingredient' },
  { value: 'tip', label: 'Tip' },
  { value: 'note', label: 'Note' },
]

type Props = {
  sourceType: KnowledgeSourceType
  sourceId: string
  onClose: () => void
}

export function KnowledgeLinkPicker({ sourceType, sourceId, onClose }: Props) {
  const [targetType, setTargetType] = useState<KnowledgeLinkTargetType>('event')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: string; label: string }[]>([])
  const [existingLinks, setExistingLinks] = useState<KnowledgeLink[]>([])
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  // Load existing links on mount
  useEffect(() => {
    startTransition(async () => {
      const links = await getLinksFor(sourceType, sourceId)
      setExistingLinks(links)
    })
  }, [sourceType, sourceId])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleSearch() {
    if (!query.trim()) return
    startTransition(async () => {
      const data = await searchLinkableEntities(targetType, query)
      // Filter out already-linked items
      const linkedIds = new Set(
        existingLinks.filter((l) => l.target_type === targetType).map((l) => l.target_id)
      )
      setResults(data.filter((r) => !linkedIds.has(r.id)))
    })
  }

  function handleLink(targetId: string, label: string) {
    startTransition(async () => {
      const result = await linkKnowledge(sourceType, sourceId, targetType, targetId)
      if (result.success) {
        toast.success(`Linked to ${label}`)
        setExistingLinks((prev) => [
          ...prev,
          {
            id: result.id!,
            source_type: sourceType,
            source_id: sourceId,
            target_type: targetType,
            target_id: targetId,
            chef_id: '',
            created_at: new Date().toISOString(),
            target_label: label,
          },
        ])
        setResults((prev) => prev.filter((r) => r.id !== targetId))
      } else {
        toast.error(result.error || 'Failed to link')
      }
    })
  }

  function handleUnlink(linkId: string) {
    startTransition(async () => {
      const result = await unlinkKnowledge(linkId)
      if (result.success) {
        setExistingLinks((prev) => prev.filter((l) => l.id !== linkId))
        toast.success('Link removed')
      } else {
        toast.error('Failed to remove link')
      }
    })
  }

  const targetIcon = (type: KnowledgeLinkTargetType) => {
    switch (type) {
      case 'event':
        return <Calendar className="h-3 w-3 text-blue-400" />
      case 'recipe':
        return <BookOpen className="h-3 w-3 text-emerald-400" />
      case 'ingredient':
        return <span className="text-[10px]">🧂</span>
      case 'tip':
        return <Lightbulb className="h-3 w-3 text-amber-400" />
      case 'note':
        return <BookOpen className="h-3 w-3 text-blue-400" />
    }
  }

  return (
    <div className="rounded-lg border border-stone-600 bg-stone-800 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-stone-300">
          <Link2 className="h-3.5 w-3.5" />
          Link to...
        </span>
        <button type="button" onClick={onClose} className="text-stone-500 hover:text-stone-300">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Existing links */}
      {existingLinks.length > 0 && (
        <div className="space-y-1">
          {existingLinks.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between rounded bg-stone-700/50 px-2 py-1.5"
            >
              <span className="flex items-center gap-1.5 text-xs text-stone-300">
                {targetIcon(link.target_type)}
                <span className="capitalize text-stone-500">{link.target_type}:</span>
                {link.target_label || link.target_id.slice(0, 8)}
              </span>
              <button
                type="button"
                onClick={() => handleUnlink(link.id)}
                disabled={isPending}
                className="text-stone-600 hover:text-red-400 disabled:opacity-40"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Target type selector */}
      <div className="flex gap-1 flex-wrap">
        {TARGET_TYPES.filter((t) => !(t.value === sourceType)).map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              setTargetType(t.value)
              setResults([])
              setQuery('')
            }}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              targetType === t.value
                ? 'bg-amber-700 text-amber-100'
                : 'bg-stone-700 text-stone-400 hover:bg-stone-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-600" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={`Search ${targetType}s...`}
            className="w-full rounded border border-stone-600 bg-stone-900 py-1.5 pl-7 pr-2 text-xs text-stone-200 placeholder:text-stone-600 focus:border-amber-700 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={isPending || !query.trim()}
          className="rounded border border-stone-600 bg-stone-700 px-2.5 py-1.5 text-xs text-stone-300 hover:bg-stone-600 disabled:opacity-40"
        >
          {isPending ? '...' : 'Find'}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="max-h-40 overflow-y-auto space-y-1">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleLink(r.id, r.label)}
              disabled={isPending}
              className="flex w-full items-center gap-2 rounded bg-stone-700/30 px-2 py-1.5 text-left text-xs text-stone-300 hover:bg-stone-700/60 disabled:opacity-40"
            >
              {targetIcon(targetType)}
              <span className="truncate">{r.label}</span>
            </button>
          ))}
        </div>
      )}

      {query.trim() && results.length === 0 && !isPending && (
        <p className="text-center text-[11px] text-stone-600 py-1">No results</p>
      )}
    </div>
  )
}
