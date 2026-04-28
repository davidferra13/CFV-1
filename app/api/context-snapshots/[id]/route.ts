import { NextResponse, type NextRequest } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { getContextSnapshotById } from '@/lib/context-snapshots/service'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  let user
  try {
    user = await requireChef()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const snapshotId = Number(params.id)
  if (!Number.isInteger(snapshotId) || snapshotId <= 0) {
    return NextResponse.json({ error: 'Invalid snapshot ID' }, { status: 400 })
  }

  const snapshot = await getContextSnapshotById(user.tenantId!, snapshotId)
  if (!snapshot) {
    return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
  }

  return NextResponse.json({ snapshot })
}
