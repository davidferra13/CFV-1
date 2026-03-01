import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { updateClient } from '@/lib/clients/actions'

const ClientPreferencesSchema = z.object({
  clientId: z.string().uuid(),
  dietary_restrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  dislikes: z.array(z.string()).optional(),
  preferred_contact_method: z.enum(['phone', 'email', 'text', 'instagram']).optional(),
  preferred_event_days: z.array(z.string()).optional(),
  preferred_service_style: z.string().optional(),
  budget_range_min_cents: z.number().int().nullable().optional(),
  budget_range_max_cents: z.number().int().nullable().optional(),
  cleanup_expectations: z.string().optional(),
  leftovers_preference: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    await requireChef()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: z.infer<typeof ClientPreferencesSchema>
  try {
    payload = ClientPreferencesSchema.parse(await request.json())
  } catch (error) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  try {
    const { clientId, ...input } = payload
    const result = await updateClient(clientId, input)

    return NextResponse.json(
      { success: true, client: result.client },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[client-preferences] Error:', error)
    return NextResponse.json({ error: 'Failed to update client preferences' }, { status: 500 })
  }
}
