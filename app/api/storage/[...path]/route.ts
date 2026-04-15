import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { verifySignedToken, getContentType, getStorageRoot } from '@/lib/storage'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const segments = (await params).path
  if (!segments || segments.length < 2) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  // Sanitize path segments BEFORE token verification (defense-in-depth)
  for (const seg of segments) {
    if (seg === '..' || seg === '.' || seg.includes('\\') || seg.includes('/')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }
  }

  // Normalize bucket through basename to prevent encoding-based traversal
  const bucket = path.basename(segments[0])
  const filePath = segments.slice(1).join('/')

  // Validate signed token
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 })
  }

  if (!verifySignedToken(bucket, filePath, token)) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 })
  }

  try {
    const fullPath = path.join(getStorageRoot(), bucket, ...segments.slice(1))
    const data = await fs.readFile(fullPath)
    const contentType = getContentType(filePath)

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
        'Content-Length': String(data.length),
      },
    })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
