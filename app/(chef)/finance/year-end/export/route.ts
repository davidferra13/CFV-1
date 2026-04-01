// GET /finance/year-end/export?year=YYYY
// Streams the canonical CPA export package as a zip download.
// This is the single authoritative download endpoint for CPA-facing exports.

import { NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { generateCpaExportPackage } from '@/lib/finance/cpa-export-actions'

export async function GET(request: Request) {
  try {
    await requireChef()
  } catch {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const yearParam = searchParams.get('year')
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

  if (isNaN(year) || year < 2020 || year > 2035) {
    return new NextResponse('Invalid year parameter', { status: 400 })
  }

  try {
    const { filename, bytes } = await generateCpaExportPackage(year)

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(bytes.length),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed'
    return new NextResponse(message, { status: 422 })
  }
}
