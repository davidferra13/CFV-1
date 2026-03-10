// Bakery Order Tracking - Client Portal
// Shows all bakery/custom orders for this client with status timeline.
// Note: bakery_orders table does not yet exist in the schema.
// This page is gated by portal overview (only shows if client has orders).
// When the bakery module is built, this page will be populated.

import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { Card } from '@/components/ui/card'
import { ActivityTracker } from '@/components/activity/activity-tracker'

export const metadata: Metadata = { title: 'My Orders - ChefFlow' }

export default async function MyOrdersPage() {
  await requireClient()

  // bakery_orders table not yet in schema; this page is a placeholder
  // gated behind portalOverview.hasBakeryOrders (which will be false until
  // the bakery module is built). Rendering an honest empty state.

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">My Orders</h1>
        <p className="text-stone-400 mt-1">Track your custom orders and pickups</p>
      </div>

      <Card className="p-8 text-center">
        <p className="text-stone-500">
          No orders yet. When you place a custom order, it will appear here.
        </p>
      </Card>

      <ActivityTracker eventType="orders_page_viewed" />
    </div>
  )
}
