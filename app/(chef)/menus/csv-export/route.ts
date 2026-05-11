// GET /menus/csv-export - Downloads all menus as a CSV file.

import { NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { csvRowSafe as row } from '@/lib/security/csv-sanitize'

export async function GET() {
  const user = await requireChef()
  const db: any = createServerClient()

  const [menusResult, dishesResult] = await Promise.all([
    db
      .from('menus')
      .select('id, name, description, status, notes, course_count, created_at')
      .eq('tenant_id', user.tenantId!)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    db
      .from('dishes')
      .select('menu_id, name')
      .eq('tenant_id', user.tenantId!)
      .is('deleted_at', null),
  ])

  const menus = menusResult.data ?? []
  const dishes = dishesResult.data ?? []

  // Group dish names by menu_id
  const dishesByMenu = new Map<string, string[]>()
  for (const d of dishes as { menu_id: string; name: string }[]) {
    const list = dishesByMenu.get(d.menu_id)
    if (list) {
      list.push(d.name)
    } else {
      dishesByMenu.set(d.menu_id, [d.name])
    }
  }

  const header = row(['Name', 'Description', 'Status', 'Courses', 'Dishes', 'Notes', 'Created'])

  const body = menus.map((m: any) => {
    const dishNames = dishesByMenu.get(m.id) ?? []
    return row([
      m.name,
      m.description ?? '',
      m.status ?? '',
      m.course_count != null ? m.course_count : '',
      dishNames.join('; '),
      m.notes ?? '',
      m.created_at ? new Date(m.created_at).toLocaleDateString('en-US') : '',
    ])
  })

  const csv = [header, ...body].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="menus-${((_d) => `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`)(new Date())}.csv"`,
    },
  })
}
