'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import {
  queueVendorCatalogRows,
  type QueueVendorCatalogResult,
} from '@/lib/vendors/catalog-import-actions'

type ParsedCsv = {
  headers: string[]
  rows: string[][]
}

function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = []
  let row: string[] = []
  let current = ''
  let inQuotes = false

  const pushCell = () => {
    row.push(current.trim())
    current = ''
  }

  const pushRow = () => {
    const hasValue = row.some((cell) => cell.length > 0)
    if (hasValue) rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]

    if (char === '"') {
      const next = text[i + 1]
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && char === ',') {
      pushCell()
      continue
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      pushCell()
      pushRow()
      continue
    }

    current += char
  }

  if (current.length > 0 || row.length > 0) {
    pushCell()
    pushRow()
  }

  const headers = rows[0] ?? []
  const dataRows = rows.slice(1)

  return { headers, rows: dataRows }
}

function detectColumn(headers: string[], keywords: string[]): string {
  const match = headers.findIndex((h) => {
    const lower = h.toLowerCase()
    return keywords.some((k) => lower.includes(k))
  })
  return match >= 0 ? String(match) : ''
}

function parseNumberish(value: string): number | null {
  if (!value) return null
  const normalized = value.replace(/[$,]/g, '').trim()
  if (!normalized) return null
  const num = Number(normalized)
  if (!Number.isFinite(num)) return null
  return num
}

export function VendorCatalogImport({ vendorId }: { vendorId: string }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [result, setResult] = useState<QueueVendorCatalogResult | null>(null)
  const [sourceFilename, setSourceFilename] = useState<string | null>(null)

  const [itemNameCol, setItemNameCol] = useState('')
  const [skuCol, setSkuCol] = useState('')
  const [priceCol, setPriceCol] = useState('')
  const [unitSizeCol, setUnitSizeCol] = useState('')
  const [unitMeasureCol, setUnitMeasureCol] = useState('')
  const [notesCol, setNotesCol] = useState('')

  const [priceFormat, setPriceFormat] = useState<'dollars' | 'cents'>('dollars')

  const columnOptions = useMemo(
    () => headers.map((h, i) => ({ value: String(i), label: `${i + 1}: ${h}` })),
    [headers]
  )

  const previewRows = rows.slice(0, 5)

  const clearParsed = () => {
    setHeaders([])
    setRows([])
    setSourceFilename(null)
    setItemNameCol('')
    setSkuCol('')
    setPriceCol('')
    setUnitSizeCol('')
    setUnitMeasureCol('')
    setNotesCol('')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setResult(null)

    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = String(event.target?.result ?? '')
      const parsed = parseCsv(text)

      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setError('CSV must include a header row and at least one data row.')
        clearParsed()
        return
      }

      setHeaders(parsed.headers)
      setRows(parsed.rows)
      setSourceFilename(file.name)

      setItemNameCol(detectColumn(parsed.headers, ['item', 'name', 'product', 'description']))
      setSkuCol(detectColumn(parsed.headers, ['sku', 'item code', 'upc', 'plu']))
      setPriceCol(detectColumn(parsed.headers, ['price', 'cost', 'unit price', 'unit_price']))
      setUnitSizeCol(detectColumn(parsed.headers, ['size', 'pack', 'quantity size']))
      setUnitMeasureCol(detectColumn(parsed.headers, ['unit', 'uom', 'measure']))
      setNotesCol(detectColumn(parsed.headers, ['note', 'comment', 'memo']))
    }

    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!itemNameCol || !priceCol) {
      setError('Map both Item Name and Unit Price columns before importing.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const itemNameIdx = Number(itemNameCol)
      const skuIdx = skuCol ? Number(skuCol) : -1
      const priceIdx = Number(priceCol)
      const unitSizeIdx = unitSizeCol ? Number(unitSizeCol) : -1
      const unitMeasureIdx = unitMeasureCol ? Number(unitMeasureCol) : -1
      const notesIdx = notesCol ? Number(notesCol) : -1

      const preparedRows = rows
        .map((row, rowIndex) => {
          const itemName = (row[itemNameIdx] ?? '').trim()
          const rawPrice = row[priceIdx] ?? ''
          const parsedPrice = parseNumberish(rawPrice)
          const parsedUnitSize = unitSizeIdx >= 0 ? parseNumberish(row[unitSizeIdx] ?? '') : null

          if (!itemName || parsedPrice == null) return null

          const unitPriceCents =
            priceFormat === 'dollars' ? Math.round(parsedPrice * 100) : Math.round(parsedPrice)

          if (!Number.isFinite(unitPriceCents) || unitPriceCents < 0) return null

          return {
            vendor_item_name: itemName,
            vendor_sku: skuIdx >= 0 ? (row[skuIdx] ?? '').trim() || null : null,
            unit_price_cents: unitPriceCents,
            unit_size: parsedUnitSize,
            unit_measure: unitMeasureIdx >= 0 ? (row[unitMeasureIdx] ?? '').trim() || null : null,
            notes: notesIdx >= 0 ? (row[notesIdx] ?? '').trim() || null : null,
            source_row_number: rowIndex + 2,
          }
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row))

      if (preparedRows.length === 0) {
        setError('No valid rows found after parsing. Check your column mapping and values.')
        return
      }

      const importResult = await queueVendorCatalogRows({
        vendor_id: vendorId,
        source_type: 'csv',
        source_filename: sourceFilename,
        auto_apply_high_confidence: true,
        rows: preparedRows,
      })
      setResult(importResult)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import catalog')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Import Supplier Catalog</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-lg border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-300 space-y-1">
            <p>
              Upload complete. Queued: {result.queued} • Auto-applied: {result.autoApplied} • Needs
              review: {result.needsReview}
            </p>
            {result.errors.length > 0 && (
              <div className="text-xs text-amber-300">
                <p>{result.errors.length} row(s) had issues:</p>
                <ul className="list-disc pl-4">
                  {result.errors.slice(0, 5).map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1.5">
            Catalog CSV File
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-stone-800 file:text-stone-300 hover:file:bg-stone-700"
          />
          <p className="text-xs text-stone-500 mt-1">
            Upload vendor catalog pricing as CSV. Supported now: CSV. (XLSX/PDF import comes next.)
          </p>
        </div>

        {headers.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Item Name Column"
                value={itemNameCol}
                onChange={(e) => setItemNameCol(e.target.value)}
                options={columnOptions}
              />
              <Select
                label="SKU Column"
                value={skuCol}
                onChange={(e) => setSkuCol(e.target.value)}
                options={columnOptions}
              />
              <Select
                label="Unit Price Column"
                value={priceCol}
                onChange={(e) => setPriceCol(e.target.value)}
                options={columnOptions}
              />
              <Select
                label="Price Format"
                value={priceFormat}
                onChange={(e) => setPriceFormat(e.target.value as 'dollars' | 'cents')}
                options={[
                  { value: 'dollars', label: 'Values are dollars (12.99)' },
                  { value: 'cents', label: 'Values are cents (1299)' },
                ]}
              />
              <Select
                label="Unit Size Column"
                value={unitSizeCol}
                onChange={(e) => setUnitSizeCol(e.target.value)}
                options={columnOptions}
              />
              <Select
                label="Unit Measure Column"
                value={unitMeasureCol}
                onChange={(e) => setUnitMeasureCol(e.target.value)}
                options={columnOptions}
              />
              <Select
                label="Notes Column"
                value={notesCol}
                onChange={(e) => setNotesCol(e.target.value)}
                options={columnOptions}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">
                Preview (first {previewRows.length} row{previewRows.length === 1 ? '' : 's'})
              </label>
              <div className="overflow-x-auto rounded-lg border border-stone-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-stone-800">
                      {headers.map((h, i) => (
                        <th key={i} className="px-2 py-1.5 text-left text-stone-400 font-medium">
                          {i + 1}: {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri} className="border-t border-stone-800">
                        {headers.map((_, ci) => (
                          <td key={ci} className="px-2 py-1 text-stone-300">
                            {row[ci] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleImport} loading={loading}>
                Upload {rows.length} Row{rows.length === 1 ? '' : 's'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setError(null)
                  setResult(null)
                  clearParsed()
                  if (fileRef.current) fileRef.current.value = ''
                }}
                disabled={loading}
              >
                Clear
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
