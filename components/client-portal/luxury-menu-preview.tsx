'use client'

import { useState } from 'react'

interface MenuCourse {
  name: string
  description: string | null
  course: string | null
  dietaryTags: string[]
  winePairing: string | null
}

interface LuxuryMenuPreviewProps {
  menuName: string | null
  courses: MenuCourse[]
  chefName: string | null
}

const COURSE_ORDER = [
  'amuse',
  'appetizer',
  'starter',
  'soup',
  'salad',
  'intermezzo',
  'main',
  'cheese',
  'dessert',
  'petit_four',
  'other',
]

const COURSE_DISPLAY: Record<string, string> = {
  amuse: 'Amuse-Bouche',
  appetizer: 'Appetizer',
  starter: 'Starter',
  soup: 'Soup',
  salad: 'Salad',
  intermezzo: 'Intermezzo',
  main: 'Main Course',
  cheese: 'Cheese',
  dessert: 'Dessert',
  petit_four: 'Petit Four',
  other: '',
}

const DIETARY_ICONS: Record<string, { label: string; abbr: string }> = {
  'gluten-free': { label: 'Gluten Free', abbr: 'GF' },
  gluten_free: { label: 'Gluten Free', abbr: 'GF' },
  gf: { label: 'Gluten Free', abbr: 'GF' },
  vegan: { label: 'Vegan', abbr: 'V' },
  v: { label: 'Vegan', abbr: 'V' },
  vegetarian: { label: 'Vegetarian', abbr: 'VG' },
  vg: { label: 'Vegetarian', abbr: 'VG' },
  'dairy-free': { label: 'Dairy Free', abbr: 'DF' },
  dairy_free: { label: 'Dairy Free', abbr: 'DF' },
  df: { label: 'Dairy Free', abbr: 'DF' },
  'nut-free': { label: 'Nut Free', abbr: 'NF' },
  nut_free: { label: 'Nut Free', abbr: 'NF' },
  nf: { label: 'Nut Free', abbr: 'NF' },
  keto: { label: 'Keto', abbr: 'K' },
  paleo: { label: 'Paleo', abbr: 'P' },
}

function groupByCourse(items: MenuCourse[]) {
  const groups: Record<string, MenuCourse[]> = {}
  const sorted = [...items].sort((a, b) => {
    const ai = COURSE_ORDER.indexOf(a.course || 'other')
    const bi = COURSE_ORDER.indexOf(b.course || 'other')
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  for (const item of sorted) {
    const course = item.course || 'other'
    if (!groups[course]) groups[course] = []
    groups[course].push(item)
  }

  return groups
}

export function LuxuryMenuPreview({ menuName, courses, chefName }: LuxuryMenuPreviewProps) {
  const [mounted] = useState(true)

  if (!courses || courses.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-[#faf9f7] p-10 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#c4a35a] mb-2">Menu</p>
        <p className="text-sm text-[#2d2d2d]/60">
          Your menu is being prepared. Check back soon for the full details.
        </p>
      </div>
    )
  }

  const grouped = groupByCourse(courses)

  return (
    <div
      className={`rounded-2xl border border-[#c4a35a]/20 bg-[#faf9f7] overflow-hidden transition-opacity duration-500 ${
        mounted ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Menu header */}
      <div className="px-8 pt-10 pb-6 text-center border-b border-[#c4a35a]/10">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#c4a35a] mb-3">
          {chefName ? `Prepared by ${chefName}` : 'Your Menu'}
        </p>
        {menuName && (
          <h2 className="font-display-serif text-2xl sm:text-3xl font-bold text-[#2d2d2d]">
            {menuName}
          </h2>
        )}
        <div className="mt-4 mx-auto w-12 h-px bg-[#c4a35a]/30" />
      </div>

      {/* Courses */}
      <div className="px-8 py-8 space-y-10">
        {Object.entries(grouped).map(([course, items]) => (
          <div key={course}>
            {/* Course label */}
            {course !== 'other' && COURSE_DISPLAY[course] && (
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#c4a35a]/80 mb-5 text-center">
                {COURSE_DISPLAY[course]}
              </p>
            )}

            <div className="space-y-6">
              {items.map((item, idx) => (
                <div key={`${course}-${idx}`} className="text-center">
                  {/* Dish name */}
                  <h3 className="font-display-serif text-lg sm:text-xl font-bold text-[#2d2d2d] mb-1">
                    {item.name}
                  </h3>

                  {/* Description */}
                  {item.description && (
                    <p className="text-sm text-[#2d2d2d]/60 max-w-md mx-auto leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Dietary tags */}
                  {item.dietaryTags.length > 0 && (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      {item.dietaryTags.map((tag) => {
                        const info = DIETARY_ICONS[tag.toLowerCase()]
                        if (!info) return null
                        return (
                          <span
                            key={tag}
                            title={info.label}
                            className="text-[10px] font-medium uppercase tracking-wider text-[#c4a35a]/70 border border-[#c4a35a]/20 rounded-full px-2 py-0.5"
                          >
                            {info.abbr}
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {/* Wine pairing */}
                  {item.winePairing && (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <span className="text-[10px] uppercase tracking-[0.15em] text-[#2d2d2d]/40">
                        Paired with
                      </span>
                      <span className="text-xs text-[#2d2d2d]/60 italic">{item.winePairing}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Course divider */}
            <div className="mt-8 mx-auto w-8 h-px bg-[#c4a35a]/20" />
          </div>
        ))}
      </div>
    </div>
  )
}
