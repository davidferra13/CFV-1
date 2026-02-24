import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getMenus } from '@/lib/menus/actions'
import { Card } from '@/components/ui/card'
import { format } from 'date-fns'

export const metadata: Metadata = { title: 'Menu Templates - ChefFlow' }

const SERVICE_STYLE_LABELS: Record<string, string> = {
  plated: 'Plated',
  family_style: 'Family Style',
  buffet: 'Buffet',
  cocktail: 'Cocktail',
  tasting_menu: 'Tasting Menu',
  other: 'Other',
}

export default async function MenuTemplatesPage() {
  await requireChef()
  const allMenus = await getMenus()

  const templates = allMenus.filter((m) => m.is_template)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/menus" className="text-sm text-stone-500 hover:text-stone-300">
          ← Menus
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Menu Templates</h1>
          <span className="bg-amber-900 text-amber-700 text-sm px-2 py-0.5 rounded-full">
            {templates.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Reusable menu templates you can copy for new events</p>
      </div>

      {templates.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No menu templates yet</p>
          <p className="text-stone-400 text-sm mt-1">
            Mark a menu as a template when creating or editing it to save it here for reuse
          </p>
          <Link
            href="/culinary/menus"
            className="text-brand-600 hover:underline text-sm mt-3 inline-block"
          >
            Browse all menus →
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {templates.map((menu) => (
            <Link key={menu.id} href={`/culinary/menus/${menu.id}`}>
              <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="flex items-start justify-between mb-2">
                  <h2 className="font-semibold text-stone-100">{menu.name}</h2>
                  <span className="bg-amber-900 text-amber-700 text-xs px-2 py-0.5 rounded-full ml-2 shrink-0">
                    Template
                  </span>
                </div>
                {menu.description && (
                  <p className="text-sm text-stone-500 mb-2 line-clamp-2">{menu.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap mt-auto pt-2">
                  {menu.service_style && (
                    <span className="text-xs bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full">
                      {SERVICE_STYLE_LABELS[menu.service_style] ?? menu.service_style}
                    </span>
                  )}
                  {menu.cuisine_type && (
                    <span className="text-xs bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full capitalize">
                      {menu.cuisine_type}
                    </span>
                  )}
                  {menu.target_guest_count && (
                    <span className="text-xs text-stone-400">{menu.target_guest_count} guests</span>
                  )}
                </div>
                <p className="text-xs text-stone-400 mt-2">
                  Created {format(new Date(menu.created_at), 'MMM d, yyyy')}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
