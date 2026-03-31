import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { findDuplicateClients } from '@/lib/clients/deduplication'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Duplicate Clients' }

export default async function DuplicatesPage() {
  await requireChef()
  const pairs = await findDuplicateClients()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Duplicate Clients</h1>
        <p className="text-stone-400 mt-1">Review and merge potential duplicate client records</p>
      </div>

      {pairs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-500">
              No duplicate clients found. Your client list looks clean!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pairs.map((pair, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-8">
                    <div>
                      <Link
                        href={`/clients/${pair.client1.id}`}
                        className="font-medium text-brand-600 hover:underline"
                      >
                        {pair.client1.full_name}
                      </Link>
                      <p className="text-sm text-stone-500">
                        {pair.client1.email || pair.client1.phone || 'No contact'}
                      </p>
                    </div>
                    <div className="text-stone-400 self-center text-lg font-bold">&asymp;</div>
                    <div>
                      <Link
                        href={`/clients/${pair.client2.id}`}
                        className="font-medium text-brand-600 hover:underline"
                      >
                        {pair.client2.full_name}
                      </Link>
                      <p className="text-sm text-stone-500">
                        {pair.client2.email || pair.client2.phone || 'No contact'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Badge variant={pair.confidence === 'high' ? 'error' : 'warning'}>
                      {pair.confidence} confidence &mdash; {pair.matchReason}
                    </Badge>
                    <div className="flex gap-2">
                      <Button href={`/clients/${pair.client1.id}`} size="sm" variant="secondary">
                        View Record 1
                      </Button>
                      <Button href={`/clients/${pair.client2.id}`} size="sm" variant="secondary">
                        View Record 2
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
