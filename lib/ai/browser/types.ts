// No 'use client' - pure types, importable anywhere

export type BrowserAiProvider = 'chrome_ai' | 'webllm' | 'ollama' | 'none'
export type BrowserAiStatus =
  | 'detecting'
  | 'loading'
  | 'ready'
  | 'generating'
  | 'error'
  | 'unavailable'

export interface BrowserAiCapability {
  chromeAi: { available: boolean }
  webGpu: {
    available: boolean
    adapterName: string | null
    maxBufferSize: number
    canRunWebLlm: boolean
  }
  bestProvider: BrowserAiProvider
  deviceTier: 'low' | 'balanced' | 'high'
}

export interface BrowserAiPreferences {
  preferredProvider: 'auto' | 'browser' | 'server'
  webllmModelId: string | null
  allowModelDownload: boolean
  ollamaUrl: string | null
  ollamaModel: string | null
  lastDetection: string | null
}

export interface BrowserAiGenerateOptions {
  systemPrompt: string
  userMessage: string
  maxTokens?: number
  temperature?: number
  onToken?: (token: string) => void // streaming callback
}

export interface BrowserAiResult {
  text: string
  provider: BrowserAiProvider
  latencyMs: number
  tokensGenerated: number
}

export interface BrowserAiAdapter {
  readonly provider: BrowserAiProvider
  isAvailable(): Promise<boolean>
  load(): Promise<void>
  generate(options: BrowserAiGenerateOptions): Promise<BrowserAiResult>
  unload(): void
}

export const BROWSER_AI_PREFS_KEY = 'cf:ai:provider-preference'
export const BROWSER_AI_STATS_KEY = 'cf:ai:inference-stats'
