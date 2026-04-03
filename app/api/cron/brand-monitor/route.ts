import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

const dbAdmin = createAdminClient()

const SYSTEM_KEY = 'brand_monitor_negative_mention'
const WEB_SEARCH_ENABLED = process.env.BRAND_MONITOR_WEB_SEARCH_ENABLED === 'true'

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('brand-monitor', async () => {
      const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
      const { data: chefs } = await dbAdmin.from('chefs').select('id, display_name, business_name')

      if (!chefs || chefs.length === 0) {
        return {
          processed: 0,
          totalMentions: 0,
          negativeMentions: 0,
          notified: 0,
          skipped: 0,
          skippedSearch: 0,
        }
      }

      const recipientCache = new Map<string, string | null>()
      let totalMentions = 0
      let negativeMentions = 0
      let notified = 0
      let skipped = 0
      let skippedSearch = 0

      for (const chef of chefs) {
        const searchTerms = [chef.display_name, chef.business_name].filter(Boolean)
        if (searchTerms.length === 0) continue
        const seenSourceUrls = new Set<string>()

        if (
          !WEB_SEARCH_ENABLED ||
          !process.env.GOOGLE_CUSTOM_SEARCH_KEY ||
          !process.env.GOOGLE_CUSTOM_SEARCH_CX
        ) {
          skippedSearch += searchTerms.length
          continue
        }

        for (const term of searchTerms) {
          try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_CUSTOM_SEARCH_KEY}&cx=${process.env.GOOGLE_CUSTOM_SEARCH_CX}&q="${encodeURIComponent(term as string)}"&dateRestrict=d1`
            const res = await fetch(url)
            if (!res.ok) continue

            const data = await res.json()
            const items = data.items ?? []
            if (items.length === 0) continue

            const itemUrls = items.map((i: { link: string }) => i.link)
            const { data: existing } = await dbAdmin
              .from('chef_brand_mentions')
              .select('source_url')
              .eq('tenant_id', chef.id)
              .in('source_url', itemUrls)

            const existingUrls = new Set((existing ?? []).map((e: any) => e.source_url))
            const negWords = [
              'complaint',
              'terrible',
              'worst',
              'awful',
              'disgusting',
              'sick',
              'food poisoning',
            ]
            const posWords = [
              'amazing',
              'excellent',
              'best',
              'wonderful',
              'fantastic',
              'incredible',
              'love',
            ]

            const newMentions = items
              .filter(
                (item: { link: string }) =>
                  !existingUrls.has(item.link) && !seenSourceUrls.has(item.link)
              )
              .map((item: { title: string; snippet: string; link: string }) => {
                seenSourceUrls.add(item.link)
                const text = `${item.title} ${item.snippet}`.toLowerCase()
                const hasNeg = negWords.some((w) => text.includes(w))
                const hasPos = posWords.some((w) => text.includes(w))
                const sentiment = hasNeg ? 'negative' : hasPos ? 'positive' : 'neutral'
                return {
                  tenant_id: chef.id,
                  source: 'web',
                  title: item.title,
                  excerpt: item.snippet,
                  source_url: item.link,
                  sentiment,
                }
              })

            if (newMentions.length === 0) continue

            const { data: insertedMentions } = await dbAdmin
              .from('chef_brand_mentions')
              .insert(newMentions)
              .select('id, source_url, sentiment, title, excerpt')

            totalMentions += newMentions.length
            const negativeRows = (insertedMentions ?? []).filter(
              (row: { sentiment: string | null }) => row.sentiment === 'negative'
            )
            negativeMentions += negativeRows.length

            if (negativeRows.length === 0) continue

            const cached = recipientCache.get(chef.id)
            const recipientId =
              cached !== undefined
                ? cached
                : await getChefAuthUserId(chef.id).then((id) => {
                    recipientCache.set(chef.id, id)
                    return id
                  })

            if (!recipientId) {
              skipped += negativeRows.length
              continue
            }

            for (const mention of negativeRows as Array<{
              id: string
              source_url: string | null
              title: string | null
              excerpt: string | null
            }>) {
              const sourceUrl = mention.source_url ?? ''
              if (!sourceUrl) {
                skipped += 1
                continue
              }

              const { data: existingNotif } = await dbAdmin
                .from('notifications')
                .select('id')
                .eq('tenant_id', chef.id)
                .eq('action', 'new_negative_mention')
                .contains('metadata', {
                  system_key: SYSTEM_KEY,
                  source_url: sourceUrl,
                })
                .limit(1)

              if ((existingNotif?.length ?? 0) > 0) {
                skipped += 1
                continue
              }

              await createNotification({
                tenantId: chef.id,
                recipientId,
                category: 'protection',
                action: 'new_negative_mention',
                title: 'New negative brand mention detected',
                body: mention.title ?? mention.excerpt ?? undefined,
                actionUrl: sourceUrl,
                metadata: {
                  system_key: SYSTEM_KEY,
                  mention_id: mention.id,
                  source_url: sourceUrl,
                },
              })
              notified += 1
            }
          } catch (err) {
            console.error(`[brand-monitor] Search failed for "${term}":`, err)
          }
        }
      }

      return {
        processed: chefs.length,
        totalMentions,
        negativeMentions,
        notified,
        skipped,
        skippedSearch,
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[brand-monitor] Cron failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
