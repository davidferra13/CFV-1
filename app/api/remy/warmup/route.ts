// Remy Classifier Warmup — Pings qwen3:4b to keep it loaded in VRAM
// Called when the Remy drawer opens so the classifier is warm for the first query.
// Uses keep_alive: '30m' to prevent Ollama from evicting the model between queries.

import { NextResponse } from 'next/server'
import { getOllamaConfig, getOllamaModel } from '@/lib/ai/providers'

export async function POST() {
  const baseUrl = getOllamaConfig().baseUrl
  const model = getOllamaModel('fast') // qwen3:4b

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
    return NextResponse.json(
      { warm: false, error: err instanceof Error ? err.message : 'Warmup failed' },
      { status: 502 }
    )
  }
}
