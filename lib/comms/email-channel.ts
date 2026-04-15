import { createServerClient } from '@/lib/db/server'
import { randomBytes } from 'crypto'

const DOMAIN = process.env.INBOUND_EMAIL_DOMAIN || 'cheflowhq.com'

function generateAlias(): string {
  return 'cf-' + randomBytes(4).toString('hex')
}

export async function getOrCreateEmailChannel(chefId: string): Promise<{
  alias: string
  address: string
}> {
  const db: any = createServerClient({ admin: true })

  const { data: existing } = await db
    .from('chef_email_channels')
    .select('inbound_alias')
    .eq('chef_id', chefId)
    .maybeSingle()

  if (existing?.inbound_alias) {
    return {
      alias: existing.inbound_alias,
      address: `${existing.inbound_alias}@${DOMAIN}`,
    }
  }

  let alias = generateAlias()
  let attempts = 0

  while (attempts < 5) {
    const { data, error } = await db
      .from('chef_email_channels')
      .insert({ chef_id: chefId, inbound_alias: alias })
      .select('inbound_alias')
      .single()

    if (!error && data?.inbound_alias) {
      return { alias: data.inbound_alias, address: `${data.inbound_alias}@${DOMAIN}` }
    }

    // Collision - generate new alias
    alias = generateAlias()
    attempts++
  }

  throw new Error('Failed to generate unique email alias')
}

export async function resolveChefByAlias(alias: string): Promise<string | null> {
  const db: any = createServerClient({ admin: true })

  const { data } = await db
    .from('chef_email_channels')
    .select('chef_id')
    .eq('inbound_alias', alias.toLowerCase())
    .maybeSingle()

  return data?.chef_id || null
}
