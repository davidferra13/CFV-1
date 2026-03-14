'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { updateProspectTags } from '@/lib/prospecting/pipeline-actions'
import { Loader2, Plus, X, Tag } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ProspectTagEditorProps {
  prospectId: string
  initialTags: string[]
}

export function ProspectTagEditor({ prospectId, initialTags }: ProspectTagEditorProps) {
  const [tags, setTags] = useState<string[]>(initialTags)
  const [newTag, setNewTag] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function saveTags(updatedTags: string[]) {
    startTransition(async () => {
      try {
        await updateProspectTags(prospectId, updatedTags)
        setTags(updatedTags)
        router.refresh()
      } catch {
        // revert on failure
        setTags(tags)
      }
    })
  }

  function handleAddTag() {
    const tag = newTag.trim().toLowerCase()
    if (!tag || tags.includes(tag)) {
      setNewTag('')
      return
    }
    const updated = [...tags, tag]
    setNewTag('')
    saveTags(updated)
  }

  function handleRemoveTag(tagToRemove: string) {
    const updated = tags.filter((t) => t !== tagToRemove)
    saveTags(updated)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  return (
    <div>
      <span className="text-xs font-medium text-stone-500 flex items-center gap-1 mb-1.5">
        <Tag className="h-3 w-3" />
        Tags
      </span>
      <div className="flex flex-wrap gap-1.5 items-center">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-brand-950 border border-brand-700 px-2 py-0.5 text-xs text-brand-400"
          >
            {tag}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              disabled={isPending}
              className="hover:text-red-400 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add tag..."
            className="w-24 rounded border border-stone-700 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddTag}
            disabled={!newTag.trim() || isPending}
            className="h-6 w-6 p-0"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
