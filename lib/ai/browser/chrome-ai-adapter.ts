import type {
  BrowserAiAdapter,
  BrowserAiGenerateOptions,
  BrowserAiProvider,
  BrowserAiResult,
} from './types'

export class ChromeAiAdapter implements BrowserAiAdapter {
  readonly provider: BrowserAiProvider = 'chrome_ai'

  async isAvailable(): Promise<boolean> {
    return false
  }

  async load(): Promise<void> {}

  async generate(_options: BrowserAiGenerateOptions): Promise<BrowserAiResult> {
    throw new Error('Chrome AI is not available')
  }

  unload(): void {}
}
