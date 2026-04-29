import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const listSource = readFileSync('app/(chef)/inventory/vendor-invoices/page.tsx', 'utf8')
const detailSource = readFileSync('app/(chef)/inventory/vendor-invoices/[id]/page.tsx', 'utf8')

test('vendor invoice list links to an existing detail route', () => {
  assert.match(listSource, /href=\{`\/inventory\/vendor-invoices\/\$\{invoice\.id\}`\}/)
  assert.ok(existsSync('app/(chef)/inventory/vendor-invoices/[id]/page.tsx'))
})

test('vendor invoice detail route is chef-gated and renders the matcher', () => {
  assert.match(detailSource, /await requireChef\(\)/)
  assert.match(detailSource, /await Promise\.all\(\[getVendorInvoices\(\), getIngredients\(\)\]\)/)
  assert.match(
    detailSource,
    /<VendorInvoiceMatcher invoice=\{matcherInvoice\} knownPrices=\{knownPrices\} \/>/
  )
  assert.match(detailSource, /notFound\(\)/)
})

test('vendor invoices page shows load failures instead of empty data', () => {
  assert.match(listSource, /let loadError = false/)
  assert.match(listSource, /console\.error\('\[vendor-invoices\] failed to load invoices'/)
  assert.match(listSource, /Vendor invoices could not be loaded/)
})
