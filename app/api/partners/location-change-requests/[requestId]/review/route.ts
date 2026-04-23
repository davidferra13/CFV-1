import { NextResponse } from 'next/server'
import { reviewPartnerLocationChangeRequest } from '@/lib/partners/actions'

export async function POST(
  request: Request,
  { params }: { params: { requestId: string } }
) {
  const body: { decision?: 'approved' | 'rejected'; reviewNote?: string } = {}

  try {
    const parsed = (await request.json()) as Record<string, unknown>
    if (parsed?.decision === 'approved' || parsed?.decision === 'rejected') {
      body.decision = parsed.decision
    }
    if (typeof parsed?.reviewNote === 'string') {
      body.reviewNote = parsed.reviewNote
    }
  } catch {
    // Ignore malformed JSON and fall back to the safe default decision.
  }

  try {
    await reviewPartnerLocationChangeRequest({
      requestId: params.requestId,
      decision: body.decision || 'approved',
      reviewNote: body.reviewNote || '',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to review location change request',
      },
      { status: 400 }
    )
  }
}
