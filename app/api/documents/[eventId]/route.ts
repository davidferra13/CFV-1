// API Route: PDF Document Generation
// GET /api/documents/[eventId]?type=foh|prep|execution|checklist|packing|all
// Returns PDF with inline disposition for browser viewing/printing
// Auth: requires chef with access to the event

import { NextRequest, NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getDocumentContext } from '@/lib/print/actions'
import { fetchGroceryListData, renderGroceryList } from '@/lib/documents/generate-grocery-list'
import { fetchTravelRouteData, renderTravelRoute } from '@/lib/documents/generate-travel-route'
import { fetchPrepSheetData, renderPrepSheet } from '@/lib/documents/generate-prep-sheet'
import {
  fetchExecutionSheetData,
  renderExecutionSheet,
} from '@/lib/documents/generate-execution-sheet'
import { fetchChecklistData, renderChecklist } from '@/lib/documents/generate-checklist'
import {
  fetchFrontOfHouseMenuData,
  renderFrontOfHouseMenu,
} from '@/lib/documents/generate-front-of-house-menu'
import { fetchPackingListData, renderPackingList } from '@/lib/documents/generate-packing-list'
import {
  fetchResetChecklistData,
  renderResetChecklist,
} from '@/lib/documents/generate-reset-checklist'
import { fetchEventSummaryData, renderEventSummary } from '@/lib/documents/generate-event-summary'
import {
  fetchContentShotListData,
  renderContentShotList,
} from '@/lib/documents/generate-content-shot-list'
import { PDFLayout } from '@/lib/documents/pdf-layout'
import { format } from 'date-fns'

/** Apply attribution + custom footer to a PDF page */
function applyPageMeta(
  pdf: PDFLayout,
  generatedBy: string | undefined,
  customFooter: string | null,
  docType: string
) {
  if (generatedBy) pdf.generatedBy(generatedBy, docType)
  if (customFooter) pdf.customFooter(customFooter)
}

export async function GET(request: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    // Auth check — will throw if not a chef
    const user = await requireChef()

    // Validate eventId format — must be a valid UUID-like string, not a path segment
    const { eventId } = params
    if (!eventId || eventId.length < 8) {
      return NextResponse.json({ error: 'Invalid event ID format' }, { status: 400 })
    }

    // Quick auth check: verify user has access to this event before generating documents
    // This prevents generating PDFs for invalid/cross-tenant eventIds
    const supabase: any = createServerClient()
    const { count } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)

    if (!count || count === 0) {
      return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 })
    }

    // Resolve all print context in one DB call — attribution, custom footer
    const { generatedBy, customFooter } = await getDocumentContext()

    const type = request.nextUrl.searchParams.get('type') || 'all'

    let pdfBuffer: Buffer
    let filename: string

    // Date string for filename
    const dateSuffix = format(new Date(), 'yyyy-MM-dd')

    // Helper: render a single-page PDF with attribution + custom footer
    const renderSingle = async (
      fetchFn: () => Promise<any>,
      renderFn: (pdf: PDFLayout, data: any) => void,
      docType: string,
      fallbackTitle: string
    ): Promise<Buffer> => {
      const pdf = new PDFLayout()
      const data = await fetchFn()
      if (data) {
        renderFn(pdf, data)
      } else {
        pdf.title(fallbackTitle)
        pdf.text('Data not available for this event.', 10, 'italic')
      }
      applyPageMeta(pdf, generatedBy, customFooter, docType)
      return pdf.toBuffer()
    }

    switch (type) {
      case 'summary': {
        pdfBuffer = await renderSingle(
          () => fetchEventSummaryData(eventId),
          renderEventSummary,
          'Event Summary',
          'EVENT SUMMARY'
        )
        filename = `event-summary-${dateSuffix}.pdf`
        break
      }

      case 'grocery': {
        pdfBuffer = await renderSingle(
          () => fetchGroceryListData(eventId),
          renderGroceryList,
          'Grocery List',
          'GROCERY LIST'
        )
        filename = `grocery-list-${dateSuffix}.pdf`
        break
      }

      case 'foh': {
        pdfBuffer = await renderSingle(
          () => fetchFrontOfHouseMenuData(eventId),
          renderFrontOfHouseMenu,
          'FOH Menu',
          'FRONT-OF-HOUSE MENU'
        )
        filename = `front-of-house-menu-${dateSuffix}.pdf`
        break
      }

      case 'prep': {
        pdfBuffer = await renderSingle(
          () => fetchPrepSheetData(eventId),
          renderPrepSheet,
          'Prep Sheet',
          'PREP SHEET'
        )
        filename = `prep-sheet-${dateSuffix}.pdf`
        break
      }

      case 'execution': {
        pdfBuffer = await renderSingle(
          () => fetchExecutionSheetData(eventId),
          renderExecutionSheet,
          'Execution Sheet',
          'EXECUTION SHEET'
        )
        filename = `execution-sheet-${dateSuffix}.pdf`
        break
      }

      case 'checklist': {
        pdfBuffer = await renderSingle(
          () => fetchChecklistData(eventId),
          renderChecklist,
          'Non-Negotiables',
          'NON-NEGOTIABLES'
        )
        filename = `checklist-${dateSuffix}.pdf`
        break
      }

      case 'packing': {
        pdfBuffer = await renderSingle(
          () => fetchPackingListData(eventId),
          renderPackingList,
          'Packing List',
          'PACKING LIST'
        )
        filename = `packing-list-${dateSuffix}.pdf`
        break
      }

      case 'reset': {
        pdfBuffer = await renderSingle(
          () => fetchResetChecklistData(eventId),
          renderResetChecklist,
          'Reset Checklist',
          'POST-SERVICE RESET'
        )
        filename = `reset-checklist-${dateSuffix}.pdf`
        break
      }

      case 'travel': {
        pdfBuffer = await renderSingle(
          () => fetchTravelRouteData(eventId),
          renderTravelRoute,
          'Travel Route',
          'TRAVEL ROUTE'
        )
        filename = `travel-route-${dateSuffix}.pdf`
        break
      }

      case 'shots': {
        pdfBuffer = await renderSingle(
          () => fetchContentShotListData(eventId),
          renderContentShotList,
          'Content Shot List',
          'CONTENT SHOT LIST'
        )
        filename = `content-shot-list-${dateSuffix}.pdf`
        break
      }

      case 'all': {
        // Generate all eight as a combined 8-page PDF
        // Order: Event Summary → Grocery List → FOH Menu → Prep Sheet → Execution Sheet → Non-Negotiables → Packing List → Reset Checklist
        const pdf = new PDFLayout()

        const pages: Array<{
          fetch: () => Promise<any>
          render: (p: PDFLayout, d: any) => void
          docType: string
          fallback: string
        }> = [
          {
            fetch: () => fetchEventSummaryData(eventId),
            render: renderEventSummary,
            docType: 'Event Summary',
            fallback: 'EVENT SUMMARY',
          },
          {
            fetch: () => fetchGroceryListData(eventId),
            render: renderGroceryList,
            docType: 'Grocery List',
            fallback: 'GROCERY LIST',
          },
          {
            fetch: () => fetchFrontOfHouseMenuData(eventId),
            render: renderFrontOfHouseMenu,
            docType: 'FOH Menu',
            fallback: 'FRONT-OF-HOUSE MENU',
          },
          {
            fetch: () => fetchPrepSheetData(eventId),
            render: renderPrepSheet,
            docType: 'Prep Sheet',
            fallback: 'PREP SHEET',
          },
          {
            fetch: () => fetchExecutionSheetData(eventId),
            render: renderExecutionSheet,
            docType: 'Execution Sheet',
            fallback: 'EXECUTION SHEET',
          },
          {
            fetch: () => fetchChecklistData(eventId),
            render: renderChecklist,
            docType: 'Non-Negotiables',
            fallback: 'NON-NEGOTIABLES',
          },
          {
            fetch: () => fetchPackingListData(eventId),
            render: renderPackingList,
            docType: 'Packing List',
            fallback: 'PACKING LIST',
          },
          {
            fetch: () => fetchResetChecklistData(eventId),
            render: renderResetChecklist,
            docType: 'Reset Checklist',
            fallback: 'POST-SERVICE RESET',
          },
        ]

        for (let i = 0; i < pages.length; i++) {
          if (i > 0) pdf.newPage()
          const page = pages[i]
          const data = await page.fetch()
          if (data) {
            page.render(pdf, data)
          } else {
            pdf.title(page.fallback)
            pdf.text('Data not available for this event.', 10, 'italic')
          }
          applyPageMeta(pdf, generatedBy, customFooter, page.docType)
        }

        pdfBuffer = pdf.toBuffer()
        filename = `event-documents-${dateSuffix}.pdf`
        break
      }

      default:
        return NextResponse.json(
          {
            error:
              'Invalid document type. Use: summary, grocery, foh, prep, execution, checklist, packing, reset, travel, shots, or all',
          },
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
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 })
  }
}
