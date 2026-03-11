import {
  buildDeterministicEnhancedDocumentImage,
  canDeterministicallyEnhanceDocumentImage,
} from '@/lib/documents/image-enhancement'

export type BusinessDocumentDownloadRecord = {
  title: string
  originalFilename: string | null
  mimeType: string | null
}

function buildDownloadName(title: string, originalFilename: string | null): string {
  const preferred = (originalFilename ?? '').trim()
  if (preferred) return preferred.replace(/"/g, '')
  return `${title.replace(/[^\w.\- ]+/g, '').trim() || 'document'}.bin`
}

function buildEnhancedDownloadName(title: string, originalFilename: string | null): string {
  const preferred = (originalFilename ?? '').trim()
  const fallback = title.replace(/[^\w.\- ]+/g, '').trim() || 'document'
  const baseName = (preferred || fallback).replace(/\.[^.]+$/, '').replace(/"/g, '')
  return `${baseName || 'document'}-enhanced.png`
}

export async function buildBusinessDocumentDownloadResponse(options: {
  searchParams: URLSearchParams
  record: BusinessDocumentDownloadRecord
  fileBlob: Blob
}): Promise<Response> {
  const { searchParams, record, fileBlob } = options
  const variant = searchParams.get('variant')
  const disposition = searchParams.get('download') === '1' ? 'attachment' : 'inline'

  if (variant === 'enhanced' && canDeterministicallyEnhanceDocumentImage(record.mimeType)) {
    try {
      const sourceBuffer = Buffer.from(await fileBlob.arrayBuffer())
      const enhanced = await buildDeterministicEnhancedDocumentImage(sourceBuffer)
      return new Response(enhanced.buffer, {
        status: 200,
        headers: {
          'Content-Type': enhanced.contentType,
          'Content-Disposition': `${disposition}; filename="${buildEnhancedDownloadName(record.title, record.originalFilename)}"`,
          'Cache-Control': 'private, no-store, max-age=0',
          'X-ChefFlow-Document-Variant': 'enhanced',
          'X-ChefFlow-Enhancement-Mode': 'deterministic-upscale',
          'X-ChefFlow-Source-Preserved': 'true',
        },
      })
    } catch (enhancementError) {
      console.error(
        '[business-document-download-response] deterministic enhancement failed',
        enhancementError
      )
    }
  }

  return new Response(fileBlob, {
    status: 200,
    headers: {
      'Content-Type': record.mimeType || 'application/octet-stream',
      'Content-Disposition': `${disposition}; filename="${buildDownloadName(record.title, record.originalFilename)}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-ChefFlow-Document-Variant': 'original',
      'X-ChefFlow-Source-Preserved': 'true',
    },
  })
}
