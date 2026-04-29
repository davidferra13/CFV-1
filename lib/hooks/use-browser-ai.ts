'use client'

import type { BrowserAiCapability } from '@/lib/ai/browser/types'

type BrowserAiHookResult = {
  capability: BrowserAiCapability | null
  isDetecting: boolean
  stats: { totalInferences: number; totalTokens: number; avgLatencyMs: number }
}

export function useBrowserAi(): BrowserAiHookResult {
  return {
    capability: null,
    isDetecting: false,
    stats: { totalInferences: 0, totalTokens: 0, avgLatencyMs: 0 },
  }
}
