import { getMenuById } from '@/lib/menus/actions'
import { getPlaceholderImage } from '@/lib/images/placeholder-actions'
import { MenuEditorClient } from '@/components/culinary/MenuEditor'
import { FoodPlaceholderImage } from '@/components/ui/food-placeholder-image'
import { MenuCostSidebar } from '@/components/culinary/menu-cost-sidebar'
import { MenuBreakdownView } from '@/components/culinary/menu-breakdown-view'
import { MenuScaleDialog } from '@/components/culinary/menu-scale-dialog'
import { MenuContextSidebar } from '@/components/culinary/menu-context-sidebar'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function MenuDetailPage({ params }: { params: { id: string } }) {
  const menu = await getMenuById(params.id)
  if (!menu) notFound()

  // Menus don't have their own photo — use a stock placeholder based on
  // menu name + cuisine type for a more relevant image.
  const searchQuery = [menu.name, menu.cuisine_type].filter(Boolean).join(' ')
  const placeholderImage = await getPlaceholderImage(searchQuery)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <Link href="/culinary/menus">
          <Button variant="ghost" size="sm">
            ← Menus
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <MenuScaleDialog
            menuId={menu.id}
            currentGuestCount={menu.target_guest_count || 4}
            menuStatus={menu.status}
          />
          {menu.event_id && (
            <Link href={`/events/${menu.event_id}`}>
              <Button variant="ghost" size="sm">
                View Event →
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main editor column */}
        <div className="flex-1 min-w-0 space-y-2">
          <FoodPlaceholderImage image={placeholderImage} size="hero" />
          <MenuEditorClient menu={menu} />
          <MenuBreakdownView menuId={menu.id} className="mt-4" />
        </div>

        {/* Intelligence sidebar */}
        <div className="hidden lg:block w-72 flex-shrink-0 space-y-4 sticky top-6 self-start">
          <MenuCostSidebar menuId={menu.id} />
          <MenuContextSidebar menuId={menu.id} />
        </div>
      </div>
    </div>
  )
}
