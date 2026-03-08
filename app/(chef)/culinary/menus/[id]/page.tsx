import { getMenuById } from '@/lib/menus/actions'
import { MenuEditorClient } from '@/components/culinary/MenuEditor'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getMenuPairings, getBeverages } from '@/lib/beverages/actions'
import { MenuPairingEditor } from '@/components/beverages/menu-pairing-editor'

export default async function MenuDetailPage({ params }: { params: { id: string } }) {
  const menu = await getMenuById(params.id)
  if (!menu) notFound()

  const [pairings, beverages] = await Promise.all([
    getMenuPairings(params.id),
    getBeverages(),
  ])

  // Extract dishes for the pairing editor
  const dishes = (menu.dishes ?? []).map((d: { course_name: string; course_number: number }) => ({
    name: d.course_name,
    courseNumber: d.course_number,
  }))

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <Link href="/culinary/menus">
          <Button variant="ghost" size="sm">← Menus</Button>
        </Link>
        {menu.event_id && (
          <Link href={`/events/${menu.event_id}`}>
            <Button variant="ghost" size="sm">View Event →</Button>
          </Link>
        )}
      </div>
      <MenuEditorClient menu={menu} />

      {/* Beverage Pairings Section */}
      <div className="border-t border-stone-200 pt-6">
        <MenuPairingEditor
          menuId={params.id}
          pairings={pairings}
          beverages={beverages}
          dishes={dishes}
        />
      </div>
    </div>
  )
}
