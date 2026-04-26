'use client'

import type {
  BrowserAiAdapter,
  BrowserAiCapability,
  BrowserAiGenerateOptions,
  BrowserAiPreferences,
  BrowserAiResult,
  BrowserAiProvider,
  BrowserAiStatus,
} from './types'
import { BROWSER_AI_PREFS_KEY } from './types'
import { detectBrowserAi } from './detect'
import { ChromeAiAdapter } from './chrome-ai-adapter'
import { WebLlmAdapter } from './webllm-adapter'
import { OllamaAdapter } from './ollama-adapter'
import { validateInputClient } from './guardrails-client'

/**
 * BrowserAiEngine - orchestrates detection, adapter selection, and inference.
 * Singleton per page. Detects once, caches capability, lazy-loads adapters.
 */
export class BrowserAiEngine {
  private capability: BrowserAiCapability | null = null
  private adapter: BrowserAiAdapter | null = null
  private status: BrowserAiStatus = 'detecting'
  private statusListeners: Set<(status: BrowserAiStatus) => void> = new Set()

  // Stats tracking
  private totalInferences = 0
  private totalTokens = 0
  private totalLatencyMs = 0

  private setStatus(s: BrowserAiStatus) {
    this.status = s
    for (const listener of this.statusListeners) listener(s)
  }

  onStatusChange(fn: (status: BrowserAiStatus) => void): () => void {
    this.statusListeners.add(fn)
    return () => this.statusListeners.delete(fn)
  }

  getStatus(): BrowserAiStatus {
    return this.status
  }
  getCapability(): BrowserAiCapability | null {
    return this.capability
  }
  getStats() {
    return {
      totalInferences: this.totalInferences,
      totalTokens: this.totalTokens,
      avgLatencyMs:
        this.totalInferences > 0 ? Math.round(this.totalLatencyMs / this.totalInferences) : 0,
    }
  }

  /**
   * Detect browser capabilities and select the best provider.
   * Safe to call multiple times - caches result.
   */
  async detect(): Promise<BrowserAiCapability> {
    if (this.capability) return this.capability
    this.setStatus('detecting')
    this.capability = await detectBrowserAi()
    if (this.capability.bestProvider === 'none') {
      this.setStatus('unavailable')
    }
    return this.capability
  }

  /**
   * Load the best available adapter. Must call detect() first.
   */
  async load(onProgress?: (progress: number, status: string) => void): Promise<BrowserAiProvider> {
    if (!this.capability) await this.detect()
    const cap = this.capability!

    // Check user preference
    const prefs = this.getPreferences()
    if (prefs.preferredProvider === 'server') {
      this.setStatus('unavailable')
      return 'none'
    }

    if (cap.bestProvider === 'chrome_ai') {
      this.setStatus('loading')
      const adapter = new ChromeAiAdapter()
      if (await adapter.isAvailable()) {
        await adapter.load()
        this.adapter = adapter
        this.setStatus('ready')
        return 'chrome_ai'
      }
    }

    if ((cap.bestProvider === 'webllm' || cap.webGpu.canRunWebLlm) && prefs.allowModelDownload) {
      this.setStatus('loading')
      const adapter = new WebLlmAdapter(prefs.webllmModelId ?? undefined)
      if (await adapter.isAvailable()) {
        await (adapter as WebLlmAdapter).load(onProgress)
        this.adapter = adapter
        this.setStatus('ready')
        return 'webllm'
      }
    }

    // Try local Ollama
    const prefs2 = this.getPreferences()
    if (prefs2.ollamaUrl) {
      this.setStatus('loading')
      const adapter = new OllamaAdapter(prefs2.ollamaUrl, prefs2.ollamaModel ?? undefined)
      if (await adapter.isAvailable()) {
        await adapter.load()
        this.adapter = adapter
        this.setStatus('ready')
        return 'ollama'
      }
    }

    this.setStatus('unavailable')
    return 'none'
  }

  /**
   * Generate a response using the loaded adapter.
   * Returns null if no adapter is loaded (caller should fall back to server).
   */
  async generate(options: BrowserAiGenerateOptions): Promise<BrowserAiResult | null> {
    if (!this.adapter || this.status !== 'ready') return null

    // Client-side guardrails pre-check
    const guard = validateInputClient(options.userMessage)
    if (!guard.allowed) {
      return {
        text:
          guard.reason === 'dangerous'
            ? "I can't help with that. Let's talk about food and business instead."
            : guard.reason === 'injection'
              ? "Nice try! I'm Remy, your food business helper. What can I actually help with?"
              : 'Could you rephrase that?',
        provider: this.adapter.provider,
        latencyMs: 0,
        tokensGenerated: 0,
      }
    }

    this.setStatus('generating')
    try {
      const result = await this.adapter.generate(options)
      this.totalInferences++
      this.totalTokens += result.tokensGenerated
      this.totalLatencyMs += result.latencyMs
      this.setStatus('ready')
      return result
    } catch (err) {
      console.error('[browser-ai] Generation failed:', err)
      this.setStatus('error')
      return null // signal caller to fall back to server
    }
  }

  /**
   * Check if browser AI is ready for inference.
   */
  isReady(): boolean {
    return this.status === 'ready' && this.adapter !== null
  }

  /**
   * Get user preferences from localStorage.
   */
  getPreferences(): BrowserAiPreferences {
    const defaults: BrowserAiPreferences = {
      preferredProvider: 'auto',
      webllmModelId: null,
      allowModelDownload: false,
      ollamaUrl: null,
      ollamaModel: null,
      lastDetection: null,
    }
    try {
      const raw = localStorage.getItem(BROWSER_AI_PREFS_KEY)
      if (!raw) return defaults
      return { ...defaults, ...JSON.parse(raw) }
    } catch {
      return defaults
    }
  }

  /**
   * Save user preferences to localStorage.
   */
  setPreferences(prefs: Partial<BrowserAiPreferences>): void {
    try {
      const current = this.getPreferences()
      const merged = { ...current, ...prefs }
      localStorage.setItem(BROWSER_AI_PREFS_KEY, JSON.stringify(merged))
    } catch {
      // localStorage unavailable
    }
  }

  /**
   * Tear down adapter and free resources.
   */
  destroy(): void {
    this.adapter?.unload()
    this.adapter = null
    this.setStatus('detecting')
    this.statusListeners.clear()
  }
}

// Singleton for the page
let _instance: BrowserAiEngine | null = null

export function getBrowserAiEngine(): BrowserAiEngine {
  if (!_instance) _instance = new BrowserAiEngine()
  return _instance
}
