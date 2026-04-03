import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OPENCLAW_API_URL = process.env.OPENCLAW_API_URL || 'http://10.0.0.177:8081'
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const IMAGE_CACHE_CONTROL = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'

const OPENCLAW_HOST = (() => {
  try {
    return new URL(OPENCLAW_API_URL).hostname.toLowerCase()
  } catch {
    return null
  }
})()

function isPrivateIpv4(hostname: string): boolean {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!match) return false

  const octets = match.slice(1).map((part) => Number(part))
  if (octets.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return false

  const [first, second] = octets
  if (first === 10 || first === 127) return true
  if (first === 192 && second === 168) return true
  if (first === 172 && second >= 16 && second <= 31) return true
  if (first === 169 && second === 254) return true
  return false
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase()
  return (
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80:')
  )
}

function isAllowedUpstream(url: URL): boolean {
  if (!['http:', 'https:'].includes(url.protocol)) return false
  if (url.username || url.password) return false

  const hostname = url.hostname.toLowerCase()
  if (hostname === OPENCLAW_HOST) return true
  if (hostname === 'localhost' || hostname.endsWith('.local')) return false
  if (isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) return false

  return true
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url')?.trim()
  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  let target: URL
  try {
    target = new URL(rawUrl)
  } catch {
    return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 })
  }

  if (!isAllowedUpstream(target)) {
    return NextResponse.json({ error: 'Disallowed image host' }, { status: 400 })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const upstream = await fetch(target.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      cache: 'force-cache',
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'User-Agent': 'ChefFlow OpenClaw Image Proxy/1.0',
      },
    })

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: 'Upstream image unavailable' }, { status: 404 })
    }

    let finalUrl: URL
    try {
      finalUrl = new URL(upstream.url)
    } catch {
      return NextResponse.json({ error: 'Invalid upstream redirect' }, { status: 502 })
    }

    if (!isAllowedUpstream(finalUrl)) {
      return NextResponse.json({ error: 'Disallowed upstream redirect' }, { status: 400 })
    }

    const contentType = upstream.headers.get('content-type') || ''
    if (!contentType.toLowerCase().startsWith('image/')) {
      return NextResponse.json({ error: 'Upstream response was not an image' }, { status: 415 })
    }

    const contentLength = upstream.headers.get('content-length')
    if (contentLength && Number(contentLength) > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 })
    }

    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Cache-Control', IMAGE_CACHE_CONTROL)
    headers.set('X-Content-Type-Options', 'nosniff')

    const etag = upstream.headers.get('etag')
    if (etag) headers.set('ETag', etag)

    const lastModified = upstream.headers.get('last-modified')
    if (lastModified) headers.set('Last-Modified', lastModified)

    if (contentLength) headers.set('Content-Length', contentLength)

    return new NextResponse(upstream.body, { status: 200, headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.warn(`[openclaw-image-proxy] Failed to fetch ${target.toString()}: ${message}`)
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}
