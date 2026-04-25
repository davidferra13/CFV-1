import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PrepSheetTable } from '@/components/stations/prep-sheet-table'
import { GeneratePrepButton } from '@/components/stations/generate-prep-button'
import {
  listPrepRequirements,
  listMenusForLinking,
  getLinkedMenus,
} from '@/lib/prep/prep-sheet-actions'
import { LinkMenuForm } from './link-menu-form'

export const metadata: Metadata = { title: 'Prep Sheet' }

export default async function PrepSheetPage({ params }: { params: { id: string } }) {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  // Load service day
  const { data: serviceDay, error } = await db
    .from('service_days')
    .select('id, service_date, shift_label, expected_covers, status')
    .eq('id', params.id)
    .eq('chef_id', chefId)
    .single()

  if (error || !serviceDay) notFound()

  const [prepItems, linkedMenus, availableMenus] = await Promise.all([
    listPrepRequirements(params.id),
    getLinkedMenus(params.id),
    listMenusForLinking(),
  ])

  // Filter out already-linked menus from available list
  const linkedIds = new Set(linkedMenus.map((m) => m.menu_id))
  const unlinkableMenus = availableMenus.filter((m) => !linkedIds.has(m.id))

  const dateStr = new Date(serviceDay.service_date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/stations/service-log/${params.id}`}
          className="text-sm text-stone-500 hover:text-stone-300"
        >
          Back to Service Day
        </Link>
        <h1 className="text-2xl font-bold text-stone-50 mt-1">
          Prep Sheet for {dateStr} ({serviceDay.shift_label})
        </h1>
        <p className="text-sm text-stone-400 mt-1">
          Expected covers: {serviceDay.expected_covers ?? 'not set'}
        </p>
      </div>

      {/* Menu Linking */}
      <Card>
        <CardHeader>
          <CardTitle as="h2">Linked Menus</CardTitle>
        </CardHeader>
        <CardContent>
          {linkedMenus.length > 0 ? (
            <ul className="space-y-1 mb-4">
              {linkedMenus.map((m) => (
                <li key={m.id} className="text-stone-200 text-sm">
                  {m.menu_name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-stone-500 text-sm mb-4">No menus linked yet.</p>
          )}
          {unlinkableMenus.length > 0 && (
            <LinkMenuForm serviceDayId={params.id} menus={unlinkableMenus} />
          )}
        </CardContent>
      </Card>

      {/* Generate Button */}
      <Card>
        <CardContent className="pt-4">
          <GeneratePrepButton serviceDayId={params.id} />
        </CardContent>
      </Card>

      {/* Prep Table */}
      <Card>
        <CardHeader>
          <CardTitle as="h2">Prep Items</CardTitle>
        </CardHeader>
        <CardContent>
          <PrepSheetTable items={prepItems} />
        </CardContent>
      </Card>
    </div>
  )
}
