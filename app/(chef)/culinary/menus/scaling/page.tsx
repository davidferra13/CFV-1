import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getMenus } from '@/lib/menus/actions'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

export const metadata: Metadata = { title: 'Menu Scaling - ChefFlow' }

export default async function MenuScalingPage() {
  await requireChef()
  const menus = await getMenus()

  const menusWithGuests = menus.filter((m: any) => m.target_guest_count != null)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/menus" className="text-sm text-stone-500 hover:text-stone-300">
          ← Menus
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Menu Scaling</h1>
        <p className="text-stone-500 mt-1">
          Menus with target guest counts — reference for quantity adjustments
        </p>
      </div>

      <Card className="p-4 bg-sky-950 border-sky-200">
        <p className="text-sm font-medium text-sky-800">About scaling</p>
        <p className="text-sm text-sky-700 mt-1">
          Scaling in ChefFlow is done per-recipe using the recipe yield and ingredient quantities.
          Set a target guest count on a menu to track the baseline, then adjust recipe quantities
          proportionally when cooking for more or fewer guests.
        </p>
      </Card>

      {menusWithGuests.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No menus with guest counts set</p>
          <p className="text-stone-400 text-sm mt-1">
            Set a target guest count on a menu to track it for scaling
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Menu</TableHead>
                <TableHead>Target Guests</TableHead>
                <TableHead>Service Style</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menusWithGuests
                .sort((a: any, b: any) => (b.target_guest_count ?? 0) - (a.target_guest_count ?? 0))
                .map((menu: any) => (
                  <TableRow key={menu.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/culinary/menus/${menu.id}`}
                        className="text-brand-600 hover:underline"
                      >
                        {menu.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-stone-100 font-semibold">
                      {menu.target_guest_count}
                    </TableCell>
                    <TableCell className="text-stone-500 text-sm capitalize">
                      {menu.service_style?.replace(/_/g, ' ') ?? '—'}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 capitalize">
                        {menu.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link href={`/culinary/menus/${menu.id}`}>
                        <span className="text-xs text-brand-600 hover:underline cursor-pointer">
                          View
                        </span>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {menus.filter((m: any) => m.target_guest_count == null).length > 0 && (
        <p className="text-xs text-stone-400">
          {menus.filter((m: any) => m.target_guest_count == null).length} menus without a target
          guest count —{' '}
          <Link href="/culinary/menus" className="text-brand-600 hover:underline">
            view all menus
          </Link>
        </p>
      )}
    </div>
  )
}
