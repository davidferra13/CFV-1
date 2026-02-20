import { getMenuById } from '@/lib/menus/actions'
import { MenuEditorClient } from '@/components/culinary/MenuEditor'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function MenuDetailPage({ params }: { params: { id: string } }) {
  const menu = await getMenuById(params.id)
  if (!menu) notFound()

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-2">
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
    </div>
  )
}
