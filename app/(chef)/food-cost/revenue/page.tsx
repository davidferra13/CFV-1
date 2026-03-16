// Daily Revenue Page
// Enter daily sales totals for food cost calculation.
// Supports manual entry and CSV upload.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const metadata: Metadata = { title: 'Daily Revenue | ChefFlow' }

export default async function DailyRevenuePage() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: entries } = await supabase
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
          <form
            action={async (formData: FormData) => {
              'use server'
              const { requireChef } = await import('@/lib/auth/get-user')
              const { createServerClient } = await import('@/lib/supabase/server')
              const { revalidatePath } = await import('next/cache')

              const user = await requireChef()
              const supabase: any = createServerClient()
              const date = formData.get('date') as string
              const amount = formData.get('amount') as string
              const notes = formData.get('notes') as string

              if (!date || !amount) return

              const totalRevenueCents = Math.round(parseFloat(amount) * 100)
              if (isNaN(totalRevenueCents) || totalRevenueCents <= 0) return

              await supabase.from('daily_revenue').upsert(
                {
                  chef_id: user.tenantId!,
                  date,
                  total_revenue_cents: totalRevenueCents,
                  source: 'manual',
                  notes: notes?.trim() || null,
                },
                { onConflict: 'chef_id,date' }
              )

              revalidatePath('/food-cost/revenue')
              revalidatePath('/food-cost')
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <Input
                name="date"
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                required
              />
              <Input
                name="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Total sales ($)"
                required
              />
            </div>
            <Input name="notes" placeholder="Notes (optional)" />
            <Button type="submit" variant="primary">
              Save Revenue
            </Button>
          </form>
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
            <p className="text-sm text-stone-500">No revenue entries yet.</p>
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
