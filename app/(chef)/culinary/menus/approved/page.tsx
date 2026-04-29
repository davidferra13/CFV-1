import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getMenus } from '@/lib/menus/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { format } from 'date-fns'

export const metadata: Metadata = { title: 'Approved Menus' }

const SERVICE_STYLE_LABELS: Record<string, string> = {
  plated: 'Plated',
  family_style: 'Family Style',
  buffet: 'Buffet',
  cocktail: 'Cocktail',
  tasting_menu: 'Tasting Menu',
  other: 'Other',
}

export default async function ApprovedMenusPage() {
  await requireChef()
  // 'locked' = client-approved and frozen
  const menus = await getMenus({ statusFilter: 'locked' })

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/menus" className="text-sm text-stone-500 hover:text-stone-300">
          ← All Menus
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Approved Menus</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {menus.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Menus locked after client approval - no further edits</p>
      </div>

      {menus.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No approved menus yet</p>
          <p className="text-stone-400 text-sm mb-4">
            Menus move here once a client approves them and they are locked
          </p>
          <Link href="/culinary/menus">
            <Button variant="secondary" size="sm">
              View All Menus
            </Button>
          </Link>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Style</TableHead>
                <TableHead>Cuisine</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menus.map((menu: any) => (
                <TableRow key={menu.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/menus/${menu.id}`}
                      className="text-brand-600 hover:text-brand-300 hover:underline"
                    >
                      {menu.name}
                    </Link>
                    {menu.description && (
                      <p className="text-xs text-stone-400 mt-0.5 truncate max-w-xs">
                        {menu.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {menu.service_style
                      ? (SERVICE_STYLE_LABELS[menu.service_style] ?? menu.service_style)
                      : '-'}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {menu.cuisine_type || '-'}
                  </TableCell>
                  <TableCell className="text-stone-500 text-sm">
                    {menu.locked_at ? format(new Date(menu.locked_at), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    <Link href={`/menus/${menu.id}`}>
                      <Button size="sm" variant="secondary">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
