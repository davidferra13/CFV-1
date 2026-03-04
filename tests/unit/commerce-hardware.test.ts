import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getPosHardwareStack, resolvePosHardwareCapabilities } from '@/lib/commerce/hardware'

describe('commerce hardware abstraction', () => {
  it('resolves explicit capability overrides', () => {
    const capabilities = resolvePosHardwareCapabilities({
      scannerEnabled: true,
      printerEnabled: false,
      cashDrawerEnabled: true,
    })

    assert.equal(capabilities.scannerEnabled, true)
    assert.equal(capabilities.printerEnabled, false)
    assert.equal(capabilities.cashDrawerEnabled, true)
  })

  it('scanner parses numeric UPC/EAN input when enabled', () => {
    const hardware = getPosHardwareStack({
      scannerEnabled: true,
      printerEnabled: false,
      cashDrawerEnabled: false,
    })

    const parsed = hardware.scanner.parseInput('012345678905')
    assert.ok(parsed)
    assert.equal(parsed?.symbology, 'upc')
  })

  it('disabled printer and drawer fail safely', async () => {
    const hardware = getPosHardwareStack({
      scannerEnabled: false,
      printerEnabled: false,
      cashDrawerEnabled: false,
    })

    const printResult = await hardware.printer.print({
      saleId: 'sale_1',
      content: 'receipt',
    })
    assert.equal(printResult.success, false)
    assert.equal(printResult.error, 'printer_disabled')

    const drawerResult = await hardware.cashDrawer.open({
      reason: 'no_sale',
    })
    assert.equal(drawerResult.success, false)
    assert.equal(drawerResult.error, 'cash_drawer_disabled')
  })
})
