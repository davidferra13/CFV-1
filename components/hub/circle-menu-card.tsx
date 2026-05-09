'use client'

import { memo } from 'react'

// ---------------------------------------------------------------------------
// Circle Menu Card - Compact menu summary rendered inside circle feed messages.
// Displays title, date, course list with dish names, and chef attribution.
// Expects FOH menu data stored in hub_messages system_metadata.
// ---------------------------------------------------------------------------

export interface CircleMenuCardData {
  title: string
  date: string | null
  chefName: string | null
  serviceStyle: string | null
  courses: Array<{
    label: string
    dishName: string | null
    description: string | null
    dietaryTags?: string[]
  }>
  shareToken?: string | null
}

interface CircleMenuCardProps {
  data: CircleMenuCardData
  finalized?: boolean
}

export const CircleMenuCard = memo(function CircleMenuCard({
  data,
  finalized,
}: CircleMenuCardProps) {
  const { title, date, chefName, serviceStyle, courses, shareToken } = data

  return (
    <div className="rounded-lg bg-black/20 p-3">
      {/* Title + date */}
      <div className="mb-2">
        <div className="text-sm font-semibold text-stone-100">{title}</div>
        {date && <div className="text-xs text-stone-400">{date}</div>}
        {serviceStyle && <div className="text-xs text-stone-500">{serviceStyle}</div>}
      </div>

      {/* Course list */}
      {courses.length > 0 && (
        <div className="mb-2 space-y-1.5">
          {courses.map((course, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 text-xs text-orange-400/70">{course.label}</span>
              <div className="flex-1">
                {course.dishName && (
                  <span className="text-sm text-stone-200">{course.dishName}</span>
                )}
                {course.description && !course.dishName && (
                  <span className="text-sm text-stone-300">{course.description}</span>
                )}
                {course.dietaryTags && course.dietaryTags.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {course.dietaryTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-green-900/40 px-1.5 py-0.5 text-3xs text-green-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chef attribution */}
      {chefName && (
        <div className="text-xs text-stone-500">
          {finalized ? 'Finalized' : 'Prepared'} by {chefName}
        </div>
      )}

      {/* View full menu link */}
      {shareToken && (
        <a
          href={`/menu/${shareToken}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block rounded-md bg-orange-600/20 px-3 py-1.5 text-center text-xs font-medium text-orange-300 transition-colors hover:bg-orange-600/30"
        >
          View Full Menu
        </a>
      )}
    </div>
  )
})
