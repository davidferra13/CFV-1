import { z } from 'zod'
import { NextResponse, type NextRequest } from 'next/server'
import { getActivityFeed } from '@/lib/activity/actions'
import { getChefActivityFeed } from '@/lib/activity/chef-actions'
import type { ActivityActorFilter } from '@/lib/activity/types'
import type { ChefActivityDomain } from '@/lib/activity/chef-types'

const tabSchema = z.enum(['my', 'client', 'all']).default('my')
const timeRangeSchema = z.enum(['1', '7', '30', '90', '180', '365', 'all']).default('7')
const actorSchema = z.enum(['all', 'client', 'chef', 'system']).default('all')
const domainSchema = z.enum([
  'event',
  'inquiry',
  'quote',
  'menu',
  'recipe',
  'client',
  'financial',
  'communication',
  'operational',
])

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const tabParsed = tabSchema.safeParse(searchParams.get('tab') || undefined)
  const timeRangeParsed = timeRangeSchema.safeParse(searchParams.get('timeRange') || undefined)
  const actorParsed = actorSchema.safeParse(searchParams.get('actor') || undefined)
  const limitParsed = z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .safeParse(searchParams.get('limit') || 25)

  if (
    !tabParsed.success ||
    !timeRangeParsed.success ||
    !actorParsed.success ||
    !limitParsed.success
  ) {
    return NextResponse.json({ error: 'Invalid query params' }, { status: 400 })
  }

  const tab = tabParsed.data
  const daysBack = timeRangeParsed.data === 'all' ? 0 : Number(timeRangeParsed.data)
  const actorFilter = actorParsed.data as ActivityActorFilter
  const limit = limitParsed.data
  const domainRaw = searchParams.get('domain')
  const domainParsed = domainRaw ? domainSchema.safeParse(domainRaw) : null
  const domain: ChefActivityDomain | null = domainParsed?.success ? domainParsed.data : null
  const chefCursor = searchParams.get('chefCursor') || null
  const clientCursor = searchParams.get('clientCursor') || null

  try {
    if (tab === 'my') {
      const chef = await getChefActivityFeed({
        daysBack,
        limit,
        cursor: chefCursor,
        domain: domain || undefined,
      })
      return NextResponse.json(
        {
          chefItems: chef.items,
          chefNextCursor: chef.nextCursor,
          clientItems: [],
          clientNextCursor: null,
        },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

    if (tab === 'client') {
      const client = await getActivityFeed({
        daysBack,
        limit,
        cursor: clientCursor,
        actorType: 'client',
      })
      return NextResponse.json(
        {
          chefItems: [],
          chefNextCursor: null,
          clientItems: client.items,
          clientNextCursor: client.nextCursor,
        },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const chef = await getChefActivityFeed({
      daysBack,
      limit,
      cursor: chefCursor,
      domain: domain || undefined,
    })
    const client = await getActivityFeed({
      daysBack,
      limit,
      cursor: clientCursor,
      actorType: actorFilter === 'all' ? undefined : actorFilter,
    })

    return NextResponse.json(
      {
        chefItems: chef.items,
        chefNextCursor: chef.nextCursor,
        clientItems: client.items,
        clientNextCursor: client.nextCursor,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[activity-feed] Error:', error)
    return NextResponse.json({ error: 'Failed to load activity feed' }, { status: 500 })
  }
}
