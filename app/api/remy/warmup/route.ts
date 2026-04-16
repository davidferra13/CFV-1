// Remy Model Warmup - Pings qwen3-coder:30b to keep it loaded in memory.
// Called when the Remy drawer opens so the model is warm for the first query.
// Uses keep_alive: '30m' to prevent Ollama from evicting the model between queries.
// NOTE: Classifier was moved to 'standard' tier (same model as streaming),
// so we warm the standard model - not the fast (4b) model.

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
  const model = getOllamaModel('standard') // qwen3-coder:30b - same model used by classifier + streamer

  try {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: '/no_think\nOK',
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
