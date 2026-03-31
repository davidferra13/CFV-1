import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getSegments } from '@/lib/clients/segments'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { SegmentBuilder } from '@/components/clients/segment-builder'

export const metadata: Metadata = { title: 'Client Segments' }

export default async function SegmentsPage() {
  await requireChef()
  const segments = await getSegments()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Client Segments</h1>
          <p className="text-stone-400 mt-1">Create custom groups for targeted outreach</p>
        </div>
      </div>

      <SegmentBuilder />

      {segments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-200">Your Segments</h2>
          {segments.map((seg: any) => (
            <Card key={seg.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: seg.color || '#6366f1' }}
                  />
                  <div>
                    <p className="font-medium text-stone-100">{seg.name}</p>
                    {seg.description && <p className="text-sm text-stone-500">{seg.description}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="default">{(seg.filters as any[])?.length || 0} filters</Badge>
                  <Link href={`/clients?segment=${seg.id}`}>
                    <Button size="sm" variant="secondary">
                      View Clients
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {segments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-500">No segments yet. Create your first segment above.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
