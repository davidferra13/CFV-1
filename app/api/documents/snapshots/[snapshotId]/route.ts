import { NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

const SNAPSHOT_BUCKET = 'event-documents'

export async function GET(_: Request, { params }: { params: { snapshotId: string } }) {
  try {
    const user = await requireChef()
    const supabase: any = createServerClient()

    const { data: snapshot, error: snapshotError } = await supabase
      .from('event_document_snapshots')
      .select('id, storage_path, filename, tenant_id')
      .eq('id', params.snapshotId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (snapshotError || !snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(SNAPSHOT_BUCKET)
      .download(snapshot.storage_path)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to load snapshot file' }, { status: 500 })
    }

    const bytes = new Uint8Array(await fileData.arrayBuffer())

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${snapshot.filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load snapshot'
    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to load snapshot' }, { status: 500 })
  }
}
