// GET /api/events/[id]/recap-video
// Downloads the rendered .mp4 recap for a completed event.
// Accessible to the owning chef or the client on the event.

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import fs from 'fs'
import path from 'path'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: eventId } = await params

  const db = createServerClient() as any

  // Look up the recap row — verify tenancy inline
  const { data: recap } = await db
    .from('event_recaps')
    .select('file_path, tenant_id, event_id')
    .eq('event_id', eventId)
    .single()

  if (!recap) {
    return NextResponse.json({ error: 'Recap not found' }, { status: 404 })
  }

  // Verify the caller owns this event (chef) or is the event's client
  if (user.role === 'chef') {
    if (recap.tenant_id !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } else if (user.role === 'client') {
    const { data: event } = await db.from('events').select('client_id').eq('id', eventId).single()
    if (!event || event.client_id !== user.entityId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Resolve to absolute path (file_path is stored as relative)
  const relativePath = (recap.file_path as string).replace(/^\//, '').replace(/\.\./g, '')
  const filePath = path.resolve(process.cwd(), relativePath)

  // Safety: ensure the resolved path stays within storage/recaps
  const storageRecaps = path.resolve(process.cwd(), 'storage', 'recaps')
  if (!filePath.startsWith(storageRecaps)) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Video file not found on server' }, { status: 404 })
  }

  const stat = fs.statSync(filePath)
  const fileBuffer = fs.readFileSync(filePath)
  const filename = `event-recap-${path.basename(filePath)}`

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(stat.size),
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
