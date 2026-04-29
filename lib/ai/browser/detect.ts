import type { BrowserAiCapability } from './types'

export async function detectBrowserAi(): Promise<BrowserAiCapability> {
  return {
    chromeAi: { available: false },
    webGpu: { available: false, adapterName: null, maxBufferSize: 0, canRunWebLlm: false },
    bestProvider: 'none',
    deviceTier: 'low',
  }
}
