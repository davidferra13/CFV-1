import {
  MockBarcodeScannerAdapter,
  MockCashDrawerAdapter,
  MockReceiptPrinterAdapter,
} from './mock-adapters'
import type { PosHardwareCapabilities, PosHardwareStack } from './types'

function readEnvFlag(value: string | undefined, fallback: boolean) {
  if (value == null) return fallback
  const normalized = value.toLowerCase().trim()
  if (normalized === '1' || normalized === 'true' || normalized === 'yes') return true
  if (normalized === '0' || normalized === 'false' || normalized === 'no') return false
  return fallback
}

export function resolvePosHardwareCapabilities(
  override?: Partial<PosHardwareCapabilities>
): PosHardwareCapabilities {
  const defaults: PosHardwareCapabilities = {
    scannerEnabled: readEnvFlag(process.env.POS_SCANNER_ENABLED, false),
    printerEnabled: readEnvFlag(process.env.POS_PRINTER_ENABLED, false),
    cashDrawerEnabled: readEnvFlag(process.env.POS_CASH_DRAWER_ENABLED, false),
  }

  return {
    scannerEnabled: override?.scannerEnabled ?? defaults.scannerEnabled,
    printerEnabled: override?.printerEnabled ?? defaults.printerEnabled,
    cashDrawerEnabled: override?.cashDrawerEnabled ?? defaults.cashDrawerEnabled,
  }
}

export function getPosHardwareStack(
  capabilities?: Partial<PosHardwareCapabilities>
): PosHardwareStack {
  const resolved = resolvePosHardwareCapabilities(capabilities)

  return {
    capabilities: resolved,
    scanner: new MockBarcodeScannerAdapter(resolved.scannerEnabled),
    printer: new MockReceiptPrinterAdapter(resolved.printerEnabled),
    cashDrawer: new MockCashDrawerAdapter(resolved.cashDrawerEnabled),
  }
}

export type { PosHardwareCapabilities, PosHardwareStack } from './types'
export type { BarcodeScanResult } from './types'

