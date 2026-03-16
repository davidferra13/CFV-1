// Create New Loyalty Reward Page

import { requireChef } from '@/lib/auth/get-user'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CreateRewardForm } from './create-reward-form'

export default async function NewRewardPage() {
  await requireChef()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/loyalty"
          className="text-sm text-brand-500 hover:text-brand-400 mb-2 inline-block"
        >
          ← Back to Loyalty
        </Link>
        <h1 className="text-3xl font-bold text-stone-100">Create Reward</h1>
        <p className="text-stone-400 mt-1">
          Add a new service-denominated reward to your loyalty catalog
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reward Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateRewardForm />
        </CardContent>
      </Card>
    </div>
  )
}
