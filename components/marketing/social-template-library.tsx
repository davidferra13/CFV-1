'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import {
  getSocialTemplates,
  seedDefaultTemplates,
  deleteSocialTemplate,
  duplicateSocialTemplate,
  incrementUsedCount,
  type SocialTemplate,
  type SocialPlatform,
  type TemplateType,
} from '@/lib/marketing/social-template-actions'
import { SocialTemplateEditor } from './social-template-editor'

const PLATFORMS: { value: SocialPlatform | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '📋' },
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'facebook', label: 'Facebook', icon: '👤' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'twitter', label: 'Twitter/X', icon: '🐦' },
  { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
]

const TEMPLATE_TYPES: { value: TemplateType; label: string }[] = [
  { value: 'post', label: 'Post' },
  { value: 'story', label: 'Story' },
  { value: 'reel_caption', label: 'Reel Caption' },
  { value: 'bio', label: 'Bio' },
  { value: 'hashtag_set', label: 'Hashtag Set' },
]

function platformColor(p: SocialPlatform): string {
  switch (p) {
    case 'instagram':
      return 'bg-pink-100 text-pink-800 border-pink-200'
    case 'facebook':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'tiktok':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'twitter':
      return 'bg-sky-100 text-sky-800 border-sky-200'
    case 'linkedin':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200'
  }
}

function typeLabel(t: TemplateType): string {
  return TEMPLATE_TYPES.find((tt) => tt.value === t)?.label ?? t
}

export function SocialTemplateLibrary() {
  const [templates, setTemplates] = useState<SocialTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<TemplateType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingTemplate, setEditingTemplate] = useState<SocialTemplate | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [isPending, startTransition] = useTransition()

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const filters: { platform?: SocialPlatform; templateType?: TemplateType } = {}
      if (platformFilter !== 'all') filters.platform = platformFilter
      if (typeFilter !== 'all') filters.templateType = typeFilter

      const result = await getSocialTemplates(filters)
      if (result.error) {
        setError(result.error)
      } else {
        setTemplates(result.data)
        setError(null)
      }
    } catch (err) {
      setError('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }, [platformFilter, typeFilter])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const filteredTemplates = templates.filter((t) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      t.title.toLowerCase().includes(q) ||
      t.content.toLowerCase().includes(q) ||
      t.hashtags.some((h) => h.toLowerCase().includes(q))
    )
  })

  const handleSeedDefaults = () => {
    startTransition(async () => {
      try {
        const result = await seedDefaultTemplates()
        if (result.error) {
          setError(result.error)
        } else {
          await fetchTemplates()
        }
      } catch (err) {
        setError('Failed to seed default templates')
      }
    })
  }

  const handleDelete = (id: string) => {
    const previous = [...templates]
    setTemplates((prev) => prev.filter((t) => t.id !== id))
    startTransition(async () => {
      try {
        const result = await deleteSocialTemplate(id)
        if (result.error) {
          setTemplates(previous)
          setError(result.error)
        }
      } catch (err) {
        setTemplates(previous)
        setError('Failed to delete template')
      }
    })
  }

  const handleDuplicate = (id: string) => {
    startTransition(async () => {
      try {
        const result = await duplicateSocialTemplate(id)
        if (result.error) {
          setError(result.error)
        } else {
          await fetchTemplates()
        }
      } catch (err) {
        setError('Failed to duplicate template')
      }
    })
  }

  const handleCopyContent = async (template: SocialTemplate) => {
    const fullContent =
      template.hashtags.length > 0
        ? `${template.content}\n\n${template.hashtags.join(' ')}`
        : template.content

    try {
      await navigator.clipboard.writeText(fullContent)
      await incrementUsedCount(template.id)
      setTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? { ...t, used_count: t.used_count + 1 } : t))
      )
    } catch {
      setError('Failed to copy to clipboard')
    }
  }

  const handleEditorClose = () => {
    setShowEditor(false)
    setEditingTemplate(null)
    fetchTemplates()
  }

  if (showEditor) {
    return <SocialTemplateEditor template={editingTemplate} onClose={handleEditorClose} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Social Templates</h2>
          <p className="text-sm text-gray-500">
            Ready-to-use content templates for your social media
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeedDefaults}
            disabled={isPending}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Use Defaults
          </button>
          <button
            onClick={() => {
              setEditingTemplate(null)
              setShowEditor(true)
            }}
            className="px-3 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            + New Template
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3">
        {/* Platform tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {PLATFORMS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPlatformFilter(p.value)}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-full border whitespace-nowrap ${
                platformFilter === p.value
                  ? 'bg-orange-100 text-orange-800 border-orange-300'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        {/* Type filter + search */}
        <div className="flex gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TemplateType | 'all')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
          >
            <option value="all">All Types</option>
            {TEMPLATE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* Template Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading templates...</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-2">No templates found</p>
          <p className="text-sm text-gray-400">
            Create your own or use the default starter templates to get going.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow bg-white"
            >
              {/* Card header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{template.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${platformColor(
                        template.platform
                      )}`}
                    >
                      {template.platform}
                    </span>
                    <span className="text-xs text-gray-500">
                      {typeLabel(template.template_type)}
                    </span>
                  </div>
                </div>
                {template.is_default && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    Default
                  </span>
                )}
              </div>

              {/* Content preview */}
              <p className="text-sm text-gray-600 line-clamp-3 mb-3">{template.content}</p>

              {/* Hashtags preview */}
              {template.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.hashtags.slice(0, 4).map((tag, i) => (
                    <span
                      key={i}
                      className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {template.hashtags.length > 4 && (
                    <span className="text-xs text-gray-400">
                      +{template.hashtags.length - 4} more
                    </span>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  Used {template.used_count} time{template.used_count !== 1 ? 's' : ''}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleCopyContent(template)}
                    className="p-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                    title="Copy to clipboard"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => handleDuplicate(template.id)}
                    disabled={isPending}
                    className="p-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
                    title="Duplicate"
                  >
                    Dup
                  </button>
                  <button
                    onClick={() => {
                      setEditingTemplate(template)
                      setShowEditor(true)
                    }}
                    className="p-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    disabled={isPending}
                    className="p-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded disabled:opacity-50"
                    title="Delete"
                  >
                    Del
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
