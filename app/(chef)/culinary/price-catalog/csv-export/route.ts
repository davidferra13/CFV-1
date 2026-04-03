import { NextRequest, NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { searchCatalogForExport } from '@/lib/openclaw/catalog-actions'
import { csvRowSafe as row } from '@/lib/security/csv-sanitize'

export async function GET(request: NextRequest) {
  await requireChef()

  const sp = request.nextUrl.searchParams
  const search = sp.get('q') || undefined
  const category = sp.get('cat') || undefined
  const store = sp.get('store') || undefined
  const pricedOnly = sp.get('priced') === '1'
  const sort = (sp.get('sort') as 'name' | 'price' | 'stores' | 'updated') || undefined

  const items = await searchCatalogForExport({ search, category, store, pricedOnly, sort })

  const header = row([
    'Name',
    'Category',
    'Best Price ($)',
    'Unit',
    'Best Store',
    '# Stores',
    'Last Updated',
  ])
  const body = items.map((item) =>
    row([
      item.name,
      item.category,
      item.bestPriceCents != null ? (item.bestPriceCents / 100).toFixed(2) : '',
      item.bestPriceUnit ?? '',
      item.bestPriceStore ?? '',
      item.priceCount,
      item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString('en-US') : '',
    ])
  )

  const csv = [header, ...body].join('\n')
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="catalog-${date}.csv"`,
    },
  })
}
