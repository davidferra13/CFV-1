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
import {
  CORE_PACKET_DOCUMENT_TYPES,
  buildSnapshotMetadata,
  getDocumentDefinition,
  parseDocumentRequestQuery,
  validateSnapshotArchiveInsert,
  type OperationalDocumentType,
  type SnapshotDocumentType,
  type SnapshotMetadata,
} from '@/lib/documents/document-definitions'
import {
  markEventDocumentGenerationJobFailed,
  markEventDocumentGenerationJobSucceeded,
  startEventDocumentGenerationJob,
} from '@/lib/documents/generation-jobs-actions'
import { isTransientError, withRetry } from '@/lib/resilience/retry'

const SNAPSHOT_BUCKET = 'event-documents'
const SNAPSHOT_MIN_INTERVAL_MS = 10 * 60 * 1000
const DOCUMENT_GENERATION_MAX_ATTEMPTS = 3

type DocRenderConfig = {
  fetch: () => Promise<any>
  render: (pdf: PDFLayout, data: any) => void
  docTypeLabel: string
  fallbackTitle: string
  filenameBase: string
}

type SnapshotArchiveOutcome =
  | {
      archived: true
      snapshotId: string
      storagePath: string
      versionNumber: number
    }
  | {
      archived: false
      reason:
        | 'duplicate_hash'
        | 'rate_limited'
        | 'upload_failed'
        | 'validation_failed'
        | 'insert_failed'
        | 'unknown_error'
    }

function getDocRenderConfigs(eventId: string): Record<OperationalDocumentType, DocRenderConfig> {
  const summary = getDocumentDefinition('summary')
  const grocery = getDocumentDefinition('grocery')
  const foh = getDocumentDefinition('foh')
  const prep = getDocumentDefinition('prep')
  const execution = getDocumentDefinition('execution')
  const checklist = getDocumentDefinition('checklist')
  const packing = getDocumentDefinition('packing')
  const reset = getDocumentDefinition('reset')
  const travel = getDocumentDefinition('travel')
  const shots = getDocumentDefinition('shots')

  return {
    summary: {
      fetch: () => fetchEventSummaryData(eventId),
      render: renderEventSummary,
      docTypeLabel: summary.docTypeLabel,
      fallbackTitle: summary.fallbackTitle,
      filenameBase: summary.filenameBase,
    },
    grocery: {
      fetch: () => fetchGroceryListData(eventId),
      render: renderGroceryList,
      docTypeLabel: grocery.docTypeLabel,
      fallbackTitle: grocery.fallbackTitle,
      filenameBase: grocery.filenameBase,
    },
    foh: {
      fetch: () => fetchFrontOfHouseMenuData(eventId),
      render: renderFrontOfHouseMenu,
      docTypeLabel: foh.docTypeLabel,
      fallbackTitle: foh.fallbackTitle,
      filenameBase: foh.filenameBase,
    },
    prep: {
      fetch: () => fetchPrepSheetData(eventId),
      render: renderPrepSheet,
      docTypeLabel: prep.docTypeLabel,
      fallbackTitle: prep.fallbackTitle,
      filenameBase: prep.filenameBase,
    },
    execution: {
      fetch: () => fetchExecutionSheetData(eventId),
      render: renderExecutionSheet,
      docTypeLabel: execution.docTypeLabel,
      fallbackTitle: execution.fallbackTitle,
      filenameBase: execution.filenameBase,
    },
    checklist: {
      fetch: () => fetchChecklistData(eventId),
      render: renderChecklist,
      docTypeLabel: checklist.docTypeLabel,
      fallbackTitle: checklist.fallbackTitle,
      filenameBase: checklist.filenameBase,
    },
    packing: {
      fetch: () => fetchPackingListData(eventId),
      render: renderPackingList,
      docTypeLabel: packing.docTypeLabel,
      fallbackTitle: packing.fallbackTitle,
      filenameBase: packing.filenameBase,
    },
    reset: {
      fetch: () => fetchResetChecklistData(eventId),
      render: renderResetChecklist,
      docTypeLabel: reset.docTypeLabel,
      fallbackTitle: reset.fallbackTitle,
      filenameBase: reset.filenameBase,
    },
    travel: {
      fetch: () => fetchTravelRouteData(eventId),
      render: renderTravelRoute,
      docTypeLabel: travel.docTypeLabel,
      fallbackTitle: travel.fallbackTitle,
      filenameBase: travel.filenameBase,
    },
    shots: {
      fetch: () => fetchContentShotListData(eventId),
      render: renderContentShotList,
      docTypeLabel: shots.docTypeLabel,
      fallbackTitle: shots.fallbackTitle,
      filenameBase: shots.filenameBase,
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
  documentType: SnapshotDocumentType
  filename: string
  pdfBuffer: Buffer
  metadata: SnapshotMetadata
}): Promise<SnapshotArchiveOutcome> {
  const { supabase, tenantId, userId, eventId, documentType, filename, pdfBuffer, metadata } =
    params

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

    if (latest?.content_hash === contentHash) {
      return { archived: false, reason: 'duplicate_hash' }
    }

    const latestGeneratedAt = latest?.generated_at ? Date.parse(latest.generated_at) : NaN
    if (
      Number.isFinite(latestGeneratedAt) &&
      Date.now() - latestGeneratedAt < SNAPSHOT_MIN_INTERVAL_MS
    ) {
      return { archived: false, reason: 'rate_limited' }
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
      return { archived: false, reason: 'upload_failed' }
    }

    const recordValidation = validateSnapshotArchiveInsert({
      tenantId,
      eventId,
      documentType,
      versionNumber: nextVersion,
      filename,
      storagePath,
      contentHash,
      sizeBytes: pdfBuffer.length,
      generatedBy: userId,
      metadata,
    })
    if (!recordValidation.success) {
      await supabase.storage.from(SNAPSHOT_BUCKET).remove([storagePath])
      console.error('[documents/route] snapshot insert validation failed:', recordValidation.error)
      return { archived: false, reason: 'validation_failed' }
    }

    const { data: insertedSnapshot, error: insertError } = await supabase
      .from('event_document_snapshots')
      .insert({
        tenant_id: tenantId,
        event_id: eventId,
        document_type: documentType,
        version_number: nextVersion,
        filename,
        storage_path: storagePath,
        content_hash: contentHash,
        size_bytes: pdfBuffer.length,
        generated_by: userId,
        metadata,
      })
      .select('id')
      .single()

    if (insertError) {
      await supabase.storage.from(SNAPSHOT_BUCKET).remove([storagePath])
      console.error('[documents/route] snapshot insert failed:', insertError)
      return { archived: false, reason: 'insert_failed' }
    }

    return {
      archived: true,
      snapshotId: insertedSnapshot.id as string,
      storagePath,
      versionNumber: nextVersion,
    }
  } catch (error) {
    console.error('[documents/route] snapshot archive failed:', error)
    return { archived: false, reason: 'unknown_error' }
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

    const parsedRequest = parseDocumentRequestQuery(request.nextUrl.searchParams)
    if (!parsedRequest.success) {
      return NextResponse.json(
        { error: parsedRequest.error, details: parsedRequest.details },
        { status: 400 }
      )
    }

    const { requestedType, selectedTypes, archiveRequested, idempotencyKey } = parsedRequest.value
    const { generatedBy, customFooter } = await getDocumentContext()
    const dateSuffix = format(new Date(), 'yyyy-MM-dd')
    const docConfigs = getDocRenderConfigs(eventId)
    const generationJob = await startEventDocumentGenerationJob({
      supabase,
      tenantId: user.tenantId!,
      eventId,
      requestedType,
      selectedTypes,
      archiveRequested,
      idempotencyKey,
      maxAttempts: DOCUMENT_GENERATION_MAX_ATTEMPTS,
    })
    const shouldUpdateJobOutcome =
      !!generationJob?.jobId && !(generationJob.reused && generationJob.status === 'succeeded')
    const maxAttempts = generationJob?.maxAttempts ?? DOCUMENT_GENERATION_MAX_ATTEMPTS
    let attemptsUsed = 0

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

    let generationResult: {
      pdfBuffer: Buffer
      filename: string
      archiveType: SnapshotDocumentType
      snapshotMetadata: SnapshotMetadata
      archiveOutcome: SnapshotArchiveOutcome | null
    }

    try {
      generationResult = await withRetry(
        async () => {
          attemptsUsed += 1
          let pdfBuffer: Buffer
          let filename: string
          let archiveType: SnapshotDocumentType = requestedType === 'pack' ? 'all' : requestedType

          if (requestedType in docConfigs) {
            const operationalType = requestedType as OperationalDocumentType
            const config = docConfigs[operationalType]
            pdfBuffer = await renderSingle(config)
            filename = `${config.filenameBase}-${dateSuffix}.pdf`
            archiveType = operationalType
          } else if (requestedType === 'all') {
            pdfBuffer = await renderCombined(CORE_PACKET_DOCUMENT_TYPES)
            filename = `event-documents-${dateSuffix}.pdf`
            archiveType = 'all'
          } else if (requestedType === 'pack') {
            const packTypes = selectedTypes.length > 0 ? selectedTypes : CORE_PACKET_DOCUMENT_TYPES
            pdfBuffer = await renderCombined(packTypes)
            filename = `event-pack-${dateSuffix}.pdf`
            archiveType = packTypes.length === 1 ? packTypes[0] : 'all'
          } else {
            throw new Error('Invalid document request configuration.')
          }

          const snapshotMetadata = buildSnapshotMetadata({
            requestedType,
            selectedTypes,
            archiveRequested,
          })

          let archiveOutcome: SnapshotArchiveOutcome | null = null
          if (archiveRequested) {
            archiveOutcome = await archiveGeneratedDocument({
              supabase,
              tenantId: user.tenantId!,
              userId: user.id,
              eventId,
              documentType: archiveType,
              filename,
              pdfBuffer,
              metadata: snapshotMetadata,
            })
          }

          return {
            pdfBuffer,
            filename,
            archiveType,
            snapshotMetadata,
            archiveOutcome,
          }
        },
        {
          maxAttempts,
          retryOn: isTransientError,
        }
      )
    } catch (error) {
      if (generationJob?.jobId && shouldUpdateJobOutcome) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown document generation failure'
        await markEventDocumentGenerationJobFailed({
          supabase,
          tenantId: user.tenantId!,
          jobId: generationJob.jobId,
          attempts: Math.max(attemptsUsed, 1),
          errorMessage,
          metadata: {
            request: {
              requestedType,
              selectedTypes,
              archiveRequested,
              idempotencyKey,
            },
            retry: {
              attemptsUsed,
              maxAttempts,
              retryable: isTransientError(error),
              reusedJob: generationJob.reused,
            },
          },
        })
      }
      throw error
    }

    if (generationJob?.jobId && shouldUpdateJobOutcome) {
      await markEventDocumentGenerationJobSucceeded({
        supabase,
        tenantId: user.tenantId!,
        jobId: generationJob.jobId,
        attempts: attemptsUsed,
        filename: generationResult.filename,
        documentType: generationResult.archiveType,
        sizeBytes: generationResult.pdfBuffer.length,
        metadata: {
          request: {
            requestedType,
            selectedTypes,
            archiveRequested,
            idempotencyKey,
          },
          retry: {
            attemptsUsed,
            maxAttempts,
            reusedJob: generationJob.reused,
          },
          archive:
            generationResult.archiveOutcome ??
            ({
              archived: false,
              reason: 'not_requested',
            } as const),
          snapshot: generationResult.snapshotMetadata,
        },
      })
    }

    const bytes = new Uint8Array(generationResult.pdfBuffer)
    const headers: Record<string, string> = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${generationResult.filename}"`,
      'Cache-Control': 'no-store',
    }
    if (generationJob?.jobId) {
      headers['X-Document-Generation-Job-Id'] = generationJob.jobId
      headers['X-Document-Generation-Job-Reused'] = generationJob.reused ? '1' : '0'
    }

    return new NextResponse(bytes, {
      status: 200,
      headers,
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
