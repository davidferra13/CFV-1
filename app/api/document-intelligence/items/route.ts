import { NextRequest, NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { verifyCsrfOrigin } from '@/lib/security/csrf'
import { checkRateLimit } from '@/lib/rateLimit'
import { createDocumentIntelligenceItemsFromFiles } from '@/lib/document-intelligence/service'

export async function POST(request: NextRequest) {
  const csrfError = verifyCsrfOrigin(request)
  if (csrfError) return csrfError

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  try {
    await checkRateLimit(`document-intelligence-upload:${ip}`, 20, 60_000)
  } catch {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  try {
    const user = await requireChef()
    const supabase: any = createServerClient()
    const formData = await request.formData()

    const jobIdRaw = formData.get('job_id')
    const jobId = typeof jobIdRaw === 'string' && jobIdRaw.trim().length > 0 ? jobIdRaw : null
    const fileEntries = formData.getAll('files').filter((entry): entry is File => entry instanceof File)

    if (fileEntries.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const result = await createDocumentIntelligenceItemsFromFiles({
      supabase,
      tenantId: user.tenantId!,
      userId: user.id,
      jobId,
      files: fileEntries,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[document-intelligence-upload] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    )
  }
}
