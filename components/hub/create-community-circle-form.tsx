'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCommunityCircle } from '@/lib/hub/community-circle-actions'

const EMOJI_OPTIONS = ['💬', '🍣', '🥘', '🍷', '🌮', '🍕', '🥂', '☕', '🍰', '🔥', '🌱', '🧑‍🍳']

const SUGGESTED_TOPICS = [
  'Italian',
  'Japanese',
  'Mexican',
  'French',
  'Thai',
  'Indian',
  'BBQ',
  'Seafood',
  'Plant-Based',
  'Gluten-Free',
  'Keto',
  'Wine',
  'Cocktails',
  'Baking',
  'Meal Prep',
  'Farm-to-Table',
  'Fermentation',
  'Pastry',
  'Street Food',
  'Fine Dining',
]

interface Props {
  onCreated?: (groupToken: string) => void
  onCancel?: () => void
}

export function CreateCommunityCircleForm({ onCreated, onCancel }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('💬')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [topics, setTopics] = useState<string[]>([])
  const [customTopic, setCustomTopic] = useState('')

  const toggleTopic = (topic: string) => {
    setTopics((prev) => (prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]))
  }

  const addCustomTopic = () => {
    const t = customTopic.trim()
    if (t && !topics.includes(t)) {
      setTopics((prev) => [...prev, t])
    }
    setCustomTopic('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)

    startTransition(async () => {
      try {
        const result = await createCommunityCircle({
          name: name.trim(),
          description: description.trim() || undefined,
          emoji,
          visibility,
          topics: topics.length > 0 ? topics : undefined,
        })
        if (onCreated) {
          onCreated(result.groupToken)
        } else {
          router.push(`/hub/g/${result.groupToken}`)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create circle')
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-stone-700 bg-stone-800/50 p-5 space-y-4"
    >
      <h3 className="text-base font-semibold text-stone-200">Create a Circle</h3>

      {/* Emoji picker */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-stone-400">Icon</label>
        <div className="flex flex-wrap gap-1">
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`rounded-lg p-1.5 text-lg transition-colors ${
                emoji === e ? 'bg-stone-600 ring-1 ring-amber-500' : 'hover:bg-stone-700'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-stone-400">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. All Things Japanese Food"
          maxLength={100}
          className="w-full rounded-lg bg-stone-900 px-3 py-2 text-sm text-stone-200 outline-none ring-1 ring-stone-700 placeholder:text-stone-500 focus:ring-amber-500"
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-stone-400">
          Description (optional)
        </label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this circle about?"
          maxLength={500}
          className="w-full rounded-lg bg-stone-900 px-3 py-2 text-sm text-stone-200 outline-none ring-1 ring-stone-700 placeholder:text-stone-500 focus:ring-amber-500"
        />
      </div>

      {/* Visibility */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-stone-400">Visibility</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setVisibility('public')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              visibility === 'public'
                ? 'bg-amber-900/40 text-amber-300 ring-1 ring-amber-500/50'
                : 'bg-stone-900 text-stone-400 ring-1 ring-stone-700 hover:text-stone-200'
            }`}
          >
            Public
          </button>
          <button
            type="button"
            onClick={() => setVisibility('private')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              visibility === 'private'
                ? 'bg-amber-900/40 text-amber-300 ring-1 ring-amber-500/50'
                : 'bg-stone-900 text-stone-400 ring-1 ring-stone-700 hover:text-stone-200'
            }`}
          >
            Private
          </button>
        </div>
        <p className="mt-1 text-xs text-stone-500">
          {visibility === 'public'
            ? 'Anyone can discover and join this circle'
            : 'Only people with the invite link can join'}
        </p>
      </div>

      {/* Topics */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-stone-400">Topics (optional)</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {SUGGESTED_TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTopic(t)}
              className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                topics.includes(t)
                  ? 'bg-amber-900/40 text-amber-300 ring-1 ring-amber-500/50'
                  : 'bg-stone-900 text-stone-400 ring-1 ring-stone-700 hover:text-stone-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCustomTopic()
              }
            }}
            placeholder="Add custom topic"
            className="flex-1 rounded-lg bg-stone-900 px-3 py-1.5 text-xs text-stone-200 outline-none ring-1 ring-stone-700 placeholder:text-stone-500 focus:ring-amber-500"
          />
          <button
            type="button"
            onClick={addCustomTopic}
            disabled={!customTopic.trim()}
            className="rounded-lg bg-stone-700 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-600 disabled:opacity-30"
          >
            Add
          </button>
        </div>
        {/* Selected custom topics */}
        {topics.filter((t) => !SUGGESTED_TOPICS.includes(t)).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {topics
              .filter((t) => !SUGGESTED_TOPICS.includes(t))
              .map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-900/40 px-2.5 py-1 text-xs text-amber-300"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => toggleTopic(t)}
                    className="text-amber-500 hover:text-amber-200"
                  >
                    x
                  </button>
                </span>
              ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-900/20 px-3 py-2 text-xs text-red-300">{error}</div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!name.trim() || isPending}
          className="flex-1 rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-30 transition-colors"
        >
          {isPending ? 'Creating...' : 'Create Circle'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-stone-700 px-4 py-2.5 text-sm text-stone-300 hover:bg-stone-600"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
