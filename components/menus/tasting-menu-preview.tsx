'use client'

// TastingMenuPreview - Elegant read-only preview of a tasting menu
// Shows course progression with type badges and wine pairings
// Print-friendly layout with total price calculation

import { type TastingMenuWithCourses, type CourseType } from '@/lib/menus/tasting-menu-actions'

// ─── Constants ──────────────────────────────────────────────────────────────────

const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  amuse_bouche: 'Amuse-Bouche',
  appetizer: 'Appetizer',
  soup: 'Soup',
  salad: 'Salad',
  fish: 'Fish',
  intermezzo: 'Intermezzo',
  main: 'Main',
  cheese: 'Cheese',
  pre_dessert: 'Pre-Dessert',
  dessert: 'Dessert',
  mignardise: 'Mignardise',
}

const COURSE_TYPE_COLORS: Record<CourseType, string> = {
  amuse_bouche: 'bg-purple-100 text-purple-800 border-purple-200',
  appetizer: 'bg-blue-100 text-blue-800 border-blue-200',
  soup: 'bg-amber-100 text-amber-800 border-amber-200',
  salad: 'bg-green-100 text-green-800 border-green-200',
  fish: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  intermezzo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  main: 'bg-red-100 text-red-800 border-red-200',
  cheese: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  pre_dessert: 'bg-pink-100 text-pink-800 border-pink-200',
  dessert: 'bg-rose-100 text-rose-800 border-rose-200',
  mignardise: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
}

const PORTION_LABELS: Record<string, string> = {
  bite: 'Bite-size',
  small: 'Small plate',
  standard: 'Standard',
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatCents(cents: number | null): string {
  if (cents == null) return 'Not set'
  return `$${(cents / 100).toFixed(2)}`
}

// ─── Component ──────────────────────────────────────────────────────────────────

type Props = {
  menu: TastingMenuWithCourses
  onClose?: () => void
}

export function TastingMenuPreview({ menu, onClose }: Props) {
  const hasWinePairings = menu.courses.some((c) => c.wine_pairing)
  const totalPerPerson = menu.price_per_person_cents
  const totalWithWine =
    totalPerPerson != null ? totalPerPerson + (menu.wine_pairing_upcharge_cents ?? 0) : null

  function handlePrint() {
    window.print()
  }

  return (
    <div className="mx-auto max-w-2xl print:max-w-none">
      {/* Action bar (hidden in print) */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Back
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handlePrint}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          Print
        </button>
      </div>

      {/* Menu header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{menu.name}</h1>
        {menu.description && (
          <p className="mt-2 text-sm text-gray-600 italic">{menu.description}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-gray-500">
          <span>{menu.course_count} Courses</span>
          {menu.occasion && (
            <>
              <span className="text-gray-300">|</span>
              <span>{menu.occasion}</span>
            </>
          )}
          {menu.season && (
            <>
              <span className="text-gray-300">|</span>
              <span>{menu.season}</span>
            </>
          )}
        </div>
      </div>

      {/* Course list */}
      <div className="space-y-6">
        {menu.courses.map((course, idx) => (
          <div key={course.id} className="relative">
            {/* Connector line between courses */}
            {idx < menu.courses.length - 1 && (
              <div className="absolute bottom-0 left-6 top-12 w-px bg-gray-200 print:hidden" />
            )}

            <div className="flex gap-4">
              {/* Course number circle */}
              <div className="relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-200 bg-white text-sm font-bold text-gray-400">
                {course.course_number}
              </div>

              {/* Course content */}
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xxs font-semibold uppercase tracking-wide ${COURSE_TYPE_COLORS[course.course_type]}`}
                    >
                      {COURSE_TYPE_LABELS[course.course_type]}
                    </span>
                    {course.portion_size && (
                      <span className="ml-2 text-xxs text-gray-400">
                        {PORTION_LABELS[course.portion_size] ?? course.portion_size}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="mt-1.5 text-base font-semibold text-gray-900">{course.dish_name}</h3>

                {course.description && (
                  <p className="mt-0.5 text-sm text-gray-600">{course.description}</p>
                )}

                {/* Wine pairing */}
                {course.wine_pairing && (
                  <div className="mt-2 flex items-start gap-1.5 rounded-md bg-purple-50 px-3 py-2">
                    <span className="text-sm">&#127863;</span>
                    <div>
                      <p className="text-xs font-medium text-purple-800">{course.wine_pairing}</p>
                      {course.pairing_notes && (
                        <p className="mt-0.5 text-xs-tight text-purple-600 italic">
                          {course.pairing_notes}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pricing footer */}
      {((totalPerPerson ?? 0) > 0 || (totalWithWine ?? 0) > 0) && (
        <div className="mt-8 border-t border-gray-200 pt-4">
          <div className="flex flex-col items-end gap-1 text-sm">
            {(totalPerPerson ?? 0) > 0 && (
              <div className="flex items-center gap-4">
                <span className="text-gray-600">Per Person</span>
                <span className="font-semibold text-gray-900">{formatCents(totalPerPerson)}</span>
              </div>
            )}
            {hasWinePairings && (menu.wine_pairing_upcharge_cents ?? 0) > 0 && (
              <>
                <div className="flex items-center gap-4">
                  <span className="text-gray-600">Wine Pairing</span>
                  <span className="text-gray-700">
                    +{formatCents(menu.wine_pairing_upcharge_cents)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-4 border-t border-gray-100 pt-1">
                  <span className="font-medium text-gray-700">With Wine Pairing</span>
                  <span className="font-bold text-gray-900">{formatCents(totalWithWine)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Print-only footer */}
      <div className="mt-8 hidden text-center text-xs text-gray-400 print:block">
        <p>Created with ChefFlow</p>
      </div>
    </div>
  )
}
