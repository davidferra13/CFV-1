// BEO (Banquet Event Order) Page
// Server component that loads event data and generates the BEO.
// Print-optimized layout with version toggle.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { generateBEO } from '@/lib/beo/generate-beo'
import { BEOViewer } from '@/components/events/beo-viewer'
import { Button } from '@/components/ui/button'

export default async function BEOPage({ params }: { params: { id: string } }) {
  await requireChef()

  const beo = await generateBEO(params.id, { includeFinancials: true })
  if (!beo) notFound()

  return (
    <div className="max-w-3xl mx-auto pb-16 space-y-4">
      {/* Nav */}
      <div className="flex justify-between items-center print:hidden">
        <Link href={`/events/${params.id}`}>
          <Button variant="ghost" size="sm">
            &larr; Back to Event
          </Button>
        </Link>
      </div>

      <BEOViewer initialBeo={beo} eventId={params.id} />
    </div>
  )
}
