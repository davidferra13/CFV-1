// API Route: PDF Document Generation
// GET /api/documents/[eventId]?type=foh|prep|execution|checklist|packing|all
// Returns PDF with inline disposition for browser viewing/printing
// Auth: requires chef with access to the event

import { NextRequest, NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { generateGroceryList, fetchGroceryListData, renderGroceryList } from '@/lib/documents/generate-grocery-list'
import { generateTravelRoute } from '@/lib/documents/generate-travel-route'
import { generatePrepSheet, fetchPrepSheetData, renderPrepSheet } from '@/lib/documents/generate-prep-sheet'
import { generateExecutionSheet, fetchExecutionSheetData, renderExecutionSheet } from '@/lib/documents/generate-execution-sheet'
import { generateChecklist, fetchChecklistData, renderChecklist } from '@/lib/documents/generate-checklist'
import { generateFrontOfHouseMenu, fetchFrontOfHouseMenuData, renderFrontOfHouseMenu } from '@/lib/documents/generate-front-of-house-menu'
import { generatePackingList, fetchPackingListData, renderPackingList } from '@/lib/documents/generate-packing-list'
import { generateResetChecklist, fetchResetChecklistData, renderResetChecklist } from '@/lib/documents/generate-reset-checklist'
import { generateEventSummary, fetchEventSummaryData, renderEventSummary } from '@/lib/documents/generate-event-summary'
import { generateContentShotList } from '@/lib/documents/generate-content-shot-list'
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
      case 'summary': {
        pdfBuffer = await generateEventSummary(eventId)
        filename = `event-summary-${dateSuffix}.pdf`
        break
      }

      case 'grocery': {
        pdfBuffer = await generateGroceryList(eventId)
        filename = `grocery-list-${dateSuffix}.pdf`
        break
      }

      case 'foh': {
        pdfBuffer = await generateFrontOfHouseMenu(eventId)
        filename = `front-of-house-menu-${dateSuffix}.pdf`
        break
      }

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

      case 'packing': {
        pdfBuffer = await generatePackingList(eventId)
        filename = `packing-list-${dateSuffix}.pdf`
        break
      }

      case 'reset': {
        pdfBuffer = await generateResetChecklist(eventId)
        filename = `reset-checklist-${dateSuffix}.pdf`
        break
      }

      case 'travel': {
        pdfBuffer = await generateTravelRoute(eventId)
        filename = `travel-route-${dateSuffix}.pdf`
        break
      }

      case 'shots': {
        pdfBuffer = await generateContentShotList(eventId)
        filename = `content-shot-list-${dateSuffix}.pdf`
        break
      }

      case 'all': {
        // Generate all eight as a combined 8-page PDF
        // Order: Event Summary → Grocery List → FOH Menu → Prep Sheet → Execution Sheet → Non-Negotiables → Packing List → Reset Checklist
        const pdf = new PDFLayout()

        // Page 1: Event Summary (always available — adapts to available data)
        const summaryData = await fetchEventSummaryData(eventId)
        if (summaryData) {
          renderEventSummary(pdf, summaryData)
        } else {
          pdf.title('EVENT SUMMARY')
          pdf.text('Event data not available.', 10, 'italic')
        }

        // Page 2: Grocery List
        pdf.newPage()
        const groceryData = await fetchGroceryListData(eventId)
        if (groceryData) {
          renderGroceryList(pdf, groceryData)
        } else {
          pdf.title('GROCERY LIST')
          pdf.text('Menu data not available for this event.', 10, 'italic')
        }

        // Page 3: Front-of-House Menu
        pdf.newPage()
        const fohData = await fetchFrontOfHouseMenuData(eventId)
        if (fohData) {
          renderFrontOfHouseMenu(pdf, fohData)
        } else {
          pdf.title('FRONT-OF-HOUSE MENU')
          pdf.text('Menu data not available for this event.', 10, 'italic')
        }

        // Page 4: Prep Sheet
        pdf.newPage()
        const prepData = await fetchPrepSheetData(eventId)
        if (prepData) {
          renderPrepSheet(pdf, prepData)
        } else {
          pdf.title('PREP SHEET')
          pdf.text('Menu data not available for this event.', 10, 'italic')
        }

        // Page 5: Execution Sheet
        pdf.newPage()
        const execData = await fetchExecutionSheetData(eventId)
        if (execData) {
          renderExecutionSheet(pdf, execData)
        } else {
          pdf.title('EXECUTION SHEET')
          pdf.text('Menu data not available for this event.', 10, 'italic')
        }

        // Page 6: Non-Negotiables Checklist
        pdf.newPage()
        const checkData = await fetchChecklistData(eventId)
        if (checkData) {
          renderChecklist(pdf, checkData)
        } else {
          pdf.title('NON-NEGOTIABLES')
          pdf.text('Event data not available.', 10, 'italic')
        }

        // Page 7: Packing List
        pdf.newPage()
        const packingData = await fetchPackingListData(eventId)
        if (packingData) {
          renderPackingList(pdf, packingData)
        } else {
          pdf.title('PACKING LIST')
          pdf.text('Event data not available.', 10, 'italic')
        }

        // Page 8: Post-Service Reset Checklist
        pdf.newPage()
        const resetData = await fetchResetChecklistData(eventId)
        if (resetData) {
          renderResetChecklist(pdf, resetData)
        } else {
          pdf.title('POST-SERVICE RESET')
          pdf.text('Event data not available.', 10, 'italic')
        }

        pdfBuffer = pdf.toBuffer()
        filename = `event-documents-${dateSuffix}.pdf`
        break
      }

      default:
        return NextResponse.json(
          { error: 'Invalid document type. Use: summary, grocery, foh, prep, execution, checklist, packing, reset, travel, shots, or all' },
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
