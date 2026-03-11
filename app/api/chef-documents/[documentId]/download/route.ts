import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getBusinessDocumentRecordForDownload } from '@/lib/documents/file-service'
import { buildBusinessDocumentDownloadResponse } from '@/lib/documents/download-response'

export async function GET(request: NextRequest, { params }: { params: { documentId: string } }) {
  let record
  try {
    record = await getBusinessDocumentRecordForDownload(params.documentId)
  } catch {
    return new Response('Unauthorized', { status: 401 })
  }

  if (!record?.storageBucket || !record.storagePath) {
    return new Response('Document not found', { status: 404 })
  }

  const supabase: any = createServerClient()
  const { data, error } = await supabase.storage
    .from(record.storageBucket)
    .download(record.storagePath)

  if (error || !data) {
    return new Response('Unable to load document', { status: 404 })
  }

  return buildBusinessDocumentDownloadResponse({
    searchParams: request.nextUrl.searchParams,
    record: {
      title: record.title,
      originalFilename: record.originalFilename,
      mimeType: record.mimeType,
    },
    fileBlob: data,
  })
}
