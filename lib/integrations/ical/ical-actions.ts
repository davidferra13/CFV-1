'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { revalidateTag } from 'next/cache'

// iCal feed management — enable/disable and get the feed URL.

export async function getICalFeedStatus() {
  await requirePro('integrations')
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  const { data } = await supabase
    .from('chefs')
    .select('ical_feed_token, ical_feed_enabled')
    .eq('id', user.entityId)
    .single()

  if (!data) throw new Error('Chef not found')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100'
  const feedUrl = data.ical_feed_token
    ? `${appUrl}/api/feeds/calendar/${data.ical_feed_token}`
    : null

  return {
    enabled: data.ical_feed_enabled ?? false,
    feedUrl,
    token: data.ical_feed_token,
  }
}

export async function toggleICalFeed(enabled: boolean) {
  await requirePro('integrations')
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  // If enabling and no token exists yet, generate one
  if (enabled) {
    const { data: chef } = await supabase
      .from('chefs')
      .select('ical_feed_token')
      .eq('id', user.entityId)
      .single()

    if (!chef?.ical_feed_token) {
      // Set 90-day expiration on new tokens (security audit finding #7)
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      await supabase
        .from('chefs')
        .update({
          ical_feed_enabled: true,
          ical_feed_token: crypto.randomUUID(),
          ical_feed_expires_at: expiresAt,
        } as any)
        .eq('id', user.entityId)
    } else {
      await supabase.from('chefs').update({ ical_feed_enabled: true }).eq('id', user.entityId)
    }
  } else {
    await supabase.from('chefs').update({ ical_feed_enabled: false }).eq('id', user.entityId)
  }

  revalidateTag(`chef-layout-${user.entityId}`)
  return { success: true }
}

export async function regenerateICalFeedToken() {
  await requirePro('integrations')
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  const newToken = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

  await supabase
    .from('chefs')
    .update({
      ical_feed_token: newToken,
      ical_feed_expires_at: expiresAt,
      ical_feed_last_accessed_at: null,
    } as any)
    .eq('id', user.entityId)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100'

  revalidateTag(`chef-layout-${user.entityId}`)

  return {
    token: newToken,
    feedUrl: `${appUrl}/api/feeds/calendar/${newToken}`,
  }
}
