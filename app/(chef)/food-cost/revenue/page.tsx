// Daily Revenue Page
// Enter daily sales totals for food cost calculation.
// Supports manual entry and CSV upload.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RevenueForm } from './revenue-form'

export const metadata: Metadata = { title: 'Daily Revenue' }

export default async function DailyRevenuePage() {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: entries } = await db
    .from('daily_revenue')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('date', { ascending: false })
    .limit(30)

  const revenueEntries = entries ?? []

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link href="/food-cost" className="text-sm text-stone-500 hover:text-stone-300">
        &larr; Back to Food Cost Dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-stone-100">Daily Revenue</h1>
        <p className="mt-1 text-sm text-stone-500">
          Enter daily sales totals from your POS. This is the denominator for food cost %.
        </p>
      </div>

      {/* Add Revenue Entry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log Today&apos;s Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueForm />
        </CardContent>
      </Card>

      {/* Revenue History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Recent Entries
            <span className="ml-2 text-sm font-normal text-stone-500">(last 30 days)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {revenueEntries.length === 0 ? (
            <div className="text-center py-6">
              <svg
                className="h-8 w-8 mx-auto text-stone-600 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-stone-400 font-medium">No revenue entries yet</p>
              <p className="text-xs text-stone-600 mt-1">
                Revenue from events and sales will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {revenueEntries.map((entry: any) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between text-sm border-b border-stone-800 pb-2"
                >
                  <div>
                    <span className="text-stone-200">
                      {new Date(entry.date).toLocaleDateString()}
                    </span>
                    <span className="text-stone-500 ml-2">{entry.source}</span>
                    {entry.notes && <span className="text-stone-400 ml-2">{entry.notes}</span>}
                  </div>
                  <span className="text-stone-200 font-medium">
                    ${(entry.total_revenue_cents / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
