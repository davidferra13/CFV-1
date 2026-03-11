'use client'
import { useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Shield, AlertTriangle } from '@/components/ui/icons'
import { exportMyData } from '@/lib/compliance/data-export'
import { toast } from 'sonner'
import Link from 'next/link'

export function GdprTools() {
  const [isPending, startTransition] = useTransition()

  function handleExport() {
    startTransition(async () => {
      try {
        const data = await exportMyData()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `chefflow-data-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Data export downloaded')
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Your Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-400 mb-4">
            Download a complete copy of your ChefFlow data including events, clients, financials,
            menus, recipes, staff, documents, and more.
          </p>
          <Button onClick={handleExport} loading={isPending} variant="secondary">
            Download My Data (JSON)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-2" />
            <div>
              <p className="text-sm font-medium text-stone-300">Data Encryption</p>
              <p className="text-xs text-stone-500">
                All data encrypted at rest and in transit (AES-256 + TLS 1.3)
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-2" />
            <div>
              <p className="text-sm font-medium text-stone-300">Row-Level Security</p>
              <p className="text-xs text-stone-500">
                Your data is isolated from other chefs at the database level
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-200">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-400 mb-4">
            Delete your account with a 30-day grace period. You can reactivate during that time.
          </p>
          <Link href="/settings/delete-account">
            <Button variant="danger">Delete My Account</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
