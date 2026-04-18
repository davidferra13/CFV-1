// Remy Model Warmup - Pings Gemma 4 to keep it loaded in memory.
// Called when the Remy drawer opens so the model is warm for the first query.
// Uses keep_alive: '30m' to prevent Ollama from evicting the model between queries.

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/get-user'
import { getOllamaConfig, getOllamaModel } from '@/lib/ai/providers'

export async function POST() {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = getOllamaConfig().baseUrl
  const model = getOllamaModel('standard')

  try {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: 'OK',
        stream: false,
        keep_alive: '30m',
        options: { num_predict: 1 },
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      return NextResponse.json({ warm: false, error: `Ollama ${res.status}` }, { status: 502 })
    }

    return NextResponse.json({ warm: true, model })
  } catch (err) {
    return NextResponse.json({ warm: false, error: 'Warmup failed' }, { status: 502 })
  }
}
