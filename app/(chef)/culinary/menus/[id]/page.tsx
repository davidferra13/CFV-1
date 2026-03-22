import { getMenuById } from '@/lib/menus/actions'
import { getPlaceholderImage } from '@/lib/images/placeholder-actions'
import { getMenuEngineFeatures } from '@/lib/chef/actions'
import { MenuEditorClient } from '@/components/culinary/MenuEditor'
import { FoodPlaceholderImage } from '@/components/ui/food-placeholder-image'
import { MenuCostSidebar } from '@/components/culinary/menu-cost-sidebar'
import { MenuBreakdownView } from '@/components/culinary/menu-breakdown-view'
import { MenuScaleDialog } from '@/components/culinary/menu-scale-dialog'
import { MenuContextSidebar } from '@/components/culinary/menu-context-sidebar'
import { MenuWhatIfPanel } from '@/components/culinary/menu-whatif-panel'
import { MenuAssemblyBrowser } from '@/components/culinary/menu-assembly-browser'
import { MenuShoppingList } from '@/components/culinary/menu-shopping-list'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function MenuDetailPage({ params }: { params: { id: string } }) {
  const [menu, engineFeatures] = await Promise.all([
    getMenuById(params.id),
    getMenuEngineFeatures(),
  ])
  if (!menu) notFound()

  // Menus don't have their own photo - use a stock placeholder based on
  // menu name + cuisine type for a more relevant image.
  const searchQuery = [menu.name, menu.cuisine_type].filter(Boolean).join(' ')
  const placeholderImage = await getPlaceholderImage(searchQuery)

  // Extract unique courses for the assembly browser
  const courseMap = new Map<number, { courseNumber: number; courseName: string }>()
  for (const d of (menu.dishes || []) as any[]) {
    if (!courseMap.has(d.course_number)) {
      courseMap.set(d.course_number, { courseNumber: d.course_number, courseName: d.course_name })
    }
  }
  const existingCourses = Array.from(courseMap.values()).sort(
    (a, b) => a.courseNumber - b.courseNumber
  )

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
          <MenuAssemblyBrowser
            menuId={menu.id}
            menuStatus={menu.status}
            existingCourses={existingCourses}
          />
          <MenuEditorClient menu={menu} />
          <MenuBreakdownView menuId={menu.id} className="mt-4" />
          <MenuShoppingList menuId={menu.id} />
        </div>

        {/* Intelligence sidebar */}
        <div className="hidden lg:block w-72 flex-shrink-0 space-y-4 sticky top-6 self-start">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              Intelligence
            </span>
            <Link href="/settings/menu-engine">
              <Button variant="ghost" size="sm" className="text-xs text-stone-500 h-6 px-2">
                Configure
              </Button>
            </Link>
          </div>
          <MenuCostSidebar menuId={menu.id} vendorHintsEnabled={engineFeatures.vendor_hints} />
          <MenuWhatIfPanel menuId={menu.id} />
          <MenuContextSidebar menuId={menu.id} features={engineFeatures} />
        </div>
      </div>
    </div>
  )
}
