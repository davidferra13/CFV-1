import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    // Get all chefs with display names for brand monitoring
    const { data: chefs } = await supabaseAdmin
      .from('chefs')
      .select('id, display_name, business_name')

    if (!chefs || chefs.length === 0) {
      return NextResponse.json({ message: 'No chefs to monitor' })
    }

    let totalMentions = 0

    for (const chef of chefs) {
      const searchTerms = [chef.display_name, chef.business_name].filter(Boolean)
      if (searchTerms.length === 0) continue

      // Note: Full implementation would use Google Custom Search API or SerpAPI
      // For now, this is a placeholder that can be connected to a search provider
      // when API keys are configured
      if (!process.env.GOOGLE_CUSTOM_SEARCH_KEY || !process.env.GOOGLE_CUSTOM_SEARCH_CX) {
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

          // Batch check: get all existing URLs for this chef in one query
          const itemUrls = items.map((i: { link: string }) => i.link)
          const { data: existing } = await supabaseAdmin
            .from('chef_brand_mentions')
            .select('source_url')
            .eq('tenant_id', chef.id)
            .in('source_url', itemUrls)

          const existingUrls = new Set((existing ?? []).map((e) => e.source_url))

          // Sentiment helpers
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

          // Batch insert new mentions
          const newMentions = items
            .filter((item: { link: string }) => !existingUrls.has(item.link))
            .map((item: { title: string; snippet: string; link: string }) => {
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

          if (newMentions.length > 0) {
            await supabaseAdmin.from('chef_brand_mentions').insert(newMentions)
            totalMentions += newMentions.length
          }
        } catch (err) {
          console.error(`[brand-monitor] Search failed for "${term}":`, err)
        }
      }
    }

    return NextResponse.json({ message: `Found ${totalMentions} new mentions` })
  } catch (err) {
    console.error('[brand-monitor] Cron failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
