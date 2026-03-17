'use client'

import { useState, useTransition } from 'react'
import {
  createSocialTemplate,
  updateSocialTemplate,
  type SocialTemplate,
  type SocialPlatform,
  type TemplateType,
} from '@/lib/marketing/social-template-actions'
import { PLATFORM_CHAR_LIMITS } from '@/lib/marketing/social-template-constants'

const PLATFORMS: { value: SocialPlatform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'linkedin', label: 'LinkedIn' },
]

const TEMPLATE_TYPES: { value: TemplateType; label: string }[] = [
  { value: 'post', label: 'Post' },
  { value: 'story', label: 'Story' },
  { value: 'reel_caption', label: 'Reel Caption' },
  { value: 'bio', label: 'Bio' },
  { value: 'hashtag_set', label: 'Hashtag Set' },
]

type Props = {
  template?: SocialTemplate | null
  onClose: () => void
}

export function SocialTemplateEditor({ template, onClose }: Props) {
  const isEditing = !!template

  const [platform, setPlatform] = useState<SocialPlatform>(template?.platform ?? 'instagram')
  const [templateType, setTemplateType] = useState<TemplateType>(template?.template_type ?? 'post')
  const [title, setTitle] = useState(template?.title ?? '')
  const [content, setContent] = useState(template?.content ?? '')
  const [hashtags, setHashtags] = useState<string[]>(template?.hashtags ?? [])
  const [newHashtag, setNewHashtag] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  const charLimit = PLATFORM_CHAR_LIMITS[platform]
  const charCount = content.length
  const isOverLimit = charCount > charLimit

  const handleAddHashtag = () => {
    const tag = newHashtag.trim()
    if (!tag) return
    const formatted = tag.startsWith('#') ? tag : `#${tag}`
    if (!hashtags.includes(formatted)) {
      setHashtags([...hashtags, formatted])
    }
    setNewHashtag('')
  }

  const handleRemoveHashtag = (index: number) => {
    setHashtags(hashtags.filter((_, i) => i !== index))
  }

  const handleHashtagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddHashtag()
    }
  }

  const handleSave = () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!content.trim()) {
      setError('Content is required')
      return
    }

    startTransition(async () => {
      try {
        if (isEditing && template) {
          const result = await updateSocialTemplate(template.id, {
            platform,
            template_type: templateType,
            title: title.trim(),
            content: content.trim(),
            hashtags,
          })
          if (result.error) {
            setError(result.error)
            return
          }
        } else {
          const result = await createSocialTemplate({
            platform,
            template_type: templateType,
            title: title.trim(),
            content: content.trim(),
            hashtags,
          })
          if (result.error) {
            setError(result.error)
            return
          }
        }
        onClose()
      } catch (err) {
        setError('Failed to save template')
      }
    })
  }

  const handleCopyToClipboard = async () => {
    const fullContent = hashtags.length > 0 ? `${content}\n\n${hashtags.join(' ')}` : content

    try {
      await navigator.clipboard.writeText(fullContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Failed to copy to clipboard')
    }
  }

  // Simple mock preview
  const renderPreview = () => {
    const previewContent = content || 'Your content will appear here...'
    const hashtagString = hashtags.length > 0 ? hashtags.join(' ') : ''

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <div className="p-3 border-b border-gray-100 bg-gray-50">
          <span className="text-xs font-medium text-gray-500 uppercase">{platform} Preview</span>
        </div>
        <div className="p-4">
          {/* Mock profile header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gray-300" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Your Chef Name</p>
              <p className="text-xs text-gray-400">Just now</p>
            </div>
          </div>

          {/* Content */}
          <p className="text-sm text-gray-800 whitespace-pre-wrap mb-2">{previewContent}</p>

          {/* Hashtags */}
          {hashtagString && <p className="text-sm text-blue-600">{hashtagString}</p>}

          {/* Mock engagement bar */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
            <span>Like</span>
            <span>Comment</span>
            <span>Share</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Template' : 'New Template'}
          </h2>
          <p className="text-sm text-gray-500">
            Create reusable content for your social media posts
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Behind the Scenes"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* Platform + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as SocialPlatform)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value as TemplateType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                {TEMPLATE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Content</label>
              <span
                className={`text-xs ${isOverLimit ? 'text-red-600 font-medium' : 'text-gray-400'}`}
              >
                {charCount}/{charLimit}
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your template content here. Use [brackets] for placeholders."
              rows={8}
              className={`w-full px-3 py-2 border rounded-lg text-sm resize-y ${
                isOverLimit ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
              }`}
            />
            {isOverLimit && (
              <p className="text-xs text-red-600 mt-1">
                Content exceeds the {charLimit} character limit for {platform}
              </p>
            )}
          </div>

          {/* Hashtags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hashtags</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newHashtag}
                onChange={(e) => setNewHashtag(e.target.value)}
                onKeyDown={handleHashtagKeyDown}
                placeholder="Add hashtag..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={handleAddHashtag}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Add
              </button>
            </div>
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {hashtags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveHashtag(i)}
                      className="text-blue-400 hover:text-blue-600"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={isPending || isOverLimit}
              className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
            </button>
            <button
              onClick={handleCopyToClipboard}
              disabled={!content.trim()}
              className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
          {renderPreview()}
        </div>
      </div>
    </div>
  )
}
