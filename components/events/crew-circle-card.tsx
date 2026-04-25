import Link from 'next/link'
import { createServerClient } from '@/lib/db/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface CrewCircleCardProps {
  eventId: string
  tenantId: string
}

export async function CrewCircleCard({ eventId, tenantId }: CrewCircleCardProps) {
  try {
    const db: any = createServerClient({ admin: true })

    const { data: circle } = await db
      .from('hub_groups')
      .select('id, group_token, name')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .eq('group_type', 'crew')
      .maybeSingle()

    if (!circle) return null

    const { count } = await db
      .from('hub_group_members')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', circle.id)

    return (
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-stone-200">Crew Circle</h3>
            <p className="truncate text-xs text-stone-400">{circle.name}</p>
            <p className="text-xs text-stone-500">
              {count ?? 0} {(count ?? 0) === 1 ? 'member' : 'members'}
            </p>
          </div>
          <Link href={`/hub/g/${circle.group_token}`} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm">
              Open
            </Button>
          </Link>
        </div>
      </Card>
    )
  } catch (err) {
    console.error('[CrewCircleCard] failed to load crew circle (non-blocking)', err)
    return null
  }
}
