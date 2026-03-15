'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  getSocialTemplates,
  type SocialTemplate,
  type SocialPlatform,
} from '@/lib/marketing/social-template-actions'

type PlannedPost = {
  id: string
  templateId: string
  template: SocialTemplate
  dayIndex: number // 0-6 (Mon-Sun)
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function platformDot(p: SocialPlatform): string {
  switch (p) {
    case 'instagram': return 'bg-pink-500'
    case 'facebook': return 'bg-blue-500'
    case 'tiktok': return 'bg-gray-700'
    case 'twitter': return 'bg-sky-500'
    case 'linkedin': return 'bg-indigo-500'
  }
}

function getWeekDates(offset: number): Date[] {
  const now = new Date()
  const startOfWeek = new Date(now)
  const day = now.getDay()
  const diff = (day === 0 ? -6 : 1) - day // Adjust to Monday
  startOfWeek.setDate(now.getDate() + diff + offset * 7)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })
}

function formatShortDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function SocialContentCalendar() {
  const [templates, setTemplates] = useState<SocialTemplate[]>([])
  const [plannedPosts, setPlannedPosts] = useState<PlannedPost[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [draggedTemplate, setDraggedTemplate] = useState<SocialTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const weekDates = getWeekDates(weekOffset)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const result = await getSocialTemplates()
        if (result.error) {
          setError(result.error)
        } else {
          setTemplates(result.data)
          setError(null)
        }
      } catch {
        setError('Failed to load templates')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleDragStart = (template: SocialTemplate) => {
    setDraggedTemplate(template)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e: React.DragEvent, dayIndex: number) => {
    e.preventDefault()
    if (!draggedTemplate) return

    const newPost: PlannedPost = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      templateId: draggedTemplate.id,
      template: draggedTemplate,
      dayIndex,
    }
    setPlannedPosts((prev) => [...prev, newPost])
    setDraggedTemplate(null)
  }

  const handleRemovePost = (postId: string) => {
    setPlannedPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  const postsForDay = (dayIndex: number) =>
    plannedPosts.filter((p) => p.dayIndex === dayIndex)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Content Calendar</h2>
          <p className="text-sm text-gray-500">
            Plan your social media posts for the week. Drag templates onto days.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            Prev
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            This Week
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4">
        {/* Template sidebar (drag source) */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Templates</h3>
          {loading ? (
            <p className="text-xs text-gray-400">Loading...</p>
          ) : templates.length === 0 ? (
            <p className="text-xs text-gray-400">
              No templates yet. Create some in the Templates tab.
            </p>
          ) : (
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {templates.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={() => handleDragStart(t)}
                  className="flex items-center gap-2 p-2 text-xs border border-gray-200 rounded-lg cursor-grab active:cursor-grabbing hover:bg-gray-50 bg-white"
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${platformDot(t.platform)}`} />
                  <span className="truncate">{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weekly calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {DAY_NAMES.map((day, i) => {
            const date = weekDates[i]
            const isToday =
              date.toDateString() === new Date().toDateString()
            const posts = postsForDay(i)

            return (
              <div
                key={i}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, i)}
                className={`min-h-[200px] border rounded-lg p-2 transition-colors ${
                  isToday
                    ? 'border-orange-300 bg-orange-50/50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {/* Day header */}
                <div className="text-center mb-2 pb-1 border-b border-gray-100">
                  <p className={`text-xs font-medium ${isToday ? 'text-orange-600' : 'text-gray-600'}`}>
                    {day}
                  </p>
                  <p className={`text-xs ${isToday ? 'text-orange-500' : 'text-gray-400'}`}>
                    {formatShortDate(date)}
                  </p>
                </div>

                {/* Planned posts */}
                <div className="space-y-1">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="group relative p-1.5 text-xs border border-gray-100 rounded bg-gray-50 hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${platformDot(
                            post.template.platform
                          )}`}
                        />
                        <span className="truncate">{post.template.title}</span>
                      </div>
                      <button
                        onClick={() => handleRemovePost(post.id)}
                        className="absolute top-0.5 right-0.5 hidden group-hover:block text-red-400 hover:text-red-600 text-xs leading-none p-0.5"
                        title="Remove"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>

                {/* Drop zone hint */}
                {posts.length === 0 && (
                  <p className="text-center text-xs text-gray-300 mt-4">
                    Drop here
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="font-medium">Platforms:</span>
        {(['instagram', 'facebook', 'tiktok', 'twitter', 'linkedin'] as SocialPlatform[]).map((p) => (
          <span key={p} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${platformDot(p)}`} />
            {p}
          </span>
        ))}
      </div>

      {/* Summary */}
      {plannedPosts.length > 0 && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-medium">{plannedPosts.length}</span> post{plannedPosts.length !== 1 ? 's' : ''} planned this week.
            {' '}This is a planning tool only; posts are not published automatically.
          </p>
        </div>
      )}
    </div>
  )
}
