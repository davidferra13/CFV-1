'use client'

import { useState, useTransition, useRef } from 'react'
import {
  parseVendorPriceList,
  confirmVendorImport,
  type ParsedVendorItem,
  type VendorType,
  type PricingTier,
} from '@/lib/openclaw/vendor-import-actions'

const VENDOR_TYPES: { value: VendorType; label: string }[] = [
  { value: 'farm', label: 'Farm' },
  { value: 'fish_market', label: 'Fish Market' },
  { value: 'butcher', label: 'Butcher' },
  { value: 'specialty', label: 'Specialty Supplier' },
  { value: 'wholesale', label: 'Wholesale Distributor' },
]

const PRICING_TIERS: { value: PricingTier; label: string }[] = [
  { value: 'retail', label: 'Retail' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'farm_direct', label: 'Farm Direct' },
]

type Phase = 'idle' | 'parsing' | 'results' | 'confirming' | 'done'

export function VendorImportTab() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [vendorName, setVendorName] = useState('')
  const [vendorType, setVendorType] = useState<VendorType>('specialty')
  const [pricingTier, setPricingTier] = useState<PricingTier>('retail')
  const [items, setItems] = useState<ParsedVendorItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ parsed: 0, matched: 0, unmatched: 0 })
  const [importResult, setImportResult] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  function handleParse() {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setError('Please select a PDF file')
      return
    }
    if (!vendorName.trim()) {
      setError('Please enter a vendor name')
      return
    }

    setError(null)
    setPhase('parsing')

    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('vendor_name', vendorName)
        formData.append('vendor_type', vendorType)
        formData.append('pricing_tier', pricingTier)

        const result = await parseVendorPriceList(formData)
        if (!result.success) {
          setError(result.error || 'Parse failed')
          setPhase('idle')
          return
        }

        setItems(result.items)
        setStats({
          parsed: result.parsed_items,
          matched: result.matched,
          unmatched: result.unmatched,
        })
        setPhase('results')
      } catch {
        setError('Failed to parse price list')
        setPhase('idle')
      }
    })
  }

  function handleConfirm() {
    const matchedItems = items.filter((i) => i.matched && i.canonical_id)
    if (matchedItems.length === 0) {
      setError('No matched items to import')
      return
    }

    setError(null)
    setPhase('confirming')

    const sourceId = vendorName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    startTransition(async () => {
      try {
        const result = await confirmVendorImport({
          vendor_name: vendorName,
          vendor_source_id: sourceId,
          items: matchedItems.map((i) => ({
            canonical_id: i.canonical_id!,
            raw_name: i.raw_name,
            price_cents: i.price_cents,
            unit: i.unit,
          })),
        })

        if (!result.success) {
          setError(result.error || 'Import failed')
          setPhase('results')
          return
        }

        setImportResult(`Successfully imported ${result.imported} prices from ${vendorName}`)
        setPhase('done')
      } catch {
        setError('Failed to confirm import')
        setPhase('results')
      }
    })
  }

  function handleReset() {
    setPhase('idle')
    setVendorName('')
    setItems([])
    setError(null)
    setStats({ parsed: 0, matched: 0, unmatched: 0 })
    setImportResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {phase === 'done' && importResult && (
        <div className="rounded-lg border border-green-800 bg-green-900/20 p-3 text-sm text-green-400">
          {importResult}
          <button onClick={handleReset} className="ml-3 underline">
            Import another
          </button>
        </div>
      )}

      {(phase === 'idle' || phase === 'parsing') && (
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-6 space-y-4">
          <h3 className="font-semibold">Upload Vendor Price List</h3>
          <p className="text-sm text-stone-400">
            Upload a PDF price list from a vendor. The system will extract prices and match them to
            known ingredients.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-stone-400 mb-1">Vendor Name</label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g. Portland Fish Exchange"
                className="w-full rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm"
                disabled={phase === 'parsing'}
              />
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Vendor Type</label>
              <select
                value={vendorType}
                onChange={(e) => setVendorType(e.target.value as VendorType)}
                className="w-full rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm"
                disabled={phase === 'parsing'}
              >
                {VENDOR_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Pricing Tier</label>
              <select
                value={pricingTier}
                onChange={(e) => setPricingTier(e.target.value as PricingTier)}
                className="w-full rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm"
                disabled={phase === 'parsing'}
              >
                {PRICING_TIERS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">PDF File (max 10MB)</label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                className="w-full text-sm text-stone-400 file:mr-3 file:rounded-md file:border-0 file:bg-stone-700 file:px-3 file:py-2 file:text-sm file:text-stone-300"
                disabled={phase === 'parsing'}
              />
            </div>
          </div>

          <button
            onClick={handleParse}
            disabled={phase === 'parsing' || isPending}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {phase === 'parsing' ? 'Processing PDF...' : 'Parse Price List'}
          </button>
        </div>
      )}

      {(phase === 'results' || phase === 'confirming') && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-stone-400">
              Parsed: <span className="text-white font-medium">{stats.parsed}</span>
            </span>
            <span className="text-green-400">
              Matched: <span className="font-medium">{stats.matched}</span>
            </span>
            <span className="text-amber-400">
              Unmatched: <span className="font-medium">{stats.unmatched}</span>
            </span>
          </div>

          <div className="rounded-lg border border-stone-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-800">
                <tr>
                  <th className="text-left px-3 py-2 text-stone-400 font-medium">Raw Name</th>
                  <th className="text-left px-3 py-2 text-stone-400 font-medium">Match</th>
                  <th className="text-right px-3 py-2 text-stone-400 font-medium">Price</th>
                  <th className="text-left px-3 py-2 text-stone-400 font-medium">Unit</th>
                  <th className="text-center px-3 py-2 text-stone-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-700">
                {items.map((item, i) => (
                  <tr key={i} className={item.matched ? '' : 'opacity-60'}>
                    <td className="px-3 py-2">{item.raw_name}</td>
                    <td className="px-3 py-2 text-stone-400">{item.canonical_name || '-'}</td>
                    <td className="px-3 py-2 text-right">${(item.price_cents / 100).toFixed(2)}</td>
                    <td className="px-3 py-2 text-stone-400">{item.unit}</td>
                    <td className="px-3 py-2 text-center">
                      {item.matched ? (
                        <span className="text-green-400 text-xs">Matched</span>
                      ) : (
                        <span className="text-amber-400 text-xs">Unmatched</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={phase === 'confirming' || isPending || stats.matched === 0}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {phase === 'confirming' ? 'Importing...' : `Confirm Import (${stats.matched} items)`}
            </button>
            <button
              onClick={handleReset}
              disabled={phase === 'confirming'}
              className="px-4 py-2 border border-stone-600 rounded-md hover:border-stone-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
