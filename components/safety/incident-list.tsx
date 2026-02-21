'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

type Incident = {
  id: string
  incident_date: string
  incident_type: string
  description: string
  resolution_status: string
  event_id: string | null
}

const TYPE_VARIANTS: Record<string, 'error' | 'warning' | 'default'> = {
  food_safety: 'error',
  guest_injury: 'error',
  property_damage: 'warning',
  equipment_failure: 'warning',
  near_miss: 'warning',
  other: 'default',
}

const STATUS_VARIANTS: Record<string, 'warning' | 'info' | 'success'> = {
  open: 'warning',
  in_progress: 'info',
  resolved: 'success',
}

function formatType(t: string) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function IncidentList({ incidents }: { incidents: Incident[] }) {
  if (incidents.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500">
        <p className="text-lg mb-2">No incidents documented</p>
        <p className="text-sm">
          This is a good thing. Document incidents when they occur to protect yourself.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {incidents.map((incident) => (
        <Card key={incident.id}>
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant={TYPE_VARIANTS[incident.incident_type] ?? 'default'}>
                    {formatType(incident.incident_type)}
                  </Badge>
                  <Badge variant={STATUS_VARIANTS[incident.resolution_status] ?? 'default'}>
                    {formatType(incident.resolution_status)}
                  </Badge>
                  <span className="text-xs text-stone-400">
                    {format(new Date(incident.incident_date), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                <p className="text-sm text-stone-700 line-clamp-2">{incident.description}</p>
              </div>
              <Link href={`/safety/incidents/${incident.id}`}>
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
