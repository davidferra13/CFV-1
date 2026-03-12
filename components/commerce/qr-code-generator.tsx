'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  QrCode,
  Plus,
  Trash2,
  Download,
  Printer,
  BarChart3,
  Eye,
  EyeOff,
} from '@/components/ui/icons'
import {
  generateMenuQRCode,
  updateQRCode,
  deleteQRCode,
  type QRCode as QRCodeType,
  type QRScanStat,
} from '@/lib/commerce/qr-menu-actions'

// ─── Types ────────────────────────────────────────────────────────

type SizeOption = { label: string; value: 200 | 300 | 500 }

const SIZES: SizeOption[] = [
  { label: 'Small (200px)', value: 200 },
  { label: 'Medium (300px)', value: 300 },
  { label: 'Large (500px)', value: 500 },
]

// ─── Main Component ───────────────────────────────────────────────

export function QRCodeGenerator({
  initialCodes,
  initialStats,
}: {
  initialCodes: QRCodeType[]
  initialStats: {
    dailyStats: QRScanStat[]
    totalScans: number
    peakDay: QRScanStat | null
    days: number
  }
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [codes, setCodes] = useState(initialCodes)
  const [showCreate, setShowCreate] = useState(false)
  const [label, setLabel] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [size, setSize] = useState<200 | 300 | 500>(300)
  const stats = initialStats

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) {
      toast.error('Enter a label for this QR code')
      return
    }

    const previousCodes = codes
    startTransition(async () => {
      try {
        const result = await generateMenuQRCode({
          label: label.trim(),
          targetUrl: targetUrl.trim() || undefined,
          size,
        })
        setCodes([result.qrCode, ...previousCodes])
        toast.success(`QR code created: ${result.shortCode}`)
        setLabel('')
        setTargetUrl('')
        setShowCreate(false)
        router.refresh()
      } catch (err: any) {
        setCodes(previousCodes)
        toast.error(err?.message || 'Failed to generate QR code')
      }
    })
  }

  function handleToggleActive(qr: QRCodeType) {
    const previousCodes = codes
    const updated = codes.map((c) => (c.id === qr.id ? { ...c, is_active: !c.is_active } : c))
    setCodes(updated)

    startTransition(async () => {
      try {
        await updateQRCode(qr.id, { is_active: !qr.is_active })
        toast.success(qr.is_active ? 'QR code deactivated' : 'QR code activated')
        router.refresh()
      } catch (err: any) {
        setCodes(previousCodes)
        toast.error(err?.message || 'Failed to update QR code')
      }
    })
  }

  function handleDelete(qr: QRCodeType) {
    if (!confirm(`Delete QR code "${qr.label}"? This cannot be undone.`)) return

    const previousCodes = codes
    setCodes(codes.filter((c) => c.id !== qr.id))

    startTransition(async () => {
      try {
        await deleteQRCode(qr.id)
        toast.success('QR code deleted')
        router.refresh()
      } catch (err: any) {
        setCodes(previousCodes)
        toast.error(err?.message || 'Failed to delete QR code')
      }
    })
  }

  function handlePrint(qr: QRCodeType) {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Could not open print window. Check your popup blocker.')
      return
    }
    printWindow.document.write(`
      <html>
        <head><title>QR Code - ${qr.label}</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif;">
          <img src="${qr.qr_image_url}" alt="QR Code" style="max-width:500px;" />
          <p style="margin-top:16px;font-size:18px;color:#333;">${qr.label}</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-stone-900 border-stone-800">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{codes.length}</p>
            <p className="text-xs text-stone-500">QR Codes</p>
          </CardContent>
        </Card>
        <Card className="bg-stone-900 border-stone-800">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{stats.totalScans}</p>
            <p className="text-xs text-stone-500">Total Scans ({stats.days}d)</p>
          </CardContent>
        </Card>
        <Card className="bg-stone-900 border-stone-800">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{stats.peakDay?.count || 0}</p>
            <p className="text-xs text-stone-500">Peak Day</p>
          </CardContent>
        </Card>
      </div>

      {/* Create QR Code */}
      <Card className="bg-stone-900 border-stone-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-stone-100 flex items-center gap-2">
            <QrCode size={20} />
            QR Codes
          </CardTitle>
          <Button variant="primary" onClick={() => setShowCreate(!showCreate)} disabled={pending}>
            <Plus size={16} className="mr-1" />
            Generate QR Code
          </Button>
        </CardHeader>
        <CardContent>
          {showCreate && (
            <form onSubmit={handleGenerate} className="mb-6 p-4 bg-stone-800 rounded-lg space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Label</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 text-sm"
                  placeholder="Table 1, Front Counter, Truck Window..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Target URL (optional, defaults to your public menu)
                </label>
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 text-sm"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Size</label>
                <select
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value) as 200 | 300 | 500)}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 text-sm"
                  title="QR code image size"
                >
                  {SIZES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" disabled={pending}>
                  {pending ? 'Generating...' : 'Create QR Code'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* QR Code List */}
          {codes.length === 0 ? (
            <p className="text-stone-500 text-sm text-center py-8">
              No QR codes yet. Click "Generate QR Code" to create your first one.
            </p>
          ) : (
            <div className="space-y-4">
              {codes.map((qr) => (
                <div
                  key={qr.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border ${
                    qr.is_active
                      ? 'bg-stone-800/50 border-stone-700'
                      : 'bg-stone-800/20 border-stone-800 opacity-60'
                  }`}
                >
                  {/* QR Preview */}
                  {qr.qr_image_url && (
                    <img
                      src={qr.qr_image_url}
                      alt={`QR: ${qr.label}`}
                      className="w-20 h-20 rounded bg-white p-1"
                    />
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-100 truncate">{qr.label}</span>
                      <Badge variant={qr.is_active ? 'success' : 'default'}>
                        {qr.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-xs text-stone-500 mt-1 truncate">{qr.target_url}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-stone-400 flex items-center gap-1">
                        <BarChart3 size={12} />
                        {qr.scan_count} scans
                      </span>
                      <span className="text-xs text-stone-500">Code: {qr.short_code}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      onClick={() => handlePrint(qr)}
                      title="Print"
                      aria-label={`Print QR code for ${qr.label}`}
                      disabled={pending}
                    >
                      <Printer size={16} />
                    </Button>
                    {qr.qr_image_url && (
                      <a
                        href={qr.qr_image_url}
                        download={`qr-${qr.short_code}.png`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Download QR code for ${qr.label}`}
                      >
                        <Button
                          variant="ghost"
                          title="Download PNG"
                          aria-label={`Download QR code for ${qr.label}`}
                        >
                          <Download size={16} />
                        </Button>
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => handleToggleActive(qr)}
                      title={qr.is_active ? 'Deactivate' : 'Activate'}
                      aria-label={qr.is_active ? `Deactivate ${qr.label}` : `Activate ${qr.label}`}
                      disabled={pending}
                    >
                      {qr.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleDelete(qr)}
                      title="Delete"
                      aria-label={`Delete QR code for ${qr.label}`}
                      disabled={pending}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scan Analytics */}
      {stats.dailyStats.length > 0 && (
        <Card className="bg-stone-900 border-stone-800">
          <CardHeader>
            <CardTitle className="text-stone-100 flex items-center gap-2">
              <BarChart3 size={20} />
              Scan Analytics (Last {stats.days} Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.dailyStats.slice(-14).map((stat) => {
                const maxCount = Math.max(...stats.dailyStats.map((s) => s.count))
                const widthPct = maxCount > 0 ? (stat.count / maxCount) * 100 : 0
                return (
                  <div key={stat.date} className="flex items-center gap-3">
                    <span className="text-xs text-stone-400 w-24 shrink-0">{stat.date}</span>
                    <div className="flex-1 h-4 bg-stone-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-amber-600 rounded"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <span className="text-xs text-stone-300 w-8 text-right">{stat.count}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
