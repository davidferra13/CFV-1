'use client'

import type { BrowserAiCapability } from './types'

export async function detectBrowserAi(): Promise<BrowserAiCapability> {
  const chromeAiAvailable =
    typeof window !== 'undefined' &&
    'ai' in window &&
    typeof (window as any).ai?.languageModel?.create === 'function'

  let webGpuAvailable = false
  let adapterName: string | null = null
  let maxBufferSize = 0
  let canRunWebLlm = false

  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter()
      if (adapter) {
        webGpuAvailable = true
        adapterName = adapter.name ?? null
        maxBufferSize = adapter.limits?.maxBufferSize ?? 0
        canRunWebLlm = maxBufferSize >= 1_000_000_000
      }
    } catch {
      // WebGPU not available
    }
  }

  let bestProvider: BrowserAiCapability['bestProvider'] = 'none'
  let deviceTier: BrowserAiCapability['deviceTier'] = 'low'

  if (chromeAiAvailable) {
    bestProvider = 'chrome_ai'
    deviceTier = 'balanced'
  } else if (canRunWebLlm) {
    bestProvider = 'webllm'
    deviceTier = maxBufferSize >= 4_000_000_000 ? 'high' : 'balanced'
  }

  return {
    chromeAi: { available: chromeAiAvailable },
    webGpu: { available: webGpuAvailable, adapterName, maxBufferSize, canRunWebLlm },
    bestProvider,
    deviceTier,
  }
}
