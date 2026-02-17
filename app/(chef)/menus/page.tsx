// Chef Menus List - Protected by layout

import { requireChef } from '@/lib/auth/get-user'
import { getMenus } from '@/lib/menus/actions'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/currency'
import { MenusClientWrapper } from './menus-client-wrapper'

export default async function MenusPage() {
  const user = await requireChef()
  const menus = await getMenus()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Menus</h1>
          <p className="text-stone-600 mt-1">Manage your menu templates</p>
        </div>
        <Link href="/menus/new">
          <Button>Create Menu</Button>
        </Link>
      </div>

      <MenusClientWrapper menus={menus} />
    </div>
  )
}
