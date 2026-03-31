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
import { format } from 'date-fns'

export const metadata: Metadata = { title: 'Past Menus' }

const SERVICE_STYLE_LABELS: Record<string, string> = {
  plated: 'Plated',
  family_style: 'Family Style',
  buffet: 'Buffet',
  cocktail: 'Cocktail',
  tasting_menu: 'Tasting Menu',
  other: 'Other',
}

export default async function PastMenusPage() {
  await requireChef()
  const menus = await getMenus()

  // Show non-template menus (event-specific menus) that are locked/approved or archived
  const eventMenus = menus
    .filter((m: any) => !m.is_template && (m.status === 'locked' || m.status === 'archived'))
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const templateMenus = menus.filter((m: any) => m.is_template)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients/history" className="text-sm text-stone-500 hover:text-stone-300">
          ← Client History
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Past Menus</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {eventMenus.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">
          Approved and archived event-specific menus you have served
        </p>
      </div>

      {eventMenus.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-100">{eventMenus.length}</p>
            <p className="text-sm text-stone-500 mt-1">Event menus served</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-amber-700">{templateMenus.length}</p>
            <p className="text-sm text-stone-500 mt-1">Menu templates</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-green-700">{menus.length}</p>
            <p className="text-sm text-stone-500 mt-1">Total menus in library</p>
          </Card>
        </div>
      )}

      {eventMenus.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No past menus yet</p>
          <p className="text-stone-400 text-sm">
            Approved event menus will appear here once events are completed
          </p>
          <Link
            href="/culinary/menus"
            className="text-sm text-brand-600 hover:underline mt-2 block"
          >
            Browse menu library
          </Link>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Menu Name</TableHead>
                <TableHead>Style</TableHead>
                <TableHead>Cuisine</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventMenus.map((menu: any) => (
                <TableRow key={menu.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/culinary/menus/${menu.id}`}
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
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${menu.status === 'locked' ? 'bg-green-900 text-green-700' : 'bg-stone-700 text-stone-500'}`}
                    >
                      {menu.status === 'locked' ? 'Approved' : 'Archived'}
                    </span>
                  </TableCell>
                  <TableCell className="text-stone-500 text-sm">
                    {format(new Date(menu.created_at), 'MMM d, yyyy')}
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
    </div>
  )
}
