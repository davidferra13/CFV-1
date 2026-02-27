import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
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
  settings: z.record(z.unknown()).optional(),
})

export async function POST(request: NextRequest) {
  let payload: z.infer<typeof ConnectSchema>
  try {
    payload = ConnectSchema.parse(await request.json())
  } catch (error) {
    return NextResponse.json({ error: 'Invalid payload', details: String(error) }, { status: 400 })
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
    const message = error instanceof Error ? error.message : 'Failed to process integration request'
    const status = message.includes('Unauthorized') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
