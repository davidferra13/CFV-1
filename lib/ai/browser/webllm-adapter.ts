import type {
  BrowserAiAdapter,
  BrowserAiGenerateOptions,
  BrowserAiProvider,
  BrowserAiResult,
} from './types'

export class WebLlmAdapter implements BrowserAiAdapter {
  readonly provider: BrowserAiProvider = 'webllm'

  constructor(_modelId?: string) {}

  async isAvailable(): Promise<boolean> {
    return false
  }

  async load(_onProgress?: (progress: number, status: string) => void): Promise<void> {}

  async generate(_options: BrowserAiGenerateOptions): Promise<BrowserAiResult> {
    throw new Error('WebLLM is not available')
  }

  unload(): void {}
}
