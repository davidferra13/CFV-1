export type PosHardwareCapabilities = {
  scannerEnabled: boolean
  printerEnabled: boolean
  cashDrawerEnabled: boolean
}

export type BarcodeScanResult = {
  code: string
  symbology: 'upc' | 'ean' | 'code128' | 'unknown'
}

export interface BarcodeScannerAdapter {
  enabled: boolean
  parseInput(raw: string): BarcodeScanResult | null
}

export interface ReceiptPrinterAdapter {
  enabled: boolean
  print(input: { saleId: string; content: string }): Promise<{
    success: boolean
    jobId: string
    error?: string
  }>
}

export interface CashDrawerAdapter {
  enabled: boolean
  open(input: { reason: string; registerSessionId?: string }): Promise<{
    success: boolean
    referenceId: string
    error?: string
  }>
}

export type PosHardwareStack = {
  capabilities: PosHardwareCapabilities
  scanner: BarcodeScannerAdapter
  printer: ReceiptPrinterAdapter
  cashDrawer: CashDrawerAdapter
}

