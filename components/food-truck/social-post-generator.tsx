'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  getTodaySchedule,
  generateLocationPost,
  getPostHistory,
  getPostTemplates,
  createPostTemplate,
  deletePostTemplate,
  savePostDraft,
  type TodayScheduleEntry,
  type PostDraft,
  type PostTemplate,
} from '@/lib/food-truck/social-actions'

// ── Platform Config ──

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', color: 'text-pink-400' },
  { id: 'facebook', label: 'Facebook', color: 'text-blue-400' },
  { id: 'twitter', label: 'Twitter/X', color: 'text-sky-400' },
  { id: 'tiktok', label: 'TikTok', color: 'text-purple-400' },
] as const

// ── Component ──

export function SocialPostGenerator() {
  const [schedule, setSchedule] = useState<TodayScheduleEntry[]>([])
  const [templates, setTemplates] = useState<PostTemplate[]>([])
  const [postHistory, setPostHistory] = useState<PostDraft[]>([])
  const [generatedText, setGeneratedText] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState('instagram')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [activeScheduleId, setActiveScheduleId] = useState('')
  const [activeLocationName, setActiveLocationName] = useState('')
  const [copied, setCopied] = useState(false)
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateText, setNewTemplateText] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  function loadData() {
    startTransition(async () => {
      try {
        setError(null)
        const [sched, tmpl, hist] = await Promise.all([
          getTodaySchedule(),
          getPostTemplates(),
          getPostHistory(),
        ])
        setSchedule(sched)
        setTemplates(tmpl)
        setPostHistory(hist)
        if (tmpl.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(tmpl[0].id)
        }
      } catch (err) {
        setError('Failed to load schedule data')
      }
    })
  }

  function handleGenerate(entry: TodayScheduleEntry) {
    const template = templates.find((t) => t.id === selectedTemplateId)
    setActiveScheduleId(entry.id)
    setActiveLocationName(entry.locationName)
    setCopied(false)

    startTransition(async () => {
      try {
        setError(null)
        const text = await generateLocationPost(entry.id, template?.template)
        setGeneratedText(text)
      } catch (err) {
        setError('Failed to generate post')
        setGeneratedText('')
      }
    })
  }

  async function handleCopy() {
    if (!generatedText) return
    try {
      await navigator.clipboard.writeText(generatedText)
      setCopied(true)

      // Save draft (non-blocking)
      startTransition(async () => {
        try {
          await savePostDraft(generatedText, selectedPlatform, activeLocationName)
          const hist = await getPostHistory()
          setPostHistory(hist)
        } catch {
          // Non-critical
        }
      })

      setTimeout(() => setCopied(false), 3000)
    } catch {
      setError('Failed to copy to clipboard')
    }
  }

  function handleSaveTemplate() {
    if (!newTemplateName.trim() || !newTemplateText.trim()) return

    startTransition(async () => {
      try {
        setError(null)
        const result = await createPostTemplate(newTemplateName, newTemplateText)
        if (result.success) {
          setNewTemplateName('')
          setNewTemplateText('')
          setShowTemplateForm(false)
          setSuccessMsg('Template saved')
          setTimeout(() => setSuccessMsg(null), 3000)
          const tmpl = await getPostTemplates()
          setTemplates(tmpl)
        } else {
          setError(result.error || 'Failed to save template')
        }
      } catch {
        setError('Failed to save template')
      }
    })
  }

  function handleDeleteTemplate(id: string) {
    startTransition(async () => {
      try {
        setError(null)
        const result = await deletePostTemplate(id)
        if (result.success) {
          const tmpl = await getPostTemplates()
          setTemplates(tmpl)
          if (selectedTemplateId === id && tmpl.length > 0) {
            setSelectedTemplateId(tmpl[0].id)
          }
        } else {
          setError(result.error || 'Failed to delete template')
        }
      } catch {
        setError('Failed to delete template')
      }
    })
  }

  function formatTime12h(time24: string): string {
    const [hStr, mStr] = time24.split(':')
    let h = parseInt(hStr, 10)
    const ampm = h >= 12 ? 'PM' : 'AM'
    if (h > 12) h -= 12
    if (h === 0) h = 12
    return `${h}:${mStr} ${ampm}`
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 p-4 text-red-300">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg border border-green-800 bg-green-900/30 p-3 text-green-300 text-sm">
          {successMsg}
        </div>
      )}

      {/* Today's Schedule */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Today&apos;s Schedule</h3>
        {schedule.length === 0 && !isPending && (
          <p className="text-zinc-400 text-sm">No stops scheduled for today.</p>
        )}
        <div className="space-y-3">
          {schedule.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between bg-zinc-900/50 rounded-md p-3"
            >
              <div>
                <p className="text-white font-medium">{entry.locationName}</p>
                <p className="text-sm text-zinc-400">
                  {entry.address ? `${entry.address} | ` : ''}
                  {formatTime12h(entry.startTime)} - {formatTime12h(entry.endTime)}
                </p>
              </div>
              <button
                onClick={() => handleGenerate(entry)}
                disabled={isPending}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
              >
                Generate Post
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Template Selector + Platform */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-zinc-400 mb-1">Template</label>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Platform</label>
          <div className="flex gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlatform(p.id)}
                className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  selectedPlatform === p.id
                    ? `border-zinc-500 bg-zinc-700 ${p.color}`
                    : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generated Post */}
      {generatedText && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-300">Generated Post</h3>
            <span className="text-xs text-zinc-500">
              for {PLATFORMS.find((p) => p.id === selectedPlatform)?.label || selectedPlatform}
            </span>
          </div>
          <textarea
            value={generatedText}
            onChange={(e) => setGeneratedText(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-white text-sm resize-y min-h-[80px]"
            rows={4}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className={`px-5 py-2 font-medium text-sm rounded-md transition-colors ${
                copied ? 'bg-green-600 text-white' : 'bg-orange-600 hover:bg-orange-500 text-white'
              }`}
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
            <p className="text-xs text-zinc-500">
              Paste into your{' '}
              {PLATFORMS.find((p) => p.id === selectedPlatform)?.label || 'social media'} app
            </p>
          </div>
        </div>
      )}

      {/* Manage Templates */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Templates</h3>
          <button
            onClick={() => setShowTemplateForm(!showTemplateForm)}
            className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
          >
            {showTemplateForm ? 'Cancel' : '+ New Template'}
          </button>
        </div>

        {showTemplateForm && (
          <div className="space-y-3 mb-4 p-3 bg-zinc-900/50 rounded-md">
            <input
              type="text"
              placeholder="Template name"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-500"
            />
            <textarea
              placeholder="Template text. Use {location}, {address}, {time}, {start_time}, {end_time}, {date} as placeholders."
              value={newTemplateText}
              onChange={(e) => setNewTemplateText(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-500 resize-y"
              rows={3}
            />
            <button
              onClick={handleSaveTemplate}
              disabled={isPending || !newTemplateName.trim() || !newTemplateText.trim()}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
            >
              Save Template
            </button>
          </div>
        )}

        <div className="space-y-2">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-start justify-between bg-zinc-900/50 rounded-md p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{t.name}</p>
                <p className="text-xs text-zinc-400 mt-1 truncate">{t.template}</p>
              </div>
              {!t.id.startsWith('default-') && (
                <button
                  onClick={() => handleDeleteTemplate(t.id)}
                  className="text-xs text-red-400 hover:text-red-300 ml-3 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Post History */}
      {postHistory.length > 0 && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Recent Posts</h3>
          <div className="space-y-2">
            {postHistory.slice(0, 10).map((post) => (
              <div key={post.id} className="bg-zinc-900/50 rounded-md p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-400">
                    {post.locationName} - {post.platform}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-zinc-300">{post.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isPending && <div className="text-center text-zinc-400 py-4">Loading...</div>}
    </div>
  )
}
