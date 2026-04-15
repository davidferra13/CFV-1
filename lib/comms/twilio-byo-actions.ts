'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { encryptCredential, decryptCredential } from './credential-crypto'

export async function saveTwilioCredentials(input: {
  accountSid: string
  authToken: string
  phoneNumber: string
}) {
  const user = await requireChef()

  if (!input.accountSid.startsWith('AC')) {
    return { success: false, error: 'Account SID must start with AC' }
  }
  if (!input.authToken || input.authToken.length < 16) {
    return { success: false, error: 'Auth token looks invalid' }
  }
  if (!input.phoneNumber.match(/^\+?[1-9]\d{7,14}$/)) {
    return { success: false, error: 'Phone number must be in E.164 format (e.g. +16175550100)' }
  }

  const db: any = createServerClient({ admin: true })

  let encryptedToken: string
  try {
    encryptedToken = encryptCredential(input.authToken)
  } catch {
    return { success: false, error: 'Encryption not configured. Set COMMS_ENCRYPTION_KEY.' }
  }

  const { error } = await db.from('chef_twilio_credentials').upsert(
    {
      chef_id: user.entityId!,
      account_sid: input.accountSid,
      auth_token_enc: encryptedToken,
      phone_number: input.phoneNumber,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chef_id' }
  )

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings/integrations')
  return { success: true }
}

export async function getTwilioCredentialStatus(): Promise<{
  connected: boolean
  phoneNumber: string | null
  accountSid: string | null
}> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const { data } = await db
    .from('chef_twilio_credentials')
    .select('account_sid, phone_number, is_active')
    .eq('chef_id', user.entityId!)
    .eq('is_active', true)
    .maybeSingle()

  if (!data) return { connected: false, phoneNumber: null, accountSid: null }

  return {
    connected: true,
    phoneNumber: data.phone_number,
    accountSid: data.account_sid,
  }
}

export async function removeTwilioCredentials() {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  await db.from('chef_twilio_credentials').delete().eq('chef_id', user.entityId!)

  revalidatePath('/settings/integrations')
  return { success: true }
}

// Used by the Twilio webhook to get the auth token for signature verification
export async function getTwilioAuthTokenForChef(chefId: string): Promise<string | null> {
  const db: any = createServerClient({ admin: true })

  const { data } = await db
    .from('chef_twilio_credentials')
    .select('auth_token_enc')
    .eq('chef_id', chefId)
    .eq('is_active', true)
    .maybeSingle()

  if (!data?.auth_token_enc) return null

  try {
    return decryptCredential(data.auth_token_enc)
  } catch {
    return null
  }
}
