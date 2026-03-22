import { requireChef } from '@/lib/auth/get-user'
import { getMenuById } from '@/lib/menus/actions'
import { getChefLayoutData } from '@/lib/chef/layout-cache'
import { notFound } from 'next/navigation'
import { PrintButton } from './print-button'

const SERVICE_LABELS: Record<string, string> = {
  plated: 'Plated',
  family_style: 'Family Style',
  buffet: 'Buffet',
  cocktail: 'Cocktail Reception',
  tasting_menu: 'Tasting Menu',
  other: '',
}

export default async function PrintMenuPage({ params }: { params: { id: string } }) {
  const user = await requireChef()
  const [menu, chefData] = await Promise.all([
    getMenuById(params.id),
    getChefLayoutData(user.tenantId!),
  ])

  if (!menu) notFound()

  const businessName = chefData.business_name || 'Chef'
  const serviceLabel = menu.service_style ? (SERVICE_LABELS[menu.service_style] ?? '') : ''
  const guestLabel = menu.target_guest_count
    ? `${menu.target_guest_count} ${menu.target_guest_count === 1 ? 'Guest' : 'Guests'}`
    : ''

  const subtitleParts = [serviceLabel, menu.cuisine_type, guestLabel].filter(Boolean)
  const dishes = ((menu as any).dishes ?? []) as any[]

  return (
    <div className="max-w-2xl mx-auto px-8 py-12 bg-white min-h-screen text-gray-900 font-serif">
      {/* Print / back controls */}
      <PrintButton backHref={`/culinary/menus/${params.id}`} />

      {/* Header */}
      <div className="text-center mb-12">
        <p className="text-xs tracking-[0.2em] uppercase text-gray-400 font-sans mb-3">
          {businessName}
        </p>

        <h1 className="text-3xl font-normal tracking-wide text-gray-900 leading-tight mb-2">
          {menu.name}
        </h1>

        {subtitleParts.length > 0 && (
          <p className="text-sm text-gray-500 font-sans mt-2">
            {subtitleParts.join('\u00a0\u00b7\u00a0')}
          </p>
        )}

        {/* Decorative rule */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <div className="h-px w-16 bg-gray-200" />
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          <div className="h-px w-16 bg-gray-200" />
        </div>
      </div>

      {/* Courses */}
      {dishes.length === 0 ? (
        <p className="text-center text-gray-400 font-sans text-sm">No courses added yet.</p>
      ) : (
        <div className="space-y-10">
          {dishes.map((dish: any, idx: number) => (
            <div key={dish.id} className="break-inside-avoid">
              {/* Course label */}
              {dish.course_number > 1 && (
                <p className="text-[0.65rem] tracking-[0.18em] uppercase text-gray-400 font-sans text-center mb-1">
                  Course {dish.course_number}
                </p>
              )}

              {/* Course name */}
              <h2 className="text-xl font-normal text-center text-gray-900 tracking-wide mb-2">
                {dish.course_name}
              </h2>

              {/* Description */}
              {dish.description && (
                <p className="text-center text-sm text-gray-500 italic font-sans mb-3">
                  {dish.description}
                </p>
              )}

              {/* Components */}
              {dish.components && dish.components.length > 0 && (
                <div className="flex flex-wrap justify-center gap-x-2 gap-y-0.5">
                  {dish.components.map((comp: any, ci: number) => (
                    <span key={comp.id} className="font-sans text-gray-600 text-sm">
                      {comp.name}
                      {ci < dish.components.length - 1 && (
                        <span className="text-gray-300 ml-2">/</span>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {/* Allergen flags */}
              {dish.allergen_flags && dish.allergen_flags.length > 0 && (
                <p className="text-center text-[0.7rem] text-gray-400 font-sans tracking-wide mt-2">
                  Contains: {dish.allergen_flags.join(', ')}
                </p>
              )}

              {/* Beverage pairing */}
              {dish.beverage_pairing && (
                <p className="text-center text-xs text-gray-400 italic font-sans mt-1.5">
                  {dish.beverage_pairing}
                </p>
              )}

              {/* Divider between courses */}
              {idx < dishes.length - 1 && <div className="mt-8 border-t border-gray-100" />}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-14 text-center border-t border-gray-200 pt-6">
        {chefData.tagline && (
          <p className="text-xs text-gray-400 italic font-sans tracking-wide">{chefData.tagline}</p>
        )}
      </div>
    </div>
  )
}
