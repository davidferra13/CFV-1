import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { verifyCsrfOrigin } from '@/lib/security/csrf'
import {
  connectIntegrationAccount,
  disconnectIntegrationAccount,
  listConnectedAccounts,
} from '@/lib/integrations/integration-hub'

const ConnectSchema = z.object({
  action: z.enum(['connect', 'disconnect', 'list']).default('connect'),
  connectionId: z.string().uuid().optional(),
  provider: z.string().optional(),
  externalAccountId: z.string().optional(),
  externalAccountName: z.string().optional(),
  apiKey: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request: NextRequest) {
  const csrfError = verifyCsrfOrigin(request)
  if (csrfError) return csrfError

  try {
    await requireChef()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: z.infer<typeof ConnectSchema>
  try {
    payload = ConnectSchema.parse(await request.json())
  } catch (error) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  try {
    if (payload.action === 'list') {
      const accounts = await listConnectedAccounts()
      return NextResponse.json({ success: true, accounts })
    }

    if (payload.action === 'disconnect') {
      if (!payload.connectionId) {
        return NextResponse.json(
          { error: 'connectionId is required for disconnect' },
          { status: 400 }
        )
      }
      const result = await disconnectIntegrationAccount(payload.connectionId)
      return NextResponse.json({ success: true, result })
    }

    if (!payload.provider) {
      return NextResponse.json({ error: 'provider is required for connect' }, { status: 400 })
    }

    const account = await connectIntegrationAccount({
      provider: payload.provider as any,
      externalAccountId: payload.externalAccountId,
      externalAccountName: payload.externalAccountName,
      apiKey: payload.apiKey,
      settings: payload.settings,
    })

    return NextResponse.json({ success: true, account })
  } catch (error) {
    console.error('[integrations-connect] Error:', error)
    const isUnauthorized = error instanceof Error && error.message.includes('Unauthorized')
    return NextResponse.json(
      { error: isUnauthorized ? 'Unauthorized' : 'Failed to process integration request' },
      { status: isUnauthorized ? 401 : 500 }
    )
  }
}
