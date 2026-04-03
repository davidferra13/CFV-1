import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { verifyCsrfOrigin } from '@/lib/security/csrf'
import { updateClient } from '@/lib/clients/actions'
import { createServerClient } from '@/lib/db/server'
import { normalizeAllergyRecords, buildAllergyRecordRows } from '@/lib/dietary/intake'

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
  recurring_pricing_model: z.enum(['none', 'flat_rate', 'per_person']).nullable().optional(),
  recurring_price_cents: z.number().int().nullable().optional(),
  recurring_pricing_notes: z.string().nullable().optional(),
  cleanup_expectations: z.string().optional(),
  leftovers_preference: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const csrfError = verifyCsrfOrigin(request)
  if (csrfError) return csrfError

  let user
  try {
    user = await requireChef()
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
    const { clientId, allergies, ...input } = payload
    const result = await updateClient(clientId, input as any)

    // Persist structured allergy records alongside the legacy flat array
    if (allergies && allergies.length > 0) {
      try {
        const db: any = createServerClient()
        const normalized = normalizeAllergyRecords(
          allergies.map((a) => ({ allergen: a, severity: 'allergy' })),
          'chef_entered'
        )
        const rows = buildAllergyRecordRows(user.tenantId!, clientId, normalized)
        await db.from('client_allergy_records').upsert(rows, {
          onConflict: 'client_id,allergen',
          ignoreDuplicates: false,
        })
      } catch (err) {
        console.error('[client-preferences] Allergy records sync failed (non-blocking):', err)
      }
    }

    return NextResponse.json(
      { success: true, client: result.client },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[client-preferences] Error:', error)
    return NextResponse.json({ error: 'Failed to update client preferences' }, { status: 500 })
  }
}
