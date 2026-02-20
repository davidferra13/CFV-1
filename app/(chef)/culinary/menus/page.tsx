import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getMenus } from '@/lib/menus/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { format } from 'date-fns'

export const metadata: Metadata = { title: 'Menus - ChefFlow' }

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-stone-100 text-stone-600',
  shared: 'bg-blue-100 text-blue-700',
  locked: 'bg-green-100 text-green-700',
  archived: 'bg-stone-200 text-stone-500',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  shared: 'Shared',
  locked: 'Approved',
  archived: 'Archived',
}

const SERVICE_STYLE_LABELS: Record<string, string> = {
  plated: 'Plated',
  family_style: 'Family Style',
  buffet: 'Buffet',
  cocktail: 'Cocktail',
  tasting_menu: 'Tasting Menu',
  other: 'Other',
}

export default async function ChefMenusPage() {
  await requireChef()
  const menus = await getMenus()
  const activeMenus = menus.filter(m => m.status !== 'archived')

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-stone-900">Menus</h1>
            <span className="bg-stone-100 text-stone-600 text-sm px-2 py-0.5 rounded-full">
              {activeMenus.length}
            </span>
          </div>
          <Link href="/culinary/menus/new">
            <Button>Create Menu</Button>
          </Link>
        </div>
        <p className="text-stone-500 mt-1">Menu templates and event-specific menus</p>
      </div>

      {activeMenus.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-600 font-medium mb-1">No menus yet</p>
          <p className="text-stone-400 text-sm mb-4">Create a menu template or attach one to an event</p>
          <Link href="/culinary/menus/new">
            <Button variant="secondary" size="sm">Create First Menu</Button>
          </Link>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Style</TableHead>
                <TableHead>Cuisine</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeMenus.map(menu => (
                <TableRow key={menu.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/culinary/menus/${menu.id}`}
                      className="text-brand-600 hover:text-brand-800 hover:underline"
                    >
                      {menu.name}
                    </Link>
                    {menu.description && (
                      <p className="text-xs text-stone-400 mt-0.5 truncate max-w-xs">{menu.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[menu.status] ?? 'bg-stone-100 text-stone-600'}`}>
                      {STATUS_LABELS[menu.status] ?? menu.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-stone-600 text-sm">
                    {menu.service_style ? (SERVICE_STYLE_LABELS[menu.service_style] ?? menu.service_style) : '—'}
                  </TableCell>
                  <TableCell className="text-stone-600 text-sm">
                    {menu.cuisine_type || '—'}
                  </TableCell>
                  <TableCell>
                    {menu.is_template ? (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Template</span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-stone-500 text-sm">
                    {format(new Date(menu.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Link href={`/culinary/menus/${menu.id}`}>
                      <Button size="sm" variant="secondary">View</Button>
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
