// API Route: PDF Document Generation
// GET /api/documents/[eventId]?type=summary|...|all|pack&types=summary,prep,...
// Returns PDF with inline disposition for browser viewing/printing
// Auth: requires chef with access to the event

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { format } from 'date-fns'
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
import type { OperationalDocumentType } from '@/lib/documents/template-catalog'

const SNAPSHOT_BUCKET = 'event-documents'
const SNAPSHOT_MIN_INTERVAL_MS = 10 * 60 * 1000

type SnapshotDocType = OperationalDocumentType | 'all'

type DocRenderConfig = {
  fetch: () => Promise<any>
  render: (pdf: PDFLayout, data: any) => void
  docTypeLabel: string
  fallbackTitle: string
  filenameBase: string
}

const ALL_PACKET_TYPES: OperationalDocumentType[] = [
  'summary',
  'grocery',
  'foh',
  'prep',
  'execution',
  'checklist',
  'packing',
  'reset',
]

function isOperationalDocumentType(value: string): value is OperationalDocumentType {
  return [
    'summary',
    'grocery',
    'foh',
    'prep',
    'execution',
    'checklist',
    'packing',
    'reset',
    'travel',
    'shots',
  ].includes(value)
}

function parseOperationalDocTypes(input: string | null): OperationalDocumentType[] {
  if (!input) return []
  const seen = new Set<OperationalDocumentType>()
  const ordered: OperationalDocumentType[] = []

  for (const part of input.split(',')) {
    const normalized = part.trim().toLowerCase()
    if (!normalized || !isOperationalDocumentType(normalized)) continue
    if (seen.has(normalized)) continue
    seen.add(normalized)
    ordered.push(normalized)
  }

  return ordered
}

function getDocRenderConfigs(eventId: string): Record<OperationalDocumentType, DocRenderConfig> {
  return {
    summary: {
      fetch: () => fetchEventSummaryData(eventId),
      render: renderEventSummary,
      docTypeLabel: 'Event Summary',
      fallbackTitle: 'EVENT SUMMARY',
      filenameBase: 'event-summary',
    },
    grocery: {
      fetch: () => fetchGroceryListData(eventId),
      render: renderGroceryList,
      docTypeLabel: 'Grocery List',
      fallbackTitle: 'GROCERY LIST',
      filenameBase: 'grocery-list',
    },
    foh: {
      fetch: () => fetchFrontOfHouseMenuData(eventId),
      render: renderFrontOfHouseMenu,
      docTypeLabel: 'FOH Menu',
      fallbackTitle: 'FRONT-OF-HOUSE MENU',
      filenameBase: 'front-of-house-menu',
    },
    prep: {
      fetch: () => fetchPrepSheetData(eventId),
      render: renderPrepSheet,
      docTypeLabel: 'Prep Sheet',
      fallbackTitle: 'PREP SHEET',
      filenameBase: 'prep-sheet',
    },
    execution: {
      fetch: () => fetchExecutionSheetData(eventId),
      render: renderExecutionSheet,
      docTypeLabel: 'Execution Sheet',
      fallbackTitle: 'EXECUTION SHEET',
      filenameBase: 'execution-sheet',
    },
    checklist: {
      fetch: () => fetchChecklistData(eventId),
      render: renderChecklist,
      docTypeLabel: 'Non-Negotiables',
      fallbackTitle: 'NON-NEGOTIABLES',
      filenameBase: 'checklist',
    },
    packing: {
      fetch: () => fetchPackingListData(eventId),
      render: renderPackingList,
      docTypeLabel: 'Packing List',
      fallbackTitle: 'PACKING LIST',
      filenameBase: 'packing-list',
    },
    reset: {
      fetch: () => fetchResetChecklistData(eventId),
      render: renderResetChecklist,
      docTypeLabel: 'Reset Checklist',
      fallbackTitle: 'POST-SERVICE RESET',
      filenameBase: 'reset-checklist',
    },
    travel: {
      fetch: () => fetchTravelRouteData(eventId),
      render: renderTravelRoute,
      docTypeLabel: 'Travel Route',
      fallbackTitle: 'TRAVEL ROUTE',
      filenameBase: 'travel-route',
    },
    shots: {
      fetch: () => fetchContentShotListData(eventId),
      render: renderContentShotList,
      docTypeLabel: 'Content Shot List',
      fallbackTitle: 'CONTENT SHOT LIST',
      filenameBase: 'content-shot-list',
    },
  }
}

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

async function archiveGeneratedDocument(params: {
  supabase: any
  tenantId: string
  userId: string
  eventId: string
  documentType: SnapshotDocType
  filename: string
  pdfBuffer: Buffer
}) {
  const { supabase, tenantId, userId, eventId, documentType, filename, pdfBuffer } = params

  try {
    const contentHash = createHash('sha256').update(pdfBuffer).digest('hex')
    const { data: latest } = await supabase
      .from('event_document_snapshots')
      .select('version_number, generated_at, content_hash')
      .eq('tenant_id', tenantId)
      .eq('event_id', eventId)
      .eq('document_type', documentType)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latest?.content_hash === contentHash) return

    const latestGeneratedAt = latest?.generated_at ? Date.parse(latest.generated_at) : NaN
    if (
      Number.isFinite(latestGeneratedAt) &&
      Date.now() - latestGeneratedAt < SNAPSHOT_MIN_INTERVAL_MS
    ) {
      return
    }

    const nextVersion = Number(latest?.version_number ?? 0) + 1
    const safeType = documentType.replace(/[^a-z0-9_-]/gi, '-')
    const stamp = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, '')
      .slice(0, 14)
    const storagePath = `${tenantId}/${eventId}/${safeType}/v${String(nextVersion).padStart(4, '0')}-${stamp}.pdf`

    const { error: uploadError } = await supabase.storage
      .from(SNAPSHOT_BUCKET)
      .upload(storagePath, new Uint8Array(pdfBuffer), {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('[documents/route] snapshot upload failed:', uploadError)
      return
    }

    const { error: insertError } = await supabase.from('event_document_snapshots').insert({
      tenant_id: tenantId,
      event_id: eventId,
      document_type: documentType,
      version_number: nextVersion,
      filename,
      storage_path: storagePath,
      content_hash: contentHash,
      size_bytes: pdfBuffer.length,
      generated_by: userId,
      metadata: { source: 'api/documents/[eventId]' },
    })

    if (insertError) {
      await supabase.storage.from(SNAPSHOT_BUCKET).remove([storagePath])
      console.error('[documents/route] snapshot insert failed:', insertError)
    }
  } catch (error) {
    console.error('[documents/route] snapshot archive failed:', error)
  }
}

export async function GET(request: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    const user = await requireChef()
    const { eventId } = params
    if (!eventId || eventId.length < 8) {
      return NextResponse.json({ error: 'Invalid event ID format' }, { status: 400 })
    }

    const supabase: any = createServerClient()
    const { count } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)

    if (!count || count === 0) {
      return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 })
    }

    const { generatedBy, customFooter } = await getDocumentContext()
    const requestedType = request.nextUrl.searchParams.get('type') || 'all'
    const selectedTypes = parseOperationalDocTypes(request.nextUrl.searchParams.get('types'))
    const dateSuffix = format(new Date(), 'yyyy-MM-dd')
    const docConfigs = getDocRenderConfigs(eventId)

    const renderSingle = async (config: DocRenderConfig): Promise<Buffer> => {
      const pdf = new PDFLayout()
      const data = await config.fetch()
      if (data) {
        config.render(pdf, data)
      } else {
        pdf.title(config.fallbackTitle)
        pdf.text('Data not available for this event.', 10, 'italic')
      }
      applyPageMeta(pdf, generatedBy, customFooter, config.docTypeLabel)
      return pdf.toBuffer()
    }

    const renderCombined = async (types: OperationalDocumentType[]): Promise<Buffer> => {
      const pdf = new PDFLayout()
      for (let i = 0; i < types.length; i++) {
        if (i > 0) pdf.newPage()
        const config = docConfigs[types[i]]
        const data = await config.fetch()
        if (data) {
          config.render(pdf, data)
        } else {
          pdf.title(config.fallbackTitle)
          pdf.text('Data not available for this event.', 10, 'italic')
        }
        applyPageMeta(pdf, generatedBy, customFooter, config.docTypeLabel)
      }
      return pdf.toBuffer()
    }

    let pdfBuffer: Buffer
    let filename: string
    let archiveType: SnapshotDocType =
      requestedType === 'pack' ? 'all' : (requestedType as SnapshotDocType)

    if (isOperationalDocumentType(requestedType)) {
      const config = docConfigs[requestedType]
      pdfBuffer = await renderSingle(config)
      filename = `${config.filenameBase}-${dateSuffix}.pdf`
      archiveType = requestedType
    } else if (requestedType === 'all') {
      pdfBuffer = await renderCombined(ALL_PACKET_TYPES)
      filename = `event-documents-${dateSuffix}.pdf`
      archiveType = 'all'
    } else if (requestedType === 'pack') {
      const packTypes = selectedTypes.length > 0 ? selectedTypes : ALL_PACKET_TYPES
      pdfBuffer = await renderCombined(packTypes)
      filename = `event-pack-${dateSuffix}.pdf`
      archiveType = packTypes.length === 1 ? packTypes[0] : 'all'
    } else {
      return NextResponse.json(
        {
          error:
            'Invalid document type. Use: summary, grocery, foh, prep, execution, checklist, packing, reset, travel, shots, all, or pack (with ?types=...)',
        },
        { status: 400 }
      )
    }

    const shouldArchive =
      ['1', 'true', 'yes'].includes(
        (request.nextUrl.searchParams.get('archive') ?? '').toLowerCase()
      ) ||
      requestedType === 'all' ||
      requestedType === 'pack'

    if (shouldArchive) {
      await archiveGeneratedDocument({
        supabase,
        tenantId: user.tenantId!,
        userId: user.id,
        eventId,
        documentType: archiveType,
        filename,
        pdfBuffer,
      })
    }

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
