'use client'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface TakeAChefSetupProps {
  gmailConnected: boolean
  lastSyncAt: string | null
  tacLeadCount: number
}

export function TakeAChefSetup({ gmailConnected, lastSyncAt, tacLeadCount }: TakeAChefSetupProps) {
  // --- State 1: Connected with leads captured ---
  if (gmailConnected && tacLeadCount > 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>TakeAChef Integration</CardTitle>
            <Badge variant="success">Connected</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-400">Leads captured</span>
              <span className="text-sm font-semibold text-stone-100">{tacLeadCount}</span>
            </div>
            {lastSyncAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-400">Last synced</span>
                <span className="text-sm text-stone-500">
                  {new Date(lastSyncAt).toLocaleString()}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-stone-800">
              <button
                type="button"
                disabled
                className="text-xs text-stone-600 cursor-not-allowed"
                title="Gmail disconnect is not yet available"
              >
                Disconnect Gmail (coming soon)
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // --- State 2: Connected but no leads yet ---
  if (gmailConnected && tacLeadCount === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>TakeAChef Integration</CardTitle>
            <Badge variant="info">Scanning</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0 h-5 w-5 text-sky-500">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-sm text-stone-400 leading-relaxed">
              We&apos;re scanning your inbox for TakeAChef emails. New leads will appear on your
              dashboard within 5 minutes.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // --- State 3: Not connected — setup wizard ---
  return (
    <Card>
      <CardHeader>
        <CardTitle>TakeAChef Integration</CardTitle>
        <p className="mt-1 text-sm text-stone-500">
          Automatically capture leads from TakeAChef notification emails.
        </p>
      </CardHeader>
      <CardContent>
        <ol className="space-y-6">
          {/* Step 1: Connect Gmail */}
          <li className="flex gap-4">
            <div className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-brand-600 text-white text-xs font-bold">
              1
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="text-sm font-semibold text-stone-100">Connect your Gmail</h4>
              <p className="text-sm text-stone-500 leading-relaxed">
                ChefFlow will scan for TakeAChef notification emails so we can turn them into leads
                automatically.
              </p>
              <p className="text-xs text-stone-400 italic">
                ChefFlow only reads emails from TakeAChef &mdash; we never access your personal
                messages.
              </p>
              <div className="pt-1">
                <Link href="/api/auth/google/connect">
                  <Button variant="primary" size="sm">
                    Connect Gmail
                  </Button>
                </Link>
              </div>
            </div>
          </li>

          {/* Step 2: Automatic processing */}
          <li className="flex gap-4">
            <div className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-stone-700 text-stone-400 text-xs font-bold">
              2
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="text-sm font-semibold text-stone-100">We do the rest</h4>
              <p className="text-sm text-stone-500 leading-relaxed">
                ChefFlow automatically detects new TakeAChef emails, deduplicates contacts, and
                creates leads in your pipeline. No manual entry needed.
              </p>
            </div>
          </li>

          {/* Step 3: Commission rate — not yet persisted to server */}
          <li className="flex gap-4">
            <div className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-stone-700 text-stone-400 text-xs font-bold">
              3
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="text-sm font-semibold text-stone-100">Commission rate</h4>
              <p className="text-sm text-stone-500 leading-relaxed">
                TakeAChef typically takes 25% of each booking. Commission rate settings will be
                available once Gmail is connected.
              </p>
              <p className="text-xs text-stone-600 italic">Default: 25%</p>
            </div>
          </li>
        </ol>
      </CardContent>
    </Card>
  )
}
