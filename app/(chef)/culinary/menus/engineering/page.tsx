import { requireChef } from '@/lib/auth/get-user'
import { MenuEngineeringDashboard } from '@/components/menus/menu-engineering-dashboard'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata = { title: 'Menu Engineering' }

export default async function MenuEngineeringPage() {
  await requireChef()

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/culinary/menus">
          <Button variant="ghost" size="sm">
            ← Menus
          </Button>
        </Link>
      </div>
      <MenuEngineeringDashboard />
    </div>
  )
}
