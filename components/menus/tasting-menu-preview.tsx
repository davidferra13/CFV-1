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
  amuse_bouche: 'bg-purple-900/40 text-purple-400 border-purple-800',
  appetizer: 'bg-brand-900/40 text-brand-400 border-brand-800',
  soup: 'bg-amber-900/40 text-amber-400 border-amber-800',
  salad: 'bg-green-900/40 text-green-400 border-green-800',
  fish: 'bg-brand-900/40 text-brand-400 border-brand-800',
  intermezzo: 'bg-brand-900/40 text-brand-400 border-brand-800',
  main: 'bg-red-900/40 text-red-400 border-red-800',
  cheese: 'bg-yellow-900/40 text-yellow-400 border-yellow-800',
  pre_dessert: 'bg-pink-900/40 text-pink-400 border-pink-800',
  dessert: 'bg-rose-900/40 text-rose-400 border-rose-800',
  mignardise: 'bg-fuchsia-900/40 text-fuchsia-400 border-fuchsia-800',
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
              className="rounded-md border border-stone-600 bg-stone-800 px-3 py-1.5 text-sm text-stone-300 hover:bg-stone-700"
            >
              Back
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handlePrint}
          className="rounded-md border border-stone-600 bg-stone-800 px-3 py-1.5 text-sm text-stone-300 hover:bg-stone-700"
        >
          Print
        </button>
      </div>

      {/* Menu header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-stone-100 print:text-gray-900">{menu.name}</h1>
        {menu.description && (
          <p className="mt-2 text-sm text-stone-400 italic print:text-gray-600">
            {menu.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-stone-500 print:text-gray-500">
          <span>{menu.course_count} Courses</span>
          {menu.occasion && (
            <>
              <span className="text-stone-600 print:text-gray-300">|</span>
              <span>{menu.occasion}</span>
            </>
          )}
          {menu.season && (
            <>
              <span className="text-stone-600 print:text-gray-300">|</span>
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
              <div className="absolute bottom-0 left-6 top-12 w-px bg-stone-700 print:hidden" />
            )}

            <div className="flex gap-4">
              {/* Course number circle */}
              <div className="relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 border-stone-600 bg-stone-900 text-sm font-bold text-stone-400 print:border-gray-200 print:bg-white print:text-gray-400">
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
                      <span className="ml-2 text-xxs text-stone-500">
                        {PORTION_LABELS[course.portion_size] ?? course.portion_size}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="mt-1.5 text-base font-semibold text-stone-100 print:text-gray-900">
                  {course.dish_name}
                </h3>

                {course.description && (
                  <p className="mt-0.5 text-sm text-stone-400 print:text-gray-600">
                    {course.description}
                  </p>
                )}

                {/* Wine pairing */}
                {course.wine_pairing && (
                  <div className="mt-2 flex items-start gap-1.5 rounded-md bg-purple-950/40 px-3 py-2 print:bg-purple-50">
                    <span className="text-sm">&#127863;</span>
                    <div>
                      <p className="text-xs font-medium text-purple-300 print:text-purple-800">
                        {course.wine_pairing}
                      </p>
                      {course.pairing_notes && (
                        <p className="mt-0.5 text-xs-tight text-purple-400 italic print:text-purple-600">
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
        <div className="mt-8 border-t border-stone-700 pt-4 print:border-gray-200">
          <div className="flex flex-col items-end gap-1 text-sm">
            {(totalPerPerson ?? 0) > 0 && (
              <div className="flex items-center gap-4">
                <span className="text-stone-400 print:text-gray-600">Per Person</span>
                <span className="font-semibold text-stone-100 print:text-gray-900">
                  {formatCents(totalPerPerson)}
                </span>
              </div>
            )}
            {hasWinePairings && (menu.wine_pairing_upcharge_cents ?? 0) > 0 && (
              <>
                <div className="flex items-center gap-4">
                  <span className="text-stone-400 print:text-gray-600">Wine Pairing</span>
                  <span className="text-stone-300 print:text-gray-700">
                    +{formatCents(menu.wine_pairing_upcharge_cents)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-4 border-t border-stone-800 pt-1 print:border-gray-100">
                  <span className="font-medium text-stone-300 print:text-gray-700">
                    With Wine Pairing
                  </span>
                  <span className="font-bold text-stone-100 print:text-gray-900">
                    {formatCents(totalWithWine)}
                  </span>
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
