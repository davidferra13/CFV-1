'use client'

import type { BrowserAiAdapter, BrowserAiGenerateOptions, BrowserAiResult } from './types'

export class WebLlmAdapter implements BrowserAiAdapter {
  readonly provider = 'webllm' as const
  private modelId: string
  private engine: any = null

  constructor(modelId?: string) {
    this.modelId = modelId ?? 'Llama-3.1-8B-Instruct-q4f16_1-MLC'
  }

  async isAvailable(): Promise<boolean> {
    if (typeof navigator === 'undefined') return false
    return 'gpu' in navigator
  }

  async load(onProgress?: (progress: number, status: string) => void): Promise<void> {
    try {
      const webllm = await import('@anthropic-ai/web-llm' as string).catch(() => null)
      if (!webllm) {
        throw new Error('WebLLM module not available')
      }
      this.engine = await webllm.CreateMLCEngine(this.modelId, {
        initProgressCallback: (report: { progress: number; text: string }) => {
          onProgress?.(report.progress, report.text)
        },
      })
    } catch (err) {
      console.error('[webllm-adapter] Failed to load:', err)
      throw err
    }
  }

  async generate(options: BrowserAiGenerateOptions): Promise<BrowserAiResult> {
    if (!this.engine) throw new Error('WebLlmAdapter not loaded')
    const start = performance.now()
    const reply = await this.engine.chat.completions.create({
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userMessage },
      ],
      max_tokens: options.maxTokens ?? 512,
      temperature: options.temperature ?? 0.7,
    })
    const text = reply.choices?.[0]?.message?.content ?? ''
    const tokensGenerated = reply.usage?.completion_tokens ?? 0
    const latencyMs = Math.round(performance.now() - start)
    return { text, provider: this.provider, latencyMs, tokensGenerated }
  }

  unload(): void {
    if (this.engine?.unload) this.engine.unload()
    this.engine = null
  }
}
