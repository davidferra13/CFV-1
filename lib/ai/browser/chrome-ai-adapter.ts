'use client'

import type { BrowserAiAdapter, BrowserAiGenerateOptions, BrowserAiResult } from './types'

export class ChromeAiAdapter implements BrowserAiAdapter {
  readonly provider = 'chrome_ai' as const
  private session: any = null

  async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') return false
    const ai = (window as any).ai
    return typeof ai?.languageModel?.create === 'function'
  }

  async load(): Promise<void> {
    const ai = (window as any).ai
    this.session = await ai.languageModel.create()
  }

  async generate(options: BrowserAiGenerateOptions): Promise<BrowserAiResult> {
    if (!this.session) throw new Error('ChromeAiAdapter not loaded')
    const start = performance.now()
    const text: string = await this.session.prompt(options.userMessage)
    const latencyMs = Math.round(performance.now() - start)
    return { text, provider: this.provider, latencyMs, tokensGenerated: 0 }
  }

  unload(): void {
    if (this.session?.destroy) this.session.destroy()
    this.session = null
  }
}
