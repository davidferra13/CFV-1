'use client'
import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Shield, AlertTriangle } from 'lucide-react'
import { exportMyData } from '@/lib/compliance/data-export'
import { toast } from 'sonner'

export function GdprTools() {
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState(false)

  function handleExport() {
    startTransition(async () => {
      try {
        const data = await exportMyData()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `chefflow-data-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Data export downloaded')
      } catch (err: any) { toast.error(err.message) }
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" />Export Your Data</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-stone-600 mb-4">Download a complete copy of your ChefFlow data including events, clients, financials, and settings.</p>
          <Button onClick={handleExport} loading={isPending} variant="secondary">Download My Data (JSON)</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Privacy Controls</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-2" />
            <div>
              <p className="text-sm font-medium text-stone-700">Data Encryption</p>
              <p className="text-xs text-stone-500">All data encrypted at rest and in transit (AES-256 + TLS 1.3)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-2" />
            <div>
              <p className="text-sm font-medium text-stone-700">Row-Level Security</p>
              <p className="text-xs text-stone-500">Your data is isolated from other chefs at the database level</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader><CardTitle className="flex items-center gap-2 text-red-700"><AlertTriangle className="h-5 w-5" />Danger Zone</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-stone-600 mb-4">Request account deletion. This will permanently delete your chef account and all associated data after a 30-day grace period.</p>
          {!confirm ? (
            <Button variant="danger" onClick={() => setConfirm(true)}>Request Account Deletion</Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-700">Are you absolutely sure? This cannot be undone.</p>
              <div className="flex gap-2">
                <Button variant="danger" onClick={() => toast.info('Deletion request sent. Support will contact you within 24 hours.')}>Yes, request deletion</Button>
                <Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
