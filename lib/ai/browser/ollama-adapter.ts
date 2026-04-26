'use client'

import type { BrowserAiAdapter, BrowserAiGenerateOptions, BrowserAiResult } from './types'
import { OllamaLocalProvider } from '@/lib/ai/local-ai-provider'

/**
 * Ollama adapter for the BrowserAiEngine.
 * Wraps the existing OllamaLocalProvider to fit the BrowserAiAdapter interface.
 * Connects to a user's local Ollama instance (e.g., http://localhost:11434).
 */
export class OllamaAdapter implements BrowserAiAdapter {
  readonly provider = 'ollama' as const
  private ollamaProvider: OllamaLocalProvider
  private model: string

  constructor(url: string, model?: string) {
    this.ollamaProvider = new OllamaLocalProvider(url)
    this.model = model ?? 'gemma4'
  }

  async isAvailable(): Promise<boolean> {
    return this.ollamaProvider.detect()
  }

  async load(): Promise<void> {
    // Ollama doesn't need a load step - it's always ready if detect() passes
  }

  async generate(options: BrowserAiGenerateOptions): Promise<BrowserAiResult> {
    const start = performance.now()
    let fullText = ''
    let tokenCount = 0

    const messages = [{ role: 'user', content: options.userMessage }]

    await this.ollamaProvider.chat(
      options.systemPrompt,
      messages,
      this.model,
      (token) => {
        fullText += token
        tokenCount++
        if (options.onToken) options.onToken(token)
      },
      { num_predict: options.maxTokens ?? 1024 }
    )

    return {
      text: fullText,
      provider: 'ollama',
      latencyMs: Math.round(performance.now() - start),
      tokensGenerated: tokenCount,
    }
  }

  unload(): void {
    // Nothing to clean up - Ollama is a remote service
  }
}
