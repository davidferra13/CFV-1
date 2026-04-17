import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { getContentType, getStorageRoot } from '@/lib/storage'
import path from 'path'

// K1 fix: Only these buckets are served without authentication.
// Private buckets (receipts, chat-attachments, client-photos, etc.) require signed URLs.
const PUBLIC_BUCKETS = new Set([
  'dish-photos',
  'chef-logos',
  'chef-profile-images',
  'event-photos',
  'guest-photos',
  'menu-photos',
])

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const segments = (await params).path
  if (!segments || segments.length < 2) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  // Sanitize path segments (match private route security level)
  for (const seg of segments) {
    if (
      seg === '..' ||
      seg === '.' ||
      seg.includes('\\') ||
      seg.includes('/') ||
      seg.includes('\0')
    ) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }
  }

  // Normalize bucket through basename to prevent encoding-based traversal
  const bucket = path.basename(segments[0])

  // K1 fix: Reject requests to private buckets via the public route
  if (!PUBLIC_BUCKETS.has(bucket)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const filePath = segments.slice(1).join('/')

  try {
    const fullPath = path.join(getStorageRoot(), bucket, ...segments.slice(1))
    const data = await fs.readFile(fullPath)
    const contentType = getContentType(filePath)

    // SVG and HTML files served from storage must not execute scripts inline.
    // Force download for these types to prevent XSS via uploaded content.
    const FORCE_DOWNLOAD_TYPES = ['image/svg+xml', 'text/html']
    const forceDownload = FORCE_DOWNLOAD_TYPES.includes(contentType)

    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      'Content-Length': String(data.length),
      'X-Content-Type-Options': 'nosniff',
    }
    if (forceDownload) {
      responseHeaders['Content-Disposition'] = 'attachment'
    }

    return new NextResponse(data, { headers: responseHeaders })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
