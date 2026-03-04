import type {
  BarcodeScanResult,
  BarcodeScannerAdapter,
  CashDrawerAdapter,
  ReceiptPrinterAdapter,
} from './types'

export class MockBarcodeScannerAdapter implements BarcodeScannerAdapter {
  constructor(public enabled: boolean) {}

  parseInput(raw: string): BarcodeScanResult | null {
    if (!this.enabled) return null
    const code = raw.trim()
    if (!/^\d{8,14}$/.test(code)) return null

    if (code.length === 12) return { code, symbology: 'upc' }
    if (code.length === 13) return { code, symbology: 'ean' }
    return { code, symbology: 'unknown' }
  }
}

export class MockReceiptPrinterAdapter implements ReceiptPrinterAdapter {
  constructor(public enabled: boolean) {}

  async print(input: { saleId: string; content: string }) {
    if (!this.enabled) {
      return {
        success: false,
        jobId: '',
        error: 'printer_disabled',
      }
    }

    if (!input.saleId || !input.content.trim()) {
      return {
        success: false,
        jobId: '',
        error: 'invalid_print_payload',
      }
    }

    return {
      success: true,
      jobId: `mock_print_${Date.now()}_${input.saleId}`,
    }
  }
}

export class MockCashDrawerAdapter implements CashDrawerAdapter {
  constructor(public enabled: boolean) {}

  async open(input: { reason: string; registerSessionId?: string }) {
    if (!this.enabled) {
      return {
        success: false,
        referenceId: '',
        error: 'cash_drawer_disabled',
      }
    }

    if (!input.reason.trim()) {
      return {
        success: false,
        referenceId: '',
        error: 'reason_required',
      }
    }

    return {
      success: true,
      referenceId: `mock_drawer_${Date.now()}`,
    }
  }
}
