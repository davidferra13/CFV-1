'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createInvoice } from '@/lib/vendors/invoice-actions'

interface Vendor {
  id: string
  name: string
}

interface InvoiceCsvUploadProps {
  vendors: Vendor[]
}

export function InvoiceCsvUpload({ vendors }: InvoiceCsvUploadProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // CSV state
  const [rows, setRows] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])

  // Column mapping
  const [descCol, setDescCol] = useState<string>('')
  const [qtyCol, setQtyCol] = useState<string>('')
  const [priceCol, setPriceCol] = useState<string>('')

  // Invoice meta
  const [vendorId, setVendorId] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(
    ((_icu) =>
      `${_icu.getFullYear()}-${String(_icu.getMonth() + 1).padStart(2, '0')}-${String(_icu.getDate()).padStart(2, '0')}`)(
      new Date()
    )
  )
  const [invoiceNumber, setInvoiceNumber] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setSuccess(false)
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text
        .split('\n')
        .map((line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')))
        .filter((line) => line.some((cell) => cell.length > 0))

      if (lines.length < 2) {
        setError('CSV must have at least a header row and one data row')
        return
      }

      setHeaders(lines[0])
      setRows(lines.slice(1))
      // Auto-reset column mapping
      setDescCol('')
      setQtyCol('')
      setPriceCol('')
    }
    reader.readAsText(file)
  }

  const columnOptions = headers.map((h, i) => ({
    value: String(i),
    label: `${i + 1}: ${h}`,
  }))

  const previewRows = rows.slice(0, 5)

  const handleImport = async () => {
    if (!vendorId) {
      setError('Please select a vendor')
      return
    }
    if (!descCol && !priceCol) {
      setError('Please map at least description and price columns')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const descIdx = descCol ? parseInt(descCol) : -1
      const qtyIdx = qtyCol ? parseInt(qtyCol) : -1
      const priceIdx = priceCol ? parseInt(priceCol) : -1

      const lineItems = rows
        .map((row) => {
          const description = descIdx >= 0 ? row[descIdx] || '' : ''
          const quantity = qtyIdx >= 0 ? parseFloat(row[qtyIdx]) || 1 : 1
          const unitPriceDollars = priceIdx >= 0 ? parseFloat(row[priceIdx]) || 0 : 0
          const unitPriceCents = Math.round(unitPriceDollars * 100)

          return {
            description,
            quantity,
            unit_price_cents: unitPriceCents,
            total_cents: Math.round(quantity * unitPriceCents),
          }
        })
        .filter((li) => li.description.trim())

      if (lineItems.length === 0) {
        setError('No valid line items found in CSV')
        return
      }

      const totalCents = lineItems.reduce((sum, li) => sum + li.total_cents, 0)

      await createInvoice({
        vendor_id: vendorId,
        invoice_number: invoiceNumber || undefined,
        invoice_date: invoiceDate,
        total_cents: totalCents,
        notes: `Imported from CSV (${lineItems.length} items)`,
        line_items: lineItems,
      })

      setSuccess(true)
      setRows([])
      setHeaders([])
      if (fileRef.current) fileRef.current.value = ''
      router.refresh()
    } catch (err: any) {
      console.error('[InvoiceCsvUpload] error:', err)
      setError(err.message || 'Failed to import CSV')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Import Invoice from CSV</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-950 border border-emerald-800 px-4 py-3 text-sm text-emerald-400">
            Invoice imported successfully.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Vendor"
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            required
            options={vendors.map((v) => ({ value: v.id, label: v.name }))}
          />
          <Input
            label="Invoice #"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="Optional"
          />
          <Input
            label="Invoice Date"
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1.5">CSV File</label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-stone-800 file:text-stone-300 hover:file:bg-stone-700"
          />
        </div>

        {headers.length > 0 && (
          <>
            {/* Preview */}
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">
                Preview (first {previewRows.length} rows)
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
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-2 py-1 text-stone-300">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Column mapping */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Description Column"
                value={descCol}
                onChange={(e) => setDescCol(e.target.value)}
                options={columnOptions}
              />
              <Select
                label="Quantity Column"
                value={qtyCol}
                onChange={(e) => setQtyCol(e.target.value)}
                options={columnOptions}
              />
              <Select
                label="Price Column"
                value={priceCol}
                onChange={(e) => setPriceCol(e.target.value)}
                options={columnOptions}
              />
            </div>

            <Button onClick={handleImport} loading={loading}>
              Import {rows.length} Items
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
