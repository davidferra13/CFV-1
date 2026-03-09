import { PDFLayout } from '@/lib/documents/pdf-layout'

export function renderCostBreakdown(
  pdf: PDFLayout,
  lineItems: Array<{
    label: string
    amountCents: number
    percentage?: number | null
    sourceNote?: string | null
  }>,
  exclusionsNote?: string | null
) {
  if (lineItems.length === 0) {
    return
  }

  pdf.space(1)
  pdf.text('Cost breakdown', 8, 'bold', 0)

  let total = 0
  for (const item of lineItems) {
    total += item.amountCents
    const value = `$${(item.amountCents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}${item.percentage != null ? ` (${Number(item.percentage).toFixed(0)}%)` : ''}`
    pdf.keyValue(item.label, value, 8)
    if (item.sourceNote) {
      pdf.text(`Source: ${item.sourceNote}`, 7, 'italic', 4)
    }
  }

  pdf.keyValue(
    'Breakdown total',
    `$${(total / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
    8
  )

  if (exclusionsNote) {
    pdf.space(1)
    pdf.text('Not included:', 8, 'bold', 0)
    pdf.text(exclusionsNote, 7, 'normal', 4)
  }
}
