import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { getContentType, getStorageRoot } from '@/lib/storage'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const segments = (await params).path
  if (!segments || segments.length < 2) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  const bucket = segments[0]
  const filePath = segments.slice(1).join('/')

  // Sanitize path segments
  for (const seg of segments) {
    if (seg === '..' || seg === '.' || seg.includes('\\')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }
  }

  try {
    const fullPath = path.join(getStorageRoot(), bucket, ...segments.slice(1))
    const data = await fs.readFile(fullPath)
    const contentType = getContentType(filePath)

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': String(data.length),
      },
    })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
