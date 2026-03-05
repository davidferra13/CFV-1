import { NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { getCurrentRegisterSession, getRegisterSession } from '@/lib/commerce/register-actions'
import { getShiftReport } from '@/lib/commerce/report-actions'
import { PDFLayout } from '@/lib/documents/pdf-layout'
import { csvRowSafe as toCsvRow } from '@/lib/security/csv-sanitize'

function formatCents(cents: number) {
  return `$${(Number(cents ?? 0) / 100).toFixed(2)}`
}

function buildShiftCsv(input: {
  reportType: 'x' | 'z'
  generatedAtIso: string
  report: Awaited<ReturnType<typeof getShiftReport>>
}) {
  const summaryHeader = ['Report Type', 'Generated At', 'Session ID', 'Session Name', 'Opened At', 'Closed At']
  const summaryRow = [
    input.reportType.toUpperCase(),
    input.generatedAtIso,
    input.report.sessionId,
    input.report.sessionName ?? 'Shift',
    input.report.openedAt,
    input.report.closedAt ?? '',
  ]

  const totalsHeader = [
    'Total Sales',
    'Total Revenue',
    'Total Tips',
    'Opening Cash',
    'Expected Cash',
    'Closing Cash',
    'Cash Variance',
  ]
  const totalsRow = [
    input.report.totalSalesCount,
    (input.report.totalRevenueCents / 100).toFixed(2),
    (input.report.totalTipsCents / 100).toFixed(2),
    (input.report.openingCashCents / 100).toFixed(2),
    input.report.expectedCashCents != null ? (input.report.expectedCashCents / 100).toFixed(2) : '',
    input.report.closingCashCents != null ? (input.report.closingCashCents / 100).toFixed(2) : '',
    input.report.cashVarianceCents != null ? (input.report.cashVarianceCents / 100).toFixed(2) : '',
  ]

  const paymentHeader = ['Payment Method', 'Tender Count', 'Total']
  const paymentRows = input.report.paymentBreakdown.map((row) =>
    toCsvRow([row.method, row.count, (row.totalCents / 100).toFixed(2)])
  )

  const productHeader = ['Top Product', 'Quantity', 'Revenue']
  const productRows = input.report.topProducts.map((row) =>
    toCsvRow([row.name, row.quantity, (row.revenueCents / 100).toFixed(2)])
  )

  return [
    toCsvRow(summaryHeader),
    toCsvRow(summaryRow),
    '',
    toCsvRow(totalsHeader),
    toCsvRow(totalsRow),
    '',
    toCsvRow(paymentHeader),
    ...paymentRows,
    '',
    toCsvRow(productHeader),
    ...productRows,
  ].join('\n')
}

function buildShiftPdf(input: {
  reportType: 'x' | 'z'
  generatedAtIso: string
  report: Awaited<ReturnType<typeof getShiftReport>>
}) {
  const pdf = new PDFLayout()
  const title = input.reportType === 'x' ? 'POS X REPORT' : 'POS Z REPORT'
  pdf.title(title)
  pdf.headerBar([
    ['Generated', new Date(input.generatedAtIso).toLocaleString()],
    ['Session', input.report.sessionName ?? 'Shift'],
  ])
  pdf.space(1.5)

  pdf.sectionHeader('SUMMARY')
  pdf.keyValue('Session ID', input.report.sessionId)
  pdf.keyValue('Opened', new Date(input.report.openedAt).toLocaleString())
  pdf.keyValue(
    'Closed',
    input.report.closedAt ? new Date(input.report.closedAt).toLocaleString() : 'Open session'
  )
  pdf.keyValue('Total Sales', String(input.report.totalSalesCount))
  pdf.keyValue('Revenue', formatCents(input.report.totalRevenueCents))
  pdf.keyValue('Tips', formatCents(input.report.totalTipsCents))
  pdf.keyValue('Opening Cash', formatCents(input.report.openingCashCents))
  pdf.keyValue(
    'Expected Cash',
    input.report.expectedCashCents != null ? formatCents(input.report.expectedCashCents) : 'n/a'
  )
  pdf.keyValue(
    'Closing Cash',
    input.report.closingCashCents != null ? formatCents(input.report.closingCashCents) : 'n/a'
  )
  pdf.keyValue(
    'Cash Variance',
    input.report.cashVarianceCents != null ? formatCents(input.report.cashVarianceCents) : 'n/a'
  )

  if (input.report.paymentBreakdown.length > 0) {
    pdf.space(1.5)
    pdf.sectionHeader('TENDER BREAKDOWN')
    for (const row of input.report.paymentBreakdown.slice(0, 10)) {
      pdf.text(`${String(row.method).toUpperCase()} - ${row.count} tenders - ${formatCents(row.totalCents)}`)
    }
  }

  if (input.report.topProducts.length > 0) {
    pdf.space(1.5)
    pdf.sectionHeader('TOP PRODUCTS')
    for (const row of input.report.topProducts.slice(0, 10)) {
      pdf.text(`${row.name} - ${row.quantity} sold - ${formatCents(row.revenueCents)}`)
    }
  }

  pdf.footer('ChefFlow Commerce Shift Report')
  return pdf.toBuffer()
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    await requireChef()
    await requirePro('commerce')

    const { sessionId: rawSessionId } = await params
    const sessionParam = String(rawSessionId ?? '').trim()
    if (!sessionParam) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    let resolvedSessionId = sessionParam
    if (sessionParam === 'current') {
      const current = await getCurrentRegisterSession()
      if (!current?.id) {
        return NextResponse.json({ error: 'No active register session found' }, { status: 404 })
      }
      resolvedSessionId = String(current.id)
    }

    const [session, report] = await Promise.all([
      getRegisterSession(resolvedSessionId),
      getShiftReport(resolvedSessionId),
    ])

    const status = String((session as any).status ?? '')
    const reportType: 'x' | 'z' = status === 'closed' ? 'z' : 'x'
    const generatedAtIso = new Date().toISOString()
    const format = new URL(request.url).searchParams.get('format') === 'csv' ? 'csv' : 'pdf'

    if (format === 'csv') {
      const csv = buildShiftCsv({ reportType, generatedAtIso, report })
      const filename = `${reportType}-report-${report.sessionId}.csv`
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    const pdfBuffer = buildShiftPdf({ reportType, generatedAtIso, report })
    const filename = `${reportType}-report-${report.sessionId}.pdf`
    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[commerce-shift-report] Failed to generate report:', error)
    return NextResponse.json({ error: 'Unable to generate report' }, { status: 500 })
  }
}
