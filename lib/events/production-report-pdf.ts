// Production Report PDF Builder
// Uses PDFLayout to generate a print-optimized production report.
// Multi-page support for large menus.

import { PDFLayout } from '@/lib/documents/pdf-layout'
import type { ProductionReport } from './production-report-actions'

export function buildProductionReportPdf(report: ProductionReport): Buffer {
  const pdf = new PDFLayout()

  // For large reports, compact the font
  const totalComponents = report.courses.reduce(
    (sum, c) => sum + c.dishes.reduce((ds, d) => ds + d.components.length, 0),
    0
  )
  if (totalComponents > 8) pdf.setFontScale(0.85)
  if (totalComponents > 14) pdf.setFontScale(0.75)

  // Header
  pdf.title('Production Report')
  pdf.headerBar([
    ['Event', report.eventName],
    ['Date', formatDate(report.eventDate)],
    ['Guests', String(report.guestCount)],
    ['Client', report.clientName],
  ])

  // Time totals
  if (report.totalPrepMinutes > 0 || report.totalCookMinutes > 0) {
    pdf.headerBar([
      ['Total Prep', formatMinutes(report.totalPrepMinutes)],
      ['Total Cook', formatMinutes(report.totalCookMinutes)],
      ['Total Time', formatMinutes(report.totalPrepMinutes + report.totalCookMinutes)],
    ])
  }

  pdf.space(2)

  // Courses
  for (const course of report.courses) {
    // Check if we need a new page
    if (pdf.wouldOverflow(20)) pdf.newPage()

    pdf.sectionHeader(`Course ${course.courseNumber}: ${course.courseName}`)

    for (const dish of course.dishes) {
      if (pdf.wouldOverflow(15)) pdf.newPage()

      pdf.courseHeader(dish.dishName)

      for (const comp of dish.components) {
        if (pdf.wouldOverflow(12)) pdf.newPage()

        // Component name (and recipe name if different)
        const compLabel = comp.recipeName
          ? `${comp.componentName} (${comp.recipeName})`
          : comp.componentName
        pdf.text(compLabel, 9, 'bold', 4)

        // Time badges inline
        const timeParts: string[] = []
        if (comp.prepTimeMinutes) timeParts.push(`Prep: ${formatMinutes(comp.prepTimeMinutes)}`)
        if (comp.cookTimeMinutes) timeParts.push(`Cook: ${formatMinutes(comp.cookTimeMinutes)}`)
        if (timeParts.length > 0) {
          pdf.text(timeParts.join('  |  '), 8, 'italic', 6)
        }

        // Scaled ingredients
        if (comp.scaledIngredients.length > 0) {
          for (const ing of comp.scaledIngredients) {
            const qtyStr = formatQuantity(ing.quantity)
            const prepStr = ing.preparation ? `, ${ing.preparation}` : ''
            pdf.bullet(`${qtyStr} ${ing.unit} ${ing.name}${prepStr}`, 8, 8)
          }
        }

        // Method steps
        if (comp.method) {
          pdf.space(1)
          pdf.text('Method:', 8, 'bold', 6)
          // Split method by line breaks for readability
          const methodLines = comp.method.split('\n').filter((l) => l.trim())
          for (const line of methodLines) {
            if (pdf.wouldOverflow(4)) pdf.newPage()
            pdf.text(line.trim(), 8, 'normal', 8)
          }
        }

        pdf.space(2)
      }
    }
  }

  // Allergen/Dietary summary at bottom
  if (report.allergenSummary.length > 0 || report.dietarySummary.length > 0) {
    if (pdf.wouldOverflow(15)) pdf.newPage()

    pdf.hr()

    if (report.allergenSummary.length > 0) {
      pdf.text('ALLERGENS: ' + report.allergenSummary.join(', '), 9, 'bold', 0)
    }
    if (report.dietarySummary.length > 0) {
      pdf.text('DIETARY: ' + report.dietarySummary.join(', '), 9, 'bold', 0)
    }
  }

  // Footer
  pdf.generatedBy('ChefFlow', 'Production Report')

  return pdf.toBuffer()
}

// -- Helpers --

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function formatQuantity(qty: number): string {
  // Clean up floating point: show at most 2 decimal places
  if (Number.isInteger(qty)) return String(qty)
  return qty.toFixed(2).replace(/\.?0+$/, '')
}
