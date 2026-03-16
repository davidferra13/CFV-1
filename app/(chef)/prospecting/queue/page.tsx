// Prospecting Hub - Daily Call Queue
// Admin-only. Build a queue of N prospects and work through them.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Phone } from '@/components/ui/icons'
import { CallQueueClient } from './call-queue-client'

export const metadata: Metadata = { title: 'Call Queue - Prospecting - ChefFlow' }

export default async function QueuePage() {
  await requireAdmin()
  await requireChef()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/prospecting">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Daily Call Queue</h1>
          <p className="text-stone-400 mt-1">
            Build your call list, work through it, log outcomes - every call is tracked.
          </p>
        </div>
      </div>

      <CallQueueClient />
    </div>
  )
}
