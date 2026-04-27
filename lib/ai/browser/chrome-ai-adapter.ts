import type {
  BrowserAiAdapter,
  BrowserAiProvider,
  BrowserAiGenerateOptions,
  BrowserAiResult,
} from './types'

export class ChromeAiAdapter implements BrowserAiAdapter {
  readonly provider: BrowserAiProvider = 'chrome_ai'

  async isAvailable(): Promise<boolean> {
    return false
  }

  async load(): Promise<void> {}

  async generate(_options: BrowserAiGenerateOptions): Promise<BrowserAiResult> {
    throw new Error('Chrome AI not available')
  }

  unload(): void {}
}
