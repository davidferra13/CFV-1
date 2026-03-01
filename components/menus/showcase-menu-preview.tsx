'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Course = {
  id: string
  courseName: string
  courseNumber: number
  description: string | null
  dietaryTags: string[]
  allergenFlags: string[]
}

type ShowcaseMenuPreviewProps = {
  menu: {
    id: string
    name: string
    description: string | null
    cuisineType: string | null
    serviceStyle: string | null
    dishes: Course[]
  }
  onUseAsIs: () => void
  onUseAsBase: () => void
  onClose: () => void
  loading?: boolean
}

export function ShowcaseMenuPreview({
  menu,
  onUseAsIs,
  onUseAsBase,
  onClose,
  loading,
}: ShowcaseMenuPreviewProps) {
  const sorted = [...menu.dishes].sort((a, b) => a.courseNumber - b.courseNumber)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-stone-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-stone-100">{menu.name}</h2>
              {menu.description && (
                <p className="text-sm text-stone-400 mt-1">{menu.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-200 p-1"
              aria-label="Close preview"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="flex gap-2 mt-2">
            {menu.cuisineType && <Badge variant="default">{menu.cuisineType}</Badge>}
            {menu.serviceStyle && (
              <Badge variant="info">{menu.serviceStyle.replace('_', ' ')}</Badge>
            )}
          </div>
        </div>

        {/* Courses */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {sorted.map((course) => (
            <div key={course.id} className="border-l-2 border-brand-600 pl-3">
              <h3 className="font-medium text-stone-100 text-sm">{course.courseName}</h3>
              {course.description && (
                <p className="text-xs text-stone-400 mt-0.5">{course.description}</p>
              )}
              {(course.dietaryTags.length > 0 || course.allergenFlags.length > 0) && (
                <div className="flex flex-wrap gap-1 mt-1">
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
          ))}
          {sorted.length === 0 && (
            <p className="text-sm text-stone-500 text-center py-4">No courses listed yet.</p>
          )}
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-stone-800 space-y-2">
          <Button variant="primary" onClick={onUseAsIs} disabled={loading} className="w-full">
            Use This Menu
          </Button>
          <Button variant="secondary" onClick={onUseAsBase} disabled={loading} className="w-full">
            Use as Starting Point
          </Button>
        </div>
      </div>
    </div>
  )
}
