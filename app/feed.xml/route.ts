import { createAdminClient } from '@/lib/db/admin'
import { COMPARE_PAGES } from '@/lib/marketing/compare-pages'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
const FEED_QUERY_TIMEOUT_MS = 5000

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  let chefItems = ''

  try {
    const db: any = createAdminClient()
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('feed query timeout')), FEED_QUERY_TIMEOUT_MS)
    })

    const { data: chefs } = (await Promise.race([
      db
        .from('chefs')
        .select('slug, display_name, tagline, updated_at')
        .not('slug', 'is', null)
        .eq('profile_public', true),
      timeoutPromise,
    ])) as {
      data: Array<{
        slug: string
        display_name: string
        tagline: string | null
        updated_at: string | null
      }> | null
    }

    if (chefs) {
      chefItems = chefs
        .map(
          (chef) => `    <item>
      <title>${escapeXml(chef.display_name)} - Private Chef on ChefFlow</title>
      <link>${BASE_URL}/chef/${escapeXml(chef.slug)}</link>
      <description>${escapeXml(chef.tagline || `View ${chef.display_name}'s profile on ChefFlow.`)}</description>
      <pubDate>${chef.updated_at ? new Date(chef.updated_at).toUTCString() : new Date().toUTCString()}</pubDate>
      <guid isPermaLink="true">${BASE_URL}/chef/${escapeXml(chef.slug)}</guid>
    </item>`
        )
        .join('\n')
    }
  } catch {
    // If DB is unavailable, return feed with static items only
  }

  const compareItems = COMPARE_PAGES.map(
    (page) => `    <item>
      <title>${escapeXml(page.title)}</title>
      <link>${BASE_URL}/compare/${escapeXml(page.slug)}</link>
      <description>${escapeXml(page.summary)}</description>
      <guid isPermaLink="true">${BASE_URL}/compare/${escapeXml(page.slug)}</guid>
    </item>`
  ).join('\n')

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ChefFlow - Private Chef Directory</title>
    <link>${BASE_URL}</link>
    <description>Browse ChefFlow's curated chef network, describe an event for matched outreach, and explore food service providers in the directory.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${chefItems}
${compareItems}
  </channel>
</rss>`

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
