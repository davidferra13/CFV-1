// API Route: PDF Document Generation
// GET /api/documents/[eventId]?type=prep|execution|checklist|all
// Returns PDF with inline disposition for browser viewing/printing
// Auth: requires chef with access to the event

import { NextRequest, NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { generatePrepSheet, fetchPrepSheetData, renderPrepSheet } from '@/lib/documents/generate-prep-sheet'
import { generateExecutionSheet, fetchExecutionSheetData, renderExecutionSheet } from '@/lib/documents/generate-execution-sheet'
import { generateChecklist, fetchChecklistData, renderChecklist } from '@/lib/documents/generate-checklist'
import { PDFLayout } from '@/lib/documents/pdf-layout'
import { format } from 'date-fns'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    // Auth check — will throw if not a chef
    await requireChef()

    const { eventId } = params
    const type = request.nextUrl.searchParams.get('type') || 'all'

    let pdfBuffer: Buffer
    let filename: string

    // Date string for filename
    const dateSuffix = format(new Date(), 'yyyy-MM-dd')

    switch (type) {
      case 'prep': {
        pdfBuffer = await generatePrepSheet(eventId)
        filename = `prep-sheet-${dateSuffix}.pdf`
        break
      }

      case 'execution': {
        pdfBuffer = await generateExecutionSheet(eventId)
        filename = `execution-sheet-${dateSuffix}.pdf`
        break
      }

      case 'checklist': {
        pdfBuffer = await generateChecklist(eventId)
        filename = `checklist-${dateSuffix}.pdf`
        break
      }

      case 'all': {
        // Generate all three as a combined 3-page PDF
        const pdf = new PDFLayout()

        // Page 1: Prep Sheet
        const prepData = await fetchPrepSheetData(eventId)
        if (prepData) {
          renderPrepSheet(pdf, prepData)
        } else {
          pdf.title('PREP SHEET')
          pdf.text('Menu data not available for this event.', 10, 'italic')
        }

        // Page 2: Execution Sheet
        pdf.newPage()
        const execData = await fetchExecutionSheetData(eventId)
        if (execData) {
          renderExecutionSheet(pdf, execData)
        } else {
          pdf.title('EXECUTION SHEET')
          pdf.text('Menu data not available for this event.', 10, 'italic')
        }

        // Page 3: Checklist
        pdf.newPage()
        const checkData = await fetchChecklistData(eventId)
        if (checkData) {
          renderChecklist(pdf, checkData)
        } else {
          pdf.title('NON-NEGOTIABLES')
          pdf.text('Event data not available.', 10, 'italic')
        }

        pdfBuffer = pdf.toBuffer()
        filename = `event-documents-${dateSuffix}.pdf`
        break
      }

      default:
        return NextResponse.json(
          { error: 'Invalid document type. Use: prep, execution, checklist, or all' },
          { status: 400 }
        )
    }

    // Return PDF with inline disposition (opens in browser PDF viewer)
    // Convert Buffer to Uint8Array for NextResponse compatibility
    const bytes = new Uint8Array(pdfBuffer)
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate document'

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('[documents/route] Error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
