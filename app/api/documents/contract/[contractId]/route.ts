import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { requireAuth } from '@/lib/auth/get-user'
import { generateContract } from '@/lib/documents/generate-contract'

// Both chef and client can download the contract PDF.
// Auth is resolved via requireAuth() — then ownership verified in the generator
// by scoping the DB query to chef_id OR client_id based on the user's role.

export async function GET(_request: Request, { params }: { params: { contractId: string } }) {
  try {
    const user = await requireAuth()

    const owner = {
      chefId: user.role === 'chef' ? user.tenantId : null,
      clientEntityId: user.role === 'client' ? user.entityId : null,
    }

    const pdfBuffer = await generateContract(params.contractId, owner)
    const bytes = new Uint8Array(pdfBuffer)
    const dateSuffix = format(new Date(), 'yyyy-MM-dd')

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="contract-${dateSuffix}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate contract'

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (message.includes('not found') || message.includes('access denied')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    console.error('[contract-route] Error:', error)
    return NextResponse.json({ error: 'Failed to generate contract' }, { status: 500 })
  }
}
