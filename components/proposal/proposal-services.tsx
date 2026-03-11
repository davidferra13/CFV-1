'use client'

import { UtensilsCrossed } from 'lucide-react'

type Dish = {
  id: string
  name: string
  description: string | null
  course: string | null
  photoUrl: string | null
  dietaryTags: string[]
}

type ProposalServicesProps = {
  eventOccasion: string | null
  menu: {
    name: string
    description: string | null
    dishes: Dish[]
  } | null
}

export function ProposalServices({ eventOccasion, menu }: ProposalServicesProps) {
  if (!menu || !menu.dishes || menu.dishes.length === 0) {
    return null
  }

  // Group dishes by course
  const courseGroups: Record<string, Dish[]> = {}
  for (const dish of menu.dishes) {
    const course = dish.course || 'Main'
    if (!courseGroups[course]) courseGroups[course] = []
    courseGroups[course].push(dish)
  }

  // Check if any dishes have photos
  const hasAnyPhotos = menu.dishes.some((d) => !!d.photoUrl)

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <UtensilsCrossed className="h-5 w-5 text-amber-600" />
        <h2 className="text-xl font-semibold text-gray-900">The Menu</h2>
      </div>

      {menu.name && <p className="text-lg font-medium text-amber-200 mb-1">{menu.name}</p>}
      {menu.description && <p className="text-sm text-gray-500 mb-6">{menu.description}</p>}

      <div className="space-y-8">
        {Object.entries(courseGroups).map(([course, dishes]) => (
          <div key={course}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-4">
              {course}
            </h3>

            {hasAnyPhotos ? (
              /* Photo grid layout: responsive 1/2/3 columns */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {dishes.map((dish) => (
                  <DishCard key={dish.id} dish={dish} />
                ))}
              </div>
            ) : (
              /* Text-only fallback (original layout) */
              <div className="space-y-3">
                {dishes.map((dish) => (
                  <div
                    key={dish.id}
                    className="border border-gray-100 rounded-lg px-4 py-3 bg-gray-50/50"
                  >
                    <p className="font-medium text-gray-900">{dish.name}</p>
                    {dish.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{dish.description}</p>
                    )}
                    {dish.dietaryTags && dish.dietaryTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {dish.dietaryTags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-medium uppercase tracking-wider text-amber-200 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function DishCard({ dish }: { dish: Dish }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {dish.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dish.photoUrl}
          alt={dish.name || 'Dish photo'}
          className="w-full h-40 sm:h-48 object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-40 sm:h-48 bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
          <UtensilsCrossed className="h-8 w-8 text-amber-300" />
        </div>
      )}
      <div className="p-4">
        <p className="font-medium text-gray-900 text-sm">{dish.name}</p>
        {dish.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{dish.description}</p>
        )}
        {dish.dietaryTags && dish.dietaryTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {dish.dietaryTags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-medium uppercase tracking-wider text-amber-200 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
