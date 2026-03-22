// Client Feedback Hub
// Overview page linking to feedback dashboard and send requests.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Client Feedback | ChefFlow' }

export default async function FeedbackPage() {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { count: surveyCount } = await supabase
    .from('surveys')
    .select('*', { count: 'exact', head: true })
    .eq('chef_id', chef.entityId)

  const { count: responseCount } = await supabase
    .from('surveys')
    .select('*', { count: 'exact', head: true })
    .eq('chef_id', chef.entityId)
    .eq('completed', true)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Client Feedback</h1>
        <p className="text-stone-400 mt-1">
          Collect and review feedback from clients after every event. Use it to improve your service
          and build your reputation.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-stone-800 rounded-xl p-4 border border-stone-700">
          <p className="text-sm text-stone-500">Surveys Sent</p>
          <p className="text-3xl font-bold text-stone-100 mt-1">{surveyCount ?? 0}</p>
        </div>
        <div className="bg-stone-800 rounded-xl p-4 border border-stone-700">
          <p className="text-sm text-stone-500">Responses Received</p>
          <p className="text-3xl font-bold text-stone-100 mt-1">{responseCount ?? 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/feedback/dashboard">
          <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="p-0 mb-2">
              <CardTitle className="text-lg">Feedback Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-sm text-stone-500">
                View all received feedback, ratings, and trends across your events.
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/feedback/requests">
          <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="p-0 mb-2">
              <CardTitle className="text-lg">Send Requests</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-sm text-stone-500">
                Send post-event feedback requests to clients via email or the client portal.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
