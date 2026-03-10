// Client Meal Prep Portal - View meals, manage subscription, containers

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import {
  getMyMealPrepSubscription,
  getMyDeliverySchedule,
} from '@/lib/meal-prep/client-portal-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MealPrepClientActions } from './meal-prep-client-actions'

export const metadata: Metadata = {
  title: 'My Meal Prep - ChefFlow',
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default async function MyMealsPage() {
  await requireClient()

  const [subscription, deliverySchedule] = await Promise.all([
    getMyMealPrepSubscription(),
    getMyDeliverySchedule(),
  ])

  if (!subscription) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-stone-100">My Meal Prep</h1>
        <Card className="border-stone-700 bg-stone-900">
          <CardContent className="p-8 text-center">
            <p className="text-stone-400 text-lg">
              You don't have an active meal prep subscription yet.
            </p>
            <p className="text-stone-500 text-sm mt-2">
              Contact your chef to get started with weekly meal prep.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusVariant: Record<string, 'success' | 'warning' | 'default'> = {
    active: 'success',
    paused: 'warning',
    ended: 'default',
  }

  const nextDelivery = deliverySchedule[0] || null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">My Meal Prep</h1>
          {subscription.chefName && (
            <p className="text-stone-400 text-sm mt-1">Prepared by {subscription.chefName}</p>
          )}
        </div>
        <Badge variant={statusVariant[subscription.status] || 'default'}>
          {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
        </Badge>
      </div>

      {/* Subscription overview */}
      <Card className="border-stone-700 bg-stone-900">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-lg font-semibold text-stone-100">Subscription</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-stone-500">Rate</span>
              <p className="text-stone-200 font-medium">
                {formatCurrency(subscription.rateCents)} / {subscription.frequency}
              </p>
            </div>
            <div>
              <span className="text-stone-500">Delivery Day</span>
              <p className="text-stone-200 font-medium">
                {DAY_NAMES[subscription.deliveryDay] || 'TBD'}
              </p>
            </div>
            <div>
              <span className="text-stone-500">Time Window</span>
              <p className="text-stone-200 font-medium">
                {subscription.deliveryWindowStart} - {subscription.deliveryWindowEnd}
              </p>
            </div>
            <div>
              <span className="text-stone-500">Delivery Address</span>
              <p className="text-stone-200 font-medium">
                {subscription.deliveryAddress || 'Not set'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next delivery */}
      {nextDelivery && subscription.status === 'active' && (
        <Card className="border-stone-700 bg-stone-900">
          <CardContent className="p-5 space-y-2">
            <h2 className="text-lg font-semibold text-stone-100">Next Delivery</h2>
            <p className="text-stone-300">
              {nextDelivery.date} between {nextDelivery.windowStart} and {nextDelivery.windowEnd}
            </p>
            {nextDelivery.address && (
              <p className="text-stone-500 text-sm">{nextDelivery.address}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* This week's meals */}
      {subscription.currentWeek && (
        <Card className="border-stone-700 bg-stone-900">
          <CardContent className="p-5 space-y-3">
            <h2 className="text-lg font-semibold text-stone-100">
              This Week (Week {subscription.currentWeek.rotationWeek})
            </h2>
            {subscription.currentWeek.menuTitle && (
              <p className="text-brand-400 text-sm font-medium">
                {subscription.currentWeek.menuTitle}
              </p>
            )}
            {subscription.currentWeek.customDishes.length > 0 ? (
              <div className="grid gap-2">
                {subscription.currentWeek.customDishes.map((dish, i) => (
                  <div key={i} className="rounded-lg border border-stone-700 p-3">
                    <p className="text-stone-200 font-medium">{dish.name}</p>
                    {dish.description && (
                      <p className="text-stone-500 text-sm mt-0.5">{dish.description}</p>
                    )}
                    {dish.servings && (
                      <p className="text-stone-600 text-xs mt-1">{dish.servings} servings</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-stone-500 text-sm">
                Your chef hasn't posted this week's menu yet.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upcoming weeks */}
      {subscription.upcomingWeeks.length > 0 && (
        <Card className="border-stone-700 bg-stone-900">
          <CardContent className="p-5 space-y-3">
            <h2 className="text-lg font-semibold text-stone-100">Upcoming Weeks</h2>
            <div className="space-y-2">
              {subscription.upcomingWeeks.map((week) => (
                <div key={week.id} className="rounded-lg border border-stone-800 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-300 font-medium">Week {week.rotationWeek}</span>
                    {week.menuTitle && (
                      <span className="text-stone-500 text-sm">{week.menuTitle}</span>
                    )}
                  </div>
                  {week.customDishes.length > 0 && (
                    <p className="text-stone-500 text-sm mt-1">
                      {week.customDishes.map((d) => d.name).join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Containers */}
      <Card className="border-stone-700 bg-stone-900">
        <CardContent className="p-5">
          <h2 className="text-lg font-semibold text-stone-100 mb-3">Containers</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-stone-500">Out with you</span>
              <p className="text-stone-200 font-medium text-xl">
                {subscription.containersOut - subscription.containersReturned}
              </p>
            </div>
            <div>
              <span className="text-stone-500">Total returned</span>
              <p className="text-stone-200 font-medium text-xl">
                {subscription.containersReturned}
              </p>
            </div>
          </div>
          {subscription.containerDepositCents > 0 && (
            <p className="text-stone-600 text-xs mt-3">
              Container deposit: {formatCurrency(subscription.containerDepositCents)} per container
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <MealPrepClientActions programId={subscription.id} status={subscription.status} />

      {/* Navigation links */}
      <div className="flex gap-3 flex-wrap">
        <Link
          href="/my-meals/preferences"
          className="text-brand-400 hover:text-brand-300 text-sm font-medium underline underline-offset-4"
        >
          Update Preferences
        </Link>
        <Link
          href="/my-meals/history"
          className="text-brand-400 hover:text-brand-300 text-sm font-medium underline underline-offset-4"
        >
          Delivery History
        </Link>
        <Link
          href="/my-spending"
          className="text-brand-400 hover:text-brand-300 text-sm font-medium underline underline-offset-4"
        >
          Invoices
        </Link>
      </div>
    </div>
  )
}
