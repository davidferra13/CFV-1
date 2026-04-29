'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Shield, AlertTriangle } from '@/components/ui/icons'
import Link from 'next/link'

export function GdprTools() {
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
            Use the dedicated export center to download your ChefFlow data, including events,
            clients, financials, menus, recipes, staff, documents, and more.
          </p>
          <Button href="/settings/data-export" variant="secondary">
            Open Data Export
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
          <CardTitle className="flex items-center gap-2 text-red-700">
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
