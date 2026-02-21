// GET /api/ollama-status
// Returns Ollama availability for dashboard badge polling.
// No auth required — status is non-sensitive metadata only.
// `configured` = true when OLLAMA_BASE_URL is explicitly set in env.
// The badge uses this to suppress itself when Ollama was never set up.

import { checkOllamaHealth } from '@/lib/ai/ollama-health'
import { isOllamaEnabled, getOllamaConfig } from '@/lib/ai/providers'
import { NextResponse } from 'next/server'

export async function GET() {
  const configured = isOllamaEnabled()
  const config = getOllamaConfig()
  const isRemote = !config.baseUrl.includes('localhost') && !config.baseUrl.includes('127.0.0.1')
  const status = await checkOllamaHealth()
  return NextResponse.json(
    { ...status, configured, isRemote },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  )
}
