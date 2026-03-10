import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { listMealPrepPrograms } from '@/lib/meal-prep/program-actions'
import { getSubscriptionBillingSummary } from '@/lib/finance/subscription-billing-actions'
import { MealPrepDashboard } from '@/components/meal-prep/meal-prep-dashboard'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Truck, ShoppingCart, ListChecks, DollarSign } from '@/components/ui/icons'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'Meal Prep - ChefFlow' }

export default async function MealPrepPage() {
  await requireChef()
  await requirePro('operations')

  const [programs, billingSummary] = await Promise.all([
    listMealPrepPrograms(),
    getSubscriptionBillingSummary(),
  ])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Meal Prep</h1>
          <p className="text-sm text-stone-500 mt-1">
            Manage rotating menus, deliveries, and containers for your meal prep clients.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/meal-prep/shopping">
            <Button variant="secondary" size="sm">
              <ShoppingCart className="w-4 h-4 mr-1" />
              Batch Shopping
            </Button>
          </Link>
          <Link href="/meal-prep/cooking-day">
            <Button variant="secondary" size="sm">
              <ListChecks className="w-4 h-4 mr-1" />
              Cooking Day
            </Button>
          </Link>
          <Link href="/meal-prep/delivery">
            <Button variant="secondary" size="sm">
              <Truck className="w-4 h-4 mr-1" />
              Delivery Route
            </Button>
          </Link>
          <Link href="/clients">
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              New Program
            </Button>
          </Link>
        </div>
      </div>

      {/* Subscription Billing Summary */}
      <Card className="border-stone-700 bg-stone-900">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-semibold text-stone-100">Subscription Revenue</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-stone-500">Active Subscriptions</span>
              <p className="text-stone-100 font-semibold text-xl mt-0.5">
                {billingSummary.activeSubscriptions}
              </p>
            </div>
            <div>
              <span className="text-stone-500">Monthly Recurring</span>
              <p className="text-stone-100 font-semibold text-xl mt-0.5">
                {formatCurrency(billingSummary.monthlyRecurringRevenueCents)}
              </p>
            </div>
            <div>
              <span className="text-stone-500">Next Billing</span>
              <p className="text-stone-100 font-semibold text-sm mt-1">
                {billingSummary.nextBillingDate || 'None scheduled'}
              </p>
            </div>
            <div>
              <span className="text-stone-500">Overdue</span>
              <p className="mt-0.5">
                {billingSummary.overdueCount > 0 ? (
                  <Badge variant="error">{billingSummary.overdueCount} overdue</Badge>
                ) : (
                  <span className="text-stone-100 font-semibold text-xl">0</span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <MealPrepDashboard programs={programs} />
    </div>
  )
}
