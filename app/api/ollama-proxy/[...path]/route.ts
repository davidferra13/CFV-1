// Ollama Proxy - solves HTTPS mixed content for on-device local AI.
// When ChefFlow runs over HTTPS (Cloudflare tunnel, production),
// the browser cannot fetch http://localhost:11434 directly.
// This route forwards the request to the user's configured Ollama URL
// so the browser only talks HTTPS to ChefFlow.
//
// Supports both phone-local Ollama (Termux) and remote (PC/Pi).
// The user's configured URL is read from ai_preferences.

import { NextRequest, NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { getLocalAiPreferences } from '@/lib/ai/privacy-actions'

const ALLOWED_PATHS = new Set(['api/tags', 'api/chat', 'api/generate', 'api/show'])
const MAX_BODY_SIZE = 512 * 1024 // 512KB - prompt + context is large
const PROXY_TIMEOUT_MS = 120_000 // 2 min for slow phone inference

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, await params, 'GET')
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, await params, 'POST')
}

async function proxyRequest(
  req: NextRequest,
  { path }: { path: string[] },
  method: string
): Promise<Response> {
  try {
    const user = await requireChef()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subPath = path.join('/')

    // Whitelist allowed Ollama API paths
    if (!ALLOWED_PATHS.has(`api/${subPath}`)) {
      return NextResponse.json({ error: 'Path not allowed' }, { status: 403 })
    }

    const prefs = await getLocalAiPreferences()
    if (!prefs.enabled) {
      return NextResponse.json({ error: 'Local AI not enabled' }, { status: 403 })
    }

    // Build target URL - the user's configured Ollama endpoint
    const baseUrl = prefs.url.replace(/\/+$/, '')
    const targetUrl = baseUrl.endsWith('/api')
      ? `${baseUrl}/${subPath}`
      : `${baseUrl}/api/${subPath}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    const fetchOpts: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    }

    if (method === 'POST') {
      const body = await req.text()
      if (body.length > MAX_BODY_SIZE) {
        return NextResponse.json({ error: 'Request too large' }, { status: 413 })
      }
      fetchOpts.body = body
    }

    const upstream = await fetch(targetUrl, fetchOpts)

    // Streaming responses (chat, generate): Ollama streams NDJSON.
    // Pipe the body through directly regardless of transfer-encoding header.
    const isStreamingPath = subPath === 'chat' || subPath === 'generate'
    if (isStreamingPath && upstream.body) {
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-cache',
          'X-Accel-Buffering': 'no',
        },
      })
    }

    // Non-streaming (tags, show): forward JSON
    const data = await upstream.text()
    return new Response(data, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Proxy error'
    if (message.includes('timeout') || message.includes('abort')) {
      return NextResponse.json(
        { error: 'Ollama timeout - model may still be loading' },
        { status: 504 }
      )
    }
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
