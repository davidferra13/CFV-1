'use client'

// Rich Menu Approval Client Component
// Shows full course details with descriptions, dietary badges, allergen warnings,
// and per-course feedback. Replaces the plain text list.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { approveMenu, requestMenuRevision } from '@/lib/events/menu-approval-actions'

type Course = {
  id: string
  courseName: string
  courseNumber: number
  description: string | null
  dietaryTags: string[]
  allergenFlags: string[]
}

type MenuSnapshot = {
  menu_name: string
  menu_description?: string | null
  cuisine_type?: string | null
  service_style?: string | null
  // Legacy: flat dish names
  dishes: string[]
  // Rich: full course objects (may not exist on old snapshots)
  courses?: Course[]
}

type Props = {
  requestId: string
  menuSnapshot: MenuSnapshot[]
  status: 'sent' | 'approved' | 'revision_requested'
  revisionNotes: string | null
  eventId: string
}

export function MenuApprovalClient({
  requestId,
  menuSnapshot,
  status,
  revisionNotes,
  eventId,
}: Props) {
  const router = useRouter()
  const [showRevisionForm, setShowRevisionForm] = useState(false)
  const [revisionText, setRevisionText] = useState('')
  const [courseNotes, setCourseNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleApprove() {
    setLoading(true)
    setError(null)
    try {
      await approveMenu(requestId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve')
    } finally {
      setLoading(false)
    }
  }

  async function handleRevision() {
    // Combine per-course notes with overall notes
    const courseNotesText = Object.entries(courseNotes)
      .filter(([, note]) => note.trim())
      .map(([courseName, note]) => `• ${courseName}: ${note}`)
      .join('\n')

    const fullNotes = [revisionText.trim(), courseNotesText].filter(Boolean).join('\n\n')
    if (!fullNotes) return

    setLoading(true)
    setError(null)
    try {
      await requestMenuRevision({ request_id: requestId, notes: fullNotes })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit revision request')
    } finally {
      setLoading(false)
    }
  }

  // Already approved
  if (status === 'approved') {
    return (
      <div className="rounded-2xl border border-emerald-800 bg-emerald-950/50 p-8 text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-emerald-900/50 flex items-center justify-center mx-auto">
          <svg
            className="w-8 h-8 text-emerald-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-emerald-300">Menu Approved</p>
        <p className="text-sm text-stone-400">Your chef has been notified and is getting ready.</p>
        <Button variant="secondary" onClick={() => router.push(`/my-events/${eventId}`)}>
          Back to Event
        </Button>
      </div>
    )
  }

  // Revision already requested
  if (status === 'revision_requested') {
    return (
      <div className="rounded-2xl border border-amber-800 bg-amber-950/50 p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-900/50 flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5 text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-amber-300">Changes Requested</p>
            <p className="text-xs text-stone-400">Your chef will reach out with an updated menu.</p>
          </div>
        </div>
        {revisionNotes && (
          <div className="bg-stone-900/50 rounded-lg p-3">
            <p className="text-xs text-stone-500 mb-1">Your notes:</p>
            <p className="text-sm text-stone-300 whitespace-pre-wrap">{revisionNotes}</p>
          </div>
        )}
        <Button variant="secondary" onClick={() => router.push(`/my-events/${eventId}`)}>
          Back to Event
        </Button>
      </div>
    )
  }

  // Determine if we have rich course data
  const hasRichData = menuSnapshot.some((m) => m.courses && m.courses.length > 0)

  return (
    <div className="space-y-6">
      {/* Menu display */}
      {menuSnapshot.map((menu, i) => (
        <div key={i} className="rounded-2xl border border-stone-700 bg-stone-900 overflow-hidden">
          {/* Menu header */}
          <div className="p-5 border-b border-stone-800">
            <h3 className="text-lg font-semibold text-stone-100">{menu.menu_name}</h3>
            {menu.menu_description && (
              <p className="text-sm text-stone-400 mt-1">{menu.menu_description}</p>
            )}
            <div className="flex gap-2 mt-2">
              {menu.cuisine_type && <Badge variant="default">{menu.cuisine_type}</Badge>}
              {menu.service_style && (
                <Badge variant="info">{menu.service_style.replace('_', ' ')}</Badge>
              )}
            </div>
          </div>

          {/* Courses */}
          <div className="divide-y divide-stone-800">
            {hasRichData && menu.courses
              ? // Rich course display
                menu.courses
                  .sort((a, b) => a.courseNumber - b.courseNumber)
                  .map((course) => (
                    <div key={course.id} className="p-4 hover:bg-stone-800/30 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-brand-400 uppercase tracking-wider">
                              Course {course.courseNumber}
                            </span>
                          </div>
                          <h4 className="font-medium text-stone-100 mt-0.5">{course.courseName}</h4>
                          {course.description && (
                            <p className="text-sm text-stone-400 mt-1">{course.description}</p>
                          )}
                          {(course.dietaryTags.length > 0 || course.allergenFlags.length > 0) && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {course.dietaryTags.map((tag) => (
                                <Badge key={tag} variant="info">
                                  {tag}
                                </Badge>
                              ))}
                              {course.allergenFlags.map((flag) => (
                                <Badge key={flag} variant="error">
                                  {flag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Per-course feedback (only in revision mode) */}
                        {showRevisionForm && (
                          <button
                            type="button"
                            onClick={() => {
                              const key = course.courseName
                              setCourseNotes((prev) => ({
                                ...prev,
                                [key]: prev[key] ?? '',
                              }))
                            }}
                            className="text-xs text-stone-500 hover:text-brand-400 shrink-0 mt-1"
                            title="Add a note about this course"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                              />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Inline course note input */}
                      {showRevisionForm && courseNotes[course.courseName] !== undefined && (
                        <div className="mt-2">
                          <input
                            type="text"
                            value={courseNotes[course.courseName]}
                            onChange={(e) =>
                              setCourseNotes((prev) => ({
                                ...prev,
                                [course.courseName]: e.target.value,
                              }))
                            }
                            placeholder={`Note about ${course.courseName}...`}
                            className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-1.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  ))
              : // Legacy: plain dish names
                menu.dishes.map((dish, j) => (
                  <div key={j} className="px-4 py-3">
                    <span className="text-sm text-stone-300">{dish}</span>
                  </div>
                ))}

            {(!menu.courses || menu.courses.length === 0) && menu.dishes.length === 0 && (
              <div className="p-4">
                <p className="text-sm text-stone-500">
                  Menu details are being finalized. Contact your chef for the full list.
                </p>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Action buttons */}
      {!showRevisionForm ? (
        <div className="space-y-3">
          <Button
            variant="primary"
            onClick={handleApprove}
            disabled={loading}
            className="w-full py-3 text-base"
          >
            {loading ? 'Approving...' : 'Looks Great — Approve Menu'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowRevisionForm(true)}
            disabled={loading}
            className="w-full"
          >
            I&apos;d Like Some Changes
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-stone-700 bg-stone-900 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              What would you like changed?
            </label>
            <p className="text-xs text-stone-500 mb-2">
              You can also tap the chat icon on individual courses above to leave specific notes.
            </p>
            <textarea
              value={revisionText}
              onChange={(e) => setRevisionText(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-stone-700 bg-stone-800 p-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Could we swap the salmon for halibut? One guest is vegetarian."
            />
          </div>

          {Object.entries(courseNotes).filter(([, n]) => n.trim()).length > 0 && (
            <div className="text-xs text-stone-400 space-y-1">
              <p className="font-medium text-stone-300">Course-specific notes:</p>
              {Object.entries(courseNotes)
                .filter(([, n]) => n.trim())
                .map(([name, note]) => (
                  <p key={name}>
                    <span className="text-brand-400">{name}:</span> {note}
                  </p>
                ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleRevision}
              disabled={
                loading ||
                (!revisionText.trim() && !Object.values(courseNotes).some((n) => n.trim()))
              }
            >
              {loading ? 'Sending...' : 'Send Changes'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowRevisionForm(false)
                setCourseNotes({})
              }}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-950/50 border border-red-800 p-3">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
    </div>
  )
}
